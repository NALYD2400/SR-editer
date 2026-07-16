(function () {
  const client = typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null;
  if (!client || !window.SR_CONFIG) {
    console.error("Supabase ou SR_CONFIG manquant.");
    return;
  }

  const authForm = document.getElementById("auth-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const confirmPasswordField = document.getElementById("confirm-password-field");
  const submitBtn = document.getElementById("submit-btn");
  const discordBtn = document.getElementById("discord-btn");
  const errorMessage = document.getElementById("error-message");
  const discordRecoveryLink = document.getElementById("discord-recovery-link");
  const successMessage = document.getElementById("success-message");
  const authSubtitle = document.getElementById("auth-subtitle");
  const authSwitch = document.getElementById("auth-switch");
  const discordRequiredModal = document.getElementById("discord-required-modal");
  const discordRequiredDialog = discordRequiredModal && discordRequiredModal.querySelector(".discord-required-dialog");
  const discordRequiredMessage = document.getElementById("discord-required-message");
  const discordRequiredJoin = document.getElementById("discord-required-join");
  const discordRequiredRetry = document.getElementById("discord-required-retry");
  const discordRequiredClose = document.getElementById("discord-required-close");

  let mode = "login"; // "login" | "signup"
  let recoveryPreviousFocus = null;

  function getDiscordErrorMessage(error, code) {
    const message = typeof error === "string" ? error : error && error.message ? error.message : "";
    if (code === "DISCORD_MEMBERSHIP_REQUIRED" || /dois être membre du serveur discord/i.test(message)) {
      return "Rejoins le serveur Discord SR Editer, accepte le règlement, puis relance la connexion.";
    }
    if (code === "DISCORD_RULES_REQUIRED" || /accepte d'abord le règlement/i.test(message)) {
      return "Accepte le règlement sur le serveur Discord pour obtenir le rôle Membre, puis réessaie.";
    }
    if (/resource owner|authorization server denied|access[_ ]denied/i.test(message)) {
      return "Connexion Discord annulée. Tu peux réessayer quand tu veux.";
    }
    if (/unsupported provider|provider is not enabled/i.test(message)) {
      return "La connexion Discord n'est pas encore activée sur le serveur.";
    }
    if (/invalid login credentials/i.test(message)) {
      return "E-mail ou mot de passe incorrect. Si tu as créé ce compte avec Discord, utilise « Continuer avec Discord ».";
    }
    if (/invalid session|session required/i.test(message)) {
      return "Ta session a expiré. Recommence la connexion.";
    }
    return message || "Impossible de continuer avec Discord.";
  }

  function clearPendingDiscordOAuth() {
    window.localStorage.removeItem("sr-editer:discord-signin-pending");
    window.localStorage.removeItem("sr-editer:discord-signin-next");
    window.localStorage.removeItem("sr-editer:discord-link-pending");
  }

  function discordRecoveryKind(message, code) {
    if (code === "DISCORD_RULES_REQUIRED" || /accepte le règlement/i.test(message || "")) return "rules";
    if (code === "DISCORD_MEMBERSHIP_REQUIRED" || /rejoins le serveur discord/i.test(message || "")) return "membership";
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

  function updateDiscordRecovery(message, code) {
    if (!discordRecoveryLink) return;
    const inviteUrl = String(window.SR_CONFIG.discordInviteUrl || "").trim();
    const kind = discordRecoveryKind(message, code);
    const visible = Boolean(inviteUrl && kind);
    discordRecoveryLink.hidden = !visible;
    if (!visible) {
      closeDiscordRequiredModal();
      return;
    }
    discordRecoveryLink.href = inviteUrl;
    discordRecoveryLink.textContent = kind === "rules" ? "Ouvrir le règlement Discord" : "Rejoindre le Discord";
    openDiscordRequiredModal(message, kind, inviteUrl);
  }

  function showError(message, code) {
    if (successMessage) {
      successMessage.textContent = "";
      successMessage.classList.remove("is-visible");
    }
    const displayMessage = getDiscordErrorMessage(message, code);
    errorMessage.textContent = displayMessage;
    errorMessage.classList.add("is-visible");
    updateDiscordRecovery(displayMessage, code);
  }

  function showSuccess(message) {
    if (errorMessage) {
      errorMessage.textContent = "";
      errorMessage.classList.remove("is-visible");
    }
    updateDiscordRecovery("", "");
    if (!successMessage) return;
    successMessage.textContent = message;
    successMessage.classList.add("is-visible");
  }

  function clearMessages() {
    if (errorMessage) {
      errorMessage.textContent = "";
      errorMessage.classList.remove("is-visible");
    }
    if (successMessage) {
      successMessage.textContent = "";
      successMessage.classList.remove("is-visible");
    }
    updateDiscordRecovery("", "");
  }

  function bindSwitch(button, nextMode) {
    if (!button) return;
    button.addEventListener("click", function () {
      setMode(nextMode);
    });
  }

  function setMode(nextMode) {
    mode = nextMode;
    clearMessages();

    const isSignup = mode === "signup";
    if (confirmPasswordField) confirmPasswordField.hidden = !isSignup;
    if (confirmPasswordInput) {
      confirmPasswordInput.required = isSignup;
      if (!isSignup) confirmPasswordInput.value = "";
    }
    if (passwordInput) {
      passwordInput.autocomplete = isSignup ? "new-password" : "current-password";
    }
    if (submitBtn) {
      submitBtn.textContent = isSignup ? "Créer mon compte" : "Se connecter";
    }
    if (authSubtitle) {
      authSubtitle.textContent = isSignup
        ? "Crée ton compte pour accéder au studio."
        : "Connecte-toi pour accéder au studio.";
    }
    if (authSwitch) {
      if (isSignup) {
        authSwitch.innerHTML =
          'Déjà un compte ? <button type="button" id="switch-to-login">Se connecter</button>';
        bindSwitch(document.getElementById("switch-to-login"), "login");
      } else {
        authSwitch.innerHTML =
          'Pas encore de compte ? <button type="button" id="switch-to-signup">S\'inscrire</button>';
        bindSwitch(document.getElementById("switch-to-signup"), "signup");
      }
    }
  }

  function safeNextPath() {
    const next = new URLSearchParams(window.location.search).get("next");
    if (!next) return "dashboard.html";
    // Only allow same-origin relative HTML pages
    if (!/^[a-zA-Z0-9._-]+\.html([?#].*)?$/.test(next)) return "dashboard.html";
    return next;
  }

  const afterAuthPath = safeNextPath();

  const initialParams = new URLSearchParams(window.location.search);
  const notice = initialParams.get("notice");
  const noticeCode = initialParams.get("notice_code");
  if (notice) showError(notice, noticeCode);

  client.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      window.location.href = afterAuthPath;
    }
  });

  bindSwitch(document.getElementById("switch-to-signup"), "signup");

  if (discordRequiredClose) discordRequiredClose.addEventListener("click", closeDiscordRequiredModal);
  if (discordRequiredModal) {
    discordRequiredModal.addEventListener("mousedown", function (event) {
      if (event.target === discordRequiredModal) closeDiscordRequiredModal();
    });
  }
  if (discordRequiredRetry) {
    discordRequiredRetry.addEventListener("click", function () {
      closeDiscordRequiredModal();
      discordBtn.click();
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

  if (window.location.hash === "#signup" || new URLSearchParams(window.location.search).get("mode") === "signup") {
    setMode("signup");
  }

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessages();
    clearPendingDiscordOAuth();
    submitBtn.disabled = true;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (mode === "signup") {
      submitBtn.textContent = "Chargement...";
      const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : "";

      if (password.length < 8) {
        showError("Le mot de passe doit faire au moins 8 caractères.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Créer mon compte";
        return;
      }

      if (password !== confirmPassword) {
        showError("Les mots de passe ne correspondent pas.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Créer mon compte";
        return;
      }

      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/dashboard.html",
        },
      });

      if (error) {
        showError(error.message, error.code);
        submitBtn.disabled = false;
        submitBtn.textContent = "Créer mon compte";
        return;
      }

      if (data.session) {
        window.location.href = afterAuthPath;
        return;
      }

      showSuccess("Compte créé avec succès ! Vérifie tes e-mails (ou connecte-toi).");
      submitBtn.disabled = false;
      setMode("login");
      return;
    }

    submitBtn.textContent = "Chargement...";
    const { error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message, error.code);
      submitBtn.disabled = false;
      submitBtn.textContent = "Se connecter";
    } else {
      window.location.href = afterAuthPath;
    }
  });

  discordBtn.addEventListener("click", async () => {
    discordBtn.disabled = true;
    clearMessages();
    window.localStorage.setItem("sr-editer:discord-signin-pending", "1");
    if (afterAuthPath !== "dashboard.html") {
      window.localStorage.setItem("sr-editer:discord-signin-next", afterAuthPath);
    }

    const { error } = await client.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: window.location.origin + "/dashboard.html",
      },
    });

    if (error) {
      window.localStorage.removeItem("sr-editer:discord-signin-pending");
      window.localStorage.removeItem("sr-editer:discord-signin-next");
      showError(error.message, error.code);
      discordBtn.disabled = false;
    }
  });
})();
