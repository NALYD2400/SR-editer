
// Awwwards Style JS

// ── Awwwards Header Auth Navigation (Live Profile & Avatars) ──
(function () {
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(str) {
    return String(str == null ? "" : str)
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function extractUserData(user) {
    if (!user) return null;
    var meta = user.user_metadata || {};
    var identities = Array.isArray(user.identities) ? user.identities : [];
    var discordIdObj = identities.find(function (id) {
      return id && id.provider === "discord";
    });
    var discordData = (discordIdObj && discordIdObj.identity_data) || {};

    // 1. Resolve Avatar URL
    var avatarUrl =
      discordData.avatar_url ||
      meta.avatar_url ||
      meta.picture ||
      null;

    if (!avatarUrl && discordData.avatar && (discordData.id || (discordIdObj && discordIdObj.id))) {
      var discordUid = discordData.id || discordIdObj.id;
      avatarUrl = "https://cdn.discordapp.com/avatars/" + discordUid + "/" + discordData.avatar + ".png?size=64";
    }

    // 2. Resolve Display Name / Pseudo
    var displayName =
      discordData.global_name ||
      discordData.full_name ||
      discordData.name ||
      discordData.user_name ||
      (meta.custom_claims && meta.custom_claims.global_name) ||
      meta.full_name ||
      meta.name ||
      meta.preferred_username ||
      meta.user_name ||
      (user.email ? user.email.split("@")[0] : "Compte");

    var isDiscord = Boolean(
      discordIdObj ||
      (meta.iss && String(meta.iss).indexOf("discord") !== -1) ||
      (avatarUrl && String(avatarUrl).indexOf("discord") !== -1)
    );

    var initial = String(displayName || user.email || "C").trim().charAt(0).toUpperCase();

    return {
      displayName: displayName,
      avatarUrl: avatarUrl,
      initial: initial,
      isDiscord: isDiscord,
      email: user.email || ""
    };
  }

  function renderHeaderAuth(userData) {
    var headerActions = document.querySelector(".aww-header-actions");
    var headerPortalBtn = headerActions ? headerActions.querySelector(".aww-btn:not(.aww-burger-btn)") : null;
    var navPortalMobile = document.querySelector(".aww-nav-portal-mobile");

    if (!userData) {
      if (headerPortalBtn) {
        headerPortalBtn.href = "login.html";
        headerPortalBtn.className = "aww-btn aww-btn-outline";
        headerPortalBtn.removeAttribute("title");
        headerPortalBtn.innerHTML = '<span class="aww-btn-text">PORTAL</span>';
      }
      if (navPortalMobile) {
        navPortalMobile.href = "login.html";
        navPortalMobile.classList.remove("is-user");
        navPortalMobile.innerHTML = '<span class="aww-link-inner" data-hover="PORTAL">PORTAL</span>';
      }
      return;
    }

    var avatarHtml = '';
    if (userData.avatarUrl) {
      avatarHtml = '<span class="aww-user-avatar' + (userData.isDiscord ? ' is-discord' : '') + '">' +
        '<img src="' + escapeAttr(userData.avatarUrl) + '" alt="" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML=\'<span class=\\\'aww-user-initial\\\'>' + escapeHtml(userData.initial) + '</span>\'">' +
        '</span>';
    } else {
      avatarHtml = '<span class="aww-user-avatar"><span class="aww-user-initial">' + escapeHtml(userData.initial) + '</span></span>';
    }

    if (headerPortalBtn) {
      headerPortalBtn.href = "dashboard.html";
      headerPortalBtn.className = "aww-btn aww-btn-profile";
      headerPortalBtn.title = (userData.displayName || "") + (userData.email ? " (" + userData.email + ")" : "");
      headerPortalBtn.innerHTML = avatarHtml + '<span class="aww-user-name">' + escapeHtml(userData.displayName) + '</span>';
    }

    if (navPortalMobile) {
      navPortalMobile.href = "dashboard.html";
      navPortalMobile.classList.add("is-user");
      navPortalMobile.innerHTML = avatarHtml + '<span class="aww-link-inner" data-hover="' + escapeAttr(userData.displayName) + '">' + escapeHtml(userData.displayName) + '</span>';
    }
  }

  function readCachedUser() {
    try {
      var direct = localStorage.getItem("sr_header_user_v2");
      if (direct) {
        var parsed = JSON.parse(direct);
        if (parsed && parsed.displayName) return parsed;
      }
    } catch (_) {}

    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || !(key.indexOf("auth-token") !== -1 || key.indexOf("sb-") === 0)) continue;
        var raw = localStorage.getItem(key);
        if (!raw || raw.indexOf("user") === -1) continue;
        var session = JSON.parse(raw);
        var user = session.user || (session.currentSession && session.currentSession.user);
        if (user) {
          var data = extractUserData(user);
          if (data) {
            try { localStorage.setItem("sr_header_user_v2", JSON.stringify(data)); } catch (_) {}
            return data;
          }
        }
      }
    } catch (_) {}
    return null;
  }

  function applyCachedUser() {
    var cached = readCachedUser();
    if (cached) renderHeaderAuth(cached);
  }

  function syncLiveUser() {
    var client = (typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null) || window.srSupabase;
    if (!client || !client.auth) {
      var tries = 0;
      var interval = setInterval(function () {
        tries++;
        var c = (typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null) || window.srSupabase;
        if (c && c.auth) {
          clearInterval(interval);
          bindClient(c);
        } else if (tries > 20) {
          clearInterval(interval);
        }
      }, 100);
      return;
    }
    bindClient(client);
  }

  function bindClient(client) {
    client.auth.getSession().then(function (res) {
      var session = res && res.data && res.data.session;
      if (session && session.user) {
        client.auth.getUser().then(function (uRes) {
          var freshUser = (uRes && uRes.data && uRes.data.user) || session.user;
          var data = extractUserData(freshUser);
          if (data) {
            try { localStorage.setItem("sr_header_user_v2", JSON.stringify(data)); } catch (_) {}
            renderHeaderAuth(data);
          }
        }).catch(function () {
          var data = extractUserData(session.user);
          if (data) {
            try { localStorage.setItem("sr_header_user_v2", JSON.stringify(data)); } catch (_) {}
            renderHeaderAuth(data);
          }
        });
      } else {
        try { localStorage.removeItem("sr_header_user_v2"); } catch (_) {}
        renderHeaderAuth(null);
      }
    }).catch(function () {});

    if (client.auth.onAuthStateChange && !window.__srHeaderAuthSubscribed) {
      window.__srHeaderAuthSubscribed = true;
      client.auth.onAuthStateChange(function (event, session) {
        if (event === "SIGNED_OUT" || !session || !session.user) {
          try { localStorage.removeItem("sr_header_user_v2"); } catch (_) {}
          renderHeaderAuth(null);
        } else if (session && session.user) {
          var data = extractUserData(session.user);
          if (data) {
            try { localStorage.setItem("sr_header_user_v2", JSON.stringify(data)); } catch (_) {}
            renderHeaderAuth(data);
          }
        }
      });
    }
  }

  window.updateSRHeaderAuth = function (user) {
    if (!user) {
      try { localStorage.removeItem("sr_header_user_v2"); } catch (_) {}
      renderHeaderAuth(null);
      return;
    }
    var data = extractUserData(user);
    if (data) {
      try { localStorage.setItem("sr_header_user_v2", JSON.stringify(data)); } catch (_) {}
      renderHeaderAuth(data);
    }
  };

  // Immediate synchronous execution if DOM elements are present
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      applyCachedUser();
      syncLiveUser();
    });
  } else {
    applyCachedUser();
    syncLiveUser();
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  // Lenis Smooth Scroll (with fallback if blocked or unavailable)
  let lenis = null;
  if (typeof Lenis !== 'undefined') {
    try {
      lenis = new Lenis({
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
      window.__srLenis = lenis;
    } catch (err) {
      console.warn('Lenis init failed, using native scroll:', err);
    }
  }

  // ── Native Scrollbar Drag, Mouse Hold & Autoscroll Harmony with Lenis ──
  function setupScrollAndAutoscrollHarmony(lenisInstance, headerElement) {
    if (!lenisInstance) return;
    let isUserInteracting = false;
    let lastDispatchedScroll = window.scrollY;

    // Intercept setScroll to record the exact scroll coordinate dispatched by Lenis animation frames
    if (typeof lenisInstance.setScroll === 'function') {
      const origSetScroll = lenisInstance.setScroll.bind(lenisInstance);
      lenisInstance.setScroll = function (val) {
        lastDispatchedScroll = val;
        origSetScroll(val);
      };
    }

    function syncLenisToNative() {
      const currentY = window.scrollY;
      lastDispatchedScroll = currentY;
      if (lenisInstance.animate && typeof lenisInstance.animate.stop === 'function') {
        lenisInstance.animate.stop();
      }
      lenisInstance.isScrolling = false;
      lenisInstance.animatedScroll = currentY;
      lenisInstance.targetScroll = currentY;
      lenisInstance.velocity = 0;
      if (typeof ScrollTrigger !== 'undefined' && ScrollTrigger.update) {
        ScrollTrigger.update();
      }
    }

    // Capture pointer & mouse interactions anywhere (native scrollbar, track, arrows, text selection)
    const onPointerDown = () => {
      isUserInteracting = true;
      // If an active wheel animation is currently running, halt it immediately so it doesn't fight the user
      if (lenisInstance.isScrolling || (lenisInstance.animate && lenisInstance.animate.isRunning)) {
        syncLenisToNative();
      }
    };

    const onPointerUp = () => {
      isUserInteracting = false;
      syncLenisToNative();
    };

    window.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    window.addEventListener('mousedown', onPointerDown, { capture: true, passive: true });
    window.addEventListener('pointerup', onPointerUp, { capture: true, passive: true });
    window.addEventListener('mouseup', onPointerUp, { capture: true, passive: true });
    window.addEventListener('pointercancel', onPointerUp, { capture: true, passive: true });

    // Synchronize whenever native scroll occurs
    window.addEventListener('scroll', () => {
      const currentY = window.scrollY;
      const diff = Math.abs(currentY - lastDispatchedScroll);

      // 1. If mouse button is held down (scrollbar thumb drag, track hold, arrow hold, selection drag):
      // User is actively driving scroll; keep Lenis completely synchronized without fighting
      if (isUserInteracting) {
        syncLenisToNative();
        return;
      }

      // 2. If the scroll position has diverged from what Lenis dispatched (> 2.5px):
      // This indicates native browser scrolling (middle-click autoscroll, keyboard nav, track clicks)
      if (diff > 2.5) {
        syncLenisToNative();
        return;
      }
    }, { passive: true });

    // Sync on navigation keys, blur, contextmenu, visibilitychange
    window.addEventListener('keydown', (e) => {
      const scrollNavKeys = ['Space', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'];
      if (scrollNavKeys.includes(e.code) || scrollNavKeys.includes(e.key)) {
        requestAnimationFrame(syncLenisToNative);
      }
    }, { passive: true });

    window.addEventListener('blur', () => {
      isUserInteracting = false;
      syncLenisToNative();
    }, { passive: true });

    window.addEventListener('contextmenu', () => {
      isUserInteracting = false;
      syncLenisToNative();
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        isUserInteracting = false;
        syncLenisToNative();
      }
    }, { passive: true });
  }

  // Mobile Menu Burger Handler & Responsive Navigation
  const burgerBtn = document.getElementById('aww-burger-btn');
  const header = document.querySelector('.aww-header');
  if (lenis) setupScrollAndAutoscrollHarmony(lenis, header);

  if (burgerBtn && header) {
    const toggleMobileMenu = (forceState) => {
      const isCurrentlyOpen = header.classList.contains('is-menu-open');
      const newState = typeof forceState === 'boolean' ? forceState : !isCurrentlyOpen;
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

    // Close on link click
    document.querySelectorAll('.aww-nav .aww-link').forEach(link => {
      link.addEventListener('click', () => toggleMobileMenu(false));
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header.classList.contains('is-menu-open')) {
        toggleMobileMenu(false);
      }
    });

    // Close when resizing above tablet breakpoint
    window.addEventListener('resize', () => {
      if (window.innerWidth > 860 && header.classList.contains('is-menu-open')) {
        toggleMobileMenu(false);
      }
    }, { passive: true });
  }

  // Auto-mark Active Navigation Link
  const currentPathname = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.aww-nav .aww-link').forEach(link => {
    const href = (link.getAttribute('href') || '').toLowerCase();
    if (href === currentPathname || (currentPathname === 'index.html' && (href === 'index.html' || href === './'))) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
  });

  // Auto-wire Official Download Buttons
  const officialDownloadUrl = (window.SR_CONFIG && window.SR_CONFIG.downloadUrl) || "https://github.com/NALYD2400/SR-editer/releases/download/0.7.1/SR.Editer_0.7.1_x64-setup.exe";
  document.querySelectorAll('#download-btn, #download-btn-2, .btn-download, #download-app-link').forEach(link => {
    const currentHref = link.getAttribute('href');
    if (!currentHref || currentHref === '#' || currentHref === '') {
      link.setAttribute('href', officialDownloadUrl);
    }
  });

  // GSAP & ScrollTrigger Animations (Safe Init)
  const hasGsap = typeof gsap !== 'undefined';
  const hasScrollTrigger = hasGsap && typeof ScrollTrigger !== 'undefined';

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
    function fallbackRaf(time) {
      lenis.raf(time);
      requestAnimationFrame(fallbackRaf);
    }
    requestAnimationFrame(fallbackRaf);
  }

  // Lenis Anchor Smooth Scroll (with native fallback)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href && href.length > 1) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          if (lenis && lenis.scrollTo) {
            lenis.scrollTo(target, { offset: -90 });
          } else {
            const rect = target.getBoundingClientRect();
            const top = rect.top + window.scrollY - 90;
            window.scrollTo({ top, behavior: 'smooth' });
          }
        }
      }
    });
  });

  // 6. Magnetic Elements (Desktop only)
  if (window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        if (!hasGsap) return;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(el, { x: x * 0.3, y: y * 0.3, duration: 0.5, ease: "power3.out" });
      });
      el.addEventListener('mouseleave', () => {
        if (!hasGsap) return;
        gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "power3.out" });
      });
    });
  }

  // 7. Interactive Hero Mockup Tab Switcher & 3D Tilt
  const showcaseImg = document.getElementById('hero-showcase-img');
  const mockupTabs = document.querySelectorAll('.aww-mockup-tab');
  const mockupFrame = document.querySelector('.aww-mockup-frame');

  if (mockupTabs.length && showcaseImg) {
    mockupTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        mockupTabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        const newSrc = tab.dataset.showcase;
        if (newSrc && showcaseImg.getAttribute('src') !== newSrc) {
          if (hasGsap) {
            gsap.to(showcaseImg, {
              opacity: 0.2,
              scale: 0.97,
              duration: 0.2,
              ease: "power2.in",
              onComplete: () => {
                showcaseImg.src = newSrc;
                gsap.to(showcaseImg, {
                  opacity: 1,
                  scale: 1,
                  duration: 0.45,
                  ease: "power3.out"
                });
              }
            });
          } else {
            showcaseImg.src = newSrc;
          }
        }
      });
    });
  }

  if (mockupFrame && window.matchMedia('(pointer: fine)').matches) {
    mockupFrame.addEventListener('mousemove', (e) => {
      if (!hasGsap) return;
      const rect = mockupFrame.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(mockupFrame, {
        rotateY: x * 10,
        rotateX: -y * 10,
        duration: 0.5,
        ease: "power2.out",
        transformPerspective: 1000
      });
    });
    mockupFrame.addEventListener('mouseleave', () => {
      if (!hasGsap) return;
      gsap.to(mockupFrame, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.8,
        ease: "power3.out"
      });
    });
  }

  // 8. Text Masking & Webflow Reveal Utility (OriginKit Style Smoky / Scramble)
  // We use SplitType to break headings into characters for a modern, smoky text reveal.
  const allRevealHeadings = document.querySelectorAll(
    '.aww-hero-heading, .aww-page-title, .aww-section-title, .aww-footer-title, [data-reveal="text"], [data-gsap="split-text"]'
  );
  
  if (typeof SplitType !== 'undefined' && hasGsap) {
    allRevealHeadings.forEach(heading => {
      // Avoid re-splitting if already done
      if (heading.dataset.splitDone) return;
      heading.dataset.splitDone = "true";

      try {
        const text = new SplitType(heading, { types: 'lines, words, chars' });
        
        // Restore text nodes inside .aww-text-stroke so the continuous gradient background-clip works natively
        heading.querySelectorAll('.aww-text-stroke').forEach(strokeEl => {
          strokeEl.innerHTML = strokeEl.textContent;
        });

        // Set initial states for characters and stroke elements (Webflow style classic slide up)
        const animTargets = heading.querySelectorAll('.char, .aww-text-stroke');
        gsap.set(animTargets, { 
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

  // 9. WEBFLOW PAGE LOAD INTRO TIMELINE (Fires on Page Open)
  if (hasGsap) {
    const introTl = gsap.timeline({ defaults: { ease: "power4.out" } });

  // Header fade-down
  if (header) {
    introTl.fromTo(header, 
      { y: -30, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.85, ease: "power3.out" }
    );
  }

  // Hero Kicker
  const heroKicker = document.querySelector('.aww-hero .aww-kicker, .aww-page-hero .aww-kicker');
  if (heroKicker) {
    introTl.fromTo(heroKicker, 
      { y: 25, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, 
      "<0.1"
    );
  }

  // Hero Title: Webflow 3D Text Reveal
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

  // Hero Description & CTA Buttons & Stats
  const heroDesc = document.querySelector('.aww-hero-desc, .aww-page-hero p, #auth-subtitle');
  if (heroDesc) {
    introTl.fromTo(heroDesc, 
      { y: 30, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.85, ease: "power3.out" }, 
      "<0.2"
    );
  }

  const heroActions = document.querySelector('.aww-hero-actions, .aww-hero-stats, .aww-auth-container, .aww-docs-sidebar');
  if (heroActions) {
    introTl.fromTo(heroActions, 
      { y: 25, opacity: 0, scale: 0.97 }, 
      { y: 0, opacity: 1, scale: 1, duration: 0.85, ease: "power3.out", clearProps: "transform,scale" }, 
      "<0.2"
    );
  }

  // Hero 3D Mockup Frame & Image Reveal
  if (mockupFrame) {
    introTl.fromTo(mockupFrame, 
      { y: 55, opacity: 0, scale: 0.93 }, 
      { y: 0, opacity: 1, scale: 1, duration: 1.25, ease: "power3.out" }, 
      "<0.2"
    );
    if (showcaseImg) {
      introTl.fromTo(showcaseImg, 
        { scale: 1.15 }, 
        { scale: 1, duration: 1.5, ease: "power2.out" }, 
        "<0.2"
      );
    }
  }

  // 10. SCROLL-TRIGGERED WEBFLOW REVEALS (For Sections Below The Fold)
  if (hasGsap && hasScrollTrigger) {
    // Section Titles below the fold (Webflow 3D Text Reveal)
    document.querySelectorAll('.aww-section-title, .aww-footer-title').forEach(title => {
      if (title.closest('.aww-hero') || title.closest('.aww-page-hero')) return;
      const chars = title.querySelectorAll('.char, .aww-text-stroke');
      if (chars.length) {
        gsap.to(chars, 
          {
            opacity: 1, rotateZ: 0, y: '0%',
            duration: 1.2, stagger: 0.03, ease: "power4.out",
            clearProps: "willChange,transformOrigin",
            scrollTrigger: {
              trigger: title,
              start: "top 85%",
              once: true
            }
          }
        );
      }
    });

    // Feature Cards & Pricing Cards (Stagger Entrance)
    const cardGrids = document.querySelectorAll('.aww-feature-grid, .aww-pricing-grid');
    cardGrids.forEach(grid => {
      const cards = Array.from(grid.children);
      if (cards.length) {
        gsap.fromTo(cards, 
          { y: 60, opacity: 0 },
          {
            y: 0, opacity: 1,
            duration: 1.2, stagger: 0.15, ease: "power3.out",
            scrollTrigger: {
              trigger: grid,
              start: "top 85%",
              once: true
            }
          }
        );
      }
    });

    // Card Image Curtain Reveal (Inner Image zooms out on scroll)
    document.querySelectorAll('.aww-card-img-wrap img').forEach(img => {
      gsap.fromTo(img, 
        { scale: 1.18, opacity: 0.4 },
        {
          scale: 1, opacity: 1,
          duration: 1.2, ease: "power2.out",
          scrollTrigger: {
            trigger: img,
            start: "top 90%",
            once: true
          }
        }
      );
    });

    // Elements with [data-gsap="fade-up"]
    document.querySelectorAll('[data-gsap="fade-up"]').forEach(el => {
      if (el.closest('.aww-hero') || el.closest('.aww-page-hero')) return;
      const delay = parseFloat(el.dataset.delay) || 0;
      gsap.fromTo(el, 
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 0.9, delay: delay, ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            once: true
          }
        }
      );
    });

    // Elements with [data-gsap="fade-right"]
    document.querySelectorAll('[data-gsap="fade-right"]').forEach(el => {
      if (el.closest('.aww-hero') || el.closest('.aww-page-hero')) return;
      gsap.fromTo(el, 
        { x: -35, opacity: 0 },
        {
          x: 0, opacity: 1,
          duration: 0.9, ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            once: true
          }
        }
      );
    });

    // Parallax elements
    document.querySelectorAll('[data-gsap="parallax"]').forEach(el => {
      const speed = parseFloat(el.dataset.speed) || 1;
      const isHero = el.closest('.aww-hero') || el.closest('.aww-page-hero');
      gsap.to(el, {
        y: () => (window.innerHeight * (1 - speed)) * 0.5,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: isHero ? "top top" : "top bottom",
          end: "bottom top",
          scrub: 1.5
        }
      });
    });
  }
}

  // Header Scrolled Glassmorphism State
  const headerEl = document.querySelector('.aww-header');
  if (headerEl) {
    const onScroll = () => {
      if (window.scrollY > 25) {
        headerEl.classList.add('is-scrolled');
      } else {
        headerEl.classList.remove('is-scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (lenis && typeof lenis.on === 'function') {
      lenis.on('scroll', onScroll);
    }
    onScroll();
  }

  // Table of Contents ScrollSpy for Docs & Legal Pages
  const tocLinks = document.querySelectorAll('.aww-docs-sidebar ul li a, .aww-toc-link');
  const tocSections = document.querySelectorAll('.aww-docs-section');
  if (tocLinks.length && tocSections.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          tocLinks.forEach(link => {
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, {
      rootMargin: '-20% 0px -65% 0px'
    });

    tocSections.forEach(section => observer.observe(section));
  }
});

