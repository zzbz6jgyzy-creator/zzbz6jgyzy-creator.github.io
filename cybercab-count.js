/* Cybercab vs Robotaxi (Model Y) totals.
   Cybercab: Texas DMV registry (the only state that publishes a count).
   Robotaxi: nationwide = Texas registrations + third-party state estimates.
   Deltas come from stored history only; nothing is interpolated. */
(function () {
  var root = document.querySelector("[data-cc-count]");
  if (!root) return;
  var DAY = 864e5;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function d(s) { return new Date(s + "T12:00:00Z"); }
  function short(s) { return d(s).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" }); }
  function num(n) { return Number(n).toLocaleString(); }
  function link(u, t) { return '<a href="' + esc(u) + '" rel="noopener">' + esc(t || "Source") + "</a>"; }
  function stamp(iso) { return '<time datetime="' + esc(iso) + '">' + esc(new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })) + "</time>"; }
  // Change in hist[key] over `days`, using the latest point on/before the cutoff (or the earliest point, labelled).
  function delta(hist, key, days) {
    var last = hist[hist.length - 1], cut = d(last.date).getTime() - days * DAY, base = null;
    for (var i = hist.length - 2; i >= 0; i--) if (d(hist[i].date).getTime() <= cut + DAY / 2) { base = hist[i]; break; }
    var exact = !!base;
    if (!base) base = hist[0];
    if (!base || base === last) return null;
    return { n: last[key] - base[key], base: base[key], since: base.date, exact: exact };
  }
  function fact(x, label, baseTotal) {
    if (!x) return "";
    var b = baseTotal != null ? baseTotal : x.base;
    var pct = b ? Math.round((x.n / b) * 100) : null;
    return '<li class="' + (x.n > 0 ? "is-up" : "is-flat") + '"><strong>' + (x.n > 0 ? "+" : x.n < 0 ? "−" : "±") + num(Math.abs(x.n)) + "</strong> " +
      esc(x.exact ? label : "since " + short(x.since)) + (pct !== null ? ' <span class="cc-count-pct">(' + pct + "%)</span>" : "") + "</li>";
  }
  Promise.all(["/data/robotaxi-tx.json", "/data/robotaxi-fleet.json"].map(function (u) {
    return fetch(u, { cache: "no-store" }).then(function (r) { if (!r.ok) throw u; return r.json(); });
  })).then(function (res) {
    var tx = res[0], fleet = res[1], h = tx.history, last = h[h.length - 1];
    if (!last || !Number.isFinite(last.cybercab) || last.cybercab < 0 || !Number.isFinite(Date.parse(tx.checked)) || !Number.isFinite(Date.parse(fleet.checked)) || !fleet.states ||
        !Object.keys(fleet.states).length || Object.keys(fleet.states).some(function (k) { return !Number.isFinite(fleet.states[k].count) || fleet.states[k].count < 0; })) throw new Error("Invalid count snapshot");
    if (Date.parse(root.getAttribute("data-snapshot-at")) > Date.parse(tx.checked) || Date.parse(root.getAttribute("data-snapshot-fleet-at")) > Date.parse(fleet.checked)) throw new Error("Older count snapshot");
    // Cybercab
    var cab = '<article class="cc-count-card is-cybercab"><p class="cc-count-tag">Cybercab</p><h3>Cybercabs</h3>' +
      '<p class="cc-count-what">Purpose-built two-seater. No steering wheel, no pedals.</p>' +
      '<ul class="cc-count-facts"><li class="cc-count-total"><strong>' + num(last.cybercab) + "</strong>registered</li>" +
      fact(delta(h, "cybercab", 7), "this week") + fact(delta(h, "cybercab", 30), "past 30 days") + "</ul>" +
      '<ul class="cc-count-break"><li>Texas DMV registry: ' + num(last.cybercab) + " " + link(tx.source.url) + "</li>" +
      '<li>Other states: no published count. Cybercabs have been spotted in California and Arizona ' + link("https://mycybercab.com/map", "sightings map") + ", but sightings aren’t a fleet count.</li></ul>" +
      '<p class="cc-count-meta"><span>Texas registry. No other state publishes a count yet.</span><span>Updated ' + stamp(tx.checked) + "</span></p></article>";
    // Robotaxi (Model Y), nationwide
    var st = fleet.states, names = Object.keys(st), total = 0;
    names.forEach(function (k) { total += st[k].count; });
    var lines = names.map(function (k) {
      var s = st[k];
      return "<li>" + esc(k) + ": " + (s.kind === "estimate" ? "~" : "") + num(s.count) + " " + (s.kind === "estimate" ? "estimate" : "registered") + ", " + esc(short(s.asOf)) + " " + link(s.src) + "</li>";
    }).join("");
    // Deltas: Texas from its daily history; other states only if their figure has history inside the window.
    var stale = names.filter(function (k) { return k !== "Texas"; });
    function totalDelta(days, label) {
      var x = delta(h, "modelY", days);
      if (!x) return "";
      var cut = d(last.date).getTime() - days * DAY;
      var covered = ["Texas"];
      stale.forEach(function (k) {
        var fh = (fleet.history || []).filter(function (e) { return e[k]; });
        var base = null;
        for (var i = fh.length - 1; i >= 0; i--) if (d(fh[i].date).getTime() <= cut + DAY / 2) { base = fh[i]; break; }
        if (base) { x.n += st[k].count - base[k].count; covered.push(k); }
      });
      x.covered = covered;
      return fact(x, label, total - x.n);
    }
    var wk = totalDelta(7, "this week"), mo = totalDelta(30, "past 30 days");
    var cover = names.filter(function (k) { return k !== "Texas"; }).map(function (k) { return k + " (" + short(st[k].asOf) + ")"; }).join(", ");
    var rt = '<article class="cc-count-card is-robotaxi"><p class="cc-count-tag">Robotaxi · Model Y</p><h3>Robotaxis (Model Y)</h3>' +
      '<p class="cc-count-what">Standard Model Y cars running Tesla’s ride-hail service.</p>' +
      '<ul class="cc-count-facts"><li class="cc-count-total"><strong>~' + num(total) + "</strong>across " + names.length + " states (approx.)</li>" + wk + mo + "</ul>" +
      '<ul class="cc-count-break">' + lines + "</ul>" +
      '<p class="cc-count-meta"><span>Approximate: adds Texas registrations to third-party estimates. Changes cover Texas only; the latest estimates for ' + esc(cover) + " have no earlier figure to compare.</span><span>Updated " + stamp(fleet.checked) + " · via " + link(fleet.aggregator.url, fleet.aggregator.name) + "</span></p></article>";
    root.innerHTML = cab + rt + '<p class="cc-count-note">Texas figures by VIN: Cybercabs start 5YJAJ, Model Ys start 7SAY. Earlier Texas points: ' +
      link("https://teslant.com/en/news/tesla-cybercab-300-austin-dallas-next-2026-10", "TeslAnt") + " (26 Sep, 3 Oct) and " +
      link("https://notateslakiller.com/en/tesla-cybercab-record-150-registrations-texas-319-nhtsa/", "NotATeslaKiller") + " (8 Oct). Refreshed twice a day.</p>";
    root.setAttribute("data-snapshot-at", tx.checked);
    root.setAttribute("data-snapshot-fleet-at", fleet.checked);
    window.CC_TOTALS = { cybercab: last.cybercab, modelY: total, asOf: last.date, cabSrc: tx.source.url, rtSrc: fleet.aggregator.url };
    document.dispatchEvent(new CustomEvent("cc:totals", { detail: window.CC_TOTALS }));
  }).catch(function () {
    if (root.hasAttribute("data-snapshot-at")) {
      if (!root.querySelector("[data-refresh-status]")) root.insertAdjacentHTML("beforeend", '<p class="cc-count-note" role="status" data-refresh-status>Refresh unavailable. Showing the saved counts and source dates above.</p>');
      return;
    }
    root.innerHTML = '<p class="cc-count-empty">The counts couldn’t load. See the <a href="https://fsddb.com/robotaxi?operator=tesla-robotaxi-llc" rel="noopener">Texas Robotaxi Database</a>.</p>';
  });
})();
