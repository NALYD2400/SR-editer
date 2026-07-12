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

  const TIER_LABELS = {
    free: "Gratuit",
    standard: "Standard",
    pro: "Pro",
    premium: "Premium",
  };

  let currentSession = null;
  let currentTier = "free";

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

    applyProfile(session.user.email || "", profile, session.user);
    showShell();

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

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await client.auth.signOut();
      window.location.href = "login.html";
    });
  }

  init();
})();
