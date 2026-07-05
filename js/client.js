(function initClientPage() {
  const wallpapers = window.SR_WALLPAPERS || [];
  const url = window.wallpaperUrl;
  const config = window.SR_CONFIG || {};

  const ambient = document.getElementById("ambient-layer");
  const nav = document.querySelector(".client-nav");
  const mosaicTrack = document.getElementById("mosaic-track");
  const cycleBtn = document.getElementById("cycle-ambiance");
  const versionBadge = document.getElementById("app-version");
  const downloadLinks = ["download-btn", "download-btn-2", "download-nav"]
    .map((id) => document.getElementById(id))
    .filter((el) => el !== null) as HTMLAnchorElement[];

  fetch("update.json")
    .then((res) => res.json())
    .then((data) => {
      const dlUrl = data.platforms?.["windows-x86_64"]?.url;
      const latestVersion = data.version;
      
      if (versionBadge && latestVersion) {
        versionBadge.textContent = `v${latestVersion}`;
      }

      downloadLinks.forEach((link) => {
        if (dlUrl) {
          link.href = dlUrl;
          link.removeAttribute("aria-disabled");
          link.removeAttribute("title");
          link.textContent = link.id === "download-nav" ? "Télécharger" : "Télécharger pour Windows";
        } else {
          link.removeAttribute("href");
          link.setAttribute("aria-disabled", "true");
          link.title = "La release publique signée n'est pas encore disponible.";
          link.textContent = "Bientôt disponible";
        }
      });
    })
    .catch(() => {
      downloadLinks.forEach((link) => {
        if (config.downloadUrl) {
          link.href = config.downloadUrl;
          link.removeAttribute("aria-disabled");
        } else {
          link.removeAttribute("href");
          link.setAttribute("aria-disabled", "true");
          link.title = "La release publique signée n'est pas encore disponible.";
          link.textContent = "Bientôt disponible";
        }
      });
    });

  document.querySelectorAll(".bento-card[data-bg]").forEach((card) => {
    const file = card.getAttribute("data-bg");
    if (!file) return;
    card.style.backgroundImage = `url("${url(file)}")`;
  });

  let bgIndex = Number(localStorage.getItem("sr_bg_index") || "18");
  if (Number.isNaN(bgIndex) || bgIndex < 0 || bgIndex >= wallpapers.length) bgIndex = 18;

  function setAmbient(index) {
    if (!ambient || !wallpapers[index]) return;
    ambient.style.backgroundImage = `url("${url(wallpapers[index])}")`;
    localStorage.setItem("sr_bg_index", String(index));
    bgIndex = index;
  }

  setAmbient(bgIndex);

  if (cycleBtn) {
    cycleBtn.addEventListener("click", () => {
      setAmbient((bgIndex + 1) % wallpapers.length);
    });
  }

  if (mosaicTrack) {
    // Une sélection courte évite de décoder des dizaines d'images 1080p sur la landing page.
    const mosaicFiles = wallpapers.filter((_, index) => index % 5 === 0).slice(0, 12);
    mosaicFiles.forEach((file) => {
      const card = document.createElement("article");
      card.className = "mosaic-card";
      const img = document.createElement("img");
      img.src = url(file);
      img.alt = "Visuel Vice City";
      img.loading = "lazy";
      img.decoding = "async";
      card.appendChild(img);
      mosaicTrack.appendChild(card);
    });
  }

  window.addEventListener("scroll", () => {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
  });

  const revealEls = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => observer.observe(el));
})();
