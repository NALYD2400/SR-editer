(function () {
  const client = typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null;
  if (!client || !window.SR_CONFIG) {
    console.error("Supabase ou SR_CONFIG manquant.");
    return;
  }

  const CATEGORIES = [
    "Tous",
    "Couleur unie",
    "Couleurs GTA V / FiveM",
    "Dégradés",
    "Badges & Logos Vectoriels",
    "Métal",
    "Bois",
    "Brique",
    "Béton",
    "Plâtre",
    "Tissu/Cuir",
    "Carbone/Plastique",
    "Verre",
    "Pierre",
    "Néon/Lumière",
    "Peinture",
    "Sol/Asphalte",
    "Motif",
    "Autre",
  ];

  const COLORS = [
    "Toutes",
    "Noir",
    "Blanc",
    "Gris",
    "Rouge",
    "Bleu",
    "Vert",
    "Jaune",
    "Orange",
    "Violet",
    "Rose",
    "Marron",
    "Beige",
    "Multicolore",
  ];

  let allItems = [];
  let bound = false;

  function els() {
    return {
      gateEl: document.getElementById("library-gate"),
      appEl: document.getElementById("library-app"),
      gridEl: document.getElementById("library-grid"),
      statusEl: document.getElementById("library-status"),
      emptyEl: document.getElementById("library-empty"),
      searchEl: document.getElementById("library-search"),
      categoryEl: document.getElementById("library-category"),
      colorEl: document.getElementById("library-color"),
      guestHint: document.getElementById("library-guest-hint"),
    };
  }

  const COLOR_SWATCHES = {
    "Toutes": "conic-gradient(from 0deg, #ff0055, #ffaa00, #2ecc71, #00bbff, #9b59b6, #ff0055)",
    "Noir": "#16161a",
    "Blanc": "#ffffff",
    "Gris": "#71717a",
    "Rouge": "#ef4444",
    "Bleu": "#3b82f6",
    "Vert": "#10b981",
    "Jaune": "#eab308",
    "Orange": "#f97316",
    "Violet": "#a855f7",
    "Rose": "#ec4899",
    "Marron": "#78350f",
    "Beige": "#d6c7b2",
    "Multicolore": "linear-gradient(135deg, #ff007a 0%, #7928ca 50%, #00dfd8 100%)",
  };

  const ICONS = {
    category: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
    color: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"></path></svg>',
    arrow: '<svg class="sr-select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>',
    check: '<svg class="sr-select-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  };

  function createCustomSelect(selectEl, type) {
    if (!selectEl || selectEl.dataset.customized === "1") return;
    selectEl.dataset.customized = "1";
    selectEl.classList.add("sr-select-native");

    const isColor = type === "color";
    const wrapper = document.createElement("div");
    wrapper.className = "sr-custom-select";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "sr-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const triggerContent = document.createElement("div");
    triggerContent.className = "sr-select-trigger-content";

    const iconSpan = document.createElement("span");
    iconSpan.className = "sr-select-icon";
    iconSpan.innerHTML = isColor ? ICONS.color : ICONS.category;

    const labelSpan = document.createElement("span");
    labelSpan.className = "sr-select-label";

    triggerContent.appendChild(iconSpan);
    triggerContent.appendChild(labelSpan);

    trigger.appendChild(triggerContent);
    trigger.insertAdjacentHTML("beforeend", ICONS.arrow);

    const menu = document.createElement("div");
    menu.className = "sr-select-menu";
    menu.setAttribute("role", "listbox");
    menu.setAttribute("data-lenis-prevent", "true");

    const optionsContainer = document.createElement("div");
    optionsContainer.className = "sr-select-options";
    optionsContainer.setAttribute("data-lenis-prevent", "true");
    menu.appendChild(optionsContainer);

    function stopWheel(e) {
      e.stopPropagation();
    }
    menu.addEventListener("wheel", stopWheel, { passive: true });
    optionsContainer.addEventListener("wheel", stopWheel, { passive: true });

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);

    selectEl.parentNode.insertBefore(wrapper, selectEl);
    wrapper.appendChild(selectEl);

    function updateOptions() {
      optionsContainer.innerHTML = "";
      Array.from(selectEl.options).forEach(function (opt) {
        const optionBtn = document.createElement("button");
        optionBtn.type = "button";
        optionBtn.className = "sr-select-option" + (opt.value === selectEl.value ? " is-selected" : "");
        optionBtn.setAttribute("data-value", opt.value);

        const leftSpan = document.createElement("span");
        leftSpan.className = "sr-select-option-left";

        if (isColor) {
          const swatch = document.createElement("span");
          swatch.className = "sr-select-color-dot";
          swatch.style.background = COLOR_SWATCHES[opt.value] || "#888888";
          leftSpan.appendChild(swatch);
        }

        const textSpan = document.createElement("span");
        textSpan.textContent = opt.textContent;
        leftSpan.appendChild(textSpan);

        optionBtn.appendChild(leftSpan);
        optionBtn.insertAdjacentHTML("beforeend", ICONS.check);

        optionBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          selectEl.value = opt.value;
          selectEl.dispatchEvent(new Event("change", { bubbles: true }));
          closeMenu();
        });

        optionsContainer.appendChild(optionBtn);
      });
      syncLabel();
    }

    function syncLabel() {
      const selectedOpt = selectEl.options[selectEl.selectedIndex] || selectEl.options[0];
      const val = selectEl.value;
      let display = selectedOpt ? selectedOpt.textContent : "";
      if (!isColor && (val === "Tous" || !val)) {
        display = "Toutes les catégories";
      } else if (isColor && (val === "Toutes" || !val)) {
        display = "Toutes les couleurs";
      }
      labelSpan.textContent = display;

      if (isColor) {
        if (val !== "Toutes" && COLOR_SWATCHES[val]) {
          iconSpan.innerHTML = '<span class="sr-select-color-dot" style="background:' + COLOR_SWATCHES[val] + '"></span>';
        } else {
          iconSpan.innerHTML = ICONS.color;
        }
      }

      Array.from(optionsContainer.children).forEach(function (btn) {
        const btnVal = btn.getAttribute("data-value");
        btn.classList.toggle("is-selected", btnVal === val);
      });
    }

    function openMenu() {
      document.querySelectorAll(".sr-custom-select.is-open").forEach(function (other) {
        if (other !== wrapper) {
          other.classList.remove("is-open");
          const otherTrig = other.querySelector(".sr-select-trigger");
          if (otherTrig) otherTrig.setAttribute("aria-expanded", "false");
        }
      });

      const triggerWidth = trigger.offsetWidth;
      if (triggerWidth > 0) {
        menu.style.minWidth = triggerWidth + "px";
      }

      const rect = wrapper.getBoundingClientRect();
      if (rect.left + (triggerWidth || 280) > window.innerWidth - 20) {
        wrapper.classList.add("align-right");
      } else {
        wrapper.classList.remove("align-right");
      }

      wrapper.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
    }

    function closeMenu() {
      wrapper.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }

    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      if (wrapper.classList.contains("is-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    document.addEventListener("click", function (e) {
      if (!wrapper.contains(e.target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && wrapper.classList.contains("is-open")) {
        closeMenu();
      }
    });

    selectEl.addEventListener("change", syncLabel);

    updateOptions();
    wrapper.updateOptions = updateOptions;
    wrapper.syncLabel = syncLabel;
    selectEl._customSelect = wrapper;
  }

  function fillSelect(select, values, skipFirst) {
    if (!select || select.dataset.filled === "1") return;
    values.forEach(function (value, index) {
      if (skipFirst && index === 0) return;
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
    });
    select.dataset.filled = "1";
    if (select._customSelect && typeof select._customSelect.updateOptions === "function") {
      select._customSelect.updateOptions();
    }
  }

  function showGate(nodes) {
    if (nodes.gateEl) nodes.gateEl.hidden = false;
    if (nodes.appEl) nodes.appEl.hidden = true;
    if (nodes.guestHint) nodes.guestHint.hidden = true;
    if (nodes.statusEl) nodes.statusEl.textContent = "";
  }

  function showApp(nodes) {
    if (nodes.gateEl) nodes.gateEl.hidden = true;
    if (nodes.appEl) nodes.appEl.hidden = false;
    if (nodes.guestHint) nodes.guestHint.hidden = true;
  }

  function filenameFromUrl(url, fallback) {
    try {
      const path = new URL(url).pathname;
      return path.split("/").pop() || fallback || "texture.webp";
    } catch (_err) {
      return (fallback || "texture") + ".webp";
    }
  }

  async function downloadTexture(item) {
    try {
      const response = await fetch(item.url, { mode: "cors" });
      if (!response.ok) throw new Error("Téléchargement impossible");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filenameFromUrl(item.url, item.name);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (_err) {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
  }

  function isPermissionError(error) {
    if (!error) return false;
    const msg = String(error.message || error.code || "").toLowerCase();
    return (
      msg.indexOf("permission denied") !== -1 ||
      msg.indexOf("not authorized") !== -1 ||
      msg.indexOf("jwt") !== -1 ||
      error.code === "42501" ||
      error.code === "PGRST301"
    );
  }

  function render() {
    const nodes = els();
    if (!nodes.gridEl) return;

    const q = (nodes.searchEl && nodes.searchEl.value ? nodes.searchEl.value : "").trim().toLowerCase();
    const cat = nodes.categoryEl ? nodes.categoryEl.value : "Tous";
    const color = nodes.colorEl ? nodes.colorEl.value : "Toutes";

    const filtered = allItems.filter(function (item) {
      if (cat !== "Tous" && item.category !== cat) return false;
      if (color !== "Toutes" && item.color !== color) return false;
      if (!q) return true;
      return (
        String(item.name || "").toLowerCase().indexOf(q) !== -1 ||
        String(item.category || "").toLowerCase().indexOf(q) !== -1 ||
        String(item.color || "").toLowerCase().indexOf(q) !== -1
      );
    });

    nodes.gridEl.innerHTML = "";
    if (nodes.statusEl) {
      nodes.statusEl.textContent =
        filtered.length + " texture" + (filtered.length > 1 ? "s" : "") + " · connecté";
    }

    if (nodes.emptyEl) nodes.emptyEl.hidden = filtered.length > 0;
    if (filtered.length === 0) return;

    filtered.forEach(function (item) {
      const card = document.createElement("article");
      card.className = "library-card";

      const preview = document.createElement("div");
      preview.className = "library-card-preview";
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = item.name || "Texture";
      img.loading = "lazy";
      img.decoding = "async";
      img.draggable = true;
      preview.appendChild(img);

      const body = document.createElement("div");
      body.className = "library-card-body";

      const title = document.createElement("h3");
      title.textContent = item.name || "Sans nom";
      title.title = item.name || "";

      const meta = document.createElement("div");
      meta.className = "library-card-meta";
      if (item.category) {
        const chip = document.createElement("span");
        chip.className = "library-chip";
        chip.textContent = item.category;
        meta.appendChild(chip);
      }
      if (item.color) {
        const chip = document.createElement("span");
        chip.className = "library-chip";
        chip.textContent = item.color;
        meta.appendChild(chip);
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "library-download";
      btn.textContent = "Télécharger";
      btn.addEventListener("click", function () {
        void downloadTexture(item);
      });

      body.appendChild(title);
      body.appendChild(meta);
      body.appendChild(btn);
      card.appendChild(preview);
      card.appendChild(body);
      nodes.gridEl.appendChild(card);
    });

    if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === "function") {
      window.ScrollTrigger.refresh();
    }
    if (window.__srLenis && typeof window.__srLenis.resize === "function") {
      window.__srLenis.resize();
    }
  }

  function showLoadError(nodes, title, message) {
    showApp(nodes);
    if (nodes.statusEl) nodes.statusEl.textContent = "";
    if (nodes.gridEl) nodes.gridEl.innerHTML = "";
    if (nodes.emptyEl) {
      nodes.emptyEl.hidden = false;
      const h2 = nodes.emptyEl.querySelector("h2");
      const p = nodes.emptyEl.querySelector("p");
      if (h2) h2.textContent = title;
      if (p) p.textContent = message;
    }
  }

  async function loadLibrary(nodes) {
    if (nodes.statusEl) nodes.statusEl.textContent = "Chargement de la bibliothèque…";
    const { data, error } = await client
      .from("library_textures")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (isPermissionError(error)) {
        // Session présente mais RLS/JWT KO — ne pas afficher le gate "connexion requise"
        showLoadError(
          nodes,
          "Accès impossible",
          "Ta session n’a pas pu lire la bibliothèque. Reconnecte-toi, puis réessaie."
        );
        return;
      }
      showLoadError(
        nodes,
        "Erreur",
        "Un problème est survenu. Réessaie plus tard ou reconnecte-toi."
      );
      return;
    }

    allItems = data || [];
    if (nodes.emptyEl) {
      const h2 = nodes.emptyEl.querySelector("h2");
      const p = nodes.emptyEl.querySelector("p");
      if (h2) h2.textContent = "Aucune texture trouvée";
      if (p) {
        p.textContent =
          "Aucun résultat ne correspond à vos critères de recherche. Essayez de réinitialiser vos filtres.";
      }
    }
    render();
  }

  function bindFilters(nodes) {
    if (nodes.searchEl && !nodes.searchEl.dataset.bound) {
      nodes.searchEl.dataset.bound = "1";
      nodes.searchEl.addEventListener("input", function () {
        render();
      });
    }
    if (nodes.categoryEl && !nodes.categoryEl.dataset.bound) {
      nodes.categoryEl.dataset.bound = "1";
      nodes.categoryEl.addEventListener("change", function () {
        syncPills(nodes.categoryEl.value);
        render();
      });
    }
    if (nodes.colorEl && !nodes.colorEl.dataset.bound) {
      nodes.colorEl.dataset.bound = "1";
      nodes.colorEl.addEventListener("change", render);
    }

    const resetBtn = document.getElementById("reset-filters-btn");
    if (resetBtn && !resetBtn.dataset.bound) {
      resetBtn.dataset.bound = "1";
      resetBtn.addEventListener("click", function () {
        if (nodes.searchEl) nodes.searchEl.value = "";
        if (nodes.categoryEl) {
          nodes.categoryEl.value = "Tous";
          nodes.categoryEl.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (nodes.colorEl) {
          nodes.colorEl.value = "Toutes";
          nodes.colorEl.dispatchEvent(new Event("change", { bubbles: true }));
        }
        syncPills("Tous");
        render();
      });
    }

    const pills = document.querySelectorAll(".pill-btn[data-pill-cat]");
    pills.forEach(function (pill) {
      if (pill.dataset.bound) return;
      pill.dataset.bound = "1";
      pill.addEventListener("click", function () {
        const cat = pill.getAttribute("data-pill-cat");
        if (nodes.categoryEl) {
          nodes.categoryEl.value = cat;
          nodes.categoryEl.dispatchEvent(new Event("change", { bubbles: true }));
        }
        syncPills(cat);
        render();
      });
    });
  }

  function syncPills(activeCat) {
    const pills = document.querySelectorAll(".pill-btn[data-pill-cat]");
    pills.forEach(function (p) {
      p.classList.toggle("active", p.getAttribute("data-pill-cat") === activeCat);
    });
  }

  let authBound = false;

  function mount() {
    const nodes = els();
    if (!nodes.gateEl && !nodes.appEl) return;

    fillSelect(nodes.categoryEl, CATEGORIES, true);
    fillSelect(nodes.colorEl, COLORS, true);

    createCustomSelect(nodes.categoryEl, "category");
    createCustomSelect(nodes.colorEl, "color");

    bindFilters(nodes);

    client.auth.getSession().then(function (result) {
      const session = result.data && result.data.session;
      if (!session) {
        showGate(nodes);
        return;
      }
      showApp(nodes);
      void loadLibrary(nodes);
    });

    if (!authBound) {
      authBound = true;
      client.auth.onAuthStateChange(function (_event, session) {
        const current = els();
        if (!current.gateEl && !current.appEl) return;
        if (!session) {
          showGate(current);
          return;
        }
        showApp(current);
        void loadLibrary(current);
      });
    }
  }

  window.SRLibrary = { mount: mount };
  mount();
})();
