/* Software Update Tracker. Vanilla JS, no framework.
   Data: /updates-live.json (Teslascope snapshot), /data/updates-extras.json (TeslaFi + Teslascope feed) and /data/updates-history.json
   (our own saved Teslascope snapshots, built by scripts/build-updates-history.py). */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // Europe / Oceania FSD builds are not in the Teslascope snapshot; values from the TeslaFi Firmware Tracker (15 Oct 2026).
  const EXTRA_FSD = { "2026.33.100": "14.2.2.6", "2026.27.300": "14.2.2.6", "2026.27.200": "14.2.2.6", "2026.28.5": "14.3.9" };
  const NA = ["US", "CA", "MX", "PR"];
  const EU = ["AT","BE","BG","CH","CZ","DE","DK","EE","ES","FR","GB","GR","HU","IE","IS","IT","LT","NL","NO","PL","PT","RO","SE","SI","SK","UA"];
  const AP = ["AU","NZ","JP","KR","TW","HK","SG","MY","TH","PH"];
  const regionOf = (c) => (NA.includes(c) ? "NA" : EU.includes(c) ? "EU" : AP.includes(c) ? "AP" : "OT");
  const RNAME = { NA: "North America", EU: "Europe", AP: "Asia-Pacific", OT: "Middle East & other" };
  // Approximate country centres (lon, lat) for the globe markers.
  const LL = { US:[-98,39],CA:[-106,56],MX:[-102,23],PR:[-66.5,18.2],GB:[-2,54],IE:[-8,53.3],DE:[10.4,51.2],FR:[2.4,46.6],NL:[5.3,52.1],BE:[4.5,50.6],IT:[12.5,42.8],ES:[-3.7,40.2],PT:[-8.2,39.6],AT:[14.5,47.6],CH:[8.2,46.8],DK:[9.5,56],NO:[9,61],SE:[15,62],FI:[26,64],PL:[19.4,52],CZ:[15.5,49.8],SK:[19.7,48.7],SI:[14.8,46.1],HU:[19.5,47.2],RO:[25,45.9],BG:[25.5,42.7],GR:[22,39.1],EE:[25,58.7],LT:[23.9,55.2],IS:[-18.6,64.9],UA:[31,49],TR:[35,39],IL:[34.9,31.4],AE:[54.3,24],QA:[51.2,25.3],MA:[-6.8,32],AU:[134,-25],NZ:[172.5,-41.5],JP:[138.3,36.2],KR:[127.8,36.3],TW:[121,23.7],HK:[114.2,22.3],SG:[103.8,1.35],MY:[102,4.2],TH:[101,15.8],PH:[122,12.9],CO:[-74.3,4.6] };

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fmt = (iso, withTime) => {
    const d = new Date(iso);
    const o = withTime ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "short" } : { day: "numeric", month: "short" };
    return new Intl.DateTimeFormat(undefined, o).format(d);
  };
  const dayMs = 864e5;
  const fsdFor = (v, hw) => (hw === "hw3" ? v.fsdHw3 : v.fsdHw4) || EXTRA_FSD[v.id] || null;
  const cmpVer = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 4; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };

  let live, hist, versions, snaps, extras = {};
  const state = { hw: "hw4", rg: "NA" };

  const countAt = (snap, id) => (snap?.v?.[id]?.[0]) || 0;
  const snapBefore = (ms) => { let best = snaps[0]; for (const s of snaps) if (Date.parse(s.t) <= ms) best = s; return best; };

  function rate(id) {
    const now = Date.parse(snaps[snaps.length - 1].t);
    const c0 = countAt(snaps[snaps.length - 1], id), c1 = countAt(snapBefore(now - dayMs), id), c2 = countAt(snapBefore(now - 2 * dayMs), id);
    const d1 = c0 - c1, d2 = c1 - c2;
    const status = d1 <= 2 ? "slow" : d1 > d2 * 1.2 && d1 >= 6 ? "up" : "steady";
    return { d1, d2, status };
  }

  function tiles() {
    const seen = versions.filter((v) => v.count > 0);
    const newest = [...seen].sort((a, b) => cmpVer(b.id, a.id))[0];
    $("t-new").textContent = newest.id;
    $("t-new-s").textContent = `first seen ${fmt(newest.firstSeen || newest.date)} · ${newest.percent}% of cars`;
    const common = [...seen].sort((a, b) => b.count - a.count)[0];
    $("t-common").textContent = common.id;
    $("t-common-s").textContent = `${common.percent}% of ${live.fleet.toLocaleString()} tracked cars`;
    const fast = seen.map((v) => ({ v, r: rate(v.id) })).sort((a, b) => b.r.d1 - a.r.d1)[0];
    $("t-fast").textContent = fast.v.id;
    $("t-fast-s").textContent = `+${fast.r.d1} cars in the last 24 h`;
    // Next build window: median gap between first sightings of recent builds.
    const days = [...new Set(versions.map((v) => v.date))].map((d) => Date.parse(d + "T12:00:00Z")).sort((a, b) => a - b);
    const gaps = days.slice(1).map((d, i) => (d - days[i]) / dayMs).sort((a, b) => a - b);
    const med = gaps[Math.floor(gaps.length / 2)] || 3;
    const lo = gaps[Math.floor(gaps.length / 4)] || med, hi = gaps[Math.floor((gaps.length * 3) / 4)] || med;
    const last = days[days.length - 1];
    let from = last + lo * dayMs, to = last + hi * dayMs;
    if (to < Date.now()) { from = Date.now(); to = Date.now() + med * dayMs; }
    $("t-next").textContent = from === to || fmt(from) === fmt(to) ? fmt(from) : `${fmt(from)}–${fmt(to)}`;
    $("t-next-s").textContent = `Tesla shipped a new build every ~${med.toFixed(0)} days lately (${gaps.length + 1} builds)`;
  }

  function mycar() {
    const { hw, rg } = state;
    const inRg = versions.map((v) => {
      const n = Object.entries(v.countryCounts || {}).reduce((s, [c, k]) => s + (regionOf(c) === rg ? k : 0), 0);
      return { v, n };
    }).filter((x) => x.n > 0);
    const out = $("mycar-out");
    if (!inRg.length) { out.innerHTML = `<p>No cars in ${RNAME[rg]} reported in this snapshot.</p>`; return; }
    const total = inRg.reduce((s, x) => s + x.n, 0);
    const solid = inRg.filter((x) => x.n >= Math.max(3, total * 0.02));
    const best = [...(solid.length ? solid : inRg)].sort((a, b) => cmpVer(b.v.id, a.v.id))[0];
    const common = [...inRg].sort((a, b) => b.n - a.n)[0];
    const fsd = fsdFor(best.v, hw);
    const fsdTxt = fsd ? `FSD (Supervised) v${esc(fsd)}` : rg === "NA" ? "No new FSD build in it" : "No FSD build listed for this region";
    out.innerHTML = `<div><span class="lbl">Newest build reaching ${RNAME[rg]}</span><b class="big">${esc(best.v.id)}</b>
      <p>${fsdTxt}${hw === "hw3" && rg !== "NA" && !best.v.fsdHw3 ? " for HW3" : ""}. First seen ${fmt(best.v.firstSeen || best.v.date)}; ${best.n} tracked cars here have it.</p>
      <p>Most cars here are on <b>${esc(common.v.id)}</b> (${Math.round((common.n / total) * 100)}%). If you are older than that, you are in the queue, not forgotten.</p>
      ${reach(rg)}</div>
      <div><span class="lbl">Builds seen in ${RNAME[rg]}</span><ul>${[...inRg].sort((a, b) => b.n - a.n).slice(0, 5)
        .map((x) => `<li><b>${esc(x.v.id)}</b><span>${x.n} cars · ${Math.round((x.n / total) * 100)}%</span></li>`).join("")}</ul></div>`;
  }

  // Time to reach a region: from our snapshot history, when each build was first seen in North America vs the chosen region.
  function reach(rg) {
    if (rg === "NA") return "";
    const S = { EU, AP, OT: null }[rg];
    const inR = (c) => (S ? S.includes(c) : regionOf(c) === "OT");
    const start = snaps[0].t, first = {};
    for (const s of snaps) for (const [id, [, cc]] of Object.entries(s.v)) {
      const cs = Object.keys(cc || {});
      if (cs.some((c) => NA.includes(c))) (first[id] ||= {}).na ||= s.t;
      if (cs.some(inR)) (first[id] ||= {}).r ||= s.t;
    }
    const done = [], waiting = [];
    const nowMs = Date.parse(snaps[snaps.length - 1].t);
    for (const [id, f] of Object.entries(first)) {
      if (!f.na || f.na === start) continue; // NA date unknown (seen before our history began)
      if (f.r) { if (f.r !== start) done.push((Date.parse(f.r) - Date.parse(f.na)) / dayMs); }
      else waiting.push({ id, d: (nowMs - Date.parse(f.na)) / dayMs });
    }
    const name = RNAME[rg];
    let txt;
    if (done.length) {
      const avg = done.reduce((a, b) => a + b, 0) / done.length;
      txt = `New builds have reached ${name} about <b>${avg < 1 ? "within a day" : Math.round(avg) + " days"}</b> after North America (${done.length} build${done.length > 1 ? "s" : ""} measured).`;
    } else txt = `No build has gone from North America to ${name} since our history began (${fmt(start)}), so there is no average yet.`;
    if (waiting.length) {
      waiting.sort((a, b) => b.d - a.d);
      txt += ` Still waiting: ${waiting.slice(0, 2).map((w) => `<b>${esc(w.id)}</b> (in North America for ${Math.max(1, Math.round(w.d))} day${Math.round(w.d) > 1 ? "s" : ""})`).join(", ")}.`;
    }
    return `<p class="sw-reach">${txt}</p>`;
  }

  function crossCheck() {
    const fi = extras.teslafi;
    const tb = document.querySelector("#xc-table tbody");
    if (!fi) { tb.innerHTML = `<tr><td colspan="3">TeslaFi data unavailable right now.</td></tr>`; } else {
      const top = versions.filter((v) => v.count > 0).sort((a, b) => b.count - a.count).slice(0, 6);
      const max = Math.max(...top.map((v) => Math.max(v.percent, fiRow(v.id)?.percent || 0)), 1);
      const bar = (p, cls) => p == null ? `<span class="sw-fine">—</span>` : `<span class="sw-xbar ${cls}"><i style="width:${(p / max) * 70}px"></i>${p}%</span>`;
      tb.innerHTML = top.map((v) => `<tr><td>${esc(v.id)}</td><td>${bar(v.percent, "ts")}</td><td>${bar(fiRow(v.id)?.percent ?? null, "fi")}</td></tr>`).join("");
      $("xc-note").innerHTML = `Teslascope: ${live.fleet.toLocaleString()} cars. <a href="${fi.sourceUrl}" rel="noopener">TeslaFi</a>: ${fi.fleet.toLocaleString()} cars, checked ${fmt(fi.fetched, true)}.`;
    }
    const rc = extras.recent;
    if (!rc || !rc.items?.length) { $("feed").innerHTML = "<li>Feed unavailable right now.</li>"; return; }
    const ago = (t) => { const m = Math.max(1, Math.round((Date.now() - Date.parse(t)) / 6e4)); return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
    $("feed").innerHTML = rc.items.slice(0, 6).map((i) => `<li><b>${esc(i.to)}</b><span class="ago">${ago(i.t)}</span><span>${esc(i.model)} · HW${esc(i.hw)} · ${esc(i.country)}</span><span class="ago">from ${esc(i.from)}</span></li>`).join("");
    $("feed-note").innerHTML = `From <a href="${rc.sourceUrl}" rel="noopener">Teslascope</a>'s public feed, refreshed every 30 min.`;
  }

  function spark(id) {
    const pts = snaps.map((s) => countAt(s, id));
    const max = Math.max(1, ...pts), w = 300, h = 40;
    const xy = pts.map((p, i) => `${((i / (pts.length - 1)) * w).toFixed(1)},${(h - 3 - (p / max) * (h - 6)).toFixed(1)}`);
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="0,${h} ${xy.join(" ")} ${w},${h}" fill="rgba(227,25,55,.14)" stroke="none"/><polyline points="${xy.join(" ")}" fill="none" stroke="#e31937" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  }

  const fiRow = (id) => (extras.teslafi?.versions || []).find((r) => r.id === id);
  const fiPend = (id) => { const r = fiRow(id); return r && r.pending ? `<span class="sub">${r.pending.toLocaleString()} waiting (TeslaFi)</span>` : ""; };
  function waves() {
    const LBL = { up: "Speeding up", steady: "Steady", slow: "Settled" };
    const rows = versions.filter((v) => v.count >= 20).map((v) => ({ v, r: rate(v.id) })).sort((a, b) => b.r.d1 - a.r.d1).slice(0, 7);
    $("waves-list").innerHTML = rows.map(({ v, r }) => {
      const regions = [...new Set(Object.keys(v.countryCounts || {}).map(regionOf))].map((x) => RNAME[x]).join(", ");
      return `<li class="sw-wave"><div><b>${esc(v.id)}</b><span class="sub">${esc(regions || "—")}</span><span class="sw-pill ${r.status}">${LBL[r.status]}</span></div>
      ${spark(v.id)}<div class="rate"><b>+${Math.max(0, r.d1)}</b> cars / 24 h<span class="sub">${v.count} cars · ${v.percent}%</span>${fiPend(v.id)}</div></li>`;
    }).join("");
  }

  function ladder() {
    const lanes = [
      { name: "North America · HW4", note: "AI4", get: (v) => v.fsdHw4 },
      { name: "North America · HW3", note: "Lite builds", get: (v) => v.fsdHw3 },
      { name: "Europe", note: "per TeslaFi", get: (v) => (Object.keys(v.countryCounts || {}).some((c) => EU.includes(c)) ? EXTRA_FSD[v.id] : null) },
      { name: "Asia-Pacific", note: "per TeslaFi", get: (v) => (Object.keys(v.countryCounts || {}).some((c) => AP.includes(c)) ? EXTRA_FSD[v.id] : null) },
    ];
    $("ladder-out").innerHTML = lanes.map((L) => {
      const steps = [];
      [...versions].sort((a, b) => a.date.localeCompare(b.date)).forEach((v) => {
        const f = L.get(v); if (!f) return;
        const prev = steps[steps.length - 1];
        if (prev && prev.f === f) prev.ids.push(v.id); else steps.push({ f, v, ids: [v.id] });
      });
      if (!steps.length) return "";
      const lastF = steps[steps.length - 1].f;
      return `<div class="sw-lane"><div class="sw-lane-name">${L.name}<small>${L.note}</small></div><div class="sw-steps" tabindex="0" role="region" aria-label="${L.name} releases">${steps.map((s) =>
        `<div class="sw-step${s.f === lastF ? " now" : ""}"><b>v${esc(s.f)}</b><span>${esc(s.ids.join(", "))}</span><span>since ${fmt(s.v.date)}</span></div>`).join("")}</div></div>`;
    }).join("");
    requestAnimationFrame(() => document.querySelectorAll(".sw-steps").forEach((el) => (el.scrollLeft = el.scrollWidth)));
  }

  function diffSetup() {
    const withNotes = [...versions].filter((v) => (v.features || []).length).sort((a, b) => cmpVer(b.id, a.id));
    const opts = withNotes.map((v) => `<option value="${esc(v.id)}">${esc(v.id)}</option>`).join("");
    $("d-a").innerHTML = opts; $("d-b").innerHTML = opts;
    $("d-a").value = withNotes[0]?.id; const key = (v) => v.features.map((f) => f.title).sort().join("|");
    $("d-b").value = (withNotes.find((v, i) => i > 0 && key(v) !== key(withNotes[0])) || withNotes[1])?.id;
    const run = () => {
      const a = versions.find((v) => v.id === $("d-a").value), b = versions.find((v) => v.id === $("d-b").value);
      if (!a || !b) return;
      const A = new Set(a.features.map((f) => f.title)), B = new Set(b.features.map((f) => f.title));
      const add = [...A].filter((t) => !B.has(t)), gone = [...B].filter((t) => !A.has(t)), same = [...A].filter((t) => B.has(t));
      const li = (arr, empty) => (arr.length ? arr.map((t) => `<li>${esc(t)}</li>`).join("") : `<li>${empty}</li>`);
      $("diff-out").innerHTML = `<div class="add"><h3>New in ${esc(a.id)}</h3><ul>${li(add, "Nothing new in the notes")}</ul></div>
        <div class="gone"><h3>Dropped from notes</h3><ul>${li(gone, "Nothing dropped")}</ul></div>
        <div class="same"><h3>Carried over</h3><ul>${li(same, "—")}</ul></div>`;
    };
    $("d-a").onchange = run; $("d-b").onchange = run; run();
  }

  // Globe with rollout replay.
  let viewer = null, entities = [], playing = null;
  function globeInit() {
    const C = window.Cesium;
    if (!C) return window.loadCesium().then(globeInit).catch(() => {});
    viewer = new C.Viewer("sw-globe", {
      baseLayer: C.ImageryLayer.fromProviderAsync(C.ArcGisMapServerImageryProvider.fromUrl("https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer")),
      baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false,
      animation: false, timeline: false, fullscreenButton: false, infoBox: false, selectionIndicator: false, terrain: undefined,
    });
    viewer.scene.globe.enableLighting = true;
    viewer.clock.shouldAnimate = true; viewer.clock.multiplier = 1;
    viewer.scene.skyAtmosphere.show = true;
    viewer.camera.setView({ destination: C.Cartesian3.fromDegrees(-30, 35, 2.1e7) });
    $("gz-in").onclick = () => viewer.camera.zoomIn(viewer.camera.positionCartographic.height * 0.3);
    $("gz-out").onclick = () => viewer.camera.zoomOut(viewer.camera.positionCartographic.height * 0.4);
    drawGlobe();
  }
  function drawGlobe() {
    const id = $("g-ver").value, i = +$("g-time").value, s = snaps[i];
    const cc = s?.v?.[id]?.[1] || {};
    const total = Object.values(cc).reduce((a, b) => a + b, 0);
    $("g-when").textContent = fmt(s.t, true);
    $("g-sum").textContent = total ? `${id}: ${total} tracked cars in ${Object.keys(cc).length} countries at this point.` : `${id} had not been seen yet at this point.`;
    if (!viewer) return;
    const C = window.Cesium;
    entities.forEach((e) => viewer.entities.remove(e)); entities = [];
    const max = Math.max(1, ...Object.values(cc));
    for (const [c, n] of Object.entries(cc)) {
      const ll = LL[c]; if (!ll) continue;
      entities.push(viewer.entities.add({ position: C.Cartesian3.fromDegrees(ll[0], ll[1]),
        point: { pixelSize: 7 + 22 * Math.sqrt(n / max), color: C.Color.fromCssColorString("#e31937").withAlpha(0.75), outlineColor: C.Color.WHITE.withAlpha(0.85), outlineWidth: 1.5 },
        label: n / max > 0.15 ? { text: `${c} ${n}`, font: "600 12px Inter, sans-serif", fillColor: C.Color.WHITE, style: C.LabelStyle.FILL_AND_OUTLINE, outlineWidth: 3, outlineColor: C.Color.BLACK, pixelOffset: new C.Cartesian2(0, -18) } : undefined }));
    }
  }
  function globeSetup() {
    const pick = versions.filter((v) => v.count >= 5).sort((a, b) => cmpVer(b.id, a.id));
    $("g-ver").innerHTML = pick.map((v) => `<option>${esc(v.id)}</option>`).join("");
    const widest = [...pick].sort((a, b) => Object.keys(b.countryCounts || {}).length - Object.keys(a.countryCounts || {}).length)[0];
    $("g-ver").value = widest.id;
    const t = $("g-time"); t.max = snaps.length - 1; t.value = snaps.length - 1;
    t.oninput = drawGlobe; $("g-ver").onchange = drawGlobe;
    $("g-play").onclick = () => {
      if (playing) { clearInterval(playing); playing = null; $("g-play").textContent = "▶"; return; }
      if (+t.value >= +t.max) t.value = 0;
      $("g-play").textContent = "❚❚";
      playing = setInterval(() => { if (+t.value >= +t.max) { $("g-play").click(); return; } t.value = +t.value + 1; drawGlobe(); }, 260);
    };
    drawGlobe();
    let started = false;
    const go = () => { if (!started) { started = true; globeInit(); } };
    // Cesium (~3 MB) loads only when the globe card scrolls near the viewport.
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { io.disconnect(); go(); } }, { rootMargin: "300px" });
    io.observe($("sw-globe"));
  }

  function seg(id, key) {
    $(id).addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      state[key] = b.dataset.v;
      $(id).querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      mycar();
    });
  }

  Promise.all([fetch("/updates-live.json", { cache: "no-store" }).then((r) => r.json()), fetch("/data/updates-history.json", { cache: "no-store" }).then((r) => r.json()),
    fetch("/data/updates-extras.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}))])
    .then(([l, h, x]) => {
      live = l; hist = h; extras = x || {}; versions = l.versions; snaps = h.snapshots;
      if (!snaps.length || snaps[snaps.length - 1].t !== l.updated) snaps.push({ t: l.updated, v: Object.fromEntries(versions.map((v) => [v.id, [v.count, v.countryCounts || {}]])) });
      $("sw-live").textContent = `Live · ${fmt(l.updated, true)} · ${l.fleet.toLocaleString()} connected cars · times in ${tz}`;
      tiles(); mycar(); waves(); crossCheck(); ladder(); diffSetup(); globeSetup();
      seg("seg-hw", "hw"); seg("seg-rg", "rg");
    })
    .catch((err) => { $("sw-live").textContent = "Could not load the snapshot."; console.error(err); });
})();
