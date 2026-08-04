/**
 * Admin — Bibliothèque modèles 3D (skins / véhicules / peds / armes / props)
 * Upload pack + previews (image/glb), CRUD, sync Drive optionnelle.
 */
(function initAdminLibraryModels() {
  const MODEL_CATEGORIES = ["Armes", "Véhicules", "Peds", "Props", "Skins", "Autre"];
  const PACK_EXT = /\.(ya?dr|yft|ydd|ytd|ymap|ymf|meta|xml|ydr|yft|ydd|ytd|zip|rar|7z|dds|png|jpg|jpeg|webp)$/i;

  let models = [];
  let modelsFilter = "all";
  let modelsSearch = "";
  let editingId = null;
  let previewImageFile = null;
  let previewGlbFile = null;
  let packFiles = [];
  let pendingDelete = null;
  let driveConfigured = false;

  function api() {
    return window.SRAdminApi || null;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    if (api()?.escapeHtml) return api().escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatBytes(n) {
    const v = Number(n) || 0;
    if (v < 1024) return `${v} o`;
    if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} Ko`;
    return `${(v / (1024 * 1024)).toFixed(1)} Mo`;
  }

  function setHub(tab) {
    const texturesView = $("library-textures-view");
    const modelsView = $("library-models-view");
    document.querySelectorAll("[data-library-hub]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-library-hub") === tab);
    });
    if (texturesView) texturesView.hidden = tab !== "textures";
    if (modelsView) modelsView.hidden = tab !== "models";
    if (tab === "models") {
      void refreshDriveStatus();
      void loadModels();
    }
  }

  function setCreateOpen(open, mode) {
    const panel = $("models-create-panel");
    const toggle = $("models-create-toggle");
    if (!panel || !toggle) return;
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open && mode === "create") resetForm();
    if (open) {
      $("models-form-title").textContent = editingId ? "Modifier le modèle" : "Publier un modèle";
      $("models-submit-btn").textContent = editingId ? "Enregistrer" : "Publier";
    }
  }

  function resetForm() {
    editingId = null;
    previewImageFile = null;
    previewGlbFile = null;
    packFiles = [];
    const form = $("models-form");
    if (form) form.reset();
    $("models-id").value = "";
    $("models-preview-img").hidden = true;
    $("models-preview-img").removeAttribute("src");
    $("models-preview-placeholder").hidden = false;
    $("models-glb-chip").hidden = true;
    $("models-pack-list").innerHTML = "";
    $("models-pack-summary").textContent = "Aucun fichier pack";
    $("models-upload-progress").hidden = true;
    $("models-cancel-btn").hidden = true;
    $("models-form-hint").textContent = "Pack → Google Drive direct · previews (légères) → Supabase.";
  }

  function renderPackList() {
    const list = $("models-pack-list");
    const summary = $("models-pack-summary");
    if (!list || !summary) return;
    const total = packFiles.reduce((sum, f) => sum + (f.size || 0), 0);
    summary.textContent = packFiles.length
      ? `${packFiles.length} fichier${packFiles.length > 1 ? "s" : ""} · ${formatBytes(total)}`
      : "Aucun fichier pack";
    list.innerHTML = packFiles
      .map(
        (file, index) => `
      <li class="models-pack-item">
        <span title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
        <em>${formatBytes(file.size)}</em>
        <button type="button" data-pack-remove="${index}" aria-label="Retirer">×</button>
      </li>`
      )
      .join("");
    list.querySelectorAll("[data-pack-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        packFiles.splice(Number(btn.getAttribute("data-pack-remove")), 1);
        renderPackList();
      });
    });
  }

  function addPackFiles(fileList) {
    const incoming = Array.from(fileList || []).filter((f) => PACK_EXT.test(f.name) || f.type === "application/zip");
    if (!incoming.length) return;
    const map = new Map(packFiles.map((f) => [f.name + f.size, f]));
    incoming.forEach((f) => map.set(f.name + f.size, f));
    packFiles = Array.from(map.values());
    renderPackList();
    setCreateOpen(true, editingId ? "edit" : "create");
  }

  function setPreviewImage(file) {
    previewImageFile = file || null;
    const img = $("models-preview-img");
    const ph = $("models-preview-placeholder");
    if (!img || !ph) return;
    if (!file) {
      img.hidden = true;
      img.removeAttribute("src");
      ph.hidden = false;
      return;
    }
    img.src = URL.createObjectURL(file);
    img.hidden = false;
    ph.hidden = true;
  }

  function setPreviewGlb(file) {
    previewGlbFile = file || null;
    const chip = $("models-glb-chip");
    if (!chip) return;
    if (!file) {
      chip.hidden = true;
      chip.textContent = "";
      return;
    }
    chip.hidden = false;
    chip.textContent = `GLB · ${file.name} (${formatBytes(file.size)})`;
  }

  async function zipPackFiles(files) {
    if (!window.JSZip) throw new Error("JSZip non chargé.");
    if (files.length === 1 && /\.zip$/i.test(files[0].name)) return files[0];
    const zip = new window.JSZip();
    for (const file of files) {
      zip.file(file.name, file);
    }
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    return new File([blob], "model-pack.zip", { type: "application/zip" });
  }

  /** Previews only — never packs (Supabase ~500 Mo). */
  async function uploadPreviewToBucket(path, blob, contentType, onProgress) {
    const supabase = api()?.getSupabase?.();
    if (!supabase) throw new Error("Supabase non prêt.");
    onProgress?.(30, "Envoi preview…");
    const { error } = await supabase.storage.from("models-library").upload(path, blob, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("models-library").getPublicUrl(path);
    onProgress?.(70, "Preview enregistrée.");
    return { path, publicUrl: data.publicUrl };
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    }
    return btoa(binary);
  }

  /** Pack → Google Drive only, by ~2 Mo chunks (no Supabase Storage). */
  async function uploadPackToDrive(zipFile, displayName, onProgress) {
    const total = zipFile.size;
    const filename = `${(displayName || "model").replace(/[^\w.-]+/g, "_").slice(0, 80)}-${Date.now()}.zip`;
    onProgress?.(5, "Ouverture session Google Drive…");
    const start = await api().adminRequest("library-models-drive-start", { filename, size: total });
    if (!start.ok || !start.uploadUrl) throw new Error(start.error || "Session Drive impossible.");

    const buffer = new Uint8Array(await zipFile.arrayBuffer());
    const chunkSize = 2 * 1024 * 1024; // 2 Mo
    let offset = 0;
    let fileMeta = null;

    while (offset < total) {
      const end = Math.min(offset + chunkSize, total);
      const slice = buffer.subarray(offset, end);
      const pct = 8 + Math.round((offset / total) * 75);
      onProgress?.(pct, `Drive ${formatBytes(offset)} / ${formatBytes(total)}…`);

      const chunkRes = await api().adminRequest("library-models-drive-chunk", {
        uploadUrl: start.uploadUrl,
        offset,
        total,
        chunkBase64: bytesToBase64(slice),
      });
      if (!chunkRes.ok) throw new Error(chunkRes.error || "Chunk Drive échoué.");
      if (chunkRes.done && chunkRes.file) {
        fileMeta = chunkRes.file;
        break;
      }
      offset = Number(chunkRes.nextOffset || end);
    }

    if (!fileMeta?.id) throw new Error("Upload Drive incomplet.");
    onProgress?.(88, "Pack sur Google Drive.");
    return {
      pack_drive_file_id: fileMeta.id,
      pack_drive_url: fileMeta.downloadUrl || fileMeta.webViewLink || null,
      pack_size_bytes: total,
    };
  }

  function reportProgress(pct, label) {
    const wrap = $("models-upload-progress");
    const bar = $("models-upload-bar");
    const text = $("models-upload-status");
    if (!wrap || !bar || !text) return;
    wrap.hidden = false;
    bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    text.textContent = label || "";
  }

  async function loadModels() {
    const list = $("models-list");
    if (!list || !api()?.adminRequest) return;
    list.innerHTML = '<div class="empty-state library-empty">Chargement des modèles…</div>';
    try {
      const data = await api().adminRequest("library-models-list");
      if (!data.ok) throw new Error(data.error);
      models = data.rows || [];
      renderModels();
    } catch (err) {
      list.innerHTML = `<div class="empty-state library-empty is-error">Erreur : ${escapeHtml(err.message || err)}</div>`;
      syncCount(0);
    }
  }

  async function refreshDriveStatus() {
    const el = $("models-drive-status");
    if (!el || !api()?.adminRequest) return;
    try {
      const data = await api().adminRequest("library-models-drive-status");
      driveConfigured = Boolean(data.configured);
      el.textContent = driveConfigured
        ? "Google Drive : prêt — packs directs (Supabase = previews seulement)"
        : "Google Drive requis pour publier un pack (Supabase 500 Mo trop juste)";
      el.classList.toggle("is-ready", driveConfigured);
    } catch {
      el.textContent = "Google Drive : statut inconnu";
    }
  }

  function filteredModels() {
    const q = modelsSearch.trim().toLowerCase();
    return models.filter((row) => {
      if (modelsFilter !== "all" && row.category !== modelsFilter) return false;
      if (!q) return true;
      return `${row.name} ${row.category} ${row.description || ""}`.toLowerCase().includes(q);
    });
  }

  function syncCount(n) {
    const el = $("models-count");
    if (el) el.textContent = String(n);
  }

  function renderModels() {
    const list = $("models-list");
    if (!list) return;
    const rows = filteredModels();
    syncCount(rows.length);
    if (!rows.length) {
      list.innerHTML = '<div class="empty-state library-empty">Aucun modèle publié.</div>';
      return;
    }
    list.innerHTML = rows
      .map((row) => {
        const thumb = row.preview_image_url
          ? `<img src="${escapeHtml(row.preview_image_url)}" alt="" loading="lazy" />`
          : `<span class="models-card-fallback">${escapeHtml((row.category || "?").slice(0, 1))}</span>`;
        const drive = row.pack_drive_file_id
          ? `<span class="models-badge is-drive">Drive</span>`
          : `<span class="models-badge">Sans pack</span>`;
        const glb = row.preview_glb_url ? `<span class="models-badge">GLB</span>` : "";
        return `
        <article class="models-card" data-model-id="${escapeHtml(row.id)}">
          <div class="models-card-media">${thumb}</div>
          <div class="models-card-body">
            <strong title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</strong>
            <div class="models-card-meta">
              <span>${escapeHtml(row.category)}</span>
              <span>${formatBytes(row.pack_size_bytes)}</span>
              ${drive}${glb}
            </div>
            <div class="models-card-actions">
              <button type="button" class="btn btn-ghost btn-sm" data-model-edit="${escapeHtml(row.id)}">Modifier</button>
              <button type="button" class="btn btn-danger btn-sm" data-model-delete="${escapeHtml(row.id)}">Supprimer</button>
            </div>
          </div>
        </article>`;
      })
      .join("");

    list.querySelectorAll("[data-model-edit]").forEach((btn) => {
      btn.addEventListener("click", () => startEdit(btn.getAttribute("data-model-edit")));
    });
    list.querySelectorAll("[data-model-delete]").forEach((btn) => {
      btn.addEventListener("click", () => openDelete(btn.getAttribute("data-model-delete")));
    });
  }

  function startEdit(id) {
    const row = models.find((m) => m.id === id);
    if (!row) return;
    editingId = row.id;
    packFiles = [];
    previewImageFile = null;
    previewGlbFile = null;
    $("models-id").value = row.id;
    $("models-name").value = row.name || "";
    $("models-category").value = MODEL_CATEGORIES.includes(row.category) ? row.category : "Autre";
    $("models-description").value = row.description || "";
    renderPackList();
    const img = $("models-preview-img");
    const ph = $("models-preview-placeholder");
    if (row.preview_image_url && img && ph) {
      img.src = row.preview_image_url;
      img.hidden = false;
      ph.hidden = true;
    } else {
      setPreviewImage(null);
    }
    const chip = $("models-glb-chip");
    if (chip) {
      if (row.preview_glb_url) {
        chip.hidden = false;
        chip.textContent = "GLB déjà publié (remplace si tu déposes un nouveau fichier)";
      } else {
        chip.hidden = true;
      }
    }
    $("models-cancel-btn").hidden = false;
    $("models-form-hint").textContent = "Modification : laisse le pack vide pour conserver l’existant.";
    setCreateOpen(true, "edit");
  }

  function openDelete(id) {
    const row = models.find((m) => m.id === id);
    if (!row) return;
    pendingDelete = row;
    $("models-delete-name-label").textContent = row.name;
    $("models-delete-name-input").value = "";
    $("models-delete-error").hidden = true;
    $("models-delete-confirm-btn").disabled = true;
    $("models-delete-modal").hidden = false;
  }

  function closeDelete() {
    pendingDelete = null;
    $("models-delete-modal").hidden = true;
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!api()?.adminRequest) return;
    const name = $("models-name").value.trim();
    const category = $("models-category").value;
    const description = $("models-description").value.trim();
    if (!name) return;

    const submitBtn = $("models-submit-btn");
    submitBtn.disabled = true;
    try {
      let preview_image_url = null;
      let preview_glb_url = null;
      let pack_drive_file_id = null;
      let pack_drive_url = null;
      let pack_size_bytes = 0;
      let pack_file_count = 0;

      const existing = editingId ? models.find((m) => m.id === editingId) : null;
      if (existing) {
        preview_image_url = existing.preview_image_url || null;
        preview_glb_url = existing.preview_glb_url || null;
        pack_drive_file_id = existing.pack_drive_file_id || null;
        pack_drive_url = existing.pack_drive_url || existing.pack_public_url || null;
        pack_size_bytes = existing.pack_size_bytes || 0;
        pack_file_count = existing.pack_file_count || 0;
      }

      if (!editingId && packFiles.length === 0) {
        throw new Error("Dépose le pack (YDR / fichiers du skin) avant de publier.");
      }
      if (packFiles.length && !driveConfigured) {
        throw new Error("Configure Google Drive d’abord (secrets Supabase). Les packs ne vont plus sur Storage (quota 500 Mo).");
      }

      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      if (previewImageFile) {
        reportProgress(10, "Optimisation preview image…");
        const optimized = api().optimizeTexture
          ? await api().optimizeTexture(previewImageFile)
          : { blob: previewImageFile, w: 0, h: 0 };
        const uploaded = await uploadPreviewToBucket(
          `previews/img-${stamp}.webp`,
          optimized.blob,
          "image/webp",
          reportProgress
        );
        preview_image_url = uploaded.publicUrl;
      }

      if (previewGlbFile) {
        reportProgress(20, "Upload preview GLB…");
        const uploaded = await uploadPreviewToBucket(
          `previews/glb-${stamp}.glb`,
          previewGlbFile,
          "model/gltf-binary",
          reportProgress
        );
        preview_glb_url = uploaded.publicUrl;
      }

      if (packFiles.length) {
        reportProgress(25, "Compression du pack…");
        const zipFile = await zipPackFiles(packFiles);
        pack_size_bytes = zipFile.size;
        pack_file_count = packFiles.length;
        const drivePack = await uploadPackToDrive(zipFile, name, reportProgress);
        pack_drive_file_id = drivePack.pack_drive_file_id;
        pack_drive_url = drivePack.pack_drive_url;
        pack_size_bytes = drivePack.pack_size_bytes;
      }

      reportProgress(92, "Publication fiche…");
      const payload = {
        id: editingId || undefined,
        name,
        category,
        description,
        preview_image_url,
        preview_glb_url,
        pack_drive_file_id,
        pack_drive_url,
        pack_size_bytes,
        pack_file_count,
        status: "published",
      };
      const data = await api().adminRequest("library-models-upsert", payload);
      if (!data.ok) throw new Error(data.error);

      reportProgress(100, "Publié sur Drive.");
      setCreateOpen(false);
      resetForm();
      await loadModels();
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      submitBtn.disabled = false;
      setTimeout(() => {
        $("models-upload-progress").hidden = true;
      }, 900);
    }
  }

  function bindDropzone(zoneId, inputId, onFiles) {
    const zone = $(zoneId);
    const input = $(inputId);
    if (!zone || !input) return;
    zone.addEventListener("click", () => input.click());
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("is-dragover");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("is-dragover"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("is-dragover");
      onFiles(e.dataTransfer?.files);
    });
    input.addEventListener("change", () => {
      onFiles(input.files);
      input.value = "";
    });
  }

  function waitForApi(attempt) {
    if (api()?.adminRequest) {
      boot();
      return;
    }
    if ((attempt || 0) > 40) return;
    setTimeout(() => waitForApi((attempt || 0) + 1), 100);
  }

  function boot() {
    document.querySelectorAll("[data-library-hub]").forEach((btn) => {
      btn.addEventListener("click", () => setHub(btn.getAttribute("data-library-hub")));
    });

    $("models-create-toggle")?.addEventListener("click", () => {
      const panel = $("models-create-panel");
      const open = Boolean(panel?.hidden);
      if (open) {
        editingId = null;
        setCreateOpen(true, "create");
      } else {
        setCreateOpen(false);
      }
    });
    $("models-create-close")?.addEventListener("click", () => setCreateOpen(false));
    $("models-cancel-btn")?.addEventListener("click", () => {
      resetForm();
      setCreateOpen(false);
    });
    $("models-form")?.addEventListener("submit", (e) => void onSubmit(e));
    $("models-search")?.addEventListener("input", (e) => {
      modelsSearch = e.target.value || "";
      renderModels();
    });
    $("refresh-models-btn")?.addEventListener("click", () => {
      void refreshDriveStatus();
      void loadModels();
    });

    document.querySelectorAll("[data-models-filter]").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("[data-models-filter]").forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        modelsFilter = tab.getAttribute("data-models-filter") || "all";
        renderModels();
      });
    });

    bindDropzone("models-preview-dropzone", "models-preview-image-input", (files) => {
      const file = Array.from(files || []).find((f) => f.type.startsWith("image/"));
      if (file) setPreviewImage(file);
    });
    bindDropzone("models-glb-dropzone", "models-preview-glb-input", (files) => {
      const file = Array.from(files || []).find((f) => /\.glb$/i.test(f.name));
      if (file) setPreviewGlb(file);
    });
    bindDropzone("models-pack-dropzone", "models-pack-input", (files) => addPackFiles(files));

    $("models-clear-preview")?.addEventListener("click", () => {
      setPreviewImage(null);
      setPreviewGlb(null);
    });

    document.querySelectorAll("[data-models-delete-cancel]").forEach((el) => {
      el.addEventListener("click", closeDelete);
    });
    $("models-delete-name-input")?.addEventListener("input", (e) => {
      const ok = pendingDelete && e.target.value.trim() === pendingDelete.name;
      $("models-delete-confirm-btn").disabled = !ok;
      $("models-delete-error").hidden = true;
    });
    $("models-delete-confirm-btn")?.addEventListener("click", async () => {
      if (!pendingDelete || !api()?.adminRequest) return;
      const typed = $("models-delete-name-input").value.trim();
      if (typed !== pendingDelete.name) {
        $("models-delete-error").hidden = false;
        return;
      }
      try {
        const data = await api().adminRequest("library-models-delete", { id: pendingDelete.id });
        if (!data.ok) throw new Error(data.error);
        closeDelete();
        await loadModels();
      } catch (err) {
        $("models-delete-error").hidden = false;
        $("models-delete-error").textContent = err.message || String(err);
      }
    });

    // If library panel already visible with models hub hash
    if (location.hash === "#models") setHub("models");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => waitForApi(0));
  } else {
    waitForApi(0);
  }
})();
