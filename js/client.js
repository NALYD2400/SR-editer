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
  const downloadLinks = ["download-btn", "download-btn-2", "download-nav"]
    .map((id) => document.getElementById(id))
    .filter((el) => el !== null);

  // ── 1. App Version & Download Links ──
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
        } else if (config.downloadUrl) {
          link.href = config.downloadUrl;
          link.removeAttribute("aria-disabled");
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
  const magneticButtons = document.querySelectorAll(".btn-download, .cta-download-btn, .ambiance-btn, .audio-btn");
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
  let isPlayingSynth = false;

  const chords = [
    [130.81, 164.81, 196.00, 246.94], // Cmaj7 (C3, E3, G3, B3)
    [123.47, 155.56, 185.00, 233.08], // Bmaj7
    [110.00, 138.59, 164.81, 207.65], // Amaj7
    [116.54, 146.83, 174.61, 220.00]  // Bbmaj7
  ];
  let currentChord = 0;

  function initSynth() {
    if (audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    synthGain = audioCtx.createGain();
    synthGain.gain.setValueAtTime(0, audioCtx.currentTime);
    
    synthFilter = audioCtx.createBiquadFilter();
    synthFilter.type = "lowpass";
    synthFilter.frequency.setValueAtTime(600, audioCtx.currentTime);
    synthFilter.Q.setValueAtTime(1, audioCtx.currentTime);
    
    synthGain.connect(synthFilter);
    synthFilter.connect(audioCtx.destination);
    
    // Slow sweeping low frequency modulation
    const lfo = audioCtx.createOscillator();
    lfo.frequency.setValueAtTime(0.08, audioCtx.currentTime);
    
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(250, audioCtx.currentTime);
    
    lfo.connect(lfoGain);
    lfoGain.connect(synthFilter.frequency);
    lfo.start();
  }

  function playChord(chord) {
    synthOscillators.forEach((osc) => {
      try { osc.stop(); } catch { /* ignore stop error */ }
    });
    synthOscillators = [];
    
    chord.forEach((freq) => {
      const osc1 = audioCtx.createOscillator();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      const osc2 = audioCtx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(freq * 1.006, audioCtx.currentTime);
      
      const oscGain = audioCtx.createGain();
      oscGain.gain.setValueAtTime(0.035, audioCtx.currentTime);
      
      osc1.connect(oscGain);
      osc2.connect(oscGain);
      oscGain.connect(synthGain);
      
      osc1.start();
      osc2.start();
      
      synthOscillators.push(osc1, osc2);
    });
  }

  function toggleSynth() {
    if (isPlayingSynth) {
      isPlayingSynth = false;
      audioToggle.classList.remove("playing");
      clearInterval(synthInterval);
      if (synthGain) {
        synthGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);
      }
      setTimeout(() => {
        if (!isPlayingSynth) {
          synthOscillators.forEach(osc => { try { osc.stop(); } catch { /* ignore stop error */ } });
          synthOscillators = [];
        }
      }, 900);
    } else {
      initSynth();
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      isPlayingSynth = true;
      audioToggle.classList.add("playing");
      
      synthGain.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 1.2);
      
      playChord(chords[currentChord]);
      synthInterval = setInterval(() => {
        currentChord = (currentChord + 1) % chords.length;
        playChord(chords[currentChord]);
      }, 6000);
    }
  }

  if (audioToggle) {
    audioToggle.addEventListener("click", toggleSynth);
  }
})();
