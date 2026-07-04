(function initClientPage() {
  const wallpapers = window.SR_WALLPAPERS || [];
  const url = window.wallpaperUrl;
  const config = window.SR_CONFIG || {};

  const ambient = document.getElementById("ambient-layer");
  const nav = document.querySelector(".client-nav");
  const mosaicTrack = document.getElementById("mosaic-track");
  const heroFloats = document.getElementById("hero-floats");
  const cycleBtn = document.getElementById("cycle-ambiance");
  const versionBadge = document.getElementById("app-version");
  const downloadBtn = document.getElementById("download-btn");

  if (versionBadge && config.appVersion) versionBadge.textContent = `v${config.appVersion}`;
  if (downloadBtn && config.downloadUrl) downloadBtn.href = config.downloadUrl;

  const heroPick = [
    "ULTIMATE_EDITION_VICE_CITY_STYLE_01.0.u1gt~99yzks.avif",
    "VINTAGE_VICE_CITY_PACK_EXCLUSIVE_LOOKS_01.15zo0h-xdm91b.avif",
    "ULTIMATE_EDITION_ONE_EYED_WILLIE_01.0n7-__or5f.b6.avif",
    "ULTIMATE_EDITION_SAFEHOUSE_VEHICLES_01.0wv6pw3t-mky3.avif",
    "ULTIMATE_EDITION_VAPID_BUGGY_01.0jxfiql~371ik.avif",
    "VINTAGE_VICE_CITY_PACK_01.05zaof7o1uz.3.avif"
  ];

  heroPick.forEach((file, index) => {
    if (!heroFloats) return;
    const img = document.createElement("img");
    img.className = "hero-float";
    img.src = url(file);
    img.alt = "";
    img.loading = index < 2 ? "eager" : "lazy";
    img.decoding = "async";
    if (index >= 4) img.style.setProperty("--float-opacity", "0.35");
    heroFloats.appendChild(img);
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
