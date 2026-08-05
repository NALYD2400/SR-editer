(function () {
  let scrollBound = false;
  let observer = null;

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return null;
    const mb = bytes / (1024 * 1024);
    return (mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)) + " Mo";
  }

  function mount() {
    const screenshots = window.SR_SCREENSHOTS || [];
    const config = window.SR_CONFIG || {};

    const nav = document.querySelector(".site-topnav") || document.querySelector(".client-nav");
    const versionBadge = document.getElementById("app-version");
    const fileSizeBadge = document.getElementById("download-file-size");
    const downloadLinks = ["download-btn", "download-btn-2", "download-nav"]
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);

    if (!versionBadge && downloadLinks.length === 0 && !document.getElementById("app-filmstrip-track")) {
      return;
    }

    function applyDownload(dlUrl, version, rawSize) {
      if (versionBadge && version) versionBadge.textContent = "v" + version;

      if (dlUrl) {
        downloadLinks.forEach(function (link) {
          link.href = dlUrl;
          link.removeAttribute("aria-disabled");
          link.removeAttribute("title");
        });
        if (fileSizeBadge && rawSize) {
          const size = formatFileSize(Number(rawSize));
          if (size) fileSizeBadge.textContent = size;
        }
        return;
      }

      downloadLinks.forEach(function (link) {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
        link.title = "La release publique signée n'est pas encore disponible.";
      });
    }

    downloadLinks.forEach(function (link) {
      if (link.dataset.downloadBound === "1") return;
      link.dataset.downloadBound = "1";
      link.setAttribute("aria-disabled", "true");
      link.addEventListener("click", function (event) {
        if (link.getAttribute("aria-disabled") === "true") event.preventDefault();
      });
    });

    applyDownload(config.downloadUrl, config.appVersion);
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

    const filmstripTrack = document.getElementById("app-filmstrip-track");
    const skinStage = document.getElementById("skin-stage-img");
    const skinRail = document.getElementById("skin-rail");
    const skins = window.SR_SKINS || [];

    if (skinStage && skinRail && skins.length > 0 && skinRail.dataset.filled !== "1") {
      skinRail.dataset.filled = "1";
      let active = 0;

      function setActive(index) {
        active = (index + skins.length) % skins.length;
        const skin = skins[active];
        skinStage.src = encodeURI(skin.src);
        skinStage.alt = skin.alt;
        skinRail.querySelectorAll(".skin-thumb").forEach(function (btn, i) {
          btn.classList.toggle("is-active", i === active);
          btn.setAttribute("aria-pressed", i === active ? "true" : "false");
        });
        const label = document.getElementById("skin-tone-label");
        if (label) label.textContent = skin.tone || "";
      }

      skins.forEach(function (skin, index) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "skin-thumb" + (index === 0 ? " is-active" : "");
        btn.setAttribute("aria-label", skin.alt);
        btn.setAttribute("aria-pressed", index === 0 ? "true" : "false");
        const img = document.createElement("img");
        img.src = encodeURI(skin.src);
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        btn.appendChild(img);
        btn.addEventListener("click", function () {
          setActive(index);
        });
        skinRail.appendChild(btn);
      });

      const prev = document.getElementById("skin-prev");
      const next = document.getElementById("skin-next");
      if (prev) prev.addEventListener("click", function () { setActive(active - 1); });
      if (next) next.addEventListener("click", function () { setActive(active + 1); });

      // Optional keyboard on stage
      const stageWrap = document.getElementById("skin-stage");
      if (stageWrap) {
        stageWrap.tabIndex = 0;
        stageWrap.addEventListener("keydown", function (event) {
          if (event.key === "ArrowLeft") setActive(active - 1);
          if (event.key === "ArrowRight") setActive(active + 1);
        });
      }
    }

    if (filmstripTrack && screenshots.length > 0 && filmstripTrack.dataset.filled !== "1") {
      filmstripTrack.dataset.filled = "1";
      function buildCards() {
        screenshots.forEach(function (shot) {
          const card = document.createElement("figure");
          card.className = "filmstrip-card";
          const img = document.createElement("img");
          img.src = encodeURI(shot.src);
          img.alt = shot.alt;
          img.loading = "lazy";
          img.decoding = "async";
          card.appendChild(img);
          filmstripTrack.appendChild(card);
        });
      }
      buildCards();
      buildCards();
    }

    if (!scrollBound) {
      scrollBound = true;
      window.addEventListener("scroll", function () {
        const currentNav = document.querySelector(".site-topnav") || document.querySelector(".client-nav");
        if (currentNav) currentNav.classList.toggle("is-scrolled", window.scrollY > 12);
      });
    } else if (nav) {
      nav.classList.toggle("is-scrolled", window.scrollY > 12);
    }

    if (observer) {
      observer.disconnect();
      observer = null;
    }
    const revealEls = document.querySelectorAll(".reveal");
    if (revealEls.length) {
      observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) entry.target.classList.add("is-visible");
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -32px 0px" }
      );
      revealEls.forEach(function (el) {
        observer.observe(el);
      });
    }

    // Hero copy fades/rises as the sheet scrolls over the sticky image
    const heroCopy = document.querySelector("[data-hero-copy]");
    if (heroCopy && heroCopy.dataset.scrollBound !== "1") {
      heroCopy.dataset.scrollBound = "1";
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      function onScroll() {
        const max = Math.max(180, window.innerHeight * 0.45);
        const t = Math.min(1, Math.max(0, window.scrollY / max));
        if (reduce) {
          heroCopy.style.opacity = t > 0.65 ? "0" : "1";
          heroCopy.style.transform = "none";
        } else {
          heroCopy.style.opacity = String(1 - t);
          heroCopy.style.transform = "translate3d(0, " + (-28 * t) + "px, 0) scale(" + (1 - 0.04 * t) + ")";
        }
        heroCopy.classList.toggle("is-leaving", t > 0.85);
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  }

  window.SRClient = { mount: mount };
  mount();
})();
