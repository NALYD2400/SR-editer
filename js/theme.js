(function forceDarkTheme() {
  document.documentElement.dataset.theme = "dark";
  try {
    localStorage.setItem("sr_theme", "dark");
  } catch (_err) {
    /* ignore */
  }
})();

function applyTheme() {
  document.documentElement.dataset.theme = "dark";
  try {
    localStorage.setItem("sr_theme", "dark");
  } catch (_err) {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("sr-theme-change", { detail: { theme: "dark" } }));
  return "dark";
}

window.SRTheme = {
  get() {
    return "dark";
  },
  set() {
    return applyTheme();
  },
  toggle() {
    return applyTheme();
  },
  bindToggle() {
    /* Thème clair retiré — dark only */
  },
};
