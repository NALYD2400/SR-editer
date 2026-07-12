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

    function applyDownload(dlUrl, version) {
      if (versionBadge && version) versionBadge.textContent = "v" + version;

      if (dlUrl) {
        downloadLinks.forEach(function (link) {
          link.href = dlUrl;
          link.removeAttribute("aria-disabled");
          link.removeAttribute("title");
        });
        if (fileSizeBadge) {
          fetch(dlUrl, { method: "HEAD" })
            .then(function (response) {
              const size = formatFileSize(Number(response.headers.get("content-length")));
              if (size) fileSizeBadge.textContent = size;
            })
            .catch(function () {
              return undefined;
            });
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
          (manifest && manifest.version) || config.appVersion
        );
      })
      .catch(function () {
        applyDownload(config.downloadUrl, config.appVersion);
      });

    const filmstripTrack = document.getElementById("app-filmstrip-track");
    if (filmstripTrack && screenshots.length > 0 && filmstripTrack.dataset.filled !== "1") {
      filmstripTrack.dataset.filled = "1";
      function buildCards() {
        screenshots.forEach(function (shot) {
          const card = document.createElement("figure");
          card.className = "filmstrip-card";
          const img = document.createElement("img");
          img.src = shot.src;
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
  }

  window.SRClient = { mount: mount };
  mount();
})();
