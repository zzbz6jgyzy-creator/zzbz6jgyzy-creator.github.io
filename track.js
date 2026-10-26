(() => {
  // Privacy-friendly event counts (no cookies, no IDs, no query text).
  // Counts land in the sd-events Worker; see data/README.md.
  if (window.__sdTrack) return; window.__sdTrack = 1;
  const EP = "https://sd-events.superchargeddaily.workers.dev/e";
  const ALLOW = new Set([
    "signup_submit",
    "latest_issue_click",
    "referral_click",
    "search_open",
    "search_go",
    "theme_toggle",
    "dispatch_filter",
    "tesmag_click",
    "orbital_globe_load",
    "orbital_globe_fail",
    "orbital_sat_select",
    "orbital_starlink",
    "orbital_search",
    "orbital_time",
    "orbital_above",
    "orbital_pass",
    "orbital_mission",
    "orbital_challenge",
    "orbital_share",
    "orbital_quality",
  ]);
  const send = (n) => {
    if (!ALLOW.has(n)) return;
    const u = EP + "?n=" + n + "&p=" + encodeURIComponent(location.pathname);
    try { if (navigator.sendBeacon && navigator.sendBeacon(u)) return; } catch (e) {}
    try { fetch(u, { method: "POST", mode: "no-cors", keepalive: true }); } catch (e) {}
  };
  window.sdTrack = send;
  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (!f || !f.matches) return;
    if (f.matches("[data-newsletter-form]") && f.querySelector("input[type=email]") && f.querySelector("input[type=email]").value.trim()) send("signup_submit");
    if (f.getAttribute("data-sd-track") === "search") send("search_go");
  }, true);
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    if (a.classList.contains("sd-latest")) send("latest_issue_click");
    else if (/^https:\/\/ts\.la\//.test(a.href)) send("referral_click");
    else if (/teslaacessories\.com/.test(a.href) && /referral_code=J72E6FRRQ7QK/.test(a.href)) send("tesmag_click");
  }, true);
})();
