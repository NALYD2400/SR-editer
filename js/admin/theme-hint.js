(function () {
  if (window.SRTheme && window.SRTheme.bindToggle) {
    window.SRTheme.bindToggle(".theme-toggle");
  }
  function updateHint() {
    var hint = document.getElementById("sidebar-theme-hint");
    if (!hint) return;
    var theme = (window.SRTheme && window.SRTheme.get) ? window.SRTheme.get() : (document.documentElement.dataset.theme || "dark");
    hint.textContent = theme === "light" ? "Clair" : "Sombre";
  }
  updateHint();
  window.addEventListener("sr-theme-change", updateHint);
})();
