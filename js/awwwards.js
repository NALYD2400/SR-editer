
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

  // Mobile Menu Burger Handler
  const burgerBtn = document.getElementById('aww-burger-btn');
  const header = document.querySelector('.aww-header');
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

  // Custom Cursor
  const cursor = document.querySelector('.custom-cursor');
  if(cursor) {
    gsap.set(cursor, { xPercent: -50, yPercent: -50 });
    
    let xTo = gsap.quickTo(cursor, "x", { duration: 0.2, ease: "power3" }),
        yTo = gsap.quickTo(cursor, "y", { duration: 0.2, ease: "power3" });

    let isFirstMove = true;
    document.addEventListener('mousemove', (e) => {
      if (isFirstMove) {
        gsap.set(cursor, { x: e.clientX, y: e.clientY });
        isFirstMove = false;
      }
      xTo(e.clientX);
      yTo(e.clientY);
    });
    
    document.querySelectorAll('a, button, input, select, textarea').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  }

  // 6. Magnetic Elements
  document.querySelectorAll('[data-magnetic]').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, { x: x * 0.3, y: y * 0.3, duration: 0.5, ease: "power3.out" });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
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

  // 8. Text Masking & Webflow Reveal Utility
  function splitIntoLines(element) {
    if (element.dataset.splitDone) return;
    element.dataset.splitDone = "true";

    const originalHtml = element.innerHTML.trim();
    const parts = originalHtml.split(/<br\s*\/?>/i);

    element.innerHTML = '';
    parts.forEach((part) => {
      const lineWrap = document.createElement('span');
      lineWrap.className = 'aww-mask-line';
      const lineInner = document.createElement('span');
      lineInner.className = 'aww-mask-inner';
      lineInner.innerHTML = part.trim();
      lineWrap.appendChild(lineInner);
      element.appendChild(lineWrap);
    });
  }

  // Apply masking to headings
  const allRevealHeadings = document.querySelectorAll(
    '.aww-hero-heading, .aww-page-title, .aww-section-title, .aww-footer-title, [data-reveal="text"], [data-gsap="split-text"]'
  );
  allRevealHeadings.forEach(splitIntoLines);

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
      "-=0.6"
    );
  }

  // Hero Title: Words/Lines sliding up from invisible mask
  const heroHeading = document.querySelector('.aww-hero-heading, .aww-page-title, .aww-auth-title');
  if (heroHeading) {
    const maskInners = heroHeading.querySelectorAll('.aww-mask-inner');
    if (maskInners.length) {
      introTl.fromTo(maskInners, 
        { yPercent: 120, rotate: 1.2, opacity: 0 }, 
        { yPercent: 0, rotate: 0, opacity: 1, duration: 1.15, stagger: 0.09, ease: "power4.out" }, 
        "-=0.5"
      );
    } else {
      introTl.fromTo(heroHeading, 
        { y: 35, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 1, ease: "power4.out" }, 
        "-=0.5"
      );
    }
  }

  // Hero Description & CTA Buttons & Stats
  const heroDesc = document.querySelector('.aww-hero-desc, .aww-page-hero p, #auth-subtitle');
  if (heroDesc) {
    introTl.fromTo(heroDesc, 
      { y: 30, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.85, ease: "power3.out" }, 
      "-=0.75"
    );
  }

  const heroActions = document.querySelector('.aww-hero-actions, .aww-hero-stats, .aww-auth-container, .aww-dash-sidebar, .aww-docs-sidebar');
  if (heroActions) {
    introTl.fromTo(heroActions, 
      { y: 25, opacity: 0, scale: 0.97 }, 
      { y: 0, opacity: 1, scale: 1, duration: 0.85, ease: "power3.out" }, 
      "-=0.6"
    );
  }

  // Hero 3D Mockup Frame & Image Reveal
  if (mockupFrame) {
    introTl.fromTo(mockupFrame, 
      { y: 55, opacity: 0, scale: 0.93 }, 
      { y: 0, opacity: 1, scale: 1, duration: 1.25, ease: "power3.out" }, 
      "-=0.7"
    );
    if (showcaseImg) {
      introTl.fromTo(showcaseImg, 
        { scale: 1.15 }, 
        { scale: 1, duration: 1.5, ease: "power2.out" }, 
        "-=1.2"
      );
    }
  }

  // 10. SCROLL-TRIGGERED WEBFLOW REVEALS (For Sections Below The Fold)
  // Section Titles below the fold
  document.querySelectorAll('.aww-section-title, .aww-footer-title').forEach(title => {
    if (title.closest('.aww-hero') || title.closest('.aww-page-hero')) return;
    const inners = title.querySelectorAll('.aww-mask-inner');
    if (inners.length) {
      gsap.fromTo(inners, 
        { yPercent: 120, rotate: 1.2, opacity: 0 },
        {
          yPercent: 0, rotate: 0, opacity: 1,
          duration: 1.1, stagger: 0.08, ease: "power4.out",
          scrollTrigger: {
            trigger: title,
            start: "top 88%",
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
        { y: 50, opacity: 0, scale: 0.96 },
        {
          y: 0, opacity: 1, scale: 1,
          duration: 0.9, stagger: 0.12, ease: "power3.out",
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

  // Table of Contents ScrollSpy for Docs & Legal Pages
  const tocLinks = document.querySelectorAll('.aww-docs-sidebar ul li a');
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

