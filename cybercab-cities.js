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
  Promise.all(["/data/robotaxi-fleet.json", "/data/robotaxi-areas.geojson", "/data/robotaxi-areas-history.json"].map(function (u) {
    return fetch(u, { cache: "no-store" }).then(function (r) { if (!r.ok) throw u; return r.json(); });
  })).then(function (res) {
    var fleet = res[0], geo = res[1], hist = res[2];
    var states = fleet.states, html = "";
    html += '<div class="rt-map-wrap"><div class="rt-chips" role="toolbar" aria-label="Jump to a service area" data-rt-chips></div><div class="rt-map" data-rt-map aria-label="Street map of Tesla Robotaxi service areas"><p class="rt-map-hint">Map loads when you scroll here&hellip;</p></div></div>';
    html += '<div class="rt-legend" aria-hidden="true"><span><i class="rt-sw-now"></i>Current service area</span><span><i class="rt-sw-prev"></i>Area before last change</span><span>Click or tap the map to zoom with the wheel</span></div>';
    var rows = geo.features.map(function (f) {
      var p = f.properties, h = (hist.cities || {})[p.slug] || {}, log = h.log || [];
      var st = (p.name.split(", ")[1]) || "", stName = STATE[st], fs = stName && states[stName];
      var exp = log.filter(function (l) { return l.kind === "expanded"; }).pop();
      var expTxt = exp ? (exp.dateApprox ? "by " : "") + day(exp.date) + ' <span class="rt-sub">' + num(exp.from) + " → " + num(exp.areaSqMi) + " mi²</span> " + link(exp.src) : "None since launch";
      var fleetTxt;
      if (!fs) fleetTxt = "No sourced count";
      else if (st === "TX") fleetTxt = 'No city count <span class="rt-sub">(Texas: ' + num(fs.count) + " registered)</span>";
      else if (p.slug === "bay_area") fleetTxt = "~" + num(fs.count) + ' active <span class="rt-sub">(estimate, ' + esc(day(fs.asOf)) + ")</span> " + link(fs.src);
      else fleetTxt = 'No city count <span class="rt-sub">(Florida: ~' + num(fs.count) + " spotted)</span>";
      return '<tr class="is-' + esc(h.status || "testing") + '"><th scope="row">' + esc(p.name) + '</th><td><span class="rt-status">' + esc(h.statusLabel || "") + "</span></td><td>" +
        num(Math.round(p.areaSqMi)) + " mi²</td><td>" + expTxt + "</td><td>" + fleetTxt + "</td></tr>";
    }).join("");
    html += '<div class="rt-table-wrap"><table class="rt-table"><thead><tr><th scope="col">City</th><th scope="col">Status</th><th scope="col">Area</th><th scope="col">Last expanded</th><th scope="col">Model Y fleet</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
    html += '<p class="rt-fine">Service areas from ' + link(geo.source.url, "robotaxi-service-areas") + " (MIT), traced from the Tesla Robotaxi app. Earlier expansions from " + link("https://robotracker.app/updates", "robotracker.app") + ". Status: " + link("https://robotracker.app/updates", "robotracker.app") + ", Bay Area " + link("https://electrek.co/2026/03/25/california-regulator-confirms-tesla-not-operating-autonomous-vehicle-service/", "CPUC via Electrek") + ". Shapes checked " + stamp(geo.checked) + ".</p>";
    root.innerHTML = html;
    document.dispatchEvent(new CustomEvent("rt:cities-ready"));
  }).catch(function () { root.innerHTML = '<p class="cc-count-empty">City data couldn’t load.</p>'; });
})();
