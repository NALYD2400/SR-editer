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

  let mode = "login"; // "login" | "signup"

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
    return message || "Impossible de continuer avec Discord.";
  }

  function updateDiscordRecovery(message, code) {
    if (!discordRecoveryLink) return;
    const inviteUrl = String(window.SR_CONFIG.discordInviteUrl || "").trim();
    const needsRules = code === "DISCORD_RULES_REQUIRED" || /accepte le règlement/i.test(message);
    const needsMembership = code === "DISCORD_MEMBERSHIP_REQUIRED" || /rejoins le serveur discord/i.test(message);
    const visible = Boolean(inviteUrl && (needsRules || needsMembership));
    discordRecoveryLink.hidden = !visible;
    if (!visible) return;
    discordRecoveryLink.href = inviteUrl;
    discordRecoveryLink.textContent = needsRules ? "Ouvrir le règlement Discord" : "Rejoindre le Discord";
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

  if (window.location.hash === "#signup" || new URLSearchParams(window.location.search).get("mode") === "signup") {
    setMode("signup");
  }

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessages();
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
