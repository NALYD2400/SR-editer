(function initAdminDashboard() {
  const config = window.SR_CONFIG || {};
  let supabase = null;
  let usersCache = [];
  let lastRefreshId = 0;
  let usersFilterState = {
    role: "",
    plan: "",
    status: "",
    discord: "",
    confirmed: "",
    access: "",
    sort: "created_desc",
  };

  const USERS_SORT_LABELS = {
    created_desc: "Plus récents",
    created_asc: "Plus anciens",
    email_asc: "E-mail A→Z",
    email_desc: "E-mail Z→A",
    role_asc: "Rôle",
    plan_asc: "Offre",
  };

  let subscriptionsCache = [];
  let subsFilterState = {
    plan: "",
    status: "",
    stripe: "",
    sort: "plan_asc",
  };

  const SUBS_SORT_LABELS = {
    plan_asc: "Offre",
    status_asc: "Statut",
    email_asc: "E-mail A→Z",
    email_desc: "E-mail Z→A",
  };
  let activeTicketId = null;
  let activeTicketSubscription = null;
  const demoMode = config.demoMode === true;
  let localPreview = false;
  let previewSupportRows = null;
  let previewContactRows = null;
  let currentTickets = [];
  let ticketFilter = "all";
  let ticketSearch = "";
  let currentContacts = [];
  let contactFilter = "all";
  let contactSearch = "";
  let activeContactId = null;
  let currentActivityRows = [];
  let activityFilter = "all";
  let activitySearch = "";
  let currentAuditRows = [];
  let auditFilter = "all";
  let auditSearch = "";
  let currentTeamRows = [];
  let teamFilter = "all";
  let teamSearch = "";
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
    subscriptions: "Abonnements",
    coupons: "Coupons Stripe",
    support: "Support",
    contacts: "Contacts",
    releases: "Releases",
    activity: "Activité récente",
    audit: "Audit global",
    system: "Santé système",
    team: "Équipe superadmin",
    library: "Bibliothèque de Textures"
  };

  const panelDescriptions = {
    overview: "Surveillez l’activité, l’infrastructure et les accès depuis un seul endroit.",
    users: "Créez les comptes et contrôlez précisément leurs droits dans l’application.",
    subscriptions: "Consultez et filtrez les abonnements Stripe, puis ouvrez la fiche membre.",
    coupons: "Créez, filtrez et supprimez vos codes promo Stripe.",
    "user-detail": "Gérez le rôle, l’accès et les appareils associés à ce membre.",
    support: "Traitez les demandes et échangez directement avec vos utilisateurs.",
    contacts: "Centralisez et qualifiez les messages reçus depuis le site public.",
    releases: "Diffusez les nouvelles versions du logiciel, gérez les patch notes.",
    activity: "Consultez les dernières actions effectuées dans la console.",
    audit: "Tracez l'intégralité des événements d'administration et de sécurité.",
    system: "Surveillez les logs serveurs, les Edge Functions et le statut de la DB.",
    team: "Gérez les permissions des administrateurs et modérateurs.",
    library: "Ajoutez, organisez et publiez les textures disponibles dans l’application."
  };

  panels.forEach((panel) => {
    const panelId = panel.id.replace(/^panel-/, "");
    const title = panelTitles[panelId] || (panelId === "user-detail" ? "Fiche membre" : "Console");
    const description = panelDescriptions[panelId] || "";
    const intro = document.createElement("header");
    intro.className = "page-intro";
    intro.innerHTML = `
      <div>
        <span class="page-eyebrow">SR Editer / Console</span>
        <h1>${escapeHtml(title)}</h1>
        ${description ? `<p>${escapeHtml(description)}</p>` : ""}
      </div>
    `;
    panel.prepend(intro);
  });

  function redirectToSiteLogin(message) {
    const params = new URLSearchParams();
    params.set("next", "admin.html");
    if (message) params.set("notice", message);
    window.location.href = "login.html?" + params.toString();
  }

  function showLogin(message) {
    redirectToSiteLogin(message || null);
  }

  function showLoginError(message) {
    if (!loginError) {
      redirectToSiteLogin(message);
      return;
    }
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
            { actor_email: "d.robert.2400@gmail.com", action: "user.update", target_type: "user", target_id: "u2", created_at: new Date().toISOString() },
            { actor_email: "d.robert.2400@gmail.com", action: "support.reply", target_type: "ticket", target_id: "t1", created_at: new Date(Date.now() - 1800000).toISOString() },
            { actor_email: "d.robert.2400@gmail.com", action: "contact.update", target_type: "contact", target_id: "c1", created_at: new Date(Date.now() - 3600000).toISOString() },
            { actor_email: "d.robert.2400@gmail.com", action: "team.upsert", target_type: "user", target_id: "u2", created_at: new Date(Date.now() - 7200000).toISOString() },
            { actor_email: "d.robert.2400@gmail.com", action: "license.upsert", target_type: "user", target_id: "u3", created_at: new Date(Date.now() - 14400000).toISOString() },
            { actor_email: "system", action: "release.upsert", target_type: "release", target_id: "0.3.2", created_at: new Date(Date.now() - 86400000).toISOString() },
            { actor_email: "system", action: "app.boot", target_type: "system", target_id: null, created_at: new Date(Date.now() - 172800000).toISOString() }
          ]
        };
      }
      
      if (action === "list") {
        return {
          ok: true,
          users: [
            { user_id: "u1", email: "d.robert.2400@gmail.com", role: "owner", write_mode: "direct", confirmed: true, created_at: new Date(Date.now() - 86400000*10).toISOString(), plan: "lifetime", license_status: "active", device_limit: 5, expires_at: null, discord: { linked: true, username: "nalyd1", id: "985083967642423366", avatarUrl: "https://cdn.discordapp.com/embed/avatars/1.png" } },
            { user_id: "u2", email: "moderateur@sr-editer.fr", role: "moderateur", write_mode: "draft", confirmed: true, created_at: new Date(Date.now() - 86400000*5).toISOString(), plan: "pro", license_status: "active", device_limit: 2, expires_at: new Date(Date.now() + 86400000*30).toISOString(), discord: { linked: false, username: null, id: null } },
            { user_id: "u3", email: "testeur@sr-editer.fr", role: "membre", write_mode: "direct", confirmed: true, created_at: new Date(Date.now() - 86400000*2).toISOString(), plan: "free", license_status: "active", device_limit: 1, expires_at: null, discord: { linked: false, username: null, id: null } },
            { user_id: "u4", email: "banni@gta5-studio.com", role: "membre", write_mode: "direct", confirmed: false, created_at: new Date().toISOString(), banned_until: new Date(Date.now() + 86400000*365).toISOString(), plan: "free", license_status: "suspended", device_limit: 1, discord: { linked: false, username: null, id: null } }
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
        if (!previewSupportRows) {
          previewSupportRows = [
            {
              id: "t1",
              subject: "Bug de texture sur YFT",
              status: "open",
              priority: "high",
              email: "testeur@sr-editer.fr",
              source: "app",
              app_version: "0.3.2",
              discord: { linked: false, username: null, id: null },
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
              source: "app",
              app_version: "0.3.1",
              discord: { linked: false, username: null, id: null },
              support_messages: [
                { id: "m2", author_kind: "user", content: "Bonjour, j'ai changé d'ordinateur. Pouvez-vous réinitialiser ma limite d'appareils ?", created_at: new Date(Date.now() - 7200000).toISOString() },
                { id: "m3", author_kind: "admin", content: "Bonjour, c'est fait. Vous pouvez vous reconnecter !", created_at: new Date(Date.now() - 3600000).toISOString() }
              ]
            },
            {
              id: "t3",
              subject: "SZ",
              status: "closed",
              priority: "normal",
              email: "d.robert.2400@gmail.com",
              source: "app",
              app_version: "0.3.2",
              discord: { linked: true, username: "nalyd1", id: "985083967642423366", avatarUrl: "https://cdn.discordapp.com/embed/avatars/1.png" },
              support_messages: [
                { id: "m4", author_kind: "user", content: "tzzt", created_at: new Date("2026-07-05T12:50:00.000Z").toISOString() }
              ]
            }
          ];
        }
        return { ok: true, rows: previewSupportRows };
      }

      if (action === "support-delete") {
        const id = payload?.id;
        if (previewSupportRows && id) {
          previewSupportRows = previewSupportRows.filter((row) => row.id !== id);
        }
        return { ok: true };
      }

      if (action === "support-update") {
        const id = payload?.id;
        const status = payload?.status;
        if (previewSupportRows && id && status) {
          previewSupportRows = previewSupportRows.map((row) => (
            row.id === id ? { ...row, status } : row
          ));
        }
        return { ok: true };
      }
      
      if (action === "contact-list") {
        if (!previewContactRows) {
          previewContactRows = [
            {
              id: "c1",
              subject: "Question pré-vente",
              name: "Marc",
              email: "marc@outlook.com",
              message: "Bonjour, la licence Studio permet-elle d'exporter en DDS ?",
              status: "new",
              created_at: new Date(Date.now() - 7200000).toISOString()
            },
            {
              id: "c2",
              subject: "Partenariat",
              name: "Sophie",
              email: "sophie@agence.fr",
              message: "Bonjour, nous aimerions discuter d’un partenariat créateur pour SR Editer.",
              status: "read",
              created_at: new Date(Date.now() - 86400000).toISOString()
            },
            {
              id: "c3",
              subject: "Demande de démo",
              name: "Alex",
              email: "d.robert.2400@gmail.com",
              message: "Est-il possible d’avoir une démo guidée de l’éditeur 3D ?",
              status: "archived",
              created_at: new Date(Date.now() - 172800000).toISOString()
            }
          ];
        }
        return { ok: true, rows: previewContactRows };
      }

      if (action === "contact-update") {
        const id = payload?.id;
        const status = payload?.status;
        if (previewContactRows && id && status) {
          previewContactRows = previewContactRows.map((row) => (
            row.id === id ? { ...row, status } : row
          ));
        }
        return { ok: true };
      }

      if (action === "contact-delete") {
        const id = payload?.id;
        if (previewContactRows && id) {
          previewContactRows = previewContactRows.filter((row) => row.id !== id);
        }
        return { ok: true };
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
            { created_at: new Date(Date.now() - 1800000).toISOString(), actor_email: "d.robert.2400@gmail.com", action: "support.delete", target_type: "ticket", target_id: "t3" },
            { created_at: new Date(Date.now() - 3600000).toISOString(), actor_email: "preview-local@sr-editer", action: "team.upsert", target_type: "user", target_id: "u1" },
            { created_at: new Date(Date.now() - 7200000).toISOString(), actor_email: "d.robert.2400@gmail.com", action: "contact.update", target_type: "contact", target_id: "c1" },
            { created_at: new Date(Date.now() - 14400000).toISOString(), actor_email: "d.robert.2400@gmail.com", action: "license.upsert", target_type: "user", target_id: "u3" },
            { created_at: new Date(Date.now() - 86400000).toISOString(), actor_email: "system", action: "release.upsert", target_type: "release", target_id: "0.3.2" },
            { created_at: new Date(Date.now() - 172800000).toISOString(), actor_email: "system", action: "app.boot", target_type: "system", target_id: null }
          ]
        };
      }
      
      if (action === "team-list") {
        return {
          ok: true,
          rows: [
            { email: "d.robert.2400@gmail.com", level: "owner", permissions: { console: true, users: true, licenses: true, billing: true, support: true, contacts: true, releases: true, audit: true, system: true, team: true, library: true } },
            { email: "moderateur@sr-editer.fr", level: "collaborator", permissions: { console: true, users: true, support: true, contacts: true, licenses: false, billing: false, releases: false, audit: false, system: false, team: false, library: true } }
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
            redirectToSiteLogin("Votre session a expiré. Veuillez vous reconnecter.");
          });
        } else {
          redirectToSiteLogin("Votre session a expiré. Veuillez vous reconnecter.");
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
      const message = String(reason).replace(/^Error:\s*/i, "");
      // Garde la session utilisateur : renvoie vers l'espace client
      window.location.href = "dashboard.html?notice=" + encodeURIComponent(message || "Accès admin refusé.");
      return false;
    }
  }

  function applyAccess(access) {
    const mapping = {
      overview: "console",
      users: "users",
      "user-detail": "users",
      subscriptions: "billing",
      coupons: "billing",
      support: "support",
      contacts: "contacts",
      releases: "releases",
      activity: "audit",
      audit: "audit",
      system: "system",
      team: "team",
      library: "library"
    };
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
    if (sidebarEmail) sidebarEmail.textContent = email;
    if (sidebarAvatar) {
      sidebarAvatar.textContent = email.slice(0, 2).toUpperCase();
      void (async () => {
        if (!supabase) return;
        try {
          const { data } = await supabase.auth.getUser();
          const discord = discordFromAuthUser(data?.user);
          renderAvatarInto(sidebarAvatar, email, discord, { initialLength: 2 });
        } catch {
          /* keep initials fallback */
        }
      })();
    }

    refreshAll();
    const requestedPanel = window.location.hash.replace(/^#/, "");
    if (requestedPanel) showPanel(requestedPanel);
    // Load system integrity checks in the background
    void loadSystem();
  }

  async function checkSession() {
    if (!supabase) {
      redirectToSiteLogin("Supabase non configuré — édite js/config.js");
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.email) {
      await requireAdminAccess(data.session.user.email);
    } else {
      redirectToSiteLogin();
    }
  }

  logoutBtn?.addEventListener("click", async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "index.html";
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

  function discordOf(user) {
    const value = user?.discord;
    const avatarUrl = typeof value?.avatarUrl === "string" &&
      /^https:\/\/cdn\.discordapp\.com\/(?:avatars|embed\/avatars)\//i.test(value.avatarUrl.trim())
      ? value.avatarUrl.trim()
      : null;
    return {
      linked: value?.linked === true,
      username: typeof value?.username === "string" && value.username.trim() ? value.username.trim() : null,
      id: typeof value?.id === "string" && value.id.trim() ? value.id.trim() : null,
      avatarUrl
    };
  }

  function roleLabelOf(role) {
    const labels = {
      membre: "Membre",
      moderateur: "Modérateur",
      admin: "Admin",
      owner: "Owner",
      suspendu: "Suspendu",
      banned: "Banni"
    };
    return labels[role] || role || "Membre";
  }

  function planLabelOf(plan) {
    const labels = {
      free: "Gratuit",
      standard: "Standard",
      pro: "Pro",
      studio: "Studio",
      premium: "Premium",
      lifetime: "Lifetime"
    };
    const key = String(plan || "free").toLowerCase();
    return labels[key] || plan || "Gratuit";
  }

  function planClassOf(plan) {
    const key = String(plan || "free").toLowerCase();
    if (["free", "standard", "pro", "studio", "premium", "lifetime"].includes(key)) return key;
    return "free";
  }

  function subscriptionStatusLabelOf(status) {
    const labels = {
      active: "Actif",
      trialing: "Essai",
      past_due: "Impayé",
      canceled: "Annulé",
      unpaid: "Impayé",
      suspended: "Suspendu"
    };
    const key = String(status || "").toLowerCase();
    return labels[key] || status || "";
  }

  function licensePlanFromUser(user) {
    const plan = String(user?.plan || "").toLowerCase();
    if (["free", "pro", "studio", "lifetime"].includes(plan)) return plan;
    const tier = String(user?.subscription_tier || "free").toLowerCase();
    if (tier === "pro") return "pro";
    if (tier === "premium" || tier === "studio" || tier === "lifetime") return tier === "lifetime" ? "lifetime" : "studio";
    return "free";
  }

  function licenseStatusFromUser(user) {
    const status = String(user?.license_status || user?.subscription_status || "active").toLowerCase();
    if (["trialing", "active", "past_due", "canceled", "suspended"].includes(status)) return status;
    return "active";
  }

  function toDatetimeLocalValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function writeModeLabelOf(mode) {
    if (mode === "draft") return "Brouillon";
    return "Direct";
  }

  async function copyTextToClipboard(value, button) {
    const text = String(value || "").trim();
    if (!text || text === "—") return;
    try {
      await navigator.clipboard.writeText(text);
      if (button) {
        const showFeedback = button.dataset.copyShowFeedback !== "0";
        const previous = button.dataset.copyLabel || (button.children.length ? "" : button.textContent);
        if (previous) button.dataset.copyLabel = previous;
        button.classList.add("is-copied");
        if (showFeedback && button.children.length === 0) {
          button.textContent = "Copié";
        }
        window.setTimeout(() => {
          button.classList.remove("is-copied");
          if (showFeedback && button.children.length === 0) {
            button.textContent = button.dataset.copyLabel || previous;
          }
        }, 1200);
      }
      addLog("s", `Copié : ${text}`);
    } catch (reason) {
      addLog("e", `Impossible de copier : ${String(reason)}`);
    }
  }

  function bindCopyButton(root, selector, value) {
    const button = root.querySelector(selector);
    if (!button || !value) return;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void copyTextToClipboard(value, button);
    });
  }

  function discordFromAuthUser(user) {
    const identities = Array.isArray(user?.identities) ? user.identities : [];
    const identity = identities.find((item) => item?.provider === "discord");
    if (!identity) return { linked: false, username: null, id: null, avatarUrl: null };
    const metadata = identity.identity_data && typeof identity.identity_data === "object"
      ? identity.identity_data
      : {};
    const avatarCandidate = typeof metadata.avatar_url === "string"
      ? metadata.avatar_url
      : typeof metadata.picture === "string"
        ? metadata.picture
        : "";
    const avatarUrl = /^https:\/\/cdn\.discordapp\.com\/(?:avatars|embed\/avatars)\//i.test(avatarCandidate.trim())
      ? avatarCandidate.trim()
      : null;
    const username = [
      metadata.global_name,
      metadata.full_name,
      metadata.name,
      metadata.user_name,
      metadata.preferred_username
    ].find((value) => typeof value === "string" && value.trim());
    const id = typeof metadata.sub === "string" && metadata.sub.trim()
      ? metadata.sub.trim()
      : typeof identity.id === "string"
        ? identity.id
        : null;
    return {
      linked: true,
      username: username ? String(username).trim() : null,
      id,
      avatarUrl
    };
  }

  function initialsFromEmail(email, length = 2) {
    const local = String(email || "").split("@")[0] || "";
    const letters = local.replace(/[^a-zA-ZÀ-ÿ]/g, "");
    if (letters.length > 0) {
      return letters.slice(0, length).toUpperCase();
    }
    // Evite les avatars "23" sur les mails purement numériques.
    return "U";
  }

  function renderAvatarInto(container, email, discord, options = {}) {
    if (!container) return;
    const length = options.initialLength || 2;
    const initials = initialsFromEmail(email, options.singleInitial ? 1 : length);
    const showFallback = () => {
      container.replaceChildren(document.createTextNode(initials));
      container.removeAttribute("data-has-image");
      container.classList.add("is-fallback");
    };

    container.classList.remove("is-fallback");

    if (!discord?.avatarUrl) {
      showFallback();
      return;
    }

    const image = document.createElement("img");
    image.alt = `Avatar Discord de ${discord.username || email}`;
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", showFallback, { once: true });
    image.src = discord.avatarUrl;
    container.replaceChildren(image);
    container.setAttribute("data-has-image", "true");
  }

  function renderDetailAvatar(container, email, discord) {
    renderAvatarInto(container, email, discord, { initialLength: 1, singleInitial: true });
    if (container) {
      container.setAttribute(
        "aria-label",
        discord?.avatarUrl
          ? `Avatar Discord de ${discord.username || email}`
          : `Initiale du compte ${email}`
      );
    }
  }

  async function refreshUsers() {
    const currentRefreshId = ++lastRefreshId;
    const tbody = document.getElementById("users-tbody");
    const usersCountEl = document.getElementById("users-count");
    if (!tbody) return;

    let users = [];

    if (supabase) {
      try {
        const result = await adminRequest("list");
        if (currentRefreshId !== lastRefreshId) return;
        users = result.users || [];
      } catch (reason) {
        if (currentRefreshId !== lastRefreshId) return;
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">${escapeHtml(String(reason).replace(/^Error:\s*/i, ""))}</td></tr>`;
        if (usersCountEl) usersCountEl.textContent = "—";
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
    if (currentRefreshId !== lastRefreshId) return;
    renderUsersTable(filterAndSortUsers(usersCache));
  }

  function readUsersFilters() {
    return {
      search: (document.getElementById("users-search")?.value || "").toLowerCase().trim(),
      role: usersFilterState.role || "",
      plan: (usersFilterState.plan || "").toLowerCase(),
      status: (usersFilterState.status || "").toLowerCase(),
      discord: usersFilterState.discord || "",
      confirmed: usersFilterState.confirmed || "",
      access: usersFilterState.access || "",
      sort: usersFilterState.sort || "created_desc",
    };
  }

  function countActiveUsersFilters() {
    return ["role", "plan", "status", "discord", "confirmed", "access"]
      .filter((key) => Boolean(usersFilterState[key])).length;
  }

  function syncUsersMenusUI() {
    const sortLabel = document.getElementById("users-sort-label");
    if (sortLabel) sortLabel.textContent = USERS_SORT_LABELS[usersFilterState.sort] || "Plus récents";

    document.querySelectorAll("#users-sort-menu .users-menu-item").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.sort === usersFilterState.sort);
    });

    document.querySelectorAll("#users-filters-menu .users-menu-item[data-filter-key]").forEach((item) => {
      const key = item.dataset.filterKey;
      const value = item.dataset.filterValue ?? "";
      item.classList.toggle("is-active", String(usersFilterState[key] || "") === value);
    });

    const badge = document.getElementById("users-filters-badge");
    const activeCount = countActiveUsersFilters();
    if (badge) {
      badge.hidden = activeCount === 0;
      badge.textContent = String(activeCount);
    }
    const filtersLabel = document.getElementById("users-filters-label");
    if (filtersLabel) filtersLabel.textContent = activeCount ? `Filtres (${activeCount})` : "Filtres";
  }

  function closeUsersMenus(exceptId = null) {
    ["users-filters-menu", "users-sort-menu"].forEach((id) => {
      if (exceptId && id === exceptId) return;
      const panel = document.getElementById(id);
      const trigger = document.getElementById(id === "users-filters-menu" ? "users-filters-trigger" : "users-sort-trigger");
      if (panel) panel.hidden = true;
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      trigger?.closest(".users-menu")?.classList.remove("is-open");
    });
  }

  function toggleUsersMenu(panelId, triggerId) {
    const panel = document.getElementById(panelId);
    const trigger = document.getElementById(triggerId);
    if (!panel || !trigger) return;
    const willOpen = panel.hidden;
    closeUsersMenus(willOpen ? panelId : null);
    panel.hidden = !willOpen;
    trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
    trigger.closest(".users-menu")?.classList.toggle("is-open", willOpen);
  }

  function userIsBanned(user) {
    return Boolean(user?.banned_until && new Date(user.banned_until) > new Date());
  }

  function userPlanKey(user) {
    return String(user?.subscription_tier || user?.plan || "free").toLowerCase();
  }

  function userStatusKey(user) {
    return String(user?.subscription_status || user?.license_status || "").toLowerCase();
  }

  function planMatchesFilter(plan, filter) {
    if (!filter) return true;
    if (plan === filter) return true;
    if (filter === "premium" && ["premium", "studio", "lifetime"].includes(plan)) return true;
    if (filter === "studio" && ["studio", "premium"].includes(plan)) return true;
    return false;
  }

  function filterAndSortUsers(source) {
    const filters = readUsersFilters();
    let users = Array.isArray(source) ? [...source] : [];

    if (filters.search) {
      const q = filters.search;
      users = users.filter((u) => {
        const discord = discordOf(u);
        return (
          (u.email && u.email.toLowerCase().includes(q))
          || (u.role && u.role.toLowerCase().includes(q))
          || (u.write_mode && u.write_mode.toLowerCase().includes(q))
          || (userPlanKey(u).includes(q))
          || (userStatusKey(u).includes(q))
          || (discord.username && discord.username.toLowerCase().includes(q))
          || (discord.id && String(discord.id).includes(q))
        );
      });
    }

    if (filters.role) {
      users = users.filter((u) => String(u.role || "membre").toLowerCase() === filters.role);
    }
    if (filters.plan) {
      users = users.filter((u) => planMatchesFilter(userPlanKey(u), filters.plan));
    }
    if (filters.status) {
      users = users.filter((u) => userStatusKey(u) === filters.status);
    }
    if (filters.discord === "linked") {
      users = users.filter((u) => discordOf(u).linked);
    } else if (filters.discord === "unlinked") {
      users = users.filter((u) => !discordOf(u).linked);
    }
    if (filters.confirmed === "yes") {
      users = users.filter((u) => Boolean(u.confirmed));
    } else if (filters.confirmed === "no") {
      users = users.filter((u) => !u.confirmed);
    }
    if (filters.access === "banned") {
      users = users.filter((u) => userIsBanned(u));
    } else if (filters.access === "ok") {
      users = users.filter((u) => !userIsBanned(u));
    }

    const roleRank = { owner: 0, admin: 1, moderateur: 2, membre: 3, suspendu: 4 };
    const planRank = { lifetime: 0, premium: 1, studio: 1, pro: 2, standard: 3, free: 4 };

    users.sort((a, b) => {
      const emailA = String(a.email || "").toLowerCase();
      const emailB = String(b.email || "").toLowerCase();
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      switch (filters.sort) {
        case "created_asc":
          return dateA - dateB;
        case "email_asc":
          return emailA.localeCompare(emailB, "fr");
        case "email_desc":
          return emailB.localeCompare(emailA, "fr");
        case "role_asc":
          return (roleRank[String(a.role || "membre")] ?? 9) - (roleRank[String(b.role || "membre")] ?? 9)
            || emailA.localeCompare(emailB, "fr");
        case "plan_asc":
          return (planRank[userPlanKey(a)] ?? 9) - (planRank[userPlanKey(b)] ?? 9)
            || emailA.localeCompare(emailB, "fr");
        case "created_desc":
        default:
          return dateB - dateA;
      }
    });

    return users;
  }

  function renderUsersFromFilters() {
    syncUsersMenusUI();
    renderUsersTable(filterAndSortUsers(usersCache));
  }

  function resetUsersFilters() {
    usersFilterState = {
      role: "",
      plan: "",
      status: "",
      discord: "",
      confirmed: "",
      access: "",
      sort: "created_desc",
    };
    const search = document.getElementById("users-search");
    if (search) search.value = "";
    closeUsersMenus();
    renderUsersFromFilters();
  }

  function renderUsersTable(users) {
    const tbody = document.getElementById("users-tbody");
    const usersCountEl = document.getElementById("users-count");
    const usersCountLabel = document.getElementById("users-count-label");
    if (!tbody) return;

    tbody.innerHTML = "";
    if (usersCountEl) usersCountEl.textContent = String(users.length);
    if (usersCountLabel) {
      const total = usersCache.length;
      usersCountLabel.textContent = total && users.length !== total
        ? `sur ${total}`
        : (users.length === 1 ? "membre" : "membres");
    }

    if (users.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="empty-state">Aucun profil ne correspond.</td></tr>';
      return;
    }

    users.forEach((user) => {
      const tr = document.createElement("tr");
      const date = user.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—";
      const discord = discordOf(user);
      const discordLabel = discord.username || discord.id || "Compte Discord";
      const email = user.email || "—";
      const role = user.role || "membre";
      const plan = user.subscription_tier || user.plan || "free";
      const planStatus = user.subscription_status || user.license_status || "";
      const planStatusLabel = subscriptionStatusLabelOf(planStatus);
      const discordCell = discord.linked
        ? `<button type="button" class="discord-link-chip copy-discord-name" title="Copier le pseudo Discord" data-copy-show-feedback="0">
             <svg class="discord-link-chip-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
               <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
             </svg>
             <span class="discord-link-chip-name">${escapeHtml(discordLabel)}</span>
             <span class="discord-link-chip-dot" aria-hidden="true"></span>
           </button>`
        : `<span class="discord-identity-label is-empty">Non lié</span>`;
      const discordIdCell = discord.linked && discord.id
        ? `<button type="button" class="copy-chip copy-discord-id" title="Copier l'ID Discord">${escapeHtml(discord.id)}</button>`
        : `<span class="user-date-cell">—</span>`;
      tr.innerHTML = `
        <td class="col-member" data-label="Membre">
          <div class="user-member-cell">
            <span class="user-row-avatar" aria-hidden="true"></span>
            <button type="button" class="user-member-email copy-email" title="Copier l'e-mail">${escapeHtml(email)}</button>
          </div>
        </td>
        <td class="col-role" data-label="Rôle"><span class="role-pill ${escapeHtml(role)}">${escapeHtml(roleLabelOf(role))}</span></td>
        <td class="col-plan" data-label="Abonnement">
          <div class="user-plan-cell" title="${escapeHtml([planLabelOf(plan), planStatusLabel].filter(Boolean).join(" · "))}">
            <span class="plan-pill ${escapeHtml(planClassOf(plan))} ${planStatus ? `is-${escapeHtml(String(planStatus).toLowerCase())}` : ""}">
              <span class="plan-pill-label">${escapeHtml(planLabelOf(plan))}</span>
              ${planStatusLabel && !["active", "trialing"].includes(String(planStatus).toLowerCase())
                ? `<span class="plan-pill-status">${escapeHtml(planStatusLabel)}</span>`
                : ""}
            </span>
          </div>
        </td>
        <td class="col-discord" data-label="Discord">
          <div class="discord-table-cell">
            ${discordCell}
          </div>
        </td>
        <td class="col-discord-id" data-label="ID Discord">${discordIdCell}</td>
        <td class="col-date" data-label="Inscrit"><span class="user-date-cell">${date}</span></td>
        <td class="col-actions" data-label="Actions">
          <div class="user-actions-cell">
            <button type="button" class="btn-action-view view-user-btn">Consulter</button>
            <button type="button" class="btn-action-delete delete-user-btn">Supprimer</button>
          </div>
        </td>
      `;
      renderAvatarInto(tr.querySelector(".user-row-avatar"), email, discord, { initialLength: 2 });
      bindCopyButton(tr, ".copy-email", email !== "—" ? email : "");
      bindCopyButton(tr, ".copy-discord-name", discord.linked ? (discord.username || discord.id || "") : "");
      bindCopyButton(tr, ".copy-discord-id", discord.id || "");
      tr.querySelector(".view-user-btn")?.addEventListener("click", () => window.viewUserDetail(user.email));
      tr.querySelector(".delete-user-btn")?.addEventListener("click", () => window.deleteUser(user.email));
      tbody.appendChild(tr);
    });
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
    const planPill = document.getElementById("detail-plan-pill");
    const planLabelEl = document.getElementById("detail-plan-label");
    const planStatusEl = document.getElementById("detail-plan-status");
    const roleSelect = document.getElementById("detail-role");
    const modeSelect = document.getElementById("detail-mode");
    const discord = discordOf(user);
    const discordName = document.getElementById("detail-discord-name");
    const discordId = document.getElementById("detail-discord-id");
    const discordIdValue = document.getElementById("detail-discord-id-value");
    const discordIdEmpty = document.getElementById("detail-discord-id-empty");
    const syncDiscordBtn = document.getElementById("sync-discord-btn");
    const discordFeedback = document.getElementById("discord-sync-feedback");
    const plan = user.subscription_tier || user.plan || "free";
    const planStatus = user.subscription_status || user.license_status || "";
    const planStatusLabel = subscriptionStatusLabelOf(planStatus);

    const bindDetailCopy = (el, value) => {
      if (!el) return;
      if (!value) {
        el.onclick = null;
        el.disabled = true;
        return;
      }
      el.disabled = false;
      el.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        void copyTextToClipboard(value, el);
      };
    };

    renderDetailAvatar(avatar, email, discord);
    if (emailLabel) emailLabel.textContent = email;
    bindDetailCopy(emailLabel, email);
    if (rolePill) {
      rolePill.textContent = roleLabelOf(user.role);
      rolePill.className = `role-pill ${user.role}`;
    }
    if (planPill) {
      planPill.className = `plan-pill ${planClassOf(plan)}${planStatus ? ` is-${String(planStatus).toLowerCase()}` : ""}`;
    }
    if (planLabelEl) planLabelEl.textContent = planLabelOf(plan);
    if (planStatusEl) {
      const showStatus = Boolean(planStatusLabel) && !["active", "trialing"].includes(String(planStatus).toLowerCase());
      planStatusEl.hidden = !showStatus;
      planStatusEl.textContent = showStatus ? planStatusLabel : "";
    }

    const subPlanSelect = document.getElementById("detail-sub-plan");
    const subStatusSelect = document.getElementById("detail-sub-status");
    const subDevicesInput = document.getElementById("detail-sub-devices");
    const subExpiresInput = document.getElementById("detail-sub-expires");
    const saveSubscriptionBtn = document.getElementById("save-subscription-btn");
    if (subPlanSelect) subPlanSelect.value = licensePlanFromUser(user);
    if (subStatusSelect) subStatusSelect.value = licenseStatusFromUser(user);
    if (subDevicesInput) subDevicesInput.value = String(Math.max(1, Number(user.device_limit || 1)));
    if (subExpiresInput) subExpiresInput.value = toDatetimeLocalValue(user.expires_at);

    const syncDetailPlanPill = (nextPlan, nextStatus) => {
      const tier = nextPlan === "studio" || nextPlan === "lifetime"
        ? "premium"
        : (nextPlan === "pro" ? "pro" : "free");
      const displayTier = ["active", "trialing"].includes(nextStatus) ? tier : "free";
      const statusLabel = subscriptionStatusLabelOf(nextStatus);
      if (planPill) {
        planPill.className = `plan-pill ${planClassOf(displayTier)}${nextStatus ? ` is-${String(nextStatus).toLowerCase()}` : ""}`;
      }
      if (planLabelEl) planLabelEl.textContent = planLabelOf(displayTier);
      if (planStatusEl) {
        const showStatus = Boolean(statusLabel) && !["active", "trialing"].includes(String(nextStatus).toLowerCase());
        planStatusEl.hidden = !showStatus;
        planStatusEl.textContent = showStatus ? statusLabel : "";
      }
    };

    if (saveSubscriptionBtn) {
      saveSubscriptionBtn.onclick = async () => {
        const nextPlan = subPlanSelect?.value || "free";
        const nextStatus = subStatusSelect?.value || "active";
        const deviceLimit = Math.max(1, Math.min(25, Number(subDevicesInput?.value || 1)));
        const expiresRaw = subExpiresInput?.value || "";
        saveSubscriptionBtn.disabled = true;
        saveSubscriptionBtn.textContent = "Enregistrement…";
        try {
          await adminRequest("license-upsert", {
            email,
            plan: nextPlan,
            status: nextStatus,
            deviceLimit,
            expiresAt: expiresRaw ? new Date(expiresRaw).toISOString() : null,
          });
          syncDetailPlanPill(nextPlan, nextStatus);
          addLog("s", `Abonnement mis à jour : ${email} → ${planLabelOf(nextPlan)} (${subscriptionStatusLabelOf(nextStatus) || nextStatus})`);
          await refreshUsers();
        } catch (reason) {
          addLog("e", String(reason).replace(/^Error:\s*/i, ""));
        } finally {
          saveSubscriptionBtn.disabled = false;
          saveSubscriptionBtn.textContent = "Enregistrer l’abonnement";
        }
      };
    }

    if (roleSelect) roleSelect.value = user.role;
    if (modeSelect) modeSelect.value = user.write_mode;
    if (discordName) {
      discordName.textContent = discord.linked
        ? (discord.username ? `@${discord.username}` : "Compte lié")
        : "Non lié";
      discordName.classList.toggle("is-empty", !discord.linked);
    }
    bindDetailCopy(discordName, discord.linked ? (discord.username || discord.id || "") : "");
    if (discordId) {
      if (discord.linked && discord.id) {
        discordId.hidden = false;
        discordId.title = `Copier l'ID Discord (${discord.id})`;
        if (discordIdValue) {
          discordIdValue.hidden = false;
          discordIdValue.textContent = discord.id;
        }
        bindDetailCopy(discordId, discord.id);
      } else {
        discordId.hidden = true;
        discordId.title = "Copier l'ID Discord";
        if (discordIdValue) discordIdValue.textContent = "—";
        discordId.onclick = null;
      }
    }
    if (discordIdEmpty) discordIdEmpty.hidden = true;
    if (discordFeedback) {
      discordFeedback.hidden = true;
      discordFeedback.textContent = "";
      discordFeedback.classList.remove("is-error");
    }
    if (syncDiscordBtn) {
      syncDiscordBtn.hidden = !discord.linked;
      syncDiscordBtn.disabled = false;
      syncDiscordBtn.textContent = "Synchroniser";
      syncDiscordBtn.onclick = async () => {
        syncDiscordBtn.disabled = true;
        syncDiscordBtn.textContent = "Synchronisation…";
        if (discordFeedback) discordFeedback.hidden = true;
        try {
          const result = await adminRequest("discord-sync", { email });
          if (discordFeedback) {
            discordFeedback.hidden = false;
            discordFeedback.textContent = `Rôle Discord synchronisé avec l'offre ${result.tier || "free"}.`;
            discordFeedback.classList.remove("is-error");
          }
          addLog("s", `Discord synchronisé : ${email}`);
          await refreshUsers();
        } catch (reason) {
          const message = String(reason).replace(/^Error:\s*/i, "");
          if (discordFeedback) {
            discordFeedback.hidden = false;
            discordFeedback.textContent = message;
            discordFeedback.classList.add("is-error");
          }
          addLog("e", `Synchronisation Discord impossible : ${message}`);
        } finally {
          syncDiscordBtn.disabled = false;
          syncDiscordBtn.textContent = "Synchroniser";
        }
      };
    }

    const permissionInputs = [...document.querySelectorAll("#panel-user-detail [data-app-permission]")];
    const storedPermissions = user.app_permissions || {};
    const permCountEl = document.getElementById("perm-count");
    const updatePermCount = () => {
      if (!permCountEl) return;
      const on = permissionInputs.filter((input) => input.checked).length;
      permCountEl.textContent = `${on} / ${permissionInputs.length}`;
    };
    permissionInputs.forEach((input) => {
      input.checked = storedPermissions[input.dataset.appPermission] !== false;
    });
    updatePermCount();

    const readAppPermissions = () => Object.fromEntries(
      permissionInputs.map((input) => [input.dataset.appPermission, input.checked])
    );

    const baseline = {
      role: String(user.role || "membre"),
      writeMode: String(user.write_mode || "direct"),
      permissions: readAppPermissions(),
    };

    const saveBtn = document.getElementById("save-detail-btn");
    const isDetailDirty = () => {
      if (!roleSelect || !modeSelect) return false;
      if (roleSelect.value !== baseline.role || modeSelect.value !== baseline.writeMode) return true;
      return permissionInputs.some((input) => {
        const key = input.dataset.appPermission;
        return Boolean(input.checked) !== Boolean(baseline.permissions[key]);
      });
    };
    const syncDetailDirty = () => {
      if (!saveBtn) return;
      const dirty = isDetailDirty();
      saveBtn.disabled = !dirty;
      saveBtn.classList.toggle("is-idle", !dirty);
      saveBtn.textContent = dirty ? "Enregistrer" : "Enregistré";
    };

    permissionInputs.forEach((input) => {
      input.onchange = () => {
        updatePermCount();
        syncDetailDirty();
      };
    });
    if (roleSelect) roleSelect.onchange = syncDetailDirty;
    if (modeSelect) modeSelect.onchange = syncDetailDirty;

    const permAllOn = document.getElementById("perm-all-on");
    const permAllOff = document.getElementById("perm-all-off");
    if (permAllOn) {
      permAllOn.onclick = () => {
        permissionInputs.forEach((input) => { input.checked = true; });
        updatePermCount();
        syncDetailDirty();
      };
    }
    if (permAllOff) {
      permAllOff.onclick = () => {
        permissionInputs.forEach((input) => { input.checked = false; });
        updatePermCount();
        syncDetailDirty();
      };
    }

    syncDetailDirty();

    const detailLogs = document.getElementById("detail-logs");
    const activityCountEl = document.getElementById("detail-activity-count");
    const setActivityCount = (n, loading = false) => {
      if (!activityCountEl) return;
      if (loading) {
        activityCountEl.textContent = "…";
        return;
      }
      activityCountEl.textContent = n === 1 ? "1 événement" : `${n} événements`;
    };

    if (detailLogs) {
      setActivityCount(0, true);
      detailLogs.innerHTML = `<div class="user-activity-empty">Chargement de l'activité…</div>`;

      void (async () => {
        const memberCtx = { memberEmail: email, memberUserId: user.user_id || "" };
        try {
          const auditData = await adminRequest("audit-list");
          const userLogs = (auditData.rows || []).filter((row) =>
            (row.actor_email && row.actor_email.toLowerCase() === email.toLowerCase())
            || (row.target_id && user.user_id && row.target_id === user.user_id)
            || (row.metadata && row.metadata.email && String(row.metadata.email).toLowerCase() === email.toLowerCase())
          );

          const events = userLogs.map((row) => ({ ...row }));
          const hasCreateLog = events.some((row) => row.action === "user.create");
          if (user.created_at && !hasCreateLog) {
            events.push({
              created_at: user.created_at,
              action: "user.create",
              actor_email: "system",
              target_type: "user",
              target_id: user.user_id || null,
            });
          }

          events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          if (!events.length) {
            setActivityCount(0);
            detailLogs.innerHTML = `<div class="user-activity-empty">Aucun événement pour ce membre.</div>`;
            return;
          }

          setActivityCount(events.length);
          detailLogs.innerHTML = events.map((row) => renderUserActivityRow(row, memberCtx)).join("");
        } catch (err) {
          setActivityCount(user.created_at ? 1 : 0);
          detailLogs.innerHTML = `
            ${user.created_at ? renderUserActivityRow({
              created_at: user.created_at,
              action: "user.create",
              actor_email: "system",
              target_type: "user",
              target_id: user.user_id || null,
            }, memberCtx) : ""}
            <div class="user-activity-error">Impossible de charger l'activité : ${escapeHtml(err.message)}</div>
          `;
        }
      })();
    }

    // Buttons actions
    const suspendBtn = document.getElementById("suspend-detail-btn");

    if (saveBtn) {
      saveBtn.onclick = async () => {
        if (saveBtn.disabled) return;
        const rVal = roleSelect.value;
        const mVal = modeSelect.value;
        addLog("i", `Enregistrement des modifications pour ${email}...`);
        saveBtn.disabled = true;
        saveBtn.textContent = "Enregistrement…";

        try {
          if (supabase) {
            await adminRequest("update", { email, role: rVal, writeMode: mVal, appPermissions: readAppPermissions() });
          } else if (demoMode) {
            const mockStorage = sessionStorage.getItem("sr_mock_profiles");
            const mockUsers = mockStorage ? JSON.parse(mockStorage) : [];
            const idx = mockUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
            if (idx >= 0) Object.assign(mockUsers[idx], { role: rVal, write_mode: mVal, app_permissions: readAppPermissions() });
            else mockUsers.push({ email, role: rVal, write_mode: mVal, app_permissions: readAppPermissions(), created_at: new Date().toISOString() });
            sessionStorage.setItem("sr_mock_profiles", JSON.stringify(mockUsers));
          } else {
            throw new Error("Service administrateur non configuré.");
          }
          addLog("s", `Compte mis à jour avec succès : ${email}`);
          await refreshUsers();
          showPanel("users");
        } catch (reason) {
          addLog("e", String(reason).replace(/^Error:\s*/i, ""));
          syncDetailDirty();
        }
      };
    }

    if (suspendBtn) {
      suspendBtn.onclick = () => {
        if (roleSelect) {
          roleSelect.value = "suspendu";
          syncDetailDirty();
          if (saveBtn && !saveBtn.disabled) saveBtn.click();
        }
      };
    }

    const sensitiveOutput = document.getElementById("user-sensitive-output");
    if (sensitiveOutput) {
      sensitiveOutput.hidden = true;
      sensitiveOutput.innerHTML = "";
      sensitiveOutput.classList.remove("has-devices");
    }
    document.getElementById("reset-password-btn").onclick = async () => {
      try {
        await adminRequest("reset-password", { email });
        if (sensitiveOutput) {
          sensitiveOutput.hidden = true;
          sensitiveOutput.innerHTML = "";
        }
        addLog("s", `E-mail de récupération envoyé à ${email}.`);
      } catch (reason) { addLog("e", String(reason)); }
    };
    const confirmEmailBtn = document.getElementById("confirm-email-btn");
    const emailConfirmed = Boolean(user.confirmed);
    confirmEmailBtn.disabled = emailConfirmed;
    confirmEmailBtn.textContent = emailConfirmed ? "Confirmé" : "Confirmer";
    confirmEmailBtn.classList.toggle("is-status", emailConfirmed);
    confirmEmailBtn.onclick = async () => {
      try { await adminRequest("confirm-email", { email }); addLog("s", `Email confirmé : ${email}`); await refreshUsers(); }
      catch (reason) { addLog("e", String(reason)); }
    };
    const toggleBanBtn = document.getElementById("toggle-ban-btn");
    let banned = Boolean(user.banned_until && new Date(user.banned_until) > new Date());
    const syncBanButton = () => {
      toggleBanBtn.textContent = banned ? "Débannir" : "Bannir";
      toggleBanBtn.classList.toggle("is-danger", !banned);
      toggleBanBtn.classList.toggle("is-safe", banned);
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
          sensitiveOutput.classList.add("has-devices");
          sensitiveOutput.innerHTML = result.rows.length
            ? result.rows.map((row) => `<div class="device-row"><span>${escapeHtml(row.device_name || "Appareil")}</span><small>${escapeHtml(row.app_version || "version inconnue")} · ${formatDate(row.last_seen_at)}</small>${row.revoked ? '<em>Révoqué</em>' : `<button type="button" class="btn btn-ghost btn-sm" data-revoke-device="${escapeHtml(row.id)}">Révoquer</button>`}</div>`).join("")
            : '<div class="devices-empty">Aucun appareil activé.</div>';
          sensitiveOutput.querySelectorAll("[data-revoke-device]").forEach((button) => button.addEventListener("click", async () => { await adminRequest("device-revoke", { id: button.dataset.revokeDevice }); document.getElementById("show-devices-btn").click(); }));
        }
      } catch (reason) { addLog("e", String(reason)); }
    };
  };

  // Delete user action — requires typing the email to confirm
  let pendingDeleteEmail = null;

  function closeUserDeleteModal() {
    const modal = document.getElementById("user-delete-modal");
    const input = document.getElementById("user-delete-email-input");
    const error = document.getElementById("user-delete-error");
    const confirmBtn = document.getElementById("user-delete-confirm-btn");
    pendingDeleteEmail = null;
    if (modal) modal.hidden = true;
    if (input) input.value = "";
    if (error) error.hidden = true;
    if (confirmBtn) confirmBtn.disabled = true;
  }

  function syncUserDeleteConfirmState() {
    const input = document.getElementById("user-delete-email-input");
    const error = document.getElementById("user-delete-error");
    const confirmBtn = document.getElementById("user-delete-confirm-btn");
    if (!input || !confirmBtn || !pendingDeleteEmail) return;
    const matches = input.value.trim().toLowerCase() === pendingDeleteEmail.toLowerCase();
    confirmBtn.disabled = !matches;
    if (error) error.hidden = !input.value.trim() || matches;
  }

  function openUserDeleteModal(email) {
    const modal = document.getElementById("user-delete-modal");
    const label = document.getElementById("user-delete-email-label");
    const input = document.getElementById("user-delete-email-input");
    const error = document.getElementById("user-delete-error");
    const confirmBtn = document.getElementById("user-delete-confirm-btn");
    if (!modal || !input || !confirmBtn) return;
    pendingDeleteEmail = email;
    if (label) label.textContent = email;
    input.value = "";
    if (error) error.hidden = true;
    confirmBtn.disabled = true;
    modal.hidden = false;
    window.setTimeout(() => input.focus(), 30);
  }

  async function performUserDelete(email) {
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
      closeUserDeleteModal();
      await refreshUsers();
    } catch (reason) {
      addLog("e", String(reason).replace(/^Error:\s*/i, ""));
    }
  }

  window.deleteUser = (email) => {
    openUserDeleteModal(email);
  };

  document.getElementById("user-delete-email-input")?.addEventListener("input", syncUserDeleteConfirmState);
  document.getElementById("user-delete-email-input")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const confirmBtn = document.getElementById("user-delete-confirm-btn");
      if (confirmBtn && !confirmBtn.disabled && pendingDeleteEmail) {
        void performUserDelete(pendingDeleteEmail);
      }
    }
    if (event.key === "Escape") closeUserDeleteModal();
  });
  document.getElementById("user-delete-confirm-btn")?.addEventListener("click", () => {
    if (!pendingDeleteEmail) return;
    const input = document.getElementById("user-delete-email-input");
    if (!input || input.value.trim().toLowerCase() !== pendingDeleteEmail.toLowerCase()) {
      syncUserDeleteConfirmState();
      return;
    }
    void performUserDelete(pendingDeleteEmail);
  });
  document.querySelectorAll("[data-delete-cancel]").forEach((el) => {
    el.addEventListener("click", closeUserDeleteModal);
  });
  document.addEventListener("keydown", (event) => {
    const modal = document.getElementById("user-delete-modal");
    if (event.key === "Escape" && modal && !modal.hidden) closeUserDeleteModal();
  });

  // Account creation is delegated to the protected server-side Edge Function.
  function setUsersCreatePanelOpen(open) {
    const panel = document.getElementById("users-create-panel");
    const toggle = document.getElementById("users-create-toggle");
    if (!panel || !toggle) return;
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      document.getElementById("manage-email")?.focus();
    }
  }

  document.getElementById("users-create-toggle")?.addEventListener("click", () => {
    const panel = document.getElementById("users-create-panel");
    setUsersCreatePanelOpen(Boolean(panel?.hidden));
  });

  document.getElementById("users-create-close")?.addEventListener("click", () => {
    setUsersCreatePanelOpen(false);
  });

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
      setUsersCreatePanelOpen(false);
      await refreshUsers();
    } catch (reason) {
      const errMsg = String(reason).replace(/^Error:\s*/i, "");
      addLog("e", errMsg);
      alert("Erreur lors de la création : " + errMsg);
    }
  });

  // Search input handler
  document.getElementById("users-search")?.addEventListener("input", renderUsersFromFilters);

  document.getElementById("users-filters-trigger")?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeSubsMenus();
    closeCouponsMenus();
    toggleUsersMenu("users-filters-menu", "users-filters-trigger");
  });
  document.getElementById("users-sort-trigger")?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeSubsMenus();
    closeCouponsMenus();
    toggleUsersMenu("users-sort-menu", "users-sort-trigger");
  });

  document.getElementById("users-filters-menu")?.addEventListener("click", (event) => {
    const item = event.target.closest(".users-menu-item[data-filter-key]");
    if (!item) return;
    event.stopPropagation();
    const key = item.dataset.filterKey;
    usersFilterState[key] = item.dataset.filterValue ?? "";
    renderUsersFromFilters();
  });

  document.getElementById("users-sort-menu")?.addEventListener("click", (event) => {
    const item = event.target.closest(".users-menu-item[data-sort]");
    if (!item) return;
    event.stopPropagation();
    usersFilterState.sort = item.dataset.sort || "created_desc";
    closeUsersMenus();
    renderUsersFromFilters();
  });

  document.getElementById("users-filters-reset")?.addEventListener("click", (event) => {
    event.stopPropagation();
    resetUsersFilters();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".users-menu")) {
      closeUsersMenus();
      closeSubsMenus();
      closeCouponsMenus();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeUsersMenus();
      closeSubsMenus();
      closeCouponsMenus();
    }
  });

  syncUsersMenusUI();

  document.getElementById("subs-search")?.addEventListener("input", renderSubscriptionsFromFilters);
  document.getElementById("refresh-subs-btn")?.addEventListener("click", loadSubscriptions);
  document.getElementById("subs-filters-trigger")?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeUsersMenus();
    toggleSubsMenu("subs-filters-menu", "subs-filters-trigger");
  });
  document.getElementById("subs-sort-trigger")?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeUsersMenus();
    toggleSubsMenu("subs-sort-menu", "subs-sort-trigger");
  });
  document.getElementById("subs-filters-menu")?.addEventListener("click", (event) => {
    const item = event.target.closest(".users-menu-item[data-subs-filter-key]");
    if (!item) return;
    event.stopPropagation();
    const key = item.dataset.subsFilterKey;
    subsFilterState[key] = item.dataset.subsFilterValue ?? "";
    renderSubscriptionsFromFilters();
  });
  document.getElementById("subs-sort-menu")?.addEventListener("click", (event) => {
    const item = event.target.closest(".users-menu-item[data-subs-sort]");
    if (!item) return;
    event.stopPropagation();
    subsFilterState.sort = item.dataset.subsSort || "plan_asc";
    closeSubsMenus();
    renderSubscriptionsFromFilters();
  });
  document.getElementById("subs-filters-reset")?.addEventListener("click", (event) => {
    event.stopPropagation();
    resetSubsFilters();
  });
  syncSubsMenusUI();

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
    } catch (reason) {
      addLog("e", String(reason));
    }
  }

  function formatActivityShortTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    const day = date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return `${day} · ${time}`;
  }

  function formatActivityAction(row) {
    const act = String(row.action || "");
    let label = act.replace(/[._]/g, " ");
    let letter = "A";
    let cls = "audit";
    let tone = "update";

    const map = {
      "user.create": "Compte créé",
      "user.update": "Profil mis à jour",
      "user.delete": "Compte supprimé",
      "user.ban": "Compte banni",
      "user.unban": "Compte débanni",
      "user.confirm_email": "E-mail confirmé",
      "user.password_recovery": "E-mail de récupération envoyé",
      "discord.sync": "Discord synchronisé",
      "device.revoke": "Appareil révoqué",
      "license.upsert": "Licence mise à jour",
      "team.upsert": "Accès équipe modifié",
      "team.delete": "Accès équipe retiré",
      "support.reply": "Réponse au ticket",
      "support.close": "Ticket clôturé",
      "support.update": "Ticket mis à jour",
      "support.delete": "Ticket supprimé",
      "contact.update": "Message contact mis à jour",
      "contact.delete": "Message contact supprimé",
      "release.upsert": "Release publiée",
      "library.create": "Texture bibliothèque ajoutée",
      "library.update": "Texture bibliothèque mise à jour",
      "library.delete": "Texture bibliothèque supprimée",
      "library.upload": "Fichier bibliothèque uploadé",
      "app.boot": "Démarrage application",
    };

    if (map[act]) label = map[act];

    if (act.startsWith("user.")) {
      letter = "U";
      cls = "user";
    } else if (act.startsWith("license.")) {
      letter = "L";
      cls = "license";
    } else if (act.startsWith("support.") || act.startsWith("contact.")) {
      letter = "S";
      cls = "support";
    } else if (act.startsWith("release.") || act.startsWith("library.")) {
      letter = "R";
      cls = "release";
    } else if (act.startsWith("discord.") || act.startsWith("device.")) {
      letter = "D";
      cls = "user";
    }

    if (/delete|ban$|revoke|suspend/.test(act)) tone = "danger";
    else if (/create|confirm|upsert|upload|unban|recovery|sync|boot/.test(act)) tone = "create";
    else tone = "update";

    return { label, letter, cls, tone };
  }

  function renderUserActivityRow(row, { memberEmail = "", memberUserId = "" } = {}) {
    const details = formatActivityAction(row);
    const time = formatActivityShortTime(row.created_at);
    const actor = String(row.actor_email || "").trim();
    const isSelfActor = actor && memberEmail && actor.toLowerCase() === memberEmail.toLowerCase();
    const meta = actor && !isSelfActor && actor !== "system"
      ? `par ${actor}`
      : (actor === "system" ? "système" : "");

    let chip = "";
    const targetId = row.target_id ? String(row.target_id) : "";
    const isMemberTarget = Boolean(
      targetId
      && memberUserId
      && targetId === String(memberUserId)
    );
    if (targetId && !isMemberTarget && row.target_type && row.target_type !== "user") {
      chip = `${row.target_type} · ${targetId.slice(0, 8)}`;
    } else if (targetId && !isMemberTarget) {
      chip = targetId.slice(0, 8);
    }

    return `<div class="user-activity-row is-${details.tone}">
      <span class="user-activity-time">${escapeHtml(time)}</span>
      <span class="user-activity-body">
        <span class="user-activity-dot" aria-hidden="true"></span>
        <span class="user-activity-main">
          <strong>${escapeHtml(details.label)}</strong>
          ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
        </span>
        ${chip ? `<code class="user-activity-chip" title="${escapeHtml(targetId)}">${escapeHtml(chip)}</code>` : ""}
      </span>
    </div>`;
  }

  function activityCategoryOf(action) {
    const act = String(action || "");
    if (act.startsWith("user.") || act.startsWith("discord.") || act.startsWith("device.") || act.startsWith("team.")) return "user";
    if (act.startsWith("support.") || act.startsWith("contact.")) return "support";
    if (act.startsWith("license.") || act.startsWith("subscription.")) return "license";
    if (act.startsWith("release.") || act.startsWith("library.")) return "release";
    return "system";
  }

  function syncActivityCounts(filteredCount) {
    const countEl = document.getElementById("activity-count");
    const labelEl = document.getElementById("activity-count-label");
    const total = currentActivityRows.length;
    const showingFiltered = typeof filteredCount === "number" && (activityFilter !== "all" || activitySearch);
    if (countEl) countEl.textContent = showingFiltered ? `${filteredCount}` : String(total || "—");
    if (labelEl) {
      if (showingFiltered) labelEl.textContent = `sur ${total}`;
      else labelEl.textContent = total === 1 ? "événement" : "événements";
    }
  }

  function renderActivityFeed() {
    const feed = document.getElementById("activity-feed");
    if (!feed) return;

    let filtered = currentActivityRows;
    if (activityFilter !== "all") {
      filtered = filtered.filter((row) => activityCategoryOf(row.action) === activityFilter);
    }
    if (activitySearch) {
      filtered = filtered.filter((row) => {
        const details = formatActivityAction(row);
        const hay = [
          details.label,
          row.action,
          row.actor_email,
          row.target_type,
          row.target_id,
        ].map((v) => String(v || "").toLowerCase()).join(" ");
        return hay.includes(activitySearch);
      });
    }

    syncActivityCounts(filtered.length);

    feed.innerHTML = filtered.length
      ? filtered.map((row) => {
          const details = formatActivityAction(row);
          const actor = String(row.actor_email || "système").trim() || "système";
          const targetId = row.target_id ? String(row.target_id) : "";
          const chip = targetId
            ? `${row.target_type || "cible"} · ${targetId.slice(0, 8)}`
            : (row.target_type ? String(row.target_type) : "");
          return `
            <div class="activity-feed-row is-${details.tone}">
              <span class="activity-feed-time">${escapeHtml(formatActivityShortTime(row.created_at))}</span>
              <span class="activity-feed-body">
                <span class="activity-feed-dot" aria-hidden="true"></span>
                <span class="activity-feed-main">
                  <strong>${escapeHtml(details.label)}</strong>
                  <small>${escapeHtml(actor)}</small>
                </span>
                ${chip ? `<code class="activity-feed-chip" title="${escapeHtml(targetId || row.target_type || "")}">${escapeHtml(chip)}</code>` : ""}
              </span>
            </div>
          `;
        }).join("")
      : '<div class="empty-state">Aucun événement correspondant.</div>';
  }

  async function loadActivity() {
    const feed = document.getElementById("activity-feed");
    if (!feed) return;
    feed.innerHTML = '<div class="empty-state">Chargement…</div>';
    try {
      const data = await adminRequest("dashboard");
      currentActivityRows = data.recentAudit || [];
      renderActivityFeed();
    } catch (reason) {
      feed.innerHTML = `<div class="empty-state">${escapeHtml(String(reason))}</div>`;
      syncActivityCounts(0);
    }
  }

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

  function ticketStatusLabel(status) {
    if (status === "open") return "Ouvert";
    if (status === "pending") return "Réponse";
    return "Clos";
  }

  function syncSupportCounts(filteredCount) {
    const countEl = document.getElementById("support-count");
    const labelEl = document.getElementById("support-count-label");
    const openChip = document.getElementById("support-open-chip");
    const openCountEl = document.getElementById("support-open-count");
    const total = currentTickets.length;
    const openCount = currentTickets.filter((t) => t.status === "open" || t.status === "pending").length;
    const showingFiltered = typeof filteredCount === "number" && (ticketFilter !== "all" || ticketSearch);

    if (countEl) countEl.textContent = showingFiltered ? `${filteredCount}` : String(total || "—");
    if (labelEl) {
      if (showingFiltered) labelEl.textContent = `sur ${total}`;
      else labelEl.textContent = total === 1 ? "ticket" : "tickets";
    }
    if (openCountEl) openCountEl.textContent = String(openCount);
    if (openChip) openChip.hidden = openCount === 0;
  }

  function setSupportComposerVisible(visible) {
    const actionsContainer = document.getElementById("support-chat-actions");
    const chatForm = document.getElementById("support-chat-form");
    if (actionsContainer) actionsContainer.hidden = !visible;
    if (chatForm) chatForm.hidden = !visible;
  }

  function clearSupportSelection() {
    activeTicketId = null;
    if (activeTicketSubscription) {
      supabase?.removeChannel(activeTicketSubscription);
      activeTicketSubscription = null;
    }
    const emptyState = document.getElementById("chat-empty-state");
    const viewport = document.getElementById("chat-viewport");
    const deleteBtn = document.getElementById("support-delete-btn");
    if (emptyState) emptyState.hidden = false;
    if (viewport) viewport.hidden = true;
    if (deleteBtn) deleteBtn.hidden = true;
    setSupportComposerVisible(false);
    document.querySelectorAll("#support-list .ticket-list-item.is-active").forEach((el) => {
      el.classList.remove("is-active");
    });
  }

  function ticketDiscordOf(ticket) {
    const email = String(ticket?.email || "").toLowerCase();
    const cached = email
      ? discordOf(usersCache.find((u) => String(u.email || "").toLowerCase() === email))
      : { linked: false, username: null, id: null, avatarUrl: null };
    const fromTicket = ticket?.discord;
    if (fromTicket && typeof fromTicket === "object" && (fromTicket.linked || fromTicket.username || fromTicket.id)) {
      const avatarCandidate = typeof fromTicket.avatarUrl === "string" ? fromTicket.avatarUrl.trim() : "";
      const avatarUrl = /^https:\/\/cdn\.discordapp\.com\/(?:avatars|embed\/avatars)\//i.test(avatarCandidate)
        ? avatarCandidate
        : cached.avatarUrl;
      return {
        linked: true,
        username: (typeof fromTicket.username === "string" && fromTicket.username.trim())
          ? fromTicket.username.trim()
          : cached.username,
        id: (typeof fromTicket.id === "string" && fromTicket.id.trim()) ? fromTicket.id.trim() : cached.id,
        avatarUrl,
      };
    }
    return cached;
  }

  function ticketAppLabel(ticket) {
    const version = ticket?.app_version || ticket?.appVersion || null;
    if (version) return `App ${version}`;
    return "App";
  }

  function bindSupportProfile(email, ticket = null) {
    const metaEl = document.getElementById("support-chat-meta");
    const profileBtn = document.getElementById("support-open-profile-btn");
    const discordEl = document.getElementById("support-chat-discord");
    const appEl = document.getElementById("support-chat-app");
    const hasEmail = Boolean(email && email.trim());
    const discord = ticketDiscordOf(ticket || { email });
    const appLabel = ticketAppLabel(ticket || {});

    if (metaEl) {
      metaEl.textContent = hasEmail ? email : "—";
      metaEl.disabled = !hasEmail;
      metaEl.onclick = hasEmail ? () => window.viewUserDetail(email) : null;
    }
    if (profileBtn) {
      profileBtn.hidden = !hasEmail;
      profileBtn.onclick = hasEmail ? () => window.viewUserDetail(email) : null;
    }
    if (discordEl) {
      if (discord.linked && (discord.username || discord.id)) {
        discordEl.hidden = false;
        discordEl.textContent = discord.username ? `@${discord.username}` : `ID ${discord.id}`;
        discordEl.title = discord.id ? `Discord · ${discord.id}` : "Discord";
      } else {
        discordEl.hidden = true;
        discordEl.textContent = "";
      }
    }
    if (appEl) {
      appEl.hidden = false;
      appEl.textContent = appLabel;
    }
  }

  async function selectTicket(ticket) {
    activeTicketId = ticket.id;

    if (activeTicketSubscription) {
      supabase.removeChannel(activeTicketSubscription);
      activeTicketSubscription = null;
    }

    const emptyState = document.getElementById("chat-empty-state");
    const viewport = document.getElementById("chat-viewport");
    if (emptyState) emptyState.hidden = true;
    if (viewport) viewport.hidden = false;

    const subjectEl = document.getElementById("support-chat-subject");
    const avatarEl = document.getElementById("support-avatar");
    const statusPill = document.getElementById("support-status-pill");

    if (subjectEl) subjectEl.textContent = ticket.subject;
    bindSupportProfile(ticket.email, ticket);
    renderAvatarInto(avatarEl, ticket.email, ticketDiscordOf(ticket), { initialLength: 2 });
    if (statusPill) {
      statusPill.textContent = ticketStatusLabel(ticket.status);
      statusPill.className = `support-status-pill is-${ticket.status === "closed" || ticket.status === "clos" ? "closed" : ticket.status === "pending" ? "pending" : "open"}`;
    }

    setSupportComposerVisible(ticket.status !== "closed" && ticket.status !== "clos");
    const deleteBtn = document.getElementById("support-delete-btn");
    if (deleteBtn) deleteBtn.hidden = false;

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
            bindSupportProfile(updated.email, { ...ticket, ...updated });
            const statusPillLive = document.getElementById("support-status-pill");
            if (statusPillLive) {
              statusPillLive.textContent = ticketStatusLabel(updated.status);
              statusPillLive.className = `support-status-pill is-${updated.status === "closed" || updated.status === "clos" ? "closed" : updated.status === "pending" ? "pending" : "open"}`;
            }
            if (updated.status === "closed" || updated.status === "clos") {
              setSupportComposerVisible(false);
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

    if (ticketFilter === "open") {
      filtered = filtered.filter((t) => t.status === "open" || t.status === "pending");
    } else if (ticketFilter === "closed") {
      filtered = filtered.filter((t) => t.status === "closed" || t.status === "clos");
    }

    if (ticketSearch) {
      filtered = filtered.filter((t) => {
        const discord = ticketDiscordOf(t);
        const hay = [
          t.email,
          t.subject,
          discord.username,
          discord.id,
          t.app_version,
          ticketAppLabel(t),
        ].map((v) => String(v || "").toLowerCase()).join(" ");
        return hay.includes(ticketSearch);
      });
    }

    syncSupportCounts(filtered.length);

    list.innerHTML = filtered.length ? filtered.map((row) => {
      const messages = row.support_messages || [];
      const last = messages.at(-1);
      const when = formatActivityShortTime(last?.created_at || row.updated_at || row.created_at);
      const isActive = row.id === activeTicketId;
      const statusClass = row.status === "closed" || row.status === "clos" ? "closed" : row.status === "pending" ? "pending" : "open";
      const discord = ticketDiscordOf(row);
      const discordLabel = discord.linked
        ? (discord.username ? `@${discord.username}` : (discord.id ? `ID ${discord.id}` : "Discord"))
        : "";
      const appLabel = ticketAppLabel(row);
      const initials = initialsFromEmail(row.email || "?", 2);
      const avatarHtml = discord.avatarUrl
        ? `<img class="ticket-avatar" src="${escapeHtml(discord.avatarUrl)}" alt="" referrerpolicy="no-referrer" />`
        : `<span class="ticket-avatar is-fallback" aria-hidden="true">${escapeHtml(initials)}</span>`;
      return `
        <button type="button" class="ticket-list-item ${isActive ? "is-active" : ""}" data-ticket-id="${escapeHtml(row.id)}">
          ${avatarHtml}
          <div class="ticket-main">
            <strong class="ticket-subject">${escapeHtml(row.subject || "Sans sujet")}</strong>
            <span class="ticket-email">${escapeHtml(row.email || "—")}</span>
            <div class="ticket-identity-row">
              ${discordLabel ? `<span class="ticket-discord-chip" title="${escapeHtml(discord.id || "Discord")}">${escapeHtml(discordLabel)}</span>` : ""}
              <span class="ticket-app-chip">${escapeHtml(appLabel)}</span>
            </div>
          </div>
          <div class="ticket-aside">
            <span class="support-status-pill is-${statusClass}">${escapeHtml(ticketStatusLabel(row.status))}</span>
            <span class="ticket-time">${escapeHtml(when)}</span>
          </div>
        </button>
      `;
    }).join("") : '<div class="empty-state">Aucun ticket correspondant.</div>';

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
      if (activeTicketId) {
        const stillThere = currentTickets.find((row) => row.id === activeTicketId);
        if (stillThere) selectTicket(stillThere);
      }
    } catch (reason) {
      list.innerHTML = `<div class="empty-state">${escapeHtml(String(reason))}</div>`;
      syncSupportCounts(0);
    }
  }

  function contactStatusLabel(status) {
    if (status === "new") return "Nouveau";
    if (status === "read") return "Lu";
    if (status === "archived") return "Archivé";
    return status || "—";
  }

  function syncContactsCounts(filteredCount) {
    const countEl = document.getElementById("contacts-count");
    const labelEl = document.getElementById("contacts-count-label");
    const newChip = document.getElementById("contacts-new-chip");
    const newCountEl = document.getElementById("contacts-new-count");
    const total = currentContacts.length;
    const newCount = currentContacts.filter((row) => row.status === "new").length;
    const showingFiltered = typeof filteredCount === "number" && (contactFilter !== "all" || contactSearch);

    if (countEl) countEl.textContent = showingFiltered ? `${filteredCount}` : String(total || "—");
    if (labelEl) {
      if (showingFiltered) labelEl.textContent = `sur ${total}`;
      else labelEl.textContent = total === 1 ? "message" : "messages";
    }
    if (newCountEl) newCountEl.textContent = String(newCount);
    if (newChip) newChip.hidden = newCount === 0;
  }

  function clearContactsSelection() {
    activeContactId = null;
    const emptyState = document.getElementById("contacts-empty-state");
    const viewport = document.getElementById("contacts-viewport");
    if (emptyState) emptyState.hidden = false;
    if (viewport) viewport.hidden = true;
    document.querySelectorAll("#contacts-list .contact-list-item.is-active").forEach((el) => {
      el.classList.remove("is-active");
    });
  }

  function selectContact(contact) {
    activeContactId = contact.id;
    const emptyState = document.getElementById("contacts-empty-state");
    const viewport = document.getElementById("contacts-viewport");
    if (emptyState) emptyState.hidden = true;
    if (viewport) viewport.hidden = false;

    const subjectEl = document.getElementById("contacts-detail-subject");
    const nameEl = document.getElementById("contacts-detail-name");
    const emailEl = document.getElementById("contacts-detail-email");
    const statusEl = document.getElementById("contacts-detail-status");
    const dateEl = document.getElementById("contacts-detail-date");
    const messageEl = document.getElementById("contacts-detail-message");
    const profileBtn = document.getElementById("contacts-open-profile-btn");
    const markReadBtn = document.getElementById("contacts-mark-read-btn");
    const archiveBtn = document.getElementById("contacts-archive-btn");

    if (subjectEl) subjectEl.textContent = contact.subject || "Sans sujet";
    if (nameEl) nameEl.textContent = contact.name || "Visiteur";
    if (emailEl) {
      emailEl.textContent = contact.email || "—";
      emailEl.onclick = contact.email
        ? () => void copyTextToClipboard(contact.email, emailEl)
        : null;
    }
    if (statusEl) {
      statusEl.textContent = contactStatusLabel(contact.status);
      statusEl.className = `contacts-status-pill is-${contact.status || "new"}`;
    }
    if (dateEl) dateEl.textContent = formatActivityShortTime(contact.created_at);
    if (messageEl) messageEl.textContent = contact.message || "";

    const knownUser = contact.email
      ? usersCache.find((u) => String(u.email || "").toLowerCase() === String(contact.email).toLowerCase())
      : null;
    if (profileBtn) {
      profileBtn.hidden = !contact.email;
      profileBtn.textContent = knownUser ? "Fiche" : "Fiche";
      profileBtn.onclick = contact.email ? () => window.viewUserDetail(contact.email) : null;
    }
    if (markReadBtn) markReadBtn.hidden = contact.status === "read" || contact.status === "archived";
    if (archiveBtn) archiveBtn.hidden = contact.status === "archived";
  }

  function renderContacts() {
    const list = document.getElementById("contacts-list");
    if (!list) return;

    let filtered = currentContacts;
    if (contactFilter === "new") filtered = filtered.filter((row) => row.status === "new");
    else if (contactFilter === "read") filtered = filtered.filter((row) => row.status === "read");
    else if (contactFilter === "archived") filtered = filtered.filter((row) => row.status === "archived");

    if (contactSearch) {
      filtered = filtered.filter((row) => {
        const hay = [row.email, row.name, row.subject, row.message]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");
        return hay.includes(contactSearch);
      });
    }

    syncContactsCounts(filtered.length);

    list.innerHTML = filtered.length ? filtered.map((row) => {
      const isActive = row.id === activeContactId;
      const statusClass = row.status || "new";
      const preview = row.message || "Aucun contenu";
      return `
        <button type="button" class="contact-list-item ${isActive ? "is-active" : ""} ${statusClass === "new" ? "is-unread" : ""}" data-contact-id="${escapeHtml(row.id)}">
          <div class="contact-main">
            <strong class="contact-subject">${escapeHtml(row.subject || "Sans sujet")}</strong>
            <span class="contact-from">${escapeHtml(row.name || "Visiteur")} · ${escapeHtml(row.email || "—")}</span>
            <p class="contact-preview">${escapeHtml(preview)}</p>
          </div>
          <div class="contact-aside">
            <span class="contacts-status-pill is-${statusClass}">${escapeHtml(contactStatusLabel(row.status))}</span>
            <span class="contact-time">${escapeHtml(formatActivityShortTime(row.created_at))}</span>
          </div>
        </button>
      `;
    }).join("") : '<div class="empty-state">Aucun message correspondant.</div>';

    list.querySelectorAll("[data-contact-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        list.querySelectorAll(".contact-list-item").forEach((other) => other.classList.remove("is-active"));
        btn.classList.add("is-active");
        const contact = currentContacts.find((row) => row.id === btn.dataset.contactId);
        if (contact) selectContact(contact);
      });
    });

    if (activeContactId) {
      const activeBtn = list.querySelector(`[data-contact-id="${activeContactId}"]`);
      if (activeBtn) activeBtn.classList.add("is-active");
    }
  }

  async function loadContacts() {
    const list = document.getElementById("contacts-list");
    if (!list) return;
    list.innerHTML = '<div class="empty-state">Chargement…</div>';
    try {
      const data = await adminRequest("contact-list");
      currentContacts = data.rows || [];
      renderContacts();
      if (activeContactId) {
        const stillThere = currentContacts.find((row) => row.id === activeContactId);
        if (stillThere) selectContact(stillThere);
        else clearContactsSelection();
      }
    } catch (reason) {
      list.innerHTML = `<div class="empty-state">${escapeHtml(String(reason))}</div>`;
      syncContactsCounts(0);
    }
  }

  function syncAuditCounts(filteredCount) {
    const countEl = document.getElementById("audit-count");
    const labelEl = document.getElementById("audit-count-label");
    const total = currentAuditRows.length;
    const showingFiltered = typeof filteredCount === "number" && (auditFilter !== "all" || auditSearch);
    if (countEl) countEl.textContent = showingFiltered ? `${filteredCount}` : String(total || "—");
    if (labelEl) {
      if (showingFiltered) labelEl.textContent = `sur ${total}`;
      else labelEl.textContent = total === 1 ? "événement" : "événements";
    }
  }

  function renderAuditTable() {
    const tbody = document.getElementById("audit-tbody");
    if (!tbody) return;

    let filtered = currentAuditRows;
    if (auditFilter !== "all") {
      filtered = filtered.filter((row) => activityCategoryOf(row.action) === auditFilter);
    }
    if (auditSearch) {
      filtered = filtered.filter((row) => {
        const details = formatActivityAction(row);
        const hay = [
          details.label,
          row.action,
          row.actor_email,
          row.target_type,
          row.target_id,
        ].map((v) => String(v || "").toLowerCase()).join(" ");
        return hay.includes(auditSearch);
      });
    }

    syncAuditCounts(filtered.length);

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucun événement correspondant.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((row) => {
      const details = formatActivityAction(row);
      const toneLabel = details.tone === "danger" ? "Critique" : details.tone === "create" ? "Création" : "Mise à jour";
      const target = row.target_id
        ? `${row.target_type || "cible"} · ${row.target_id}`
        : (row.target_type || "—");
      return `
        <tr class="audit-row is-${details.tone}">
          <td class="col-date" data-label="Date">
            <span class="audit-date">${escapeHtml(formatActivityShortTime(row.created_at))}</span>
          </td>
          <td class="col-admin" data-label="Administrateur">
            <button type="button" class="audit-admin-btn" data-audit-email="${escapeHtml(row.actor_email || "")}" ${row.actor_email && row.actor_email !== "system" ? "" : "disabled"}>
              ${escapeHtml(row.actor_email || "système")}
            </button>
          </td>
          <td class="col-action" data-label="Action">
            <strong class="audit-action-label">${escapeHtml(details.label)}</strong>
            <code class="audit-action-key">${escapeHtml(row.action || "—")}</code>
          </td>
          <td class="col-tone" data-label="Type">
            <span class="audit-tone-pill is-${details.tone}">${escapeHtml(toneLabel)}</span>
          </td>
          <td class="col-target" data-label="Cible">
            <code class="audit-target">${escapeHtml(target)}</code>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll("[data-audit-email]").forEach((btn) => {
      if (btn.disabled) return;
      btn.addEventListener("click", () => {
        const email = btn.dataset.auditEmail;
        if (email) window.viewUserDetail(email);
      });
    });
  }

  async function loadAudit() {
    const tbody = document.getElementById("audit-tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Chargement…</td></tr>';
    try {
      const data = await adminRequest("audit-list");
      currentAuditRows = data.rows || [];
      renderAuditTable();
    } catch (reason) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHtml(String(reason))}</td></tr>`;
      syncAuditCounts(0);
    }
  }

  async function loadSystem() {
    const checks = document.getElementById("system-checks");
    const diagDb = document.getElementById("diag-db");
    const diagFunction = document.getElementById("diag-function");
    const diagManifest = document.getElementById("diag-manifest");
    const healthChip = document.getElementById("system-health-chip");
    const healthLabel = document.getElementById("system-health-label");
    const checkedAt = document.getElementById("system-checked-at");
    const dbCard = document.getElementById("system-kpi-db");
    const versionCard = document.getElementById("system-kpi-version");
    const functionCard = document.getElementById("system-kpi-function");
    const manifestCard = document.getElementById("system-kpi-manifest");
    const dbLabel = document.getElementById("health-database");
    const latencyLabel = document.getElementById("health-latency");
    const functionLabel = document.getElementById("health-function");
    const versionLabel = document.getElementById("health-version");
    const manifestLabel = document.getElementById("health-manifest");
    const manifestMeta = document.getElementById("health-manifest-meta");

    const setCardState = (card, ok) => {
      if (!card) return;
      card.classList.toggle("is-ok", ok === true);
      card.classList.toggle("is-error", ok === false);
      card.classList.toggle("is-idle", ok == null);
    };

    if (checks) checks.innerHTML = '<div class="empty-state">Test en cours…</div>';

    try {
      const started = performance.now();
      const health = await adminRequest("health");
      const manifestUrl = config.updateManifestUrl || "/update.json";
      const separator = manifestUrl.includes("?") ? "&" : "?";
      const manifestResponse = await fetch(`${manifestUrl}${separator}health=${Date.now()}`, { cache: "no-store" });
      const latency = Math.round(performance.now() - started);
      const dbOk = health.database === "online";
      const functionOk = true;
      let manifestVersion = null;
      if (manifestResponse.ok) {
        try {
          const manifest = await manifestResponse.json();
          manifestVersion = manifest?.version ? `v${manifest.version}` : "OK";
        } catch {
          manifestVersion = "OK";
        }
      }
      const manifestOk = manifestResponse.ok;
      const allOk = dbOk && functionOk && manifestOk;

      if (dbLabel) dbLabel.textContent = dbOk ? "En ligne" : "Erreur";
      if (latencyLabel) latencyLabel.textContent = `${health.latencyMs ?? latency} ms`;
      if (functionLabel) functionLabel.textContent = "Active";
      if (versionLabel) versionLabel.textContent = manifestVersion || `v${config.appVersion || "0.3.2"}`;
      if (manifestLabel) manifestLabel.textContent = manifestOk ? "Accessible" : "Erreur";
      if (manifestMeta) manifestMeta.textContent = `HTTP ${manifestResponse.status}`;
      if (checkedAt) checkedAt.textContent = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      if (healthLabel) healthLabel.textContent = allOk ? "OK" : "Alertes";
      if (healthChip) {
        healthChip.classList.toggle("is-ok", allOk);
        healthChip.classList.toggle("is-error", !allOk);
      }

      setCardState(dbCard, dbOk);
      setCardState(functionCard, functionOk);
      setCardState(versionCard, Boolean(manifestVersion || config.appVersion));
      setCardState(manifestCard, manifestOk);

      if (diagDb) {
        diagDb.textContent = dbOk ? "CONFORME" : "ERREUR";
        diagDb.parentElement.className = dbOk ? "diagnostic-card" : "diagnostic-card error";
      }
      if (diagFunction) {
        diagFunction.textContent = "CONFORME";
        diagFunction.parentElement.className = "diagnostic-card";
      }
      if (diagManifest) {
        diagManifest.textContent = manifestOk ? "CONFORME" : "ERREUR";
        diagManifest.parentElement.className = manifestOk ? "diagnostic-card" : "diagnostic-card error";
      }

      if (checks) {
        const rows = [
          {
            title: "Base Supabase",
            sub: `Latence ${health.latencyMs ?? latency} ms`,
            ok: dbOk,
          },
          {
            title: "Edge Function admin-users",
            sub: "Authentification, permissions et base",
            ok: functionOk,
          },
          {
            title: "Manifeste de mise à jour",
            sub: `HTTP ${manifestResponse.status}${manifestVersion ? ` · ${manifestVersion}` : ""}`,
            ok: manifestOk,
          },
          {
            title: "Session admin",
            sub: localPreview ? "Mode preview local" : (supabase ? "Supabase connecté" : "Non configuré"),
            ok: Boolean(localPreview || supabase),
          },
        ];
        checks.innerHTML = rows.map((row) => `
          <div class="system-check-row ${row.ok ? "is-ok" : "is-error"}">
            <div class="system-check-copy">
              <strong>${escapeHtml(row.title)}</strong>
              <span>${escapeHtml(row.sub)}</span>
            </div>
            <span class="system-check-pill ${row.ok ? "is-ok" : "is-error"}">${row.ok ? "OK" : "Erreur"}</span>
          </div>
        `).join("");
      }

      addLog(allOk ? "s" : "e", allOk
        ? `Santé système OK (${health.latencyMs ?? latency} ms).`
        : "Santé système : au moins un contrôle a échoué.");
    } catch (reason) {
      if (functionLabel) functionLabel.textContent = "Erreur";
      if (dbLabel) dbLabel.textContent = "Erreur";
      if (manifestLabel) manifestLabel.textContent = "Erreur";
      if (healthLabel) healthLabel.textContent = "Erreur";
      if (healthChip) {
        healthChip.classList.add("is-error");
        healthChip.classList.remove("is-ok");
      }
      if (checkedAt) checkedAt.textContent = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setCardState(dbCard, false);
      setCardState(functionCard, false);
      setCardState(manifestCard, false);
      setCardState(versionCard, null);

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
      addLog("e", `Santé système : ${String(reason)}`);
    }
  }

  const TEAM_PERMISSION_LABELS = {
    console: "Console",
    users: "Utilisateurs",
    licenses: "Licences",
    billing: "Abonnements",
    support: "Support",
    contacts: "Contacts",
    releases: "Releases",
    audit: "Audit",
    system: "Système",
    team: "Équipe",
    library: "Bibliothèque",
  };

  function teamLevelLabel(level) {
    return level === "owner" ? "Owner" : "Collaborateur";
  }

  function setTeamCreatePanelOpen(open, mode = "create") {
    const panel = document.getElementById("team-create-panel");
    const toggle = document.getElementById("team-create-toggle");
    if (panel) panel.hidden = !open;
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && mode === "edit") toggle.textContent = "Fermer le panneau";
      else toggle.textContent = "Déléguer un accès";
    }
  }

  function syncTeamPermissionUi() {
    const level = document.getElementById("team-level")?.value;
    const isOwner = level === "owner";
    const inputs = document.querySelectorAll('[name="team-permission"]');
    inputs.forEach((input) => {
      if (isOwner) input.checked = true;
      input.disabled = isOwner;
      input.closest(".team-perm-chip")?.classList.toggle("is-locked", isOwner);
    });
    const allBtn = document.getElementById("team-perms-all");
    const noneBtn = document.getElementById("team-perms-none");
    if (allBtn) allBtn.disabled = isOwner;
    if (noneBtn) noneBtn.disabled = isOwner;
  }

  function resetTeamForm() {
    const form = document.getElementById("team-form");
    const title = document.getElementById("team-form-title");
    const desc = document.getElementById("team-form-desc");
    const email = document.getElementById("team-email");
    const level = document.getElementById("team-level");
    if (form) form.reset();
    if (title) title.textContent = "Déléguer la superconsole";
    if (desc) desc.textContent = "Invitez un admin existant et définissez ses permissions.";
    if (email) {
      email.readOnly = false;
      email.value = "";
    }
    if (level) level.value = "collaborator";
    document.querySelectorAll('[name="team-permission"]').forEach((input) => {
      input.checked = input.value === "console";
    });
    syncTeamPermissionUi();
  }

  function fillTeamForm(row) {
    const title = document.getElementById("team-form-title");
    const desc = document.getElementById("team-form-desc");
    const email = document.getElementById("team-email");
    const level = document.getElementById("team-level");
    if (title) title.textContent = "Modifier l’accès";
    if (desc) desc.textContent = "Ajustez le niveau et les permissions de ce membre.";
    if (email) {
      email.value = row.email || "";
      email.readOnly = true;
    }
    if (level) level.value = row.level === "owner" ? "owner" : "collaborator";
    const perms = row.permissions || {};
    document.querySelectorAll('[name="team-permission"]').forEach((input) => {
      input.checked = Boolean(perms[input.value]);
    });
    syncTeamPermissionUi();
    setTeamCreatePanelOpen(true, "edit");
  }

  function syncTeamCounts(filteredCount) {
    const countEl = document.getElementById("team-count");
    const labelEl = document.getElementById("team-count-label");
    const total = currentTeamRows.length;
    const showingFiltered = typeof filteredCount === "number" && (teamFilter !== "all" || teamSearch);
    if (countEl) countEl.textContent = showingFiltered ? `${filteredCount}` : String(total || "—");
    if (labelEl) {
      if (showingFiltered) labelEl.textContent = `sur ${total}`;
      else labelEl.textContent = total === 1 ? "membre" : "membres";
    }
  }

  function renderTeamTable() {
    const tbody = document.getElementById("team-tbody");
    if (!tbody) return;

    let filtered = currentTeamRows;
    if (teamFilter === "owner") filtered = filtered.filter((row) => row.level === "owner");
    else if (teamFilter === "collaborator") filtered = filtered.filter((row) => row.level !== "owner");

    if (teamSearch) {
      filtered = filtered.filter((row) => {
        const perms = Object.entries(row.permissions || {})
          .filter(([, enabled]) => enabled)
          .map(([key]) => TEAM_PERMISSION_LABELS[key] || key)
          .join(" ");
        const hay = [row.email, row.level, teamLevelLabel(row.level), perms]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");
        return hay.includes(teamSearch);
      });
    }

    syncTeamCounts(filtered.length);

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Aucun accès correspondant.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((row) => {
      const email = row.email || "—";
      const level = row.level === "owner" ? "owner" : "collaborator";
      const enabledPerms = level === "owner"
        ? Object.values(TEAM_PERMISSION_LABELS)
        : Object.entries(row.permissions || {})
            .filter(([, enabled]) => enabled)
            .map(([key]) => TEAM_PERMISSION_LABELS[key] || key);
      const visibleLimit = 5;
      const visiblePerms = enabledPerms.slice(0, visibleLimit);
      const hiddenCount = Math.max(0, enabledPerms.length - visibleLimit);
      const chips = enabledPerms.length
        ? `${visiblePerms.map((label) => `<span class="team-perm-badge">${escapeHtml(label)}</span>`).join("")}${
            hiddenCount ? `<span class="team-perm-badge is-more" title="${escapeHtml(enabledPerms.join(", "))}">+${hiddenCount}</span>` : ""
          }`
        : '<span class="team-perm-empty">Aucune</span>';
      return `
        <tr>
          <td class="col-member" data-label="Membre">
            <button type="button" class="team-member-email" data-team-profile="${escapeHtml(email)}">${escapeHtml(email)}</button>
          </td>
          <td class="col-level" data-label="Niveau">
            <span class="team-level-pill is-${level}">${escapeHtml(teamLevelLabel(level))}</span>
          </td>
          <td class="col-perms" data-label="Permissions">
            <div class="team-perm-badges">${chips}</div>
          </td>
          <td class="col-actions" data-label="Actions">
            <div class="team-row-actions">
              <button type="button" class="btn-action-view" data-team-edit="${escapeHtml(email)}">Modifier</button>
              <button type="button" class="btn-action-delete" data-team-delete="${escapeHtml(email)}">Retirer</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll("[data-team-profile]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const email = btn.dataset.teamProfile;
        if (email && email !== "—") window.viewUserDetail(email);
      });
    });
    tbody.querySelectorAll("[data-team-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = currentTeamRows.find((item) => item.email === btn.dataset.teamEdit);
        if (row) fillTeamForm(row);
      });
    });
    tbody.querySelectorAll("[data-team-delete]").forEach((button) => {
      button.addEventListener("click", () => {
        openTeamRemoveModal(button.dataset.teamDelete);
      });
    });
  }

  let pendingTeamRemoveEmail = null;

  function closeTeamRemoveModal() {
    const modal = document.getElementById("team-remove-modal");
    const input = document.getElementById("team-remove-email-input");
    const error = document.getElementById("team-remove-error");
    const confirmBtn = document.getElementById("team-remove-confirm-btn");
    pendingTeamRemoveEmail = null;
    if (modal) modal.hidden = true;
    if (input) input.value = "";
    if (error) error.hidden = true;
    if (confirmBtn) confirmBtn.disabled = true;
  }

  function syncTeamRemoveConfirmState() {
    const input = document.getElementById("team-remove-email-input");
    const error = document.getElementById("team-remove-error");
    const confirmBtn = document.getElementById("team-remove-confirm-btn");
    if (!input || !confirmBtn || !pendingTeamRemoveEmail) return;
    const matches = input.value.trim().toLowerCase() === pendingTeamRemoveEmail.toLowerCase();
    confirmBtn.disabled = !matches;
    if (error) error.hidden = !input.value.trim() || matches;
  }

  function openTeamRemoveModal(email) {
    const modal = document.getElementById("team-remove-modal");
    const label = document.getElementById("team-remove-email-label");
    const input = document.getElementById("team-remove-email-input");
    const error = document.getElementById("team-remove-error");
    const confirmBtn = document.getElementById("team-remove-confirm-btn");
    if (!modal || !input || !confirmBtn || !email) return;
    pendingTeamRemoveEmail = email;
    if (label) label.textContent = email;
    input.value = "";
    if (error) error.hidden = true;
    confirmBtn.disabled = true;
    modal.hidden = false;
    window.setTimeout(() => input.focus(), 30);
  }

  async function performTeamRemove(email) {
    try {
      await adminRequest("team-delete", { email });
      addLog("i", `Accès retiré pour ${email}.`);
      closeTeamRemoveModal();
      await loadTeam();
    } catch (reason) {
      addLog("e", String(reason));
    }
  }

  async function loadTeam() {
    const tbody = document.getElementById("team-tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Chargement…</td></tr>';
    try {
      const data = await adminRequest("team-list");
      currentTeamRows = data.rows || [];
      renderTeamTable();
    } catch (reason) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-state">${escapeHtml(String(reason))}</td></tr>`;
      syncTeamCounts(0);
    }
  }

  function syncReleaseDateFromLocal() {
    const localInput = document.getElementById("release-date-local");
    const isoInput = document.getElementById("release-date");
    if (!localInput || !isoInput) return "";
    const raw = localInput.value;
    if (!raw) {
      isoInput.value = "";
      return "";
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return isoInput.value || "";
    isoInput.value = parsed.toISOString();
    return isoInput.value;
  }

  function setReleaseDateValue(isoOrDate) {
    const localInput = document.getElementById("release-date-local");
    const isoInput = document.getElementById("release-date");
    const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate || Date.now());
    const safe = Number.isNaN(date.getTime()) ? new Date() : date;
    if (localInput) localInput.value = toDatetimeLocalValue(safe);
    if (isoInput) isoInput.value = safe.toISOString();
    return isoInput?.value || safe.toISOString();
  }

  function syncReleaseSaveButton() {
    const published = Boolean(document.getElementById("release-published")?.checked);
    const saveBtn = document.getElementById("save-release-btn");
    if (!saveBtn) return;
    saveBtn.textContent = published ? "Publier maintenant" : "Enregistrer en brouillon";
    saveBtn.classList.toggle("is-publish-mode", published);
  }

  function fillReleaseForm(rel = {}) {
    if (document.getElementById("release-version")) document.getElementById("release-version").value = rel.version || "";
    if (document.getElementById("release-url")) document.getElementById("release-url").value = rel.artifact_url || "";
    if (document.getElementById("release-signature")) document.getElementById("release-signature").value = rel.signature || "";
    if (document.getElementById("release-notes")) document.getElementById("release-notes").value = rel.notes || "";
    if (document.getElementById("release-published")) document.getElementById("release-published").checked = Boolean(rel.published);
    if (rel.pub_date || rel.updated_at) setReleaseDateValue(rel.pub_date || rel.updated_at);
    syncReleaseSaveButton();
  }

  async function loadReleases() {
    const list = document.getElementById("releases-list");
    const tableHead = document.querySelector("#panel-releases .releases-table-head");
    if (!list) return;
    try {
      const data = await adminRequest("release-list");
      window._latestReleaseRows = data.rows ?? [];
      const hasRows = Boolean(data.rows?.length);
      if (tableHead) tableHead.hidden = !hasRows;
      list.innerHTML = hasRows ? data.rows.map((row, index) => {
        const published = Boolean(row.published);
        const notes = String(row.notes || "").trim();
        return `
        <article class="release-item">
          <strong class="release-item-version">v${escapeHtml(row.version)}</strong>
          <span class="release-status-pill ${published ? "is-published" : "is-draft"}">${published ? "Publiée" : "Brouillon"}</span>
          <span class="release-item-date">${formatDate(row.updated_at)}</span>
          <p class="release-item-notes${notes ? "" : " is-empty"}" title="${escapeHtml(notes || "Sans notes")}">${escapeHtml(notes || "Sans notes")}</p>
          <div class="release-item-actions">
            <button type="button" class="btn btn-ghost btn-sm edit-release-btn" data-index="${index}">Modifier</button>
            <button type="button" class="btn btn-ghost btn-sm btn-action-delete delete-release-btn" data-version="${escapeHtml(row.version)}">Supprimer</button>
            <a class="btn btn-ghost btn-sm" href="${escapeHtml(row.artifact_url)}" target="_blank" rel="noopener noreferrer">Artefact</a>
          </div>
        </article>`;
      }).join("") : '<div class="empty-state">Aucune release enregistrée.</div>';

      list.querySelectorAll(".edit-release-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.getAttribute("data-index"));
          const rel = window._latestReleaseRows?.[idx];
          if (!rel) return;
          fillReleaseForm(rel);
          addLog("i", `Release v${rel.version} chargée dans le formulaire pour modification.`);
          document.getElementById("release-version")?.scrollIntoView({ behavior: "smooth", block: "center" });
          document.getElementById("release-version")?.focus();
        });
      });

      list.querySelectorAll(".delete-release-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const version = btn.getAttribute("data-version");
          if (!version) return;
          if (!confirm(`Es-tu sûr de vouloir supprimer la release v${version} ?`)) return;
          try {
            await adminRequest("release-delete", { version });
            addLog("s", `Release v${version} supprimée avec succès.`);
            await loadReleases();
          } catch (err) {
            addLog("e", `Erreur lors de la suppression de la release : ${String(err)}`);
          }
        });
      });
    } catch (reason) {
      if (tableHead) tableHead.hidden = true;
      list.innerHTML = `<div class="empty-state">${escapeHtml(String(reason))}</div>`;
    }
  }

  document.getElementById("team-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const level = document.getElementById("team-level").value;
    const permissions = {};
    document.querySelectorAll('[name="team-permission"]').forEach((input) => {
      permissions[input.value] = level === "owner" ? true : input.checked;
    });
    const email = document.getElementById("team-email").value.trim();
    try {
      await adminRequest("team-upsert", {
        email,
        level,
        permissions,
      });
      addLog("s", `Accès équipe enregistré pour ${email}.`);
      resetTeamForm();
      setTeamCreatePanelOpen(false);
      await loadTeam();
    } catch (reason) { addLog("e", String(reason)); }
  });

  document.getElementById("team-create-toggle")?.addEventListener("click", () => {
    const panel = document.getElementById("team-create-panel");
    const next = Boolean(panel?.hidden);
    if (next) resetTeamForm();
    setTeamCreatePanelOpen(next, "create");
  });
  document.getElementById("team-create-close")?.addEventListener("click", () => {
    resetTeamForm();
    setTeamCreatePanelOpen(false);
  });
  document.getElementById("team-level")?.addEventListener("change", () => {
    syncTeamPermissionUi();
  });
  document.getElementById("team-perms-all")?.addEventListener("click", () => {
    if (document.getElementById("team-level")?.value === "owner") return;
    document.querySelectorAll('[name="team-permission"]').forEach((input) => { input.checked = true; });
  });
  document.getElementById("team-perms-none")?.addEventListener("click", () => {
    if (document.getElementById("team-level")?.value === "owner") return;
    document.querySelectorAll('[name="team-permission"]').forEach((input) => { input.checked = false; });
  });
  document.getElementById("team-remove-email-input")?.addEventListener("input", syncTeamRemoveConfirmState);
  document.getElementById("team-remove-email-input")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const confirmBtn = document.getElementById("team-remove-confirm-btn");
      if (confirmBtn && !confirmBtn.disabled && pendingTeamRemoveEmail) {
        void performTeamRemove(pendingTeamRemoveEmail);
      }
    }
    if (event.key === "Escape") closeTeamRemoveModal();
  });
  document.getElementById("team-remove-confirm-btn")?.addEventListener("click", () => {
    if (!pendingTeamRemoveEmail) return;
    const input = document.getElementById("team-remove-email-input");
    if (!input || input.value.trim().toLowerCase() !== pendingTeamRemoveEmail.toLowerCase()) {
      syncTeamRemoveConfirmState();
      return;
    }
    void performTeamRemove(pendingTeamRemoveEmail);
  });
  document.querySelectorAll("[data-team-remove-cancel]").forEach((el) => {
    el.addEventListener("click", closeTeamRemoveModal);
  });
  document.addEventListener("keydown", (event) => {
    const modal = document.getElementById("team-remove-modal");
    if (event.key === "Escape" && modal && !modal.hidden) closeTeamRemoveModal();
  });

  function loadPanel(panelId) {
    const loaders = { overview: loadDashboard, users: refreshUsers, subscriptions: loadSubscriptions, coupons: loadCoupons, support: loadSupport, contacts: loadContacts, releases: loadReleases, activity: loadActivity, audit: loadAudit, system: loadSystem, team: loadTeam, library: loadLibrary };
    return loaders[panelId]?.();
  }

  // --- Abonnements ---
  async function loadSubscriptions() {
    const tbody = document.getElementById("subscriptions-tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Chargement des abonnements…</td></tr>';
    try {
      const result = await adminRequest("subscription-list");
      subscriptionsCache = result.rows || [];
      renderSubscriptionsFromFilters();
    } catch (err) {
      subscriptionsCache = [];
      const countEl = document.getElementById("subs-count");
      if (countEl) countEl.textContent = "—";
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state" style="color: var(--danger);">Erreur : ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function countActiveSubsFilters() {
    return ["plan", "status", "stripe"].filter((key) => Boolean(subsFilterState[key])).length;
  }

  function syncSubsMenusUI() {
    const sortLabel = document.getElementById("subs-sort-label");
    if (sortLabel) sortLabel.textContent = SUBS_SORT_LABELS[subsFilterState.sort] || "Offre";

    document.querySelectorAll("#subs-sort-menu .users-menu-item").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.subsSort === subsFilterState.sort);
    });
    document.querySelectorAll("#subs-filters-menu .users-menu-item[data-subs-filter-key]").forEach((item) => {
      const key = item.dataset.subsFilterKey;
      const value = item.dataset.subsFilterValue ?? "";
      item.classList.toggle("is-active", String(subsFilterState[key] || "") === value);
    });

    const badge = document.getElementById("subs-filters-badge");
    const activeCount = countActiveSubsFilters();
    if (badge) {
      badge.hidden = activeCount === 0;
      badge.textContent = String(activeCount);
    }
    const filtersLabel = document.getElementById("subs-filters-label");
    if (filtersLabel) filtersLabel.textContent = activeCount ? `Filtres (${activeCount})` : "Filtres";
  }

  function closeSubsMenus(exceptId = null) {
    ["subs-filters-menu", "subs-sort-menu"].forEach((id) => {
      if (exceptId && id === exceptId) return;
      const panel = document.getElementById(id);
      const trigger = document.getElementById(id === "subs-filters-menu" ? "subs-filters-trigger" : "subs-sort-trigger");
      if (panel) panel.hidden = true;
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      trigger?.closest(".users-menu")?.classList.remove("is-open");
    });
  }

  function toggleSubsMenu(panelId, triggerId) {
    const panel = document.getElementById(panelId);
    const trigger = document.getElementById(triggerId);
    if (!panel || !trigger) return;
    const willOpen = panel.hidden;
    closeSubsMenus(willOpen ? panelId : null);
    panel.hidden = !willOpen;
    trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
    trigger.closest(".users-menu")?.classList.toggle("is-open", willOpen);
  }

  function filterAndSortSubscriptions(source) {
    const search = (document.getElementById("subs-search")?.value || "").toLowerCase().trim();
    let rows = Array.isArray(source) ? [...source] : [];

    if (search) {
      rows = rows.filter((row) => {
        const email = String(row.email || "").toLowerCase();
        const plan = String(row.subscription_tier || "").toLowerCase();
        const status = String(row.subscription_status || "").toLowerCase();
        const customer = String(row.stripe_customer_id || "").toLowerCase();
        return email.includes(search) || plan.includes(search) || status.includes(search) || customer.includes(search);
      });
    }

    if (subsFilterState.plan) {
      const plan = subsFilterState.plan.toLowerCase();
      rows = rows.filter((row) => {
        const value = String(row.subscription_tier || "").toLowerCase();
        if (value === plan) return true;
        if (plan === "premium" && ["premium", "studio", "lifetime"].includes(value)) return true;
        return false;
      });
    }
    if (subsFilterState.status) {
      rows = rows.filter((row) => String(row.subscription_status || "").toLowerCase() === subsFilterState.status);
    }
    if (subsFilterState.stripe === "linked") {
      rows = rows.filter((row) => Boolean(row.stripe_customer_id));
    } else if (subsFilterState.stripe === "manual") {
      rows = rows.filter((row) => !row.stripe_customer_id);
    }

    const planRank = { lifetime: 0, premium: 1, studio: 1, pro: 2, standard: 3, free: 4 };
    const statusRank = { active: 0, trialing: 1, past_due: 2, suspended: 3, canceled: 4 };

    rows.sort((a, b) => {
      const emailA = String(a.email || "").toLowerCase();
      const emailB = String(b.email || "").toLowerCase();
      const planA = String(a.subscription_tier || "free").toLowerCase();
      const planB = String(b.subscription_tier || "free").toLowerCase();
      const statusA = String(a.subscription_status || "").toLowerCase();
      const statusB = String(b.subscription_status || "").toLowerCase();
      switch (subsFilterState.sort) {
        case "status_asc":
          return (statusRank[statusA] ?? 9) - (statusRank[statusB] ?? 9) || emailA.localeCompare(emailB, "fr");
        case "email_asc":
          return emailA.localeCompare(emailB, "fr");
        case "email_desc":
          return emailB.localeCompare(emailA, "fr");
        case "plan_asc":
        default:
          return (planRank[planA] ?? 9) - (planRank[planB] ?? 9) || emailA.localeCompare(emailB, "fr");
      }
    });

    return rows;
  }

  function renderSubscriptionsFromFilters() {
    syncSubsMenusUI();
    renderSubscriptionsTable(filterAndSortSubscriptions(subscriptionsCache));
  }

  function resetSubsFilters() {
    subsFilterState = { plan: "", status: "", stripe: "", sort: "plan_asc" };
    const search = document.getElementById("subs-search");
    if (search) search.value = "";
    closeSubsMenus();
    renderSubscriptionsFromFilters();
  }

  function renderSubscriptionsTable(rows) {
    const tbody = document.getElementById("subscriptions-tbody");
    const countEl = document.getElementById("subs-count");
    const countLabel = document.getElementById("subs-count-label");
    if (!tbody) return;

    tbody.innerHTML = "";
    if (countEl) countEl.textContent = String(rows.length);
    if (countLabel) {
      const total = subscriptionsCache.length;
      countLabel.textContent = total && rows.length !== total
        ? `sur ${total}`
        : (rows.length === 1 ? "abonnement" : "abonnements");
    }

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucun abonnement ne correspond.</td></tr>';
      return;
    }

    rows.forEach((sub) => {
      const tr = document.createElement("tr");
      const email = sub.email || "—";
      const plan = sub.subscription_tier || "free";
      const status = String(sub.subscription_status || "").toLowerCase();
      const statusLabel = subscriptionStatusLabelOf(status) || status || "—";
      const customerId = sub.stripe_customer_id || "";
      const statusClass = ["active", "trialing", "past_due", "canceled", "suspended", "unpaid"].includes(status)
        ? status
        : "unknown";

      tr.innerHTML = `
        <td class="col-member" data-label="Membre">
          <button type="button" class="user-member-email copy-sub-email" title="Copier l'e-mail">${escapeHtml(email)}</button>
        </td>
        <td class="col-plan" data-label="Offre">
          <span class="plan-pill ${escapeHtml(planClassOf(plan))}">
            <span class="plan-pill-label">${escapeHtml(planLabelOf(plan))}</span>
          </span>
        </td>
        <td class="col-status" data-label="Statut">
          <span class="subs-status-pill is-${escapeHtml(statusClass)}">${escapeHtml(statusLabel)}</span>
        </td>
        <td class="col-stripe" data-label="Client Stripe">
          ${customerId
            ? `<button type="button" class="copy-chip copy-sub-customer" title="Copier le client Stripe">${escapeHtml(customerId)}</button>`
            : `<span class="subs-manual-chip">Manuel</span>`}
        </td>
        <td class="col-actions" data-label="Actions">
          <div class="user-actions-cell">
            <button type="button" class="btn-action-view view-sub-user-btn">Consulter</button>
          </div>
        </td>
      `;

      bindCopyButton(tr, ".copy-sub-email", email !== "—" ? email : "");
      bindCopyButton(tr, ".copy-sub-customer", customerId);
      tr.querySelector(".view-sub-user-btn")?.addEventListener("click", () => {
        if (email && email !== "—") window.viewUserDetail(email);
      });
      tbody.appendChild(tr);
    });
  }

  // --- Coupons Stripe ---
  let couponsCache = [];
  let couponsFilterState = {
    type: "",
    duration: "",
    sort: "created_desc",
  };

  const COUPONS_SORT_LABELS = {
    created_desc: "Plus récents",
    name_asc: "Code A→Z",
    name_desc: "Code Z→A",
    usage_desc: "Plus utilisés",
  };

  function couponDurationLabel(duration) {
    const labels = { once: "Une fois", repeating: "Récurrent", forever: "Illimité" };
    return labels[duration] || duration || "—";
  }

  async function invokeStripeCoupons(body) {
    if (!supabase) throw new Error("Supabase non configuré.");
    const { data, error } = await supabase.functions.invoke("stripe-coupons", { body });
    if (error) {
      const detail = data?.error || data?.message || error.message || "Erreur Stripe";
      throw new Error(detail);
    }
    if (data?.error) throw new Error(String(data.error));
    return data;
  }

  async function loadCoupons() {
    const tbody = document.getElementById("coupons-tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Chargement des coupons…</td></tr>';
    try {
      if (!supabase) throw new Error("Service administrateur non configuré.");
      const data = await invokeStripeCoupons({ action: "list" });
      couponsCache = Array.isArray(data?.coupons) ? data.coupons : [];
      renderCouponsFromFilters();
    } catch (err) {
      couponsCache = [];
      const countEl = document.getElementById("coupons-count");
      if (countEl) countEl.textContent = "—";
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state coupons-error">Impossible de charger les coupons : ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function countActiveCouponsFilters() {
    return ["type", "duration"].filter((key) => Boolean(couponsFilterState[key])).length;
  }

  function syncCouponsMenusUI() {
    const sortLabel = document.getElementById("coupons-sort-label");
    if (sortLabel) sortLabel.textContent = COUPONS_SORT_LABELS[couponsFilterState.sort] || "Plus récents";

    document.querySelectorAll("#coupons-sort-menu .users-menu-item").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.couponsSort === couponsFilterState.sort);
    });
    document.querySelectorAll("#coupons-filters-menu .users-menu-item[data-coupons-filter-key]").forEach((item) => {
      const key = item.dataset.couponsFilterKey;
      const value = item.dataset.couponsFilterValue ?? "";
      item.classList.toggle("is-active", String(couponsFilterState[key] || "") === value);
    });

    const badge = document.getElementById("coupons-filters-badge");
    const activeCount = countActiveCouponsFilters();
    if (badge) {
      badge.hidden = activeCount === 0;
      badge.textContent = String(activeCount);
    }
    const filtersLabel = document.getElementById("coupons-filters-label");
    if (filtersLabel) filtersLabel.textContent = activeCount ? `Filtres (${activeCount})` : "Filtres";
  }

  function closeCouponsMenus(exceptId = null) {
    ["coupons-filters-menu", "coupons-sort-menu"].forEach((id) => {
      if (exceptId && id === exceptId) return;
      const panel = document.getElementById(id);
      const trigger = document.getElementById(id === "coupons-filters-menu" ? "coupons-filters-trigger" : "coupons-sort-trigger");
      if (panel) panel.hidden = true;
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      trigger?.closest(".users-menu")?.classList.remove("is-open");
    });
  }

  function toggleCouponsMenu(panelId, triggerId) {
    const panel = document.getElementById(panelId);
    const trigger = document.getElementById(triggerId);
    if (!panel || !trigger) return;
    const willOpen = panel.hidden;
    closeCouponsMenus(willOpen ? panelId : null);
    panel.hidden = !willOpen;
    trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
    trigger.closest(".users-menu")?.classList.toggle("is-open", willOpen);
  }

  function filterAndSortCoupons(source) {
    const search = (document.getElementById("coupons-search")?.value || "").toLowerCase().trim();
    let rows = Array.isArray(source) ? [...source] : [];

    if (search) {
      rows = rows.filter((coupon) => {
        const name = String(coupon.name || coupon.id || "").toLowerCase();
        const discount = coupon.percent_off != null
          ? `${coupon.percent_off}%`
          : `${((coupon.amount_off || 0) / 100).toFixed(2)}`;
        return name.includes(search) || discount.includes(search);
      });
    }
    if (couponsFilterState.type === "percent") {
      rows = rows.filter((coupon) => coupon.percent_off != null);
    } else if (couponsFilterState.type === "amount") {
      rows = rows.filter((coupon) => coupon.amount_off != null);
    }
    if (couponsFilterState.duration) {
      rows = rows.filter((coupon) => String(coupon.duration || "") === couponsFilterState.duration);
    }

    rows.sort((a, b) => {
      const nameA = String(a.name || a.id || "").toLowerCase();
      const nameB = String(b.name || b.id || "").toLowerCase();
      const usageA = Number(a.times_redeemed || 0);
      const usageB = Number(b.times_redeemed || 0);
      const createdA = Number(a.created || 0);
      const createdB = Number(b.created || 0);
      switch (couponsFilterState.sort) {
        case "name_asc":
          return nameA.localeCompare(nameB, "fr");
        case "name_desc":
          return nameB.localeCompare(nameA, "fr");
        case "usage_desc":
          return usageB - usageA || nameA.localeCompare(nameB, "fr");
        case "created_desc":
        default:
          return createdB - createdA || nameA.localeCompare(nameB, "fr");
      }
    });

    return rows;
  }

  function renderCouponsFromFilters() {
    syncCouponsMenusUI();
    renderCouponsTable(filterAndSortCoupons(couponsCache));
  }

  function resetCouponsFilters() {
    couponsFilterState = { type: "", duration: "", sort: "created_desc" };
    const search = document.getElementById("coupons-search");
    if (search) search.value = "";
    closeCouponsMenus();
    renderCouponsFromFilters();
  }

  function renderCouponsTable(rows) {
    const tbody = document.getElementById("coupons-tbody");
    const countEl = document.getElementById("coupons-count");
    const countLabel = document.getElementById("coupons-count-label");
    if (!tbody) return;

    tbody.innerHTML = "";
    if (countEl) countEl.textContent = String(rows.length);
    if (countLabel) {
      const total = couponsCache.length;
      countLabel.textContent = total && rows.length !== total
        ? `sur ${total}`
        : (rows.length === 1 ? "coupon" : "coupons");
    }

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucun coupon ne correspond.</td></tr>';
      return;
    }

    rows.forEach((coupon) => {
      const tr = document.createElement("tr");
      const code = coupon.name || coupon.id || "—";
      const isPercent = coupon.percent_off != null;
      const discount = isPercent
        ? `${coupon.percent_off} %`
        : `${((coupon.amount_off || 0) / 100).toFixed(2)} €`;
      const usage = coupon.max_redemptions
        ? `${coupon.times_redeemed || 0} / ${coupon.max_redemptions}`
        : `${coupon.times_redeemed || 0} · Illimité`;

      tr.innerHTML = `
        <td class="col-code" data-label="Code">
          <button type="button" class="coupon-code-chip copy-coupon-code" title="Copier le code">${escapeHtml(code)}</button>
        </td>
        <td class="col-discount" data-label="Réduction">
          <span class="coupon-discount-pill ${isPercent ? "is-percent" : "is-amount"}">${escapeHtml(discount)}</span>
        </td>
        <td class="col-duration" data-label="Durée">
          <span class="coupon-duration-pill">${escapeHtml(couponDurationLabel(coupon.duration))}</span>
        </td>
        <td class="col-usage" data-label="Utilisations">
          <span class="coupon-usage">${escapeHtml(usage)}</span>
        </td>
        <td class="col-actions" data-label="Actions">
          <div class="user-actions-cell">
            <button type="button" class="btn-action-delete delete-coupon-btn">Supprimer</button>
          </div>
        </td>
      `;

      bindCopyButton(tr, ".copy-coupon-code", code !== "—" ? code : "");
      tr.querySelector(".delete-coupon-btn")?.addEventListener("click", async (event) => {
        const btn = event.currentTarget;
        if (!confirm(`Supprimer le coupon « ${code} » ?`)) return;
        btn.disabled = true;
        btn.textContent = "…";
        try {
          await invokeStripeCoupons({ action: "delete", couponId: coupon.id });
          addLog("s", `Coupon supprimé : ${code}`);
          await loadCoupons();
        } catch (err) {
          addLog("e", String(err.message || err));
          btn.disabled = false;
          btn.textContent = "Supprimer";
        }
      });
      tbody.appendChild(tr);
    });
  }

  function setCouponsCreateOpen(open) {
    const panel = document.getElementById("coupons-create-panel");
    const toggle = document.getElementById("coupons-create-toggle");
    if (panel) panel.hidden = !open;
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function syncCouponValueLabel() {
    const type = document.getElementById("coupon-type")?.value || "percent";
    const label = document.getElementById("coupon-value-label");
    const input = document.getElementById("coupon-value");
    if (label) label.textContent = type === "percent" ? "Réduction (%)" : "Montant (€)";
    if (input) {
      input.placeholder = type === "percent" ? "50" : "5";
      input.step = type === "percent" ? "1" : "0.01";
      input.min = type === "percent" ? "1" : "0.01";
    }
  }

  document.getElementById("coupons-search")?.addEventListener("input", renderCouponsFromFilters);
  document.getElementById("refresh-coupons-btn")?.addEventListener("click", loadCoupons);
  document.getElementById("coupons-filters-trigger")?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeUsersMenus();
    closeSubsMenus();
    toggleCouponsMenu("coupons-filters-menu", "coupons-filters-trigger");
  });
  document.getElementById("coupons-sort-trigger")?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeUsersMenus();
    closeSubsMenus();
    toggleCouponsMenu("coupons-sort-menu", "coupons-sort-trigger");
  });
  document.getElementById("coupons-filters-menu")?.addEventListener("click", (event) => {
    const item = event.target.closest(".users-menu-item[data-coupons-filter-key]");
    if (!item) return;
    event.stopPropagation();
    const key = item.dataset.couponsFilterKey;
    couponsFilterState[key] = item.dataset.couponsFilterValue ?? "";
    renderCouponsFromFilters();
  });
  document.getElementById("coupons-sort-menu")?.addEventListener("click", (event) => {
    const item = event.target.closest(".users-menu-item[data-coupons-sort]");
    if (!item) return;
    event.stopPropagation();
    couponsFilterState.sort = item.dataset.couponsSort || "created_desc";
    closeCouponsMenus();
    renderCouponsFromFilters();
  });
  document.getElementById("coupons-filters-reset")?.addEventListener("click", (event) => {
    event.stopPropagation();
    resetCouponsFilters();
  });

  document.getElementById("coupons-create-toggle")?.addEventListener("click", () => {
    const panel = document.getElementById("coupons-create-panel");
    setCouponsCreateOpen(Boolean(panel?.hidden));
  });
  document.getElementById("coupons-create-close")?.addEventListener("click", () => setCouponsCreateOpen(false));
  document.getElementById("coupon-type")?.addEventListener("change", syncCouponValueLabel);
  syncCouponValueLabel();

  document.getElementById("coupon-create-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = document.getElementById("coupon-create-submit");
    const code = (document.getElementById("coupon-code")?.value || "").trim().toUpperCase();
    const type = document.getElementById("coupon-type")?.value || "percent";
    const rawValue = Number(document.getElementById("coupon-value")?.value);
    const duration = document.getElementById("coupon-duration")?.value || "once";
    const maxRaw = document.getElementById("coupon-max")?.value;
    if (!code) return;
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      addLog("e", "Valeur de réduction invalide.");
      return;
    }

    const coupon = {
      id: code,
      name: code,
      duration,
    };
    if (type === "percent") {
      coupon.percent_off = Math.min(100, Math.round(rawValue));
    } else {
      coupon.amount_off = Math.round(rawValue * 100);
      coupon.currency = "eur";
    }
    if (maxRaw) {
      const max = Number(maxRaw);
      if (Number.isFinite(max) && max > 0) coupon.max_redemptions = Math.round(max);
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Création…";
    }
    try {
      await invokeStripeCoupons({ action: "create", coupon });
      addLog("s", `Coupon créé : ${code}`);
      event.target.reset();
      syncCouponValueLabel();
      setCouponsCreateOpen(false);
      await loadCoupons();
    } catch (err) {
      addLog("e", String(err.message || err));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Créer le coupon";
      }
    }
  });

  syncCouponsMenusUI();

  // --- Textures Library CRUD ---
  let libraryTextures = [];
  let selectedBatchFiles = [];
  let libraryFilter = "all";
  let librarySearch = "";
  let pendingLibraryDelete = null;

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
    return map[String(colorName || "").toLowerCase()] || "#4b5563";
  }

  function getColorText(colorName) {
    const isLight = ["blanc", "beige", "jaune"].includes(String(colorName || "").toLowerCase());
    return isLight ? "#000000" : "#ffffff";
  }

  function setLibraryCreatePanelOpen(open, mode = "create") {
    const panel = document.getElementById("library-create-panel");
    const toggle = document.getElementById("library-create-toggle");
    if (panel) panel.hidden = !open;
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && mode === "edit") toggle.textContent = "Fermer le panneau";
      else toggle.textContent = "Ajouter une texture";
    }
    if (open) syncLibraryDropzoneMode(mode === "edit");
  }

  function syncLibraryDropzoneMode(isEdit) {
    const fileInput = document.getElementById("library-file");
    const title = document.getElementById("library-dropzone-title");
    const hint = document.getElementById("library-dropzone-hint");
    if (fileInput) {
      if (isEdit) fileInput.removeAttribute("multiple");
      else fileInput.setAttribute("multiple", "");
    }
    if (title) title.textContent = isEdit ? "Remplacer l’image" : "Importer des images";
    if (hint) hint.textContent = isEdit
      ? "PNG, JPG, WEBP · 1 fichier"
      : "PNG, JPG, WEBP · conversion auto";
  }

  function isLibraryEditMode() {
    return Boolean(document.getElementById("library-id")?.value?.trim());
  }

  function syncLibraryFormRequirements() {
    const urlInput = document.getElementById("library-url");
    const nameInput = document.getElementById("library-name");
    const batchMode = selectedBatchFiles.length > 0;
    if (urlInput) urlInput.required = !batchMode;
    if (nameInput) nameInput.required = !batchMode;
  }

  function syncLibraryBatchUi() {
    const form = document.getElementById("library-form");
    const batchMode = selectedBatchFiles.length > 0;
    const nameField = document.getElementById("library-name-field");
    const urlField = document.getElementById("library-url-field");
    const batchSection = document.getElementById("library-batch-section");
    const batchCount = document.getElementById("library-batch-count");
    const categoryLabel = document.getElementById("library-category-label");
    const colorLabel = document.getElementById("library-color-label");
    const previewLabel = document.getElementById("library-preview-label");
    const hint = document.getElementById("library-form-hint");
    const desc = document.getElementById("library-form-desc");
    const submitBtn = document.getElementById("library-submit-btn");

    form?.classList.toggle("is-batch", batchMode);
    if (nameField) nameField.hidden = batchMode;
    if (urlField) urlField.hidden = batchMode;
    if (batchSection) batchSection.hidden = !batchMode;
    if (batchCount) {
      const n = selectedBatchFiles.length;
      batchCount.textContent = n === 1 ? "1 fichier" : `${n} fichiers`;
    }
    if (categoryLabel) categoryLabel.textContent = batchMode ? "Catégorie par défaut" : "Catégorie";
    if (colorLabel) colorLabel.textContent = batchMode ? "Couleur par défaut" : "Couleur";
    if (previewLabel) previewLabel.textContent = batchMode ? "Aperçu (1er fichier)" : "Aperçu";

    if (batchMode) {
      const first = selectedBatchFiles[0];
      if (first?.previewUrl) updatePreviewImage(first.previewUrl);
      else if (first?.file) {
        first.previewUrl = URL.createObjectURL(first.file);
        updatePreviewImage(first.previewUrl);
      }
      if (hint) {
        const n = selectedBatchFiles.length;
        hint.textContent = n === 1 ? "1 texture prête à enregistrer." : `${n} textures prêtes à enregistrer.`;
      }
      if (desc && !isLibraryEditMode()) {
        desc.textContent = "Les nouveaux imports reprennent la catégorie et la couleur par défaut ci-dessous.";
      }
      if (submitBtn) submitBtn.textContent = `Enregistrer (${selectedBatchFiles.length})`;
      setLibraryCancelVisible(true);
    } else if (!isLibraryEditMode()) {
      if (hint) hint.textContent = "Création d’une nouvelle texture.";
      if (desc) desc.textContent = "Importez une image ou collez une URL, puis renseignez les métadonnées.";
      if (submitBtn) submitBtn.textContent = "Enregistrer";
    }

    syncLibraryFormRequirements();
  }

  function revokeBatchPreviewUrls(exceptIndex = -1) {
    selectedBatchFiles.forEach((item, index) => {
      if (index === exceptIndex) return;
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
        item.previewUrl = "";
      }
    });
  }

  function setLibraryCancelVisible(visible) {
    const cancelBtn = document.getElementById("library-cancel-btn");
    if (cancelBtn) cancelBtn.hidden = !visible;
  }

  function resetLibraryForm() {
    const form = document.getElementById("library-form");
    const title = document.getElementById("library-form-title");
    const desc = document.getElementById("library-form-desc");
    const hint = document.getElementById("library-form-hint");
    const idInput = document.getElementById("library-id");
    const submitBtn = document.getElementById("library-submit-btn");
    revokeBatchPreviewUrls();
    if (form) form.reset();
    if (idInput) idInput.value = "";
    if (title) title.textContent = "Ajouter une texture";
    if (desc) desc.textContent = "Importez une image ou collez une URL, puis renseignez les métadonnées.";
    if (hint) hint.textContent = "Création d’une nouvelle texture.";
    if (submitBtn) submitBtn.textContent = "Enregistrer";
    updatePreviewImage("");
    selectedBatchFiles = [];
    renderBatchPreview();
    setLibraryCancelVisible(false);
    syncLibraryDropzoneMode(false);
    syncLibraryBatchUi();
    const progressDiv = document.getElementById("library-upload-progress");
    if (progressDiv) progressDiv.hidden = true;
  }

  function editTexture(item) {
    resetLibraryForm();
    const title = document.getElementById("library-form-title");
    const desc = document.getElementById("library-form-desc");
    const hint = document.getElementById("library-form-hint");
    const submitBtn = document.getElementById("library-submit-btn");
    document.getElementById("library-id").value = item.id || "";
    document.getElementById("library-name").value = item.name || "";
    document.getElementById("library-category").value = item.category || "Autre";
    document.getElementById("library-color").value = item.color || "Noir";
    document.getElementById("library-url").value = item.url || "";
    updatePreviewImage(item.url || "");
    if (title) title.textContent = "Modifier la texture";
    if (desc) desc.textContent = "Ajustez les métadonnées ou remplacez l’image.";
    if (hint) hint.textContent = "Modification de la texture active.";
    if (submitBtn) submitBtn.textContent = "Enregistrer";
    setLibraryCancelVisible(true);
    syncLibraryDropzoneMode(true);
    syncLibraryBatchUi();
    syncLibraryFormRequirements();
    setLibraryCreatePanelOpen(true, "edit");
    document.getElementById("library-create-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function closeLibraryDeleteModal() {
    const modal = document.getElementById("library-delete-modal");
    const input = document.getElementById("library-delete-name-input");
    const error = document.getElementById("library-delete-error");
    const confirmBtn = document.getElementById("library-delete-confirm-btn");
    pendingLibraryDelete = null;
    if (modal) modal.hidden = true;
    if (input) input.value = "";
    if (error) error.hidden = true;
    if (confirmBtn) confirmBtn.disabled = true;
  }

  function syncLibraryDeleteConfirmState() {
    const input = document.getElementById("library-delete-name-input");
    const error = document.getElementById("library-delete-error");
    const confirmBtn = document.getElementById("library-delete-confirm-btn");
    if (!input || !confirmBtn || !pendingLibraryDelete) return;
    const matches = input.value.trim().toLowerCase() === String(pendingLibraryDelete.name || "").toLowerCase();
    confirmBtn.disabled = !matches;
    if (error) error.hidden = !input.value.trim() || matches;
  }

  function openLibraryDeleteModal(item) {
    const modal = document.getElementById("library-delete-modal");
    const label = document.getElementById("library-delete-name-label");
    const input = document.getElementById("library-delete-name-input");
    const error = document.getElementById("library-delete-error");
    const confirmBtn = document.getElementById("library-delete-confirm-btn");
    if (!modal || !input || !confirmBtn || !item?.id) return;
    pendingLibraryDelete = { id: item.id, name: item.name || "" };
    if (label) label.textContent = item.name || "";
    input.value = "";
    if (error) error.hidden = true;
    confirmBtn.disabled = true;
    modal.hidden = false;
    window.setTimeout(() => input.focus(), 30);
  }

  async function performLibraryDelete(item) {
    try {
      const res = await adminRequest("library-delete", { id: item.id });
      if (!res.ok) throw new Error(res.error);
      addLog("s", `Texture « ${item.name} » supprimée`);
      closeLibraryDeleteModal();
      await loadLibrary();
    } catch (err) {
      addLog("e", `Erreur suppression texture : ${err.message || err}`);
    }
  }

  function syncLibraryCounts(filteredCount) {
    const countEl = document.getElementById("library-count");
    const labelEl = document.getElementById("library-count-label");
    const total = libraryTextures.length;
    const showingFiltered = typeof filteredCount === "number" && (libraryFilter !== "all" || librarySearch);
    if (countEl) countEl.textContent = showingFiltered ? String(filteredCount) : String(total || "—");
    if (labelEl) {
      if (showingFiltered) labelEl.textContent = `sur ${total}`;
      else labelEl.textContent = total === 1 ? "texture" : "textures";
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
            if (blob) resolve({ blob, w, h });
            else reject(new Error("Erreur de compression."));
          }, "image/webp", 0.85);
        };
        img.onerror = () => reject(new Error("Impossible de charger l'image."));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
      reader.readAsDataURL(file);
    });
  }

  function updatePreviewImage(url) {
    const previewImg = document.getElementById("library-preview-img");
    const previewPlaceholder = document.getElementById("library-preview-placeholder");
    if (!previewImg || !previewPlaceholder) return;
    if (url && (/^https?:\/\//i.test(url) || url.startsWith("blob:"))) {
      previewImg.src = url;
      previewImg.hidden = false;
      previewPlaceholder.hidden = true;
    } else {
      previewImg.removeAttribute("src");
      previewImg.hidden = true;
      previewPlaceholder.hidden = false;
    }
  }

  function renderLibraryList() {
    const list = document.getElementById("library-list-tbody");
    if (!list) return;

    let filtered = libraryTextures;
    if (libraryFilter !== "all") {
      filtered = filtered.filter((row) => String(row.category || "") === libraryFilter);
    }
    if (librarySearch) {
      filtered = filtered.filter((row) =>
        [row.name, row.category, row.color]
          .map((value) => String(value || "").toLowerCase())
          .join(" ")
          .includes(librarySearch)
      );
    }

    syncLibraryCounts(filtered.length);

    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state library-empty">${
        librarySearch || libraryFilter !== "all"
          ? "Aucune texture ne correspond aux filtres."
          : "Aucune texture enregistrée."
      }</div>`;
      return;
    }

    list.innerHTML = filtered.map((row) => `
      <article class="texture-library-card" data-id="${escapeHtml(row.id)}">
        <div class="texture-card-media">
          <img src="${escapeHtml(row.url)}" alt="${escapeHtml(row.name)}" loading="lazy" onerror="this.src='assets/logo_small.png'" />
        </div>
        <div class="texture-card-body">
          <div class="texture-card-name" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</div>
          <div class="texture-card-meta">
            <span class="badge badge-category">${escapeHtml(row.category)}</span>
            <span class="badge badge-color${String(row.color || "").toLowerCase() === "multicolore" ? " is-multicolore" : ""}" style="${String(row.color || "").toLowerCase() === "multicolore" ? "" : `background: ${getColorHex(row.color)}; color: ${getColorText(row.color)};`}">${escapeHtml(row.color)}</span>
          </div>
          <div class="texture-card-actions">
            <button type="button" class="btn-action-view" data-edit-texture="${escapeHtml(row.id)}">Modifier</button>
            <button type="button" class="btn-action-delete" data-delete-texture="${escapeHtml(row.id)}">Supprimer</button>
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
      btn.addEventListener("click", () => {
        const item = libraryTextures.find((texture) => texture.id === btn.dataset.deleteTexture);
        if (item) openLibraryDeleteModal(item);
      });
    });
  }

  async function loadLibrary() {
    const list = document.getElementById("library-list-tbody");
    if (!list) return;
    list.innerHTML = '<div class="empty-state library-empty">Chargement des textures…</div>';
    try {
      const data = await adminRequest("library-list");
      if (!data.ok) throw new Error(data.error);
      libraryTextures = data.rows ?? [];
      renderLibraryList();
    } catch (reason) {
      list.innerHTML = `<div class="empty-state library-empty is-error">Erreur : ${escapeHtml(reason.message || reason)}</div>`;
      syncLibraryCounts(0);
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

    selected.forEach((file) => {
      selectedBatchFiles.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name.replace(/\.[^/.]+$/, "").trim() || "Sans titre",
        category: defaultCategory,
        color: defaultColor,
        previewUrl: URL.createObjectURL(file),
      });
    });

    renderBatchPreview();
    setLibraryCreatePanelOpen(true, "create");
  }

  function renderBatchPreview() {
    const preview = document.getElementById("library-batch-preview");
    if (!preview) return;

    syncLibraryBatchUi();

    if (selectedBatchFiles.length === 0) {
      preview.innerHTML = "";
      return;
    }

    const categories = ["Métal", "Bois", "Brique", "Béton", "Plâtre", "Tissu/Cuir", "Carbone/Plastique", "Verre", "Pierre", "Néon/Lumière", "Peinture", "Sol/Asphalte", "Motif", "Autre"];
    const colors = ["Noir", "Blanc", "Gris", "Rouge", "Bleu", "Vert", "Jaune", "Orange", "Violet", "Rose", "Marron", "Beige", "Multicolore"];

    preview.innerHTML = selectedBatchFiles.map((item, index) => {
      const categoryOptions = categories.map((cat) =>
        `<option value="${cat}" ${item.category === cat ? "selected" : ""}>${cat}</option>`
      ).join("");

      const colorOptions = colors.map((col) =>
        `<option value="${col}" ${item.color === col ? "selected" : ""}>${col}</option>`
      ).join("");

      const thumbSrc = item.previewUrl || "";

      return `
        <div class="library-batch-item" data-index="${index}">
          <button type="button" class="batch-item-preview" data-batch-preview="${index}" title="Voir l’aperçu">
            <img src="${escapeHtml(thumbSrc)}" alt="" />
          </button>
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
          <button type="button" class="batch-item-remove-btn" data-remove="${index}" title="Retirer">×</button>
        </div>
      `;
    }).join("");

    preview.querySelectorAll(".library-batch-item").forEach((itemEl) => {
      const index = parseInt(itemEl.dataset.index, 10);

      itemEl.querySelector(".batch-item-name").addEventListener("input", (e) => {
        selectedBatchFiles[index].name = e.target.value.trim();
      });

      itemEl.querySelector(".batch-item-category").addEventListener("change", (e) => {
        selectedBatchFiles[index].category = e.target.value;
      });

      itemEl.querySelector(".batch-item-color").addEventListener("change", (e) => {
        selectedBatchFiles[index].color = e.target.value;
      });

      itemEl.querySelector("[data-batch-preview]")?.addEventListener("click", () => {
        const item = selectedBatchFiles[index];
        if (!item) return;
        if (!item.previewUrl && item.file) item.previewUrl = URL.createObjectURL(item.file);
        if (item.previewUrl) updatePreviewImage(item.previewUrl);
        const previewLabel = document.getElementById("library-preview-label");
        if (previewLabel) previewLabel.textContent = `Aperçu · ${item.name || "fichier"}`;
      });

      itemEl.querySelector(".batch-item-remove-btn").addEventListener("click", () => {
        const removed = selectedBatchFiles.splice(index, 1)[0];
        if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
        renderBatchPreview();
        if (!selectedBatchFiles.length) updatePreviewImage("");
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
    progressDiv.hidden = false;
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
      progressDiv.hidden = true;
      submitBtn.disabled = false;
      if (failures.length === 0) {
        resetLibraryForm();
        setLibraryCreatePanelOpen(false);
      } else {
        renderBatchPreview();
      }
      void loadLibrary();
    }, 2000);
  }

  async function replaceLibraryImageFile(file) {
    const progressDiv = document.getElementById("library-upload-progress");
    const progressBar = document.getElementById("upload-progress-bar");
    const progressText = document.getElementById("upload-status-text");
    const urlInput = document.getElementById("library-url");
    if (!file || !urlInput) return;
    try {
      if (progressDiv) progressDiv.hidden = false;
      if (progressBar) progressBar.style.width = "15%";
      if (progressText) progressText.textContent = "Optimisation de l’image…";
      const result = await uploadTextureFile(file, (percent, message) => {
        if (progressBar) progressBar.style.width = `${Math.max(15, Math.round(percent))}%`;
        if (progressText && message) progressText.textContent = message;
      });
      urlInput.value = result.publicUrl;
      updatePreviewImage(result.publicUrl);
      if (progressText) progressText.textContent = "Image remplacée.";
      if (progressBar) progressBar.style.width = "100%";
      addLog("s", "Image de texture remplacée.");
      window.setTimeout(() => {
        if (progressDiv) progressDiv.hidden = true;
      }, 900);
    } catch (error) {
      if (progressDiv) progressDiv.hidden = true;
      addLog("e", libraryErrorMessage(error));
    }
  }

  function handleLibraryFiles(files) {
    const selected = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (!selected.length) return;
    if (isLibraryEditMode()) {
      void replaceLibraryImageFile(selected[0]);
      return;
    }
    addFilesToBatch(selected);
  }

  // Bind library events once loaded
  document.getElementById("library-url")?.addEventListener("input", (e) => {
    updatePreviewImage(e.target.value.trim());
  });

  document.getElementById("library-file")?.addEventListener("change", (e) => {
    if (e.target.files?.length) {
      handleLibraryFiles(e.target.files);
      e.target.value = "";
    }
  });

  const dropzone = document.querySelector(".library-upload-dropzone");
  if (dropzone) {
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add("drag-over");
      }, false);
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove("drag-over");
      }, false);
    });

    dropzone.addEventListener("drop", (e) => {
      const files = e.dataTransfer?.files;
      if (files?.length) handleLibraryFiles(files);
    }, false);
  }

  document.getElementById("library-search")?.addEventListener("input", (event) => {
    librarySearch = String(event.target.value || "").trim().toLowerCase();
    renderLibraryList();
  });

  document.querySelectorAll("#panel-library [data-library-filter]").forEach((tab) => {
    tab.addEventListener("click", () => {
      libraryFilter = tab.dataset.libraryFilter || "all";
      document.querySelectorAll("#panel-library [data-library-filter]").forEach((el) => {
        el.classList.toggle("is-active", el === tab);
      });
      renderLibraryList();
    });
  });

  document.getElementById("library-create-toggle")?.addEventListener("click", () => {
    const panel = document.getElementById("library-create-panel");
    const next = Boolean(panel?.hidden);
    if (next) resetLibraryForm();
    setLibraryCreatePanelOpen(next, "create");
  });
  document.getElementById("library-create-close")?.addEventListener("click", () => {
    resetLibraryForm();
    setLibraryCreatePanelOpen(false);
  });

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
      setLibraryCreatePanelOpen(false);
      await loadLibrary();
    } catch (err) {
      addLog("e", `Erreur enregistrement texture : ${err.message}`);
    }
  });

  document.getElementById("library-cancel-btn")?.addEventListener("click", () => {
    resetLibraryForm();
    setLibraryCreatePanelOpen(false);
  });

  document.getElementById("library-delete-name-input")?.addEventListener("input", syncLibraryDeleteConfirmState);
  document.getElementById("library-delete-name-input")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const confirmBtn = document.getElementById("library-delete-confirm-btn");
      if (confirmBtn && !confirmBtn.disabled && pendingLibraryDelete) {
        void performLibraryDelete(pendingLibraryDelete);
      }
    }
    if (event.key === "Escape") closeLibraryDeleteModal();
  });
  document.getElementById("library-delete-confirm-btn")?.addEventListener("click", () => {
    if (!pendingLibraryDelete) return;
    const input = document.getElementById("library-delete-name-input");
    if (!input || input.value.trim().toLowerCase() !== String(pendingLibraryDelete.name || "").toLowerCase()) {
      syncLibraryDeleteConfirmState();
      return;
    }
    void performLibraryDelete(pendingLibraryDelete);
  });
  document.querySelectorAll("[data-library-delete-cancel]").forEach((el) => {
    el.addEventListener("click", closeLibraryDeleteModal);
  });
  document.addEventListener("keydown", (event) => {
    const modal = document.getElementById("library-delete-modal");
    if (event.key === "Escape" && modal && !modal.hidden) closeLibraryDeleteModal();
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
      if (!res.ok || res.status === 204) {
        if (!document.getElementById("release-date-local")?.value) setReleaseDateValue(new Date());
        return;
      }
      const data = await res.json();
      const verInput = document.getElementById("release-version");
      const urlInput = document.getElementById("release-url");
      const sigInput = document.getElementById("release-signature");
      if (verInput && data.version) verInput.value = data.version;
      if (data.pub_date) setReleaseDateValue(data.pub_date);
      else if (!document.getElementById("release-date-local")?.value) setReleaseDateValue(new Date());
      const platform = data.platforms?.["windows-x86_64"];
      if (urlInput && platform?.url) urlInput.value = platform.url;
      if (sigInput && platform?.signature) sigInput.value = platform.signature;
      const notesInput = document.getElementById("release-notes");
      if (notesInput && data.notes) notesInput.value = data.notes;
    } catch {
      if (!document.getElementById("release-date-local")?.value) setReleaseDateValue(new Date());
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

  document.getElementById("release-date-local")?.addEventListener("change", () => {
    syncReleaseDateFromLocal();
  });
  document.getElementById("release-date-now-btn")?.addEventListener("click", () => {
    setReleaseDateValue(new Date());
    addLog("i", "Date de publication mise à maintenant.");
  });
  document.getElementById("clear-release-sig-btn")?.addEventListener("click", () => {
    const sigInput = document.getElementById("release-signature");
    if (!sigInput) return;
    sigInput.value = "";
    sigInput.focus();
  });
  document.getElementById("release-published")?.addEventListener("change", syncReleaseSaveButton);
  syncReleaseSaveButton();

  document.getElementById("generate-release-btn")?.addEventListener("click", () => {
    const version = document.getElementById("release-version").value.trim();
    if (!version) {
      addLog("e", "Indique une version avant de générer le manifeste.");
      document.getElementById("release-version")?.focus();
      return;
    }
    const pubDate = syncReleaseDateFromLocal() || setReleaseDateValue(new Date());
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
      if (!version) {
        addLog("e", "Indique une version avant d’enregistrer.");
        document.getElementById("release-version")?.focus();
        return;
      }
      const artifactUrl = directReleaseUrl(document.getElementById("release-url").value, version);
      if (!artifactUrl) {
        addLog("e", "Indique l’URL de l’installateur .exe.");
        document.getElementById("release-url")?.focus();
        return;
      }
      document.getElementById("release-url").value = artifactUrl;
      const isPublished = document.getElementById("release-published").checked;
      if (isPublished && !confirm(`Publier immédiatement la v${version} pour l’app et le site client ?`)) {
        return;
      }
      syncReleaseDateFromLocal();
      const result = await adminRequest("release-upsert", {
        version,
        artifactUrl,
        signature: document.getElementById("release-signature").value.trim(),
        notes: document.getElementById("release-notes").value.trim(),
        published: isPublished
      });
      let logMsg = isPublished ? "Release publiée pour les clients." : "Release enregistrée en brouillon.";
      if (isPublished && result?.discordNotice?.success) {
        logMsg += " 📢 Patchnote publié sur Discord.";
      } else if (isPublished && result?.discordNotice?.error) {
        logMsg += " ⚠️ Publication Discord : " + result.discordNotice.error;
      }
      addLog("s", logMsg);
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
        setSupportComposerVisible(false);
      } catch (reason) { addLog("e", `Erreur de clôture : ${String(reason)}`); }
    });

    document.getElementById("support-delete-btn")?.addEventListener("click", async () => {
      if (!activeTicketId) return;
      if (!confirm("Supprimer définitivement ce ticket et tous ses messages ?")) return;
      const deletedId = activeTicketId;
      try {
        await adminRequest("support-delete", { id: deletedId });
        clearSupportSelection();
        await loadSupport();
        addLog("i", "Ticket support supprimé.");
      } catch (reason) { addLog("e", `Erreur de suppression : ${String(reason)}`); }
    });

    document.getElementById("contacts-mark-read-btn")?.addEventListener("click", async () => {
      if (!activeContactId) return;
      try {
        await adminRequest("contact-update", { id: activeContactId, status: "read" });
        await loadContacts();
      } catch (reason) { addLog("e", `Erreur : ${String(reason)}`); }
    });

    document.getElementById("contacts-archive-btn")?.addEventListener("click", async () => {
      if (!activeContactId) return;
      try {
        await adminRequest("contact-update", { id: activeContactId, status: "archived" });
        await loadContacts();
      } catch (reason) { addLog("e", `Erreur : ${String(reason)}`); }
    });

    document.getElementById("contacts-delete-btn")?.addEventListener("click", async () => {
      if (!activeContactId) return;
      if (!confirm("Supprimer définitivement ce message ?")) return;
      try {
        await adminRequest("contact-delete", { id: activeContactId });
        clearContactsSelection();
        await loadContacts();
        addLog("i", "Message contact supprimé.");
      } catch (reason) { addLog("e", `Erreur de suppression : ${String(reason)}`); }
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

  const filterTabs = document.querySelectorAll("#panel-support .filter-tab");
  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      filterTabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      ticketFilter = tab.dataset.filter;
      renderTickets();
    });
  });

  // Contacts Inbox Filters
  const contactsSearchInput = document.getElementById("contacts-search-input");
  if (contactsSearchInput) {
    contactsSearchInput.addEventListener("input", (e) => {
      contactSearch = e.target.value.toLowerCase().trim();
      renderContacts();
    });
  }

  const contactFilterTabs = document.querySelectorAll("#panel-contacts .filter-tab");
  contactFilterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      contactFilterTabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      contactFilter = tab.dataset.contactFilter;
      renderContacts();
    });
  });

  const activitySearchInput = document.getElementById("activity-search-input");
  if (activitySearchInput) {
    activitySearchInput.addEventListener("input", (e) => {
      activitySearch = e.target.value.toLowerCase().trim();
      renderActivityFeed();
    });
  }

  const activityFilterTabs = document.querySelectorAll("#panel-activity .filter-tab");
  activityFilterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activityFilterTabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      activityFilter = tab.dataset.activityFilter;
      renderActivityFeed();
    });
  });

  const auditSearchInput = document.getElementById("audit-search-input");
  if (auditSearchInput) {
    auditSearchInput.addEventListener("input", (e) => {
      auditSearch = e.target.value.toLowerCase().trim();
      renderAuditTable();
    });
  }

  const auditFilterTabs = document.querySelectorAll("#panel-audit .filter-tab");
  auditFilterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      auditFilterTabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      auditFilter = tab.dataset.auditFilter;
      renderAuditTable();
    });
  });

  const teamSearchInput = document.getElementById("team-search-input");
  if (teamSearchInput) {
    teamSearchInput.addEventListener("input", (e) => {
      teamSearch = e.target.value.toLowerCase().trim();
      renderTeamTable();
    });
  }

  const teamFilterTabs = document.querySelectorAll("#panel-team .filter-tab");
  teamFilterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      teamFilterTabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      teamFilter = tab.dataset.teamFilter;
      renderTeamTable();
    });
  });

  setInterval(refreshKpis, 8000);
})();
