(function initStatsPulse() {
  const config = window.SR_CONFIG || {};
  const gate = document.getElementById("stats-gate");
  const shell = document.getElementById("stats-shell");
  const gateHint = document.getElementById("stats-gate-hint");
  const refreshBtn = document.getElementById("stats-refresh");

  const els = {
    downloads: document.getElementById("stats-downloads"),
    downloadsNote: document.getElementById("stats-downloads-note"),
    heroVersion: document.getElementById("stats-hero-version"),
    users: document.getElementById("stats-users"),
    licenses: document.getElementById("stats-licenses"),
    tickets: document.getElementById("stats-tickets"),
    ticketsHint: document.getElementById("stats-tickets-hint"),
    contacts: document.getElementById("stats-contacts"),
    version: document.getElementById("stats-version"),
    repo: document.getElementById("stats-repo"),
    email: document.getElementById("stats-email"),
    updated: document.getElementById("stats-updated"),
    releasesBody: document.getElementById("stats-releases-body"),
    bars: document.getElementById("stats-hero-bars")
  };

  let supabase = null;
  if (window.supabase && config.supabaseUrl && config.supabaseAnonKey) {
    supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  } else if (typeof window.getSRSupabase === "function") {
    supabase = window.getSRSupabase();
  }

  function formatNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("fr-FR").format(n);
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function repoFromConfig() {
    const url = String(config.downloadUrl || "");
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/releases/i);
    if (match) return `${match[1]}/${match[2]}`;
    return "NALYD2400/SR-editer";
  }

  function redirectLogin(message) {
    const params = new URLSearchParams();
    params.set("next", "stats.html");
    if (message) params.set("notice", message);
    window.location.href = "login.html?" + params.toString();
  }

  async function adminRequest(action, payload) {
    if (!supabase) throw new Error("Supabase indisponible.");
    const functionName = config.adminFunctionName || "admin-users";
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { action: action, ...(payload || {}) }
    });
    if (error) throw error;
    if (!data || !data.ok) throw new Error((data && data.error) || "Action admin refusée.");
    return data;
  }

  async function requireAdmin(session) {
    const email = session && session.user && session.user.email;
    if (!email) {
      redirectLogin();
      return null;
    }
    try {
      const me = await adminRequest("me");
      const isAdmin =
        (me.profile && me.profile.role === "admin") || Boolean(me.level);
      if (!isAdmin) {
        window.location.href =
          "dashboard.html?notice=" +
          encodeURIComponent("Accès Pulse réservé aux admins.");
        return null;
      }
      return { email: email, me: me };
    } catch (_err) {
      window.location.href =
        "dashboard.html?notice=" +
        encodeURIComponent("Accès Pulse refusé.");
      return null;
    }
  }

  async function fetchGithubReleases(repo) {
    const response = await fetch(
      "https://api.github.com/repos/" + repo + "/releases?per_page=20",
      {
        headers: {
          Accept: "application/vnd.github+json"
        }
      }
    );
    if (!response.ok) {
      throw new Error("GitHub API " + response.status);
    }
    const releases = await response.json();
    if (!Array.isArray(releases)) return [];

    return releases
      .filter(function (rel) {
        return rel && !rel.draft;
      })
      .map(function (rel) {
        const assets = Array.isArray(rel.assets) ? rel.assets : [];
        const downloads = assets.reduce(function (sum, asset) {
          return sum + (Number(asset.download_count) || 0);
        }, 0);
        return {
          tag: String(rel.tag_name || rel.name || "").replace(/^v/i, ""),
          publishedAt: rel.published_at || rel.created_at,
          downloads: downloads,
          prerelease: Boolean(rel.prerelease)
        };
      })
      .filter(function (row) {
        return row.tag;
      });
  }

  function renderBars(rows) {
    if (!els.bars) return;
    els.bars.replaceChildren();
    const sample = rows.slice(0, 12);
    const max = Math.max.apply(
      null,
      sample.map(function (row) {
        return row.downloads;
      }).concat([1])
    );
    sample
      .slice()
      .reverse()
      .forEach(function (row, index) {
        const bar = document.createElement("span");
        const ratio = Math.max(0.12, row.downloads / max);
        bar.style.height = Math.round(ratio * 100) + "%";
        bar.style.animationDelay = index * 40 + "ms";
        els.bars.appendChild(bar);
      });
  }

  function renderReleases(rows) {
    if (!els.releasesBody) return;
    if (!rows.length) {
      els.releasesBody.innerHTML =
        '<tr><td colspan="4" class="stats-empty">Aucune release GitHub trouvée.</td></tr>';
      return;
    }

    const total = rows.reduce(function (sum, row) {
      return sum + row.downloads;
    }, 0);

    els.releasesBody.innerHTML = rows
      .map(function (row) {
        const share = total > 0 ? Math.round((row.downloads / total) * 100) : 0;
        const label = "v" + escapeHtml(row.tag) + (row.prerelease ? " · pre" : "");
        return (
          "<tr>" +
          "<td><strong>" +
          label +
          "</strong></td>" +
          "<td>" +
          escapeHtml(formatDate(row.publishedAt)) +
          "</td>" +
          "<td>" +
          formatNumber(row.downloads) +
          "</td>" +
          '<td><span class="stats-share"><span class="stats-share-track"><span class="stats-share-fill" style="width:' +
          share +
          '%"></span></span><span>' +
          share +
          "%</span></span></td>" +
          "</tr>"
        );
      })
      .join("");
  }

  async function loadBusinessMetrics() {
    try {
      const data = await adminRequest("dashboard");
      const metrics = data.metrics || {};
      if (els.users) els.users.textContent = formatNumber(metrics.users);
      if (els.licenses) els.licenses.textContent = formatNumber(metrics.activeLicenses);
      if (els.tickets) els.tickets.textContent = formatNumber(metrics.openTickets);
      if (els.contacts) els.contacts.textContent = formatNumber(metrics.newContacts);
      if (els.ticketsHint) {
        els.ticketsHint.textContent =
          formatNumber(metrics.urgentTickets || 0) + " urgent(s)";
      }
    } catch (_err) {
      if (els.users) els.users.textContent = "—";
      if (els.licenses) els.licenses.textContent = "—";
      if (els.tickets) els.tickets.textContent = "—";
      if (els.contacts) els.contacts.textContent = "—";
    }
  }

  async function loadPulse() {
    const version = String(config.appVersion || "—").replace(/^v/i, "");
    const repo = repoFromConfig();
    if (els.version) els.version.textContent = "v" + version;
    if (els.heroVersion) els.heroVersion.textContent = "v" + version;
    if (els.repo) els.repo.textContent = repo;

    await loadBusinessMetrics();

    try {
      const rows = await fetchGithubReleases(repo);
      const total = rows.reduce(function (sum, row) {
        return sum + row.downloads;
      }, 0);
      if (els.downloads) els.downloads.textContent = formatNumber(total);
      if (els.downloadsNote) {
        els.downloadsNote.textContent =
          rows.length +
          " release(s) · dernière v" +
          (rows[0] ? rows[0].tag : version);
      }
      renderReleases(rows);
      renderBars(rows);
    } catch (err) {
      if (els.downloads) els.downloads.textContent = "—";
      if (els.downloadsNote) {
        els.downloadsNote.textContent =
          "GitHub indisponible : " + String(err).replace(/^Error:\s*/i, "");
      }
      if (els.releasesBody) {
        els.releasesBody.innerHTML =
          '<tr><td colspan="4" class="stats-empty">Impossible de lire les téléchargements GitHub pour le moment.</td></tr>';
      }
    }

    if (els.updated) {
      els.updated.textContent =
        "Maj " +
        new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit"
        });
    }
  }

  async function boot() {
    if (!supabase) {
      if (gateHint) gateHint.textContent = "Configure js/config.js (Supabase).";
      redirectLogin("Supabase non configuré");
      return;
    }

    const { data } = await supabase.auth.getSession();
    const access = await requireAdmin(data.session);
    if (!access) return;

    if (els.email) els.email.textContent = access.email;
    if (gate) gate.hidden = true;
    if (shell) shell.hidden = false;

    await loadPulse();
  }

  refreshBtn?.addEventListener("click", function () {
    void loadPulse();
  });

  void boot();
})();
