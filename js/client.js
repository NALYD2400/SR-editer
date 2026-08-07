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
    const downloadLinks = Array.from(document.querySelectorAll("#download-btn, #download-btn-2, #download-nav, #download-cta, .btn-download"));

    function applyDownload(dlUrl, version, rawSize) {
      if (version) {
        document.querySelectorAll("#app-version, #cta-app-version, [data-app-version]").forEach(function (el) {
          if (el.id === "app-version") {
            el.textContent = "v" + version + " Pro";
          } else {
            el.textContent = "v" + version;
          }
        });
      }

      if (dlUrl) {
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
    }

    downloadLinks.forEach(function (link) {
      if (link.dataset.downloadBound === "1") return;
      link.dataset.downloadBound = "1";
      link.addEventListener("click", function (event) {
        if (link.getAttribute("aria-disabled") === "true") event.preventDefault();
      });
    });

    applyDownload(config.downloadUrl, config.appVersion);

    // Live sync from Supabase release_records table
    async function syncLiveRelease() {
      try {
        const client = (typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null) || window.srSupabase;
        if (client) {
          const { data, error } = await client
            .from("release_records")
            .select("version, artifact_url")
            .eq("published", true)
            .order("updated_at", { ascending: false })
            .limit(1);

          if (!error && data && data.length && data[0].version) {
            applyDownload(data[0].artifact_url || config.downloadUrl, data[0].version);
            return true;
          }
        }
      } catch (_) {}
      return false;
    }

    syncLiveRelease().then(function (synced) {
      if (!synced) {
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
    });

    const skinTrack = document.getElementById("skin-curved-track");
    const filmstripTrack = document.getElementById("app-filmstrip-track");
    const skinRail = document.getElementById("skin-rail");
    const skins = window.SR_SKINS || [];

    if (skinTrack && skins.length > 0 && skinTrack.dataset.filled !== "1") {
      skinTrack.dataset.filled = "1";
      let active = 0;
      const cardElements = [];

      skins.forEach(function (skin, index) {
        const card = document.createElement("div");
        card.className = "skin-card-3d";
        card.dataset.index = index;
        const img = document.createElement("img");
        img.src = encodeURI(skin.src);
        img.alt = skin.alt;
        img.loading = index < 3 ? "eager" : "lazy";
        img.decoding = "async";
        card.appendChild(img);
        
        card.addEventListener("click", function () {
          setActive(index);
        });
        
        skinTrack.appendChild(card);
        cardElements.push(card);

        if (skinRail) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "skin-thumb" + (index === 0 ? " is-active" : "");
          btn.setAttribute("aria-label", skin.alt);
          btn.setAttribute("aria-pressed", index === 0 ? "true" : "false");
          const thumbImg = document.createElement("img");
          thumbImg.src = encodeURI(skin.src);
          thumbImg.alt = "";
          thumbImg.loading = "lazy";
          thumbImg.decoding = "async";
          btn.appendChild(thumbImg);
          btn.addEventListener("click", function () {
            setActive(index);
          });
          skinRail.appendChild(btn);
        }
      });

      function update3DCarousel() {
        const containerWidth = skinTrack.offsetWidth || window.innerWidth;
        const spacing = Math.min(340, Math.max(160, containerWidth * 0.28));

        cardElements.forEach(function (card, i) {
          let offset = i - active;
          const half = skins.length / 2;
          if (offset > half) offset -= skins.length;
          if (offset < -half) offset += skins.length;

          const absOffset = Math.abs(offset);
          const isCenter = offset === 0;

          card.classList.toggle("is-center", isCenter);

          if (absOffset > 3) {
            card.style.opacity = "0";
            card.style.pointerEvents = "none";
            card.style.transform = "translate3d(0,0,-600px) scale(0.5)";
            return;
          }

          const x = offset * spacing;
          const z = -Math.pow(absOffset, 1.2) * 90;
          const rotY = offset * -16;
          const scale = isCenter ? 1.05 : Math.max(0.72, 1 - absOffset * 0.12);
          const opacity = isCenter ? 1 : Math.max(0.3, 1 - absOffset * 0.26);

          card.style.opacity = String(opacity);
          card.style.pointerEvents = "auto";
          card.style.zIndex = String(10 - absOffset);
          card.style.transform = "translate3d(" + x + "px, 0, " + z + "px) rotateY(" + rotY + "deg) scale(" + scale + ")";
        });

        const activeSkin = skins[active];
        const label = document.getElementById("skin-tone-label");
        if (label && activeSkin) label.textContent = activeSkin.tone || "";

        if (skinRail) {
          skinRail.querySelectorAll(".skin-thumb").forEach(function (btn, i) {
            const isActive = i === active;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-pressed", isActive ? "true" : "false");
            if (isActive) {
              btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            }
          });
        }
      }

      let skinAutoplayTimer = null;
      const SKIN_AUTOPLAY_DELAY = 3800;

      function startSkinAutoplay() {
        stopSkinAutoplay();
        skinAutoplayTimer = setInterval(function () {
          setActive(active + 1);
        }, SKIN_AUTOPLAY_DELAY);
      }

      function stopSkinAutoplay() {
        if (skinAutoplayTimer) {
          clearInterval(skinAutoplayTimer);
          skinAutoplayTimer = null;
        }
      }

      function setActive(index) {
        active = (index + skins.length) % skins.length;
        update3DCarousel();
        if (skinAutoplayTimer) {
          startSkinAutoplay();
        }
      }

      const prev = document.getElementById("skin-prev");
      const next = document.getElementById("skin-next");
      if (prev) prev.addEventListener("click", function () { setActive(active - 1); });
      if (next) next.addEventListener("click", function () { setActive(active + 1); });

      window.addEventListener("resize", update3DCarousel);
      update3DCarousel();
      startSkinAutoplay();

      const stageWrap = document.getElementById("skin-stage");
      if (stageWrap) {
        stageWrap.tabIndex = 0;
        stageWrap.addEventListener("mouseenter", stopSkinAutoplay);
        stageWrap.addEventListener("mouseleave", startSkinAutoplay);
        stageWrap.addEventListener("keydown", function (event) {
          if (event.key === "ArrowLeft") setActive(active - 1);
          if (event.key === "ArrowRight") setActive(active + 1);
        });
      }
    }

    if (filmstripTrack && screenshots.length > 0 && filmstripTrack.dataset.filled !== "1") {
      filmstripTrack.dataset.filled = "1";
      
      let activeIndex = 0;
      const dotsContainer = document.getElementById("gallery-dots");
      const captionLabel = document.getElementById("gallery-caption-label");
      
      screenshots.forEach(function (shot, index) {
        const card = document.createElement("figure");
        card.className = "filmstrip-card";
        card.dataset.index = index;
        const img = document.createElement("img");
        img.src = encodeURI(shot.src);
        img.alt = shot.alt;
        img.loading = "lazy";
        img.decoding = "async";
        card.appendChild(img);
        
        card.addEventListener("click", function () {
          openLightbox(index);
        });
        
        filmstripTrack.appendChild(card);

        if (dotsContainer) {
          const dot = document.createElement("button");
          dot.type = "button";
          dot.className = "gallery-dot" + (index === 0 ? " is-active" : "");
          dot.setAttribute("aria-label", "Aller à la capture " + (index + 1));
          dot.addEventListener("click", function () {
            goToSlide(index);
          });
          dotsContainer.appendChild(dot);
        }
      });

      const cards = filmstripTrack.querySelectorAll(".filmstrip-card");

      function updateSlider() {
        if (!cards.length) return;
        
        const cardEl = cards[activeIndex];
        const filmstripContainer = document.getElementById("app-filmstrip");
        if (!filmstripContainer) return;
        const filmstripWidth = filmstripContainer.offsetWidth;
        const cardWidth = cardEl.offsetWidth;
        
        const offset = (filmstripWidth / 2) - (cardWidth / 2) - cardEl.offsetLeft;
        filmstripTrack.style.transform = "translate3d(" + offset + "px, 0, 0)";

        cards.forEach(function (c, i) {
          c.classList.toggle("is-active", i === activeIndex);
          c.style.opacity = i === activeIndex ? "1" : "0.45";
          c.style.transform = i === activeIndex ? "scale(1)" : "scale(0.92)";
        });

        if (captionLabel) {
          captionLabel.textContent = screenshots[activeIndex].alt;
        }

        if (dotsContainer) {
          dotsContainer.querySelectorAll(".gallery-dot").forEach(function (dot, i) {
            dot.classList.toggle("is-active", i === activeIndex);
          });
        }
      }

      let autoplayTimer = null;
      const AUTOPLAY_DELAY = 4500;

      function startAutoplay() {
        stopAutoplay();
        autoplayTimer = setInterval(function () {
          goToSlide(activeIndex + 1);
        }, AUTOPLAY_DELAY);
      }

      function stopAutoplay() {
        if (autoplayTimer) {
          clearInterval(autoplayTimer);
          autoplayTimer = null;
        }
      }

      function goToSlide(index) {
        activeIndex = (index + screenshots.length) % screenshots.length;
        updateSlider();
        if (autoplayTimer) {
          startAutoplay();
        }
      }

      const prevBtn = document.getElementById("gallery-prev");
      const nextBtn = document.getElementById("gallery-next");
      if (prevBtn) prevBtn.addEventListener("click", function () { goToSlide(activeIndex - 1); });
      if (nextBtn) nextBtn.addEventListener("click", function () { goToSlide(activeIndex + 1); });

      const galleryWrapper = document.querySelector(".gallery-wrapper");
      if (galleryWrapper) {
        galleryWrapper.addEventListener("mouseenter", stopAutoplay);
        galleryWrapper.addEventListener("mouseleave", startAutoplay);
      }

      setTimeout(function () {
        updateSlider();
        startAutoplay();
      }, 100);
      window.addEventListener("resize", updateSlider);

      // --- LIGHTBOX DYNAMIC LOGIC ---
      let lightboxActiveIndex = 0;
      const lightbox = document.getElementById("gallery-lightbox");
      const lightboxImg = document.getElementById("lightbox-img");
      const lightboxCaption = document.getElementById("lightbox-caption");
      const lightboxClose = document.getElementById("lightbox-close");
      const lightboxPrev = document.getElementById("lightbox-nav-prev");
      const lightboxNext = document.getElementById("lightbox-nav-next");

      function openLightbox(index) {
        if (!lightbox || !lightboxImg) return;
        lightboxActiveIndex = index;
        lightboxImg.src = encodeURI(screenshots[index].src);
        lightboxImg.alt = screenshots[index].alt;
        if (lightboxCaption) lightboxCaption.textContent = screenshots[index].alt;
        
        lightbox.setAttribute("aria-hidden", "false");
        lightbox.classList.add("is-open");
        document.body.style.overflow = "hidden";
      }

      function closeLightbox() {
        if (!lightbox) return;
        lightbox.setAttribute("aria-hidden", "true");
        lightbox.classList.remove("is-open");
        document.body.style.overflow = "";
      }

      function navigateLightbox(dir) {
        lightboxActiveIndex = (lightboxActiveIndex + dir + screenshots.length) % screenshots.length;
        if (lightboxImg) {
          lightboxImg.src = encodeURI(screenshots[lightboxActiveIndex].src);
          lightboxImg.alt = screenshots[lightboxActiveIndex].alt;
        }
        if (lightboxCaption) {
          lightboxCaption.textContent = screenshots[lightboxActiveIndex].alt;
        }
        goToSlide(lightboxActiveIndex);
      }

      document.querySelectorAll(".bento-card[data-lightbox-index]").forEach(function (card) {
        card.addEventListener("click", function () {
          const idx = parseInt(card.dataset.lightboxIndex, 10) || 0;
          openLightbox(idx);
        });
      });

      if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
      if (lightboxPrev) lightboxPrev.addEventListener("click", function () { navigateLightbox(-1); });
      if (lightboxNext) lightboxNext.addEventListener("click", function () { navigateLightbox(1); });

      if (lightbox) {
        lightbox.addEventListener("click", function (e) {
          if (e.target === lightbox || e.target.classList.contains("lightbox-content")) {
            closeLightbox();
          }
        });
      }

      window.addEventListener("keydown", function (e) {
        if (lightbox && lightbox.classList.contains("is-open")) {
          if (e.key === "Escape") closeLightbox();
          if (e.key === "ArrowLeft") navigateLightbox(-1);
          if (e.key === "ArrowRight") navigateLightbox(1);
        } else {
          const sliderEl = document.getElementById("app-filmstrip");
          if (sliderEl && (document.activeElement === sliderEl || sliderEl.contains(document.activeElement))) {
            if (e.key === "ArrowLeft") goToSlide(activeIndex - 1);
            if (e.key === "ArrowRight") goToSlide(activeIndex + 1);
          }
        }
      });
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

    // 3D Card Tilt Mouse Tracker
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(".feature-card, .pricing-card").forEach(function (card) {
        if (card.dataset.tiltBound === "1") return;
        card.dataset.tiltBound = "1";

        card.addEventListener("mousemove", function (e) {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = (y - centerY) / 16;
          const rotateY = (centerX - x) / 16;

          card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });

        card.addEventListener("mouseleave", function () {
          card.style.transform = "";
        });
      });
    }
  }

  window.SRClient = { mount: mount };
  mount();
})();
