(() => {
  try {
    if (localStorage.getItem("sd-theme") === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } catch (e) {}
})();
