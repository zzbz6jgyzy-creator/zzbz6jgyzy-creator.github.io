/* Irish EV Tariff Watch, prototype app logic. No network calls; reads window.TARIFF_DATA from data.js */
(function () {
  "use strict";
  const D = window.TARIFF_DATA;
  if (!D) { console.error("TARIFF_DATA missing"); return; }
  const VAT = 1 + D.meta.vatRate;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const c2 = (x) => (x == null || isNaN(x)) ? "–" : x.toFixed(2) + "c";
  const eur0 = (x) => "€" + Math.round(x).toLocaleString("en-IE");
  const eur2 = (x) => "€" + x.toFixed(2);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
  const fmtShort = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]}`; };
  const todayISO = (() => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; })();
  const daysUntil = (iso) => Math.round((new Date(iso + "T00:00:00") - new Date(todayISO + "T00:00:00")) / 86400000);

  const evRate = (p, basis) => (basis === "next" && p.ev.next != null) ? p.ev.next : p.ev.now;
  const scRate = (p, basis) => (basis === "next" && p.standing.next != null) ? p.standing.next : p.standing.now;
  const isDerived = (p, basis) => basis === "next" && p.ev.next != null && p.ev.nextVerified === "derived";
  const windowSpan = (p) => { const m = /(\d{2}):\d{2}\D+(\d{2}):\d{2}/.exec(p.evWindow); return m ? [Number(m[1]), Number(m[2])] : null; };

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  try { const saved = localStorage.getItem("evtw-theme"); if (saved) root.dataset.theme = saved; } catch (e) {}
  $("#themeToggle").addEventListener("click", () => {
    const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const cur = root.dataset.theme || (sysDark ? "dark" : "light");
    root.dataset.theme = cur === "dark" ? "light" : "dark";
    try { localStorage.setItem("evtw-theme", root.dataset.theme); } catch (e) {}
    drawChart();
  });

  /* ---------- Hero ---------- */
  function renderHero() {
    const open = D.plans.filter(p => p.status === "open");
    const bestNow = open.slice().sort((a, b) => evRate(a, "now") - evRate(b, "now"))[0];
    const bestNext = open.slice().sort((a, b) => evRate(a, "next") - evRate(b, "next"))[0];
    const upcoming = D.alerts.filter(a => daysUntil(a.date) >= 0).length;
    $("#heroStats").innerHTML = `
      <li><b>${c2(evRate(bestNow, "now"))}</b><span>cheapest EV rate today<br>${esc(bestNow.supplier)}</span></li>
      <li><b>${c2(evRate(bestNext, "next"))}</b><span>cheapest after 12 Oct<br>${esc(bestNext.supplier)}</span></li>
      <li><b>${upcoming}</b><span>price changes still to come</span></li>`;

    const a = D.alerts.find(x => x.level === "major" && daysUntil(x.date) >= 0) || D.alerts[0];
    const n = daysUntil(a.date);
    const when = n > 1 ? `in ${n} days` : n === 1 ? "tomorrow" : n === 0 ? "today" : "now in effect";
    const en = D.plans.find(p => p.id === "energia-ev-smart-drive");
    const isEnergia = a.supplier === "Energia" && en;
    $("#latestAlert").innerHTML = `
      <div class="alert-banner__kicker"><span class="pulse" aria-hidden="true"></span> Latest alert · ${esc(a.supplier)}</div>
      <h2>${isEnergia ? "Energia's EV charging rate is jumping 30%" : esc(a.title)}</h2>
      ${isEnergia ? `<div class="row"><span class="big">+30%</span>
        <span class="fromto">EV Smart Drive, 2–6am<br><b>9.61c → 12.49c</b> ex VAT<br>≈ ${c2(en.ev.now)} → ${c2(en.ev.next)} incl VAT &amp; 10% discount</span></div>` : ""}
      <p><span class="countdown">From ${fmtDate(a.date)} · ${when}</span></p>
      <p>${esc(a.body)}</p>
      <p><a href="${esc(a.url)}" target="_blank" rel="noopener">Source: ${esc(a.supplier)} ↗</a>${(a.extra || []).map(x => ` · <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)} ↗</a>`).join("")}</p>`;
  }

  /* ---------- Ranking table ---------- */
  const state = { basis: "now", sortKey: "ev", sortDir: 1, showClosed: false, cbasis: "now" };
  function sortVal(p, key) {
    switch (key) {
      case "supplier": return (p.supplier + " " + p.plan).toLowerCase();
      case "hours": return p.evHours == null ? -1 : p.evHours;
      case "day": return p.day == null ? Infinity : p.day;
      case "standing": return scRate(p, state.basis);
      case "per100": case "ev": case "rank": default: return evRate(p, state.basis);
    }
  }
  function renderTable() {
    const b = state.basis;
    let rows = D.plans.filter(p => state.showClosed || p.status === "open");
    const byRate = rows.slice().sort((x, y) => evRate(x, b) - evRate(y, b));
    const rankOf = new Map(byRate.map((p, i) => [p.id, i + 1]));
    const bestId = byRate.find(p => p.status === "open")?.id;
    rows.sort((x, y) => {
      const va = sortVal(x, state.sortKey), vb = sortVal(y, state.sortKey);
      return (va < vb ? -1 : va > vb ? 1 : 0) * state.sortDir;
    });
    $("#rankTable tbody").innerHTML = rows.map(p => {
      const r = evRate(p, b), sc = scRate(p, b);
      const rising = p.ev.next != null && p.ev.next > p.ev.now;
      let evSub = "";
      if (rising && b === "now") evSub = `<i class="tag tag--up">▲ ${c2(p.ev.next)} from ${fmtShort(p.ev.nextDate)}</i>`;
      if (rising && b === "next") evSub = `<span class="sub">was ${c2(p.ev.now)} · from ${fmtShort(p.ev.nextDate)}</span><i class="tag tag--up">▲ +${Math.round((p.ev.next / p.ev.now - 1) * 100)}%</i>`;
      if (isDerived(p, b)) evSub += `<i class="tag tag--derived" title="${esc(p.ev.nextNote || "")}">derived</i>`;
      const stdNow = b === "next" && p.standardEvNext ? p.standardEvNext : p.standardEv;
      if (stdNow && Math.abs(stdNow - r) > 0.005) evSub += `<span class="sub">Standard: ${c2(stdNow)}</span>`;
      const scNote = (b === "now" && p.standing.next != null) ? `<i class="tag tag--up">▲ ${eur0(p.standing.next)}</i>` :
        (b === "next" && p.standing.next != null ? `<span class="sub">was ${eur0(p.standing.now)}</span>${p.standing.nextVerified === "derived" ? '<i class="tag tag--derived">derived</i>' : ""}` : "") +
        (p.standing.verified === "derived" ? `<i class="tag tag--derived" title="${esc(p.standing.note || "")}">derived</i>` : "");
      const tags = (p.status === "closed" ? '<i class="tag tag--closed">Closed to new customers</i>' : "") + (p.id === bestId ? '<i class="tag tag--best">Cheapest EV rate</i>' : "");
      const hrs = p.evHours ? `${p.evHours} h · ≈${Math.round(p.evHours * 7.4)} kWh @7.4 kW` : "";
      return `<tr class="${p.id === bestId ? "is-best" : ""} ${p.status === "closed" ? "is-closed" : ""}">
        <td class="c-rank num"><span class="rankno">${rankOf.get(p.id)}</span></td>
        <td class="c-sup"><span class="sup">${esc(p.supplier)}</span><span class="planname">${esc(p.plan)}</span>${tags}
          ${p.notes ? `<span class="sub">${esc(p.notes)}</span>` : ""}</td>
        <td class="c-ev num"><span class="evrate">${c2(r)}<small>/kWh</small></span>${evSub}</td>
        <td class="c-hours" data-label="Cheap window"><span>${esc(p.evWindow)}${p.hoursUnverified ? ' <i class="tag tag--warn">unverified</i>' : ""}${hrs ? `<span class="sub">${hrs}</span>` : ""}</span></td>
        <td class="c-day num" data-label="Day rate"><span>${c2(p.day)}${p.ratesNote ? `<span class="sub">${esc(p.ratesNote)}</span>` : ""}</span></td>
        <td class="c-sc num" data-label="Standing charge / yr"><span>${eur2(sc)}${scNote}</span></td>
        <td class="c-100 num" data-label="€ per 100 km"><span>${eur2(r * 16 / 100)}</span></td>
        <td class="c-src srcs">${p.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join("")}<span class="asof">Checked ${fmtDate(p.checked)}</span></td>
      </tr>`;
    }).join("");
    $$("#rankTable th[data-sort]").forEach(th => {
      const k = th.dataset.sort;
      const active = k === state.sortKey || (state.sortKey === "ev" && k === "ev");
      th.setAttribute("aria-sort", k === state.sortKey ? (state.sortDir === 1 ? "ascending" : "descending") : "none");
      if (!active) th.setAttribute("aria-sort", "none");
    });
  }
  $$("#rankTable th[data-sort]").forEach(th => {
    th.tabIndex = 0;
    const go = () => {
      const k = th.dataset.sort;
      if (state.sortKey === k) state.sortDir *= -1; else { state.sortKey = k; state.sortDir = (k === "hours") ? -1 : 1; }
      renderTable();
    };
    th.addEventListener("click", go);
    th.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
  $$("[data-basis]").forEach(btn => btn.addEventListener("click", () => {
    state.basis = btn.dataset.basis;
    $$("[data-basis]").forEach(b => { b.classList.toggle("is-on", b === btn); b.setAttribute("aria-checked", b === btn); });
    renderTable();
  }));
  $("#showClosed").addEventListener("change", e => { state.showClosed = e.target.checked; renderTable(); });

  /* ---------- Timeline ---------- */
  function renderTimeline() {
    $("#timeline").innerHTML = D.alerts.map(a => {
      const n = daysUntil(a.date);
      const badge = a.level === "good" ? '<span class="badge badge--good">Good news</span>' :
        n >= 0 ? `<span class="badge badge--soon">${n === 0 ? "Today" : n === 1 ? "Tomorrow" : "In " + n + " days"}</span>` : '<span class="badge badge--done">In effect</span>';
      return `<li class="tl tl--${esc(a.level)}"><div class="tl__card">
        <div class="tl__meta"><span class="tl__date">${fmtDate(a.date)}</span><span>· ${esc(a.supplier)}</span>${badge}</div>
        <h3>${esc(a.title)}</h3><p>${esc(a.body)}</p>
        <a href="${esc(a.url)}" target="_blank" rel="noopener">Source ↗</a>${(a.extra || []).map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)} ↗</a>`).join("")}
      </div></li>`;
    }).join("");
  }

  /* ---------- Calculator ---------- */
  const num = (id, def) => { const v = parseFloat($("#" + id).value); return isNaN(v) ? def : v; };
  function link(rangeId, numId) {
    const r = $("#" + rangeId), n = $("#" + numId);
    r.addEventListener("input", () => { n.value = r.value; calc(); });
    n.addEventListener("input", () => { r.value = n.value; calc(); });
  }
  link("kmRange", "km"); link("effRange", "eff"); link("homeRange", "home");
  ["mine", "kw", "loss", "whs"].forEach(id => $("#" + id).addEventListener("input", () => { calc(); drawChart(); }));
  $$("[data-cbasis]").forEach(btn => btn.addEventListener("click", () => {
    state.cbasis = btn.dataset.cbasis;
    $$("[data-cbasis]").forEach(b => { b.classList.toggle("is-on", b === btn); b.setAttribute("aria-checked", b === btn); });
    calc();
  }));

  function dynNightEstimate(whsEx) {
    // cheapest night base among dynamic tariffs + wholesale incl VAT
    const best = D.dynamic.slice().sort((a, b) => a.base.night - b.base.night)[0];
    return { rate: best.base.night + whsEx * VAT, who: best.supplier };
  }

  function calc() {
    const km = Math.max(0, num("km", 25000)), eff = Math.max(0, num("eff", 16));
    const home = Math.min(100, Math.max(0, num("home", 100))) / 100;
    const loss = Math.min(50, Math.max(0, num("loss", 0))) / 100;
    const kw = Math.max(0.1, num("kw", 7.4)), whs = num("whs", D.wholesale.avg2to5);
    const mine = parseFloat($("#mine").value);
    const b = state.cbasis;
    $("#kmOut").textContent = "";
    const kwhYear = km * eff / 100 * (1 + loss);
    const homeKwh = kwhYear * home;
    const perNight = homeKwh / 365;

    const dyn = dynNightEstimate(whs);
    const items = D.plans.filter(p => p.status === "open").map(p => {
      const r = evRate(p, b);
      const cap = p.evHours ? p.evHours * kw : null;
      return { label: p.supplier, sub: p.plan, rate: r, cost: homeKwh * r / 100, kind: "plan", derived: isDerived(p, b),
               fits: cap == null ? null : perNight <= cap + 1e-9, cap };
    });
    if (!isNaN(mine) && mine > 0) items.push({ label: "My current rate", sub: `${mine.toFixed(2)}c/kWh (you entered)`, rate: mine, cost: homeKwh * mine / 100, kind: "mine" });
    items.push({ label: "Dynamic tariff (est.)", sub: `${dyn.who} night base + wholesale, ≈${dyn.rate.toFixed(2)}c`, rate: dyn.rate, cost: homeKwh * dyn.rate / 100, kind: "dyn" });
    items.push({ label: "Normal 24-hour rate", sub: `${D.reference24h.label}, ${D.reference24h.rate.toFixed(2)}c`, rate: D.reference24h.rate, cost: homeKwh * D.reference24h.rate / 100, kind: "ref" });
    items.sort((a, b2) => a.cost - b2.cost);
    const max = Math.max(...items.map(i => i.cost), 1);
    const dynCost = homeKwh * dyn.rate / 100;
    const bestPlan = items.find(i => i.kind === "plan");
    const mineCost = (!isNaN(mine) && mine > 0) ? homeKwh * mine / 100 : null;

    $("#bars").innerHTML = items.map(i => {
      const w = Math.max(2, i.cost / max * 100);
      const save = (i.kind === "plan" || i.kind === "mine") ? dynCost - i.cost : null;
      return `<div class="bar bar--${i.kind}" role="listitem">
        <div class="bar__label"><b>${esc(i.label)}</b><small>${esc(i.sub)}${i.derived ? " · derived rate" : ""}</small>
          ${save != null && save > 0 ? `<span class="bar__save">saves ${eur0(save)}/yr vs dynamic</span>` : ""}
          ${i.fits === false ? `<span class="bar__warn">⚠ needs ${perNight.toFixed(1)} kWh/night; window gives ≈${i.cap.toFixed(0)}</span>` : ""}</div>
        <div class="bar__track"><div class="bar__fill" style="width:${w.toFixed(1)}%"></div><span class="bar__val">${eur0(i.cost)}</span></div>
      </div>`;
    }).join("");

    $("#kpis").innerHTML = `
      <div class="kpi"><b>${Math.round(homeKwh).toLocaleString("en-IE")} kWh</b><span>charged at home per year<br>(${perNight.toFixed(1)} kWh a night)</span></div>
      <div class="kpi kpi--good"><b>${eur0(bestPlan.cost)}</b><span>cheapest plan per year<br>${esc(bestPlan.label)} @ ${c2(bestPlan.rate)}</span></div>
      <div class="kpi"><b>${eur0(dynCost - bestPlan.cost)}</b><span>saved vs dynamic (est.)<br>@ ≈${c2(dyn.rate)} at 2–5am</span></div>
      <div class="kpi"><b>${mineCost != null ? eur0(mineCost) : "–"}</b><span>${mineCost != null ? `on your rate (${c2(mine)})<br>${mineCost - bestPlan.cost > 0.5 ? "switching could save " + eur0(mineCost - bestPlan.cost) : "you're already at or below the best listed"}` : "enter your rate to compare"}</span></div>`;
    const misfits = items.filter(i => i.fits === false).map(i => i.label + " (" + i.sub.split(" (")[0] + ")");
    $("#fitNote").innerHTML = `Assumes everything you charge at home fits in each plan's cheap window at ${kw} kW. ` +
      (misfits.length ? `<b>Not enough window time:</b> ${esc(misfits.join(", "))}. The overflow would cost that plan's night/day rate (not included).` : "At these settings every listed window is long enough.") +
      ` Standing charges are not included (see table).`;
  }

  /* ---------- Dynamic explainer: table + SVG chart ---------- */
  function renderDynTable() {
    const whs = D.wholesale.avg2to5;
    const best = D.plans.filter(p => p.status === "open").sort((a, b) => a.ev.now - b.ev.now)[0];
    const rows = D.dynamic.map(d => ({ name: `${d.supplier}: ${d.plan}`, rate: d.base.night + whs * VAT, note: `${c2(d.base.night)} night base + ${c2(whs * VAT)} wholesale incl VAT${d.note ? " · " + d.note : ""}`, url: d.url }))
      .sort((a, b) => a.rate - b.rate);
    $("#dynTable").innerHTML = rows.map(r => `<div class="dyn-row"><span>${esc(r.name)}</span><b>≈${c2(r.rate)}</b><small>${esc(r.note)} · <a href="${esc(r.url)}" target="_blank" rel="noopener">source ↗</a></small></div>`).join("") +
      `<div class="dyn-row dyn-row--ev"><span>Best fixed EV night rate: ${esc(best.supplier)}</span><b>${c2(best.ev.now)}</b><small>${esc(best.evWindow)}, fixed, known in advance</small></div>`;
  }

  function drawChart() {
    const el = $("#chart"); if (!el) return;
    const W = 720, H = 340, m = { l: 44, r: 14, t: 16, b: 34 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const band = (h) => (h >= 23 || h < 8) ? "night" : (h >= 17 && h < 19) ? "peak" : "day";
    const series = D.dynamic.slice(0, 2).map((d, k) => ({
      name: `${d.supplier} dynamic (est.)`, color: k === 0 ? "#ff883e" : "#c2410c", dash: k === 0 ? "" : "6 5",
      pts: D.wholesale.hourly.map((w, h) => d.base[band(h)] + w * VAT)
    }));
    const open = D.plans.filter(p => p.status === "open" && windowSpan(p)).sort((a, b) => a.ev.now - b.ev.now);
    const best = open[0];
    const mine = parseFloat($("#mine").value);
    const yMax = Math.ceil(Math.max(...series.flatMap(s => s.pts), 20) / 5) * 5;
    const x = (h) => m.l + h / 24 * iw, y = (v) => m.t + ih - v / yMax * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
    // EV window shading (2–5am)
    s += `<rect x="${x(2)}" y="${m.t}" width="${x(5) - x(2)}" height="${ih}" fill="#169b62" opacity=".10"/>`;
    s += `<text x="${(x(2) + x(5)) / 2}" y="${m.t + 12}" text-anchor="middle" style="font-weight:700;fill:#169b62">2–5am</text>`;
    for (let v = 0; v <= yMax; v += 5) s += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke-width="1"/><text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${v}c</text>`;
    for (let h = 0; h <= 24; h += 3) s += `<text x="${x(h)}" y="${H - 12}" text-anchor="middle">${String(h % 24).padStart(2, "0")}:00</text>`;
    series.forEach(se => {
      let d = ""; se.pts.forEach((v, h) => { d += (h === 0 ? `M${x(h)},${y(v)}` : `L${x(h)},${y(v)}`) + `L${x(h + 1)},${y(v)}`; });
      s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="3" stroke-dasharray="${se.dash}" stroke-linejoin="round"/>`;
    });
    if (best) { const [a, b2] = windowSpan(best); s += `<line x1="${x(a)}" x2="${x(b2)}" y1="${y(best.ev.now)}" y2="${y(best.ev.now)}" stroke="#169b62" stroke-width="5" stroke-linecap="round"/>`;
      s += `<text x="${x(b2) + 6}" y="${y(best.ev.now) + 4}" style="font-weight:700;fill:#169b62">${best.ev.now.toFixed(2)}c</text>`; }
    if (!isNaN(mine) && mine > 0) s += `<line x1="${x(2)}" x2="${x(5)}" y1="${y(mine)}" y2="${y(mine)}" stroke="#2563eb" stroke-width="3" stroke-dasharray="4 4"/>`;
    s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="currentColor" opacity=".3"/>`;
    s += `</svg>`;
    el.innerHTML = s;
    $("#chartLegend").innerHTML = series.map(se => `<span><i style="background:${se.color}"></i>${esc(se.name)}</span>`).join("") +
      (best ? `<span><i style="background:#169b62;height:5px"></i>${esc(best.supplier)} EV rate (${esc(best.evWindow)})</span>` : "") +
      (!isNaN(mine) && mine > 0 ? `<span><i style="background:#2563eb"></i>Your rate (${mine.toFixed(2)}c, 2–5am)</span>` : "") +
      `<span>Wholesale: <a href="${esc(D.wholesale.source)}" target="_blank" rel="noopener">${esc(D.wholesale.sourceLabel)}</a>, ${esc(D.wholesale.period)}</span>`;
  }

  /* ---------- Demo-only forms (no data leaves the page) ---------- */
  $("#newsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = $("#newsMsg");
    $("#email").value = "";
    msg.textContent = "Demo only: nothing was sent or saved. The newsletter isn't live yet.";
    msg.classList.add("is-shown");
  });
  $("#xBtn").addEventListener("click", () => {
    const msg = $("#xMsg");
    msg.textContent = "Demo only: the X account hasn't been created yet, so there's nothing to follow.";
    msg.classList.add("is-shown");
  });

  $("#asOf").textContent = fmtDate(D.meta.asOf);
  renderHero(); renderTable(); renderTimeline(); renderDynTable(); calc(); drawChart();
})();
