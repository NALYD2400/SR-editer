/* ==========================================================================
   SR Editer — Connexion / inscription (login.html)
   E-mail + mot de passe ou Discord. Après connexion, redirige vers la page
   demandée (?next= ou ?redirect=, pages .html du site uniquement) ou le dashboard.
   ========================================================================== */
(function () {
  const client = typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null;
  if (!client || !window.SR_CONFIG) {
    console.error("Supabase ou SR_CONFIG manquant.");
    return;
  }

  const authForm = document.getElementById("auth-form");
  const authTitleHeading = document.getElementById("auth-title-heading");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const confirmPasswordField = document.getElementById("confirm-password-field");
  const submitBtn = document.getElementById("submit-btn");
  const discordBtn = document.getElementById("discord-btn");
  const errorMessage = document.getElementById("error-message");
  const successMessage = document.getElementById("success-message");
  const authSubtitle = document.getElementById("auth-subtitle");
  const authSwitch = document.getElementById("auth-switch");

  let mode = "login"; // "login" | "signup"

  const discordModal = window.SRDiscord.createRequiredModal({
    onRetry: function () {
      discordBtn.click();
    },
  });

  function clearPendingDiscordOAuth() {
    window.localStorage.removeItem("sr-editer:discord-signin-pending");
    window.localStorage.removeItem("sr-editer:discord-signin-next");
    window.localStorage.removeItem("sr-editer:discord-link-pending");
  }

  function showError(message, code) {
    if (successMessage) {
      successMessage.textContent = "";
      successMessage.classList.remove("is-visible");
    }
    const displayMessage = window.SRDiscord.errorMessage(message, code);
    errorMessage.textContent = displayMessage;
    errorMessage.classList.add("is-visible");
    discordModal.showFor(displayMessage, code);
  }

  function showSuccess(message) {
    if (errorMessage) {
      errorMessage.textContent = "";
      errorMessage.classList.remove("is-visible");
    }
    discordModal.close();
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
    discordModal.close();
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
    if (authTitleHeading) {
      authTitleHeading.textContent = isSignup ? "Créer un compte" : "Se connecter";
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
          'Déjà un compte ? <button type="button" class="aww-text-btn" id="switch-to-login">Se connecter</button>';
        bindSwitch(document.getElementById("switch-to-login"), "login");
      } else {
        authSwitch.innerHTML =
          'Pas encore de compte ? <button type="button" class="aww-text-btn" id="switch-to-signup">S\'inscrire</button>';
        bindSwitch(document.getElementById("switch-to-signup"), "signup");
      }
    }
  }

  function safeNextPath() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || params.get("redirect");
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

  const passwordToggle = document.getElementById("password-toggle");
  const eyeIcon = document.getElementById("eye-icon");
  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener("click", function () {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      if (eyeIcon) {
        eyeIcon.innerHTML = isPassword
          ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
          : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
      }
    });
  }

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
        scopes: "identify email guilds.join",
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
