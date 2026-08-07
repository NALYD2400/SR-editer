/**
 * Ambient wallpaper — same as desktop AmbientBackground.tsx
 * (crossfade + kenburns-0/1/2 + rotate)
 *
 * Continuity across pages:
 * - wallpaper index + layer start time in sessionStorage
 * - negative animation-delay so Ken Burns resumes mid-zoom (no refresh jump)
 * - next rotation deadline so the slideshow stays in sync
 */
(function initAmbientBackground() {
  if (window.__srAmbientAlive) return;

  const wallpapers = window.SR_WALLPAPERS || [];
  const wallpaperUrl = window.wallpaperUrl;
  const stack = document.getElementById("ambient-wallpaper-stack");

  if (!stack || typeof wallpaperUrl !== "function" || wallpapers.length === 0) {
    console.warn("[ambient] missing stack, wallpaperUrl, or wallpapers");
    return;
  }

  window.__srAmbientAlive = true;

  const CROSSFADE_MS = 700;
  const INTERVAL_MS = 9000;
  const ANIM_VARIANTS = [0, 1, 2];
  // Must match ambient.css durations
  const ANIM_DURATIONS_MS = [10000, 10500, 9800];
  const STORE_INDEX = "sr_bg_index";
  const STORE_STARTED = "sr_bg_layer_started";
  const STORE_NEXT = "sr_bg_next_at";

  function readStore(key, fallback) {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw == null) return fallback;
      return raw;
    } catch (_err) {
      return fallback;
    }
  }

  function writeStore(key, value) {
    try {
      sessionStorage.setItem(key, String(value));
    } catch (_err) {
      /* ignore */
    }
  }

  let bgIndex = Number(readStore(STORE_INDEX, localStorage.getItem(STORE_INDEX) || "0"));
  if (Number.isNaN(bgIndex) || bgIndex < 0 || bgIndex >= wallpapers.length) bgIndex = 0;

  let currentUrl = "";
  let crossfadeTimer = null;
  let rotationTimer = null;
  let transitioning = false;

  function animForIndex(index) {
    return ANIM_VARIANTS[((index % ANIM_VARIANTS.length) + ANIM_VARIANTS.length) % ANIM_VARIANTS.length];
  }

  function durationForAnim(anim) {
    return ANIM_DURATIONS_MS[anim] || ANIM_DURATIONS_MS[0];
  }

  function applyResumeDelay(el, anim, startedAt) {
    if (!el || !startedAt) return;
    const elapsed = Math.max(0, Date.now() - startedAt);
    const dur = durationForAnim(anim);
    // Cap at duration so we hold the end pose (animation-fill: forwards)
    const offset = Math.min(elapsed, dur);
    el.style.animationDelay = "-" + offset + "ms";
  }

  function persistLayer(index, startedAt, nextAt) {
    bgIndex = index;
    writeStore(STORE_INDEX, index);
    try {
      localStorage.setItem(STORE_INDEX, String(index));
    } catch (_err) {
      /* ignore */
    }
    writeStore(STORE_STARTED, startedAt);
    writeStore(STORE_NEXT, nextAt);
  }

  function makeLayer(url, anim, extraClass, startedAt) {
    const el = document.createElement("div");
    el.className = "ambient-wallpaper-layer " + extraClass + " ambient-kb-" + anim;
    el.style.backgroundImage = 'url("' + url + '")';
    el.dataset.url = url;
    if (startedAt) applyResumeDelay(el, anim, startedAt);
    return el;
  }

  function renderFirst(url, anim, startedAt) {
    stack.innerHTML = "";
    stack.appendChild(makeLayer(url, anim, "current", startedAt));
    currentUrl = url;
  }

  function promoteIncoming(incoming, nextUrl) {
    stack.querySelectorAll(".ambient-wallpaper-layer.current").forEach(function (node) {
      node.remove();
    });
    incoming.classList.remove("incoming", "fade-in");
    incoming.classList.add("current");
    stack.querySelectorAll(".ambient-wallpaper-layer.incoming").forEach(function (node) {
      if (node !== incoming) node.remove();
    });
    currentUrl = nextUrl;
  }

  function crossfadeTo(index) {
    if (transitioning) return;

    const file = wallpapers[index];
    if (!file) return;
    const nextUrl = wallpaperUrl(file);
    if (!nextUrl || nextUrl === currentUrl) return;

    transitioning = true;
    const nextAnim = animForIndex(index);
    const startedAt = Date.now();

    if (crossfadeTimer) {
      window.clearTimeout(crossfadeTimer);
      crossfadeTimer = null;
    }

    stack.querySelectorAll(".incoming").forEach(function (n) {
      n.remove();
    });

    const incoming = makeLayer(nextUrl, nextAnim, "incoming", startedAt);
    stack.appendChild(incoming);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        incoming.classList.add("fade-in");
      });
    });

    crossfadeTimer = window.setTimeout(function () {
      promoteIncoming(incoming, nextUrl);
      crossfadeTimer = null;
      transitioning = false;
    }, CROSSFADE_MS);

    persistLayer(index, startedAt, startedAt + INTERVAL_MS);
  }

  function tick() {
    crossfadeTo((bgIndex + 1) % wallpapers.length);
  }

  function clearRotation() {
    if (rotationTimer) {
      window.clearTimeout(rotationTimer);
      rotationTimer = null;
    }
  }

  function scheduleNext() {
    clearRotation();
    if (wallpapers.length < 2) return;

    const nextAt = Number(readStore(STORE_NEXT, "0"));
    let delay = INTERVAL_MS;
    if (Number.isFinite(nextAt) && nextAt > 0) {
      delay = Math.max(400, nextAt - Date.now());
    }
    rotationTimer = window.setTimeout(function () {
      tick();
      scheduleNext();
    }, delay);
  }

  // Resume from last known layer progress
  let startedAt = Number(readStore(STORE_STARTED, "0"));
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    startedAt = Date.now();
    persistLayer(bgIndex, startedAt, startedAt + INTERVAL_MS);
  } else if (!readStore(STORE_NEXT, null)) {
    writeStore(STORE_NEXT, startedAt + INTERVAL_MS);
  }

  renderFirst(wallpaperUrl(wallpapers[bgIndex]), animForIndex(bgIndex), startedAt);

  // Warm next image so the following page / rotation feels instant
  const nextFile = wallpapers[(bgIndex + 1) % wallpapers.length];
  if (nextFile) {
    const preload = new Image();
    preload.src = wallpaperUrl(nextFile);
  }

  scheduleNext();

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      clearRotation();
      return;
    }
    scheduleNext();
  });

  window.__srAmbientTick = tick;

  // Modern Interactive Particle Glow Canvas
  (function initParticleCanvas() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const parent = document.querySelector(".ambient-background");
    if (!parent) return;

    const canvas = document.createElement("canvas");
    canvas.className = "ambient-canvas";
    parent.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    window.addEventListener("resize", function () {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    window.addEventListener("mousemove", function (e) {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    });

    const particles = [];
    const NUM_PARTICLES = Math.min(35, Math.floor(window.innerWidth / 40));
    const COLORS = ["rgba(139, 92, 246, ", "rgba(0, 240, 255, ", "rgba(99, 102, 241, "];

    for (let i = 0; i < NUM_PARTICLES; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.5 + 1,
        colorPrefix: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: Math.random() * 0.45 + 0.15,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulseOffset: Math.random() * Math.PI * 2
      });
    }

    let frameTime = 0;
    function render() {
      frameTime += 0.016;
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Subtle mouse spotlight
      const grad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 320);
      grad.addColorStop(0, "rgba(139, 92, 246, 0.08)");
      grad.addColorStop(0.5, "rgba(0, 240, 255, 0.03)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw floating nodes & constellation links
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const currentAlpha = p.alpha + Math.sin(frameTime + p.pulseOffset) * 0.15;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.colorPrefix + Math.max(0, currentAlpha) + ")";
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = "rgba(139, 92, 246, " + (0.15 * (1 - dist / 130)) + ")";
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  })();
})();
