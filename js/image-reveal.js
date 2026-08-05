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

    const skins = window.SR_SKINS || [];
    let lastIndex = -1;

    // Create alternative base layer for ultra-smooth opacity crossfade (top layer)
    const base2 = base.cloneNode(true);
    base2.classList.remove("reveal-bg--base");
    base2.classList.add("reveal-bg--base-alt");
    base2.style.opacity = "0";
    base2.style.transition = "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)";
    base.style.opacity = "1"; // base stays fully opaque underneath
    base.parentNode.insertBefore(base2, reveal);

    let showBase2 = false;

    function handleScrollImageChange() {
      if (!skins.length) return;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const scrollPercent = window.scrollY / docHeight;
      
      const skinsCount = skins.length;
      const indexBase = Math.min(skinsCount - 1, Math.floor(scrollPercent * skinsCount));
      
      if (indexBase !== lastIndex) {
        lastIndex = indexBase;
        const indexLayer = (indexBase + 1) % skinsCount;
        
        const imgBase = skins[indexBase].src;
        const imgLayer = skins[indexLayer].src;
        
        if (showBase2) {
          // base (underneath) gets the new image, then we fade out base2 (top) to reveal base
          base.style.backgroundImage = "url('" + encodeURI(imgBase) + "')";
          base2.style.opacity = "0";
        } else {
          // base2 (top) gets the new image and fades in over base
          base2.style.backgroundImage = "url('" + encodeURI(imgBase) + "')";
          base2.style.opacity = "1";
        }
        showBase2 = !showBase2;
        
        reveal.style.backgroundImage = "url('" + encodeURI(imgLayer) + "')";
      }
    }

    // Start with a soft center preview so the effect is obvious before first move
    paintMask();
    root.classList.add("is-reveal-active");
    handleScrollImageChange();

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", paintMask);
    window.addEventListener("scroll", handleScrollImageChange, { passive: true });
    raf = window.requestAnimationFrame(tick);

    root._revealTeardown = function () {
      running = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", paintMask);
      window.removeEventListener("scroll", handleScrollImageChange);
      if (base2.parentNode) {
        base2.parentNode.removeChild(base2);
      }
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
