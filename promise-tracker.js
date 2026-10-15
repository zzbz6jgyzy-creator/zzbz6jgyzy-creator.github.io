// Promise Tracker preview: renders /data/promises.json with filters, search, stats and anchors.
(function () {
  "use strict";
  var STATUSES = ["Delivered", "Delivered late", "In progress", "Missed", "Revised"];
  var CLS = { "Delivered": "st-delivered", "Delivered late": "st-late", "In progress": "st-progress", "Missed": "st-missed", "Revised": "st-revised" };
  var $ = function (id) { return document.getElementById(id); };
  var data = [], state = { q: "", company: "", topic: "", status: "" };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmt(d) {
    if (!d) return "";
    var p = String(d).split("-");
    if (p.length === 1) return p[0];
    if (p.length === 2) return MON[+p[1] - 1] + " " + p[0];
    return +p[2] + " " + MON[+p[1] - 1] + " " + p[0];
  }
  function srcLink(s) { return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.outlet) + "</a>" + (s.date ? ", " + esc(fmt(s.date)) : ""); }

  function card(p) {
    var ev = (p.evidence || []).map(function (e) { return "<li>" + esc(e.text) + ' <span class="pt-src">(' + srcLink(e.source) + ")</span></li>"; }).join("");
    var rev = (p.revisions || []).map(function (r) { return "<li><b>" + esc(fmt(r.date)) + ":</b> " + esc(r.text) + ' <span class="pt-src">(' + srcLink(r.source) + ")</span></li>"; }).join("");
    var para = p.quote_type === "paraphrase";
    return '<li class="pt-card ' + CLS[p.status] + '" id="' + esc(p.id) + '">' +
      '<div class="pt-top"><span class="pt-badge">' + esc(p.status) + '</span><span class="pt-tag">' + esc(p.company) + '</span><span class="pt-tag">' + esc(p.topic) + '</span>' +
      '<a class="pt-anchor" href="#' + esc(p.id) + '" aria-label="Link to this promise" data-copy>#</a></div>' +
      "<h2>" + esc(p.title) + "</h2>" +
      '<span class="pt-qlabel">' + (para ? "Paraphrase" : "Quote") + "</span>" +
      '<blockquote class="pt-quote' + (para ? " para" : "") + '">' + (para ? "" : "“") + esc(p.quote) + (para ? "" : "”") + "</blockquote>" +
      '<dl class="pt-meta"><dt>Who</dt><dd>' + esc(p.person) + ", " + esc(p.role) + "</dd>" +
      "<dt>Said</dt><dd>" + esc(fmt(p.said_on)) + "</dd>" +
      "<dt>Deadline</dt><dd>" + esc(fmt(p.deadline)) + "</dd>" +
      "<dt>Source</dt><dd>" + srcLink(p.source) + "</dd></dl>" +
      (ev ? '<p class="pt-sub">Evidence</p><ul class="pt-ev">' + ev + "</ul>" : "") +
      (rev ? '<p class="pt-sub">Revisions</p><ul class="pt-rev">' + rev + "</ul>" : "") +
      (p.note ? '<p class="pt-note">' + esc(p.note) + "</p>" : "") +
      '<p class="pt-verified">Last verified ' + esc(fmt(p.last_verified)) + "</p></li>";
  }

  function match(p) {
    if (state.company && p.company !== state.company) return false;
    if (state.topic && p.topic !== state.topic) return false;
    if (state.status && p.status !== state.status) return false;
    if (state.q) {
      var hay = [p.title, p.quote, p.person, p.company, p.topic, p.status, p.note].join(" ").toLowerCase();
      if (hay.indexOf(state.q) < 0) return false;
    }
    return true;
  }

  function stats() {
    var c = {}; data.forEach(function (p) { c[p.status] = (c[p.status] || 0) + 1; });
    var h = '<button type="button" class="pt-stat total" data-s="" aria-pressed="' + (!state.status) + '"><b>' + data.length + "</b><span>All promises</span></button>";
    STATUSES.forEach(function (s) {
      h += '<button type="button" class="pt-stat ' + CLS[s] + '" data-s="' + esc(s) + '" aria-pressed="' + (state.status === s) + '"><b style="color:var(--stt)">' + (c[s] || 0) + "</b><span>" + esc(s) + "</span></button>";
    });
    $("pt-stats").innerHTML = h;
  }

  function render() {
    var list = data.filter(match);
    $("pt-list").innerHTML = list.length ? list.map(card).join("") : '<li class="pt-empty">No promises match those filters.</li>';
    $("pt-count").textContent = "Showing " + list.length + " of " + data.length;
    stats();
  }

  function fill(id, vals) {
    var sel = $(id);
    vals.forEach(function (v) { var o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); });
  }
  function uniq(k) { var s = {}; data.forEach(function (p) { s[p[k]] = 1; }); return Object.keys(s).sort(); }

  function init(json) {
    data = (json.promises || []).slice().sort(function (a, b) { return String(b.said_on).localeCompare(String(a.said_on)); });
    fill("pt-company", uniq("company")); fill("pt-topic", uniq("topic")); fill("pt-status", STATUSES);
    $("pt-q").addEventListener("input", function (e) { state.q = e.target.value.trim().toLowerCase(); render(); });
    ["company", "topic", "status"].forEach(function (k) {
      $("pt-" + k).addEventListener("change", function (e) { state[k] = e.target.value; render(); });
    });
    $("pt-stats").addEventListener("click", function (e) {
      var b = e.target.closest(".pt-stat"); if (!b) return;
      state.status = b.getAttribute("data-s"); $("pt-status").value = state.status; render();
    });
    $("pt-list").addEventListener("click", function (e) {
      var a = e.target.closest("[data-copy]"); if (!a || !navigator.clipboard) return;
      navigator.clipboard.writeText(location.origin + location.pathname + a.getAttribute("href")).catch(function () {});
    });
    render();
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }

  fetch("/data/promises.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(init).catch(function () {
    $("pt-list").innerHTML = '<li class="pt-empty">Couldn’t load the data. Try refreshing.</li>';
  });
})();
