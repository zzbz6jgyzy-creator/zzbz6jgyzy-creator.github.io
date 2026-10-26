(() => {
  try {
    // Explicit, device-only start-page choice. Keep campaign, anchor and public-home links intact.
    if ((location.pathname === "/" || location.pathname === "/index.html") && !location.search && !location.hash && localStorage.getItem("sd-personal-start-v1") === "1") {
      location.replace("/daily.html");
      return;
    }
  } catch (e) {}
  // A saved choice wins; otherwise follow the device. Dark stays the fallback where the media query is unsupported.
  let saved = null;
  try { saved = localStorage.getItem("sd-theme"); } catch (e) {}
  const light = saved ? saved === "light" : typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches;
  if (light) document.documentElement.setAttribute("data-theme", "light");
})();
