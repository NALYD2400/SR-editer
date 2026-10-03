/* ==========================================================================
   SR Editer — Header : état de connexion
   Remplace le bouton "PORTAL" par l'avatar + pseudo de l'utilisateur connecté
   (desktop + menu mobile). Affiche d'abord la version en cache (localStorage)
   pour éviter le clignotement, puis se synchronise avec la session Supabase.
   Expose window.updateSRHeaderAuth(user) pour les pages qui modifient le profil.
   ========================================================================== */
(function () {
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(str) {
    return String(str == null ? "" : str)
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function extractUserData(user) {
    if (!user) return null;
    var meta = user.user_metadata || {};
    var identities = Array.isArray(user.identities) ? user.identities : [];
    var discordIdObj = identities.find(function (id) {
      return id && id.provider === "discord";
    });
    var discordData = (discordIdObj && discordIdObj.identity_data) || {};

    // 1. Resolve Avatar URL
    var avatarUrl =
      discordData.avatar_url ||
      meta.avatar_url ||
      meta.picture ||
      null;

    if (!avatarUrl && discordData.avatar && (discordData.id || (discordIdObj && discordIdObj.id))) {
      var discordUid = discordData.id || discordIdObj.id;
      avatarUrl = "https://cdn.discordapp.com/avatars/" + discordUid + "/" + discordData.avatar + ".png?size=64";
    }

    // 2. Resolve Display Name / Pseudo
    var displayName =
      discordData.global_name ||
      discordData.full_name ||
      discordData.name ||
      discordData.user_name ||
      (meta.custom_claims && meta.custom_claims.global_name) ||
      meta.full_name ||
      meta.name ||
      meta.preferred_username ||
      meta.user_name ||
      (user.email ? user.email.split("@")[0] : "Compte");

    var isDiscord = Boolean(
      discordIdObj ||
      (meta.iss && String(meta.iss).indexOf("discord") !== -1) ||
      (avatarUrl && String(avatarUrl).indexOf("discord") !== -1)
    );

    var initial = String(displayName || user.email || "C").trim().charAt(0).toUpperCase();

    return {
      displayName: displayName,
      avatarUrl: avatarUrl,
      initial: initial,
      isDiscord: isDiscord,
      email: user.email || ""
    };
  }

  function renderHeaderAuth(userData) {
    var headerActions = document.querySelector(".aww-header-actions");
    var headerPortalBtn = headerActions ? headerActions.querySelector(".aww-btn:not(.aww-burger-btn)") : null;
    var navPortalMobile = document.querySelector(".aww-nav-portal-mobile");

    if (!userData) {
      if (headerPortalBtn) {
        headerPortalBtn.href = "login.html";
        headerPortalBtn.className = "aww-btn aww-btn-outline";
        headerPortalBtn.removeAttribute("title");
        headerPortalBtn.innerHTML = '<span class="aww-btn-text">PORTAL</span>';
      }
      if (navPortalMobile) {
        navPortalMobile.href = "login.html";
        navPortalMobile.classList.remove("is-user");
        navPortalMobile.innerHTML = '<span class="aww-link-inner" data-hover="PORTAL">PORTAL</span>';
      }
      return;
    }

    var avatarHtml = '';
    if (userData.avatarUrl) {
      avatarHtml = '<span class="aww-user-avatar' + (userData.isDiscord ? ' is-discord' : '') + '">' +
        '<img src="' + escapeAttr(userData.avatarUrl) + '" alt="" referrerpolicy="no-referrer" data-avatar-initial="' + escapeAttr(userData.initial) + '">' +
        '</span>';
    } else {
      avatarHtml = '<span class="aww-user-avatar"><span class="aww-user-initial">' + escapeHtml(userData.initial) + '</span></span>';
    }

    if (headerPortalBtn) {
      headerPortalBtn.href = "dashboard.html";
      headerPortalBtn.className = "aww-btn aww-btn-profile";
      headerPortalBtn.title = (userData.displayName || "") + (userData.email ? " (" + userData.email + ")" : "");
      headerPortalBtn.innerHTML = avatarHtml + '<span class="aww-user-name">' + escapeHtml(userData.displayName) + '</span>';
    }

    if (navPortalMobile) {
      navPortalMobile.href = "dashboard.html";
      navPortalMobile.classList.add("is-user");
      navPortalMobile.innerHTML = avatarHtml + '<span class="aww-link-inner" data-hover="' + escapeAttr(userData.displayName) + '">' + escapeHtml(userData.displayName) + '</span>';
    }

    // Avatar Discord indisponible : retombe sur l'initiale (sans attribut onerror, bloqué par la CSP).
    [headerPortalBtn, navPortalMobile].forEach(function (root) {
      var img = root && root.querySelector("img[data-avatar-initial]");
      if (!img) return;
      img.addEventListener("error", function () {
        var initial = document.createElement("span");
        initial.className = "aww-user-initial";
        initial.textContent = img.getAttribute("data-avatar-initial") || "";
        img.replaceWith(initial);
      }, { once: true });
    });
  }

  function readCachedUser() {
    try {
      var direct = localStorage.getItem("sr_header_user_v2");
      if (direct) {
        var parsed = JSON.parse(direct);
        if (parsed && parsed.displayName) return parsed;
      }
    } catch (_) {}

    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || !(key.indexOf("auth-token") !== -1 || key.indexOf("sb-") === 0)) continue;
        var raw = localStorage.getItem(key);
        if (!raw || raw.indexOf("user") === -1) continue;
        var session = JSON.parse(raw);
        var user = session.user || (session.currentSession && session.currentSession.user);
        if (user) {
          var data = extractUserData(user);
          if (data) {
            try { localStorage.setItem("sr_header_user_v2", JSON.stringify(data)); } catch (_) {}
            return data;
          }
        }
      }
    } catch (_) {}
    return null;
  }

  function applyCachedUser() {
    var cached = readCachedUser();
    if (cached) renderHeaderAuth(cached);
  }

  function syncLiveUser() {
    var client = (typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null) || window.srSupabase;
    if (!client || !client.auth) {
      var tries = 0;
      var interval = setInterval(function () {
        tries++;
        var c = (typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null) || window.srSupabase;
        if (c && c.auth) {
          clearInterval(interval);
          bindClient(c);
        } else if (tries > 20) {
          clearInterval(interval);
        }
      }, 100);
      return;
    }
    bindClient(client);
  }

  function bindClient(client) {
    client.auth.getSession().then(function (res) {
      var session = res && res.data && res.data.session;
      if (session && session.user) {
        client.auth.getUser().then(function (uRes) {
          var freshUser = (uRes && uRes.data && uRes.data.user) || session.user;
          var data = extractUserData(freshUser);
          if (data) {
            try { localStorage.setItem("sr_header_user_v2", JSON.stringify(data)); } catch (_) {}
            renderHeaderAuth(data);
          }
        }).catch(function () {
          var data = extractUserData(session.user);
          if (data) {
            try { localStorage.setItem("sr_header_user_v2", JSON.stringify(data)); } catch (_) {}
            renderHeaderAuth(data);
          }
        });
      } else {
        try { localStorage.removeItem("sr_header_user_v2"); } catch (_) {}
        renderHeaderAuth(null);
      }
    }).catch(function () {});

    if (client.auth.onAuthStateChange && !window.__srHeaderAuthSubscribed) {
      window.__srHeaderAuthSubscribed = true;
      client.auth.onAuthStateChange(function (event, session) {
        if (event === "SIGNED_OUT" || !session || !session.user) {
          try { localStorage.removeItem("sr_header_user_v2"); } catch (_) {}
          renderHeaderAuth(null);
        } else if (session && session.user) {
          var data = extractUserData(session.user);
          if (data) {
            try { localStorage.setItem("sr_header_user_v2", JSON.stringify(data)); } catch (_) {}
            renderHeaderAuth(data);
          }
        }
      });
    }
  }

  window.updateSRHeaderAuth = function (user) {
    if (!user) {
      try { localStorage.removeItem("sr_header_user_v2"); } catch (_) {}
      renderHeaderAuth(null);
      return;
    }
    var data = extractUserData(user);
    if (data) {
      try { localStorage.setItem("sr_header_user_v2", JSON.stringify(data)); } catch (_) {}
      renderHeaderAuth(data);
    }
  };

  // Immediate synchronous execution if DOM elements are present
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      applyCachedUser();
      syncLiveUser();
    });
  } else {
    applyCachedUser();
    syncLiveUser();
  }
})();
