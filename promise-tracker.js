// Promise Tracker preview v2: renders /data/promises.json (scorecard ring, highlights, topic tiles,
// filters/search, cards with deadline-vs-reality bars, and a timeline view). No libraries.
(function () {
  "use strict";
  var STATUSES = ["Delivered", "Delivered late", "In progress", "Missed", "Revised"];
  var CLS = { "Delivered": "st-delivered", "Delivered late": "st-late", "In progress": "st-progress", "Missed": "st-missed", "Revised": "st-revised" };
  var COL = { "Delivered": "#2fbf71", "Delivered late": "#d9a400", "In progress": "#3d8bfd", "Missed": "#c8102e", "Revised": "#9b7bf0" };
  var IMG = { "FSD / autonomy": "fsd", "Robotaxi / Cybercab": "cybercab", "Optimus": "optimus", "Roadster": "roadster", "Semi": "semi", "Cybertruck": "cybertruck", "Starship": "starship", "Mars": "mars", "Affordable car & batteries": "model3" };
  var ICON = { "Grok / xAI": "xAI", "AI compute": "AI", "Energy": "⚡" };
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TODAY = new Date();
  var $ = function (id) { return document.getElementById(id); };
  var data = [], state = { q: "", company: "", topic: "", status: "", view: "cards" };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmt(d) {
    if (!d) return "None given";
    var p = String(d).split("-");
    if (p.length === 1) return p[0];
    if (p.length === 2) return MON[+p[1] - 1] + " " + p[0];
    return +p[2] + " " + MON[+p[1] - 1] + " " + p[0];
  }
  // Partial dates: as a deadline, read as the end of the period; otherwise the middle.
  function toDate(s, end) {
    if (!s) return null;
    var p = String(s).split("-").map(Number);
    if (p.length === 1) return end ? new Date(Date.UTC(p[0], 11, 31)) : new Date(Date.UTC(p[0], 6, 1));
    if (p.length === 2) return end ? new Date(Date.UTC(p[0], p[1], 0)) : new Date(Date.UTC(p[0], p[1] - 1, 15));
    return new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  }
  function months(a, b) { return (b - a) / (30.44 * 864e5); }
  function srcLink(s) { return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.outlet) + "</a>" + (s.date ? ", " + esc(fmt(s.date)) : ""); }
  function thumb(topic, cls) {
    var k = IMG[topic];
    return k ? '<img src="/assets/promises/' + k + '.webp" width="480" height="300" alt="" loading="lazy" decoding="async" />'
      : '<div class="ic" aria-hidden="true">' + esc(ICON[topic] || "•") + "</div>";
  }

  // Gap between the deadline and reality, in months (positive = late/overdue).
  function gap(p) {
    var dl = toDate(p.deadline, true);
    if (!dl) return { label: "No deadline given", m: null };
    if (p.outcome_date) {
      var m = months(dl, toDate(p.outcome_date, false));
      if (Math.abs(m) < 0.5) return { label: "On time", m: 0 };
      return { label: Math.round(Math.abs(m)) + " mo " + (m < 0 ? "early" : "late"), m: m };
    }
    if (p.status === "Missed") return { label: Math.round(months(dl, TODAY)) + " mo overdue", m: months(dl, TODAY) };
    if (p.status === "In progress") return { label: Math.max(0, Math.round(months(TODAY, dl))) + " mo left", m: -months(TODAY, dl) };
    return { label: "Plan changed", m: null };
  }

  function card(p) {
    var ev = (p.evidence || []).map(function (e) { return "<li>" + esc(e.text) + ' <span class="pt-src">(' + srcLink(e.source) + ")</span></li>"; }).join("");
    var rv = p.revisions || [];
    var rev = rv.map(function (r) { return "<li><b>" + esc(fmt(r.date)) + ":</b> " + esc(r.text) + ' <span class="pt-src">(' + srcLink(r.source) + ")</span></li>"; }).join("");
    var para = p.quote_type === "paraphrase", g = gap(p);
    var bar = g.m === null ? "" : '<div class="pt-gap"><div class="pt-gap-row"><span>Deadline vs reality</span><b>' + esc(g.label) + '</b></div><div class="pt-gap-track"><i style="left:0;width:100%;transform:scaleX(' + Math.max(0.02, Math.min(Math.abs(g.m) / 120, 1)).toFixed(3) + ')"></i></div></div>';
    return '<li class="pt-card pt-reveal ' + CLS[p.status] + '" id="' + esc(p.id) + '">' +
      '<div class="pt-thumb">' + thumb(p.topic) + "</div><div class=\"pt-body\">" +
      '<div class="pt-top"><span class="pt-badge">' + esc(p.status) + '</span><span class="pt-tag">' + esc(p.company) + '</span><span class="pt-tag">' + esc(p.topic) + "</span>" +
      '<a class="pt-anchor" href="#' + esc(p.id) + '" aria-label="Link to this promise" data-copy>#</a></div>' +
      "<h3>" + esc(p.title) + "</h3>" +
      '<span class="pt-qlabel">' + (para ? "Paraphrase" : "Quote") + "</span>" +
      '<blockquote class="pt-quote' + (para ? " para" : "") + '">' + (para ? "" : "“") + esc(p.quote) + (para ? "" : "”") + "</blockquote>" + bar +
      '<dl class="pt-meta"><dt>Who</dt><dd>' + esc(p.person) + ", " + esc(p.role) + "</dd>" +
      "<dt>Said</dt><dd>" + esc(fmt(p.said_on)) + "</dd><dt>Deadline</dt><dd>" + esc(fmt(p.deadline)) + "</dd>" +
      (p.outcome_date ? "<dt>Happened</dt><dd>" + esc(fmt(p.outcome_date)) + "</dd>" : "") +
      "<dt>Source</dt><dd>" + srcLink(p.source) + "</dd></dl>" +
      (ev ? '<p class="pt-sub">Evidence</p><ul class="pt-ev">' + ev + "</ul>" : "") +
      (rv.length ? "<details><summary>Revision history (" + rv.length + ')</summary><ul class="pt-rev">' + rev + "</ul></details>" : "") +
      (p.note ? '<p class="pt-note">' + esc(p.note) + "</p>" : "") +
      '<p class="pt-verified">Last verified ' + esc(fmt(p.last_verified)) + "</p></div></li>";
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

  function counts() { var c = {}; data.forEach(function (p) { c[p.status] = (c[p.status] || 0) + 1; }); return c; }

  // ---- hero scorecard ----
  function scorecard() {
    var c = counts(), total = data.length, R = 80, C = 2 * Math.PI * R, g = $("pt-ring-g"), off = 0, html = '<circle class="bg" cx="100" cy="100" r="' + R + '"/>';
    STATUSES.forEach(function (s) {
      var len = (c[s] || 0) / total * C;
      html += '<circle cx="100" cy="100" r="' + R + '" stroke="' + COL[s] + '" data-len="' + len.toFixed(2) + '" data-off="' + (-off).toFixed(2) + '" stroke-dasharray="0 ' + C.toFixed(2) + '" stroke-dashoffset="0"><title>' + esc(s) + ": " + (c[s] || 0) + "</title></circle>";
      off += len;
    });
    g.innerHTML = html;
    var go = function () {
      g.querySelectorAll("circle[data-len]").forEach(function (el) {
        el.setAttribute("stroke-dasharray", Math.max(0, el.getAttribute("data-len") - 2) + " " + C.toFixed(2));
        el.setAttribute("stroke-dashoffset", el.getAttribute("data-off"));
      });
    };
    RM ? go() : requestAnimationFrame(function () { requestAnimationFrame(go); });
    countUp($("pt-ring-n"), total, "");
    legend();
    var judged = (c["Delivered"] || 0) + (c["Delivered late"] || 0) + (c["Missed"] || 0);
    var rate = judged ? Math.round((c["Delivered"] || 0) / judged * 100) : 0;
    countUp($("pt-ontime"), rate, "%");
    $("pt-ontime-sub").textContent = (c["Delivered"] || 0) + " of " + judged + " promises we could score";
    var late = data.filter(function (p) { return p.status === "Delivered late" && p.outcome_date && p.deadline; });
    var avg = late.reduce(function (a, p) { return a + months(toDate(p.deadline, true), toDate(p.outcome_date)); }, 0) / (late.length || 1);
    countUp($("pt-delay"), Math.round(avg), " mo");
    $("pt-delay-sub").textContent = "across " + late.length + " late deliveries";
  }
  function legend() {
    var c = counts();
    $("pt-ring-cap").innerHTML = STATUSES.map(function (s) {
      return '<button type="button" class="' + CLS[s] + '" data-s="' + esc(s) + '" aria-pressed="' + (state.status === s) + '"><i></i>' + esc(s) + " <b>" + (c[s] || 0) + "</b></button>";
    }).join("");
  }
  function countUp(el, to, suf) {
    if (RM) { el.textContent = to + suf; return; }
    var t0 = performance.now(), d = 1000;
    (function f(t) { var k = Math.min(1, (t - t0) / d); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + suf; if (k < 1) requestAnimationFrame(f); })(t0);
  }

  // ---- highlight strips ----
  function chip(p, sub) { return '<li><a class="' + CLS[p.status] + '" href="#' + esc(p.id) + '" data-jump><small>' + esc(sub) + "</small>" + esc(p.title) + "</a></li>"; }
  function strips() {
    var miss = data.filter(function (p) { return p.status === "Missed"; }).map(function (p) { return [p, months(toDate(p.deadline, true), TODAY)]; })
      .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 6);
    $("pt-misses").innerHTML = miss.map(function (x) { return chip(x[0], Math.round(x[1] / 12 * 10) / 10 + " yrs overdue · " + x[0].person); }).join("");
    var rec = data.filter(function (p) { return p.outcome_date; }).sort(function (a, b) { return toDate(b.outcome_date) - toDate(a.outcome_date); }).slice(0, 6);
    $("pt-recent").innerHTML = rec.map(function (p) { return chip(p, fmt(p.outcome_date) + " · " + gap(p).label); }).join("");
  }

  // ---- topic tiles ----
  function tiles() {
    var by = {};
    data.forEach(function (p) { (by[p.topic] = by[p.topic] || []).push(p); });
    var keys = Object.keys(by).sort(function (a, b) { return by[b].length - by[a].length; });
    $("pt-tiles").innerHTML = keys.map(function (k) {
      var dots = by[k].slice(0, 14).map(function (p) { return '<i class="' + CLS[p.status] + '"></i>'; }).join("");
      return '<button type="button" class="pt-tile pt-reveal" data-topic="' + esc(k) + '" aria-pressed="' + (state.topic === k) + '">' + thumb(k) +
        '<span class="dots" aria-hidden="true">' + dots + "</span><span>" + esc(k) + "<b>" + by[k].length + "</b></span></button>";
    }).join("");
  }

  // ---- timeline ----
  function timeline(list) {
    var y0 = 2013, y1 = 2030, a = Date.UTC(y0, 0, 1), b = Date.UTC(y1, 0, 1);
    var x = function (d) { return Math.max(0, Math.min(100, (d - a) / (b - a) * 100)); };
    var years = "", grid = "";
    for (var y = y0; y <= y1; y += 1) { var px = x(Date.UTC(y, 0, 1)); if ((y - y0) % 2 === 0) years += '<span style="left:' + px + '%">' + y + "</span>"; grid += '<i class="pt-tl-grid" style="left:' + px + '%"></i>'; }
    var rows = list.slice().sort(function (p, q) { return toDate(p.said_on) - toDate(q.said_on); }).map(function (p) {
      var s = toDate(p.said_on), dl = toDate(p.deadline, true), end = p.outcome_date ? toDate(p.outcome_date) : (p.status === "Missed" || p.status === "In progress" ? TODAY : null);
      var xs = x(s), xd = dl ? x(dl) : xs, h = "";
      if (dl) h += '<i class="pt-tl-plan" style="left:' + xs + "%;width:" + Math.max(0.4, xd - xs) + '%"></i><i class="pt-tl-dl" style="left:' + xd + '%"></i>';
      if (end && dl && end > dl) h += '<i class="pt-tl-over" style="left:' + xd + "%;width:" + (x(end) - xd) + '%"></i>';
      h += '<i class="pt-tl-dot" style="left:' + (p.outcome_date ? x(toDate(p.outcome_date)) : xs) + '%"></i>';
      return '<a class="pt-tl-row ' + CLS[p.status] + '" href="#' + esc(p.id) + '" data-jump title="' + esc(p.title + " — " + p.status + " (" + gap(p).label + ")") + '"><span class="lbl">' + esc(p.title) + '</span><span class="pt-tl-track">' + grid + h + "</span></a>";
    }).join("");
    $("pt-tl").innerHTML = '<p class="pt-tl-key"><span><i style="background:rgba(255,255,255,.22)"></i>Said → deadline</span><span><i style="background:#c8102e"></i>Overdue (missed)</span><span><i style="background:#d9a400"></i>Late until delivered</span><span><i style="background:#3d8bfd"></i>Still running</span><span>▏deadline · ● outcome or said date</span></p>' +
      '<div class="pt-tl-inner"><div class="pt-tl-axis"><span></span><span class="pt-tl-years">' + years + '<i class="pt-tl-today" style="left:' + x(TODAY) + '%"></i></span></div>' + (rows || '<p class="pt-empty">No promises match those filters.</p>') + "</div>";
  }

  // ---- render ----
  var io = ("IntersectionObserver" in window && !RM) ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -5% 0px" }) : null;
  function reveal(root) { root.querySelectorAll(".pt-reveal:not(.in)").forEach(function (el) { io ? io.observe(el) : el.classList.add("in"); }); }

  function render() {
    var list = data.filter(match);
    var cards = state.view === "cards";
    $("pt-list").hidden = !cards; $("pt-tl").hidden = cards;
    if (cards) $("pt-list").innerHTML = list.length ? list.map(card).join("") : '<li class="pt-empty">No promises match those filters.</li>';
    else timeline(list);
    $("pt-count").textContent = "Showing " + list.length + " of " + data.length;
    document.querySelectorAll(".pt-toggle button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === state.view)); });
    document.querySelectorAll(".pt-tile").forEach(function (t) { t.setAttribute("aria-pressed", String(t.getAttribute("data-topic") === state.topic)); });
    $("pt-company").value = state.company; $("pt-topic").value = state.topic; $("pt-status").value = state.status;
    legend();
    reveal(document);
  }

  function fill(id, vals) { var sel = $(id); vals.forEach(function (v) { var o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); }); }
  function uniq(k) { var s = {}; data.forEach(function (p) { s[p[k]] = 1; }); return Object.keys(s).sort(); }
  function jump(id) {
    if (state.view !== "cards" || !document.getElementById(id)) { state.view = "cards"; state.q = state.company = state.topic = state.status = ""; $("pt-q").value = ""; render(); }
    var t = document.getElementById(id); if (!t) return;
    t.classList.add("in");
    history.replaceState(null, "", "#" + id);
    t.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
  }

  function init(json) {
    data = (json.promises || []).slice().sort(function (a, b) { return toDate(b.said_on) - toDate(a.said_on); });
    fill("pt-company", uniq("company")); fill("pt-topic", uniq("topic")); fill("pt-status", STATUSES);
    scorecard(); strips(); tiles();
    $("pt-q").addEventListener("input", function (e) { state.q = e.target.value.trim().toLowerCase(); render(); });
    ["company", "topic", "status"].forEach(function (k) { $("pt-" + k).addEventListener("change", function (e) { state[k] = e.target.value; render(); }); });
    $("pt-ring-cap").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; var s = b.getAttribute("data-s"); state.status = state.status === s ? "" : s; render(); });
    $("pt-tiles").addEventListener("click", function (e) { var b = e.target.closest(".pt-tile"); if (!b) return; var t = b.getAttribute("data-topic"); state.topic = state.topic === t ? "" : t; render(); document.querySelector(".pt-controls").scrollIntoView({ behavior: RM ? "auto" : "smooth" }); });
    document.querySelector(".pt-toggle").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; state.view = b.getAttribute("data-view"); render(); });
    document.addEventListener("click", function (e) {
      var a = e.target.closest("[data-jump]"); if (a) { e.preventDefault(); jump(a.getAttribute("href").slice(1)); return; }
      var c = e.target.closest("[data-copy]"); if (c && navigator.clipboard) navigator.clipboard.writeText(location.origin + location.pathname + c.getAttribute("href")).catch(function () {});
    });
    render();
    if (location.hash) { var id = location.hash.slice(1); setTimeout(function () { jump(id); }, 50); }
  }

  fetch("/data/promises.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(init).catch(function () {
    $("pt-list").innerHTML = '<li class="pt-empty">Couldn’t load the data. Try refreshing.</li>';
  });
})();
