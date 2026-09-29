/* ==========================================================================
   SR Editer — Espace client : onglets
   Bascule entre les panneaux (#panel-<nom>), synchronisée avec le hash de
   l'URL (dashboard.html#subscription…). Expose window.switchDashboardTab.
   ========================================================================== */
(function() {
  function switchDashboardTab(tabName) {
    if (!tabName) return;
    const targetBtn = document.querySelector('.aww-dash-tab[data-tab="' + tabName + '"]');
    const targetPanel = document.getElementById('panel-' + tabName);
    if (!targetBtn || !targetPanel) return;

    document.querySelectorAll('.aww-dash-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.aww-panel').forEach(p => {
      p.classList.remove('active');
      p.style.display = 'none';
    });

    targetBtn.classList.add('active');
    targetPanel.classList.add('active');
    targetPanel.style.display = 'block';

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#' + tabName);
    }

    if (targetBtn.scrollIntoView && window.innerWidth <= 860) {
      targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
      window.ScrollTrigger.refresh();
    }
    if (window.__srLenis && typeof window.__srLenis.resize === 'function') {
      window.__srLenis.resize();
    }
  }

  window.switchDashboardTab = switchDashboardTab;

  document.querySelectorAll('.aww-dash-tab').forEach(btn => {
    if (!btn.dataset.tab) return;
    btn.addEventListener('click', () => {
      switchDashboardTab(btn.dataset.tab);
    });
  });

  // Check URL hash on page load and on back/forward hash navigation
  function checkHash() {
    const hashTab = (window.location.hash || '').replace('#', '').trim();
    if (hashTab && document.getElementById('panel-' + hashTab)) {
      switchDashboardTab(hashTab);
    }
  }
  checkHash();
  window.addEventListener('hashchange', checkHash);

  // Handle anchor clicks targeting dashboard tabs (e.g. href="#subscription")
  document.addEventListener('click', function(e) {
    const a = e.target.closest('a[href^="#"]');
    if (a) {
      const tab = a.getAttribute('href').replace('#', '').trim();
      if (tab && document.getElementById('panel-' + tab)) {
        e.preventDefault();
        switchDashboardTab(tab);
      }
    }
  });
})();
