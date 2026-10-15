/* Cybercab vs Robotaxi (Model Y) counts from data/robotaxi-tx.json.
   Deltas are computed from stored history; when there is no point exactly
   7 or 30 days back, the nearest earlier point is used and its date shown. */
(function () {
  var root = document.querySelector("[data-cc-count]");
  if (!root) return;
  var DAY = 864e5;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function d(s) { return new Date(s + "T12:00:00Z"); }
  function short(s) { return d(s).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" }); }
  function delta(hist, key, days) {
    var last = hist[hist.length - 1], cut = d(last.date).getTime() - days * DAY, base = null;
    for (var i = hist.length - 2; i >= 0; i--) { if (d(hist[i].date).getTime() <= cut + DAY / 2) { base = hist[i]; break; } }
    var exact = true;
    if (!base) { base = hist[0]; exact = false; }
    if (!base || base === last) return null;
    var diff = last[key] - base[key];
    var gap = Math.round((d(last.date) - d(base.date)) / DAY);
    return { n: diff, pct: base[key] ? Math.round(diff / base[key] * 100) : null, since: base.date, exact: exact && gap <= days + 3, gap: gap };
  }
  function fact(x, label) {
    if (!x) return "";
    var cls = x.n > 0 ? "is-up" : "is-flat";
    var lbl = x.exact ? label : "since " + short(x.since);
    return '<li class="' + cls + '"><strong>' + (x.n > 0 ? "+" : x.n < 0 ? "−" : "±") + Math.abs(x.n) + "</strong> " + esc(lbl) +
      (x.pct !== null ? ' <span class="cc-count-pct">(' + x.pct + "%)</span>" : "") + "</li>";
  }
  function stamp(iso) {
    var t = new Date(iso);
    var txt = t.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
    return '<time datetime="' + esc(iso) + '">' + esc(txt) + "</time>";
  }
  function card(kind, title, what, key, data) {
    var h = data.history, last = h[h.length - 1];
    var wk = delta(h, key, 7), mo = delta(h, key, 30);
    return '<article class="cc-count-card is-' + kind + '">' +
      '<p class="cc-count-tag">' + (kind === "cybercab" ? "Cybercab" : "Robotaxi · Model Y") + "</p>" +
      "<h3>" + esc(title) + '</h3><p class="cc-count-what">' + esc(what) + "</p>" +
      '<ul class="cc-count-facts"><li class="cc-count-total"><strong>' + last[key] + "</strong>registered in Texas</li>" +
      fact(wk, "this week") + fact(mo, "past 30 days") + "</ul>" +
      '<p class="cc-count-meta"><span>Updated ' + stamp(data.checked) + '</span><a href="' + esc(data.source.url) + '" rel="noopener">Source: Texas Robotaxi Database (TxDMV)</a></p></article>';
  }
  fetch("/data/robotaxi-tx.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (data) {
    if (!data.history || !data.history.length) throw 0;
    root.innerHTML =
      card("cybercab", "Cybercabs, Texas", "Purpose-built two-seater. No steering wheel, no pedals.", "cybercab", data) +
      card("robotaxi", "Robotaxis (Model Y), Texas", "Standard Model Y cars running Tesla’s ride-hail service.", "modelY", data) +
      '<p class="cc-count-note">Split by VIN: Cybercabs start 5YJAJ, Model Ys start 7SAY. Earlier points: <a href="https://teslant.com/en/news/tesla-cybercab-300-austin-dallas-next-2026-10" rel="noopener">TeslAnt</a> (26 Sep, 3 Oct) and <a href="https://notateslakiller.com/en/tesla-cybercab-record-150-registrations-texas-319-nhtsa/" rel="noopener">NotATeslaKiller</a> (8 Oct). Refreshed twice a day.</p>';
  }).catch(function () {
    root.innerHTML = '<p class="cc-count-empty">The registry count couldn’t load. See the <a href="https://fsddb.com/robotaxi?operator=tesla-robotaxi-llc" rel="noopener">Texas Robotaxi Database</a>.</p>';
  });
})();
