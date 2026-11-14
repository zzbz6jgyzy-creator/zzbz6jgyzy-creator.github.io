/* Event countdown (Flight 15 hub, homepage feature, homepage "Next livestream").
   Markup: <div data-countdown data-start="ISO" data-end="ISO"> with optional
   [data-cd-label], [data-cd-time], [data-cd-sub] children and data-after-label.
   Before the start: "T−" and a ticking d hh:mm:ss (data-cd-urgent="soon" in the last 10 minutes, "final" in the last minute). During start..end: "Launch window open".
   After the end: the after label (default "Launched"). The saved HTML always shows the
   absolute time, so the page is correct with JavaScript off and never shows a stale
   relative time. Once the window has closed, the builder also bakes the after-label
   into the saved markup so no-JS readers are not stuck on "Launch window opens".
   One timer drives every countdown on the page. */
(function () {
  "use strict";
  function attr(el, k, d) { return el.hasAttribute(k) ? el.getAttribute(k) : d; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function span(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return (d ? d + "d " : "") + pad(h) + ":" + pad(m) + ":" + pad(s % 60);
  }
  function render(el, now) {
    var start = Date.parse(el.getAttribute("data-start")), end = Date.parse(el.getAttribute("data-end") || "") || start;
    if (!isFinite(start)) return;
    var label = el.querySelector("[data-cd-label]"), time = el.querySelector("[data-cd-time]"), sub = el.querySelector("[data-cd-sub]");
    var state = now < start ? "before" : now < end ? "open" : "after";
    if (el.getAttribute("data-cd-state") !== state) el.setAttribute("data-cd-state", state);
    // Launch-clock tension (CSS does the animating, and only when the reader allows motion): the last 10 minutes
    // before the window opens are "soon", the last minute is "final".
    var until = start - now, urgent = state === "before" && until <= 600000 ? (until <= 60000 ? "final" : "soon") : "";
    if ((el.getAttribute("data-cd-urgent") || "") !== urgent) { if (urgent) el.setAttribute("data-cd-urgent", urgent); else el.removeAttribute("data-cd-urgent"); }
    // The saved line under the countdown already carries the full date, so only the big line changes.
    if (!el.hasAttribute("data-cd-fixed")) el.setAttribute("data-cd-fixed", time ? time.textContent : "");
    var fixed = el.getAttribute("data-cd-fixed");
    if (state === "before") {
      if (label) label.textContent = attr(el, "data-before-label", "Launch window opens in");
      if (time) time.textContent = span(start - now);
    } else if (state === "open") {
      if (label) label.textContent = attr(el, "data-open-label", "Launch window open");
      if (time) time.textContent = attr(el, "data-open-prefix", "Closes in ") + span(end - now);
    } else {
      if (label) label.textContent = attr(el, "data-after-label", "Launched");
      if (time) time.textContent = fixed;
      if (sub && el.getAttribute("data-after-sub")) sub.textContent = el.getAttribute("data-after-sub");
    }
  }
  function tick() {
    var now = Date.now();
    document.querySelectorAll("[data-countdown]").forEach(function (el) { render(el, now); });
  }
  function start() { tick(); setInterval(tick, 1000); }
  window.SDCountdown = { render: render, tick: tick };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
