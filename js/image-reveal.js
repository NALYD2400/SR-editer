/**
 * Mouse spotlight reveal — second image clipped by a soft radial mask that follows the cursor.
 */
(function () {
  function initImageReveal(root) {
    if (!root || root.dataset.revealReady === "1") return;

    const reveal = root.querySelector("[data-reveal-layer]");
    const base = root.querySelector("[data-reveal-base]");
    if (!reveal || !base) return;

    // Mobile: keep base only
    if (window.matchMedia("(max-width: 860px)").matches) {
      reveal.style.display = "none";
      return;
    }

    root.dataset.revealReady = "1";
    reveal.style.display = "block";
    reveal.style.opacity = "1";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ease = reduceMotion ? 1 : 0.12;

    const mouse = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.42 };
    const smooth = { x: mouse.x, y: mouse.y };
    let raf = 0;
    let running = true;
    let moved = false;

    function radius() {
      return Math.round(Math.min(480, Math.max(200, window.innerWidth * 0.2)));
    }

    function paintMask() {
      const r = radius();
      const cx = smooth.x;
      const cy = smooth.y;
      const mask =
        "radial-gradient(circle " +
        r +
        "px at " +
        cx +
        "px " +
        cy +
        "px," +
        "#fff 0%," +
        "#fff 35%," +
        "rgba(255,255,255,0.85) 55%," +
        "rgba(255,255,255,0.45) 72%," +
        "rgba(255,255,255,0.12) 88%," +
        "transparent 100%)";

      reveal.style.setProperty("-webkit-mask-image", mask);
      reveal.style.setProperty("mask-image", mask);
      reveal.style.setProperty("-webkit-mask-repeat", "no-repeat");
      reveal.style.setProperty("mask-repeat", "no-repeat");
      reveal.style.setProperty("-webkit-mask-size", "auto");
      reveal.style.setProperty("mask-size", "auto");
      reveal.style.setProperty("-webkit-mask-position", "0 0");
      reveal.style.setProperty("mask-position", "0 0");
    }

    function tick() {
      if (!running) return;
      smooth.x += (mouse.x - smooth.x) * ease;
      smooth.y += (mouse.y - smooth.y) * ease;
      paintMask();
      raf = window.requestAnimationFrame(tick);
    }

    function onMove(event) {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      if (!moved) {
        moved = true;
        root.classList.add("is-reveal-active");
      }
    }

    // Start with a soft center preview so the effect is obvious before first move
    paintMask();
    root.classList.add("is-reveal-active");

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", paintMask);
    raf = window.requestAnimationFrame(tick);

    root._revealTeardown = function () {
      running = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", paintMask);
      delete root.dataset.revealReady;
    };
  }

  function mount() {
    document.querySelectorAll("[data-image-reveal]").forEach(initImageReveal);
  }

  window.SRImageReveal = { mount: mount };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
