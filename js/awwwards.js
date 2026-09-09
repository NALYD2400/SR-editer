
// Awwwards Style JS
document.addEventListener('DOMContentLoaded', () => {
  // Lenis Smooth Scroll
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  // Expose Lenis globally
  window.__srLenis = lenis;

  // ── Native Middle-Click Autoscroll Harmony with Lenis ──
  // Resolves frame fighting and trembling ("tremblements") when browser native autoscroll
  // (middle mouse button click / wheel hold) runs concurrently with Lenis smooth scroll.
  function setupAutoscrollHarmony(lenisInstance, headerElement) {
    let isAutoscrolling = false;
    let isStickyAutoscroll = false;
    let middleDownTime = 0;
    let middleStartX = 0;
    let middleStartY = 0;
    let hasMovedMiddle = false;

    function startAutoscroll() {
      if (isAutoscrolling) return;
      isAutoscrolling = true;
      lenisInstance.stop();
    }

    function endAutoscroll() {
      if (!isAutoscrolling) return;
      isAutoscrolling = false;
      isStickyAutoscroll = false;
      hasMovedMiddle = false;
      // Do not restart smooth scroll if mobile menu burger is currently open
      if (!headerElement || !headerElement.classList.contains('is-menu-open')) {
        lenisInstance.start();
      }
    }

    // Intercept wheel events in capture phase:
    // 1) Swallow hardware switch micro-ticks while the middle button is held down.
    // 2) If in sticky autoscroll mode and the user intentionally turns the wheel (buttons === 0),
    //    immediately exit autoscroll and resume normal smooth scrolling.
    window.addEventListener(
      'wheel',
      (e) => {
        if (isAutoscrolling) {
          if ((e.buttons & 4) !== 0) {
            e.stopImmediatePropagation();
            return;
          }
          if (isStickyAutoscroll) {
            endAutoscroll();
          }
        }
      },
      { capture: true, passive: false }
    );

    const onPointerDown = (e) => {
      // Any mouse click terminates sticky autoscroll mode
      if (isStickyAutoscroll) {
        endAutoscroll();
        return;
      }

      if (e.button !== 1) return;

      // Do not intercept middle-clicks on interactive elements (e.g. links opening in a new tab)
      const target = e.target;
      if (target && target.closest && target.closest('a[href], button, input, textarea, select, label')) {
        return;
      }

      middleDownTime = performance.now();
      middleStartX = e.clientX;
      middleStartY = e.clientY;
      hasMovedMiddle = false;
      startAutoscroll();
    };

    const onPointerMove = (e) => {
      if (!isAutoscrolling) return;

      if ((e.buttons & 4) !== 0) {
        const dist = Math.hypot(e.clientX - middleStartX, e.clientY - middleStartY);
        if (dist > 5) {
          hasMovedMiddle = true;
        }
      } else if (!isStickyAutoscroll) {
        // Safety guard: middle button is no longer held down and we are not in sticky mode
        endAutoscroll();
      }
    };

    const onPointerUp = (e) => {
      if (!isAutoscrolling) return;

      if (e.button === 1) {
        const elapsed = performance.now() - middleDownTime;
        // If the user held the button or dragged it, releasing terminates autoscroll immediately
        if (hasMovedMiddle || elapsed > 200) {
          endAutoscroll();
        } else {
          // Quick tap without move enters sticky autoscroll (pan mode)
          isStickyAutoscroll = true;
        }
      } else if (isStickyAutoscroll) {
        endAutoscroll();
      }
    };

    const onKeyDown = () => {
      if (isAutoscrolling) {
        endAutoscroll();
      }
    };

    const onBlur = () => {
      if (isAutoscrolling) {
        endAutoscroll();
      }
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('mouseup', onPointerUp, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });
    window.addEventListener('blur', onBlur, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && isAutoscrolling) endAutoscroll();
    }, { passive: true });
  }

  // Mobile Menu Burger Handler
  const burgerBtn = document.getElementById('aww-burger-btn');
  const header = document.querySelector('.aww-header');
  setupAutoscrollHarmony(lenis, header);
  if (burgerBtn && header) {
    burgerBtn.addEventListener('click', () => {
      const isOpen = header.classList.toggle('is-menu-open');
      burgerBtn.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        lenis.stop();
      } else {
        lenis.start();
      }
    });

    document.querySelectorAll('.aww-nav .aww-link').forEach(link => {
      link.addEventListener('click', () => {
        header.classList.remove('is-menu-open');
        burgerBtn.setAttribute('aria-expanded', 'false');
        lenis.start();
      });
    });
  }

  // GSAP Animations
  gsap.registerPlugin(ScrollTrigger);
  
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // Lenis Anchor Smooth Scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href && href.length > 1) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -90 });
        }
      }
    });
  });



  // 6. Magnetic Elements
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
        }
      });
    });
  }

  if (mockupFrame) {
    mockupFrame.addEventListener('mousemove', (e) => {
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
  
  allRevealHeadings.forEach(heading => {
    // Avoid re-splitting if already done
    if (heading.dataset.splitDone) return;
    heading.dataset.splitDone = "true";

    const text = new SplitType(heading, { types: 'lines, words, chars' });
    
    // Restore text nodes inside .aww-text-stroke so the continuous gradient background-clip works natively
    heading.querySelectorAll('.aww-text-stroke').forEach(strokeEl => {
      strokeEl.innerHTML = strokeEl.textContent;
    });

    // Set initial OriginKit states for characters and stroke elements
    const animTargets = heading.querySelectorAll('.char, .aww-text-stroke');
    gsap.set(animTargets, { 
      y: 25, 
      opacity: 0,
      filter: 'blur(10px)',
      willChange: 'transform, opacity, filter'
    });
  });

  // 9. WEBFLOW PAGE LOAD INTRO TIMELINE (Fires on Page Open)
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

  // Hero Title: OriginKit Blur-Up Animation
  const heroHeading = document.querySelector('.aww-hero-heading, .aww-page-title, .aww-auth-title');
  if (heroHeading) {
    const chars = heroHeading.querySelectorAll('.char, .aww-text-stroke');
    if (chars.length) {
      introTl.to(chars, 
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.0, stagger: 0.02, ease: "power3.out", clearProps: "filter,willChange" }, 
        "<0.1"
      );
    } else {
      introTl.fromTo(heroHeading, 
        { y: 40, opacity: 0, filter: 'blur(10px)' }, 
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.0, ease: "power3.out", clearProps: "filter,willChange" }, 
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

  const heroActions = document.querySelector('.aww-hero-actions, .aww-hero-stats, .aww-auth-container, .aww-dash-sidebar, .aww-docs-sidebar');
  if (heroActions) {
    introTl.fromTo(heroActions, 
      { y: 25, opacity: 0, scale: 0.97 }, 
      { y: 0, opacity: 1, scale: 1, duration: 0.85, ease: "power3.out" }, 
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
  // Section Titles below the fold (OriginKit Blur-Up Text)
  document.querySelectorAll('.aww-section-title, .aww-footer-title').forEach(title => {
    if (title.closest('.aww-hero') || title.closest('.aww-page-hero')) return;
    const chars = title.querySelectorAll('.char, .aww-text-stroke');
    if (chars.length) {
      gsap.to(chars, 
        {
          opacity: 1, filter: "blur(0px)", y: 0,
          duration: 1.2, stagger: 0.04, ease: "power3.out",
          clearProps: "filter,willChange",
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
    lenis.on('scroll', onScroll);
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

