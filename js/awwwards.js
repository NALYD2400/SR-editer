
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

  // Text Split Animations
  const splitTexts = document.querySelectorAll('[data-gsap="split-text"]');
  splitTexts.forEach(text => {
    if (typeof SplitType !== 'undefined') {
      const split = new SplitType(text, { types: 'lines, words, chars' });
      gsap.from(split.chars, {
        y: 100,
        opacity: 0,
        stagger: 0.02,
        duration: 1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: text,
          start: "top 90%",
        }
      });
    }
  });

  // Fade Up
  document.querySelectorAll('[data-gsap="fade-up"]').forEach(el => {
    const delay = el.dataset.delay || 0;
    gsap.from(el, {
      y: 50,
      opacity: 0,
      duration: 1,
      delay: delay,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
      }
    });
  });

  // Cards Reveal
  const cards = document.querySelectorAll('[data-gsap="card-reveal"]');
  if(cards.length) {
    gsap.from(cards, {
      y: 50,
      opacity: 0,
      stagger: 0.1,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: cards[0],
        start: "top 85%",
      }
    });
  }

  // Magnetic Buttons
  const magneticEls = document.querySelectorAll('[data-magnetic]');
  magneticEls.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      gsap.to(el, {
        x: x * 0.3,
        y: y * 0.3,
        duration: 0.6,
        ease: "power3.out"
      });
    });
    
    el.addEventListener('mouseleave', () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "elastic.out(1, 0.3)"
      });
    });
  });
});
