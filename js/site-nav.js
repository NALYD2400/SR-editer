(function () {
  const config = window.SR_CONFIG;
  const client = typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null;
  if (!client || !config) return;

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
    const meta = user.user_metadata || {};
    return (
      meta.full_name ||
      meta.name ||
      meta.preferred_username ||
      meta.custom_claims?.global_name ||
      (user.email ? user.email.split("@")[0] : "Compte")
    );
  }

  function markActiveTabs() {
    const currentPage = document.body.getAttribute("data-site-page") || "";
    const hash = window.location.hash || "";
    document.querySelectorAll(".site-nav-tabs [data-nav]").forEach(function (link) {
      const key = link.getAttribute("data-nav");
      let active =
        (key === "home" && (currentPage === "home" || currentPage === "index") && hash !== "#abonnements") ||
        (key === "docs" && currentPage === "docs") ||
        (key === "library" && currentPage === "library") ||
        (key === "plans" && (currentPage === "plans" || hash === "#abonnements")) ||
        (key === "account" && (currentPage === "account" || currentPage === "dashboard"));
      link.classList.toggle("is-active", Boolean(active));
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
  }

  function renderAccount(accountEl, user) {
    if (!accountEl) return;
    const name = getDisplayName(user);
    const avatarUrl = getAvatarUrl(user);
    const initial = escapeHtml((name || "?").charAt(0).toUpperCase());

    accountEl.className = "site-nav-account";
    accountEl.href = "dashboard.html";
    accountEl.title = user.email || name;
    accountEl.innerHTML =
      (avatarUrl
        ? '<img class="site-nav-avatar" src="' +
          escapeHtml(avatarUrl) +
          '" alt="" width="22" height="22" referrerpolicy="no-referrer">'
        : '<span class="site-nav-avatar site-nav-avatar--initial">' + initial + "</span>") +
      '<span class="site-nav-account-label">' +
      escapeHtml(name) +
      "</span>";
  }

  async function resolveIsAdmin(session) {
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

  async function hydrate(session) {
    lastSession = session || null;
    const accountEl = document.getElementById("site-nav-account");
    const adminEl = document.getElementById("site-nav-admin");
    if (!accountEl && !adminEl) return;

    if (!session || !session.user) {
      renderGuest(accountEl, adminEl);
      return;
    }

    renderAccount(accountEl, session.user);

    const isAdmin = await resolveIsAdmin(session);
    const adminNow = document.getElementById("site-nav-admin");
    if (adminNow) {
      if (isAdmin) {
        adminNow.hidden = false;
        adminNow.removeAttribute("hidden");
      } else {
        adminNow.hidden = true;
        adminNow.setAttribute("hidden", "");
      }
    }
  }

  function refresh() {
    markActiveTabs();
    client.auth.getSession().then(function (result) {
      void hydrate(result.data && result.data.session);
    });
  }

  window.SRSiteNav = { refresh: refresh };

  markActiveTabs();
  renderGuest(document.getElementById("site-nav-account"), document.getElementById("site-nav-admin"));

  client.auth.getSession().then(function (result) {
    void hydrate(result.data && result.data.session);
  });

  if (!boundAuth) {
    boundAuth = true;
    client.auth.onAuthStateChange(function (_event, session) {
      void hydrate(session);
    });
  }
})();
