/* ==========================================================================
   SR Editer — Espace client : onglets
   Bascule entre les panneaux (#panel-<nom>) via la classe .active, synchronisée
   avec le hash de l'URL (dashboard.html#subscription…).
   ========================================================================== */
(function () {
  function switchDashboardTab(tabName) {
    if (!tabName) return;
    const targetBtn = document.querySelector('.aww-dash-tab[data-tab="' + tabName + '"]');
    const targetPanel = document.getElementById('panel-' + tabName);
    if (!targetBtn || !targetPanel) return;

    document.querySelectorAll('.aww-dash-tab').forEach(b => b.classList.toggle('active', b === targetBtn));
    document.querySelectorAll('.aww-panel').forEach(p => p.classList.toggle('active', p === targetPanel));

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#' + tabName);
    }
    // Mobile : la barre d'onglets défile horizontalement, on centre l'onglet actif
    if (window.innerWidth <= 860) {
      targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
      window.ScrollTrigger.refresh();
    }
    if (window.__srLenis && typeof window.__srLenis.resize === 'function') {
      window.__srLenis.resize();
    }
  }

  document.querySelectorAll('.aww-dash-tab[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchDashboardTab(btn.dataset.tab));
  });

  // Onglet demandé par l'URL, au chargement et lors des retours arrière / avant
  function checkHash() {
    switchDashboardTab((window.location.hash || '').replace('#', '').trim());
  }
  checkHash();
  window.addEventListener('hashchange', checkHash);

  // Liens internes vers un onglet (ex. href="#subscription")
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const tab = a.getAttribute('href').replace('#', '').trim();
    if (tab && document.getElementById('panel-' + tab)) {
      e.preventDefault();
      switchDashboardTab(tab);
    }
  });
})();
