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

  function instantLogout(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      localStorage.removeItem("sr_site_nav_cache_v1");
      for (var i = 0; i < localStorage.length; i += 1) {
        var k = localStorage.key(i);
        if (k && (k.includes("auth-token") || k.startsWith("sb-"))) {
          localStorage.removeItem(k);
        }
      }
    } catch (_e) {}
    if (window.srSupabase && window.srSupabase.auth) {
      window.srSupabase.auth.signOut().finally(function () {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  }

  try {
    var user = readCachedUser();
    var existingDivider = document.getElementById("site-nav-divider");
    var existingLogoutBtn = document.getElementById("site-nav-logout-btn");

    if (!user || !user.name) {
      el.textContent = "Se connecter";
      if (existingDivider) existingDivider.hidden = true;
      if (existingLogoutBtn) existingLogoutBtn.hidden = true;
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
      img.width = 28;
      img.height = 28;
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

    var divider = existingDivider;
    if (!divider) {
      divider = document.createElement("span");
      divider.className = "site-nav-divider";
      divider.id = "site-nav-divider";
      divider.setAttribute("aria-hidden", "true");
      el.after(divider);
    }
    divider.hidden = false;
    divider.removeAttribute("hidden");

    var logoutBtn = existingLogoutBtn;
    if (!logoutBtn) {
      logoutBtn = document.createElement("button");
      logoutBtn.type = "button";
      logoutBtn.className = "site-nav-logout-btn";
      logoutBtn.id = "site-nav-logout-btn";
      logoutBtn.title = "Se déconnecter";
      logoutBtn.setAttribute("aria-label", "Se déconnecter");
      logoutBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
      divider.after(logoutBtn);
    }
    logoutBtn.hidden = false;
    logoutBtn.removeAttribute("hidden");
    logoutBtn.onclick = instantLogout;
  } catch (_e) {
    el.textContent = "Se connecter";
  }
})();
