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
    // newsletter.js counts a handoff only after email and honeypot validation.
    // A handoff is not a confirmed Beehiiv subscription.
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
