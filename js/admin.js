(function initAdminDashboard() {
  const config = window.SR_CONFIG || {};
  let supabase = null;
  let usersCache = [];
  let lastRefreshId = 0;
  let activeTicketId = null;
  let activeTicketSubscription = null;
  const demoMode = config.demoMode === true;
  let localPreview = false;
  let currentTickets = [];
  let ticketFilter = "all";
  let ticketSearch = "";
  let consoleAccess = null;

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
  const sidebar = document.querySelector(".admin-sidebar");
  const menuButton = document.getElementById("admin-menu-btn");

  const panelTitles = {
    overview: "Vue d'ensemble",
    users: "Utilisateurs",
    licenses: "Licences & appareils",
    support: "Support",
    contacts: "Contacts",
    releases: "Releases",
    audit: "Audit global",
    system: "Santé système",
    team: "Équipe superadmin",
    library: "Bibliothèque de Textures"
  };

  const panelDescriptions = {
    overview: "Surveillez l’activité, l’infrastructure et les accès depuis un seul endroit.",
    users: "Créez les comptes et contrôlez précisément leurs droits dans l’application.",
    "user-detail": "Gérez le rôle, l’accès et les appareils associés à ce membre.",
    licenses: "Pilotez les offres, les statuts et les quotas d’appareils.",
    support: "Traitez les demandes et échangez directement avec vos utilisateurs.",
    contacts: "Centralisez et qualifiez les messages reçus depuis le site public.",
    releases: "Préparez, signez et publiez les nouvelles versions de SR Editer.",
    audit: "Consultez la trace immuable des actions sensibles de la console.",
    system: "Contrôlez en temps réel la disponibilité des services critiques.",
    team: "Déléguez la console avec des permissions adaptées à chaque administrateur.",
    library: "Gérez la bibliothèque de textures de base (ajouter, supprimer, modifier)."
  };

  panels.forEach((panel) => {
    const panelId = panel.id.replace(/^panel-/, "");
    const title = panelTitles[panelId] || (panelId === "user-detail" ? "Fiche membre" : "Console");
    const intro = document.createElement("header");
    intro.className = "page-intro";
    intro.innerHTML = `<div><span class="page-eyebrow">SR Editer / Console</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(panelDescriptions[panelId] || "Administration SR Editer.")}</p></div><span class="page-status"><i></i> Production</span>`;
    panel.prepend(intro);
  });

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
    if (localPreview || demoMode || !supabase) {
      console.log(`[Preview Mock API] Action: ${action}`, payload);
      
      if (action === "me") {
        return {
          ok: true,
          profile: { role: "owner", write_mode: "direct", email: "preview-local@sr-editer" },
          level: "owner",
          permissions: { console: true, users: true, licenses: true, support: true, contacts: true, releases: true, audit: true, system: true, team: true }
        };
      }
      
      if (action === "health") {
        return { ok: true, database: "online", latencyMs: 14 };
      }
      
      if (action === "dashboard") {
        return {
          ok: true,
          metrics: {
            users: 142,
            activeLicenses: 88,
            openTickets: 3,
            urgentTickets: 1,
            newContacts: 2,
            banned: 4
          },
          recentAudit: [
            { actor_email: "d.robert.2400@gmail.com", action: "user.update", target_type: "user", created_at: new Date().toISOString() },
            { actor_email: "d.robert.2400@gmail.com", action: "team.upsert", target_type: "user", created_at: new Date(Date.now() - 3600000).toISOString() },
            { actor_email: "system", action: "app.boot", target_type: "system", created_at: new Date(Date.now() - 86400000).toISOString() }
          ]
        };
      }
      
      if (action === "list") {
        return {
          ok: true,
          users: [
            { user_id: "u1", email: "d.robert.2400@gmail.com", role: "owner", write_mode: "direct", confirmed: true, created_at: new Date(Date.now() - 86400000*10).toISOString(), plan: "lifetime", license_status: "active", device_limit: 5, expires_at: null },
            { user_id: "u2", email: "moderateur@sr-editer.fr", role: "moderateur", write_mode: "draft", confirmed: true, created_at: new Date(Date.now() - 86400000*5).toISOString(), plan: "pro", license_status: "active", device_limit: 2, expires_at: new Date(Date.now() + 86400000*30).toISOString() },
            { user_id: "u3", email: "testeur@sr-editer.fr", role: "membre", write_mode: "direct", confirmed: true, created_at: new Date(Date.now() - 86400000*2).toISOString(), plan: "free", license_status: "active", device_limit: 1, expires_at: null },
            { user_id: "u4", email: "banni@gta5-studio.com", role: "membre", write_mode: "direct", confirmed: false, created_at: new Date().toISOString(), banned_until: new Date(Date.now() + 86400000*365).toISOString(), plan: "free", license_status: "suspended", device_limit: 1 }
          ]
        };
      }
      
      if (action === "license-list") {
        return {
          ok: true,
          rows: [
            { email: "d.robert.2400@gmail.com", plan: "lifetime", status: "active", device_limit: 5, expires_at: null },
            { email: "moderateur@sr-editer.fr", plan: "pro", status: "active", device_limit: 2, expires_at: new Date(Date.now() + 86400000*30).toISOString() }
          ]
        };
      }
      
      if (action === "support-list") {
        return {
          ok: true,
          rows: [
            {
              id: "t1",
              subject: "Bug de texture sur YFT",
              status: "open",
              priority: "high",
              email: "testeur@sr-editer.fr",
              support_messages: [
                { id: "m1", author_kind: "user", content: "Bonjour, j'ai une texture qui s'affiche en noir sur mon modèle YFT.", created_at: new Date(Date.now() - 1800000).toISOString() }
              ]
            },
            {
              id: "t2",
              subject: "Besoin de réinitialiser mes PC",
              status: "pending",
              priority: "normal",
              email: "moderateur@sr-editer.fr",
              support_messages: [
                { id: "m2", author_kind: "user", content: "Bonjour, j'ai changé d'ordinateur. Pouvez-vous réinitialiser ma limite d'appareils ?", created_at: new Date(Date.now() - 7200000).toISOString() },
                { id: "m3", author_kind: "admin", content: "Bonjour, c'est fait. Vous pouvez vous reconnecter !", created_at: new Date(Date.now() - 3600000).toISOString() }
              ]
            }
          ]
        };
      }
      
      if (action === "contact-list") {
        return {
          ok: true,
          rows: [
            { id: "c1", subject: "Question pré-vente", name: "Marc", email: "marc@outlook.com", message: "Bonjour, la licence Studio permet-elle d'exporter en DDS ?", status: "new", created_at: new Date(Date.now() - 7200000).toISOString() }
          ]
        };
      }
      
      if (action === "release-list") {
        return {
          ok: true,
          rows: [
            { version: "0.3.2", published: true, notes: "Correctif sur les shaders de matériaux GTA V.", artifact_url: "https://github.com/NALYD2400/SR-editer/releases/download/0.3.2/SR.Editer_0.3.2_x64-setup.exe", updated_at: new Date(Date.now() - 86400000*3).toISOString() }
          ]
        };
      }
      
      if (action === "audit-list") {
        return {
          ok: true,
          rows: [
            { created_at: new Date().toISOString(), actor_email: "preview-local@sr-editer", action: "user.update", target_type: "user", target_id: "u2" },
            { created_at: new Date(Date.now() - 3600000).toISOString(), actor_email: "preview-local@sr-editer", action: "team.upsert", target_type: "user", target_id: "u1" },
            { created_at: new Date(Date.now() - 86400000).toISOString(), actor_email: "system", action: "app.boot", target_type: "system", target_id: null }
          ]
        };
      }
      
      if (action === "team-list") {
        return {
          ok: true,
          rows: [
            { email: "d.robert.2400@gmail.com", level: "owner", permissions: { console: true, users: true, licenses: true, support: true, contacts: true, releases: true, audit: true, system: true, team: true } }
          ]
        };
      }
      
      if (action === "devices-list") {
        return {
          ok: true,
          rows: [
            { id: "d1", device_name: "Desktop-DYLAN", app_version: "0.3.2", last_seen_at: new Date().toISOString(), revoked: false }
          ]
        };
      }
      
      return { ok: true };
    }

    if (!supabase) throw new Error("Supabase n'est pas configuré.");
    const functionName = config.adminFunctionName || "admin-users";
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { action, ...payload }
    });
    if (error) {
      let message = error.message || "Service administrateur indisponible.";
      let status = 0;
      try {
        const response = error.context;
        if (response) {
          status = response.status;
          if (typeof response.clone === "function") {
            const payloadData = await response.clone().json();
            if (payloadData?.error) message = payloadData.error;
          }
        }
      } catch {
        /* La réponse non JSON conserve le message Supabase. */
      }
      if (status === 401 || message.includes("Session requise") || message.includes("Session invalide")) {
        console.warn("Session expirée ou invalide. Déconnexion...");
        if (supabase) {
          void supabase.auth.signOut().then(() => {
            showLogin();
            showLoginError("Votre session a expiré. Veuillez vous reconnecter.");
          });
        }
      }
      throw new Error(message);
    }
    if (!data?.ok) throw new Error(data?.error || "Action administrateur refusée.");
    return data;
  }

  async function requireAdminAccess(email) {
    try {
      const result = await adminRequest("me");
      if (result.profile?.role !== "admin" && !result.level) throw new Error("Ce compte n'a pas accès à la superconsole.");
      applyAccess(result);
      showDashboard(email);
      return true;
    } catch (reason) {
      await supabase?.auth.signOut();
      showLogin();
      showLoginError(String(reason).replace(/^Error:\s*/i, ""));
      return false;
    }
  }

  function applyAccess(access) {
    const mapping = { overview: "console", users: "users", "user-detail": "users", licenses: "licenses", support: "support", contacts: "contacts", releases: "releases", audit: "audit", system: "system", team: "team", library: "library" };
    consoleAccess = { access, mapping };
    navLinks.forEach((link) => {
      const panel = link.getAttribute("data-panel");
      const allowed = access.level === "owner" || Boolean(access.permissions?.[mapping[panel]]);
      link.hidden = !allowed;
    });
  }

  function showDashboard(email) {
    loginView.hidden = true;
    dashboardView.hidden = false;
    if (userLabel) userLabel.textContent = email;

    // Set sidebar profile details
    const sidebarAvatar = document.getElementById("sidebar-avatar");
    const sidebarEmail = document.getElementById("sidebar-user-email");
    if (sidebarAvatar) sidebarAvatar.textContent = email.slice(0, 2).toUpperCase();
    if (sidebarEmail) sidebarEmail.textContent = email;

    refreshAll();
    const requestedPanel = window.location.hash.replace(/^#/, "");
    if (requestedPanel) showPanel(requestedPanel);
    // Load system integrity checks in the background
    void loadSystem();
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
    const requiredPermission = consoleAccess?.mapping?.[panelId];
    const isAllowed = consoleAccess
      && (consoleAccess.access.level === "owner" || Boolean(consoleAccess.access.permissions?.[requiredPermission]));
    if (!isAllowed || !document.getElementById(`panel-${panelId}`)) {
      panelId = "overview";
    }
    panels.forEach((p) => p.classList.toggle("is-active", p.id === `panel-${panelId}`));
    navLinks.forEach((l) => l.classList.toggle("is-active", l.getAttribute("data-panel") === panelId));
    if (pageTitle) {
      if (panelTitles[panelId]) {
        pageTitle.textContent = panelTitles[panelId];
      } else if (panelId === "user-detail") {
        pageTitle.textContent = "Fiche Profil Membre";
      }
    }
    if (window.location.hash !== `#${panelId}`) history.replaceState(null, "", `#${panelId}`);
    void loadPanel(panelId);
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const panelId = link.getAttribute("data-panel");
      showPanel(panelId);
      sidebar?.classList.remove("is-open");
    });
  });

  menuButton?.addEventListener("click", () => sidebar?.classList.toggle("is-open"));

  document.getElementById("back-to-users-btn")?.addEventListener("click", () => {
    showPanel("users");
  });

  async function refreshUsers() {
    const currentRefreshId = ++lastRefreshId;
    const tbody = document.getElementById("users-tbody");
    const countEl = document.getElementById("kpi-users");
    if (!tbody) return;

    let users = [];

    if (supabase) {
      try {
        const result = await adminRequest("list");
        if (currentRefreshId !== lastRefreshId) return;
        users = result.users || [];
      } catch (reason) {
        if (currentRefreshId !== lastRefreshId) return;
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

    if (currentRefreshId !== lastRefreshId) return;
    tbody.innerHTML = "";

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
          <button type="button" class="btn-action-view view-user-btn">Consulter</button>
          <button type="button" class="btn-action-delete delete-user-btn">Supprimer</button>
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

    const permissionInputs = [...document.querySelectorAll("[data-app-permission]")];
    const storedPermissions = user.app_permissions || {};
    permissionInputs.forEach((input) => {
      input.checked = storedPermissions[input.dataset.appPermission] !== false;
    });

    const readAppPermissions = () => Object.fromEntries(
      permissionInputs.map((input) => [input.dataset.appPermission, input.checked])
    );

    // Profile facts only: never fabricate user activity in a production console.
    // Profile facts and dynamic audit logs display
    const detailLogs = document.getElementById("detail-logs");
    if (detailLogs) {
      const createdAt = user.created_at ? new Date(user.created_at).toLocaleString("fr-FR") : "Date inconnue";
      detailLogs.innerHTML = `
        <div class="log-line"><span class="t">[System]</span> Initialisation du profil de ${escapeHtml(email)}...</div>
        <div class="log-line"><span class="t">[Profil]</span> Créé le ${createdAt}</div>
        <div class="log-line"><span class="t">[Rôle]</span> ${escapeHtml(user.role || "membre")}</div>
        <div class="log-line"><span class="t">[Mode]</span> ${escapeHtml(user.write_mode === "direct" ? "Production" : "Brouillon")}</div>
        <div class="log-line"><span class="t">[System]</span> Chargement du journal d'activité...</div>
      `;

      void (async () => {
        try {
          const auditData = await adminRequest("audit-list");
          const userLogs = (auditData.rows || []).filter(row => 
            (row.actor_email && row.actor_email.toLowerCase() === email.toLowerCase()) ||
            (row.target_id === user.user_id) ||
            (row.metadata && row.metadata.email && row.metadata.email.toLowerCase() === email.toLowerCase())
          );
          
          // Clear loading line
          detailLogs.innerHTML = `
            <div class="log-line"><span class="t">[System]</span> Profil de ${escapeHtml(email)} chargé.</div>
            <div class="log-line"><span class="t">[Profil]</span> Créé le ${createdAt}</div>
            <div class="log-line"><span class="t">[Rôle]</span> ${escapeHtml(user.role || "membre")}</div>
            <div class="log-line"><span class="t">[Mode]</span> ${escapeHtml(user.write_mode === "direct" ? "Production" : "Brouillon")}</div>
          `;

          if (userLogs.length > 0) {
            userLogs.forEach(row => {
              const time = new Date(row.created_at).toLocaleString("fr-FR");
              const line = document.createElement("div");
              line.className = "log-line";
              line.innerHTML = `<span class="t">[${time}]</span> <span class="action-highlight">${escapeHtml(row.action)}</span> sur ${escapeHtml(row.target_type)} ${row.target_id ? `(cible: ${escapeHtml(row.target_id.slice(0, 8))})` : ''}`;
              detailLogs.appendChild(line);
            });
          } else {
            const line = document.createElement("div");
            line.className = "log-line info";
            line.innerHTML = `<span class="t">[Info]</span> Aucun événement d'audit enregistré pour ce membre.`;
            detailLogs.appendChild(line);
          }
        } catch (err) {
          const line = document.createElement("div");
          line.className = "log-line error";
          line.innerHTML = `<span class="t">[Erreur]</span> Impossible de charger les logs d'activité : ${escapeHtml(err.message)}`;
          detailLogs.appendChild(line);
        }
      })();
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
            await adminRequest("update", { email, role: rVal, writeMode: mVal, appPermissions: readAppPermissions() });
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
          saveBtn?.click();
        }
      };
    }

    const sensitiveOutput = document.getElementById("user-sensitive-output");
    document.getElementById("reset-password-btn").onclick = async () => {
      try {
        await adminRequest("reset-password", { email });
        if (sensitiveOutput) sensitiveOutput.hidden = true;
        addLog("s", `E-mail de récupération envoyé à ${email}.`);
      } catch (reason) { addLog("e", String(reason)); }
    };
    const confirmEmailBtn = document.getElementById("confirm-email-btn");
    confirmEmailBtn.disabled = Boolean(user.confirmed);
    confirmEmailBtn.textContent = user.confirmed ? "E-mail confirmé" : "Confirmer l'e-mail";
    confirmEmailBtn.onclick = async () => {
      try { await adminRequest("confirm-email", { email }); addLog("s", `Email confirmé : ${email}`); await refreshUsers(); }
      catch (reason) { addLog("e", String(reason)); }
    };
    const toggleBanBtn = document.getElementById("toggle-ban-btn");
    let banned = Boolean(user.banned_until && new Date(user.banned_until) > new Date());
    const syncBanButton = () => {
      toggleBanBtn.textContent = banned ? "Débannir le compte" : "Bannir le compte";
      toggleBanBtn.classList.toggle("is-danger", !banned);
    };
    syncBanButton();
    toggleBanBtn.onclick = async () => {
      const nextAction = banned ? "unban" : "ban";
      try {
        await adminRequest(nextAction, { email });
        banned = !banned;
        syncBanButton();
        addLog("s", `${banned ? "Banni" : "Débanni"} : ${email}`);
        await refreshUsers();
      }
      catch (reason) { addLog("e", String(reason)); }
    };
    document.getElementById("show-devices-btn").onclick = async () => {
      try {
        const result = await adminRequest("devices-list", { email });
        if (sensitiveOutput) {
          sensitiveOutput.hidden = false;
          sensitiveOutput.innerHTML = result.rows.length ? result.rows.map((row) => `<div class="device-row"><span>${escapeHtml(row.device_name || "Appareil")}</span><small>${escapeHtml(row.app_version || "version inconnue")} · ${formatDate(row.last_seen_at)}</small>${row.revoked ? '<em>Révoqué</em>' : `<button type="button" class="btn btn-ghost btn-sm" data-revoke-device="${escapeHtml(row.id)}">Révoquer</button>`}</div>`).join("") : '<div class="empty-state">Aucun appareil activé.</div>';
          sensitiveOutput.querySelectorAll("[data-revoke-device]").forEach((button) => button.addEventListener("click", async () => { await adminRequest("device-revoke", { id: button.dataset.revokeDevice }); document.getElementById("show-devices-btn").click(); }));
        }
      } catch (reason) { addLog("e", String(reason)); }
    };
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
      const errMsg = String(reason).replace(/^Error:\s*/i, "");
      addLog("e", errMsg);
      alert("Erreur lors de la création : " + errMsg);
    }
  });

  // Search input handler
  document.getElementById("users-search")?.addEventListener("input", refreshUsers);

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("fr-FR");
  }

  async function loadDashboard() {
    try {
      const data = await adminRequest("dashboard");
      const metrics = data.metrics || {};
      const values = {
        "kpi-users": metrics.users,
        "kpi-licenses": metrics.activeLicenses,
        "kpi-tickets": metrics.openTickets,
        "kpi-contacts": metrics.newContacts,
        "kpi-banned": metrics.banned
      };
      Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = String(value ?? "—");
      });
      const hint = document.getElementById("kpi-ticket-hint");
      if (hint) hint.textContent = `${metrics.urgentTickets || 0} urgent(s)`;
      const audit = document.getElementById("dashboard-audit");
      if (audit) {
        const formatAction = (row) => {
          const act = row.action || "";
          let label = act;
          let letter = "A";
          let cls = "audit";
          if (act.startsWith("user.")) {
            letter = "U"; cls = "user";
            if (act === "user.create") label = "Création de membre";
            else if (act === "user.delete") label = "Suppression de membre";
            else if (act === "user.update") label = "Mise à jour membre";
            else if (act === "user.ban") label = "Bannissement membre";
          } else if (act.startsWith("license.")) {
            letter = "L"; cls = "license";
            if (act === "license.upsert") label = "Attribution licence";
          } else if (act.startsWith("support.")) {
            letter = "S"; cls = "support";
            if (act === "support.reply") label = "Réponse ticket";
            else if (act === "support.close") label = "Clôture ticket";
            else if (act === "support.update") label = "Mise à jour ticket";
          } else if (act.startsWith("release.")) {
            letter = "R"; cls = "release";
            if (act === "release.upsert") label = "Publication mise à jour";
          }
          return { label, letter, cls };
        };

        audit.innerHTML = (data.recentAudit || []).length
          ? data.recentAudit.map((row) => {
              const details = formatAction(row);
              return `
                <div class="activity-feed-row">
                  <div class="feed-icon-circle ${details.cls}">${details.letter}</div>
                  <div class="feed-body">
                    <span class="feed-action-text">${escapeHtml(details.label)}</span>
                    <span class="feed-actor-email">${escapeHtml(row.actor_email || "système")}</span>
                  </div>
                  <div class="feed-time">${formatDate(row.created_at)}</div>
                </div>
              `;
            }).join("")
          : '<div class="empty-state">Aucune action enregistrée.</div>';
      }
    } catch (reason) {
      addLog("e", String(reason));
    }
  }

  async function loadLicenses() {
    const tbody = document.getElementById("licenses-tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Chargement…</td></tr>';
    try {
      const data = await adminRequest("license-list");
      tbody.innerHTML = data.rows.length ? data.rows.map((row) => `<tr><td>${escapeHtml(row.email)}</td><td>${escapeHtml(row.plan)}</td><td><span class="role-pill">${escapeHtml(row.status)}</span></td><td>${Number(row.device_limit || 1)}</td><td>${formatDate(row.expires_at)}</td></tr>`).join("") : '<tr><td colspan="5" class="empty-state">Aucune licence personnalisée.</td></tr>';
    } catch (reason) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHtml(String(reason))}</td></tr>`;
    }
  }

  document.getElementById("license-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const expires = document.getElementById("license-expires").value;
      await adminRequest("license-upsert", {
        email: document.getElementById("license-email").value.trim(),
        plan: document.getElementById("license-plan").value,
        status: document.getElementById("license-status").value,
        deviceLimit: Number(document.getElementById("license-devices").value),
        expiresAt: expires ? new Date(expires).toISOString() : null
      });
      addLog("s", "Licence enregistrée.");
      await loadLicenses();
    } catch (reason) { addLog("e", String(reason)); }
  });

  function appendChatMessage(message) {
    const chatMessages = document.getElementById("support-chat-messages");
    if (!chatMessages) return;

    if (chatMessages.querySelector(`[data-message-id="${message.id}"]`)) return;

    const emptyState = chatMessages.querySelector(".empty-state");
    if (emptyState) emptyState.remove();

    const isUser = message.author_kind === "user";
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${isUser ? "user" : "admin"}`;
    bubble.setAttribute("data-message-id", message.id);
    bubble.innerHTML = `
      <p class="chat-bubble-content">${escapeHtml(message.content)}</p>
      <span class="chat-bubble-time">${formatTime(message.created_at)}</span>
    `;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function formatTime(isoString) {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  }

  async function selectTicket(ticket) {
    activeTicketId = ticket.id;
    
    if (activeTicketSubscription) {
      supabase.removeChannel(activeTicketSubscription);
      activeTicketSubscription = null;
    }

    const emptyState = document.getElementById("chat-empty-state");
    const viewport = document.getElementById("chat-viewport");
    if (emptyState) emptyState.style.display = "none";
    if (viewport) viewport.style.display = "flex";

    const subjectEl = document.getElementById("support-chat-subject");
    const metaEl = document.getElementById("support-chat-meta");
    const avatarEl = document.getElementById("support-avatar");
    const statusPill = document.getElementById("support-status-pill");

    if (subjectEl) subjectEl.textContent = ticket.subject;
    if (metaEl) metaEl.textContent = ticket.email;
    if (avatarEl) avatarEl.textContent = ticket.email.charAt(0).toUpperCase();
    if (statusPill) {
      statusPill.textContent = ticket.status === "open" ? "Ouvert" : ticket.status === "pending" ? "Réponse" : "Clos";
      statusPill.className = `role-pill ${ticket.status} ticket-status-pill`;
    }
    
    const actionsContainer = document.getElementById("support-chat-actions");
    const chatForm = document.getElementById("support-chat-form");
    
    if (ticket.status !== "closed") {
      if (actionsContainer) actionsContainer.style.display = "flex";
      if (chatForm) chatForm.style.display = "flex";
    } else {
      if (actionsContainer) actionsContainer.style.display = "none";
      if (chatForm) chatForm.style.display = "none";
    }

    const chatMessages = document.getElementById("support-chat-messages");
    chatMessages.innerHTML = "";
    if (ticket.support_messages && ticket.support_messages.length) {
      const sorted = [...ticket.support_messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      sorted.forEach(appendChatMessage);
    } else {
      chatMessages.innerHTML = '<div class="empty-state">Aucun message dans cette discussion.</div>';
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (supabase) {
      activeTicketSubscription = supabase
        .channel(`admin-ticket-chat-${ticket.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: `ticket_id=eq.${ticket.id}`
          },
          (payload) => {
            appendChatMessage(payload.new);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "support_tickets",
            filter: `id=eq.${ticket.id}`
          },
          (payload) => {
            const updated = payload.new;
            const metaEl = document.getElementById("support-chat-meta");
            const statusPill = document.getElementById("support-status-pill");
            if (metaEl) metaEl.textContent = updated.email;
            if (statusPill) {
              statusPill.textContent = updated.status === "open" ? "Ouvert" : updated.status === "pending" ? "Réponse" : "Clos";
              statusPill.className = `role-pill ${updated.status} ticket-status-pill`;
            }
            if (updated.status === "closed") {
              if (actionsContainer) actionsContainer.style.display = "none";
              if (chatForm) chatForm.style.display = "none";
            }
          }
        )
        .subscribe();
    }
  }

  function renderTickets() {
    const list = document.getElementById("support-list");
    if (!list) return;
    
    let filtered = currentTickets;
    
    // Filter by status
    if (ticketFilter === "open") {
      filtered = filtered.filter(t => t.status === "open" || t.status === "pending");
    } else if (ticketFilter === "closed") {
      filtered = filtered.filter(t => t.status === "closed" || t.status === "clos");
    }
    
    // Filter by search query
    if (ticketSearch) {
      filtered = filtered.filter(t => 
        t.email.toLowerCase().includes(ticketSearch) || 
        t.subject.toLowerCase().includes(ticketSearch)
      );
    }
    
    list.innerHTML = filtered.length ? filtered.map((row) => {
      const lastMsg = row.support_messages?.at(-1)?.content || "Aucun message";
      const isActive = row.id === activeTicketId;
      return `
        <button type="button" class="ticket-list-item ${isActive ? 'is-active' : ''}" data-ticket-id="${escapeHtml(row.id)}">
          <div class="ticket-header">
            <strong class="ticket-subject">${escapeHtml(row.subject)}</strong>
            <span class="role-pill ${row.status} ticket-status-pill">${escapeHtml(row.status === 'open' ? 'Ouvert' : row.status === 'pending' ? 'Réponse' : 'Clos')}</span>
          </div>
          <span class="ticket-email">${escapeHtml(row.email)}</span>
          <p class="ticket-preview">${escapeHtml(lastMsg)}</p>
        </button>
      `;
    }).join("") : '<div class="empty-state">Aucun ticket correspondant.</div>';

    // Rebind click events
    list.querySelectorAll("[data-ticket-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        list.querySelectorAll(".ticket-list-item").forEach((other) => other.classList.remove("is-active"));
        btn.classList.add("is-active");
        const ticket = currentTickets.find((row) => row.id === btn.dataset.ticketId);
        if (ticket) selectTicket(ticket);
      });
    });
    
    if (activeTicketId) {
      const activeBtn = list.querySelector(`[data-ticket-id="${activeTicketId}"]`);
      if (activeBtn) activeBtn.classList.add("is-active");
    }
  }

  async function loadSupport() {
    const list = document.getElementById("support-list");
    if (!list) return;
    list.innerHTML = '<div class="empty-state">Chargement…</div>';
    try {
      const data = await adminRequest("support-list");
      currentTickets = data.rows || [];
      renderTickets();
    } catch (reason) { list.innerHTML = `<div class="empty-state">${escapeHtml(String(reason))}</div>`; }
  }

  async function loadContacts() {
    const list = document.getElementById("contacts-list");
    if (!list) return;
    list.innerHTML = '<div class="empty-state">Chargement…</div>';
    try {
      const data = await adminRequest("contact-list");
      list.innerHTML = data.rows.length ? data.rows.map((row) => `<article class="admin-list-item"><div><strong>${escapeHtml(row.subject || "Message")}</strong><small>${escapeHtml(row.name || "Visiteur")} · ${escapeHtml(row.email)} · ${formatDate(row.created_at)}</small><p>${escapeHtml(row.message)}</p></div><div class="admin-item-actions"><span class="role-pill">${escapeHtml(row.status)}</span><button class="btn btn-ghost btn-sm" data-contact-read="${escapeHtml(row.id)}">Lu</button><button class="btn btn-ghost btn-sm" data-contact-archive="${escapeHtml(row.id)}">Archiver</button></div></article>`).join("") : '<div class="empty-state">Aucun message.</div>';
      list.querySelectorAll("[data-contact-read]").forEach((button) => button.addEventListener("click", async () => { await adminRequest("contact-update", { id: button.dataset.contactRead, status: "read" }); await loadContacts(); }));
      list.querySelectorAll("[data-contact-archive]").forEach((button) => button.addEventListener("click", async () => { await adminRequest("contact-update", { id: button.dataset.contactArchive, status: "archived" }); await loadContacts(); }));
    } catch (reason) { list.innerHTML = `<div class="empty-state">${escapeHtml(String(reason))}</div>`; }
  }

  async function loadAudit() {
    const tbody = document.getElementById("audit-tbody");
    if (!tbody) return;
    try {
      const data = await adminRequest("audit-list");
      tbody.innerHTML = data.rows.length ? data.rows.map((row) => `<tr><td>${formatDate(row.created_at)}</td><td>${escapeHtml(row.actor_email || "système")}</td><td>${escapeHtml(row.action)}</td><td>${escapeHtml(row.target_type)} · ${escapeHtml(row.target_id || "—")}</td></tr>`).join("") : '<tr><td colspan="4" class="empty-state">Aucun événement.</td></tr>';
    } catch (reason) { tbody.innerHTML = `<tr><td colspan="4" class="empty-state">${escapeHtml(String(reason))}</td></tr>`; }
  }

  async function loadSystem() {
    const checks = document.getElementById("system-checks");
    const diagDb = document.getElementById("diag-db");
    const diagFunction = document.getElementById("diag-function");
    const diagManifest = document.getElementById("diag-manifest");

    try {
      const started = performance.now();
      const health = await adminRequest("health");
      const manifestUrl = config.updateManifestUrl || "/update.json";
      const separator = manifestUrl.includes("?") ? "&" : "?";
      const manifestResponse = await fetch(`${manifestUrl}${separator}health=${Date.now()}`, { cache: "no-store" });
      const latency = Math.round(performance.now() - started);

      // Update KPIs
      const dbLabel = document.getElementById("health-database");
      const latencyLabel = document.getElementById("health-latency");
      const functionLabel = document.getElementById("health-function");
      if (dbLabel) dbLabel.textContent = health.database === "online" ? "En ligne" : "Erreur";
      if (latencyLabel) latencyLabel.textContent = `${health.latencyMs ?? latency} ms`;
      if (functionLabel) functionLabel.textContent = "Active";

      // Update Diagnostics in overview
      if (diagDb) {
        diagDb.textContent = health.database === "online" ? "CONFORME" : "ERREUR";
        diagDb.parentElement.className = health.database === "online" ? "diagnostic-card" : "diagnostic-card error";
      }
      if (diagFunction) {
        diagFunction.textContent = "CONFORME";
        diagFunction.parentElement.className = "diagnostic-card";
      }
      if (diagManifest) {
        diagManifest.textContent = manifestResponse.ok ? "CONFORME" : "ERREUR";
        diagManifest.parentElement.className = manifestResponse.ok ? "diagnostic-card" : "diagnostic-card error";
      }

      // Update checks list in system tab
      if (checks) {
        checks.innerHTML = `
          <div class="diagnostic-card" style="width: 100%; max-width: 100%;">
            <div class="diagnostic-info">
              <span class="diagnostic-title">Edge Function admin-users</span>
              <span class="diagnostic-sub">Authentification, permissions et base</span>
            </div>
            <span class="diagnostic-status">OK</span>
          </div>
          <div class="diagnostic-card ${manifestResponse.ok ? "" : "error"}" style="width: 100%; max-width: 100%;">
            <div class="diagnostic-info">
              <span class="diagnostic-title">Manifeste de mise à jour</span>
              <span class="diagnostic-sub">Code HTTP ${manifestResponse.status}</span>
            </div>
            <span class="diagnostic-status">${manifestResponse.ok ? "OK" : "Erreur"}</span>
          </div>
        `;
      }
    } catch (reason) {
      const functionLabel = document.getElementById("health-function");
      if (functionLabel) functionLabel.textContent = "Erreur";

      if (diagDb) {
        diagDb.textContent = "ERREUR";
        diagDb.parentElement.className = "diagnostic-card error";
      }
      if (diagFunction) {
        diagFunction.textContent = "ERREUR";
        diagFunction.parentElement.className = "diagnostic-card error";
      }
      if (diagManifest) {
        diagManifest.textContent = "ERREUR";
        diagManifest.parentElement.className = "diagnostic-card error";
      }

      if (checks) {
        checks.innerHTML = `<div class="empty-state">${escapeHtml(String(reason))}</div>`;
      }
    }
  }

  async function loadTeam() {
    const tbody = document.getElementById("team-tbody");
    if (!tbody) return;
    try {
      const data = await adminRequest("team-list");
      tbody.innerHTML = data.rows.length ? data.rows.map((row) => `<tr><td>${escapeHtml(row.email)}</td><td>${escapeHtml(row.level)}</td><td>${escapeHtml(Object.entries(row.permissions || {}).filter(([, enabled]) => enabled).map(([key]) => key).join(", ") || "Aucune")}</td><td><button class="btn btn-ghost btn-sm" data-team-delete="${escapeHtml(row.email)}">Retirer</button></td></tr>`).join("") : '<tr><td colspan="4" class="empty-state">Aucun accès délégué.</td></tr>';
      tbody.querySelectorAll("[data-team-delete]").forEach((button) => button.addEventListener("click", async () => { if (!confirm(`Retirer ${button.dataset.teamDelete} ?`)) return; await adminRequest("team-delete", { email: button.dataset.teamDelete }); await loadTeam(); }));
    } catch (reason) { tbody.innerHTML = `<tr><td colspan="4" class="empty-state">${escapeHtml(String(reason))}</td></tr>`; }
  }

  async function loadReleases() {
    const list = document.getElementById("releases-list");
    if (!list) return;
    try {
      const data = await adminRequest("release-list");
      list.innerHTML = data.rows.length ? data.rows.map((row) => `<article class="admin-list-item"><div><strong>v${escapeHtml(row.version)}</strong><small>${formatDate(row.updated_at)} · ${row.published ? "Publiée" : "Brouillon"}</small><p>${escapeHtml(row.notes || "Sans notes")}</p></div><a class="btn btn-ghost btn-sm" href="${escapeHtml(row.artifact_url)}" target="_blank" rel="noopener noreferrer">Artefact</a></article>`).join("") : '<div class="empty-state">Aucune release enregistrée.</div>';
    } catch (reason) { list.innerHTML = `<div class="empty-state">${escapeHtml(String(reason))}</div>`; }
  }

  document.getElementById("team-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const permissions = {};
    document.querySelectorAll('[name="team-permission"]').forEach((input) => { permissions[input.value] = input.checked; });
    try {
      await adminRequest("team-upsert", { email: document.getElementById("team-email").value.trim(), level: document.getElementById("team-level").value, permissions });
      await loadTeam();
    } catch (reason) { addLog("e", String(reason)); }
  });

  function loadPanel(panelId) {
    const loaders = { overview: loadDashboard, licenses: loadLicenses, support: loadSupport, contacts: loadContacts, releases: loadReleases, audit: loadAudit, system: loadSystem, team: loadTeam, library: loadLibrary };
    return loaders[panelId]?.();
  }

  // --- Textures Library CRUD ---
  let libraryTextures = [];
  let selectedBatchFiles = [];

  function getColorHex(colorName) {
    const map = {
      "blanc": "#ffffff",
      "noir": "#1a1a1a",
      "gris": "#808080",
      "rouge": "#ef4444",
      "bleu": "#3b82f6",
      "vert": "#10b981",
      "jaune": "#eab308",
      "orange": "#f97316",
      "violet": "#8b5cf6",
      "rose": "#ec4899",
      "marron": "#78350f",
      "beige": "#f5f5dc",
      "multicolore": "linear-gradient(45deg, red, orange, yellow, green, blue, purple)"
    };
    return map[colorName.toLowerCase()] || "#4b5563";
  }

  function getColorText(colorName) {
    const isLight = ["blanc", "beige", "jaune"].includes(colorName.toLowerCase());
    return isLight ? "#000000" : "#ffffff";
  }

  async function loadLibraryLegacy() {
    const list = document.getElementById("library-list-tbody");
    if (!list) return;
    list.innerHTML = '<tr><td colspan="5" class="loading-state" style="text-align: center; padding: 20px; color: var(--muted);">Chargement des textures...</td></tr>';
    try {
      const data = await adminRequest("library-list");
      if (!data.ok) throw new Error(data.error);
      libraryTextures = data.rows ?? [];
      renderLibraryList();
    } catch (reason) {
      list.innerHTML = `<tr><td colspan="5" class="empty-state" style="color: var(--danger); text-align: center; padding: 20px;">Erreur : ${escapeHtml(reason.message || reason)}</td></tr>`;
    }
  }

  function renderLibraryListLegacy() {
    const list = document.getElementById("library-list-tbody");
    if (!list) return;

    if (libraryTextures.length === 0) {
      list.innerHTML = '<tr><td colspan="5" class="empty-state" style="text-align: center; padding: 20px; color: var(--muted);">Aucune texture enregistrée.</td></tr>';
      return;
    }

    list.innerHTML = libraryTextures.map((row) => `
      <tr data-id="${row.id}">
        <td>
          <div class="texture-thumb-container">
            <img src="${escapeHtml(row.url)}" alt="${escapeHtml(row.name)}" class="texture-thumbnail-img" onerror="this.src='assets/logo_small.png'" />
          </div>
        </td>
        <td><strong>${escapeHtml(row.name)}</strong></td>
        <td><span class="badge badge-category">${escapeHtml(row.category)}</span></td>
        <td><span class="badge badge-color" style="background: ${getColorHex(row.color)}; color: ${getColorText(row.color)};">${escapeHtml(row.color)}</span></td>
        <td style="text-align: right;">
          <div class="btn-group" style="justify-content: flex-end;">
            <button type="button" class="btn btn-ghost btn-sm" data-edit-texture="${escapeHtml(row.id)}">Modifier</button>
            <button type="button" class="btn btn-ghost btn-sm text-danger" data-delete-texture="${escapeHtml(row.id)}">Supprimer</button>
          </div>
        </td>
      </tr>
    `).join("");

    list.querySelectorAll("[data-edit-texture]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = libraryTextures.find((t) => t.id === btn.dataset.editTexture);
        if (item) editTexture(item);
      });
    });

    list.querySelectorAll("[data-delete-texture]").forEach((btn) => {
      btn.addEventListener("click", () => {
        void deleteTexture(btn.dataset.deleteTexture);
      });
    });
  }

  function editTexture(item) {
    document.getElementById("library-id").value = item.id;
    document.getElementById("library-name").value = item.name;
    document.getElementById("library-category").value = item.category;
    document.getElementById("library-color").value = item.color;
    document.getElementById("library-url").value = item.url;
    
    updatePreviewImage(item.url);

    document.getElementById("library-cancel-btn").style.display = "inline-block";
    document.getElementById("library-form-desc").textContent = "Modification de la texture active.";
    
    const panel = document.getElementById("panel-library");
    if (panel) panel.scrollTop = 0;
  }

  function resetLibraryForm() {
    document.getElementById("library-id").value = "";
    document.getElementById("library-form").reset();
    updatePreviewImage("");
    document.getElementById("library-cancel-btn").style.display = "none";
    document.getElementById("library-form-desc").textContent = "Création d'une nouvelle texture.";
    selectedBatchFiles = [];
    renderBatchPreview();
  }

  async function deleteTexture(id) {
    if (!confirm("Voulez-vous vraiment supprimer cette texture de la bibliothèque ?")) return;
    try {
      const res = await adminRequest("library-delete", { id });
      if (!res.ok) throw new Error(res.error);
      addLog("s", "Texture supprimée de la bibliothèque");
      await loadLibrary();
    } catch (err) {
      alert(`Erreur lors de la suppression : ${err.message}`);
      addLog("e", `Erreur suppression texture : ${err.message}`);
    }
  }

  function nearestPowerOfTwo(value) {
    return Math.pow(2, Math.round(Math.log(value) / Math.log(2)));
  }

  function optimizeTexture(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let w = nearestPowerOfTwo(img.width);
          let h = nearestPowerOfTwo(img.height);
          w = Math.min(w, 1024);
          h = Math.min(h, 1024);
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({ blob, w, h });
            } else {
              reject(new Error("Erreur de compression."));
            }
          }, "image/webp", 0.85);
        };
        img.onerror = () => reject(new Error("Impossible de charger l'image."));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
      reader.readAsDataURL(file);
    });
  }

  async function handleTextureUploadLegacy(file) {
    const progressDiv = document.getElementById("library-upload-progress");
    const progressBar = document.getElementById("upload-progress-bar");
    const progressText = document.getElementById("upload-status-text");
    if (!progressDiv || !progressBar || !progressText) return;

    progressDiv.style.display = "block";
    progressBar.style.width = "20%";
    progressText.textContent = "Optimisation de l'image (Puissance de 2, WebP)...";

    try {
      const { blob, w, h } = await optimizeTexture(file);
      progressBar.style.width = "50%";
      progressText.textContent = `Image optimisée en ${w}x${h} (WebP). Envoi vers le stockage...`;

      if (!supabase) throw new Error("Supabase n'est pas configuré.");
      const path = `texture-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;
      const { error } = await supabase.storage.from("textures-library").upload(path, blob, {
        contentType: "image/webp",
        cacheControl: "31536000"
      });

      if (error) throw error;
      progressBar.style.width = "90%";
      progressText.textContent = "Envoi terminé. Génération du lien...";

      const { data: urlData } = supabase.storage.from("textures-library").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      await adminRequest("library-upload-audit", { path, width: w, height: h });

      document.getElementById("library-url").value = publicUrl;
      updatePreviewImage(publicUrl);

      progressBar.style.width = "100%";
      progressText.textContent = "Téléchargé et optimisé avec succès !";
      setTimeout(() => { progressDiv.style.display = "none"; }, 2000);
      addLog("s", `Texture téléversée : ${w}x${h} WebP`);
    } catch (err) {
      progressBar.style.width = "0%";
      progressText.textContent = `Erreur : ${err.message}`;
      addLog("e", `Erreur d'envoi texture : ${err.message}`);
    }
  }

  function updatePreviewImage(url) {
    const previewImg = document.getElementById("library-preview-img");
    const previewPlaceholder = document.getElementById("library-preview-placeholder");
    if (!previewImg || !previewPlaceholder) return;
    if (url && url.startsWith("http")) {
      previewImg.src = url;
      previewImg.style.display = "block";
      previewPlaceholder.style.display = "none";
    } else {
      previewImg.src = "";
      previewImg.style.display = "none";
      previewPlaceholder.style.display = "block";
    }
  }

  void loadLibraryLegacy;
  void renderLibraryListLegacy;
  void handleTextureUploadLegacy;

  // Compact library renderer and batch upload workflow.
  function renderLibraryList() {
    const list = document.getElementById("library-list-tbody");
    if (!list) return;
    const query = (document.getElementById("library-search")?.value || "").trim().toLowerCase();
    const rows = query
      ? libraryTextures.filter((row) => [row.name, row.category, row.color].some((value) => String(value || "").toLowerCase().includes(query)))
      : libraryTextures;

    if (rows.length === 0) {
      list.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; padding: 28px; color: var(--muted); text-align: center;">${query ? "Aucune texture ne correspond à votre recherche." : "Aucune texture enregistrée."}</div>`;
      return;
    }

    list.innerHTML = rows.map((row) => `
      <article class="texture-library-card" data-id="${escapeHtml(row.id)}">
        <div class="texture-card-media">
          <img src="${escapeHtml(row.url)}" alt="${escapeHtml(row.name)}" loading="lazy" onerror="this.src='assets/logo_small.png'" />
        </div>
        <div class="texture-card-body">
          <div class="texture-card-name" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</div>
          <div class="texture-card-meta">
            <span class="badge badge-category">${escapeHtml(row.category)}</span>
            <span class="badge badge-color" style="background: ${getColorHex(row.color)}; color: ${getColorText(row.color)};">${escapeHtml(row.color)}</span>
          </div>
          <div class="texture-card-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-edit-texture="${escapeHtml(row.id)}">Modifier</button>
            <button type="button" class="btn btn-ghost btn-sm text-danger" data-delete-texture="${escapeHtml(row.id)}">Supprimer</button>
          </div>
        </div>
      </article>
    `).join("");

    list.querySelectorAll("[data-edit-texture]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = libraryTextures.find((texture) => texture.id === btn.dataset.editTexture);
        if (item) editTexture(item);
      });
    });
    list.querySelectorAll("[data-delete-texture]").forEach((btn) => {
      btn.addEventListener("click", () => void deleteTexture(btn.dataset.deleteTexture));
    });
  }

  async function loadLibrary() {
    const list = document.getElementById("library-list-tbody");
    if (!list) return;
    list.innerHTML = '<div class="loading-state" style="grid-column: 1 / -1; padding: 28px; color: var(--muted); text-align: center;">Chargement des textures...</div>';
    try {
      const data = await adminRequest("library-list");
      if (!data.ok) throw new Error(data.error);
      libraryTextures = data.rows ?? [];
      renderLibraryList();
    } catch (reason) {
      list.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; padding: 28px; color: var(--danger); text-align: center;">Erreur : ${escapeHtml(reason.message || reason)}</div>`;
    }
  }


  async function uploadTextureFile(file, reportProgress) {
    const { blob, w, h } = await optimizeTexture(file);
    reportProgress?.(50, `Image optimisée en ${w}×${h}. Envoi vers le stockage...`);
    if (!supabase) throw new Error("Supabase n'est pas configuré.");
    const path = `texture-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;
    const { error } = await supabase.storage.from("textures-library").upload(path, blob, {
      contentType: "image/webp",
      cacheControl: "31536000"
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("textures-library").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    await adminRequest("library-upload-audit", { path, width: w, height: h });
    reportProgress?.(100, "Image enregistrée.");
    return { publicUrl, path, w, h };
  }

  function libraryErrorMessage(error) {
    const message = String(error?.message || error || "Erreur inconnue");
    if (/bucket not found|bucket introuvable/i.test(message)) {
      return "Le bucket Storage « textures-library » est introuvable. Crée-le dans Supabase Storage, puis exécute la migration 20260710_storage_library_access_fix.sql.";
    }
    if (/superadmin_access|row-level security|permission denied/i.test(message)) {
      return "La policy Storage Supabase refuse cet utilisateur. Exécute la migration 20260710_storage_library_access_fix.sql puis reconnecte-toi.";
    }
    return message;
  }


  function addFilesToBatch(files) {
    const selected = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (selected.length === 0) return;
    
    const defaultCategory = document.getElementById("library-category").value;
    const defaultColor = document.getElementById("library-color").value;
    
    selected.forEach(file => {
      selectedBatchFiles.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name.replace(/\.[^/.]+$/, "").trim() || "Sans titre",
        category: defaultCategory,
        color: defaultColor
      });
    });
    
    renderBatchPreview();
    updatePreviewImage("");
  }

  function renderBatchPreview() {
    const preview = document.getElementById("library-batch-preview");
    if (!preview) return;
    
    const submitBtn = document.getElementById("library-submit-btn");
    const cancelBtn = document.getElementById("library-cancel-btn");
    
    if (selectedBatchFiles.length === 0) {
      preview.innerHTML = "";
      if (submitBtn) {
        submitBtn.textContent = "Enregistrer la texture";
        submitBtn.disabled = false;
      }
      return;
    }
    
    if (submitBtn) {
      submitBtn.textContent = `Enregistrer les textures (${selectedBatchFiles.length})`;
      submitBtn.disabled = false;
    }
    if (cancelBtn) {
      cancelBtn.style.display = "inline-block";
    }
    
    const categories = ["Métal", "Bois", "Brique", "Béton", "Plâtre", "Tissu/Cuir", "Carbone/Plastique", "Verre", "Pierre", "Néon/Lumière", "Peinture", "Sol/Asphalte", "Motif", "Autre"];
    const colors = ["Noir", "Blanc", "Gris", "Rouge", "Bleu", "Vert", "Jaune", "Orange", "Violet", "Rose", "Marron", "Beige", "Multicolore"];
    
    preview.innerHTML = selectedBatchFiles.map((item, index) => {
      const categoryOptions = categories.map(cat => 
        `<option value="${cat}" ${item.category === cat ? "selected" : ""}>${cat}</option>`
      ).join("");
      
      const colorOptions = colors.map(col => 
        `<option value="${col}" ${item.color === col ? "selected" : ""}>${col}</option>`
      ).join("");
      
      return `
        <div class="library-batch-item" data-index="${index}">
          <div class="batch-item-preview">
            <img src="${URL.createObjectURL(item.file)}" alt="" />
          </div>
          <div class="batch-item-fields">
            <input type="text" class="batch-item-name" value="${escapeHtml(item.name)}" placeholder="Nom de la texture" />
            <div class="batch-item-selects">
              <select class="batch-item-category">
                ${categoryOptions}
              </select>
              <select class="batch-item-color">
                ${colorOptions}
              </select>
            </div>
          </div>
          <button type="button" class="batch-item-remove-btn" data-remove="${index}" title="Supprimer">×</button>
        </div>
      `;
    }).join("");
    
    preview.querySelectorAll(".library-batch-item").forEach(itemEl => {
      const index = parseInt(itemEl.dataset.index);
      
      itemEl.querySelector(".batch-item-name").addEventListener("input", (e) => {
        selectedBatchFiles[index].name = e.target.value.trim();
      });
      
      itemEl.querySelector(".batch-item-category").addEventListener("change", (e) => {
        selectedBatchFiles[index].category = e.target.value;
      });
      
      itemEl.querySelector(".batch-item-color").addEventListener("change", (e) => {
        selectedBatchFiles[index].color = e.target.value;
      });
      
      itemEl.querySelector(".batch-item-remove-btn").addEventListener("click", () => {
        selectedBatchFiles.splice(index, 1);
        renderBatchPreview();
      });
    });
  }

  async function uploadBatchFiles() {
    const progressDiv = document.getElementById("library-upload-progress");
    const progressBar = document.getElementById("upload-progress-bar");
    const progressText = document.getElementById("upload-status-text");
    const submitBtn = document.getElementById("library-submit-btn");
    
    if (!progressDiv || !progressBar || !progressText || !submitBtn) return;
    
    submitBtn.disabled = true;
    progressDiv.style.display = "block";
    progressBar.style.width = "0%";
    
    let completed = 0;
    const failures = [];
    const total = selectedBatchFiles.length;
    const remainingBatch = [];
    
    for (let i = 0; i < selectedBatchFiles.length; i++) {
      const item = selectedBatchFiles[i];
      try {
        progressText.textContent = `Import ${completed + 1}/${total} : ${item.name}`;
        const result = await uploadTextureFile(item.file, (percent) => {
          progressBar.style.width = `${Math.round(((completed + percent / 100) / total) * 100)}%`;
        });
        const res = await adminRequest("library-upsert", {
          name: item.name,
          category: item.category,
          color: item.color,
          url: result.publicUrl
        });
        if (!res.ok) throw new Error(res.error);
        completed += 1;
      } catch (error) {
        failures.push(`${item.file.name} : ${libraryErrorMessage(error)}`);
        remainingBatch.push(item);
      }
    }
    
    selectedBatchFiles = remainingBatch;
    progressBar.style.width = "100%";
    progressText.textContent = failures.length
      ? `${completed}/${total} images importées. ${failures.length} échec(s).`
      : `${completed} images importées et publiées.`;
      
    addLog(failures.length ? "e" : "s", `Import multiple : ${completed}/${total} texture(s)`);
    
    setTimeout(() => {
      progressDiv.style.display = "none";
      submitBtn.disabled = false;
      if (failures.length === 0) {
        resetLibraryForm();
      } else {
        renderBatchPreview();
      }
      void loadLibrary();
    }, 2000);
  }

  // Bind library events once loaded
  document.getElementById("library-url")?.addEventListener("input", (e) => {
    updatePreviewImage(e.target.value.trim());
  });

  document.getElementById("library-file")?.addEventListener("change", (e) => {
    if (e.target.files?.length) {
      addFilesToBatch(e.target.files);
      e.target.value = "";
    }
  });

  // Bind Drag & Drop
  const dropzone = document.querySelector(".library-upload-dropzone");
  if (dropzone) {
    ["dragenter", "dragover"].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add("drag-over");
      }, false);
    });

    ["dragleave", "drop"].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove("drag-over");
      }, false);
    });

    dropzone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files?.length) {
        addFilesToBatch(files);
      }
    }, false);
  }

  document.getElementById("library-search")?.addEventListener("input", () => renderLibraryList());

  document.getElementById("library-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    if (selectedBatchFiles.length > 0) {
      void uploadBatchFiles();
      return;
    }
    
    const id = document.getElementById("library-id").value.trim() || undefined;
    const name = document.getElementById("library-name").value.trim();
    const category = document.getElementById("library-category").value;
    const color = document.getElementById("library-color").value;
    const url = document.getElementById("library-url").value.trim();

    try {
      const res = await adminRequest("library-upsert", { id, name, category, color, url });
      if (!res.ok) throw new Error(res.error);
      addLog("s", id ? `Texture « ${name} » modifiée` : `Texture « ${name} » créée`);
      resetLibraryForm();
      await loadLibrary();
    } catch (err) {
      alert(`Erreur d'enregistrement : ${err.message}`);
      addLog("e", `Erreur enregistrement texture : ${err.message}`);
    }
  });

  document.getElementById("library-cancel-btn")?.addEventListener("click", () => {
    resetLibraryForm();
  });

  document.querySelectorAll("[data-refresh]").forEach((button) => button.addEventListener("click", () => void loadPanel(button.dataset.refresh)));
  document.getElementById("refresh-releases-btn")?.addEventListener("click", () => void loadReleases());



  function refreshKpis() {
    const versionEl = document.getElementById("kpi-version");
    const healthVersionEl = document.getElementById("health-version");
    const pingEl = document.getElementById("kpi-ping");
    if (versionEl) versionEl.textContent = `v${config.appVersion || "0.3.2"}`;
    if (healthVersionEl) healthVersionEl.textContent = `v${config.appVersion || "0.3.2"}`;
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
    loadDashboard();
    seedLogs();
    loadUpdateManifest();
  }

  async function loadUpdateManifest() {
    try {
      const manifestUrl = config.updateManifestUrl || "/update.json";
      const separator = manifestUrl.includes("?") ? "&" : "?";
      const res = await fetch(`${manifestUrl}${separator}admin=${Date.now()}`, { cache: "no-store" });
      if (!res.ok || res.status === 204) return;
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
      const notesInput = document.getElementById("release-notes");
      if (notesInput && data.notes) notesInput.value = data.notes;
    } catch {
      /* ignore */
    }
  }

  document.getElementById("refresh-users-btn")?.addEventListener("click", refreshUsers);

  function directReleaseUrl(value, version) {
    const url = value.trim();
    const releasePage = url.match(/^(https:\/\/github\.com\/[^/]+\/[^/]+\/releases)\/tag\/([^/?#]+)\/?$/i);
    if (releasePage) {
      return `${releasePage[1]}/download/${releasePage[2]}/SR.Editer_${version}_x64-setup.exe`;
    }
    return url;
  }

  document.getElementById("generate-release-btn")?.addEventListener("click", () => {
    const version = document.getElementById("release-version").value.trim();
    const pubDate = document.getElementById("release-date").value.trim();
    const zipUrl = directReleaseUrl(document.getElementById("release-url").value, version);
    document.getElementById("release-url").value = zipUrl;
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

  document.getElementById("save-release-btn")?.addEventListener("click", async () => {
    try {
      const version = document.getElementById("release-version").value.trim();
      const artifactUrl = directReleaseUrl(document.getElementById("release-url").value, version);
      document.getElementById("release-url").value = artifactUrl;
      await adminRequest("release-upsert", {
        version,
        artifactUrl,
        signature: document.getElementById("release-signature").value.trim(),
        notes: document.getElementById("release-notes").value.trim(),
        published: document.getElementById("release-published").checked
      });
      addLog("s", document.getElementById("release-published").checked ? "Release publiée pour les clients." : "Release enregistrée en brouillon.");
      await loadReleases();
      await loadUpdateManifest();
    } catch (reason) { addLog("e", String(reason)); }
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

    document.getElementById("support-chat-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("support-chat-input");
      if (!input || !input.value.trim() || !activeTicketId) return;
      
      const content = input.value.trim();
      input.value = "";
      
      try {
        await adminRequest("support-reply", { id: activeTicketId, content });
        await loadSupport();
      } catch (reason) { addLog("e", `Erreur d'envoi : ${String(reason)}`); }
    });

    document.getElementById("support-close-btn")?.addEventListener("click", async () => {
      if (!activeTicketId) return;
      if (!confirm("Voulez-vous clore ce ticket ?")) return;
      try {
        await adminRequest("support-update", { id: activeTicketId, status: "closed" });
        await loadSupport();
        document.getElementById("support-chat-actions").style.display = "none";
        document.getElementById("support-chat-form").style.display = "none";
      } catch (reason) { addLog("e", `Erreur de clôture : ${String(reason)}`); }
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

  localPreview = demoMode && ["127.0.0.1", "localhost"].includes(window.location.hostname)
    && new URLSearchParams(window.location.search).get("preview") === "1";
  if (localPreview) showDashboard("preview-local@sr-editer");
  else checkSession();

  // Vercel-style sidebar filter search & shortcut
  const sidebarFilter = document.getElementById("sidebar-filter-input");
  if (sidebarFilter) {
    sidebarFilter.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      document.querySelectorAll(".vercel-vertical-links .sidebar-link").forEach((link) => {
        const text = link.querySelector(".nav-title").textContent.toLowerCase();
        if (text.includes(query)) {
          link.style.display = "flex";
        } else {
          link.style.display = "none";
        }
      });
    });

    document.addEventListener("keydown", (e) => {
      const activeElement = document.activeElement;
      const isInput = activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.isContentEditable);
      if (!isInput && (e.key === "f" || e.key === "F" || e.key === "/")) {
        e.preventDefault();
        sidebarFilter.focus();
        sidebarFilter.select();
      }
    });
  }

  // Support Inbox Filters
  const ticketSearchInput = document.getElementById("ticket-search-input");
  if (ticketSearchInput) {
    ticketSearchInput.addEventListener("input", (e) => {
      ticketSearch = e.target.value.toLowerCase().trim();
      renderTickets();
    });
  }

  const filterTabs = document.querySelectorAll(".filter-tab");
  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      filterTabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      ticketFilter = tab.dataset.filter;
      renderTickets();
    });
  });

  setInterval(refreshKpis, 8000);
})();
