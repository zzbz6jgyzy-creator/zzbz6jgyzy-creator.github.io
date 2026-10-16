/* Robotaxi Reality Map: nationwide geofences, sourced claims, verification.
   Data: /data/robotaxi-fleet.json, /data/robotaxi-areas.geojson,
   /data/robotaxi-areas-history.json, window.ROBOTAXI_REALITY. */
(function () {
  var root = document.querySelector("[data-rt-cities]");
  if (!root) return;
  var REAL = window.ROBOTAXI_REALITY || { claims: [], kinds: [], supervision: [], areas: {} };
  var STATE = { TX: "Texas", CA: "California", FL: "Florida" };
  var VERIFY = { verified: "Verified", announced: "Announced", sighted: "Sighted", regulatory: "Regulatory" };
  var SUPER = { unsupervised: "Unsupervised", supervised: "Supervised", unknown: "Unknown" };

  window.RT_FILTERS = window.RT_FILTERS || {
    kind: { operational: true, expansion: true, regulatory: true, sighting: true },
    supervision: { unsupervised: true, supervised: true }
  };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function day(s) { return new Date(s + "T12:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); }
  function stamp(iso) { return '<time datetime="' + esc(iso) + '">' + esc(new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })) + "</time>"; }
  function link(u, t) { return '<a href="' + esc(u) + '" rel="noopener">' + esc(t || "Source") + "</a>"; }

  function claimVisible(c) {
    var F = window.RT_FILTERS;
    if (!F.kind[c.kind]) return false;
    if (c.supervision === "unsupervised") return !!F.supervision.unsupervised;
    if (c.supervision === "supervised") return !!F.supervision.supervised;
    return true;
  }

  function pills(c) {
    return '<span class="rt-pill is-verify is-' + esc(c.verification) + '">' + esc(VERIFY[c.verification] || c.verification) + "</span>" +
      (c.supervision !== "unknown" ? '<span class="rt-pill is-super is-' + esc(c.supervision) + '">' + esc(SUPER[c.supervision]) + "</span>" : "") +
      '<span class="rt-pill is-kind is-' + esc(c.kind) + '">' + esc(c.kind) + "</span>";
  }

  function renderGlance(el, claims) {
    if (!el) return;
    function slugs(list) {
      var s = {};
      list.forEach(function (c) { if (c.slug) s[c.slug] = 1; });
      return Object.keys(s).length;
    }
    var unsup = slugs(claims.filter(function (c) { return c.kind === "operational" && c.supervision === "unsupervised"; }));
    var sup = slugs(claims.filter(function (c) { return c.kind === "operational" && c.supervision === "supervised"; }));
    var exp = claims.filter(function (c) { return c.kind === "expansion" && c.verification === "announced"; }).length;
    var sight = claims.filter(function (c) { return c.kind === "sighting"; }).length;
    var reg = claims.filter(function (c) { return c.kind === "regulatory"; }).length;
    el.innerHTML =
      '<div class="rt-glance-item"><b>' + unsup + "</b><span>Unsupervised public cit" + (unsup === 1 ? "y" : "ies") + "</span></div>" +
      '<div class="rt-glance-item"><b>' + sup + "</b><span>Supervised / testing area" + (sup === 1 ? "" : "s") + "</span></div>" +
      '<div class="rt-glance-item"><b>' + exp + "</b><span>Announced expansion" + (exp === 1 ? "" : "s") + "</span></div>" +
      '<div class="rt-glance-item"><b>' + reg + "</b><span>Regulatory item" + (reg === 1 ? "" : "s") + "</span></div>" +
      '<div class="rt-glance-item"><b>' + sight + "</b><span>Vehicle sighting" + (sight === 1 ? "" : "s") + "</span></div>";
  }

  function renderFilters() {
    var kinds = REAL.kinds || [];
    var supers = REAL.supervision || [];
    var F = window.RT_FILTERS;
    function chips(list, group) {
      return list.map(function (k) {
        var on = !!F[group][k.id];
        return '<button type="button" class="rt-chip' + (on ? " is-on" : "") + '" data-rt-filter="' + esc(group) + '" data-id="' + esc(k.id) + '" aria-pressed="' + (on ? "true" : "false") + '">' + esc(k.label) + "</button>";
      }).join("");
    }
    return '<div class="rt-filters">' +
      '<div class="rt-filter-block"><p class="rt-filter-k">Claims</p><div class="rt-chips" role="toolbar" aria-label="Filter by claim type">' + chips(kinds, "kind") + "</div></div>" +
      '<div class="rt-filter-block"><p class="rt-filter-k">Supervision</p><div class="rt-chips" role="toolbar" aria-label="Filter by supervision">' + chips(supers, "supervision") + "</div></div>" +
      "</div>";
  }

  function renderClaims(el, claims) {
    if (!el) return;
    function rank(c) {
      if (c.kind === "operational" && c.supervision === "unsupervised") return 0;
      if (c.kind === "expansion" && c.verification === "announced") return 1;
      if (c.kind === "sighting") return 2;
      if (c.kind === "operational") return 3;
      if (c.kind === "expansion") return 4;
      return 5;
    }
    var shown = claims.filter(claimVisible).slice().sort(function (a, b) {
      var d = rank(a) - rank(b);
      return d || (b.date || "").localeCompare(a.date || "");
    });
    if (!shown.length) {
      el.innerHTML = '<p class="rt-claims-empty">No claims match these filters.</p>';
      return;
    }
    el.innerHTML = '<p class="rt-claims-k">' + shown.length + " claim" + (shown.length === 1 ? "" : "s") + "</p>" +
      shown.map(function (c) {
        return '<article class="rt-claim is-' + esc(c.kind) + '" id="claim-' + esc(c.id) + '" data-rt-claim="' + esc(c.id) + '" tabindex="0">' +
          '<header><h3>' + esc(c.title) + "</h3><p class=\"rt-claim-pills\">" + pills(c) + "</p></header>" +
          "<p>" + esc(c.text) + "</p>" +
          '<p class="rt-claim-meta"><span>' + esc(c.vehicle) + "</span><time datetime=\"" + esc(c.date) + "\">" + esc(day(c.date)) + "</time> " +
          link(c.src, c.srcLabel || "Source") + "</p></article>";
      }).join("");
  }

  function emitFilters() {
    document.dispatchEvent(new CustomEvent("rt:filters"));
  }

  function focusClaim(id, scrollCard) {
    var card = root.querySelector('[data-rt-claim="' + id + '"]');
    root.querySelectorAll("[data-rt-claim]").forEach(function (el) { el.classList.toggle("is-on", el === card); });
    if (scrollCard && card) card.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    document.dispatchEvent(new CustomEvent("rt:focus-claim", { detail: { id: id } }));
    if (history.replaceState) history.replaceState(null, "", "#claim-" + id);
  }

  Promise.all(["/data/robotaxi-fleet.json", "/data/robotaxi-areas.geojson", "/data/robotaxi-areas-history.json"].map(function (u) {
    return fetch(u, { cache: "no-store" }).then(function (r) { if (!r.ok) throw u; return r.json(); });
  })).then(function (res) {
    var fleet = res[0], geo = res[1], hist = res[2];
    var states = fleet.states, html = "";
    html += '<div class="rt-glance" data-rt-glance></div>';
    html += renderFilters();
    html += '<div class="rt-map-wrap"><p class="rt-filter-k">Cities</p><div class="rt-chips" role="toolbar" aria-label="Jump to a service area" data-rt-chips></div>';
    html += '<div class="rt-board"><div class="rt-map" data-rt-map aria-label="Street map of Tesla Robotaxi service areas and sourced claims"><p class="rt-map-hint">Map loads when you scroll here&hellip;</p></div>';
    html += '<div class="rt-claims" data-rt-claims></div></div></div>';
    html += '<div class="rt-legend" aria-hidden="true">' +
      '<span><i class="rt-sw-unsup"></i>Unsupervised public</span>' +
      '<span><i class="rt-sw-sup"></i>Supervised / safety driver</span>' +
      '<span><i class="rt-sw-test"></i>Testing geofence</span>' +
      '<span><i class="rt-sw-prev"></i>Area before last change</span>' +
      "<span>City dots at country zoom; outlines when you zoom in. Click the map to use the wheel.</span></div>";
    var areas = REAL.areas || {};
    var rows = geo.features.map(function (f) {
      var p = f.properties, h = (hist.cities || {})[p.slug] || {}, log = h.log || [];
      var meta = areas[p.slug] || {};
      var st = (p.name.split(", ")[1]) || "", stName = STATE[st], fs = stName && states[stName];
      var exp = log.filter(function (l) { return l.kind === "expanded"; }).pop();
      var expTxt = exp ? (exp.dateApprox ? "by " : "") + day(exp.date) + ' <span class="rt-sub">' + Number(exp.from).toLocaleString() + " → " + Number(exp.areaSqMi).toLocaleString() + " mi²</span> " + link(exp.src) : "None since launch";
      var fleetTxt;
      if (!fs) fleetTxt = "No sourced count";
      else if (st === "TX") fleetTxt = 'No city count <span class="rt-sub">(Texas: ' + Number(fs.count).toLocaleString() + " registered)</span>";
      else if (p.slug === "bay_area") fleetTxt = "~" + Number(fs.count).toLocaleString() + ' active <span class="rt-sub">(estimate, ' + esc(day(fs.asOf)) + ")</span> " + link(fs.src);
      else fleetTxt = 'No city count <span class="rt-sub">(Florida: ~' + Number(fs.count).toLocaleString() + " spotted)</span>";
      var vLabel = meta.verificationLabel || VERIFY[meta.verification] || "";
      var sLabel = meta.supervisionLabel || SUPER[meta.supervision] || h.statusLabel || "";
      return '<tr class="is-' + esc(h.status || "testing") + '" data-rt-city="' + esc(p.slug) + '"><th scope="row">' + esc(p.name) + '</th><td><span class="rt-status">' + esc(h.statusLabel || "") + "</span></td>" +
        '<td><span class="rt-pill is-verify is-' + esc(meta.verification || "") + '">' + esc(vLabel) + "</span></td>" +
        '<td><span class="rt-pill is-super is-' + esc(meta.supervision || "") + '">' + esc(sLabel) + "</span></td>" +
        "<td>" + Number(Math.round(p.areaSqMi)).toLocaleString() + " mi²</td><td>" + expTxt + "</td><td>" + fleetTxt + "</td></tr>";
    }).join("");
    html += '<div class="rt-table-wrap"><table class="rt-table"><thead><tr><th scope="col">City</th><th scope="col">Status</th><th scope="col">Verification</th><th scope="col">Supervision</th><th scope="col">Area</th><th scope="col">Last expanded</th><th scope="col">Model Y fleet</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
    html += '<p class="rt-fine">Service areas from ' + link(geo.source.url, "robotaxi-service-areas") + " (MIT), traced from the Tesla Robotaxi app. Earlier expansions from " + link("https://robotracker.app/updates", "robotracker.app") + ". Status: " + link("https://robotracker.app/updates", "robotracker.app") + ", Bay Area " + link("https://electrek.co/2026/03/25/california-regulator-confirms-tesla-not-operating-autonomous-vehicle-service/", "CPUC via Electrek") + ". A geofence in the app is not the same as public unsupervised rides. Shapes checked " + stamp(geo.checked) + ".</p>";
    root.innerHTML = html;
    renderGlance(root.querySelector("[data-rt-glance]"), REAL.claims || []);
    renderClaims(root.querySelector("[data-rt-claims]"), REAL.claims || []);
    document.dispatchEvent(new CustomEvent("rt:cities-ready"));

    root.addEventListener("click", function (e) {
      var filt = e.target.closest("[data-rt-filter]");
      if (filt) {
        var group = filt.getAttribute("data-rt-filter");
        var id = filt.getAttribute("data-id");
        window.RT_FILTERS[group][id] = !window.RT_FILTERS[group][id];
        filt.classList.toggle("is-on", window.RT_FILTERS[group][id]);
        filt.setAttribute("aria-pressed", window.RT_FILTERS[group][id] ? "true" : "false");
        renderClaims(root.querySelector("[data-rt-claims]"), REAL.claims || []);
        emitFilters();
        return;
      }
      var card = e.target.closest("[data-rt-claim]");
      if (card && !e.target.closest("a")) focusClaim(card.getAttribute("data-rt-claim"), false);
    });
    root.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var card = e.target.closest("[data-rt-claim]");
      if (!card) return;
      e.preventDefault();
      focusClaim(card.getAttribute("data-rt-claim"), false);
    });

    var hash = (location.hash || "").replace(/^#/, "");
    if (hash.indexOf("claim-") === 0) {
      var cid = hash.slice(6);
      if (REAL.claims.some(function (c) { return c.id === cid; })) {
        renderClaims(root.querySelector("[data-rt-claims]"), REAL.claims || []);
        focusClaim(cid, true);
      }
    }
  }).catch(function () { root.innerHTML = '<p class="cc-count-empty">City data couldn’t load.</p>'; });
})();
