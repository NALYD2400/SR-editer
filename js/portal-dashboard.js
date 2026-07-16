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
  const accountMessageEl = document.getElementById("account-action-message");
  const deleteStartBtn = document.getElementById("delete-account-start");
  const deleteConfirmationEl = document.getElementById("delete-account-confirmation");
  const deleteEmailInput = document.getElementById("delete-account-email");
  const deleteCancelBtn = document.getElementById("delete-account-cancel");
  const deleteConfirmBtn = document.getElementById("delete-account-confirm");

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

  function redirectToLogin(message) {
    const target = "login.html" + (message ? "?notice=" + encodeURIComponent(message) : "");
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
    if (/unsupported provider|provider is not enabled/i.test(message)) {
      return "La connexion Discord n'est pas encore activée sur le serveur.";
    }
    return message || "Impossible de gérer la liaison Discord.";
  }

  function showAccountMessage(message, state) {
    if (!accountMessageEl) return;
    accountMessageEl.textContent = message;
    accountMessageEl.dataset.state = state || "info";
    accountMessageEl.hidden = !message;
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
    const { data, error } = await client.functions.invoke("account-management", {
      body: Object.assign({ action: action }, confirmation ? { confirmation: confirmation } : {}),
    });
    if (error) {
      let message = error.message || "Action impossible.";
      if (error.context && typeof error.context.json === "function") {
        const payload = await error.context.json().catch(() => null);
        if (payload && payload.error) message = payload.error;
      }
      throw new Error(message);
    }
    if (data && data.error) throw new Error(data.error);
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

    const params = new URLSearchParams(window.location.search);
    const discordSignInPending =
      window.localStorage.getItem("sr-editer:discord-signin-pending") === "1" ||
      params.get("discord_auth") === "1";
    if (discordSignInPending) {
      currentIdentities = freshUser.identities;
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
        redirectToLogin(getDiscordErrorMessage(discordError));
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
    }

    applyProfile(session.user.email || "", profile, freshUser);
    showShell();

    if (window.localStorage.getItem("sr-editer:discord-link-pending") === "1" && discordIdentity()) {
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
        showAccountMessage(syncError.message || "Le compte Discord n'a pas pu être lié.", "error");
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

  if (discordSyncBtn) {
    discordSyncBtn.addEventListener("click", async () => {
      discordSyncBtn.disabled = true;
      showAccountMessage("Synchronisation en cours...", "info");
      try {
        await invokeAccountAction("sync-discord");
        showAccountMessage("Rôle Discord synchronisé avec ton offre.", "success");
      } catch (error) {
        showAccountMessage(error.message || "Impossible de synchroniser le rôle Discord.", "error");
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

  init();
})();
