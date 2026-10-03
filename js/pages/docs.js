/* ==========================================================================
   SR Editer — Documentation technique
   Recherche dans le sommaire (Ctrl+K ou /), tiroir de navigation mobile,
   pagination précédent/suivant synchronisée avec la section visible,
   bouton "haut de page".
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Search filter with keyword matching and keyboard shortcut
  const searchInput = document.getElementById('docSearch');
  const searchClear = document.getElementById('docSearchClear');
  const searchStatus = document.getElementById('docSearchStatus');
  const searchKbd = document.getElementById('docSearchKbd');
  const navLinks = document.querySelectorAll('.docs-nav-list li');
  const navGroups = document.querySelectorAll('.docs-nav-group');

  function filterDocs(query) {
    query = (query || '').toLowerCase().trim();

    if (!query) {
      navLinks.forEach(li => li.style.display = '');
      navGroups.forEach(group => group.style.display = '');
      if (searchClear) searchClear.style.display = 'none';
      if (searchKbd) searchKbd.style.display = '';
      if (searchStatus) searchStatus.style.display = 'none';
      return;
    }

    if (searchClear) searchClear.style.display = 'block';
    if (searchKbd) searchKbd.style.display = 'none';

    let totalVisible = 0;
    navGroups.forEach(group => {
      let hasVisible = false;
      const links = group.querySelectorAll('.docs-nav-list li');
      links.forEach(li => {
        const text = li.innerText.toLowerCase();
        const keywords = (li.getAttribute('data-keywords') || '').toLowerCase();
        const href = (li.querySelector('a')?.getAttribute('href') || '').toLowerCase();

        if (text.includes(query) || keywords.includes(query) || href.includes(query)) {
          li.style.display = '';
          hasVisible = true;
          totalVisible++;
        } else {
          li.style.display = 'none';
        }
      });
      group.style.display = hasVisible ? '' : 'none';
    });

    if (searchStatus) {
      searchStatus.style.display = 'block';
      if (totalVisible === 0) {
        searchStatus.textContent = 'Aucun chapitre correspondant.';
      } else {
        searchStatus.textContent = `${totalVisible} chapitre${totalVisible > 1 ? 's' : ''} trouvé${totalVisible > 1 ? 's' : ''}`;
      }
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => filterDocs(e.target.value));

    // Jump to first result on Enter
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const firstVisibleLink = document.querySelector('.docs-nav-list li:not([style*="display: none"]) a');
        if (firstVisibleLink) {
          firstVisibleLink.click();
          searchInput.blur();
        }
      } else if (e.key === 'Escape') {
        searchInput.value = '';
        filterDocs('');
        searchInput.blur();
      }
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        filterDocs('');
        searchInput.focus();
      }
    });
  }

  // Keyboard shortcut Ctrl+K or / to focus search
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    } else if (e.key === '/' && document.activeElement !== searchInput && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  });

  // 2. Mobile Drawer Navigation Toggle
  const mobileToggle = document.getElementById('docMobileNavToggle');
  const mobileSidebar = document.getElementById('docSidebar');

  if (mobileToggle && mobileSidebar) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileSidebar.classList.toggle('is-open');
      mobileToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close mobile drawer on link click
    document.querySelectorAll('.docs-nav-list li a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 992) {
          mobileSidebar.classList.remove('is-open');
          mobileToggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      });
    });
  }

  // 3. Dynamic Next / Previous Pagination & Active Sync
  const allSections = Array.from(document.querySelectorAll('.aww-docs-section'));
  const prevBtn = document.getElementById('docPrevBtn');
  const nextBtn = document.getElementById('docNextBtn');
  const prevTitle = document.getElementById('docPrevTitle');
  const nextTitle = document.getElementById('docNextTitle');
  const mobileActiveTitle = document.getElementById('docMobileActiveTitle');

  function updatePagination(currentSectionId) {
    const currentIndex = allSections.findIndex(s => s.id === currentSectionId);
    if (currentIndex === -1) return;

    const currentSection = allSections[currentIndex];
    const currentTitleText = currentSection.querySelector('.doc-section-title')?.textContent || '';
    const currentBadgeText = currentSection.querySelector('.doc-section-badge')?.textContent || '';

    if (mobileActiveTitle) {
      mobileActiveTitle.textContent = currentBadgeText.split('·')[0].trim() + ' · ' + currentTitleText;
    }

    // Update Prev Button
    if (currentIndex > 0) {
      const prevSection = allSections[currentIndex - 1];
      const prevTitleText = prevSection.querySelector('.doc-section-title')?.textContent || '';
      const prevBadge = prevSection.querySelector('.doc-section-badge')?.textContent.split('·')[0].trim() || '';
      if (prevBtn) {
        prevBtn.style.visibility = 'visible';
        prevBtn.href = `#${prevSection.id}`;
        if (prevTitle) prevTitle.textContent = prevBadge + ' · ' + prevTitleText;
      }
    } else if (prevBtn) {
      prevBtn.style.visibility = 'hidden';
    }

    // Update Next Button
    if (currentIndex < allSections.length - 1) {
      const nextSection = allSections[currentIndex + 1];
      const nextTitleText = nextSection.querySelector('.doc-section-title')?.textContent || '';
      const nextBadge = nextSection.querySelector('.doc-section-badge')?.textContent.split('·')[0].trim() || '';
      if (nextBtn) {
        nextBtn.style.visibility = 'visible';
        nextBtn.href = `#${nextSection.id}`;
        if (nextTitle) nextTitle.textContent = nextBadge + ' · ' + nextTitleText;
      }
    } else if (nextBtn) {
      nextBtn.style.visibility = 'hidden';
    }

    // Auto-scroll active link inside desktop sticky sidebar WITHOUT scrolling the window
    if (window.innerWidth > 992) {
      const activeSidebarLink = document.querySelector(`.docs-nav-list li a[href="#${currentSectionId}"]`);
      const sidebarInner = document.querySelector('.docs-sidebar-inner');
      if (activeSidebarLink && sidebarInner) {
        const containerRect = sidebarInner.getBoundingClientRect();
        const linkRect = activeSidebarLink.getBoundingClientRect();
        const linkTopOffset = linkRect.top - containerRect.top;
        const linkBottomOffset = linkRect.bottom - containerRect.bottom;

        if (linkTopOffset < 20) {
          sidebarInner.scrollTop += (linkTopOffset - 30);
        } else if (linkBottomOffset > -20) {
          sidebarInner.scrollTop += (linkBottomOffset + 30);
        }
      }
    }
  }

  // Hook into IntersectionObserver for active section pagination update
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        updatePagination(entry.target.id);
      }
    });
  }, { rootMargin: '-20% 0px -65% 0px' });

  allSections.forEach(sec => sectionObserver.observe(sec));
  if (allSections.length) updatePagination(allSections[0].id);

  // 4. Floating Back to Top Button
  const backToTopBtn = document.getElementById('docBackToTop');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        backToTopBtn.classList.add('is-visible');
      } else {
        backToTopBtn.classList.remove('is-visible');
      }
    }, { passive: true });

    backToTopBtn.addEventListener('click', () => {
      if (window.__srLenis && typeof window.__srLenis.scrollTo === 'function') {
        window.__srLenis.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
});
