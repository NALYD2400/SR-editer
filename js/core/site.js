/* ==========================================================================
   SR Editer — Comportements communs du site public
   Smooth scroll (Lenis), menu burger, lien actif, boutons de téléchargement,
   éléments magnétiques, animations GSAP (intro + scroll), header au scroll,
   sommaire "scrollspy" des pages docs / légales.
   Expose window.__srLenis pour les scripts de page.
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.aww-header');
  const hasGsap = typeof gsap !== 'undefined';
  const hasScrollTrigger = hasGsap && typeof ScrollTrigger !== 'undefined';
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;

  const lenis = initLenis();
  initMobileMenu();
  markActiveNavLink();
  wireDownloadButtons();
  initScrollEngine();
  initAnchorLinks();
  if (isFinePointer) initMagneticElements();
  initAnimations();
  initHeaderScrollState();
  initTocScrollSpy();

  // ── Lenis (smooth scroll, repli sur le scroll natif si indisponible) ──
  function initLenis() {
    if (typeof Lenis === 'undefined') return null;
    try {
      const instance = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smoothWheel: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
      });
      window.__srLenis = instance;
      syncLenisWithNativeScroll(instance);
      return instance;
    } catch (err) {
      console.warn('Lenis init failed, using native scroll:', err);
      return null;
    }
  }

  // Garde Lenis synchronisé quand l'utilisateur scrolle "nativement" : glisser la
  // barre de défilement, clic molette (autoscroll), clavier, sélection de texte…
  function syncLenisWithNativeScroll(instance) {
    let isUserInteracting = false;
    let lastDispatchedScroll = window.scrollY;

    // Mémorise la position envoyée par chaque frame d'animation Lenis
    if (typeof instance.setScroll === 'function') {
      const origSetScroll = instance.setScroll.bind(instance);
      instance.setScroll = function (val) {
        lastDispatchedScroll = val;
        origSetScroll(val);
      };
    }

    function syncToNative() {
      const currentY = window.scrollY;
      lastDispatchedScroll = currentY;
      if (instance.animate && typeof instance.animate.stop === 'function') {
        instance.animate.stop();
      }
      instance.isScrolling = false;
      instance.animatedScroll = currentY;
      instance.targetScroll = currentY;
      instance.velocity = 0;
      if (typeof ScrollTrigger !== 'undefined' && ScrollTrigger.update) {
        ScrollTrigger.update();
      }
    }

    const onPointerDown = () => {
      isUserInteracting = true;
      // Stoppe une animation molette en cours pour ne pas lutter contre l'utilisateur
      if (instance.isScrolling || (instance.animate && instance.animate.isRunning)) {
        syncToNative();
      }
    };
    const onPointerUp = () => {
      isUserInteracting = false;
      syncToNative();
    };
    const capture = { capture: true, passive: true };
    window.addEventListener('pointerdown', onPointerDown, capture);
    window.addEventListener('mousedown', onPointerDown, capture);
    window.addEventListener('pointerup', onPointerUp, capture);
    window.addEventListener('mouseup', onPointerUp, capture);
    window.addEventListener('pointercancel', onPointerUp, capture);

    window.addEventListener('scroll', () => {
      // Bouton souris enfoncé, ou position différente de celle envoyée par Lenis
      // (> 2.5px) : c'est un scroll natif, on s'aligne dessus.
      if (isUserInteracting || Math.abs(window.scrollY - lastDispatchedScroll) > 2.5) {
        syncToNative();
      }
    }, { passive: true });

    const scrollNavKeys = ['Space', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'];
    window.addEventListener('keydown', (e) => {
      if (scrollNavKeys.includes(e.code) || scrollNavKeys.includes(e.key)) {
        requestAnimationFrame(syncToNative);
      }
    }, { passive: true });

    const reset = () => {
      isUserInteracting = false;
      syncToNative();
    };
    window.addEventListener('blur', reset, { passive: true });
    window.addEventListener('contextmenu', reset, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) reset();
    }, { passive: true });
  }

  // ── Menu burger (mobile) ──
  function initMobileMenu() {
    const burgerBtn = document.getElementById('aww-burger-btn');
    if (!burgerBtn || !header) return;

    const toggleMobileMenu = (forceState) => {
      const isOpen = header.classList.contains('is-menu-open');
      const newState = typeof forceState === 'boolean' ? forceState : !isOpen;
      header.classList.toggle('is-menu-open', newState);
      burgerBtn.setAttribute('aria-expanded', String(newState));
      if (newState) {
        if (lenis && lenis.stop) lenis.stop();
        document.body.style.overflow = 'hidden';
      } else {
        if (lenis && lenis.start) lenis.start();
        document.body.style.overflow = '';
      }
    };

    burgerBtn.addEventListener('click', () => toggleMobileMenu());
    document.querySelectorAll('.aww-nav .aww-link').forEach(link => {
      link.addEventListener('click', () => toggleMobileMenu(false));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header.classList.contains('is-menu-open')) {
        toggleMobileMenu(false);
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 860 && header.classList.contains('is-menu-open')) {
        toggleMobileMenu(false);
      }
    }, { passive: true });
  }

  // ── Lien de navigation actif ──
  // Compare sans l'extension : l'URL peut être /blog ou /blog.html (cleanUrls)
  function markActiveNavLink() {
    const pageName = (path) => (path.split(/[?#]/)[0].split('/').pop() || 'index').toLowerCase().replace(/\.html$/, '');
    const currentPage = pageName(window.location.pathname);
    document.querySelectorAll('.aww-nav .aww-link').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (pageName(href === './' ? 'index' : href) === currentPage) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // ── Boutons de téléchargement sans lien → installeur officiel ──
  function wireDownloadButtons() {
    const officialDownloadUrl = (window.SR_CONFIG && window.SR_CONFIG.downloadUrl) || "https://github.com/NALYD2400/SR-editer/releases/download/0.7.1/SR.Editer_0.7.1_x64-setup.exe";
    document.querySelectorAll('#download-btn, #download-btn-2, .btn-download, #download-app-link').forEach(link => {
      const currentHref = link.getAttribute('href');
      if (!currentHref || currentHref === '#') {
        link.setAttribute('href', officialDownloadUrl);
      }
    });
  }

  // ── Boucle d'animation : GSAP pilote Lenis, sinon requestAnimationFrame ──
  function initScrollEngine() {
    if (hasScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      if (lenis && lenis.on) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => {
          lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
      }
    } else if (lenis) {
      const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
  }

  // ── Ancres internes (#section) avec décalage sous le header ──
  function initAnchorLinks() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href.length <= 1) return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        if (lenis && lenis.scrollTo) {
          lenis.scrollTo(target, { offset: -90 });
        } else {
          const top = target.getBoundingClientRect().top + window.scrollY - 90;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  // ── Éléments magnétiques [data-magnetic] (desktop uniquement) ──
  function initMagneticElements() {
    if (!hasGsap) return;
    document.querySelectorAll('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(el, { x: x * 0.3, y: y * 0.3, duration: 0.5, ease: "power3.out" });
      });
      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "power3.out" });
      });
    });
  }

  // ── Animations GSAP ──
  function initAnimations() {
    if (!hasGsap) return;
    splitHeadings();
    playIntroTimeline();
    if (hasScrollTrigger) initScrollReveals();
  }

  // Découpe les titres en caractères (SplitType) et les place en position de départ
  function splitHeadings() {
    if (typeof SplitType === 'undefined') return;
    const headings = document.querySelectorAll(
      '.aww-hero-heading, .aww-page-title, .aww-section-title, .aww-footer-title, [data-reveal="text"], [data-gsap="split-text"]'
    );
    headings.forEach(heading => {
      if (heading.dataset.splitDone) return;
      heading.dataset.splitDone = "true";
      try {
        new SplitType(heading, { types: 'lines, words, chars' });
        // Remet le texte brut dans .aww-text-stroke pour garder un dégradé continu
        heading.querySelectorAll('.aww-text-stroke').forEach(strokeEl => {
          strokeEl.innerHTML = strokeEl.textContent;
        });
        gsap.set(heading.querySelectorAll('.char, .aww-text-stroke'), {
          y: '120%',
          rotateZ: 4,
          opacity: 0,
          willChange: 'transform, opacity'
        });
      } catch (e) {
        console.warn('SplitType error on heading:', e);
      }
    });
  }

  // Intro au chargement : header, kicker, titre, description, actions
  function playIntroTimeline() {
    const introTl = gsap.timeline({ defaults: { ease: "power4.out" } });

    if (header) {
      introTl.fromTo(header,
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, ease: "power3.out" }
      );
    }

    const heroKicker = document.querySelector('.aww-hero .aww-kicker, .aww-page-hero .aww-kicker');
    if (heroKicker) {
      introTl.fromTo(heroKicker,
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" },
        "<0.1"
      );
    }

    const heroHeading = document.querySelector('.aww-hero-heading, .aww-page-title, .aww-auth-title');
    if (heroHeading) {
      const chars = heroHeading.querySelectorAll('.char, .aww-text-stroke');
      if (chars.length) {
        introTl.to(chars,
          { y: '0%', rotateZ: 0, opacity: 1, duration: 1.2, stagger: 0.03, ease: "power4.out", clearProps: "willChange,transformOrigin" },
          "<0.1"
        );
      } else {
        introTl.fromTo(heroHeading,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.0, ease: "power3.out", clearProps: "willChange" },
          "<0.1"
        );
      }
    }

    const heroDesc = document.querySelector('.aww-hero-desc, .aww-page-hero p, #auth-subtitle');
    if (heroDesc) {
      introTl.fromTo(heroDesc,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, ease: "power3.out" },
        "<0.2"
      );
    }

    const heroActions = document.querySelector('.aww-hero-actions, .aww-auth-container, .aww-docs-sidebar');
    if (heroActions) {
      introTl.fromTo(heroActions,
        { y: 25, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.85, ease: "power3.out", clearProps: "transform,scale" },
        "<0.2"
      );
    }
  }

  // Apparitions au scroll (sections sous la ligne de flottaison)
  function initScrollReveals() {
    const isInHero = (el) => el.closest('.aww-hero') || el.closest('.aww-page-hero');

    // Titres de section
    document.querySelectorAll('.aww-section-title, .aww-footer-title').forEach(title => {
      if (isInHero(title)) return;
      const chars = title.querySelectorAll('.char, .aww-text-stroke');
      if (!chars.length) return;
      gsap.to(chars, {
        opacity: 1, rotateZ: 0, y: '0%',
        duration: 1.2, stagger: 0.03, ease: "power4.out",
        clearProps: "willChange,transformOrigin",
        scrollTrigger: { trigger: title, start: "top 85%", once: true }
      });
    });

    // Cartes fonctionnalités & tarifs (entrée en cascade)
    document.querySelectorAll('.aww-feature-grid, .aww-pricing-grid').forEach(grid => {
      const cards = Array.from(grid.children);
      if (!cards.length) return;
      gsap.fromTo(cards,
        { y: 60, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 1.2, stagger: 0.15, ease: "power3.out",
          scrollTrigger: { trigger: grid, start: "top 85%", once: true }
        }
      );
    });

    // Images de cartes : léger dézoom à l'apparition
    document.querySelectorAll('.aww-card-img-wrap img').forEach(img => {
      gsap.fromTo(img,
        { scale: 1.18, opacity: 0.4 },
        {
          scale: 1, opacity: 1,
          duration: 1.2, ease: "power2.out",
          scrollTrigger: { trigger: img, start: "top 90%", once: true }
        }
      );
    });

    // [data-gsap="fade-up"] (+ data-delay optionnel)
    document.querySelectorAll('[data-gsap="fade-up"]').forEach(el => {
      if (isInHero(el)) return;
      gsap.fromTo(el,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 0.9, delay: parseFloat(el.dataset.delay) || 0, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true }
        }
      );
    });

    // [data-gsap="fade-right"]
    document.querySelectorAll('[data-gsap="fade-right"]').forEach(el => {
      if (isInHero(el)) return;
      gsap.fromTo(el,
        { x: -35, opacity: 0 },
        {
          x: 0, opacity: 1,
          duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true }
        }
      );
    });

    // [data-gsap="parallax"] (+ data-speed)
    document.querySelectorAll('[data-gsap="parallax"]').forEach(el => {
      const speed = parseFloat(el.dataset.speed) || 1;
      gsap.to(el, {
        y: () => (window.innerHeight * (1 - speed)) * 0.5,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: isInHero(el) ? "top top" : "top bottom",
          end: "bottom top",
          scrub: 1.5
        }
      });
    });
  }

  // ── Header opaque après 25px de scroll ──
  function initHeaderScrollState() {
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 25);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (lenis && typeof lenis.on === 'function') {
      lenis.on('scroll', onScroll);
    }
    onScroll();
  }

  // ── Sommaire des pages docs / légales : surligne la section visible ──
  function initTocScrollSpy() {
    const tocLinks = document.querySelectorAll('.aww-docs-sidebar ul li a, .aww-toc-link');
    const tocSections = document.querySelectorAll('.aww-docs-section');
    if (!tocLinks.length || !tocSections.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.getAttribute('id');
        tocLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      });
    }, { rootMargin: '-20% 0px -65% 0px' });

    tocSections.forEach(section => observer.observe(section));
  }
});
