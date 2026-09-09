(function () {
  const client = typeof window !== "undefined" && typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null;
  const isPreviewParam =
    typeof window !== "undefined" &&
    typeof window.location !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "1" &&
    (/^(localhost|127\.0\.0\.1|tauri\.localhost)$/.test(window.location.hostname) ||
      window.location.protocol === "file:");

  if ((!client && !isPreviewParam) || typeof window === "undefined") {
    console.error("Supabase ou SR_CONFIG manquant.");
    return;
  }

  const loadingEl = document.getElementById("loading");
  const contentEl = document.getElementById("dashboard-content");
  const userEmailEl = document.getElementById("user-email");
  const userRoleEl = document.getElementById("user-role");
  const userTierEl = document.getElementById("user-tier");
  const userStatusEl = document.getElementById("user-status");
  const overviewTierEl = document.getElementById("overview-tier-label");
  const aiQuotaCopyEl = document.getElementById("ai-quota-copy");
  const aiQuotaMetaEl = document.getElementById("ai-quota-meta");
  const aiQuotaFillEl = document.getElementById("ai-quota-meter-fill");
  const aiQuotaRefreshBtn = document.getElementById("ai-quota-refresh");
  const manageBillingBtn = document.getElementById("manage-billing-btn");
  const billingErrorEl = document.getElementById("billing-error");
  const logoutBtn = document.getElementById("logout-btn");
  const upgradeButtons = document.querySelectorAll("[data-upgrade-tier]");
  const downloadLink = document.getElementById("download-app-link");
  const avatarEl = document.getElementById("profile-avatar-char");
  const appVersionEls = document.querySelectorAll("[data-app-version]");
  const discordNameEl = document.getElementById("discord-account-name");
  const discordNoteEl = document.getElementById("discord-account-note");
  const discordStatusEl = document.getElementById("discord-account-status");
  const discordLinkBtn = document.getElementById("discord-link-btn");
  const discordSyncBtn = document.getElementById("discord-sync-btn");
  const discordRecoveryLink = document.getElementById("discord-recovery-link");
  const accountMessageEl = document.getElementById("account-action-message");
  const accountGlobalBannerEl = document.getElementById("account-global-banner");
  const deleteStartBtn = document.getElementById("delete-account-start");
  const deleteConfirmationEl = document.getElementById("delete-account-confirmation");
  const deleteEmailInput = document.getElementById("delete-account-email");
  const deleteCancelBtn = document.getElementById("delete-account-cancel");
  const deleteConfirmBtn = document.getElementById("delete-account-confirm");
  const discordRequiredModal = document.getElementById("discord-required-modal");
  const discordRequiredDialog =
    discordRequiredModal && typeof discordRequiredModal.querySelector === "function"
      ? discordRequiredModal.querySelector(".discord-required-dialog")
      : null;
  const discordRequiredMessage = document.getElementById("discord-required-message");
  const discordRequiredJoin = document.getElementById("discord-required-join");
  const discordRequiredRetry = document.getElementById("discord-required-retry");
  const discordRequiredClose = document.getElementById("discord-required-close");

  const TIER_LABELS = {
    free: "Gratuit",
    standard: "Standard",
    pro: "Pro",
    premium: "Premium",
  };

  const AI_TEXTURE_DAILY_LIMIT = {
    free: 10,
    standard: 100,
    pro: 250,
    premium: 500,
  };

  let currentSession = null;
  let currentTier = "free";
  let currentEmail = "";
  let currentIdentities = [];
  let discordActionInFlight = false;
  let recoveryPreviousFocus = null;
  let activeTicketChannel = null;

  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.hidden = false;
    document.body.classList.add("aww-modal-open");
    if (window.__srLenis && typeof window.__srLenis.stop === "function") {
      window.__srLenis.stop();
    }
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.hidden = true;
    if (activeTicketChannel && client && modalEl.id === "web-ticket-chat-modal") {
      try {
        client.removeChannel(activeTicketChannel);
      } catch (_) {}
      activeTicketChannel = null;
    }
    const anyModalOpen = Boolean(
      document.querySelector(".aww-modal-backdrop:not([hidden]), .liquid-checkout-backdrop[style*='display: flex'], #discord-required-modal:not([hidden])")
    );
    if (!anyModalOpen) {
      document.body.classList.remove("aww-modal-open");
      if (window.__srLenis && typeof window.__srLenis.start === "function") {
        window.__srLenis.start();
      }
    }
  }

  function showShell() {
    if (loadingEl) {
      loadingEl.classList.add("fade-out");
      setTimeout(function() {
        loadingEl.style.display = "none";
      }, 450);
    }
    if (contentEl) {
      contentEl.style.display = "block";
      contentEl.removeAttribute("hidden");
    }
    window.requestAnimationFrame(function () {
      if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === "function") {
        window.ScrollTrigger.refresh();
      }
      if (window.__srLenis && typeof window.__srLenis.resize === "function") {
        window.__srLenis.resize();
      }
      const sidebar = document.querySelector(".aww-dash-sidebar");
      const dashContent = document.querySelector(".aww-dash-content");
      if (sidebar) {
        sidebar.style.opacity = "1";
        sidebar.style.transform = "none";
      }
      if (dashContent) {
        dashContent.style.opacity = "1";
        dashContent.style.transform = "none";
      }
    });
  }

  function showLoadingError(message) {
    if (!loadingEl) return;
    loadingEl.innerHTML =
      '<div class="portal-loading-spinner"></div><span style="max-width: 440px; text-align: center; line-height: 1.5; margin-bottom: 1.5rem;">' +
      escapeHtml(message) +
      '</span><a href="login.html" class="aww-btn aww-btn-outline" style="border-radius: 100px; padding: 0.75rem 1.75rem; text-decoration: none; font-family: var(--font-heading); text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.04em;">Retour à la connexion</a>';
    loadingEl.style.display = "flex";
  }

  function showBillingError(message) {
    if (!billingErrorEl) return;
    billingErrorEl.textContent = message;
    billingErrorEl.style.display = "block";
  }

  function discordIdentity() {
    return currentIdentities.find((identity) => identity.provider === "discord") || null;
  }

  function redirectToLogin(message, code) {
    const query = new URLSearchParams();
    if (message) query.set("notice", message);
    if (code) query.set("notice_code", code);
    const target = "login.html" + (query.size ? "?" + query.toString() : "");
    window.location.replace(target);
  }

  function safeNextPath() {
    const next = window.localStorage.getItem("sr-editer:discord-signin-next") ||
      new URLSearchParams(window.location.search).get("next");
    if (!next || !/^[a-zA-Z0-9._-]+\.html([?#].*)?$/.test(next)) return null;
    return next === "dashboard.html" ? null : next;
  }

  function getDiscordErrorMessage(error) {
    const message = error && error.message ? error.message : "";
    if (error && error.code === "DISCORD_MEMBERSHIP_REQUIRED") {
      return "Rejoins le serveur Discord SR Editer, accepte le règlement, puis relance la connexion.";
    }
    if (error && error.code === "DISCORD_RULES_REQUIRED") {
      return "Accepte le règlement sur le serveur Discord pour obtenir le rôle Membre, puis réessaie.";
    }
    if (/resource owner|authorization server denied|access[_ ]denied/i.test(message)) {
      return "Connexion Discord annulée. Tu peux réessayer quand tu veux.";
    }
    if (/unsupported provider|provider is not enabled/i.test(message)) {
      return "La connexion Discord n'est pas encore activée sur le serveur.";
    }
    if (/invalid session|session required/i.test(message)) {
      return "Ta session a expiré. Recommence la connexion.";
    }
    return message || "Impossible de gérer la liaison Discord.";
  }

  function discordRecoveryKind(message) {
    if (/accepte le règlement/i.test(message || "")) return "rules";
    if (/rejoins le serveur discord/i.test(message || "")) return "membership";
    return null;
  }

  function closeDiscordRequiredModal() {
    if (!discordRequiredModal || discordRequiredModal.hidden) return;
    document.body.classList.remove("discord-modal-open");
    closeModal(discordRequiredModal);
    if (recoveryPreviousFocus && typeof recoveryPreviousFocus.focus === "function") {
      recoveryPreviousFocus.focus();
    }
    recoveryPreviousFocus = null;
  }

  function openDiscordRequiredModal(message, kind, inviteUrl) {
    if (!discordRequiredModal || !kind || !inviteUrl) return;
    recoveryPreviousFocus = document.activeElement;
    if (discordRequiredMessage) discordRequiredMessage.textContent = message;
    if (discordRequiredJoin) {
      discordRequiredJoin.href = inviteUrl;
      discordRequiredJoin.textContent = kind === "rules" ? "Ouvrir le règlement Discord" : "Rejoindre le Discord";
    }
    if (discordRequiredRetry) {
      discordRequiredRetry.textContent = kind === "rules" ? "J’ai accepté, réessayer" : "J’ai rejoint, réessayer";
    }
    document.body.classList.add("discord-modal-open");
    openModal(discordRequiredModal);
    window.requestAnimationFrame(function () {
      if (discordRequiredJoin) discordRequiredJoin.focus();
      else if (discordRequiredDialog) discordRequiredDialog.focus();
    });
  }

  function showAccountMessage(message, state) {
    const st = state || "info";
    if (accountMessageEl) {
      accountMessageEl.textContent = message;
      accountMessageEl.dataset.state = st;
      accountMessageEl.hidden = !message;
    }
    if (accountGlobalBannerEl) {
      accountGlobalBannerEl.textContent = message;
      accountGlobalBannerEl.dataset.state = st;
      accountGlobalBannerEl.hidden = !message;
      accountGlobalBannerEl.style.display = message ? "flex" : "none";
    }
    if (discordRecoveryLink) {
      const inviteUrl = String(window.SR_CONFIG.discordInviteUrl || "").trim();
      const rulesUrl = String(window.SR_CONFIG.discordRulesUrl || "").trim();
      const kind = discordRecoveryKind(message);
      const targetUrl = kind === "rules" ? (rulesUrl || inviteUrl) : inviteUrl;
      const visible = Boolean(targetUrl && state === "error" && kind);
      discordRecoveryLink.hidden = !visible;
      if (visible) {
        discordRecoveryLink.href = targetUrl;
        discordRecoveryLink.textContent = kind === "rules" ? "Ouvrir le règlement Discord" : "Rejoindre le Discord";
        openDiscordRequiredModal(message, kind, targetUrl);
      } else {
        closeDiscordRequiredModal();
      }
    }
  }

  function renderDiscordConnection() {
    const identity = discordIdentity();
    const data = (identity && identity.identity_data) || {};
    const displayName = data.full_name || data.name || data.user_name || "Compte Discord";
    const canUnlink = Boolean(identity && currentIdentities.length > 1);

    if (discordNameEl) discordNameEl.textContent = identity ? displayName : "Aucun compte lié";
    if (discordStatusEl) {
      discordStatusEl.textContent = identity ? "Lié" : "Non lié";
      discordStatusEl.dataset.state = identity ? "active" : "idle";
    }
    if (discordNoteEl) {
      discordNoteEl.textContent = identity
        ? canUnlink
          ? "Ton rôle est synchronisé avec ton offre. Tu peux délier Discord à tout moment."
          : "Ton rôle est synchronisé. Discord reste lié car il s'agit de ton unique moyen de connexion."
        : "Lie Discord pour synchroniser automatiquement ton rôle avec ton abonnement.";
    }
    if (discordLinkBtn) {
      discordLinkBtn.textContent = identity ? "Délier Discord" : "Lier Discord";
      discordLinkBtn.disabled = false;
      discordLinkBtn.title = identity && !canUnlink
        ? "Discord est ton unique moyen de connexion et ne peut pas être délié."
        : "";
    }
    if (discordSyncBtn) {
      discordSyncBtn.hidden = !identity;
      discordSyncBtn.style.display = identity ? "" : "none";
    }
  }

  async function invokeAccountAction(action, confirmation) {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    const accessToken = sessionData && sessionData.session && sessionData.session.access_token;
    if (sessionError || !accessToken) {
      throw new Error("La session Discord n'a pas pu être validée. Relance la connexion Discord.");
    }
    const { data, error } = await client.functions.invoke("account-management", {
      body: Object.assign({ action: action }, confirmation ? { confirmation: confirmation } : {}),
      headers: { Authorization: "Bearer " + accessToken },
    });
    if (error) {
      let message = error.message || "Action impossible.";
      let code = "";
      if (error.context && typeof error.context.json === "function") {
        const payload = await error.context.json().catch(() => null);
        if (payload && payload.error) message = payload.error;
        if (payload && payload.code) code = payload.code;
      }
      const accountError = new Error(message);
      accountError.code = code;
      throw accountError;
    }
    if (data && data.error) {
      const accountError = new Error(data.error);
      accountError.code = data.code || "";
      throw accountError;
    }
    return data;
  }

  function syncPlanButtons() {
    upgradeButtons.forEach((btn) => {
      const tier = btn.getAttribute("data-upgrade-tier");
      const card = btn.closest("[data-plan]");
      if (tier === currentTier) {
        btn.disabled = true;
        btn.textContent = "Plan actuel";
        if (card) card.classList.add("is-current");
      } else {
        btn.disabled = false;
        btn.textContent = "S\u2019abonner " + (TIER_LABELS[tier] || tier);
        if (card) card.classList.remove("is-current");
      }
    });
  }


  function formatQuotaReset(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_err) {
      return iso;
    }
  }

  function renderAiQuotaFallback() {
    const limit = AI_TEXTURE_DAILY_LIMIT[currentTier] || AI_TEXTURE_DAILY_LIMIT.free;
    if (aiQuotaCopyEl) {
      aiQuotaCopyEl.innerHTML =
        "<strong>" +
        limit +
        "</strong> / jour inclus avec l'offre " +
        (TIER_LABELS[currentTier] || currentTier);
    }
    if (aiQuotaMetaEl) {
      aiQuotaMetaEl.textContent =
        "Gratuit 10 · Standard 100 · Pro 250 · Premium 500 (reset minuit UTC).";
    }
    if (aiQuotaFillEl) aiQuotaFillEl.style.width = "0%";
  }

  async function loadAiTextureQuota() {
    if (!client || !currentSession) {
      renderAiQuotaFallback();
      return;
    }
    if (aiQuotaCopyEl) aiQuotaCopyEl.textContent = "Chargement du quota…";
    try {
      const { data, error } = await client.functions.invoke("ai-texture-edit", {
        body: { action: "status" },
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      const quota = data && data.quota ? data.quota : null;
      if (!quota || typeof quota.limit !== "number") {
        renderAiQuotaFallback();
        return;
      }
      const used = Number(quota.used) || 0;
      const limit = Math.max(1, Number(quota.limit) || 1);
      const remaining = typeof quota.remaining === "number" ? quota.remaining : Math.max(0, limit - used);
      if (aiQuotaFillEl) {
        aiQuotaFillEl.style.width = Math.min(100, (used / limit) * 100) + "%";
      }
      if (aiQuotaCopyEl) {
        aiQuotaCopyEl.innerHTML =
          "<strong>" +
          remaining +
          "</strong> restante" +
          (remaining > 1 ? "s" : "") +
          " aujourd'hui · " +
          used +
          "/" +
          limit +
          " utilisées";
      }
      if (aiQuotaMetaEl) {
        aiQuotaMetaEl.textContent =
          "Reset : " +
          formatQuotaReset(quota.resetsAt) +
          " · Offre " +
          (TIER_LABELS[quota.tier] || TIER_LABELS[currentTier] || currentTier);
      }
    } catch (err) {
      console.warn("Quota IA indisponible:", err);
      renderAiQuotaFallback();
      if (aiQuotaMetaEl) {
        aiQuotaMetaEl.textContent =
          "Quota live indisponible pour le moment — limite indicative de ton offre.";
      }
    }
  }

  function applyProfile(email, profile, user) {
    const prof = profile || {};
    currentTier = prof.subscription_tier || "free";
    currentEmail = email;
    currentIdentities = (user && user.identities) || [];
    const tierLabel = TIER_LABELS[currentTier] || currentTier;

    if (userEmailEl) userEmailEl.textContent = email;
    if (avatarEl) {
      const meta = (user && user.user_metadata) || {};
      const discordIdObj = ((user && user.identities) || []).find(function (identity) {
        return identity.provider === "discord";
      });
      const discordData = (discordIdObj && discordIdObj.identity_data) || {};
      let avatarUrl =
        meta.avatar_url ||
        meta.picture ||
        discordData.avatar_url ||
        null;
      if (!avatarUrl && discordData.avatar && (discordData.id || discordIdObj?.id)) {
        avatarUrl = "https://cdn.discordapp.com/avatars/" + (discordData.id || discordIdObj.id) + "/" + discordData.avatar + ".png";
      }
      if (avatarUrl) {
        avatarEl.classList.add("has-image");
        const cleanUrl = String(avatarUrl).replace(/"/g, "");
        const initialChar = (email || "?").charAt(0).toUpperCase();
        avatarEl.innerHTML =
          '<img src="' +
          cleanUrl +
          '" alt="" referrerpolicy="no-referrer" onerror="this.parentElement.classList.remove(\'has-image\'); this.parentElement.textContent=\'' +
          initialChar +
          '\';">';
      } else {
        avatarEl.classList.remove("has-image");
        avatarEl.textContent = (email || "?").charAt(0).toUpperCase();
      }
    }
    if (userRoleEl) {
      userRoleEl.textContent = (prof.role || "membre").toUpperCase();
      userRoleEl.hidden = false;
      userRoleEl.removeAttribute("hidden");
    }
    if (userTierEl) {
      userTierEl.textContent = tierLabel.toUpperCase();
      userTierEl.className = "aww-badge tier-badge " + currentTier;
    }
    if (overviewTierEl) overviewTierEl.textContent = tierLabel;
    if (userStatusEl) {
      userStatusEl.textContent = prof.subscription_status
        ? "Statut Stripe : " + prof.subscription_status
        : currentTier === "free"
          ? "Aucun abonnement actif — choisis un plan."
          : "Abonnement actif.";
    }

    const version = window.SR_CONFIG.appVersion || "0.4.0";
    appVersionEls.forEach((el) => {
      el.textContent = "v" + version;
    });

    if (downloadLink && window.SR_CONFIG.downloadUrl) {
      downloadLink.href = window.SR_CONFIG.downloadUrl;
    }

    const adminLink = document.getElementById("portal-admin-link");
    if (adminLink) {
      const showAdmin = prof.role === "admin";
      adminLink.hidden = !showAdmin;
      if (showAdmin) adminLink.removeAttribute("hidden");
      else adminLink.setAttribute("hidden", "");
    }

    const headerPortalBtn = document.querySelector(".aww-header-actions .aww-btn");
    if (headerPortalBtn) {
      headerPortalBtn.href = "dashboard.html";
      const textSpan = headerPortalBtn.querySelector(".aww-btn-text");
      if (textSpan) textSpan.textContent = "COMPTE";
    }
    const navPortalMobile = document.querySelector(".aww-nav-portal-mobile");
    if (navPortalMobile) {
      navPortalMobile.href = "dashboard.html";
      const inner = navPortalMobile.querySelector(".aww-link-inner");
      if (inner) {
        inner.textContent = "COMPTE";
        inner.setAttribute("data-hover", "COMPTE");
      }
    }

    syncPlanButtons();
    renderDiscordConnection();
    if (user && user.id) loadWebSupportTickets(user.id);
    void loadAiTextureQuota();
  }

  let activeWebTicket = null;

  async function loadWebSupportTickets(userId) {
    const listEl = document.getElementById("web-tickets-list-container");
    const badgeEl = document.getElementById("web-ticket-count-badge");
    if (!listEl || !client) return;

    try {
      const { data, error } = await client
        .from("support_tickets")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        renderTicketsList([]);
        return;
      }
      renderTicketsList(data);
    } catch (err) {
      const badgeEl = document.getElementById("web-ticket-count-badge");
      if (badgeEl) badgeEl.textContent = "0 Ticket";
      if (listEl) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 18px; color: rgba(255, 255, 255, 0.5); font-size: 12px;">
            Aucun ticket en cours pour le moment.
          </div>
        `;
      }
    }
  }

  function renderTicketsList(data) {
    const listEl = document.getElementById("web-tickets-list-container");
    const badgeEl = document.getElementById("web-ticket-count-badge");
    if (!listEl) return;

    if (!data || data.length === 0) {
      if (badgeEl) badgeEl.textContent = "0 Ticket";
      listEl.innerHTML = `
        <div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.5); font-size: 13px;">
          <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.8);">Aucun ticket en cours</p>
          <p style="margin: 0; font-size: 12px;">Cliquez sur "+ Nouveau Ticket" pour demander de l'aide à l'équipe support.</p>
        </div>
      `;
      return;
    }

    if (badgeEl) badgeEl.textContent = data.length + " Ticket(s)";

    const statusMap = {
      open: { label: "Ouvert", color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)" },
      pending: { label: "En attente", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)" },
      closed: { label: "Clos", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)" }
    };

    window.__webTicketsData = data;

    listEl.innerHTML = data.map(function(t, idx) {
      const st = statusMap[t.status] || statusMap.open;
      const dateStr = new Date(t.updated_at || t.created_at).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      const safeSubject = escapeHtml(t.subject || "Sans titre");
      const ticketArg = t.id ? "'" + t.id + "'" : idx;
      return `
        <div class="aww-ticket-card">
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 14px; font-weight: 700; color: #ffffff; margin-bottom: 3px; word-break: break-word;">${safeSubject}</div>
            <div style="font-size: 12px; color: rgba(255, 255, 255, 0.5);">Activité : ${dateStr}</div>
          </div>
          <div class="aww-ticket-card-actions">
            <span style="font-size: 11px; background: ${st.bg}; color: ${st.color}; padding: 3px 10px; border-radius: 12px; font-weight: 700; border: 1px solid ${st.color}40; white-space: nowrap;">
              ${st.label}
            </span>
            <button type="button" class="ticket-action-btn" onclick="window.openWebTicketChat(${ticketArg})">
              Consulter &amp; Répondre
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderMockSupportTickets() {
    const mockData = [
      {
        id: "mock-1",
        subject: "Question sur les générations IA Texture & formats DDS",
        status: "open",
        priority: "normal",
        updated_at: new Date(Date.now() - 3600000).toISOString(),
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "mock-2",
        subject: "Demande d'informations sur l'export UV 4K",
        status: "closed",
        priority: "low",
        updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      }
    ];
    renderTicketsList(mockData);
  }

  window.openWebTicketChat = function(ticketIdOrIdx) {
    let ticket = null;
    if (typeof ticketIdOrIdx === "number") {
      ticket = window.__webTicketsData && window.__webTicketsData[ticketIdOrIdx];
    } else if (typeof ticketIdOrIdx === "string") {
      ticket = window.__webTicketsData && window.__webTicketsData.find(function(t) {
        return String(t.id) === String(ticketIdOrIdx);
      });
    }
    if (!ticket) return;
    activeWebTicket = ticket;

    const modal = document.getElementById("web-ticket-chat-modal");
    const subjectEl = document.getElementById("web-chat-ticket-subject");
    const statusPill = document.getElementById("web-chat-ticket-status-pill");
    const replyInput = document.getElementById("web-reply-message");
    const replyBtn = document.getElementById("submit-ticket-reply-btn");
    const replyErrorEl = document.getElementById("web-ticket-reply-error");
    if (replyErrorEl) replyErrorEl.style.display = "none";

    if (subjectEl) subjectEl.textContent = ticket.subject || "Ticket #" + String(ticket.id).slice(0, 8);
    if (statusPill) {
      const isClosed = ticket.status === "closed";
      const isPending = ticket.status === "pending";
      statusPill.textContent = isClosed ? "Clos" : isPending ? "En attente" : "Ouvert";
      statusPill.style.background = isClosed ? "rgba(148, 163, 184, 0.2)" : isPending ? "rgba(56, 189, 248, 0.2)" : "rgba(34, 197, 94, 0.2)";
      statusPill.style.color = isClosed ? "#94a3b8" : isPending ? "#38bdf8" : "#4ade80";
      statusPill.style.border = isClosed ? "1px solid rgba(148, 163, 184, 0.4)" : isPending ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid rgba(34, 197, 94, 0.4)";
    }

    if (replyInput && replyBtn) {
      if (ticket.status === "closed") {
        replyInput.disabled = true;
        replyInput.placeholder = "Ce ticket est résolu et marqué comme clos par l'assistance.";
        replyBtn.disabled = true;
        replyBtn.style.opacity = "0.5";
        replyBtn.style.cursor = "not-allowed";
      } else {
        replyInput.disabled = false;
        replyInput.placeholder = "Écrire votre réponse... (Entrée pour envoyer)";
        replyBtn.disabled = false;
        replyBtn.style.opacity = "1";
        replyBtn.style.cursor = "pointer";
      }
    }

    // Realtime support messages subscription
    if (activeTicketChannel && client) {
      try { client.removeChannel(activeTicketChannel); } catch (_) {}
      activeTicketChannel = null;
    }

    if (client && ticket && ticket.id && !String(ticket.id).startsWith("mock-")) {
      try {
        activeTicketChannel = client
          .channel("web-ticket-chat-" + ticket.id)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "support_messages",
              filter: "ticket_id=eq." + ticket.id,
            },
            function () {
              loadWebTicketMessages(ticket.id);
            }
          )
          .subscribe();
      } catch (subErr) {
        console.warn("Realtime chat subscription error:", subErr);
      }
    }

    openModal(modal);
    loadWebTicketMessages(ticket.id);
  };

  function renderTicketMessages(messages, container) {
    if (!messages || messages.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.5); font-size: 13px; padding: 20px;">Aucun message dans cette discussion.</div>';
      return;
    }

    container.innerHTML = messages.map(function(msg) {
      const isAdmin = msg.author_kind === "admin" || msg.author_kind === "staff";
      const alignSelf = isAdmin ? "flex-start" : "flex-end";
      const bg = isAdmin 
        ? "rgba(255, 255, 255, 0.05)" 
        : "rgba(56, 189, 248, 0.12)";
      
      const border = isAdmin 
        ? "rgba(255, 255, 255, 0.1)" 
        : "rgba(56, 189, 248, 0.35)";
      
      const textColor = "#f1f5f9";
      const metaColor = "rgba(255, 255, 255, 0.6)";
      const boxSh = "0 4px 14px rgba(0, 0, 0, 0.25)";

      const borderRadius = isAdmin ? "10px 10px 10px 3px" : "10px 10px 3px 10px";
      const authorLabel = isAdmin ? "Support SR Editer" : "Vous";
      const avatarBg = isAdmin ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.12)";
      const avatarContent = isAdmin 
        ? '<span style="color: #38bdf8; font-weight: 800;">SR</span>' 
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
      const timeStr = new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

      return `
        <div style="display: flex; gap: 12px; flex-direction: ${isAdmin ? 'row' : 'row-reverse'}; max-width: 88%; align-self: ${alignSelf}; margin-bottom: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 10px; background: ${avatarBg}; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 800; color: #fff; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            ${avatarContent}
          </div>
          <div style="display: flex; flex-direction: column; align-items: ${isAdmin ? 'flex-start' : 'flex-end'}; max-width: calc(100% - 44px);">
            <div style="font-size: 11px; font-weight: 700; color: ${metaColor}; margin-bottom: 4px; padding: 0 2px;">
              ${authorLabel} <span style="font-weight: 400; opacity: 0.85;">• ${timeStr}</span>
            </div>
            <div class="aww-chat-bubble" style="background: ${bg}; border: 1px solid ${border}; padding: 10px 16px; border-radius: ${borderRadius}; color: ${textColor}; font-size: 13.5px; line-height: 1.5; word-break: break-word; white-space: pre-wrap; box-shadow: ${boxSh}; min-width: 50px; text-align: left;">
              ${escapeHtml(msg.content)}
            </div>
          </div>
        </div>
      `;
    }).join("");

    window.requestAnimationFrame(function() {
      container.scrollTop = container.scrollHeight;
    });
  }

  async function loadWebTicketMessages(ticketId) {
    const container = document.getElementById("web-chat-messages-container");
    if (!container) return;

    if (String(ticketId).startsWith("mock-")) {
      const mockMsgs = [
        {
          id: "m-1",
          author_kind: "user",
          author_user_id: "preview-user-123",
          content: "Bonjour, comment fonctionne l'exportation des textures DDS avec le nouvel atlas UV 4K ?",
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "m-2",
          author_kind: "staff",
          author_user_id: "staff-1",
          content: "Bonjour ! Depuis la version 0.7.1, l'atelier gère nativement le format BC7 sans perte avec calcul dynamique des mipmaps. Vous pouvez exporter directement via le bouton Télécharger.",
          created_at: new Date(Date.now() - 1800000).toISOString(),
        }
      ];
      renderTicketMessages(mockMsgs, container);
      return;
    }

    if (!client) return;
    container.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.5); font-size: 13px; padding: 20px;">Chargement des messages...</div>';

    try {
      const { data, error } = await client
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      renderTicketMessages(data || [], container);
    } catch (err) {
      container.innerHTML = '<div style="text-align: center; color: #ef4444; font-size: 13px; padding: 20px;">Erreur lors du chargement de la discussion.</div>';
    }
  }

  function escapeHtml(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  async function init() {
    const searchParams = new URLSearchParams(window.location.search);
    const isLocalPreview =
      searchParams.get("preview") === "1" &&
      (/^(localhost|127\.0\.0\.1|tauri\.localhost)$/.test(window.location.hostname) ||
        window.location.protocol === "file:");

    if (isLocalPreview) {
      applyProfile("preview@sr-editer.com", {
        subscription_tier: "free",
        subscription_status: null,
        role: "membre",
      }, { id: "preview-user-123", email: "preview@sr-editer.com" });
      renderMockSupportTickets();
      showShell();
      return;
    }

    const oauthParams = new URLSearchParams(window.location.search);
    const oauthError = oauthParams.get("error_description") || oauthParams.get("error");
    if (oauthError) {
      window.localStorage.removeItem("sr-editer:discord-signin-pending");
      window.localStorage.removeItem("sr-editer:discord-signin-next");
      window.localStorage.removeItem("sr-editer:discord-link-pending");
      await client.auth.signOut({ scope: "local" }).catch(function () {});
      redirectToLogin(getDiscordErrorMessage(new Error(oauthError)));
      return;
    }

    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    if (error || !session) {
      window.location.href = "login.html";
      return;
    }

    currentSession = session;

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("subscription_tier, subscription_status, role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (profileError) {
      console.warn("Erreur profil Supabase:", profileError);
    }

    const userProfile = profile || {
      subscription_tier: "free",
      subscription_status: null,
      role: "membre",
    };

    if (userProfile.role === "suspendu") {
      await client.auth.signOut({ scope: "local" });
      redirectToLogin("Ce compte est suspendu. Contacte un administrateur.");
      return;
    }

    const { data: identityData } = await client.auth.getUserIdentities().catch(() => ({ data: { identities: [] } }));
    const freshUser = Object.assign({}, session.user, {
      identities: (identityData && identityData.identities) || session.user.identities || [],
    });
    currentIdentities = freshUser.identities;

    // Show dashboard immediately!
    applyProfile(session.user.email || "", userProfile, freshUser);
    showShell();

    const params = new URLSearchParams(window.location.search);
    const returnedSessionId = params.get("session_id");
    const checkoutStatus = params.get("status");

    if (returnedSessionId && (checkoutStatus === "success" || !checkoutStatus)) {
      client.functions.invoke("stripe-checkout", {
        body: { action: "verify", session_id: returnedSessionId },
      }).then(({ data: verifyData }) => {
        if (verifyData && verifyData.success && verifyData.tier) {
          userProfile.subscription_tier = verifyData.tier;
          userProfile.subscription_status = "active";
          applyProfile(session.user.email || "", userProfile, freshUser);
          showAccountMessage(`Votre abonnement ${TIER_LABELS[verifyData.tier] || verifyData.tier} a été activé avec succès ! 🎉`, "success");
        }
      }).catch((vErr) => console.warn("Vérification checkout session:", vErr));
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const discordSignInPending =
      window.localStorage.getItem("sr-editer:discord-signin-pending") === "1" ||
      params.get("discord_auth") === "1";
    const discordLinkPending = window.localStorage.getItem("sr-editer:discord-link-pending") === "1";
    
    if (discordSignInPending || (!discordLinkPending && discordIdentity())) {
      invokeAccountAction("sync-discord").catch((discordError) => {
        console.warn("Discord sync warning:", discordError);
      });
    }

    if (discordLinkPending && discordIdentity()) {
      try {
        await invokeAccountAction("sync-discord");
        showAccountMessage("Compte Discord lié et rôle synchronisé.", "success");
      } catch (syncError) {
        const identity = discordIdentity();
        if (identity && currentIdentities.length > 1) {
          await client.auth.unlinkIdentity(identity).catch(function () {});
          const { data } = await client.auth.getUserIdentities();
          currentIdentities = (data && data.identities) || [];
          renderDiscordConnection();
        }
        showAccountMessage(getDiscordErrorMessage(syncError), "error");
      } finally {
        window.localStorage.removeItem("sr-editer:discord-link-pending");
      }
    }

    // Affiche Admin aussi pour les superadmins sans role=admin
    const adminLink = document.getElementById("portal-admin-link");
    if (adminLink && userProfile.role !== "admin") {
      try {
        const functionName = window.SR_CONFIG.adminFunctionName || "admin-users";
        const { data } = await client.functions.invoke(functionName, {
          body: { action: "me" },
        });
        if (data && data.ok && data.level) {
          adminLink.hidden = false;
          adminLink.removeAttribute("hidden");
        }
      } catch (_err) {
        /* ignore */
      }
    }
  }


  if (aiQuotaRefreshBtn) {
    aiQuotaRefreshBtn.addEventListener("click", function () {
      void loadAiTextureQuota();
    });
  }

  if (manageBillingBtn) {
    manageBillingBtn.addEventListener("click", async () => {
      manageBillingBtn.disabled = true;
      const original = manageBillingBtn.textContent;
      manageBillingBtn.textContent = "Redirection...";
      if (billingErrorEl) billingErrorEl.style.display = "none";

      try {
        const { data: sessData } = await client.auth.getSession();
        if (sessData && sessData.session) currentSession = sessData.session;

        const { data, error } = await client.functions.invoke("stripe-customer-portal", {
          body: { return_url: window.location.href },
        });

        if (error) {
          let detailedMsg = error.message;
          if (error.context && typeof error.context.json === "function") {
            try {
              const body = await error.context.json();
              if (body && body.error) detailedMsg = body.error;
            } catch (_) {}
          }
          throw new Error(detailedMsg);
        }
        if (data && data.error) throw new Error(data.error);
        if (data && data.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error("Lien de redirection introuvable.");
      } catch (err) {
        showBillingError(
          (err && err.message) ||
            "Vous n'avez pas encore d'abonnement Stripe actif. Choisissez une formule ci-dessous (Standard, Pro ou Premium) pour démarrer.",
        );
        manageBillingBtn.disabled = false;
        manageBillingBtn.textContent = original;
      }
    });
  }

  let activeEmbeddedCheckout = null;
  const liquidModalEl = document.getElementById("liquid-checkout-modal");
  const liquidCloseBtnEl = document.getElementById("liquid-checkout-close-btn");
  const liquidContainerEl = document.getElementById("stripe-embedded-checkout-container");
  const liquidLoadingEl = document.getElementById("liquid-checkout-loading");
  const liquidErrorEl = document.getElementById("liquid-checkout-error");
  const liquidTitleEl = document.getElementById("liquid-checkout-plan-title");
  const liquidPriceEl = document.getElementById("liquid-checkout-plan-price");
  const liquidDirectLinkEl = document.getElementById("liquid-checkout-direct-link");

  const PLAN_METADATA = {
    standard: { title: "Abonnement SR Editer Standard", price: "9,99 € <span>/ mois</span>" },
    pro: { title: "Abonnement SR Editer Pro", price: "24,99 € <span>/ mois</span>" },
    premium: { title: "Abonnement SR Editer Premium", price: "49,99 € <span>/ mois</span>" },
  };

  function closeLiquidCheckoutModal() {
    if (activeEmbeddedCheckout && typeof activeEmbeddedCheckout.destroy === "function") {
      try { activeEmbeddedCheckout.destroy(); } catch (_) {}
    }
    if (activeEmbeddedCheckout && typeof activeEmbeddedCheckout.unmount === "function") {
      try { activeEmbeddedCheckout.unmount(); } catch (_) {}
    }
    activeEmbeddedCheckout = null;
    if (liquidModalEl) liquidModalEl.style.display = "none";
    if (liquidContainerEl) liquidContainerEl.innerHTML = "";
    if (liquidLoadingEl) liquidLoadingEl.style.display = "none";
    if (liquidErrorEl) liquidErrorEl.style.display = "none";
  }

  if (liquidCloseBtnEl) {
    liquidCloseBtnEl.addEventListener("click", closeLiquidCheckoutModal);
  }
  if (liquidModalEl) {
    liquidModalEl.addEventListener("click", (e) => {
      if (e.target === liquidModalEl) closeLiquidCheckoutModal();
    });
  }

  upgradeButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tier = btn.getAttribute("data-upgrade-tier");
      if (!tier || !currentSession) return;

      if (billingErrorEl) billingErrorEl.style.display = "none";
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = "Redirection vers Stripe...";

      try {
        const { data: sessData } = await client.auth.getSession();
        if (sessData && sessData.session) currentSession = sessData.session;
        if (!currentSession) {
          throw new Error("Session expirée. Veuillez vous re-connecter à votre compte.");
        }

        const { data, error } = await client.functions.invoke("stripe-checkout", {
          body: { tier: tier, return_url: window.location.href, embedded: false },
        });

        if (error) {
          let detailedMsg = error.message;
          if (error.context && typeof error.context.json === "function") {
            try {
              const body = await error.context.json();
              if (body && body.error) detailedMsg = body.error;
            } catch (_) {}
          }
          throw new Error(detailedMsg);
        }
        if (data && data.error) throw new Error(data.error);

        if (data && data.url) {
          window.location.href = data.url;
          return;
        }

        throw new Error("Session de paiement introuvable.");
      } catch (err) {
        console.error(err);
        const errorMsg = (err && err.message) || "Impossible de démarrer le paiement.";
        showBillingError(errorMsg);
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  });

  if (discordLinkBtn) {
    discordLinkBtn.addEventListener("click", async () => {
      if (discordActionInFlight) return;
      discordActionInFlight = true;
      const identity = discordIdentity();
      discordLinkBtn.disabled = true;
      showAccountMessage("", "info");
      try {
        if (!identity) {
          window.localStorage.setItem("sr-editer:discord-link-pending", "1");
          const { error } = await client.auth.linkIdentity({
            provider: "discord",
            options: { redirectTo: window.location.origin + "/dashboard.html" },
          });
          if (error) throw error;
          return;
        }

        if (currentIdentities.length <= 1) {
          throw new Error("Discord est ton unique moyen de connexion : cette identité ne peut pas être déliée.");
        }
        await invokeAccountAction("prepare-discord-unlink");
        const { error } = await client.auth.unlinkIdentity(identity);
        if (error) throw error;
        const { data } = await client.auth.getUserIdentities();
        currentIdentities = (data && data.identities) || [];
        renderDiscordConnection();
        showAccountMessage("Compte Discord délié et rôles retirés.", "success");
      } catch (error) {
        window.localStorage.removeItem("sr-editer:discord-link-pending");
        showAccountMessage(getDiscordErrorMessage(error), "error");
      } finally {
        discordActionInFlight = false;
        renderDiscordConnection();
      }
    });
  }

  if (discordRequiredClose) discordRequiredClose.addEventListener("click", closeDiscordRequiredModal);
  if (discordRequiredModal) {
    discordRequiredModal.addEventListener("mousedown", function (event) {
      if (event.target === discordRequiredModal) closeDiscordRequiredModal();
    });
  }
  if (discordRequiredRetry) {
    discordRequiredRetry.addEventListener("click", function () {
      closeDiscordRequiredModal();
      if (discordIdentity() && discordSyncBtn) discordSyncBtn.click();
      else if (discordLinkBtn) discordLinkBtn.click();
    });
  }
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      const chatModalEl = document.getElementById("web-ticket-chat-modal");
      if (chatModalEl && !chatModalEl.hidden) {
        event.preventDefault();
        closeModal(chatModalEl);
        return;
      }
      const createModalEl = document.getElementById("web-create-ticket-modal");
      if (createModalEl && !createModalEl.hidden) {
        event.preventDefault();
        closeModal(createModalEl);
        return;
      }
      if (discordRequiredModal && !discordRequiredModal.hidden) {
        event.preventDefault();
        closeDiscordRequiredModal();
        return;
      }
    }
    if (!discordRequiredModal || discordRequiredModal.hidden) return;
    if (event.key === "Tab" && discordRequiredDialog) {
      const focusable = Array.from(discordRequiredDialog.querySelectorAll("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  if (discordSyncBtn) {
    discordSyncBtn.addEventListener("click", async () => {
      discordSyncBtn.disabled = true;
      showAccountMessage("Synchronisation en cours...", "info");
      try {
        await invokeAccountAction("sync-discord");
        showAccountMessage("Rôle Discord synchronisé avec ton offre.", "success");
      } catch (error) {
        showAccountMessage(getDiscordErrorMessage(error), "error");
      } finally {
        discordSyncBtn.disabled = false;
      }
    });
  }

  if (deleteStartBtn && deleteConfirmationEl && deleteEmailInput) {
    deleteStartBtn.addEventListener("click", () => {
      deleteStartBtn.hidden = true;
      deleteConfirmationEl.hidden = false;
      deleteEmailInput.focus();
    });
    deleteEmailInput.addEventListener("input", () => {
      if (deleteConfirmBtn) {
        deleteConfirmBtn.disabled = deleteEmailInput.value.trim().toLowerCase() !== currentEmail.toLowerCase();
      }
    });
  }

  if (deleteCancelBtn && deleteConfirmationEl && deleteStartBtn && deleteEmailInput) {
    deleteCancelBtn.addEventListener("click", () => {
      deleteConfirmationEl.hidden = true;
      deleteStartBtn.hidden = false;
      deleteEmailInput.value = "";
      if (deleteConfirmBtn) deleteConfirmBtn.disabled = true;
    });
  }

  if (deleteConfirmBtn && deleteEmailInput) {
    deleteConfirmBtn.addEventListener("click", async () => {
      if (deleteEmailInput.value.trim().toLowerCase() !== currentEmail.toLowerCase()) return;
      deleteConfirmBtn.disabled = true;
      deleteConfirmBtn.textContent = "Suppression...";
      showAccountMessage("Annulation de l'abonnement et suppression du compte...", "info");
      try {
        await invokeAccountAction("delete-account", deleteEmailInput.value.trim());
        await client.auth.signOut({ scope: "local" });
        window.location.href = "login.html?notice=" + encodeURIComponent("Ton compte a été supprimé.");
      } catch (error) {
        showAccountMessage(error.message || "Impossible de supprimer le compte.", "error");
        deleteConfirmBtn.disabled = false;
        deleteConfirmBtn.textContent = "Supprimer définitivement";
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await client.auth.signOut();
      window.location.href = "login.html";
    });
  }

  // --- WEB TICKET CREATION & CHAT LISTENERS ---
  const openNewBtn = document.getElementById("open-new-ticket-modal-btn");
  const closeNewBtn = document.getElementById("close-new-ticket-modal-btn");
  const cancelNewBtn = document.getElementById("cancel-new-ticket-modal-btn");
  const createModal = document.getElementById("web-create-ticket-modal");

  if (openNewBtn && createModal) {
    openNewBtn.addEventListener("click", function() {
      openModal(createModal);
    });
  }
  if (closeNewBtn && createModal) {
    closeNewBtn.addEventListener("click", function() { closeModal(createModal); });
  }
  if (cancelNewBtn && createModal) {
    cancelNewBtn.addEventListener("click", function() { closeModal(createModal); });
  }

  if (createModal) {
    createModal.addEventListener("click", function (e) {
      if (e.target === createModal) closeModal(createModal);
    });
  }

  const closeChatBtn = document.getElementById("close-ticket-chat-modal-btn");
  const chatModal = document.getElementById("web-ticket-chat-modal");
  if (closeChatBtn && chatModal) {
    closeChatBtn.addEventListener("click", function() { closeModal(chatModal); });
  }
  if (chatModal) {
    chatModal.addEventListener("click", function (e) {
      if (e.target === chatModal) closeModal(chatModal);
    });
  }

  const createForm = document.getElementById("web-create-ticket-form");
  if (createForm) {
    createForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      const subjectInput = document.getElementById("web-ticket-subject");
      const prioritySelect = document.getElementById("web-ticket-priority");
      const messageInput = document.getElementById("web-ticket-message");
      const errorEl = document.getElementById("web-create-ticket-error");
      const submitBtn = document.getElementById("submit-new-ticket-btn");

      if (!subjectInput || !messageInput || !client || !currentSession) return;

      const subject = subjectInput.value.trim();
      const priority = prioritySelect ? prioritySelect.value : "normal";
      const message = messageInput.value.trim();

      if (!subject || !message) return;

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Création..."; }
      if (errorEl) errorEl.style.display = "none";

      try {
        // 1. Insert into support_tickets
        const { data: ticket, error: ticketError } = await client
          .from("support_tickets")
          .insert({
            user_id: currentSession.user.id,
            email: currentSession.user.email,
            subject: subject,
            priority: priority,
            status: "open"
          })
          .select()
          .single();

        if (ticketError) throw ticketError;

        // 2. Insert into support_messages
        const { error: msgError } = await client
          .from("support_messages")
          .insert({
            ticket_id: ticket.id,
            author_user_id: currentSession.user.id,
            author_kind: "user",
            content: message
          });

        if (msgError) throw msgError;

        subjectInput.value = "";
        messageInput.value = "";
        if (createModal) closeModal(createModal);
        loadWebSupportTickets(currentSession.user.id);
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message || "Erreur lors de la création du ticket.";
          errorEl.style.display = "block";
        }
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Envoyer le ticket"; }
      }
    });
  }

  const replyForm = document.getElementById("web-ticket-reply-form");
  const replyInput = document.getElementById("web-reply-message");

  if (replyInput && replyForm) {
    replyInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (typeof replyForm.requestSubmit === "function") {
          replyForm.requestSubmit();
        } else {
          const submitBtn = document.getElementById("submit-ticket-reply-btn");
          if (submitBtn) submitBtn.click();
        }
      }
    });
  }

  if (replyForm) {
    replyForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-ticket-reply-btn");
      if (!replyInput || !activeWebTicket || !client || !currentSession) return;

      const content = replyInput.value.trim();
      if (!content) return;

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Envoi..."; }

      const replyErrorEl = document.getElementById("web-ticket-reply-error");
      if (replyErrorEl) replyErrorEl.style.display = "none";

      try {
        if (String(activeWebTicket.id).startsWith("mock-")) {
          // Preview mode reply simulation
          const container = document.getElementById("web-chat-messages-container");
          if (container) {
            const newMsgHtml = `
              <div style="display: flex; gap: 12px; flex-direction: row-reverse; max-width: 88%; align-self: flex-end; margin-bottom: 8px;">
                <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(255, 255, 255, 0.12); display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 800; color: #fff; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; max-width: calc(100% - 44px);">
                  <div style="font-size: 11px; font-weight: 700; color: rgba(255, 255, 255, 0.6); margin-bottom: 4px; padding: 0 2px;">
                    Vous <span style="font-weight: 400; opacity: 0.85;">• À l'instant</span>
                  </div>
                  <div class="aww-chat-bubble" style="background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); padding: 10px 16px; border-radius: 10px 10px 3px 10px; color: #f1f5f9; font-size: 13.5px; line-height: 1.5; word-break: break-word; white-space: pre-wrap; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25); min-width: 50px; text-align: left;">
                    ${escapeHtml(content)}
                  </div>
                </div>
              </div>
            `;
            container.insertAdjacentHTML("beforeend", newMsgHtml);
            window.requestAnimationFrame(function() {
              container.scrollTop = container.scrollHeight;
            });
          }
          replyInput.value = "";
          return;
        }

        const { error: msgError } = await client
          .from("support_messages")
          .insert({
            ticket_id: activeWebTicket.id,
            author_user_id: currentSession.user.id,
            author_kind: "user",
            content: content
          });

        if (msgError) throw msgError;

        // Try touching ticket status; if RLS restricts client update, database trigger handles it
        await client
          .from("support_tickets")
          .update({ status: "open", updated_at: new Date().toISOString() })
          .eq("id", activeWebTicket.id)
          .catch(function () {});

        replyInput.value = "";
        loadWebTicketMessages(activeWebTicket.id);
        loadWebSupportTickets(currentSession.user.id);
      } catch (err) {
        if (replyErrorEl) {
          replyErrorEl.textContent = "Erreur lors de l'envoi de la réponse : " + (err.message || String(err));
          replyErrorEl.style.display = "block";
        } else {
          console.error("Erreur réponse ticket:", err);
        }
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Envoyer"; }
      }
    });
  }

  init();
})();
