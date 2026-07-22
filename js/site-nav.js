(function () {
  const config = window.SR_CONFIG;
  const client = typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null;
  if (!client || !config) return;

  const CACHE_KEY = "sr_site_nav_cache_v1";
  let lastSession = null;
  let boundAuth = false;

  function currentNext() {
    const file = (window.location.pathname.split("/").pop() || "index.html").split("?")[0];
    if (!file || file === "/" || !/\.html$/i.test(file)) return "index.html";
    return file + (window.location.hash || "");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getAvatarUrl(user) {
    if (!user) return null;
    if (typeof user.avatarUrl === "string") return user.avatarUrl;
    const meta = user.user_metadata || {};
    if (meta.avatar_url) return meta.avatar_url;
    if (meta.picture) return meta.picture;
    const discord = (user.identities || []).find(function (identity) {
      return identity.provider === "discord";
    });
    return (discord && discord.identity_data && discord.identity_data.avatar_url) || null;
  }

  function getDisplayName(user) {
    if (!user) return "Compte";
    if (typeof user.name === "string" && user.name) return user.name;
    const meta = user.user_metadata || {};
    return (
      meta.full_name ||
      meta.name ||
      meta.preferred_username ||
      meta.custom_claims?.global_name ||
      (user.email ? user.email.split("@")[0] : "Compte")
    );
  }

  function getInstantUserFromLocalStorage() {
    try {
      const rawCache = localStorage.getItem(CACHE_KEY);
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        if (parsed && parsed.name) return parsed;
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes("auth-token") || key.startsWith("sb-"))) {
          const rawToken = localStorage.getItem(key);
          if (rawToken && rawToken.includes("user")) {
            const sessionObj = JSON.parse(rawToken);
            const user = sessionObj.user || (sessionObj.currentSession && sessionObj.currentSession.user);
            if (user && (user.email || user.user_metadata)) {
              return {
                name: getDisplayName(user),
                email: user.email || "",
                avatarUrl: getAvatarUrl(user),
                isAdmin: Boolean(sessionObj.isAdmin || (user.user_metadata && user.user_metadata.role === "admin")),
                rawUser: user
              };
            }
          }
        }
      }
    } catch (_e) {}
    return null;
  }

  function markActiveTabs() {
    const currentPage = document.body.getAttribute("data-site-page") || "";
    const hash = window.location.hash || "";
    const isHome = currentPage === "home" || currentPage === "index";
    const isPlans = hash === "#abonnements";

    document.querySelectorAll(".site-nav-tabs [data-nav]").forEach(function (link) {
      const key = link.getAttribute("data-nav");
      let active = false;
      if (key === "home") {
        active = isHome && !isPlans;
      } else if (key === "docs") {
        active = currentPage === "docs";
      } else if (key === "library") {
        active = currentPage === "library";
      } else if (key === "plans") {
        active = (isHome && isPlans) || currentPage === "plans";
      } else if (key === "account") {
        active = currentPage === "account" || currentPage === "dashboard";
      }
      link.classList.toggle("is-active", Boolean(active));
    });
  }

  // Scroll observer for section highlight on home page
  if (typeof window !== "undefined") {
    window.addEventListener("scroll", function () {
      const currentPage = document.body.getAttribute("data-site-page") || "";
      if (currentPage !== "home" && currentPage !== "index") return;
      const plansSec = document.getElementById("abonnements");
      if (!plansSec) return;
      const rect = plansSec.getBoundingClientRect();
      const inPlans = rect.top <= 250 && rect.bottom >= 150;
      
      document.querySelectorAll(".site-nav-tabs [data-nav]").forEach(function (link) {
        const key = link.getAttribute("data-nav");
        if (key === "plans") {
          link.classList.toggle("is-active", inPlans);
        } else if (key === "home") {
          link.classList.toggle("is-active", !inPlans);
        }
      });
    });
  }

  function renderGuest(accountEl, adminEl) {
    if (accountEl) {
      accountEl.className = "site-nav-cta";
      accountEl.href = "login.html?next=" + encodeURIComponent(currentNext());
      accountEl.innerHTML = "Se connecter";
      accountEl.removeAttribute("title");
    }
    if (adminEl) {
      adminEl.hidden = true;
      adminEl.setAttribute("hidden", "");
    }
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (_e) {}
  }

  function renderAccount(accountEl, user, isAdmin) {
    if (!accountEl) return;
    const name = getDisplayName(user);
    const avatarUrl = getAvatarUrl(user);
    const initial = escapeHtml((name || "?").charAt(0).toUpperCase());

    accountEl.className = "site-nav-account";
    accountEl.href = isAdmin ? "admin.html" : "dashboard.html";
    accountEl.title = ((user && user.email) || name) + (isAdmin ? " (Admin)" : "");
    const adminTag = isAdmin ? '<span class="site-nav-admin-badge">Admin</span>' : '';
    accountEl.innerHTML =
      (avatarUrl
        ? '<img class="site-nav-avatar" src="' +
          escapeHtml(avatarUrl) +
          '" alt="" width="22" height="22" referrerpolicy="no-referrer">'
        : '<span class="site-nav-avatar site-nav-avatar--initial">' + initial + "</span>") +
      '<span class="site-nav-account-label">' +
      escapeHtml(name) +
      "</span>" +
      adminTag;
  }

  async function resolveIsAdmin(session) {
    if (!session || !session.user) return false;
    try {
      const { data: profile } = await client
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (profile && profile.role === "admin") return true;
    } catch (_err) {
      /* ignore */
    }

    try {
      const functionName = config.adminFunctionName || "admin-users";
      const { data, error } = await client.functions.invoke(functionName, {
        body: { action: "me" },
      });
      if (error || !data || !data.ok) return false;
      return Boolean(data.level) || (data.profile && data.profile.role === "admin");
    } catch (_err) {
      return false;
    }
  }

  function setCachedProfile(user, isAdmin) {
    try {
      const cacheData = {
        name: getDisplayName(user),
        email: user ? user.email : "",
        avatarUrl: getAvatarUrl(user),
        isAdmin: Boolean(isAdmin),
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (_e) {}
  }

  function hydrate(session) {
    lastSession = session || null;
    const accountEl = document.getElementById("site-nav-account");
    const adminEl = document.getElementById("site-nav-admin");
    if (adminEl) {
      adminEl.hidden = true;
      adminEl.setAttribute("hidden", "");
    }
    if (!accountEl) return;

    if (!session || !session.user) {
      renderGuest(accountEl, adminEl);
      return;
    }

    // Render account immediately using session user & cached admin role
    const instantUser = getInstantUserFromLocalStorage();
    const initialIsAdmin = instantUser ? instantUser.isAdmin : false;
    renderAccount(accountEl, session.user, initialIsAdmin);

    // Resolve admin status in background and update cache
    resolveIsAdmin(session).then(function (isAdmin) {
      renderAccount(accountEl, session.user, isAdmin);
      setCachedProfile(session.user, isAdmin);
    });
  }

  function refresh() {
    markActiveTabs();
    client.auth.getSession().then(function (result) {
      hydrate(result.data && result.data.session);
    });
  }

  window.SRSiteNav = { refresh: refresh };

  markActiveTabs();

  // Instant synchronous cache/session check on page load to eliminate FOUC / login button flicker
  const accountEl = document.getElementById("site-nav-account");
  const adminEl = document.getElementById("site-nav-admin");
  const instantUser = getInstantUserFromLocalStorage();

  if (instantUser) {
    renderAccount(accountEl, instantUser, instantUser.isAdmin);
  } else {
    renderGuest(accountEl, adminEl);
  }

  // Background session verification with Supabase
  client.auth.getSession().then(function (result) {
    hydrate(result.data && result.data.session);
  });

  if (!boundAuth) {
    boundAuth = true;
    client.auth.onAuthStateChange(function (_event, session) {
      hydrate(session);
    });
  }
})();
