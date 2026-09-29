/* ==========================================================================
   SR Editer — Blog & releases
   Liste les versions publiées (Supabase release_records). Repli sur la
   version courante si la requête échoue ou ne renvoie rien.
   ========================================================================== */
(function () {
  const DOWNLOAD_URL = "https://github.com/NALYD2400/SR-editer/releases/download/0.7.1/SR.Editer_0.7.1_x64-setup.exe";
  const DISCORD_URL = "https://discord.gg/gNQwHGMRdT";
  const FALLBACK_RELEASE = {
    version: "0.7.1",
    notes: "SR Editer 0.7.1 — Version stable officielle avec moteur WebGL 3D et Texture Studio 2D.",
    artifact_url: DOWNLOAD_URL
  };

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatNotes(notes) {
    if (!notes) return "Mise à jour d'amélioration générale.";
    return escapeHtml(notes).replace(/\n/g, "<br>");
  }

  function renderRelease(rel, { isLatest, dateLabel, notesHtml }) {
    const version = escapeHtml(rel.version);
    const badge = isLatest
      ? '<span class="ticket-count-badge is-latest">Dernière Version Stable</span>'
      : '<span class="ticket-count-badge">Archive</span>';
    const downloadBtn = rel.artifact_url
      ? `<a href="${escapeHtml(rel.artifact_url)}" class="aww-btn aww-btn-outline aww-btn-sm" data-magnetic>
           <span class="aww-btn-text">Télécharger v${version}</span>
         </a>`
      : "";
    const discordBtn = isLatest
      ? `<a href="${DISCORD_URL}" target="_blank" rel="noopener" class="aww-btn aww-btn-outline aww-btn-sm" data-magnetic>
           <span class="aww-btn-text">Rejoindre le Discord</span>
         </a>`
      : "";

    return `
      <article class="aww-blog-post">
        <div class="blog-post-head">
          <div class="blog-post-tags">
            <span class="aww-release-tag">v${version}</span>
            ${badge}
          </div>
          <span class="blog-post-date">${dateLabel}</span>
        </div>
        <h3 class="blog-post-title">Mise à jour v${version}</h3>
        <div class="aww-release-notes">${notesHtml}</div>
        <div class="blog-post-actions">${downloadBtn}${discordBtn}</div>
      </article>`;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const loadingEl = document.getElementById("changelog-loading");
    const pastHeader = document.getElementById("past-releases-header");
    const countBadge = document.getElementById("releases-count-badge");
    const listEl = document.getElementById("changelog-container");

    function show(releases, render) {
      if (loadingEl) loadingEl.style.display = "none";
      if (countBadge) countBadge.textContent = releases.length + " version" + (releases.length > 1 ? "s" : "");
      if (pastHeader && releases.length) pastHeader.style.display = "flex";
      if (listEl && releases.length) listEl.innerHTML = releases.map(render).join("");
    }

    try {
      const client = typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null;
      if (!client) throw new Error("Client Supabase non initialisé");

      const { data, error } = await client
        .from("release_records")
        .select("version, notes, artifact_url, updated_at")
        .eq("published", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      const releases = data && data.length ? data : [{ ...FALLBACK_RELEASE, updated_at: new Date().toISOString() }];
      show(releases, (rel, index) => renderRelease(rel, {
        isLatest: index === 0,
        dateLabel: new Date(rel.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
        notesHtml: formatNotes(rel.notes)
      }));
    } catch (err) {
      console.error("Erreur chargement changelog:", err);
      show([FALLBACK_RELEASE], (rel) => renderRelease(rel, {
        isLatest: true,
        dateLabel: "Officiel",
        notesHtml: "Version stable officielle avec prévisualisation WebGL et Texture Studio 2D."
      }));
    }
  });
})();
