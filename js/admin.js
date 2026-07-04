(function initAdminDashboard() {
  const config = window.SR_CONFIG || {};
  let supabase = null;

  if (window.supabase && config.supabaseUrl && config.supabaseAnonKey) {
    supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const logoutBtn = document.getElementById("logout-btn");
  const userLabel = document.getElementById("admin-user-email");
  const panels = document.querySelectorAll(".admin-panel");
  const navLinks = document.querySelectorAll(".sidebar-link[data-panel]");
  const pageTitle = document.getElementById("page-title");

  const panelTitles = {
    overview: "Vue d'ensemble",
    users: "Utilisateurs",
    releases: "Releases",
    logs: "Journaux"
  };

  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
  }

  function showDashboard(email) {
    loginView.hidden = true;
    dashboardView.hidden = false;
    if (userLabel) userLabel.textContent = email;
    refreshAll();
  }

  async function checkSession() {
    if (!supabase) {
      showLogin();
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.email) {
      showDashboard(data.session.user.email);
    } else {
      showLogin();
    }
  }

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.hidden = true;
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!supabase) {
      loginError.textContent = "Supabase non configuré — édite js/config.js";
      loginError.hidden = false;
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      loginError.textContent = error?.message || "Connexion refusée.";
      loginError.hidden = false;
      return;
    }
    showDashboard(data.session.user.email);
    addLog("s", `Connexion admin : ${email}`);
  });

  logoutBtn?.addEventListener("click", async () => {
    if (supabase) await supabase.auth.signOut();
    showLogin();
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const panelId = link.getAttribute("data-panel");
      navLinks.forEach((l) => l.classList.toggle("is-active", l === link));
      panels.forEach((p) => p.classList.toggle("is-active", p.id === `panel-${panelId}`));
      if (pageTitle && panelTitles[panelId]) pageTitle.textContent = panelTitles[panelId];
    });
  });

  async function refreshUsers() {
    const tbody = document.getElementById("users-tbody");
    const countEl = document.getElementById("kpi-users");
    if (!tbody) return;

    tbody.innerHTML = "";
    let users = [];

    if (supabase) {
      const res = await supabase.from("profiles").select("email, created_at, role, write_mode").limit(50);
      if (!res.error && res.data?.length) {
        users = res.data;
      }
    }

    if (users.length === 0) {
      const mockStorage = sessionStorage.getItem("sr_mock_profiles");
      if (mockStorage) {
        users = JSON.parse(mockStorage);
      } else {
        users = [
          { email: "d.robert.2400@gmail.com", created_at: new Date().toISOString(), role: "admin", write_mode: "direct" },
          { email: "moderateur@sr-editer.fr", created_at: new Date().toISOString(), role: "moderateur", write_mode: "draft" },
          { email: "testeur@sr-editer.fr", created_at: new Date().toISOString(), role: "membre", write_mode: "direct" }
        ];
        sessionStorage.setItem("sr_mock_profiles", JSON.stringify(users));
      }
    }

    // Filter by search query
    const searchInput = document.getElementById("users-search");
    const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : "";
    if (searchVal) {
      users = users.filter(u => 
        (u.email && u.email.toLowerCase().includes(searchVal)) || 
        (u.role && u.role.toLowerCase().includes(searchVal)) ||
        (u.write_mode && u.write_mode.toLowerCase().includes(searchVal))
      );
    }

    if (users.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="empty-state">Aucun profil ne correspond.</td></tr>';
      if (countEl) countEl.textContent = "0";
      return;
    }

    users.forEach((user) => {
      const tr = document.createElement("tr");
      const date = user.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—";
      tr.innerHTML = `
        <td><strong>${escapeHtml(user.email || "—")}</strong></td>
        <td>${date}</td>
        <td>${escapeHtml(user.write_mode || "direct")}</td>
        <td><span class="role-pill">${escapeHtml(user.role || "membre")}</span></td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-ghost btn-sm" style="padding: 4px 8px; margin-right: 4px; border: 1px solid rgba(255,255,255,0.05);" onclick="editUser('${escapeHtml(user.email)}', '${escapeHtml(user.role)}', '${escapeHtml(user.write_mode)}')">Modifier</button>
          <button type="button" class="btn btn-ghost btn-sm" style="padding: 4px 8px; color: #ff4a5a; border: 1px solid rgba(255,74,90,0.15);" onclick="deleteUser('${escapeHtml(user.email)}')">Supprimer</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (countEl) countEl.textContent = String(users.length);
  }

  // Edit user action
  window.editUser = (email, role, write_mode) => {
    const emailEl = document.getElementById("manage-email");
    const roleEl = document.getElementById("manage-role");
    const modeEl = document.getElementById("manage-mode");
    if (emailEl) emailEl.value = email;
    if (roleEl) roleEl.value = role;
    if (modeEl) modeEl.value = write_mode;
    if (emailEl) emailEl.focus();
    addLog("i", `Modification en cours pour : ${email}`);
  };

  // Delete user action
  window.deleteUser = async (email) => {
    if (!confirm(`Supprimer le membre ${email} ?`)) return;
    addLog("i", `Suppression du membre : ${email}...`);

    let success = false;
    if (supabase) {
      const { error } = await supabase.from("profiles").delete().eq("email", email);
      if (!error) {
        success = true;
      } else {
        addLog("e", `Erreur DB : ${error.message}`);
      }
    }

    const mockStorage = sessionStorage.getItem("sr_mock_profiles");
    if (mockStorage) {
      let mockUsers = JSON.parse(mockStorage);
      mockUsers = mockUsers.filter(u => u.email.toLowerCase() !== email.toLowerCase());
      sessionStorage.setItem("sr_mock_profiles", JSON.stringify(mockUsers));
    }

    if (!supabase) success = true;

    if (success) {
      addLog("s", `Membre supprimé : ${email}`);
      refreshUsers();
    }
  };

  // Create or Update user form handler
  document.getElementById("user-manage-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("manage-email").value.trim();
    const role = document.getElementById("manage-role").value;
    const write_mode = document.getElementById("manage-mode").value;

    addLog("i", `Enregistrement du membre : ${email}...`);

    let success = false;
    if (supabase) {
      const { error } = await supabase.from("profiles").upsert({
        email,
        role,
        write_mode,
        created_at: new Date().toISOString()
      }, { onConflict: "email" });

      if (!error) {
        success = true;
      } else {
        addLog("e", `Erreur d'enregistrement DB : ${error.message}`);
      }
    }

    const mockStorage = sessionStorage.getItem("sr_mock_profiles");
    let mockUsers = mockStorage ? JSON.parse(mockStorage) : [
      { email: "d.robert.2400@gmail.com", created_at: new Date().toISOString(), role: "admin", write_mode: "direct" },
      { email: "moderateur@sr-editer.fr", created_at: new Date().toISOString(), role: "moderateur", write_mode: "draft" },
      { email: "testeur@sr-editer.fr", created_at: new Date().toISOString(), role: "membre", write_mode: "direct" }
    ];

    const existingIdx = mockUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingIdx >= 0) {
      mockUsers[existingIdx].role = role;
      mockUsers[existingIdx].write_mode = write_mode;
    } else {
      mockUsers.push({
        email,
        created_at: new Date().toISOString(),
        role,
        write_mode
      });
    }
    sessionStorage.setItem("sr_mock_profiles", JSON.stringify(mockUsers));

    if (!supabase) success = true;

    if (success) {
      addLog("s", `Membre enregistré : ${email} (${role}, ${write_mode})`);
      document.getElementById("manage-email").value = "";
      refreshUsers();
    }
  });

  // Search input handler
  document.getElementById("users-search")?.addEventListener("input", refreshUsers);


  function refreshKpis() {
    const versionEl = document.getElementById("kpi-version");
    const pingEl = document.getElementById("kpi-ping");
    if (versionEl) versionEl.textContent = `v${config.appVersion || "0.3.0"}`;
    if (pingEl) {
      const ping = Math.floor(Math.random() * 18) + 14;
      pingEl.textContent = `${ping} ms`;
    }

    const bars = document.querySelectorAll(".chart-bar");
    bars.forEach((bar) => {
      bar.style.height = `${20 + Math.random() * 80}%`;
    });
  }

  function addLog(type, message) {
    const terminal = document.getElementById("log-terminal");
    if (!terminal) return;
    const line = document.createElement("div");
    line.className = "log-line";
    const time = new Date().toLocaleTimeString("fr-FR", { hour12: false });
    line.innerHTML = `<span class="t">[${time}]</span> <span class="${type}">[${type.toUpperCase()}]</span> ${escapeHtml(message)}`;
    terminal.prepend(line);
  }

  function seedLogs() {
    addLog("i", "Dashboard SR Editer initialisé.");
    addLog("s", "Connexion Supabase prête.");
    addLog("i", "Endpoint update.json surveillé.");
  }

  function refreshAll() {
    refreshKpis();
    refreshUsers();
    seedLogs();
    loadUpdateManifest();
  }

  async function loadUpdateManifest() {
    try {
      const res = await fetch("update.json?" + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      const verInput = document.getElementById("release-version");
      const dateInput = document.getElementById("release-date");
      const urlInput = document.getElementById("release-url");
      const sigInput = document.getElementById("release-signature");
      if (verInput && data.version) verInput.value = data.version;
      if (dateInput && data.pub_date) dateInput.value = data.pub_date;
      const platform = data.platforms?.["windows-x86_64"];
      if (urlInput && platform?.url) urlInput.value = platform.url;
      if (sigInput && platform?.signature) sigInput.value = platform.signature;
    } catch {
      /* ignore */
    }
  }

  document.getElementById("refresh-users-btn")?.addEventListener("click", refreshUsers);

  document.getElementById("generate-release-btn")?.addEventListener("click", () => {
    const version = document.getElementById("release-version").value.trim();
    const pubDate = document.getElementById("release-date").value.trim();
    const zipUrl = document.getElementById("release-url").value.trim();
    const signature = document.getElementById("release-signature").value.trim();
    const notes = document.getElementById("release-notes").value.trim() || `Release v${version}`;

    const manifest = {
      version,
      notes,
      pub_date: pubDate,
      platforms: {
        "windows-x86_64": {
          signature: signature || "SIGNATURE_TAURI",
          url: zipUrl
        }
      }
    };

    const output = document.getElementById("release-output");
    const textarea = document.getElementById("release-json");
    if (textarea) textarea.value = JSON.stringify(manifest, null, 2);
    if (output) output.hidden = false;
    addLog("s", `Manifeste v${version} généré.`);
  });

  document.getElementById("copy-json-btn")?.addEventListener("click", async () => {
    const textarea = document.getElementById("release-json");
    if (!textarea) return;
    await navigator.clipboard.writeText(textarea.value);
    addLog("i", "update.json copié dans le presse-papiers.");
  });

  document.getElementById("refresh-logs-btn")?.addEventListener("click", () => {
    document.getElementById("log-terminal").innerHTML = "";
    seedLogs();
  });

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const bg = document.getElementById("ambient-layer");
  if (bg && window.wallpaperUrl && window.SR_WALLPAPERS?.[12]) {
    bg.style.backgroundImage = `url("${window.wallpaperUrl(window.SR_WALLPAPERS[12])}")`;
  }

  checkSession();
  setInterval(refreshKpis, 8000);
})();
