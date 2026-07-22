/**
 * Soft navigation between Accueil / Docs / Bibliothèque.
 * Keeps .ambient-background alive so Ken Burns never restarts.
 */
(function () {
  const SOFT_PAGES = {
    "": "home",
    "index.html": "home",
    "docs.html": "docs",
    "library.html": "library",
  };

  const PAGE_SCRIPTS = {
    home: ["js/screenshots.js?v=0.3.4", "js/client.js?v=0.3.6"],
    docs: [],
    library: ["js/library-page.js?v=8"],
  };

  let navigating = false;
  const loadedScripts = new Set();

  function pageFile(pathname) {
    const file = (pathname.split("/").pop() || "").split("?")[0];
    if (!file || file === "/") return "index.html";
    return file;
  }

  function softKey(pathname) {
    return SOFT_PAGES[pageFile(pathname)] || null;
  }

  function isAmbientNode(node) {
    return (
      node &&
      node.nodeType === 1 &&
      (node.classList.contains("ambient-background") ||
        node.classList.contains("ambient-vignette"))
    );
  }

  function loadScript(src) {
    // Only trust scripts we actually executed — soft-nav importNode copies
    // inert <script src> tags that never run, which used to skip real loads.
    if (loadedScripts.has(src)) {
      return Promise.resolve();
    }
    const existing = document.querySelector('script[src="' + src + '"][data-soft-nav-loaded="1"]');
    if (existing) {
      loadedScripts.add(src);
      return Promise.resolve();
    }
    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = src;
      script.dataset.softNavLoaded = "1";
      script.onload = function () {
        loadedScripts.add(src);
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  async function ensurePageScripts(page) {
    const list = PAGE_SCRIPTS[page] || [];
    for (let i = 0; i < list.length; i++) {
      await loadScript(list[i]);
    }
  }

  function mountPage(page) {
    if (page === "home" && window.SRClient && typeof window.SRClient.mount === "function") {
      window.SRClient.mount();
    }
    if (page === "library" && window.SRLibrary && typeof window.SRLibrary.mount === "function") {
      window.SRLibrary.mount();
    }
    // Toujours resynchroniser le compte après swap DOM
    if (window.SRSiteNav && typeof window.SRSiteNav.refresh === "function") {
      window.SRSiteNav.refresh();
    }
  }

  function scrollToHash(hash) {
    if (!hash || hash === "#") {
      window.scrollTo(0, 0);
      return;
    }
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo(0, 0);
  }

  async function softNavigate(url, push) {
    if (navigating) return;
    const nextKey = softKey(url.pathname);
    if (!nextKey) {
      window.location.href = url.href;
      return;
    }

    const currentKey = softKey(window.location.pathname);
    // Same page, only hash change
    if (currentKey === nextKey && pageFile(url.pathname) === pageFile(window.location.pathname)) {
      if (push) history.pushState({ soft: true }, "", url.href);
      scrollToHash(url.hash);
      if (window.SRSiteNav) window.SRSiteNav.refresh();
      return;
    }

    navigating = true;
    document.body.classList.add("is-soft-nav");
    document.body.classList.add("is-soft-nav-leaving");

    try {
      await new Promise(r => setTimeout(r, 120));
      const response = await fetch(url.href, {
        credentials: "same-origin",
        headers: { Accept: "text/html" },
      });
      if (!response.ok) throw new Error("HTTP " + response.status);

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      // Preserve live ambient nodes
      const keep = [];
      Array.prototype.forEach.call(document.body.children, function (child) {
        if (isAmbientNode(child)) keep.push(child);
      });

      // Clear non-ambient body nodes
      Array.prototype.slice.call(document.body.children).forEach(function (child) {
        if (!isAmbientNode(child)) child.remove();
      });

      // Import new body content without ambient placeholders or scripts.
      // Scripts must be loaded via ensurePageScripts — importNode copies are inert
      // and used to block library-page.js from ever running after soft-nav.
      Array.prototype.forEach.call(doc.body.children, function (child) {
        if (isAmbientNode(child)) return;
        if (child.tagName === "SCRIPT") return;
        const imported = document.importNode(child, true);
        imported.querySelectorAll("script").forEach(function (script) {
          script.remove();
        });
        document.body.appendChild(imported);
      });

      // Ensure ambient still first for paint order
      keep.forEach(function (node, index) {
        document.body.insertBefore(node, document.body.children[index] || null);
      });

      document.title = doc.title || document.title;
      document.body.className = doc.body.className || "";
      const pageAttr = doc.body.getAttribute("data-site-page");
      if (pageAttr) document.body.setAttribute("data-site-page", pageAttr);
      else document.body.removeAttribute("data-site-page");

      // Sync theme force dark
      document.documentElement.dataset.theme = "dark";

      if (push) history.pushState({ soft: true }, "", url.href);

      await ensurePageScripts(nextKey);
      mountPage(nextKey);
      scrollToHash(url.hash);
    } catch (err) {
      console.warn("[soft-nav] fallback full load", err);
      window.location.href = url.href;
    } finally {
      document.body.classList.remove("is-soft-nav"); document.body.classList.remove("is-soft-nav-leaving");
      navigating = false;
    }
  }

  function shouldSoftNav(anchor, event) {
    if (!anchor || event.defaultPrevented) return false;
    if (event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (anchor.target && anchor.target !== "_self") return false;
    if (anchor.hasAttribute("download")) return false;

    let url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch (_err) {
      return false;
    }
    if (url.origin !== window.location.origin) return false;
    if (!softKey(url.pathname)) return false;
    return url;
  }

  document.addEventListener("click", function (event) {
    const anchor = event.target.closest("a[href]");
    const url = shouldSoftNav(anchor, event);
    if (!url) return;
    event.preventDefault();
    void softNavigate(url, true);
  });

  window.addEventListener("popstate", function () {
    const url = new URL(window.location.href);
    if (!softKey(url.pathname)) return;
    void softNavigate(url, false);
  });

  // Mark already-present page scripts
  document.querySelectorAll("script[src]").forEach(function (script) {
    if (script.src) {
      try {
        const path = new URL(script.src).pathname.split("/").pop();
        const search = new URL(script.src).search;
        // store relative-ish keys we use
        PAGE_SCRIPTS.home.concat(PAGE_SCRIPTS.library).forEach(function (src) {
          if (script.getAttribute("src") === src || script.src.indexOf(src.split("?")[0]) !== -1) {
            loadedScripts.add(src);
          }
        });
      } catch (_err) {
        /* ignore */
      }
    }
  });

  window.SRSoftNav = { go: softNavigate };
})();
