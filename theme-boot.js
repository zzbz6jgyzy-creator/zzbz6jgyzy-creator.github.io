(() => {
  try {
    // Explicit, device-only start-page choice. Keep campaign, anchor and public-home links intact.
    if ((location.pathname === "/" || location.pathname === "/index.html") && !location.search && !location.hash && localStorage.getItem("sd-personal-start-v1") === "1") {
      location.replace("/daily.html");
      return;
    }
    if (localStorage.getItem("sd-theme") === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } catch (e) {}
})();
