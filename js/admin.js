(function initAdminDashboard() {
  const config = window.SR_CONFIG || {};
  let supabase = null;
  let usersCache = [];
  const demoMode = config.demoMode === true;

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

  function showLoginError(message) {
    if (!loginError) return;
    loginError.textContent = message;
    loginError.hidden = false;
  }

  async function adminRequest(action, payload = {}) {
    if (!supabase) throw new Error("Supabase n'est pas configuré.");
    const functionName = config.adminFunctionName || "admin-users";
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { action, ...payload }
    });
    if (error) throw new Error(error.message || "Service administrateur indisponible.");
    if (!data?.ok) throw new Error(data?.error || "Action administrateur refusée.");
    return data;
  }

  async function requireAdminAccess(email) {
    try {
      const result = await adminRequest("me");
      if (result.profile?.role !== "admin") throw new Error("Ce compte n'a pas le rôle administrateur.");
      showDashboard(email);
      return true;
    } catch (reason) {
      await supabase?.auth.signOut();
      showLogin();
      showLoginError(String(reason).replace(/^Error:\s*/i, ""));
      return false;
    }
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
      await requireAdminAccess(data.session.user.email);
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
      showLoginError("Supabase non configuré — édite js/config.js");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      showLoginError(error?.message || "Connexion refusée.");
      return;
    }
    if (await requireAdminAccess(data.session.user.email)) addLog("s", `Connexion admin : ${email}`);
  });

  logoutBtn?.addEventListener("click", async () => {
    if (supabase) await supabase.auth.signOut();
    showLogin();
  });

  function showPanel(panelId) {
    panels.forEach((p) => p.classList.toggle("is-active", p.id === `panel-${panelId}`));
    navLinks.forEach((l) => l.classList.toggle("is-active", l.getAttribute("data-panel") === panelId));
    if (pageTitle) {
      if (panelTitles[panelId]) {
        pageTitle.textContent = panelTitles[panelId];
      } else if (panelId === "user-detail") {
        pageTitle.textContent = "Fiche Profil Membre";
      }
    }
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const panelId = link.getAttribute("data-panel");
      showPanel(panelId);
    });
  });

  document.getElementById("back-to-users-btn")?.addEventListener("click", () => {
    showPanel("users");
  });

  async function refreshUsers() {
    const tbody = document.getElementById("users-tbody");
    const countEl = document.getElementById("kpi-users");
    if (!tbody) return;

    tbody.innerHTML = "";
    let users = [];

    if (supabase) {
      try {
        const result = await adminRequest("list");
        users = result.users || [];
      } catch (reason) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHtml(String(reason).replace(/^Error:\s*/i, ""))}</td></tr>`;
        if (countEl) countEl.textContent = "—";
        return;
      }
    }

    if (!supabase && demoMode && users.length === 0) {
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

    usersCache = users;

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
        <td><span class="role-pill ${user.role || "membre"}">${escapeHtml(user.role || "membre")}</span></td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-ghost btn-sm view-user-btn" style="padding: 4px 10px; margin-right: 6px; border: 1px solid rgba(255,255,255,0.06); font-weight:600;">Consulter</button>
          <button type="button" class="btn btn-ghost btn-sm delete-user-btn" style="padding: 4px 10px; color: #ff4a5a; border: 1px solid rgba(255,74,90,0.15);">Supprimer</button>
        </td>
      `;
      tr.querySelector(".view-user-btn")?.addEventListener("click", () => window.viewUserDetail(user.email));
      tr.querySelector(".delete-user-btn")?.addEventListener("click", () => window.deleteUser(user.email));
      tbody.appendChild(tr);
    });

    if (countEl) countEl.textContent = String(users.length);
  }

  // Detailed profile page view
  window.viewUserDetail = (email) => {
    let user = usersCache.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      user = { email, role: "membre", write_mode: "direct", created_at: new Date().toISOString() };
    }

    showPanel("user-detail");

    // Fill elements
    const avatar = document.getElementById("detail-avatar");
    const emailLabel = document.getElementById("detail-email");
    const rolePill = document.getElementById("detail-role-pill");
    const roleSelect = document.getElementById("detail-role");
    const modeSelect = document.getElementById("detail-mode");

    if (avatar) avatar.textContent = email.charAt(0).toUpperCase();
    if (emailLabel) emailLabel.textContent = email;
    if (rolePill) {
      rolePill.textContent = user.role.toUpperCase();
      rolePill.className = `role-pill ${user.role}`;
    }
    if (roleSelect) roleSelect.value = user.role;
    if (modeSelect) modeSelect.value = user.write_mode;

    // Checkboxes permissions matrix
    const permWrite = document.getElementById("perm-write");
    const permAi = document.getElementById("perm-ai");
    const permAdmin = document.getElementById("perm-admin");

    const updateCheckboxes = (role) => {
      if (permWrite) permWrite.checked = role !== "suspendu";
      if (permAi) permAi.checked = role === "admin" || role === "moderateur";
      if (permAdmin) permAdmin.checked = role === "admin";
    };

    updateCheckboxes(user.role);

    if (roleSelect) {
      roleSelect.onchange = (e) => {
        updateCheckboxes(e.target.value);
      };
    }

    // Profile facts only: never fabricate user activity in a production console.
    const detailLogs = document.getElementById("detail-logs");
    if (detailLogs) {
      const createdAt = user.created_at ? new Date(user.created_at).toLocaleString("fr-FR") : "Date inconnue";
      const activities = [
        { time: "Profil", description: `Créé le ${createdAt}` },
        { time: "Rôle", description: user.role || "membre" },
        { time: "Mode", description: user.write_mode === "direct" ? "Production" : "Brouillon" }
      ];
      if (user.role === "suspendu") {
        activities.push({ time: "Accès", description: "Compte suspendu" });
      }
      detailLogs.innerHTML = activities.map((activity) => {
        return `<div class="log-line"><span class="t">${escapeHtml(activity.time)}</span> ${escapeHtml(activity.description)}</div>`;
      }).join("");
    }

    // Buttons actions
    const saveBtn = document.getElementById("save-detail-btn");
    const suspendBtn = document.getElementById("suspend-detail-btn");

    if (saveBtn) {
      saveBtn.onclick = async () => {
        const rVal = roleSelect.value;
        const mVal = modeSelect.value;
        addLog("i", `Enregistrement des modifications pour ${email}...`);

        try {
          if (supabase) {
            await adminRequest("update", { email, role: rVal, writeMode: mVal });
          } else if (demoMode) {
            const mockStorage = sessionStorage.getItem("sr_mock_profiles");
            const mockUsers = mockStorage ? JSON.parse(mockStorage) : [];
            const idx = mockUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
            if (idx >= 0) Object.assign(mockUsers[idx], { role: rVal, write_mode: mVal });
            else mockUsers.push({ email, role: rVal, write_mode: mVal, created_at: new Date().toISOString() });
            sessionStorage.setItem("sr_mock_profiles", JSON.stringify(mockUsers));
          } else {
            throw new Error("Service administrateur non configuré.");
          }
          addLog("s", `Compte mis à jour avec succès : ${email}`);
          await refreshUsers();
          showPanel("users");
        } catch (reason) {
          addLog("e", String(reason).replace(/^Error:\s*/i, ""));
        }
      };
    }

    if (suspendBtn) {
      suspendBtn.onclick = () => {
        if (roleSelect) {
          roleSelect.value = "suspendu";
          updateCheckboxes("suspendu");
          saveBtn?.click();
        }
      };
    }
  };

  // Delete user action
  window.deleteUser = async (email) => {
    if (!confirm(`Supprimer le membre ${email} ?`)) return;
    addLog("i", `Suppression du membre : ${email}...`);

    try {
      if (supabase) {
        await adminRequest("delete", { email });
      } else if (demoMode) {
        const mockStorage = sessionStorage.getItem("sr_mock_profiles");
        const mockUsers = mockStorage ? JSON.parse(mockStorage) : [];
        sessionStorage.setItem("sr_mock_profiles", JSON.stringify(
          mockUsers.filter(u => u.email.toLowerCase() !== email.toLowerCase())
        ));
      } else {
        throw new Error("Service administrateur non configuré.");
      }
      addLog("s", `Membre supprimé : ${email}`);
      await refreshUsers();
    } catch (reason) {
      addLog("e", String(reason).replace(/^Error:\s*/i, ""));
    }
  };

  // Account creation is delegated to the protected server-side Edge Function.
  document.getElementById("user-manage-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("manage-email").value.trim();
    const password = document.getElementById("manage-password").value;
    const role = document.getElementById("manage-role").value;
    const write_mode = document.getElementById("manage-mode").value;

    addLog("i", `Création du compte d'accès pour ${email}...`);

    try {
      if (supabase) {
        await adminRequest("create", { email, password, role, writeMode: write_mode });
      } else if (demoMode) {
        const mockStorage = sessionStorage.getItem("sr_mock_profiles");
        const mockUsers = mockStorage ? JSON.parse(mockStorage) : [];
        mockUsers.push({ email, created_at: new Date().toISOString(), role, write_mode });
        sessionStorage.setItem("sr_mock_profiles", JSON.stringify(mockUsers));
      } else {
        throw new Error("Service administrateur non configuré.");
      }
      addLog("s", `Membre entièrement configuré : ${email} (${role}, ${write_mode})`);
      document.getElementById("manage-email").value = "";
      document.getElementById("manage-password").value = "";
      await refreshUsers();
    } catch (reason) {
      addLog("e", String(reason).replace(/^Error:\s*/i, ""));
    }
  });

  // Search input handler
  document.getElementById("users-search")?.addEventListener("input", refreshUsers);



  function refreshKpis() {
    const versionEl = document.getElementById("kpi-version");
    const pingEl = document.getElementById("kpi-ping");
    if (versionEl) versionEl.textContent = `v${config.appVersion || "0.3.0"}`;
    if (pingEl) pingEl.textContent = supabase ? "API active" : demoMode ? "Mode démo" : "Non configuré";
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
