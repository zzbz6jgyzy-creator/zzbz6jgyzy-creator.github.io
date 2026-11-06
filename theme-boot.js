(() => {
  try {
    // Explicit, device-only start-page choice. Keep campaign, anchor and public-home links intact.
    if ((location.pathname === "/" || location.pathname === "/index.html") && !location.search && !location.hash && localStorage.getItem("sd-personal-start-v1") === "1") {
      location.replace("/daily.html");
      return;
    }
  } catch (e) {}
  // Section theme (Tesla / SpaceX / Grok): one map decides it, so no page or builder needs editing.
  // CSS lives in section-theme.css; pages that do not link it get it added here. Bump SECTION_CSS_V when it changes.
  try {
    const SECTION_CSS_V = "20261106e";
    const path = location.pathname.replace(/\/index\.html$/, "/");
    const MAP = [
      ["spacex", /^\/(spacex|starship|starlink|see-the-launch|staging|catch)(-[a-z0-9-]*)?(\.html)?$/],
      ["grok", /^\/grok(-[a-z0-9-]*)?(\.html)?$/],
      ["tesla", /^\/(tesla|tsla|cybercab|cybertruck|model3|roadster|fsd|optimus|robotaxi|my-tesla|updates|production|promise-tracker|autonomy|tcmv|goldcab)(-[a-z0-9-]*)?(\.html)?$/],
    ];
    let section = "";
    for (const [name, re] of MAP) if (re.test(path)) { section = name; break; }
    if (section) {
      document.documentElement.setAttribute("data-section", section);
      if (document.head && !document.querySelector('link[href*="section-theme.css"]')) {
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = "/section-theme.css?v=" + SECTION_CSS_V;
        document.head.appendChild(l);
      }
    }
  } catch (e) {}
  // A saved choice wins; otherwise follow the device. Dark stays the fallback where the media query is unsupported.
  let saved = null;
  try { saved = localStorage.getItem("sd-theme"); } catch (e) {}
  const light = saved ? saved === "light" : typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches;
  if (light) document.documentElement.setAttribute("data-theme", "light");
})();
