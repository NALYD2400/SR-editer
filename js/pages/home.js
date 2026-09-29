/* ==========================================================================
   SR Editer — Page d'accueil
   1. Boutons de téléchargement : dernière release publiée (Supabase
      release_records), sinon manifeste /update.json, sinon SR_CONFIG.
   2. Vidéo de fond "scrubbée" au scroll (desktop) / lecture en boucle (mobile).
   ========================================================================== */
(function () {
  const config = window.SR_CONFIG || {};

  syncDownloadLinks();
  initBackgroundVideo();

  // ── 1. Liens de téléchargement & version ──
  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return null;
    const mb = bytes / (1024 * 1024);
    return (mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)) + " Mo";
  }

  function syncDownloadLinks() {
    const downloadLinks = Array.from(
      document.querySelectorAll("#download-btn, #download-btn-2, #download-nav, #download-cta, .btn-download")
    );

    function applyDownload(dlUrl, version, rawSize) {
      if (version) {
        document.querySelectorAll("#app-version, #cta-app-version, [data-app-version]").forEach(function (el) {
          el.textContent = el.id === "app-version" ? "v" + version + " Pro" : "v" + version;
        });
      }
      if (!dlUrl) return;
      downloadLinks.forEach(function (link) {
        link.href = dlUrl;
        link.removeAttribute("aria-disabled");
        link.removeAttribute("title");
      });
      const fileSizeBadge = document.getElementById("download-file-size");
      if (fileSizeBadge && rawSize) {
        const size = formatFileSize(Number(rawSize));
        if (size) fileSizeBadge.textContent = size;
      }
    }

    downloadLinks.forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (link.getAttribute("aria-disabled") === "true") event.preventDefault();
      });
    });

    applyDownload(config.downloadUrl, config.appVersion);

    async function fromSupabase() {
      try {
        const client = typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null;
        if (!client) return false;
        const { data, error } = await client
          .from("release_records")
          .select("version, artifact_url")
          .eq("published", true)
          .order("updated_at", { ascending: false })
          .limit(1);
        if (error || !data || !data.length || !data[0].version) return false;
        applyDownload(data[0].artifact_url || config.downloadUrl, data[0].version);
        return true;
      } catch (_) {
        return false;
      }
    }

    function fromManifest() {
      fetch((config.updateManifestUrl || "/update.json") + "?site=" + Date.now(), { cache: "no-store" })
        .then(function (response) {
          return response.ok ? response.json() : null;
        })
        .then(function (manifest) {
          const windows = manifest && manifest.platforms && manifest.platforms["windows-x86_64"];
          applyDownload(
            (windows && windows.url) || config.downloadUrl,
            (manifest && manifest.version) || config.appVersion,
            windows && windows.size
          );
        })
        .catch(function () {
          applyDownload(config.downloadUrl, config.appVersion);
        });
    }

    fromSupabase().then(function (synced) {
      if (!synced) fromManifest();
    });
  }

  // ── 2. Vidéo de fond ──
  function initBackgroundVideo() {
    const bgVideo = document.querySelector(".site-bg-video");
    if (!bgVideo) return;

    bgVideo.preload = "auto";
    bgVideo.muted = true;
    bgVideo.playsInline = true;

    // Mobile : simple lecture en boucle (le seek au scroll est trop coûteux)
    if (window.matchMedia("(max-width: 768px)").matches) {
      bgVideo.autoplay = true;
      bgVideo.loop = true;
      try {
        const p = bgVideo.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (_) {}
      return;
    }

    // Desktop : la position de lecture suit la progression du scroll
    bgVideo.autoplay = false;
    bgVideo.loop = false;
    try { bgVideo.pause(); } catch (_) {}

    const FALLBACK_DURATION = 7.764;
    let isSeeking = false;
    let pendingSeek = null;
    let rafActive = false;

    function getDuration() {
      return (bgVideo.duration && Number.isFinite(bgVideo.duration) && bgVideo.duration > 0)
        ? bgVideo.duration
        : FALLBACK_DURATION;
    }

    function calculateTarget() {
      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      const scrollY = window.pageYOffset || doc.scrollTop || 0;
      const progress = Math.min(1, Math.max(0, scrollY / maxScroll));
      return progress * Math.max(0, getDuration() - 0.05);
    }

    function performSeek() {
      rafActive = false;
      const targetTime = calculateTarget();
      if (isSeeking) {
        pendingSeek = targetTime;
        return;
      }
      if (bgVideo.readyState < 2) return;
      if (Math.abs(bgVideo.currentTime - targetTime) < 0.02) return;

      isSeeking = true;
      pendingSeek = null;
      try {
        if (typeof bgVideo.fastSeek === "function") {
          bgVideo.fastSeek(targetTime);
        } else {
          bgVideo.currentTime = targetTime;
        }
      } catch (_) {
        isSeeking = false;
      }
    }

    function queueUpdate() {
      if (rafActive) return;
      rafActive = true;
      window.requestAnimationFrame(performSeek);
    }

    bgVideo.addEventListener("seeked", function () {
      isSeeking = false;
      if (pendingSeek !== null || Math.abs(bgVideo.currentTime - calculateTarget()) >= 0.03) {
        queueUpdate();
      }
    });

    // Filet de sécurité si "seeked" ne se déclenche jamais
    let seekTimeout = null;
    bgVideo.addEventListener("seeking", function () {
      clearTimeout(seekTimeout);
      seekTimeout = setTimeout(function () {
        isSeeking = false;
        if (pendingSeek !== null) queueUpdate();
      }, 150);
    });

    window.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate, { passive: true });
    window.addEventListener("load", queueUpdate, { passive: true });
    bgVideo.addEventListener("loadedmetadata", queueUpdate);
    bgVideo.addEventListener("canplay", queueUpdate);

    // Lenis est créé au DOMContentLoaded par core/site.js : on s'y abonne dès qu'il existe
    const checkLenis = setInterval(function () {
      const lenis = window.__srLenis;
      if (lenis && typeof lenis.on === "function") {
        lenis.on("scroll", queueUpdate);
        clearInterval(checkLenis);
      }
    }, 50);
    setTimeout(() => clearInterval(checkLenis), 3000);

    queueUpdate();
  }
})();
