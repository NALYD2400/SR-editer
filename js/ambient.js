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
})();
