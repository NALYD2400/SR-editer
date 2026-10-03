/* ==========================================================================
   SR Editer — Espace client (dashboard.html)
   Profil & abonnement, quota IA, liaison Discord, paiement Stripe,
   tickets de support (liste + discussion en temps réel), suppression du compte.
   Les onglets sont gérés par js/pages/dashboard-tabs.js.

   Aperçu local sans compte : dashboard?preview=1 (localhost uniquement),
   avec des tickets et messages fictifs.
   ========================================================================== */
(function () {
  const client = typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null;
  const config = window.SR_CONFIG || {};
  const isLocalPreview =
    new URLSearchParams(window.location.search).get("preview") === "1" &&
    (/^(localhost|127\.0\.0\.1|tauri\.localhost)$/.test(window.location.hostname) || window.location.protocol === "file:");

  if (!client && !isLocalPreview) {
    console.error("Supabase ou SR_CONFIG manquant.");
    return;
  }

  const $ = (id) => document.getElementById(id);

  const TIER_LABELS = { free: "Gratuit", standard: "Standard", pro: "Pro", premium: "Premium" };
  const AI_TEXTURE_DAILY_LIMIT = { free: 10, standard: 100, pro: 250, premium: 500 };
  const SUBSCRIPTION_STATUS_LABELS = {
    active: "Abonnement actif",
    trialing: "Période d'essai en cours",
    past_due: "Paiement en attente",
    unpaid: "Paiement non réglé",
    incomplete: "Paiement incomplet",
    incomplete_expired: "Paiement expiré",
    canceled: "Abonnement annulé",
    paused: "Abonnement en pause",
  };
  const TICKET_STATUS_LABELS = { open: "Ouvert", pending: "En attente", closed: "Clos" };
  const STORAGE = {
    signinPending: "sr-editer:discord-signin-pending",
    signinNext: "sr-editer:discord-signin-next",
    linkPending: "sr-editer:discord-link-pending",
  };

  let currentSession = null;
  let currentTier = "free";
  // Abonnements réservés aux testeurs tant que Stripe est en mode test
  // (le serveur applique la même règle) ; config.checkoutOpen = ouverture publique.
  let checkoutAllowed = Boolean(config && config.checkoutOpen);
  let currentEmail = "";
  let currentIdentities = [];
  let currentUser = null;
  let discordActionInFlight = false;
  let tickets = [];
  let activeTicket = null;
  let activeTicketChannel = null;

  // ── Utilitaires ──────────────────────────────────────────────────────────

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Message d'erreur le plus précis renvoyé par une Edge Function Supabase. */
  async function functionErrorMessage(error) {
    let message = error.message;
    let code = "";
    if (error.context && typeof error.context.json === "function") {
      const payload = await error.context.json().catch(() => null);
      if (payload && payload.error) message = payload.error;
      if (payload && payload.code) code = payload.code;
    }
    return { message: message, code: code };
  }

  function discordIdentity() {
    return currentIdentities.find((identity) => identity.provider === "discord") || null;
  }

  function redirectToLogin(message) {
    const query = new URLSearchParams();
    if (message) query.set("notice", message);
    window.location.replace("login.html" + (query.size ? "?" + query.toString() : ""));
  }

  // ── Modales (bloquent le scroll de la page tant qu'une est ouverte) ────────

  function isAnyModalOpen() {
    return Boolean(document.querySelector(".aww-modal-backdrop:not([hidden])"));
  }

  function lockScroll() {
    document.body.classList.add("aww-modal-open");
    if (window.__srLenis && typeof window.__srLenis.stop === "function") window.__srLenis.stop();
  }

  function unlockScrollIfIdle() {
    if (isAnyModalOpen()) return;
    document.body.classList.remove("aww-modal-open");
    if (window.__srLenis && typeof window.__srLenis.start === "function") window.__srLenis.start();
  }

  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.hidden = false;
    lockScroll();
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.hidden = true;
    if (modalEl.id === "web-ticket-chat-modal") unsubscribeFromTicket();
    unlockScrollIfIdle();
  }

  const discordModal = window.SRDiscord
    ? window.SRDiscord.createRequiredModal({
        onOpen: lockScroll,
        onClose: unlockScrollIfIdle,
        onRetry: function () {
          const syncBtn = $("discord-sync-btn");
          const linkBtn = $("discord-link-btn");
          if (discordIdentity() && syncBtn) syncBtn.click();
          else if (linkBtn) linkBtn.click();
        },
      })
    : { showFor: function () {}, close: function () {} };

  function discordErrorMessage(error) {
    return window.SRDiscord
      ? window.SRDiscord.errorMessage(error, "", "Impossible de gérer la liaison Discord.")
      : (error && error.message) || "Impossible de gérer la liaison Discord.";
  }

  // ── Affichage général ────────────────────────────────────────────────────

  function showShell() {
    const loadingEl = $("loading");
    if (loadingEl) {
      loadingEl.classList.add("fade-out");
      setTimeout(function () {
        loadingEl.hidden = true;
      }, 450);
    }
    const contentEl = $("dashboard-content");
    if (contentEl) contentEl.hidden = false;
    window.requestAnimationFrame(function () {
      if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === "function") window.ScrollTrigger.refresh();
      if (window.__srLenis && typeof window.__srLenis.resize === "function") window.__srLenis.resize();
    });
  }

  /** Message de compte (onglet Paramètres + bannière en haut du tableau de bord). */
  function showAccountMessage(message, state) {
    const st = state || "info";
    [$("account-action-message"), $("account-global-banner")].forEach(function (el) {
      if (!el) return;
      el.textContent = message;
      el.dataset.state = st;
      el.hidden = !message;
    });
    if (st === "error" && message) discordModal.showFor(message);
    else discordModal.close();
  }

  function setError(el, message) {
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("is-visible", Boolean(message));
  }

  // ── Profil & abonnement ──────────────────────────────────────────────────

  function renderAvatar(user, email) {
    const avatarEl = $("profile-avatar-char");
    if (!avatarEl) return;
    const meta = (user && user.user_metadata) || {};
    const discord = ((user && user.identities) || []).find((identity) => identity.provider === "discord");
    const discordData = (discord && discord.identity_data) || {};
    let avatarUrl = meta.avatar_url || meta.picture || discordData.avatar_url || null;
    if (!avatarUrl && discordData.avatar && (discordData.id || (discord && discord.id))) {
      avatarUrl = "https://cdn.discordapp.com/avatars/" + (discordData.id || discord.id) + "/" + discordData.avatar + ".png";
    }

    const initial = (email || "?").charAt(0).toUpperCase();
    avatarEl.textContent = initial;
    avatarEl.classList.toggle("has-image", Boolean(avatarUrl));
    if (!avatarUrl) return;

    const img = document.createElement("img");
    img.src = avatarUrl;
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.onerror = function () {
      avatarEl.classList.remove("has-image");
      avatarEl.textContent = initial;
    };
    avatarEl.textContent = "";
    avatarEl.appendChild(img);
  }

  function subscriptionStatusLabel(status) {
    if (status) return SUBSCRIPTION_STATUS_LABELS[status] || "Statut : " + status;
    return currentTier === "free" ? "Aucun abonnement actif — choisis un plan." : "Abonnement actif.";
  }

  function syncPlanButtons() {
    document.querySelectorAll("[data-upgrade-tier]").forEach((btn) => {
      const tier = btn.getAttribute("data-upgrade-tier");
      const card = btn.closest("[data-plan]");
      const isCurrent = tier === currentTier;
      btn.disabled = isCurrent || !checkoutAllowed;
      btn.textContent = isCurrent
        ? "Plan actuel"
        : checkoutAllowed ? "S’abonner " + (TIER_LABELS[tier] || tier) : "Bientôt disponible";
      if (card) card.classList.toggle("is-current", isCurrent);
    });
  }

  function applyProfile(email, profile, user) {
    const prof = profile || {};
    currentTier = prof.subscription_tier || "free";
    currentEmail = email;
    currentUser = user || currentUser;
    currentIdentities = (user && user.identities) || [];
    const tierLabel = TIER_LABELS[currentTier] || currentTier;

    if ($("user-email")) $("user-email").textContent = email;
    renderAvatar(user, email);

    const roleEl = $("user-role");
    if (roleEl) {
      roleEl.textContent = (prof.role || "membre").toUpperCase();
      roleEl.hidden = false;
    }
    const tierEl = $("user-tier");
    if (tierEl) {
      tierEl.textContent = tierLabel.toUpperCase();
      tierEl.className = "aww-badge tier-badge " + currentTier;
    }
    if ($("overview-tier-label")) $("overview-tier-label").textContent = tierLabel;
    if ($("user-status")) $("user-status").textContent = subscriptionStatusLabel(prof.subscription_status);

    const version = config.appVersion || "0.4.0";
    document.querySelectorAll("[data-app-version]").forEach((el) => {
      el.textContent = "v" + version;
    });
    const downloadLink = $("download-app-link");
    if (downloadLink && config.downloadUrl) downloadLink.href = config.downloadUrl;

    if ($("portal-admin-link")) $("portal-admin-link").hidden = prof.role !== "admin";
    if (typeof window.updateSRHeaderAuth === "function") window.updateSRHeaderAuth(user);

    syncPlanButtons();
    renderDiscordConnection();
    if (user && user.id && !isLocalPreview) loadTickets(user.id);
    void loadAiTextureQuota();
  }

  // ── Quota IA ─────────────────────────────────────────────────────────────

  function formatQuotaReset(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch (_err) {
      return iso;
    }
  }

  function renderAiQuota(copyHtml, meta, percentUsed) {
    if ($("ai-quota-copy")) $("ai-quota-copy").innerHTML = copyHtml;
    if ($("ai-quota-meta")) $("ai-quota-meta").textContent = meta;
    if ($("ai-quota-meter-fill")) $("ai-quota-meter-fill").style.width = percentUsed + "%";
  }

  /** Limite indicative de l'offre quand le quota en direct est indisponible. */
  function renderAiQuotaFallback(meta) {
    const limit = AI_TEXTURE_DAILY_LIMIT[currentTier] || AI_TEXTURE_DAILY_LIMIT.free;
    renderAiQuota(
      "<strong>" + limit + "</strong> / jour inclus avec l'offre " + escapeHtml(TIER_LABELS[currentTier] || currentTier),
      meta || "Gratuit 10 · Standard 100 · Pro 250 · Premium 500 (reset minuit UTC).",
      0
    );
  }

  async function loadAiTextureQuota() {
    if (!client || !currentSession) {
      renderAiQuotaFallback();
      return;
    }
    if ($("ai-quota-copy")) $("ai-quota-copy").textContent = "Chargement du quota…";
    try {
      const { data, error } = await client.functions.invoke("ai-texture-edit", { body: { action: "status" } });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      const quota = data && data.quota;
      if (!quota || typeof quota.limit !== "number") {
        renderAiQuotaFallback();
        return;
      }
      const used = Number(quota.used) || 0;
      const limit = Math.max(1, Number(quota.limit) || 1);
      const remaining = typeof quota.remaining === "number" ? quota.remaining : Math.max(0, limit - used);
      renderAiQuota(
        "<strong>" + remaining + "</strong> restante" + (remaining > 1 ? "s" : "") + " aujourd'hui · " + used + "/" + limit + " utilisées",
        "Reset : " + formatQuotaReset(quota.resetsAt) + " · Offre " + (TIER_LABELS[quota.tier] || TIER_LABELS[currentTier] || currentTier),
        Math.min(100, (used / limit) * 100)
      );
    } catch (err) {
      console.warn("Quota IA indisponible:", err);
      renderAiQuotaFallback("Quota live indisponible pour le moment — limite indicative de ton offre.");
    }
  }

  // ── Discord ──────────────────────────────────────────────────────────────

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
      const detail = await functionErrorMessage(error);
      const accountError = new Error(detail.message || "Action impossible.");
      accountError.code = detail.code;
      throw accountError;
    }
    if (data && data.error) {
      const accountError = new Error(data.error);
      accountError.code = data.code || "";
      throw accountError;
    }
    return data;
  }

  function renderDiscordConnection() {
    const identity = discordIdentity();
    const data = (identity && identity.identity_data) || {};
    const displayName = data.full_name || data.name || data.user_name || "Compte Discord";
    const canUnlink = Boolean(identity && currentIdentities.length > 1);

    if ($("discord-account-name")) $("discord-account-name").textContent = identity ? displayName : "Aucun compte lié";
    const statusEl = $("discord-account-status");
    if (statusEl) {
      statusEl.textContent = identity ? "Lié" : "Non lié";
      statusEl.dataset.state = identity ? "active" : "idle";
    }
    if ($("discord-account-note")) {
      $("discord-account-note").textContent = identity
        ? canUnlink
          ? "Ton rôle est synchronisé avec ton offre. Tu peux délier Discord à tout moment."
          : "Ton rôle est synchronisé. Discord reste lié car il s'agit de ton unique moyen de connexion."
        : "Lie Discord pour synchroniser automatiquement ton rôle avec ton abonnement.";
    }
    const linkBtn = $("discord-link-btn");
    if (linkBtn) {
      linkBtn.textContent = identity ? "Délier Discord" : "Lier Discord";
      linkBtn.disabled = false;
      linkBtn.title = identity && !canUnlink ? "Discord est ton unique moyen de connexion et ne peut pas être délié." : "";
    }
    if ($("discord-sync-btn")) $("discord-sync-btn").hidden = !identity;
    if (currentUser && typeof window.updateSRHeaderAuth === "function") window.updateSRHeaderAuth(currentUser);
  }

  async function refreshIdentities() {
    const { data } = await client.auth.getUserIdentities();
    currentIdentities = (data && data.identities) || [];
    if (currentUser) currentUser.identities = currentIdentities;
    renderDiscordConnection();
  }

  /** Après un retour de Discord : synchronise le rôle, ou finalise une liaison en attente. */
  async function handleDiscordReturn(params) {
    const signinPending = window.localStorage.getItem(STORAGE.signinPending) === "1" || params.get("discord_auth") === "1";
    const linkPending = window.localStorage.getItem(STORAGE.linkPending) === "1";

    if (signinPending || (!linkPending && discordIdentity())) {
      invokeAccountAction("sync-discord").catch((err) => console.warn("Discord sync warning:", err));
    }
    if (!linkPending || !discordIdentity()) return;

    try {
      await invokeAccountAction("sync-discord");
      showAccountMessage("Compte Discord lié et rôle synchronisé.", "success");
    } catch (syncError) {
      // Liaison refusée (pas membre / règlement) : on annule la liaison si possible
      const identity = discordIdentity();
      if (identity && currentIdentities.length > 1) {
        await client.auth.unlinkIdentity(identity).catch(function () {});
        await refreshIdentities();
      }
      showAccountMessage(discordErrorMessage(syncError), "error");
    } finally {
      window.localStorage.removeItem(STORAGE.linkPending);
    }
  }

  function bindDiscordButtons() {
    const linkBtn = $("discord-link-btn");
    const syncBtn = $("discord-sync-btn");

    if (linkBtn) {
      linkBtn.addEventListener("click", async () => {
        if (discordActionInFlight) return;
        discordActionInFlight = true;
        const identity = discordIdentity();
        linkBtn.disabled = true;
        showAccountMessage("", "info");
        try {
          if (!identity) {
            window.localStorage.setItem(STORAGE.linkPending, "1");
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
          await refreshIdentities();
          showAccountMessage("Compte Discord délié et rôles retirés.", "success");
        } catch (error) {
          window.localStorage.removeItem(STORAGE.linkPending);
          showAccountMessage(discordErrorMessage(error), "error");
        } finally {
          discordActionInFlight = false;
          renderDiscordConnection();
        }
      });
    }

    if (syncBtn) {
      syncBtn.addEventListener("click", async () => {
        syncBtn.disabled = true;
        showAccountMessage("Synchronisation en cours...", "info");
        try {
          await invokeAccountAction("sync-discord");
          showAccountMessage("Rôle Discord synchronisé avec ton offre.", "success");
        } catch (error) {
          showAccountMessage(discordErrorMessage(error), "error");
        } finally {
          syncBtn.disabled = false;
        }
      });
    }
  }

  // ── Paiement (Stripe) ────────────────────────────────────────────────────

  /** Appelle une fonction Stripe et redirige vers l'URL renvoyée. */
  async function redirectToStripe(functionName, body, button, busyLabel, fallbackError) {
    const billingErrorEl = $("billing-error");
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = busyLabel;
    setError(billingErrorEl, "");

    try {
      const { data: sessData } = await client.auth.getSession();
      if (sessData && sessData.session) currentSession = sessData.session;
      if (!currentSession) throw new Error("Session expirée. Veuillez vous re-connecter à votre compte.");

      const { data, error } = await client.functions.invoke(functionName, { body: body });
      if (error) throw new Error((await functionErrorMessage(error)).message);
      if (data && data.error) throw new Error(data.error);
      if (data && data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("Lien de paiement introuvable.");
    } catch (err) {
      console.error(err);
      setError(billingErrorEl, (err && err.message) || fallbackError);
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  function bindBilling() {
    const manageBtn = $("manage-billing-btn");
    if (manageBtn) {
      manageBtn.addEventListener("click", () => {
        redirectToStripe("stripe-customer-portal", { return_url: window.location.href }, manageBtn, "Redirection...",
          "Vous n'avez pas encore d'abonnement Stripe actif. Choisissez une formule ci-dessous (Standard, Pro ou Premium) pour démarrer.");
      });
    }

    document.querySelectorAll("[data-upgrade-tier]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tier = btn.getAttribute("data-upgrade-tier");
        if (!tier || !currentSession || !checkoutAllowed) return;
        redirectToStripe("stripe-checkout", { tier: tier, return_url: window.location.href, embedded: false }, btn, "Redirection vers Stripe...",
          "Impossible de démarrer le paiement.");
      });
    });
  }

  /** Retour de Stripe (?session_id=…) : vérifie le paiement et met à jour l'offre. */
  function verifyCheckoutReturn(params, email, profile, user) {
    const sessionId = params.get("session_id");
    const status = params.get("status");
    if (!sessionId || (status && status !== "success")) return;

    client.functions
      .invoke("stripe-checkout", { body: { action: "verify", session_id: sessionId } })
      .then(({ data }) => {
        if (!data || !data.success || !data.tier) return;
        profile.subscription_tier = data.tier;
        profile.subscription_status = "active";
        applyProfile(email, profile, user);
        showAccountMessage("Votre abonnement " + (TIER_LABELS[data.tier] || data.tier) + " a été activé avec succès ! 🎉", "success");
      })
      .catch((err) => console.warn("Vérification checkout session:", err));
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // ── Support : liste des tickets ──────────────────────────────────────────

  async function loadTickets(userId) {
    if (!client) return;
    try {
      const { data, error } = await client
        .from("support_tickets")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      renderTicketsList(data || []);
    } catch (_err) {
      renderTicketsList([]);
    }
  }

  function renderTicketsList(data) {
    tickets = data;
    const listEl = $("web-tickets-list-container");
    const badgeEl = $("web-ticket-count-badge");
    if (badgeEl) badgeEl.textContent = data.length + " ticket" + (data.length > 1 ? "s" : "");
    if (!listEl) return;

    if (!data.length) {
      listEl.innerHTML =
        '<div class="aww-tickets-empty">' +
        '<p class="aww-tickets-empty-title">Aucun ticket en cours</p>' +
        '<p>Cliquez sur "+ Nouveau Ticket" pour demander de l\'aide à l\'équipe support.</p>' +
        "</div>";
      return;
    }

    listEl.innerHTML = data
      .map(function (t) {
        const status = TICKET_STATUS_LABELS[t.status] ? t.status : "open";
        const dateStr = new Date(t.updated_at || t.created_at).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        return (
          '<div class="aww-ticket-card">' +
          '<div class="aww-ticket-info">' +
          '<div class="aww-ticket-subject">' + escapeHtml(t.subject || "Sans titre") + "</div>" +
          '<div class="aww-ticket-date">Activité : ' + dateStr + "</div>" +
          "</div>" +
          '<div class="aww-ticket-card-actions">' +
          '<span class="ticket-status ticket-status--' + status + '">' + TICKET_STATUS_LABELS[status] + "</span>" +
          '<button type="button" class="ticket-action-btn" data-ticket-id="' + escapeHtml(t.id) + '">Consulter &amp; Répondre</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  // ── Support : discussion d'un ticket ─────────────────────────────────────

  function unsubscribeFromTicket() {
    if (activeTicketChannel && client) {
      try {
        client.removeChannel(activeTicketChannel);
      } catch (_) {}
    }
    activeTicketChannel = null;
  }

  function subscribeToTicket(ticketId) {
    unsubscribeFromTicket();
    if (!client || isLocalPreview) return;
    try {
      activeTicketChannel = client
        .channel("web-ticket-chat-" + ticketId)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "support_messages", filter: "ticket_id=eq." + ticketId },
          function () {
            loadTicketMessages(ticketId);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Realtime chat subscription error:", err);
    }
  }

  function openTicketChat(ticketId) {
    const ticket = tickets.find((t) => String(t.id) === String(ticketId));
    if (!ticket) return;
    activeTicket = ticket;
    setError($("web-ticket-reply-error"), "");

    const status = TICKET_STATUS_LABELS[ticket.status] ? ticket.status : "open";
    if ($("web-chat-ticket-subject")) {
      $("web-chat-ticket-subject").textContent = ticket.subject || "Ticket #" + String(ticket.id).slice(0, 8);
    }
    const pill = $("web-chat-ticket-status-pill");
    if (pill) {
      pill.textContent = TICKET_STATUS_LABELS[status];
      pill.className = "ticket-count-badge chat-status chat-status--" + status;
    }

    const replyInput = $("web-reply-message");
    const replyBtn = $("submit-ticket-reply-btn");
    const isClosed = status === "closed";
    if (replyInput) {
      replyInput.disabled = isClosed;
      replyInput.placeholder = isClosed
        ? "Ce ticket est résolu et marqué comme clos par l'assistance."
        : "Écrire votre réponse... (Entrée pour envoyer)";
    }
    if (replyBtn) replyBtn.disabled = isClosed;

    subscribeToTicket(ticket.id);
    openModal($("web-ticket-chat-modal"));
    loadTicketMessages(ticket.id);
  }

  function messageHtml(msg) {
    const isStaff = msg.author_kind === "admin" || msg.author_kind === "staff";
    const time = msg.created_at
      ? new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : "À l'instant";
    const avatar = isStaff
      ? '<span class="chat-avatar-sr">SR</span>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    return (
      '<div class="chat-msg chat-msg--' + (isStaff ? "staff" : "user") + '">' +
      '<div class="chat-avatar">' + avatar + "</div>" +
      '<div class="chat-body">' +
      '<div class="chat-meta">' + (isStaff ? "Support SR Editer" : "Vous") + ' <span class="chat-time">• ' + time + "</span></div>" +
      '<div class="aww-chat-bubble">' + escapeHtml(msg.content) + "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function renderTicketMessages(messages, container) {
    container.innerHTML = messages.length
      ? messages.map(messageHtml).join("")
      : '<div class="chat-placeholder">Aucun message dans cette discussion.</div>';
    window.requestAnimationFrame(function () {
      container.scrollTop = container.scrollHeight;
    });
  }

  async function loadTicketMessages(ticketId) {
    const container = $("web-chat-messages-container");
    if (!container) return;
    if (isLocalPreview) {
      renderTicketMessages(PREVIEW_MESSAGES, container);
      return;
    }
    if (!client) return;
    container.innerHTML = '<div class="chat-placeholder">Chargement des messages...</div>';
    try {
      const { data, error } = await client
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      renderTicketMessages(data || [], container);
    } catch (_err) {
      container.innerHTML = '<div class="chat-placeholder chat-placeholder--error">Erreur lors du chargement de la discussion.</div>';
    }
  }

  function bindSupport() {
    const createModal = $("web-create-ticket-modal");
    const chatModal = $("web-ticket-chat-modal");
    const listEl = $("web-tickets-list-container");

    // Ouverture / fermeture des modales
    if ($("open-new-ticket-modal-btn")) $("open-new-ticket-modal-btn").addEventListener("click", () => openModal(createModal));
    ["close-new-ticket-modal-btn", "cancel-new-ticket-modal-btn"].forEach((id) => {
      if ($(id)) $(id).addEventListener("click", () => closeModal(createModal));
    });
    if ($("close-ticket-chat-modal-btn")) $("close-ticket-chat-modal-btn").addEventListener("click", () => closeModal(chatModal));
    [createModal, chatModal].forEach((modal) => {
      if (!modal) return;
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const openOne = [chatModal, createModal].find((modal) => modal && !modal.hidden);
      if (openOne) {
        event.preventDefault();
        closeModal(openOne);
      }
    });

    // "Consulter & Répondre"
    if (listEl) {
      listEl.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-ticket-id]");
        if (btn) openTicketChat(btn.dataset.ticketId);
      });
    }

    // Nouveau ticket
    const createForm = $("web-create-ticket-form");
    if (createForm) {
      createForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const subjectInput = $("web-ticket-subject");
        const messageInput = $("web-ticket-message");
        const errorEl = $("web-create-ticket-error");
        const submitBtn = $("submit-new-ticket-btn");
        if (!subjectInput || !messageInput || !client || !currentSession) return;

        const subject = subjectInput.value.trim();
        const message = messageInput.value.trim();
        const priority = $("web-ticket-priority") ? $("web-ticket-priority").value : "normal";
        if (!subject || !message) return;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Création...";
        }
        setError(errorEl, "");
        try {
          const { data: ticket, error: ticketError } = await client
            .from("support_tickets")
            .insert({ user_id: currentSession.user.id, email: currentSession.user.email, subject: subject, priority: priority, status: "open" })
            .select()
            .single();
          if (ticketError) throw ticketError;

          const { error: msgError } = await client
            .from("support_messages")
            .insert({ ticket_id: ticket.id, author_user_id: currentSession.user.id, author_kind: "user", content: message });
          if (msgError) throw msgError;

          subjectInput.value = "";
          messageInput.value = "";
          closeModal(createModal);
          loadTickets(currentSession.user.id);
        } catch (err) {
          setError(errorEl, err.message || "Erreur lors de la création du ticket.");
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Envoyer le ticket";
          }
        }
      });
    }

    // Réponse dans la discussion (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)
    const replyForm = $("web-ticket-reply-form");
    const replyInput = $("web-reply-message");
    if (!replyForm || !replyInput) return;

    replyInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        replyForm.requestSubmit();
      }
    });

    replyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = $("submit-ticket-reply-btn");
      const replyErrorEl = $("web-ticket-reply-error");
      const content = replyInput.value.trim();
      if (!content || !activeTicket) return;

      if (isLocalPreview) {
        const container = $("web-chat-messages-container");
        if (container) {
          container.insertAdjacentHTML("beforeend", messageHtml({ author_kind: "user", content: content }));
          container.scrollTop = container.scrollHeight;
        }
        replyInput.value = "";
        return;
      }
      if (!client || !currentSession) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Envoi...";
      }
      setError(replyErrorEl, "");
      try {
        const { error: msgError } = await client
          .from("support_messages")
          .insert({ ticket_id: activeTicket.id, author_user_id: currentSession.user.id, author_kind: "user", content: content });
        if (msgError) throw msgError;

        // Le trigger touch_support_ticket_on_message rouvre le ticket côté base.

        replyInput.value = "";
        loadTicketMessages(activeTicket.id);
        loadTickets(currentSession.user.id);
      } catch (err) {
        setError(replyErrorEl, "Erreur lors de l'envoi de la réponse : " + (err.message || String(err)));
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Envoyer";
        }
      }
    });
  }

  // ── Compte : suppression & déconnexion ───────────────────────────────────

  function bindAccount() {
    const startBtn = $("delete-account-start");
    const confirmationEl = $("delete-account-confirmation");
    const emailInput = $("delete-account-email");
    const cancelBtn = $("delete-account-cancel");
    const confirmBtn = $("delete-account-confirm");
    const emailMatches = () => emailInput.value.trim().toLowerCase() === currentEmail.toLowerCase();

    if (startBtn && confirmationEl && emailInput && cancelBtn && confirmBtn) {
      startBtn.addEventListener("click", () => {
        startBtn.hidden = true;
        confirmationEl.hidden = false;
        emailInput.focus();
      });
      emailInput.addEventListener("input", () => {
        confirmBtn.disabled = !emailMatches();
      });
      cancelBtn.addEventListener("click", () => {
        confirmationEl.hidden = true;
        startBtn.hidden = false;
        emailInput.value = "";
        confirmBtn.disabled = true;
      });
      confirmBtn.addEventListener("click", async () => {
        if (!emailMatches()) return;
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Suppression...";
        showAccountMessage("Annulation de l'abonnement et suppression du compte...", "info");
        try {
          await invokeAccountAction("delete-account", emailInput.value.trim());
          await client.auth.signOut({ scope: "local" });
          window.location.href = "login.html?notice=" + encodeURIComponent("Ton compte a été supprimé.");
        } catch (error) {
          showAccountMessage(error.message || "Impossible de supprimer le compte.", "error");
          confirmBtn.disabled = false;
          confirmBtn.textContent = "Supprimer définitivement";
        }
      });
    }

    if ($("logout-btn")) {
      $("logout-btn").addEventListener("click", async () => {
        if (client) await client.auth.signOut();
        window.location.href = "login.html";
      });
    }

    if ($("ai-quota-refresh")) {
      $("ai-quota-refresh").addEventListener("click", () => void loadAiTextureQuota());
    }
  }

  // ── Aperçu local (dashboard?preview=1) ───────────────────────────────────

  const PREVIEW_TICKETS = [
    {
      id: "preview-1",
      subject: "Question sur les générations IA & l'export des textures",
      status: "open",
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "preview-2",
      subject: "Demande d'informations sur les calques 4K",
      status: "closed",
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];
  const PREVIEW_MESSAGES = [
    {
      author_kind: "user",
      content: "Bonjour, comment exporter mes textures modifiées pour les utiliser en jeu ?",
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      author_kind: "staff",
      content: "Bonjour ! Enregistrez en mode Dossier et choisissez le dossier stream/ de votre ressource : les fichiers sont prêts pour le jeu.",
      created_at: new Date(Date.now() - 1800000).toISOString(),
    },
  ];

  function startPreview() {
    applyProfile(
      "preview@sr-editer.com",
      { subscription_tier: "free", subscription_status: null, role: "membre" },
      { id: "preview-user", email: "preview@sr-editer.com" }
    );
    renderTicketsList(PREVIEW_TICKETS);
    showShell();
  }

  // ── Démarrage ────────────────────────────────────────────────────────────

  async function init() {
    if (isLocalPreview) {
      startPreview();
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      Object.values(STORAGE).forEach((key) => window.localStorage.removeItem(key));
      await client.auth.signOut({ scope: "local" }).catch(function () {});
      redirectToLogin(discordErrorMessage(new Error(oauthError)));
      return;
    }

    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session) {
      window.location.href = "login.html";
      return;
    }
    currentSession = session;

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("subscription_tier, subscription_status, role, billing_tester")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (profileError) console.warn("Erreur profil Supabase:", profileError);
    const userProfile = profile || { subscription_tier: "free", subscription_status: null, role: "membre" };

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

    const email = session.user.email || "";
    if (userProfile.billing_tester === true) checkoutAllowed = true;
    applyProfile(email, userProfile, freshUser);
    showShell();

    verifyCheckoutReturn(params, email, userProfile, freshUser);
    await handleDiscordReturn(params);
    revealAdminLinkForSuperadmins(userProfile);
  }

  /** Le lien Administration apparaît aussi pour les superadmins sans role = "admin". */
  async function revealAdminLinkForSuperadmins(profile) {
    const adminLink = $("portal-admin-link");
    if (checkoutAllowed && (!adminLink || profile.role === "admin")) return;
    try {
      const { data } = await client.functions.invoke(config.adminFunctionName || "admin-users", { body: { action: "me" } });
      if (data && data.ok && data.level) {
        if (adminLink) adminLink.hidden = false;
        // L'équipe peut tester le paiement avant l'ouverture publique.
        if (!checkoutAllowed) {
          checkoutAllowed = true;
          syncPlanButtons();
        }
      }
    } catch (_err) {
      /* pas admin */
    }
  }

  bindDiscordButtons();
  bindBilling();
  bindSupport();
  bindAccount();
  init();
})();
