(function () {
  let scrollBound = false;
  let observer = null;

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return null;
    const mb = bytes / (1024 * 1024);
    return (mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)) + " Mo";
  }

  function mount() {
    const config = window.SR_CONFIG || {};
    const nav = document.querySelector(".site-topnav") || document.querySelector(".client-nav");
    const downloadLinks = Array.from(
      document.querySelectorAll("#download-btn, #download-btn-2, #download-nav, #download-cta, .btn-download")
    );

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

    // Sticky nav scroll state
    if (!scrollBound) {
      scrollBound = true;
      window.addEventListener("scroll", function () {
        const currentNav = document.querySelector(".site-topnav") || document.querySelector(".client-nav");
        if (currentNav) currentNav.classList.toggle("is-scrolled", window.scrollY > 12);
      }, { passive: true });
    } else if (nav) {
      nav.classList.toggle("is-scrolled", window.scrollY > 12);
    }

    // Scroll reveal animations
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

    // ── High-Fidelity Scroll-Scrubbed Background Video (Awwwards Grade) ──
    const bgVideo = document.querySelector(".site-bg-video");
    if (bgVideo && bgVideo.dataset.scrubBound !== "1") {
      bgVideo.dataset.scrubBound = "1";
      bgVideo.preload = "auto";
      bgVideo.muted = true;
      bgVideo.playsInline = true;
      bgVideo.autoplay = false;
      bgVideo.loop = false;
      bgVideo.pause();

      if (bgVideo.readyState === 0) {
        try { bgVideo.load(); } catch (_) {}
      }

      let targetTime = 0;
      let isSeeking = false;
      let rafId = null;

      function getDuration() {
        return (bgVideo.duration && Number.isFinite(bgVideo.duration) && bgVideo.duration > 0)
          ? bgVideo.duration
          : 7.916;
      }

      function updateTarget() {
        const doc = document.documentElement;
        const body = document.body;
        const maxScroll = Math.max(1, (doc ? doc.scrollHeight : (body ? body.scrollHeight : 1000)) - window.innerHeight);
        const scrollY = window.scrollY || window.pageYOffset || (doc ? doc.scrollTop : 0) || 0;
        const progress = Math.min(1, Math.max(0, scrollY / maxScroll));
        const duration = getDuration();
        targetTime = progress * Math.max(0, duration - 0.05);
      }

      function applySeek() {
        if (isSeeking) return;
        if (bgVideo.readyState < 1) return;
        if (Math.abs(bgVideo.currentTime - targetTime) < 0.015) return;

        isSeeking = true;
        try {
          bgVideo.currentTime = targetTime;
        } catch (_) {
          isSeeking = false;
        }
      }

      function onFrame() {
        rafId = null;
        updateTarget();
        applySeek();
        if (Math.abs(bgVideo.currentTime - targetTime) >= 0.015) {
          rafId = window.requestAnimationFrame(onFrame);
        }
      }

      function scheduleFrame() {
        updateTarget();
        if (!rafId) {
          rafId = window.requestAnimationFrame(onFrame);
        }
      }

      bgVideo.addEventListener("seeked", function () {
        isSeeking = false;
        if (Math.abs(bgVideo.currentTime - targetTime) >= 0.015) {
          scheduleFrame();
        }
      });

      // Watchdog in case seeked doesn't fire
      setInterval(function () {
        if (isSeeking) {
          isSeeking = false;
          scheduleFrame();
        }
      }, 100);

      function warmUpVideo() {
        if (bgVideo.paused) {
          const p = bgVideo.play();
          if (p && typeof p.then === "function") {
            p.then(function () {
              bgVideo.pause();
              scheduleFrame();
            }).catch(function () {
              scheduleFrame();
            });
          }
        }
      }

      bgVideo.addEventListener("loadedmetadata", function () {
        warmUpVideo();
        scheduleFrame();
      });
      bgVideo.addEventListener("canplay", function () {
        warmUpVideo();
        scheduleFrame();
      });
      window.addEventListener("scroll", scheduleFrame, { passive: true });
      window.addEventListener("resize", scheduleFrame, { passive: true });
      window.addEventListener("load", scheduleFrame, { passive: true });
      warmUpVideo();
      scheduleFrame();
    }

    // Hero copy fade on scroll
    const heroCopy = document.querySelector("[data-hero-copy]");
    if (heroCopy && heroCopy.dataset.scrollBound !== "1") {
      heroCopy.dataset.scrollBound = "1";
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      function onScroll() {
        const max = Math.max(240, window.innerHeight * 0.5);
        const t = Math.min(1, Math.max(0, window.scrollY / max));
        if (reduce) {
          heroCopy.style.opacity = t > 0.7 ? "0" : "1";
          heroCopy.style.transform = "none";
        } else {
          heroCopy.style.opacity = String(Math.max(0, 1 - t));
          heroCopy.style.transform = "translate3d(0, " + (-24 * t) + "px, 0) scale(" + (1 - 0.03 * t) + ")";
        }
        heroCopy.classList.toggle("is-leaving", t > 0.85);
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    // Interactive Card Spotlight & Tilt Mouse Tracker
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(".feature-card, .pricing-card, .spotlight-card, .docs-card, .portal-card").forEach(function (card) {
        if (card.dataset.tiltBound === "1") return;
        card.dataset.tiltBound = "1";

        card.addEventListener("mousemove", function (e) {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.setProperty("--mouse-x", x + "px");
          card.style.setProperty("--mouse-y", y + "px");

          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = ((y - centerY) / centerY) * -5;
          const rotateY = ((x - centerX) / centerX) * 5;

          card.style.transform = "perspective(1000px) rotateX(" + rotateX.toFixed(2) + "deg) rotateY(" + rotateY.toFixed(2) + "deg) translateY(-4px)";
        });

        card.addEventListener("mouseleave", function () {
          card.style.transform = "";
        });
      });
    }

    // Interactive Studio Mockup Tabs
    const studioTabs = document.querySelectorAll(".studio-tab-btn");
    studioTabs.forEach(function (tab) {
      if (tab.dataset.tabBound === "1") return;
      tab.dataset.tabBound = "1";
      tab.addEventListener("click", function () {
        const target = tab.getAttribute("data-tab-target");
        studioTabs.forEach(function (t) {
          t.classList.toggle("is-active", t === tab);
        });
        const screenTexture = document.getElementById("screen-texture");
        const screenViewport = document.getElementById("screen-viewport");
        if (screenTexture && screenViewport) {
          screenTexture.classList.toggle("is-active", target === "texture");
          screenViewport.classList.toggle("is-active", target === "viewport");
        }
      });
    });

    // Interactive Features Navigation Dock Tabs
    const featureTabs = document.querySelectorAll(".features-nav-dock .dock-tab");
    if (featureTabs.length) {
      featureTabs.forEach(function (tab) {
        if (tab.dataset.tabBound === "1") return;
        tab.dataset.tabBound = "1";
        tab.addEventListener("click", function () {
          const featKey = tab.getAttribute("data-feature");
          featureTabs.forEach(function (t) {
            const active = t === tab;
            t.classList.toggle("is-active", active);
            t.setAttribute("aria-selected", active ? "true" : "false");
          });

          const targetCard = document.querySelector('[data-feature-card="' + featKey + '"]');
          if (targetCard) {
            targetCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
            targetCard.style.transition = "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease";
            targetCard.style.transform = "translateY(-8px) scale(1.02)";
            setTimeout(function () {
              targetCard.style.transform = "";
            }, 600);
          }
        });
      });
    }
  }

  window.SRClient = { mount: mount };
  mount();
})();
