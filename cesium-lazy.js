/* Loads CesiumJS (≈3 MB) only when a globe is actually needed.
   window.loadCesium() -> Promise<Cesium>, safe to call many times. */
(function () {
  var BASE = "https://cdn.jsdelivr.net/npm/cesium@1.124.0/Build/Cesium/";
  var p = null;
  window.CESIUM_BASE_URL = window.CESIUM_BASE_URL || BASE;
  window.loadCesium = function () {
    if (window.Cesium) return Promise.resolve(window.Cesium);
    if (p) return p;
    p = new Promise(function (resolve, reject) {
      var css = document.createElement("link");
      css.rel = "stylesheet"; css.href = BASE + "Widgets/widgets.css";
      document.head.appendChild(css);
      var s = document.createElement("script");
      s.src = BASE + "Cesium.js"; s.async = true;
      s.onload = function () { window.Cesium ? resolve(window.Cesium) : reject(new Error("cesium")); };
      s.onerror = function () { p = null; reject(new Error("cesium-load")); };
      document.head.appendChild(s);
    });
    return p;
  };
  /* Calls fn once el is near the viewport AND the browser is idle (or the user has interacted). */
  window.whenGlobeWanted = function (el, fn) {
    var done = false, seen = false, acted = false;
    function fire() { if (done) return; done = true; fn(); }
    function maybe() { if (seen && acted) fire(); }
    var idle = window.requestIdleCallback || function (cb) { return setTimeout(cb, 1200); };
    var ev = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"];
    function act() { acted = true; ev.forEach(function (e) { removeEventListener(e, act, true); }); maybe(); }
    ev.forEach(function (e) { addEventListener(e, act, { capture: true, passive: true }); });
    if (!("IntersectionObserver" in window)) { seen = true; idle(fire); return fire; }
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (x) { return x.isIntersecting; })) { io.disconnect(); seen = true; idle(maybe); }
    }, { rootMargin: "300px" });
    io.observe(el);
    return fire;
  };
})();
