(function () {
  var theme = "light";
  try {
    if (localStorage.getItem("rbi_theme") === "dark") theme = "dark";
  } catch (err) {
    theme = "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
})();
