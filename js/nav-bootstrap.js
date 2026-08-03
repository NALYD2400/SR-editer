/**
 * Peinture instantanée du bouton compte (avant site-nav.js).
 * Construit le DOM sans innerHTML pour éviter XSS via localStorage / metadata OAuth.
 */
(function () {
  var el = document.getElementById("site-nav-account");
  if (!el) return;

  function escapeText(value) {
    return String(value == null ? "" : value);
  }

  function safeHttpsUrl(value) {
    try {
      var url = new URL(String(value || ""));
      if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    } catch (_e) {}
    return null;
  }

  function readCachedUser() {
    try {
      var raw = localStorage.getItem("sr_site_nav_cache_v1");
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.name) return parsed;
      }
      for (var i = 0; i < localStorage.length; i += 1) {
        var key = localStorage.key(i);
        if (!key || !(key.includes("auth-token") || key.startsWith("sb-"))) continue;
        var token = localStorage.getItem(key);
        if (!token || !token.includes("user")) continue;
        var session = JSON.parse(token);
        var user = session.user || (session.currentSession && session.currentSession.user);
        if (!user) continue;
        var meta = user.user_metadata || {};
        return {
          name:
            meta.full_name ||
            meta.name ||
            meta.preferred_username ||
            (user.email ? user.email.split("@")[0] : "Compte"),
          email: user.email || "",
          avatarUrl: meta.avatar_url || meta.picture || null,
          isAdmin: Boolean(session.isAdmin || (meta && meta.role === "admin"))
        };
      }
    } catch (_e) {}
    return null;
  }

  try {
    var user = readCachedUser();
    if (!user || !user.name) {
      el.textContent = "Se connecter";
      return;
    }

    el.className = "site-nav-account";
    el.href = user.isAdmin ? "admin.html" : "dashboard.html";
    el.title = (user.email || user.name) + (user.isAdmin ? " (Admin)" : "");
    el.replaceChildren();

    var avatarUrl = safeHttpsUrl(user.avatarUrl);
    if (avatarUrl) {
      var img = document.createElement("img");
      img.className = "site-nav-avatar";
      img.src = avatarUrl;
      img.alt = "";
      img.width = 22;
      img.height = 22;
      img.referrerPolicy = "no-referrer";
      el.appendChild(img);
    } else {
      var initial = document.createElement("span");
      initial.className = "site-nav-avatar site-nav-avatar--initial";
      initial.textContent = escapeText(user.name.charAt(0) || "?").toUpperCase();
      el.appendChild(initial);
    }

    var label = document.createElement("span");
    label.className = "site-nav-account-label";
    label.textContent = escapeText(user.name);
    el.appendChild(label);

    if (user.isAdmin) {
      var badge = document.createElement("span");
      badge.className = "site-nav-admin-badge";
      badge.textContent = "Admin";
      el.appendChild(badge);
    }
  } catch (_e) {
    el.textContent = "Se connecter";
  }
})();
