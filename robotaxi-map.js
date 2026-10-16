/* Reality Map: Leaflet 1.9.4 (BSD-2, self-hosted), OSM tiles darkened with a CSS filter.
   Loaded only when scrolled into view. Polygons + sourced claim markers. */
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
  var VERIFY = { verified: "Verified", announced: "Announced", sighted: "Sighted", regulatory: "Regulatory" };
  var SUPER = { unsupervised: "Unsupervised", supervised: "Supervised", unknown: "Unknown" };
  var pendingFocus = null;
  var api = { focus: function (id) { pendingFocus = id; }, ready: false };

  function areaStyle(supervision, status) {
    if (supervision === "unsupervised") return { color: "#3ddc97", weight: 2.5, fillColor: "#1fa86a", fillOpacity: 0.34 };
    if (status === "supervised" || (supervision === "supervised" && status !== "testing")) return { color: "#e2c48a", weight: 2.5, fillColor: "#c9a227", fillOpacity: 0.34 };
    return { color: "#8b90a0", weight: 2.5, fillColor: "#6d7178", fillOpacity: 0.26 };
  }

  function claimVisible(c) {
    var F = window.RT_FILTERS || { kind: {}, supervision: {} };
    if (!F.kind[c.kind]) return false;
    if (c.supervision === "unsupervised") return !!F.supervision.unsupervised;
    if (c.supervision === "supervised") return !!F.supervision.supervised;
    return true;
  }

  function popupHtml(c) {
    var superTxt = c.supervision !== "unknown" ? " · " + (SUPER[c.supervision] || c.supervision) : "";
    return "<strong>" + esc(c.title) + "</strong><br>" +
      esc(VERIFY[c.verification] || c.verification) + superTxt + " · " + esc(c.vehicle) + "<br>" +
      "<span>" + esc(c.text) + "</span><br>" +
      (c.date ? esc(day(c.date)) + " · " : "") +
      '<a href="' + esc(c.src) + '" rel="noopener">' + esc(c.srcLabel || "Source") + "</a>";
  }

  function build(el, chips, geo, hist) {
    el.innerHTML = "";
    var L = window.L;
    var REAL = window.ROBOTAXI_REALITY || { claims: [], areas: {} };
    var map = L.map(el, { scrollWheelZoom: false, zoomControl: true, worldCopyJump: false, minZoom: 3, maxZoom: 16 });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, className: "rt-tiles",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" rel="noopener">Leaflet</a>');
    map.fitBounds(US);
    map.invalidateSize();
    map.on("click focus", function () { map.scrollWheelZoom.enable(); el.classList.add("is-engaged"); });
    el.addEventListener("mouseleave", function () { map.scrollWheelZoom.disable(); el.classList.remove("is-engaged"); });
    map.getContainer().addEventListener("blur", function () { map.scrollWheelZoom.disable(); }, true);

    var bounds = {};
    var cities = (hist && hist.cities) || {};
    var areas = REAL.areas || {};
    var areaLayers = {};

    geo.features.forEach(function (f) {
      var p = f.properties, h = cities[p.slug] || {}, log = h.log || [];
      var meta = areas[p.slug] || {};
      var supervision = meta.supervision || (h.status === "active" ? "unsupervised" : "supervised");
      var exp = log.filter(function (x) { return x.kind === "expanded"; }).pop();
      var prev = null;
      if (h.previous) {
        prev = L.geoJSON(h.previous, { interactive: false, style: { color: "#a7a9ae", weight: 1.5, dashArray: "5 5", fill: false } });
        prev.addTo(map);
      }
      var style = areaStyle(supervision, h.status);
      var lyr = L.geoJSON(f, { style: style }).addTo(map);
      var vLabel = meta.verificationLabel || VERIFY[meta.verification] || "";
      var sLabel = meta.supervisionLabel || SUPER[supervision] || h.statusLabel || "";
      var pop = "<strong>" + esc(p.name) + "</strong><br>" +
        esc(h.statusLabel || "") + (vLabel ? " · " + esc(vLabel) : "") + (sLabel ? " · " + esc(sLabel) : "") + "<br>" +
        Math.round(p.areaSqMi).toLocaleString() + " mi²<br>Last expanded: " +
        (exp ? (exp.dateApprox ? "by " : "") + esc(day(exp.date)) : "none since launch");
      lyr.bindPopup(pop);
      var center = p.center ? [p.center[1], p.center[0]] : lyr.getBounds().getCenter();
      var halo = L.circleMarker(center, {
        radius: 20,
        weight: 2,
        color: style.color,
        fillColor: style.fillColor,
        fillOpacity: 0.55
      });
      halo.bindPopup(pop);
      halo.addTo(map);
      bounds[p.slug] = lyr.getBounds();
      areaLayers[p.slug] = { now: lyr, prev: prev, halo: halo, supervision: supervision };
    });

    var claimLayers = {};
    (REAL.claims || []).forEach(function (c) {
      if (c.lat == null || c.lng == null) return;
      var marker = L.circleMarker([c.lat, c.lng], {
        radius: 8,
        weight: 2,
        color: "#0c0d10",
        fillColor: c.kind === "operational" ? "#3ddc97" : c.kind === "expansion" ? "#e2c48a" : c.kind === "regulatory" ? "#7ea6ff" : "#ecece8",
        fillOpacity: 0.95,
        className: "rt-claim-dot is-" + c.kind
      });
      marker.bindPopup(popupHtml(c), { maxWidth: 280 });
      marker.on("click", function () {
        document.dispatchEvent(new CustomEvent("rt:select-claim", { detail: { id: c.id } }));
      });
      marker.addTo(map);
      claimLayers[c.id] = { marker: marker, claim: c };
      if (!bounds[c.slug] && c.slug) bounds[c.slug] = L.latLngBounds([[c.lat, c.lng], [c.lat, c.lng]]);
    });

    function applyFilters() {
      Object.keys(areaLayers).forEach(function (slug) {
        var a = areaLayers[slug];
        var F = window.RT_FILTERS || { kind: {}, supervision: {} };
        var show = !!F.kind.operational && (a.supervision === "unknown" || !!F.supervision[a.supervision]);
        var close = map.getZoom() >= 9;
        if (show) {
          if (!map.hasLayer(a.now)) a.now.addTo(map);
          if (a.halo) {
            if (!close && !map.hasLayer(a.halo)) a.halo.addTo(map);
            if (close && map.hasLayer(a.halo)) map.removeLayer(a.halo);
          }
        } else {
          if (map.hasLayer(a.now)) map.removeLayer(a.now);
          if (a.halo && map.hasLayer(a.halo)) map.removeLayer(a.halo);
        }
        if (a.prev) {
          var showPrev = !!F.kind.expansion;
          if (showPrev) { if (!map.hasLayer(a.prev)) a.prev.addTo(map); }
          else if (map.hasLayer(a.prev)) map.removeLayer(a.prev);
        }
      });
      Object.keys(claimLayers).forEach(function (id) {
        var row = claimLayers[id];
        var show = claimVisible(row.claim);
        if (show) { if (!map.hasLayer(row.marker)) row.marker.addTo(map); }
        else if (map.hasLayer(row.marker)) map.removeLayer(row.marker);
      });
    }

    function focusClaim(id) {
      var row = claimLayers[id];
      if (!row) return;
      var F = window.RT_FILTERS;
      if (F && !claimVisible(row.claim)) return;
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var box = row.claim.slug && bounds[row.claim.slug];
      if (box && box.isValid && box.isValid()) map.flyToBounds(box, { padding: [28, 28], animate: !reduce, duration: 0.95 });
      else map.flyTo([row.claim.lat, row.claim.lng], 7, { animate: !reduce, duration: 0.95 });
      row.marker.openPopup();
    }

    applyFilters();
    map.on("zoomend", applyFilters);
    map.invalidateSize();
    map.fitBounds(US);
    setTimeout(function () { map.invalidateSize(); }, 250);
    var btns = [["us", "US"]].concat(geo.features.map(function (f) { return [f.properties.slug, f.properties.name.split(",")[0]]; }));
    chips.innerHTML = btns.map(function (b, i) {
      return '<button type="button" class="rt-chip' + (i ? "" : " is-on") + '" data-slug="' + esc(b[0]) + '" aria-pressed="' + (i ? "false" : "true") + '">' + esc(b[1]) + "</button>";
    }).join("");
    chips.addEventListener("click", function (e) {
      var b = e.target.closest(".rt-chip"); if (!b) return;
      chips.querySelectorAll(".rt-chip").forEach(function (c) { c.classList.toggle("is-on", c === b); c.setAttribute("aria-pressed", c === b ? "true" : "false"); });
      var s = b.getAttribute("data-slug");
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (s === "us") map.flyToBounds(US, { animate: !reduce, duration: 1.2 });
      else if (bounds[s]) map.flyToBounds(bounds[s], { padding: [20, 20], animate: !reduce, duration: 1.2 });
    });

    document.addEventListener("rt:filters", applyFilters);
    api.focus = focusClaim;
    api.ready = true;
    if (pendingFocus) { focusClaim(pendingFocus); pendingFocus = null; }
  }

  function init() {
    var el = document.querySelector("[data-rt-map]"), chips = document.querySelector("[data-rt-chips]");
    if (!el || el.dataset.ready) return;
    el.dataset.ready = "1";
    var go = function () {
      Promise.all([loadLeaflet(), getJSON("/data/robotaxi-areas.geojson"), getJSON("/data/robotaxi-areas-history.json")])
        .then(function (r) { build(el, chips, r[1], r[2]); })
        .catch(function (err) {
          console.error("rt-map", err);
          el.innerHTML = '<p class="rt-map-hint">The map couldn’t load.</p>';
        });
    };
    if (!("IntersectionObserver" in window)) return go();
    var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); go(); } }, { rootMargin: "300px" });
    io.observe(el);
  }
  window.RT_MAP = api;
  document.addEventListener("rt:focus-claim", function (e) {
    var id = e.detail && e.detail.id;
    if (!id) return;
    if (api.ready) api.focus(id);
    else pendingFocus = id;
  });
  document.addEventListener("rt:cities-ready", init);
  document.addEventListener("rt:select-claim", function (e) {
    var id = e.detail && e.detail.id;
    if (!id) return;
    var card = document.querySelector('[data-rt-claim="' + id + '"]');
    if (card) {
      document.querySelectorAll("[data-rt-claim]").forEach(function (el) { el.classList.toggle("is-on", el === card); });
      card.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  });
  if (document.querySelector("[data-rt-map]")) init();
})();
