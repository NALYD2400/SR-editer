(function () {
  function initMobileNav() {
    const header = document.querySelector(".site-topnav");
    if (!header) return;
    const nav = header.querySelector(".site-nav-tabs");
    if (!nav) return;

    if (!nav.id) nav.id = "site-nav-tabs";

    let toggle = header.querySelector(".site-nav-toggle");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "site-nav-toggle";
      toggle.setAttribute("aria-label", "Ouvrir le menu");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", nav.id);
      toggle.innerHTML =
        '<span class="site-nav-toggle-bar" aria-hidden="true"></span>' +
        '<span class="site-nav-toggle-bar" aria-hidden="true"></span>' +
        '<span class="site-nav-toggle-bar" aria-hidden="true"></span>';

      const actions = header.querySelector(".site-nav-actions");
      if (actions) actions.appendChild(toggle);
      else header.appendChild(toggle);
    }

    if (toggle.dataset.boundNav === "1") return;
    toggle.dataset.boundNav = "1";

    function setOpen(open) {
      header.classList.toggle("is-nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    }

    toggle.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(!header.classList.contains("is-nav-open"));
    });

    document.addEventListener("click", function (event) {
      if (!header.classList.contains("is-nav-open")) return;
      if (header.contains(event.target)) return;
      setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && header.classList.contains("is-nav-open")) {
        setOpen(false);
      }
    });

    nav.addEventListener("click", function (event) {
      const link = event.target.closest("a");
      if (!link) return;
      setOpen(false);
    });

    window.addEventListener("resize", function () {
      if (window.matchMedia("(min-width: 961px)").matches) setOpen(false);
    });
  }

  initMobileNav();

  function initDropdownToggles() {
    const dropdowns = Array.from(document.querySelectorAll(".site-nav-dropdown"));
    if (!dropdowns.length) return;

    dropdowns.forEach(function (dropdown) {
      const trigger = dropdown.querySelector(".site-nav-dropdown-trigger");
      const menu = dropdown.querySelector(".site-nav-dropdown-menu");
      if (!trigger || !menu) return;
      if (dropdown.dataset.dropdownBound === "1") return;
      dropdown.dataset.dropdownBound = "1";

      let closeTimer = null;

      function openMenu() {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
        dropdowns.forEach(function (other) {
          if (other !== dropdown) {
            other.classList.remove("is-open");
            const otherTrigger = other.querySelector(".site-nav-dropdown-trigger");
            if (otherTrigger) otherTrigger.setAttribute("aria-expanded", "false");
          }
        });
        dropdown.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }

      function closeMenu(immediate) {
        if (immediate) {
          if (closeTimer) clearTimeout(closeTimer);
          dropdown.classList.remove("is-open");
          trigger.setAttribute("aria-expanded", "false");
          return;
        }
        closeTimer = setTimeout(function () {
          dropdown.classList.remove("is-open");
          trigger.setAttribute("aria-expanded", "false");
        }, 180);
      }

      // Click / Touch Toggle
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (dropdown.classList.contains("is-open")) {
          closeMenu(true);
        } else {
          openMenu();
        }
      });

      // Desktop Hover (Smooth Intent-based with 180ms hysteresis)
      dropdown.addEventListener("mouseenter", function () {
        if (window.matchMedia("(min-width: 961px)").matches) {
          openMenu();
        }
      });

      dropdown.addEventListener("mouseleave", function () {
        if (window.matchMedia("(min-width: 961px)").matches) {
          closeMenu(false);
        }
      });

      // Close menu when clicking on any link inside
      menu.querySelectorAll("a").forEach(function (item) {
        item.addEventListener("click", function () {
          closeMenu(true);
        });
      });
    });

    // Close on click outside
    document.addEventListener("click", function (event) {
      if (!event.target.closest(".site-nav-dropdown")) {
        dropdowns.forEach(function (d) {
          d.classList.remove("is-open");
          const tr = d.querySelector(".site-nav-dropdown-trigger");
          if (tr) tr.setAttribute("aria-expanded", "false");
        });
      }
    });

    // Close on escape
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        dropdowns.forEach(function (d) {
          d.classList.remove("is-open");
          const tr = d.querySelector(".site-nav-dropdown-trigger");
          if (tr) tr.setAttribute("aria-expanded", "false");
        });
      }
    });
  }

  initDropdownToggles();

  function ensureLiquidGlassFilter() {
    if (typeof document === "undefined" || document.getElementById("sr-liquid-glass-filter")) return;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "sr-liquid-glass-filter";
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;";
    svg.innerHTML =
      '<defs>' +
      '  <filter id="sr-liquid-lens" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">' +
      '    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.02" numOctaves="2" seed="3" result="noise" />' +
      '    <feDisplacementMap in="SourceGraphic" in2="noise" scale="4.5" xChannelSelector="R" yChannelSelector="G" />' +
      '  </filter>' +
      '</defs>';
    if (document.body) {
      document.body.appendChild(svg);
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        document.body.appendChild(svg);
      });
    }
  }

  // Scroll handler for floating pill elevation & Dynamic specular tracking
  if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", ensureLiquidGlassFilter);
    } else {
      ensureLiquidGlassFilter();
    }

    const header = document.querySelector(".site-topnav");
    if (header) {
      window.addEventListener("scroll", function () {
        header.classList.toggle("is-scrolled", window.scrollY > 15);
      }, { passive: true });
      header.classList.toggle("is-scrolled", window.scrollY > 15);

      // Dynamic Liquid Glass specular reflection tracking (Apple Tahoe / Inspira UI)
      header.addEventListener("pointermove", function (e) {
        const rect = header.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        header.style.setProperty("--glass-x", x + "px");
        header.style.setProperty("--glass-y", y + "px");
      }, { passive: true });

      header.addEventListener("pointerleave", function () {
        header.style.removeProperty("--glass-x");
        header.style.removeProperty("--glass-y");
      }, { passive: true });
    }
  }

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

  function safeHttpsUrl(value) {
    try {
      const url = new URL(String(value || ""));
      if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    } catch (_e) {}
    return null;
  }

  function getAvatarUrl(user) {
    if (!user) return null;
    if (typeof user.avatarUrl === "string") return safeHttpsUrl(user.avatarUrl);
    const meta = user.user_metadata || {};
    if (meta.avatar_url) return safeHttpsUrl(meta.avatar_url);
    if (meta.picture) return safeHttpsUrl(meta.picture);
    const discord = (user.identities || []).find(function (identity) {
      return identity.provider === "discord";
    });
    return safeHttpsUrl(
      discord && discord.identity_data && discord.identity_data.avatar_url
    );
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
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash || "";

    document.querySelectorAll(".site-nav-tabs [data-nav]").forEach(function (link) {
      const key = link.getAttribute("data-nav");
      let active = false;
      if (key === "home") {
        active = (currentPage === "home" || path.endsWith("/index.html") || path.endsWith("/index") || path === "/" || path === "") && !hash.includes("abonnements") && !hash.includes("fonctionnalites");
      } else if (key === "features") {
        active = hash.includes("fonctionnalites");
      } else if (key === "library") {
        active = currentPage === "library" || path.includes("library");
      } else if (key === "docs") {
        active = currentPage === "docs" || path.includes("docs");
      } else if (key === "blog") {
        active = currentPage === "blog" || path.includes("blog");
      } else if (key === "plans") {
        active = hash.includes("abonnements") || currentPage === "plans";
      } else if (key === "dashboard" || key === "account") {
        active = currentPage === "dashboard" || currentPage === "account" || path.includes("dashboard");
      }
      link.classList.toggle("is-active", Boolean(active));
    });
  }

  // Scroll observer for section highlight on home page
  if (typeof window !== "undefined") {
    window.addEventListener("scroll", function () {
      const currentPage = document.body.getAttribute("data-site-page") || "";
      if (currentPage !== "home" && currentPage !== "index") return;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const plansSec = document.getElementById("abonnements");
      const featSec = document.getElementById("fonctionnalites");
      
      let activeNav = "home";
      if (scrollY > 150) {
        if (plansSec) {
          const rPlans = plansSec.getBoundingClientRect();
          if (rPlans.top <= 320) {
            activeNav = "plans";
          }
        }
        if (activeNav !== "plans" && featSec) {
          const rFeat = featSec.getBoundingClientRect();
          if (rFeat.top <= 320 && rFeat.bottom >= 80) {
            activeNav = "features";
          }
        }
      }

      document.querySelectorAll(".site-nav-tabs [data-nav]").forEach(function (link) {
        const key = link.getAttribute("data-nav");
        link.classList.toggle("is-active", key === activeNav);
      });
    }, { passive: true });
  }

  function handleLogoutAction(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      localStorage.removeItem(CACHE_KEY);
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.includes("auth-token") || k.startsWith("sb-"))) {
          localStorage.removeItem(k);
        }
      }
    } catch (_e) {}
    if (client && client.auth) {
      client.auth.signOut().then(function () {
        window.location.reload();
      }).catch(function () {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  }

  function bindLogoutAction(btn) {
    if (!btn || btn.dataset.logoutBound === "1") return;
    btn.dataset.logoutBound = "1";
    btn.addEventListener("click", handleLogoutAction);
  }

  function renderGuest(accountEl, adminEl) {
    if (accountEl) {
      accountEl.className = "site-nav-cta";
      accountEl.href = "login.html?next=" + encodeURIComponent(currentNext());
      accountEl.textContent = "Se connecter";
      accountEl.removeAttribute("title");
    }
    const dividerEl = document.getElementById("site-nav-divider");
    if (dividerEl) {
      dividerEl.hidden = true;
      dividerEl.setAttribute("hidden", "");
    }
    const logoutBtn = document.getElementById("site-nav-logout-btn") || (accountEl && accountEl.parentElement && accountEl.parentElement.querySelector(".site-nav-logout-btn, .site-nav-logout-icon"));
    if (logoutBtn) {
      logoutBtn.hidden = true;
      logoutBtn.setAttribute("hidden", "");
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
          '" alt="" width="28" height="28" referrerpolicy="no-referrer">'
        : '<span class="site-nav-avatar site-nav-avatar--initial">' + initial + "</span>") +
      '<span class="site-nav-account-label">' +
      escapeHtml(name) +
      "</span>" +
      adminTag;

    // Manage sibling divider and logout button
    let dividerEl = document.getElementById("site-nav-divider");
    if (!dividerEl && accountEl.parentElement) {
      dividerEl = document.createElement("span");
      dividerEl.className = "site-nav-divider";
      dividerEl.id = "site-nav-divider";
      dividerEl.setAttribute("aria-hidden", "true");
      accountEl.after(dividerEl);
    }
    if (dividerEl) {
      dividerEl.hidden = false;
      dividerEl.removeAttribute("hidden");
    }

    let logoutBtn = document.getElementById("site-nav-logout-btn");
    if (!logoutBtn && dividerEl) {
      logoutBtn = document.createElement("button");
      logoutBtn.type = "button";
      logoutBtn.className = "site-nav-logout-btn";
      logoutBtn.id = "site-nav-logout-btn";
      logoutBtn.title = "Se déconnecter";
      logoutBtn.setAttribute("aria-label", "Se déconnecter");
      logoutBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
      dividerEl.after(logoutBtn);
    }
    if (logoutBtn) {
      logoutBtn.hidden = false;
      logoutBtn.removeAttribute("hidden");
      bindLogoutAction(logoutBtn);
    }
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
    initDropdownToggles();
    client.auth.getSession().then(function (result) {
      hydrate(result.data && result.data.session);
    });
  }

  window.SRSiteNav = { refresh: refresh, initMobileNav: initMobileNav, initDropdownToggles: initDropdownToggles };

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

  // Bind logout click handler once
  if (accountEl && accountEl.dataset.logoutBound !== "1") {
    accountEl.dataset.logoutBound = "1";
    accountEl.addEventListener("click", function (e) {
      const logoutBtn = e.target.closest(".site-nav-logout-icon");
      if (logoutBtn) {
        e.preventDefault();
        e.stopPropagation();
        try {
          localStorage.removeItem(CACHE_KEY);
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.includes("auth-token") || k.startsWith("sb-"))) {
              localStorage.removeItem(k);
            }
          }
        } catch (_e) {}
        if (client && client.auth) {
          client.auth.signOut().then(function () {
            window.location.reload();
          }).catch(function () {
            window.location.reload();
          });
        } else {
          window.location.reload();
        }
      }
    });
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
