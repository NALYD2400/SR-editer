/* ==========================================================================
   SR Editer — Discord (partagé par login.html et dashboard.html)
   - Traduction des erreurs Discord / OAuth en messages lisibles
   - Modale "Discord requis" (#discord-required-modal) : rejoindre le serveur
     ou accepter le règlement, puis réessayer. Gère le focus, Échap et le clic
     sur le fond.
   Expose window.SRDiscord.
   ========================================================================== */
(function () {
  const MEMBERSHIP_MESSAGE = "Rejoins le serveur Discord SR Editer, accepte le règlement, puis relance la connexion.";
  const RULES_MESSAGE = "Accepte le règlement sur le serveur Discord pour obtenir le rôle Membre, puis réessaie.";

  /** Message lisible pour une erreur Discord / OAuth (error : Error, objet {message, code} ou texte). */
  function errorMessage(error, code, fallback) {
    const message = typeof error === "string" ? error : (error && error.message) || "";
    const errorCode = code || (error && error.code) || "";
    if (errorCode === "DISCORD_MEMBERSHIP_REQUIRED" || /dois être membre du serveur discord/i.test(message)) {
      return MEMBERSHIP_MESSAGE;
    }
    if (errorCode === "DISCORD_RULES_REQUIRED" || /accepte d'abord le règlement/i.test(message)) {
      return RULES_MESSAGE;
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
    return message || fallback || "Impossible de continuer avec Discord.";
  }

  /** "membership" | "rules" | null : l'action Discord que le message demande à l'utilisateur. */
  function recoveryKind(message, code) {
    if (code === "DISCORD_MEMBERSHIP_REQUIRED") return "membership";
    if (code === "DISCORD_RULES_REQUIRED") return "rules";
    // Sans code : "rejoins" d'abord, car le message d'adhésion mentionne aussi le règlement
    if (/rejoins le serveur discord/i.test(message || "")) return "membership";
    if (/accepte le règlement/i.test(message || "")) return "rules";
    return null;
  }

  function recoveryUrl(kind) {
    const config = window.SR_CONFIG || {};
    const inviteUrl = String(config.discordInviteUrl || "").trim();
    const rulesUrl = String(config.discordRulesUrl || "").trim();
    return kind === "rules" ? (rulesUrl || inviteUrl) : inviteUrl;
  }

  /**
   * Branche la modale "Discord requis" de la page.
   * options.onRetry : appelé par "J'ai rejoint, réessayer"
   * options.onOpen / options.onClose : pour bloquer / débloquer le scroll de la page
   */
  function createRequiredModal(options) {
    const opts = options || {};
    const modal = document.getElementById("discord-required-modal");
    if (!modal) return { showFor: function () {}, close: function () {}, isOpen: function () { return false; } };

    const dialog = modal.querySelector(".discord-required-dialog");
    const messageEl = document.getElementById("discord-required-message");
    const joinEl = document.getElementById("discord-required-join");
    const retryEl = document.getElementById("discord-required-retry");
    const closeEl = document.getElementById("discord-required-close");
    let previousFocus = null;

    function isOpen() {
      return !modal.hidden;
    }

    function open(message, kind, url) {
      previousFocus = document.activeElement;
      if (messageEl) messageEl.textContent = message;
      if (joinEl) {
        joinEl.href = url;
        joinEl.textContent = kind === "rules" ? "Ouvrir le règlement Discord" : "Rejoindre le Discord";
      }
      if (retryEl) {
        retryEl.textContent = kind === "rules" ? "J’ai accepté, réessayer" : "J’ai rejoint, réessayer";
      }
      modal.hidden = false;
      if (opts.onOpen) opts.onOpen(modal);
      window.requestAnimationFrame(function () {
        if (joinEl) joinEl.focus();
        else if (dialog) dialog.focus();
      });
    }

    function close() {
      if (!isOpen()) return;
      modal.hidden = true;
      if (opts.onClose) opts.onClose(modal);
      if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
      previousFocus = null;
    }

    /** Ouvre la modale si le message demande une action Discord, sinon la ferme. */
    function showFor(message, code) {
      const kind = recoveryKind(message, code);
      const url = kind ? recoveryUrl(kind) : "";
      if (kind && url) open(message, kind, url);
      else close();
    }

    if (closeEl) closeEl.addEventListener("click", close);
    if (retryEl) {
      retryEl.addEventListener("click", function () {
        close();
        if (opts.onRetry) opts.onRetry();
      });
    }
    modal.addEventListener("mousedown", function (event) {
      if (event.target === modal) close();
    });

    // Échap pour fermer, Tab reste piégé dans la boîte de dialogue
    document.addEventListener("keydown", function (event) {
      if (!isOpen()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"));
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
    });

    return { showFor: showFor, close: close, isOpen: isOpen };
  }

  window.SRDiscord = {
    errorMessage: errorMessage,
    recoveryKind: recoveryKind,
    createRequiredModal: createRequiredModal,
  };
})();
