(function initThemeEarly() {
  const savedTheme = localStorage.getItem("sr_theme");
  const theme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
  document.documentElement.dataset.theme = theme;
})();

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem("sr_theme", nextTheme);
  document.querySelectorAll("[data-theme-toggle-bound]").forEach((button) => {
    button.setAttribute("aria-pressed", String(nextTheme === "light"));
    button.setAttribute("title", nextTheme === "dark" ? "Activer le thème clair" : "Activer le thème sombre");
  });
  document.querySelectorAll("[data-theme-label]").forEach((label) => {
    label.textContent = nextTheme === "dark" ? "Clair" : "Sombre";
  });
  window.dispatchEvent(new CustomEvent("sr-theme-change", { detail: { theme: nextTheme } }));
  return nextTheme;
}

window.SRTheme = {
  get() {
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
  },
  set(theme) {
    return applyTheme(theme);
  },
  toggle() {
    return applyTheme(this.get() === "dark" ? "light" : "dark");
  },
  bindToggle(button) {
    if (!button || button.dataset.themeToggleBound) return;
    button.dataset.themeToggleBound = "true";
    const theme = this.get();
    button.setAttribute("aria-pressed", String(theme === "light"));
    button.setAttribute("title", theme === "dark" ? "Activer le thème clair" : "Activer le thème sombre");
    const label = button.querySelector("[data-theme-label]");
    if (label) label.textContent = theme === "dark" ? "Clair" : "Sombre";
    button.addEventListener("click", () => this.toggle());
  }
};
