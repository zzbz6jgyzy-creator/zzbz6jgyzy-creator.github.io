(() => {
  // Privacy-friendly event counts (no cookies, no IDs): sign-up submits, latest-issue clicks, Tesla referral clicks.
  // Counts land in the sd-events Worker; see data/README.md.
  if (window.__sdTrack) return; window.__sdTrack = 1;
  const EP = "https://sd-events.superchargeddaily.workers.dev/e";
  const send = (n) => {
    const u = EP + "?n=" + n + "&p=" + encodeURIComponent(location.pathname);
    try { if (navigator.sendBeacon && navigator.sendBeacon(u)) return; } catch (e) {}
    try { fetch(u, { method: "POST", mode: "no-cors", keepalive: true }); } catch (e) {}
  };
  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (f && f.matches && f.matches("[data-newsletter-form]") && f.querySelector("input[type=email]") && f.querySelector("input[type=email]").value.trim()) send("signup_submit");
  }, true);
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    if (a.classList.contains("sd-latest")) send("latest_issue_click");
    else if (/^https:\/\/ts\.la\//.test(a.href)) send("referral_click");
  }, true);
})();
