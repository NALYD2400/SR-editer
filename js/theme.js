(function initThemeEarly() {
  const stored = localStorage.getItem("sr_theme");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const theme = stored === "light" || stored === "dark" ? stored : prefersLight ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
})();

window.SRTheme = {
  get() {
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
  },
  set(theme) {
    const next = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("sr_theme", next);
    window.dispatchEvent(new CustomEvent("sr-theme-change", { detail: { theme: next } }));
    return next;
  },
  toggle() {
    return this.set(this.get() === "dark" ? "light" : "dark");
  },
  bindToggle(button) {
    if (!button) return;
    const sync = () => {
      const isLight = this.get() === "light";
      button.setAttribute("aria-pressed", isLight ? "true" : "false");
      button.title = isLight ? "Passer en mode sombre" : "Passer en mode clair";
      const label = button.querySelector("[data-theme-label]");
      if (label) label.textContent = isLight ? "Sombre" : "Clair";
    };
    button.addEventListener("click", () => {
      this.toggle();
      sync();
    });
    window.addEventListener("sr-theme-change", sync);
    sync();
  }
};
