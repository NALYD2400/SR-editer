(function initClientPage() {
  const wallpapers = window.SR_WALLPAPERS || [];
  const url = window.wallpaperUrl;
  const config = window.SR_CONFIG || {};

  const ambient = document.getElementById("ambient-layer");
  const nav = document.querySelector(".client-nav");
  const mosaicTrack = document.getElementById("mosaic-track");
  const cycleBtn = document.getElementById("cycle-ambiance");
  const versionBadge = document.getElementById("app-version");
  const downloadBtn = document.getElementById("download-btn");

  if (versionBadge && config.appVersion) versionBadge.textContent = `v${config.appVersion}`;
  if (downloadBtn && config.downloadUrl) downloadBtn.href = config.downloadUrl;

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
    const mosaicFiles = wallpapers.filter((_, i) => i % 2 === 0);
    mosaicFiles.forEach((file) => {
      const card = document.createElement("article");
      card.className = "mosaic-card";
      const img = document.createElement("img");
      img.src = url(file);
      img.alt = "Visuel Vice City";
      img.loading = "lazy";
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
