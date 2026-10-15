/* Street map of Tesla Robotaxi service areas. Leaflet 1.9.4 (BSD-2, self-hosted),
   OSM standard tiles darkened with a CSS filter. Loaded only when scrolled into view. */
(function () {
  var LV = "/assets/vendor/leaflet-1.9.4/";
  var loaded = null;
  function loadLeaflet() {
    if (loaded) return loaded;
    loaded = new Promise(function (res, rej) {
      var l = document.createElement("link"); l.rel = "stylesheet"; l.href = LV + "leaflet.css"; document.head.appendChild(l);
      var s = document.createElement("script"); s.src = LV + "leaflet.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
    return loaded;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function day(s) { return new Date(s + "T12:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); }
  function getJSON(u) { return fetch(u, { cache: "no-store" }).then(function (r) { if (!r.ok) throw u; return r.json(); }); }
  var US = [[24.5, -125], [49.5, -66.5]];

  function build(el, chips, geo, hist) {
    el.innerHTML = "";
    var L = window.L;
    var map = L.map(el, { scrollWheelZoom: false, zoomControl: true, worldCopyJump: false, minZoom: 3, maxZoom: 16 });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, className: "rt-tiles",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" rel="noopener">Leaflet</a>');
    // Wheel zoom only after the visitor engages with the map, off again when they leave.
    map.on("click focus", function () { map.scrollWheelZoom.enable(); el.classList.add("is-engaged"); });
    el.addEventListener("mouseleave", function () { map.scrollWheelZoom.disable(); el.classList.remove("is-engaged"); });
    map.getContainer().addEventListener("blur", function () { map.scrollWheelZoom.disable(); }, true);

    var bounds = {};
    var cities = (hist && hist.cities) || {};
    geo.features.forEach(function (f) {
      var p = f.properties, h = cities[p.slug] || {}, log = h.log || [];
      var exp = log.filter(function (x) { return x.kind === "expanded"; }).pop();
      if (h.previous) L.geoJSON(h.previous, { interactive: false, style: { color: "#a7a9ae", weight: 1.5, dashArray: "5 5", fill: false } }).addTo(map);
      var lyr = L.geoJSON(f, { style: { color: "#e0233f", weight: 2, fillColor: "#c8102e", fillOpacity: 0.3 } }).addTo(map);
      lyr.bindPopup('<strong>' + esc(p.name) + '</strong><br>' + esc(h.statusLabel || "") + '<br>' + Math.round(p.areaSqMi).toLocaleString() + ' mi²<br>Last expanded: ' +
        (exp ? (exp.dateApprox ? "by " : "") + esc(day(exp.date)) : "none since launch"));
      bounds[p.slug] = lyr.getBounds();
    });
    map.fitBounds(US);
    var btns = [["us", "US"]].concat(geo.features.map(function (f) { return [f.properties.slug, f.properties.name.split(",")[0]]; }));
    chips.innerHTML = btns.map(function (b, i) { return '<button type="button" class="rt-chip' + (i ? "" : " is-on") + '" data-slug="' + esc(b[0]) + '" aria-pressed="' + (i ? "false" : "true") + '">' + esc(b[1]) + "</button>"; }).join("");
    chips.addEventListener("click", function (e) {
      var b = e.target.closest(".rt-chip"); if (!b) return;
      chips.querySelectorAll(".rt-chip").forEach(function (c) { c.classList.toggle("is-on", c === b); c.setAttribute("aria-pressed", c === b ? "true" : "false"); });
      var s = b.getAttribute("data-slug");
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (s === "us") map.flyToBounds(US, { animate: !reduce, duration: 1.2 });
      else map.flyToBounds(bounds[s], { padding: [20, 20], animate: !reduce, duration: 1.2 });
    });
  }

  function init() {
    var el = document.querySelector("[data-rt-map]"), chips = document.querySelector("[data-rt-chips]");
    if (!el || el.dataset.ready) return;
    el.dataset.ready = "1";
    var go = function () {
      Promise.all([loadLeaflet(), getJSON("/data/robotaxi-areas.geojson"), getJSON("/data/robotaxi-areas-history.json")])
        .then(function (r) { build(el, chips, r[1], r[2]); })
        .catch(function () { el.innerHTML = '<p class="rt-map-hint">The map couldn’t load.</p>'; });
    };
    if (!("IntersectionObserver" in window)) return go();
    var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); go(); } }, { rootMargin: "300px" });
    io.observe(el);
  }
  document.addEventListener("rt:cities-ready", init);
  if (document.querySelector("[data-rt-map]")) init();
})();
