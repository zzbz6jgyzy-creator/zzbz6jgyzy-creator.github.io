// Count tracker numbers up once when they scroll into view. Skipped for reduced motion.
(function () {
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var els = document.querySelectorAll(".stats .stat b, .fsd-kpi b, .cc-stat b, .sl-n");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      run(e.target);
    });
  }, { threshold: 0.5 });
  function run(el) {
    var text = el.textContent.trim();
    var m = text.match(/^([^\d]*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
    if (!m || /[A-Za-z]/.test(m[1]) || /^\d{4}$/.test(m[2])) return;
    var raw = m[2], target = parseFloat(raw.replace(/,/g, ""));
    if (!isFinite(target) || target === 0) return;
    var decimals = (raw.split(".")[1] || "").length, commas = raw.indexOf(",") > -1;
    var start = null, dur = 900;
    el.setAttribute("aria-label", text);
    el.style.fontVariantNumeric = "tabular-nums";
    function fmt(v) {
      var s = v.toFixed(decimals);
      if (commas) s = Number(s).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      return m[1] + s + m[3];
    }
    function step(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dur), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = p < 1 ? fmt(target * eased) : text;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function init() { els = document.querySelectorAll(".stats .stat b, .fsd-kpi b, .cc-stat b, .sl-n"); els.forEach(function (el) { io.observe(el); }); }
  if (document.readyState === "complete") init(); else window.addEventListener("load", init);
})();
