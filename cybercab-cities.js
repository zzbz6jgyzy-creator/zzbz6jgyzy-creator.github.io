/* Robotaxi (Model Y) across the US: nationwide total, per-city geofence maps.
   Data: /data/robotaxi-fleet.json, /data/robotaxi-areas.geojson,
   /data/robotaxi-areas-history.json (all refreshed twice a day). */
(function () {
  var root = document.querySelector("[data-rt-cities]");
  if (!root) return;
  var STATE = { TX: "Texas", CA: "California", FL: "Florida" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function day(s) { return new Date(s + "T12:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); }
  function stamp(iso) { return '<time datetime="' + esc(iso) + '">' + esc(new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })) + "</time>"; }
  function link(u, t) { return '<a href="' + esc(u) + '" rel="noopener">' + esc(t || "Source") + "</a>"; }
  function num(n) { return Number(n).toLocaleString(); }
  function rings(g) { return g.type === "MultiPolygon" ? [].concat.apply([], g.coordinates) : g.coordinates; }
  function svg(feat, prev, name) {
    var all = rings(feat.geometry).concat(prev ? rings(prev) : []);
    var xs = [], ys = [], lat0 = 0, n = 0;
    all.forEach(function (r) { r.forEach(function (p) { lat0 += p[1]; n++; }); });
    var k = Math.cos((lat0 / n) * Math.PI / 180);
    all.forEach(function (r) { r.forEach(function (p) { xs.push(p[0] * k); ys.push(-p[1]); }); });
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
    var W = 200, Hh = 150, pad = 10, s = Math.min((W - 2 * pad) / (x1 - x0), (Hh - 2 * pad) / (y1 - y0));
    var ox = (W - (x1 - x0) * s) / 2, oy = (Hh - (y1 - y0) * s) / 2;
    function d(g) { return rings(g).map(function (r) { return "M" + r.map(function (p) { return ((p[0] * k - x0) * s + ox).toFixed(1) + "," + ((-p[1] - y0) * s + oy).toFixed(1); }).join("L") + "Z"; }).join(""); }
    return '<svg class="rt-geo" viewBox="0 0 ' + W + " " + Hh + '" role="img" aria-label="' + esc(name) + ' service area outline">' +
      (prev ? '<path class="rt-geo-prev" d="' + d(prev) + '"/>' : "") + '<path class="rt-geo-now" fill-rule="evenodd" d="' + d(feat.geometry) + '"/></svg>';
  }
  Promise.all(["/data/robotaxi-fleet.json", "/data/robotaxi-areas.geojson", "/data/robotaxi-areas-history.json"].map(function (u) {
    return fetch(u, { cache: "no-store" }).then(function (r) { if (!r.ok) throw u; return r.json(); });
  })).then(function (res) {
    var fleet = res[0], geo = res[1], hist = res[2];
    var states = fleet.states, total = 0, parts = [];
    Object.keys(states).forEach(function (k) { var s = states[k]; total += s.count; parts.push("<li><strong>" + num(s.count) + "</strong> " + esc(k) + ' <span class="rt-kind">' + (s.kind === "estimate" ? "estimate" : "registered") + ", " + esc(day(s.asOf)) + "</span> " + link(s.src) + "</li>"); });
    var html = '<article class="rt-total"><p class="cc-count-tag">Robotaxi · Model Y · US</p><h3>Nationwide Robotaxi fleet</h3>' +
      '<p class="rt-total-n"><strong>' + num(total) + "</strong> Model Y robotaxis across " + Object.keys(states).length + " states</p>" +
      '<ul class="rt-total-parts">' + parts.join("") + "</ul>" +
      '<p class="rt-fine">Adds Texas registrations to third-party estimates elsewhere, so treat it as a rough total. Cybercabs aren’t included (they’re counted above). Updated ' + stamp(fleet.checked) + " · via " + link(fleet.aggregator.url, fleet.aggregator.name) + "</p></article>";
    html += '<div class="rt-map-wrap"><div class="rt-chips" role="toolbar" aria-label="Jump to a service area" data-rt-chips></div><div class="rt-map" data-rt-map aria-label="Street map of Tesla Robotaxi service areas"><p class="rt-map-hint">Map loads when you scroll here&hellip;</p></div></div>';
    html += '<div class="rt-legend" aria-hidden="true"><span><i class="rt-sw-now"></i>Current service area</span><span><i class="rt-sw-prev"></i>Area before last change</span><span>Click or tap the map to zoom with the wheel</span></div>';
    html += '<div class="rt-grid">';
    geo.features.forEach(function (f) {
      var p = f.properties, h = (hist.cities || {})[p.slug] || {}, log = h.log || [];
      var st = (p.name.split(", ")[1]) || "";
      var stName = STATE[st];
      var fs = stName && states[stName];
      var exp = log.filter(function (l) { return l.kind === "expanded"; }).pop();
      var expTxt = exp ? (exp.dateApprox ? "by " : "") + day(exp.date) + " (" + num(exp.from) + " → " + num(exp.areaSqMi) + " mi²)" : "No expansion since launch";
      var launch = log[0];
      var fleetTxt;
      if (st === "TX") fleetTxt = "No city count. Texas-wide: " + num(fs.count) + " registered Model Ys " + link(fs.src);
      else if (p.slug === "bay_area" && fs) fleetTxt = "~" + num(fs.count) + " active (estimate, " + esc(day(fs.asOf)) + ") " + link(fs.src);
      else if (fs) fleetTxt = "No city count. Florida-wide: ~" + num(fs.count) + " spotted (" + esc(day(fs.asOf)) + ") " + link(fs.src);
      else fleetTxt = "No sourced count";
      html += '<article class="rt-city is-' + esc(h.status || "testing") + '">' + svg(f, h.previous, p.name) +
        '<div class="rt-city-body"><header><h3>' + esc(p.name) + '</h3><span class="rt-status">' + esc(h.statusLabel || "") + "</span></header>" +
        '<dl><div><dt>Area</dt><dd>' + num(Math.round(p.areaSqMi)) + " mi²</dd></div>" +
        "<div><dt>Last expanded</dt><dd>" + expTxt + (exp ? " " + link(exp.src) : "") + "</dd></div>" +
        (launch ? "<div><dt>Launched</dt><dd>" + day(launch.date) + "</dd></div>" : "") +
        "<div><dt>Fleet</dt><dd>" + fleetTxt + "</dd></div></dl></div></article>";
    });
    html += "</div>";
    html += '<p class="rt-fine">Service areas from ' + link(geo.source.url, "robotaxi-service-areas") + " (MIT), traced from the Tesla Robotaxi app. Earlier expansions from " + link("https://robotracker.app/updates", "robotracker.app") + ". Status: " + link("https://robotracker.app/updates", "robotracker.app") + ", Bay Area " + link("https://electrek.co/2026/03/25/california-regulator-confirms-tesla-not-operating-autonomous-vehicle-service/", "CPUC via Electrek") + ". Each map is scaled to fit its card, so compare areas by the mi² figure. Shapes checked " + stamp(geo.checked) + ".</p>";
    root.innerHTML = html;
    document.dispatchEvent(new CustomEvent("rt:cities-ready"));
  }).catch(function () { root.innerHTML = '<p class="cc-count-empty">City data couldn’t load.</p>'; });
})();
