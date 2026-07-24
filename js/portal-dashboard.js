(function () {
  const client = typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null;
  if (!client || !window.SR_CONFIG) {
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
  const deleteStartBtn = document.getElementById("delete-account-start");
  const deleteConfirmationEl = document.getElementById("delete-account-confirmation");
  const deleteEmailInput = document.getElementById("delete-account-email");
  const deleteCancelBtn = document.getElementById("delete-account-cancel");
  const deleteConfirmBtn = document.getElementById("delete-account-confirm");
  const discordRequiredModal = document.getElementById("discord-required-modal");
  const discordRequiredDialog = discordRequiredModal && discordRequiredModal.querySelector(".discord-required-dialog");
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

  let currentSession = null;
  let currentTier = "free";
  let currentEmail = "";
  let currentIdentities = [];
  let discordActionInFlight = false;
  let recoveryPreviousFocus = null;

  function showShell() {
    if (loadingEl) loadingEl.style.display = "none";
    if (contentEl) {
      contentEl.style.display = "flex";
      contentEl.removeAttribute("hidden");
    }
  }

  function showLoadingError(message) {
    if (!loadingEl) return;
    loadingEl.innerHTML =
      '<div class="portal-loading-spinner"></div><span>' +
      message +
      "</span>";
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
    discordRequiredModal.hidden = true;
    document.body.classList.remove("discord-modal-open");
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
    discordRequiredModal.hidden = false;
    document.body.classList.add("discord-modal-open");
    window.requestAnimationFrame(function () {
      if (discordRequiredJoin) discordRequiredJoin.focus();
      else if (discordRequiredDialog) discordRequiredDialog.focus();
    });
  }

  function showAccountMessage(message, state) {
    if (!accountMessageEl) return;
    accountMessageEl.textContent = message;
    accountMessageEl.dataset.state = state || "info";
    accountMessageEl.hidden = !message;
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
    if (discordSyncBtn) discordSyncBtn.hidden = !identity;
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

  function applyProfile(email, profile, user) {
    currentTier = profile.subscription_tier || "free";
    currentEmail = email;
    currentIdentities = (user && user.identities) || [];
    const tierLabel = TIER_LABELS[currentTier] || currentTier;

    if (userEmailEl) userEmailEl.textContent = email;
    if (avatarEl) {
      const meta = (user && user.user_metadata) || {};
      const avatarUrl =
        meta.avatar_url ||
        meta.picture ||
        ((user && user.identities) || []).find(function (identity) {
          return identity.provider === "discord";
        })?.identity_data?.avatar_url ||
        null;
      if (avatarUrl) {
        avatarEl.classList.add("has-image");
        avatarEl.innerHTML =
          '<img src="' +
          String(avatarUrl).replace(/"/g, "") +
          '" alt="" referrerpolicy="no-referrer">';
      } else {
        avatarEl.classList.remove("has-image");
        avatarEl.textContent = (email || "?").charAt(0).toUpperCase();
      }
    }
    if (userRoleEl) userRoleEl.textContent = profile.role || "membre";
    if (userTierEl) {
      userTierEl.textContent = tierLabel.toUpperCase();
      userTierEl.className = "tier-badge " + currentTier;
    }
    if (overviewTierEl) overviewTierEl.textContent = tierLabel;
    if (userStatusEl) {
      userStatusEl.textContent = profile.subscription_status
        ? "Statut Stripe : " + profile.subscription_status
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
      const showAdmin = profile.role === "admin";
      adminLink.hidden = !showAdmin;
      if (showAdmin) adminLink.removeAttribute("hidden");
      else adminLink.setAttribute("hidden", "");
    }

    syncPlanButtons();
    renderDiscordConnection();
    if (user && user.id) loadWebSupportTickets(user.id);
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
        pending: { label: "En attente", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)" },
        closed: { label: "Clos", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)" }
      };

      window.__webTicketsData = data;

      listEl.innerHTML = data.map(function(t, idx) {
        const st = statusMap[t.status] || statusMap.open;
        const dateStr = new Date(t.updated_at || t.created_at).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; margin-bottom: 8px;">
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: #ffffff; margin-bottom: 2px;">${t.subject || "Sans titre"}</div>
              <div style="font-size: 11px; color: rgba(255, 255, 255, 0.5);">Activité : ${dateStr}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 11px; background: ${st.bg}; color: ${st.color}; padding: 3px 10px; border-radius: 12px; font-weight: 700; border: 1px solid ${st.color}40;">
                ${st.label}
              </span>
              <button type="button" onclick="window.openWebTicketChat(${idx})" style="background: rgba(255, 0, 124, 0.15); color: #ff007c; border: 1px solid rgba(255, 0, 124, 0.35); padding: 5px 12px; border-radius: 6px; font-size: 11.5px; font-weight: 700; cursor: pointer;">
                Consulter &amp; Répondre
              </button>
            </div>
          </div>
        `;
      }).join("");
    } catch (err) {
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

  window.openWebTicketChat = function(idx) {
    const ticket = window.__webTicketsData && window.__webTicketsData[idx];
    if (!ticket) return;
    activeWebTicket = ticket;

    const modal = document.getElementById("web-ticket-chat-modal");
    const subjectEl = document.getElementById("web-chat-ticket-subject");
    const statusPill = document.getElementById("web-chat-ticket-status-pill");
    const replyInput = document.getElementById("web-reply-message");
    const replyBtn = document.getElementById("submit-ticket-reply-btn");

    if (subjectEl) subjectEl.textContent = ticket.subject || "Ticket #" + ticket.id.slice(0, 8);
    if (statusPill) {
      const isClosed = ticket.status === "closed";
      const isPending = ticket.status === "pending";
      statusPill.textContent = isClosed ? "Clos" : isPending ? "En attente" : "Ouvert";
      statusPill.style.background = isClosed ? "rgba(148, 163, 184, 0.2)" : isPending ? "rgba(168, 85, 247, 0.2)" : "rgba(34, 197, 94, 0.2)";
      statusPill.style.color = isClosed ? "#94a3b8" : isPending ? "#c084fc" : "#4ade80";
      statusPill.style.border = isClosed ? "1px solid rgba(148, 163, 184, 0.4)" : isPending ? "1px solid rgba(168, 85, 247, 0.4)" : "1px solid rgba(34, 197, 94, 0.4)";
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
        replyInput.placeholder = "Écrire votre réponse...";
        replyBtn.disabled = false;
        replyBtn.style.opacity = "1";
        replyBtn.style.cursor = "pointer";
      }
    }

    if (modal) modal.hidden = false;
    loadWebTicketMessages(ticket.id);
  };

  async function loadWebTicketMessages(ticketId) {
    const container = document.getElementById("web-chat-messages-container");
    if (!container || !client) return;
    container.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.5); font-size: 13px; padding: 20px;">Chargement des messages...</div>';

    try {
      const { data, error } = await client
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.5); font-size: 13px; padding: 20px;">Aucun message dans cette discussion.</div>';
        return;
      }

      container.innerHTML = data.map(function(msg) {
        const isAdmin = msg.author_kind === "admin" || msg.author_kind === "staff";
        const alignSelf = isAdmin ? "flex-start" : "flex-end";
        const bg = isAdmin 
          ? "linear-gradient(135deg, rgba(139, 92, 246, 0.22) 0%, rgba(99, 102, 241, 0.14) 100%)" 
          : "linear-gradient(135deg, rgba(255, 0, 124, 0.22) 0%, rgba(217, 0, 104, 0.14) 100%)";
        const border = isAdmin ? "rgba(139, 92, 246, 0.35)" : "rgba(255, 0, 124, 0.35)";
        const borderRadius = isAdmin ? "14px 14px 14px 4px" : "14px 14px 4px 14px";
        const authorLabel = isAdmin ? "Support SR Editer" : "Vous";
        const avatarBg = isAdmin ? "linear-gradient(135deg, #a855f7, #6366f1)" : "linear-gradient(135deg, #ff007c, #d90068)";
        const avatarContent = isAdmin 
          ? "SR" 
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        const timeStr = new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

        return `
          <div style="display: flex; gap: 10px; flex-direction: ${isAdmin ? 'row' : 'row-reverse'}; max-width: 85%; align-self: ${alignSelf}; margin-bottom: 6px;">
            <div style="width: 32px; height: 32px; border-radius: 10px; background: ${avatarBg}; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 800; color: #fff; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
              ${avatarContent}
            </div>
            <div style="display: flex; flex-direction: column; align-items: ${isAdmin ? 'flex-start' : 'flex-end'};">
              <div style="font-size: 11px; font-weight: 700; color: rgba(255, 255, 255, 0.55); margin-bottom: 4px; padding: 0 2px;">
                ${authorLabel} <span style="font-weight: 400; opacity: 0.7;">• ${timeStr}</span>
              </div>
              <div style="background: ${bg}; border: 1px solid ${border}; padding: 11px 16px; border-radius: ${borderRadius}; color: #ffffff; font-size: 13.5px; line-height: 1.55; word-break: break-word; box-shadow: 0 6px 20px rgba(0,0,0,0.25);">
                ${escapeHtml(msg.content)}
              </div>
            </div>
          </div>
        `;
      }).join("");

      container.scrollTop = container.scrollHeight;
    } catch (err) {
      container.innerHTML = '<div style="text-align: center; color: #ef4444; font-size: 13px; padding: 20px;">Erreur lors du chargement de la discussion.</div>';
    }
  }

  function escapeHtml(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  async function init() {
    const isLocalPreview =
      new URLSearchParams(window.location.search).get("preview") === "1" &&
      /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

    if (isLocalPreview) {
      applyProfile("preview@sr-editer.com", {
        subscription_tier: "free",
        subscription_status: null,
        role: "user",
      }, null);
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

    if (profileError || !profile) {
      showLoadingError(
        "Ce compte n'a pas de profil SR Editer. Contacte un administrateur.",
      );
      return;
    }

    if (profile.role === "suspendu") {
      await client.auth.signOut({ scope: "local" });
      redirectToLogin("Ce compte est suspendu. Contacte un administrateur.");
      return;
    }

    const { data: identityData } = await client.auth.getUserIdentities();
    const freshUser = Object.assign({}, session.user, {
      identities: (identityData && identityData.identities) || session.user.identities || [],
    });
    currentIdentities = freshUser.identities;

    const params = new URLSearchParams(window.location.search);
    const discordSignInPending =
      window.localStorage.getItem("sr-editer:discord-signin-pending") === "1" ||
      params.get("discord_auth") === "1";
    const discordLinkPending = window.localStorage.getItem("sr-editer:discord-link-pending") === "1";
    let existingDiscordError = null;
    if (discordSignInPending) {
      if (!discordIdentity()) {
        window.localStorage.removeItem("sr-editer:discord-signin-pending");
        window.localStorage.removeItem("sr-editer:discord-signin-next");
        await client.auth.signOut({ scope: "local" });
        redirectToLogin("Discord n'a pas renvoyé de compte utilisable.");
        return;
      }
      try {
        await invokeAccountAction("sync-discord");
      } catch (discordError) {
        window.localStorage.removeItem("sr-editer:discord-signin-pending");
        window.localStorage.removeItem("sr-editer:discord-signin-next");
        await client.auth.signOut({ scope: "local" });
        redirectToLogin(getDiscordErrorMessage(discordError), discordError.code);
        return;
      }

      const nextPath = safeNextPath();
      window.localStorage.removeItem("sr-editer:discord-signin-pending");
      window.localStorage.removeItem("sr-editer:discord-signin-next");
      if (nextPath) {
        window.location.replace(nextPath);
        return;
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (!discordLinkPending && discordIdentity()) {
      try {
        await invokeAccountAction("sync-discord");
      } catch (discordError) {
        const accessRejected = discordError.code === "DISCORD_MEMBERSHIP_REQUIRED" ||
          discordError.code === "DISCORD_RULES_REQUIRED";
        const identity = discordIdentity();
        if (identity && currentIdentities.length > 1 && accessRejected) {
          await client.auth.unlinkIdentity(identity).catch(function () {});
          const { data } = await client.auth.getUserIdentities();
          currentIdentities = (data && data.identities) || [];
          freshUser.identities = currentIdentities;
          existingDiscordError = getDiscordErrorMessage(discordError);
        } else if (currentIdentities.length <= 1) {
          await client.auth.signOut({ scope: "local" });
          redirectToLogin(getDiscordErrorMessage(discordError), discordError.code);
          return;
        } else {
          existingDiscordError = getDiscordErrorMessage(discordError);
        }
      }
    }

    applyProfile(session.user.email || "", profile, freshUser);
    showShell();

    if (existingDiscordError) showAccountMessage(existingDiscordError, "error");

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
    if (adminLink && profile.role !== "admin") {
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

  if (manageBillingBtn) {
    manageBillingBtn.addEventListener("click", async () => {
      manageBillingBtn.disabled = true;
      const original = manageBillingBtn.textContent;
      manageBillingBtn.textContent = "Redirection...";
      if (billingErrorEl) billingErrorEl.style.display = "none";

      try {
        const { data, error } = await client.functions.invoke("stripe-customer-portal", {
          body: { return_url: window.location.href },
        });

        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        if (data && data.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error("Lien de redirection introuvable.");
      } catch (err) {
        console.error(err);
        showBillingError(
          (err && err.message) ||
            "Impossible d'accéder au portail. Souscris d'abord à un plan.",
        );
        manageBillingBtn.disabled = false;
        manageBillingBtn.textContent = original;
      }
    });
  }

  upgradeButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tier = btn.getAttribute("data-upgrade-tier");
      if (!tier || !currentSession) return;

      if (billingErrorEl) billingErrorEl.style.display = "none";
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = "Redirection Stripe...";

      try {
        const { data, error } = await client.functions.invoke("stripe-checkout", {
          body: { tier: tier, return_url: window.location.href },
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        if (data && data.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error("Session de paiement introuvable.");
      } catch (err) {
        console.error(err);
        showBillingError((err && err.message) || "Impossible de démarrer le paiement.");
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
    if (!discordRequiredModal || discordRequiredModal.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeDiscordRequiredModal();
      return;
    }
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
      createModal.hidden = false;
    });
  }
  if (closeNewBtn && createModal) {
    closeNewBtn.addEventListener("click", function() { createModal.hidden = true; });
  }
  if (cancelNewBtn && createModal) {
    cancelNewBtn.addEventListener("click", function() { createModal.hidden = true; });
  }

  const closeChatBtn = document.getElementById("close-ticket-chat-modal-btn");
  const chatModal = document.getElementById("web-ticket-chat-modal");
  if (closeChatBtn && chatModal) {
    closeChatBtn.addEventListener("click", function() { chatModal.hidden = true; });
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
        if (createModal) createModal.hidden = true;
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
  if (replyForm) {
    replyForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      const replyInput = document.getElementById("web-reply-message");
      const submitBtn = document.getElementById("submit-ticket-reply-btn");
      if (!replyInput || !activeWebTicket || !client || !currentSession) return;

      const content = replyInput.value.trim();
      if (!content) return;

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Envoi..."; }

      try {
        const { error: msgError } = await client
          .from("support_messages")
          .insert({
            ticket_id: activeWebTicket.id,
            author_user_id: currentSession.user.id,
            author_kind: "user",
            content: content
          });

        if (msgError) throw msgError;

        await client
          .from("support_tickets")
          .update({ status: "open", updated_at: new Date().toISOString() })
          .eq("id", activeWebTicket.id);

        replyInput.value = "";
        loadWebTicketMessages(activeWebTicket.id);
        loadWebSupportTickets(currentSession.user.id);
      } catch (err) {
        alert("Erreur lors de l'envoi de la réponse: " + (err.message || String(err)));
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Envoyer"; }
      }
    });
  }

  init();
})();
