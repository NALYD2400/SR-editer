(function initTheme() {
  var stored = "dark";
  try {
    stored = localStorage.getItem("sr_theme") || "dark";
  } catch (_err) {
    /* ignore */
  }
  if (stored !== "light" && stored !== "dark") stored = "dark";
  document.documentElement.dataset.theme = stored;
})();

function applyTheme(theme) {
  if (theme !== "light" && theme !== "dark") theme = "dark";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("sr_theme", theme);
  } catch (_err) {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("sr-theme-change", { detail: { theme: theme } }));
  return theme;
}

window.SRTheme = {
  get: function () {
    return document.documentElement.dataset.theme || "dark";
  },
  set: function (theme) {
    return applyTheme(theme);
  },
  toggle: function () {
    var current = document.documentElement.dataset.theme || "dark";
    return applyTheme(current === "dark" ? "light" : "dark");
  },
  bindToggle: function (selector) {
    var buttons = document.querySelectorAll(selector || ".theme-toggle");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.SRTheme.toggle();
      });
    });
  },
};
