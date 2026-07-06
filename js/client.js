(function initClientPage() {
  const wallpapers = window.SR_WALLPAPERS || [];
  const url = window.wallpaperUrl;
  const config = window.SR_CONFIG || {};

  const ambientWrapper = document.getElementById("ambient-wrapper");
  const ambient1 = document.getElementById("ambient-layer-1");
  const ambient2 = document.getElementById("ambient-layer-2");
  const nav = document.querySelector(".client-nav");
  const cycleBtn = document.getElementById("cycle-ambiance");
  const versionBadge = document.getElementById("app-version");
  const fileSizeBadge = document.getElementById("download-file-size");
  const downloadLinks = ["download-btn", "download-btn-2", "download-nav"]
    .map((id) => document.getElementById(id))
    .filter((el) => el !== null);

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return null;
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)} Mo`;
  }

  function applyDownload(url, version) {
    if (versionBadge && version) versionBadge.textContent = `v${version}`;

    if (url) {
      downloadLinks.forEach((link) => {
        link.href = url;
        link.removeAttribute("aria-disabled");
        link.removeAttribute("title");
        if (link.id === "download-btn" || link.id === "download-btn-2") {
          link.textContent = link.id === "download-btn" ? "Télécharger pour Windows" : "Télécharger l'application";
        }
      });
      if (fileSizeBadge) {
        fetch(url, { method: "HEAD" })
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
      if (link.id === "download-btn" || link.id === "download-btn-2") {
        link.textContent = "Bientôt disponible";
      }
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

  // ── 3. Interactive 3D Card Tilt, Magnetic Buttons & Spotlight Glow ──
  const tiltElements = document.querySelectorAll(".bento-card, .mockup-window");
  tiltElements.forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Spotlight glow property
      el.style.setProperty("--mouse-x", `${x}px`);
      el.style.setProperty("--mouse-y", `${y}px`);

      // 3D Tilt calculations
      const xc = rect.width / 2;
      const yc = rect.height / 2;
      const dx = x - xc;
      const dy = y - yc;
      
      // Limit max tilt angles
      const maxTilt = el.classList.contains("mockup-window") ? 2 : 6;
      const tiltX = -(dy / yc) * maxTilt;
      const tiltY = (dx / xc) * maxTilt;

      el.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
      if (el.classList.contains("bento-card")) {
        el.style.boxShadow = `0 30px 60px rgba(0, 0, 0, 0.5), var(--glow-purple)`;
      }
    });

    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
      if (el.classList.contains("bento-card")) {
        el.style.boxShadow = "";
      }
    });
  });

  // Magnetic attraction for download buttons
  const magneticButtons = document.querySelectorAll(".btn-download, .cta-download-btn, .ambiance-btn, .audio-btn, .theme-btn");
  magneticButtons.forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const xc = rect.width / 2;
      const yc = rect.height / 2;
      const dx = x - xc;
      const dy = y - yc;

      // Attract button toward cursor slightly (max 8px translation)
      btn.style.transform = `translate3d(${dx * 0.28}px, ${dy * 0.28}px, 0) scale(1.03)`;
      btn.style.transition = "transform 0.05s linear";
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "";
      btn.style.transition = "transform 0.4s var(--ease-out)";
    });
  });

  // ── 4. Background Ambient Slideshow (GTA 6 Style) & Parallax Zoom ──
  let bgIndex = Number(localStorage.getItem("sr_bg_index") || "18");
  if (Number.isNaN(bgIndex) || bgIndex < 0 || bgIndex >= wallpapers.length) bgIndex = 18;

  let activeAmbient = ambient1;
  let hiddenAmbient = ambient2;
  let slideshowInterval = null;

  function setAmbient(index) {
    if (!wallpapers[index]) return;
    
    // Load image on hidden layer
    if (hiddenAmbient) {
      hiddenAmbient.style.backgroundImage = `url("${url(wallpapers[index])}")`;
      hiddenAmbient.classList.add("active");
    }
    
    // Fade out active layer
    if (activeAmbient) {
      activeAmbient.classList.remove("active");
    }
    
    // Swap roles
    const temp = activeAmbient;
    activeAmbient = hiddenAmbient;
    hiddenAmbient = temp;

    localStorage.setItem("sr_bg_index", String(index));
    bgIndex = index;
  }

  // Init first background
  if (ambient1 && wallpapers[bgIndex]) {
    ambient1.style.backgroundImage = `url("${url(wallpapers[bgIndex])}")`;
    ambient1.classList.add("active");
  }

  function startSlideshow() {
    clearInterval(slideshowInterval);
    slideshowInterval = setInterval(() => {
      setAmbient((bgIndex + 1) % wallpapers.length);
    }, 10000); // GTA 6 loading slideshow: change every 10 seconds
  }

  if (cycleBtn) {
    cycleBtn.addEventListener("click", () => {
      setAmbient((bgIndex + 1) % wallpapers.length);
      startSlideshow(); // Reset automatic interval on user click
    });
  }

  startSlideshow();

  // Mouse Parallax & Scroll Zoom combined calculation
  let mouseX = 0;
  let mouseY = 0;

  function updateAmbientTransform() {
    const x = mouseX / 60;
    const y = mouseY / 60;
    
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollRatio = docHeight > 0 ? window.scrollY / docHeight : 0;
    
    const scale = 1.0 + scrollRatio * 0.05;
    
    if (ambientWrapper) {
      ambientWrapper.style.transform = `scale(${scale}) translate3d(${x}px, ${y}px, 0)`;
    }
  }

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX - window.innerWidth / 2;
    mouseY = e.clientY - window.innerHeight / 2;
    updateAmbientTransform();
  });

  window.addEventListener("scroll", () => {
    updateAmbientTransform();
  });

  // ── 5. Showcase Interactive Mockup ──
  const tabs = document.querySelectorAll(".showcase-tab");
  const images = document.querySelectorAll(".mockup-img");
  const hotspots = document.querySelectorAll(".hotspot");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-tab");

      // Set tab active
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // Set image active
      images.forEach((img) => {
        if (img.getAttribute("data-content") === target) {
          img.classList.add("active");
        } else {
          img.classList.remove("active");
        }
      });

      // Filter hotspots
      hotspots.forEach((spot) => {
        if (spot.getAttribute("data-tab") === target) {
          spot.classList.add("visible");
        } else {
          spot.classList.remove("visible");
        }
      });
    });
  });

  // ── 6. Infinite Horizontal Wallpaper Scroll (Marquee) ──
  const trackLeft = document.getElementById("mosaic-track-left");
  if (trackLeft) {
    // Select a smaller sample of wallpapers for the loop
    const sampleWallpapers = wallpapers.filter((_, idx) => idx % 4 === 0).slice(0, 15);
    
    const populateTrack = (trackElement) => {
      // Append twice to loop seamlessly
      const createCards = () => {
        sampleWallpapers.forEach((file) => {
          const card = document.createElement("article");
          card.className = "mosaic-card";
          
          const img = document.createElement("img");
          img.src = url(file);
          img.alt = "Visuel Vice City";
          img.loading = "lazy";
          img.decoding = "async";
          
          card.appendChild(img);
          trackElement.appendChild(card);
        });
      };
      
      createCards();
      createCards(); // Duplicate set for infinite loop overlap
    };

    populateTrack(trackLeft);
  }

  // ── 7. Header Navigation Scroll class ──
  window.addEventListener("scroll", () => {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
  });

  // ── 8. Reveal System (IntersectionObserver) ──
  const revealEls = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => observer.observe(el));

  // ── 9. Interactive Cyber Text Scramble Effect ──
  const scrambleElements = document.querySelectorAll(".btn-download, .cta-download-btn, .showcase-tab");
  
  function scrambleText(element) {
    const chars = "XYZ0123456789@#$%&*";
    // Find text node only to preserve nested tags (e.g. SVGs)
    let textNode = null;
    for (let node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 0) {
        textNode = node;
        break;
      }
    }
    if (!textNode) return;
    
    const originalText = element.getAttribute("data-original-text") || textNode.nodeValue.trim();
    if (!element.getAttribute("data-original-text")) {
      element.setAttribute("data-original-text", originalText);
    }
    
    let iterations = 0;
    const interval = setInterval(() => {
      textNode.nodeValue = " " + originalText.split("").map((char, index) => {
        if (index < iterations) return originalText[index];
        if (char === " ") return " ";
        return chars[Math.floor(Math.random() * chars.length)];
      }).join("");
      
      if (iterations >= originalText.length) {
        clearInterval(interval);
        textNode.nodeValue = " " + originalText;
      }
      iterations += 1 / 2;
    }, 20);
  }

  scrambleElements.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      scrambleText(el);
    });
  });

  // ── 10. Cyber Lofi Web Audio Synth ──
  const audioToggle = document.getElementById("audio-toggle");
  let audioCtx = null;
  let synthGain = null;
  let synthFilter = null;
  let synthInterval = null;
  let synthOscillators = [];
  let synthLfo = null;
  let isPlayingSynth = false;

  const synthProfiles = {
    dark: { master: 0.22, filter: 520, lfoDepth: 220, oscGain: 0.018 },
    light: { master: 0.16, filter: 920, lfoDepth: 140, oscGain: 0.014 }
  };

  const chords = [
    [130.81, 164.81, 196.0, 246.94],
    [123.47, 155.56, 185.0, 233.08],
    [110.0, 138.59, 164.81, 207.65],
    [116.54, 146.83, 174.61, 220.0]
  ];
  let currentChord = 0;

  function getSynthProfile() {
    return window.SRTheme?.get() === "light" ? synthProfiles.light : synthProfiles.dark;
  }

  function applySynthProfile() {
    if (!audioCtx || !synthGain || !synthFilter) return;
    const profile = getSynthProfile();
    const now = audioCtx.currentTime;
    synthGain.gain.cancelScheduledValues(now);
    synthGain.gain.setTargetAtTime(isPlayingSynth ? profile.master : 0, now, 0.35);
    synthFilter.frequency.cancelScheduledValues(now);
    synthFilter.frequency.setTargetAtTime(profile.filter, now, 0.45);
  }

  function stopSynthLfo() {
    if (!synthLfo) return;
    try {
      synthLfo.stop();
      synthLfo.disconnect();
    } catch {
      /* already stopped */
    }
    synthLfo = null;
  }

  function initSynth() {
    if (audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();

    synthGain = audioCtx.createGain();
    synthGain.gain.setValueAtTime(0, audioCtx.currentTime);

    synthFilter = audioCtx.createBiquadFilter();
    synthFilter.type = "lowpass";
    synthFilter.Q.setValueAtTime(0.9, audioCtx.currentTime);

    synthGain.connect(synthFilter);
    synthFilter.connect(audioCtx.destination);
    applySynthProfile();
  }

  function startSynthLfo() {
    if (!audioCtx || synthLfo) return;
    const profile = getSynthProfile();
    const lfo = audioCtx.createOscillator();
    lfo.frequency.setValueAtTime(0.07, audioCtx.currentTime);

    const lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(profile.lfoDepth, audioCtx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(synthFilter.frequency);
    lfo.start();
    synthLfo = lfo;
  }

  function clearSynthOscillators() {
    synthOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        /* ignore stop error */
      }
    });
    synthOscillators = [];
  }

  function playChord(chord, fadeIn = 0.9) {
    clearSynthOscillators();
    const profile = getSynthProfile();
    const now = audioCtx.currentTime;

    chord.forEach((freq) => {
      const osc1 = audioCtx.createOscillator();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = audioCtx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(freq * 1.004, now);

      const oscGain = audioCtx.createGain();
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(profile.oscGain, now + fadeIn);

      osc1.connect(oscGain);
      osc2.connect(oscGain);
      oscGain.connect(synthGain);

      osc1.start(now);
      osc2.start(now);

      synthOscillators.push(osc1, osc2, oscGain);
    });
  }

  async function toggleSynth() {
    if (isPlayingSynth) {
      isPlayingSynth = false;
      audioToggle.classList.remove("playing");
      clearInterval(synthInterval);
      if (synthGain && audioCtx) {
        const now = audioCtx.currentTime;
        synthGain.gain.cancelScheduledValues(now);
        synthGain.gain.setTargetAtTime(0, now, 0.25);
      }
      setTimeout(() => {
        if (!isPlayingSynth) {
          clearSynthOscillators();
          stopSynthLfo();
        }
      }, 700);
      return;
    }

    initSynth();
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    isPlayingSynth = true;
    audioToggle.classList.add("playing");
    applySynthProfile();
    startSynthLfo();

    playChord(chords[currentChord], 1.1);
    synthInterval = setInterval(() => {
      currentChord = (currentChord + 1) % chords.length;
      playChord(chords[currentChord], 0.65);
    }, 6000);
  }

  if (audioToggle) {
    audioToggle.addEventListener("click", () => {
      toggleSynth().catch(() => {
        isPlayingSynth = false;
        audioToggle.classList.remove("playing");
      });
    });
  }

  window.addEventListener("sr-theme-change", () => {
    applySynthProfile();
    if (isPlayingSynth) {
      stopSynthLfo();
      startSynthLfo();
    }
  });
})();
