(function initClientPage() {
  const wallpapers = window.SR_WALLPAPERS || [];
  const screenshots = window.SR_SCREENSHOTS || [];
  const wallpaperUrl = window.wallpaperUrl;
  const config = window.SR_CONFIG || {};

  const ambient1 = document.getElementById("ambient-layer-1");
  const ambient2 = document.getElementById("ambient-layer-2");
  const nav = document.querySelector(".client-nav");
  const versionBadge = document.getElementById("app-version");
  const fileSizeBadge = document.getElementById("download-file-size");
  const downloadLinks = ["download-btn", "download-btn-2", "download-nav"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return null;
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)} Mo`;
  }

  function applyDownload(dlUrl, version) {
    if (versionBadge && version) versionBadge.textContent = `v${version}`;

    if (dlUrl) {
      downloadLinks.forEach((link) => {
        link.href = dlUrl;
        link.removeAttribute("aria-disabled");
        link.removeAttribute("title");
      });
      if (fileSizeBadge) {
        fetch(dlUrl, { method: "HEAD" })
          .then((response) => {
            const size = formatFileSize(Number(response.headers.get("content-length")));
            if (size) fileSizeBadge.textContent = size;
          })
          .catch(() => undefined);
      }
      return;
    }

    downloadLinks.forEach((link) => {
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
      link.title = "La release publique signée n'est pas encore disponible.";
    });
  }

  downloadLinks.forEach((link) => {
    link.setAttribute("aria-disabled", "true");
    link.addEventListener("click", (event) => {
      if (link.getAttribute("aria-disabled") === "true") event.preventDefault();
    });
  });

  applyDownload(config.downloadUrl, config.appVersion);
  fetch(`${config.updateManifestUrl || "/update.json"}?site=${Date.now()}`, { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((manifest) => {
      const windows = manifest?.platforms?.["windows-x86_64"];
      applyDownload(windows?.url ?? config.downloadUrl, manifest?.version ?? config.appVersion);
    })
    .catch(() => applyDownload(config.downloadUrl, config.appVersion));

  // Fond Vice City — lent, discret
  let bgIndex = Number(localStorage.getItem("sr_bg_index") || "18");
  if (Number.isNaN(bgIndex) || bgIndex < 0 || bgIndex >= wallpapers.length) bgIndex = 18;

  let activeAmbient = ambient1;
  let hiddenAmbient = ambient2;

  function setAmbient(index) {
    if (!wallpapers[index] || !hiddenAmbient || !activeAmbient) return;
    hiddenAmbient.style.backgroundImage = `url("${wallpaperUrl(wallpapers[index])}")`;
    hiddenAmbient.classList.add("active");
    activeAmbient.classList.remove("active");
    const temp = activeAmbient;
    activeAmbient = hiddenAmbient;
    hiddenAmbient = temp;
    bgIndex = index;
  }

  if (ambient1 && wallpapers[bgIndex]) {
    ambient1.style.backgroundImage = `url("${wallpaperUrl(wallpapers[bgIndex])}")`;
    ambient1.classList.add("active");
  }

  setInterval(() => setAmbient((bgIndex + 1) % wallpapers.length), 14000);

  // Galerie app — défilement continu
  const filmstripTrack = document.getElementById("app-filmstrip-track");
  if (filmstripTrack && screenshots.length > 0) {
    const buildCards = () => {
      screenshots.forEach((shot) => {
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
    };
    buildCards();
    buildCards();
  }

  window.addEventListener("scroll", () => {
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 12);
  });

  const revealEls = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -32px 0px" }
  );
  revealEls.forEach((el) => observer.observe(el));
})();
