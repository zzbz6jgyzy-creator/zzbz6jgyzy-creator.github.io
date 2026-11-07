/* Webcast HUD: a launch-stream style overlay for the SpaceX games (Catch, Hot Staging).
   Layout follows the familiar launch-webcast pattern: SPEED and ALTITUDE gauges, a T+ clock with a
   milestone timeline and the mission name, a G-FORCE gauge and an engine ring. It is a fan-made look,
   drawn from scratch: no SpaceX logos, fonts or artwork. Every number comes from the game and is
   simulated, not real flight data.
   Use: const hud = WebcastHud.create(stageEl, {mission, milestones, speedMax, altMax, gMax});
        hud.update({t, speed, alt, g, milestone, engines, visible}); */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function svg(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clock(t) {
    var neg = t < 0, s = Math.floor(Math.abs(t)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return { sign: neg ? "T-" : "T+", text: pad(h) + ":" + pad(m) + ":" + pad(s % 60) };
  }

  // A gauge is a 270 degree ring (opening at the bottom) plus value, label and unit.
  var R = 40, CIRC = 2 * Math.PI * R, ARC = CIRC * 0.75;
  function gauge(label, unit) {
    var wrap = el("div", "wc-gauge");
    var s = svg("svg", { viewBox: "0 0 100 100", "aria-hidden": "true" });
    var common = { cx: 50, cy: 50, r: R, fill: "none", "stroke-linecap": "round", transform: "rotate(135 50 50)" };
    s.appendChild(svg("circle", Object.assign({ "class": "wc-ring-bg", "stroke-width": 4, "stroke-dasharray": ARC + " " + CIRC }, common)));
    var fg = svg("circle", Object.assign({ "class": "wc-ring-fg", "stroke-width": 4, "stroke-dasharray": "0 " + CIRC }, common));
    s.appendChild(fg);
    wrap.appendChild(s);
    var txt = el("div", "wc-gauge-text");
    var l = el("span", "wc-gauge-label", label), v = el("strong", "wc-gauge-value", "0"), u = el("span", "wc-gauge-unit", unit);
    txt.appendChild(l); txt.appendChild(v); txt.appendChild(u); wrap.appendChild(txt);
    return { root: wrap, set: function (frac, text) { fg.setAttribute("stroke-dasharray", (ARC * clamp(frac, 0, 1)) + " " + CIRC); v.textContent = text; } };
  }

  function engineRing() {
    var wrap = el("div", "wc-engines");
    var s = svg("svg", { viewBox: "0 0 100 100", "aria-hidden": "true" });
    s.appendChild(svg("circle", { "class": "wc-ring-bg", cx: 50, cy: 50, r: 44, fill: "none", "stroke-width": 3 }));
    var dots = [];
    for (var i = 0; i < 9; i++) {
      var a = i === 0 ? null : ((i - 1) / 8) * Math.PI * 2 - Math.PI / 2;
      var d = svg("circle", { "class": "wc-engine", cx: a == null ? 50 : 50 + Math.cos(a) * 25, cy: a == null ? 50 : 50 + Math.sin(a) * 25, r: 6.5 });
      s.appendChild(d); dots.push(d);
    }
    wrap.appendChild(s);
    return { root: wrap, set: function (frac) { var n = Math.round(clamp(frac, 0, 1) * dots.length); dots.forEach(function (d, i) { d.setAttribute("class", "wc-engine" + (i < n ? " is-on" : "")); }); } };
  }

  function create(host, opts) {
    opts = opts || {};
    var ms = opts.milestones || [];
    var root = el("div", "wc-hud"); root.setAttribute("aria-hidden", "true"); root.hidden = true;
    var bar = el("div", "wc-bar");
    var left = el("div", "wc-side wc-left"), mid = el("div", "wc-mid"), right = el("div", "wc-side wc-right");
    var gs = gauge("SPEED", "KM/H"), ga = gauge("ALTITUDE", "KM"), gg = gauge("G-FORCE", "G"), eng = engineRing();
    left.appendChild(gs.root); left.appendChild(ga.root); right.appendChild(gg.root); right.appendChild(eng.root);

    // Milestone timeline: a shallow arc with a dot and a label per milestone.
    var tl = el("div", "wc-timeline");
    var ts = svg("svg", { viewBox: "0 0 400 22", preserveAspectRatio: "none", "aria-hidden": "true" });
    ts.appendChild(svg("path", { "class": "wc-tl-line", d: "M0 18 Q200 -2 400 18", fill: "none", "stroke-width": 1.2 }));
    tl.appendChild(ts);
    var marks = ms.map(function (name, i) {
      var f = ms.length === 1 ? 0.5 : i / (ms.length - 1), x = 0.04 + f * 0.92;
      var y = 18 - 2 * 20 * x * (1 - x) * 1; // point on the quadratic curve, in viewBox units
      var m = el("span", "wc-mark"); m.style.left = (x * 100) + "%"; m.style.top = (y / 22 * 100) + "%";
      m.appendChild(el("i", "wc-dot")); m.appendChild(el("b", "wc-mark-label", name));
      tl.appendChild(m); return m;
    });
    var clk = el("div", "wc-clock"), sign = el("span", "wc-sign", "T+"), time = el("strong", "wc-time", "00:00:00");
    clk.appendChild(sign); clk.appendChild(time);
    var mission = el("div", "wc-mission", opts.mission || "");
    var sim = el("div", "wc-sim", "Simulated telemetry");
    mid.appendChild(tl); mid.appendChild(clk); mid.appendChild(mission); mid.appendChild(sim);
    bar.appendChild(left); bar.appendChild(mid); bar.appendChild(right); root.appendChild(bar);
    host.appendChild(root);
    host.classList.add("wc-host");

    var last = {};
    return {
      el: root,
      update: function (d) {
        d = d || {};
        if (d.visible != null && root.hidden === !!d.visible) root.hidden = !d.visible;
        if (root.hidden) return;
        var sp = d.speed || 0, al = d.alt || 0, g = d.g || 0;
        gs.set(sp / (opts.speedMax || 8000), Math.round(sp).toLocaleString("en-GB"));
        ga.set(al / (opts.altMax || 100), al >= 100 ? Math.round(al).toString() : al.toFixed(1));
        gg.set(g / (opts.gMax || 5), g.toFixed(1));
        eng.set(d.engines || 0);
        if (d.mission != null && d.mission !== last.mission) { mission.textContent = d.mission; last.mission = d.mission; }
        var c = clock(d.t || 0);
        if (c.text !== last.text) { time.textContent = c.text; last.text = c.text; }
        if (c.sign !== last.sign) { sign.textContent = c.sign; last.sign = c.sign; }
        if (d.milestone !== last.m) {
          marks.forEach(function (m, i) { m.className = "wc-mark" + (i < d.milestone ? " is-done" : i === d.milestone ? " is-now" : ""); });
          last.m = d.milestone;
        }
      },
      destroy: function () { root.remove(); host.classList.remove("wc-host"); },
    };
  }
  window.WebcastHud = { create: create };
})();
