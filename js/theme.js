(function initThemeEarly() {
  // Always force dark theme for gaming/studio immersion
  document.documentElement.dataset.theme = "dark";
  localStorage.setItem("sr_theme", "dark");
})();

window.SRTheme = {
  get() {
    return "dark";
  },
  set() {
    document.documentElement.dataset.theme = "dark";
    localStorage.setItem("sr_theme", "dark");
    return "dark";
  },
  toggle() {
    return "dark";
  },
  bindToggle(button) {
    if (button) {
      button.style.display = "none";
    }
  }
};
