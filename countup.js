/* Count-up for headline figures. Opt in with <strong data-countup>11,204</strong> (never data-count: script.js owns that
   one and rewrites the element). The saved HTML keeps the true number, so the page is right without JavaScript, in
   search results and in print. When the figure first scrolls into view it counts up from 0 to that number in about a
   second. Only plain whole numbers with commas, and an optional trailing %, qualify, so nothing else is ever touched.
   Nothing happens for readers who ask for reduced motion, in hidden tabs, or where IntersectionObserver is missing.
   The element's width is fixed to its final width first, so the page never shifts while digits change. */
(function () {
  "use strict";
  var DUR = 1100;
  function parse(text) {
    var m = /^(\d[\d,]*)(%?)$/.exec(String(text).trim());
    if (!m) return null;
    var n = Number(m[1].replace(/,/g, ""));
    return isFinite(n) ? { n: n, suffix: m[2], commas: m[1].indexOf(",") >= 0 } : null;
  }
  function fmt(v, p) { return (p.commas ? Math.round(v).toLocaleString("en-US") : String(Math.round(v))) + p.suffix; }
  function run(el, p, final) {
    var t0 = null;
    function frame(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / DUR), e = 1 - Math.pow(1 - k, 3);
      el.textContent = k < 1 ? fmt(p.n * e, p) : final;
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function start() {
    if (!("IntersectionObserver" in window) || !window.requestAnimationFrame) return;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var els = document.querySelectorAll("[data-countup]");
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, final = el.textContent, p = parse(final);
        if (!p || p.n <= 0 || document.hidden) return;
        // Fixed-width digits first, then measure: measuring before would fix the box narrower than the final number.
        el.style.fontVariantNumeric = "tabular-nums";
        if (getComputedStyle(el).display === "inline") el.style.display = "inline-block";
        el.style.minWidth = Math.ceil(el.getBoundingClientRect().width) + "px";
        run(el, p, final);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }
  window.SDCountUp = { parse: parse, fmt: fmt };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
