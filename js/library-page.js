(function () {
  const client = typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null;
  if (!client || !window.SR_CONFIG) {
    console.error("Supabase ou SR_CONFIG manquant.");
    return;
  }

  const CATEGORIES = [
    "Tous",
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
  }

  async function loadLibrary(nodes) {
    if (nodes.statusEl) nodes.statusEl.textContent = "Chargement de la bibliothèque…";
    const { data, error } = await client
      .from("library_textures")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (isPermissionError(error)) {
        showGate(nodes);
        return;
      }
      if (nodes.statusEl) nodes.statusEl.textContent = "Impossible de charger la bibliothèque.";
      if (nodes.emptyEl) {
        nodes.emptyEl.hidden = false;
        const h2 = nodes.emptyEl.querySelector("h2");
        const p = nodes.emptyEl.querySelector("p");
        if (h2) h2.textContent = "Erreur";
        if (p) {
          p.textContent = "Un problème est survenu. Réessaie plus tard ou reconnecte-toi.";
        }
      }
      return;
    }

    allItems = data || [];
    render();
  }

  function bindFilters(nodes) {
    if (nodes.searchEl && !nodes.searchEl.dataset.bound) {
      nodes.searchEl.dataset.bound = "1";
      nodes.searchEl.addEventListener("input", render);
    }
    if (nodes.categoryEl && !nodes.categoryEl.dataset.bound) {
      nodes.categoryEl.dataset.bound = "1";
      nodes.categoryEl.addEventListener("change", render);
    }
    if (nodes.colorEl && !nodes.colorEl.dataset.bound) {
      nodes.colorEl.dataset.bound = "1";
      nodes.colorEl.addEventListener("change", render);
    }
  }

  function mount() {
    const nodes = els();
    if (!nodes.gateEl && !nodes.appEl) return;

    fillSelect(nodes.categoryEl, CATEGORIES, true);
    fillSelect(nodes.colorEl, COLORS, true);
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
  }

  window.SRLibrary = { mount: mount };
  mount();
})();
