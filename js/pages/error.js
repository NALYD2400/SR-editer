/* ==========================================================================
   SR Editer — Page 404
   Le "404" s'incline en 3D selon la position de la souris (desktop uniquement).
   ========================================================================== */
(function () {
  const code = document.querySelector('.aww-error-code');
  if (!code || typeof gsap === 'undefined') return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const tiltX = gsap.quickTo(code, 'rotationX', { duration: 0.9, ease: 'power3.out' });
  const tiltY = gsap.quickTo(code, 'rotationY', { duration: 0.9, ease: 'power3.out' });

  window.addEventListener('mousemove', (e) => {
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    tiltY(x * 22);
    tiltX(y * -16);
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    tiltX(0);
    tiltY(0);
  });
})();
