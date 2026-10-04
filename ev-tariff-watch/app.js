/* Irish EV Tariff Watch: shared site logic for every page.
   No network calls. Reads window.TARIFF_DATA from data.js and renders whatever
   containers exist on the current page (each page has <body data-page="...">). */
(function () {
  "use strict";
  const D = window.TARIFF_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- Navigation + theme (work even if data is missing) ---------- */
  const root = document.documentElement;
  const header = $(".topbar");
  const menuBtn = $("#menuToggle");
  const nav = $("#siteNav");
  function setMenu(open) {
    if (!menuBtn) return;
    header.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && header.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); } });
    document.addEventListener("click", e => { if (header.classList.contains("is-open") && !header.contains(e.target)) setMenu(false); });
    $$("a", nav).forEach(a => a.addEventListener("click", () => setMenu(false)));
    window.matchMedia("(min-width: 1180px)").addEventListener("change", e => { if (e.matches) setMenu(false); });
  }
  const themeBtn = $("#themeToggle");
  if (themeBtn) themeBtn.addEventListener("click", () => {
    const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const cur = root.dataset.theme || (sysDark ? "dark" : "light");
    root.dataset.theme = cur === "dark" ? "light" : "dark";
    try { localStorage.setItem("evtw-theme", root.dataset.theme); } catch (e) {}
  });

  if (!D) { console.error("TARIFF_DATA missing: is data.js loaded?"); return; }

  /* ---------- Helpers ---------- */
  const VAT = 1 + D.meta.vatRate;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const c2 = (x) => (x == null || isNaN(x)) ? "–" : x.toFixed(2) + "c";
  const eur0 = (x) => "€" + Math.round(x).toLocaleString("en-IE");
  const eur2 = (x) => "€" + x.toFixed(2);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
  const fmtShort = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]}`; };
  const t0 = new Date();
  const todayISO = `${t0.getFullYear()}-${String(t0.getMonth() + 1).padStart(2, "0")}-${String(t0.getDate()).padStart(2, "0")}`;
  const daysUntil = (iso) => Math.round((new Date(iso + "T00:00:00") - new Date(todayISO + "T00:00:00")) / 86400000);
  const ext = (url, label, cls = "") => `<a${cls ? ` class="${cls}"` : ""} href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`;
  const countdown = (n) => n > 1 ? `in ${n} days` : n === 1 ? "tomorrow" : n === 0 ? "today" : "in effect";

  /* Announced prices switch in automatically on their start date. */
  const nextLive = (p) => p.ev.next != null && !!p.ev.nextDate && p.ev.nextDate <= todayISO;
  const usesNext = (p, basis) => p.ev.next != null && (basis === "next" || nextLive(p));
  const evRate = (p, basis) => usesNext(p, basis) ? p.ev.next : p.ev.now;
  const scUsesNext = (p, basis) => p.standing.next != null && (basis === "next" || (!!p.ev.nextDate && p.ev.nextDate <= todayISO));
  const scRate = (p, basis) => scUsesNext(p, basis) ? p.standing.next : p.standing.now;
  const isDerived = (p, basis) => usesNext(p, basis) && p.ev.nextVerified === "derived";
  const stdRate = (p, basis) => (usesNext(p, basis) && p.standardEvNext) ? p.standardEvNext : p.standardEv;
  const windowSpan = (p) => { const m = /(\d{2}):\d{2}\D+(\d{2}):\d{2}/.exec(p.evWindow); return m ? [Number(m[1]), Number(m[2])] : null; };
  const openPlans = () => D.plans.filter(p => p.status === "open");
  const cheapest = (basis) => openPlans().slice().sort((a, b) => evRate(a, basis) - evRate(b, basis))[0];
  const lastRise = D.plans.map(p => p.ev.nextDate).filter(Boolean).sort().pop();
  const upcomingAlerts = () => D.alerts.filter(a => daysUntil(a.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));
  const shortName = (s) => s.replace(" Energy", "").replace(" Airtricity", "");

  function switchBlock(supplier, opts = {}) {
    const s = (D.suppliers || {})[supplier];
    if (!s || !s.switchUrl) return "";
    const btn = s.current
      ? `<a class="btn btn--switch btn--current" href="${esc(s.switchUrl)}" target="_blank" rel="noopener"><span class="cur-badge">Your current supplier</span><span>View ${esc(shortName(supplier))} EV plans ↗</span></a>`
      : `<a class="btn btn--switch" href="${esc(s.switchUrl)}" target="_blank" rel="noopener">Switch to ${esc(supplier)} <span aria-hidden="true">↗</span></a>`;
    const guide = (s.guideUrl && !opts.noGuide) ? ext(s.guideUrl, `${esc(supplier)} switching guide ↗`, "guide-link") : "";
    const note = (s.note && opts.note) ? `<span class="sub">${esc(s.note)}</span>` : "";
    return `<div class="switch">${btn}${guide}${note}</div>`;
  }

  /* ---------- Fill simple text slots ---------- */
  const fills = {
    asOf: fmtDate(D.meta.asOf),
    asOfLong: `Prices checked ${fmtDate(D.meta.asOf)}`,
    linksChecked: fmtDate(D.meta.linksChecked || D.meta.asOf),
    siteUpdated: fmtDate(D.meta.siteUpdated || D.meta.built),
    todayShort: fmtShort(todayISO),
    lastRiseShort: lastRise ? fmtShort(lastRise) : "",
    wholesalePeriod: D.wholesale.period,
    avg2to5: c2(D.wholesale.avg2to5)
  };
  $$("[data-fill]").forEach(el => { const v = fills[el.dataset.fill]; if (v != null) el.textContent = v; });

  /* ---------- Home ---------- */
  function renderHome() {
    const bestNow = cheapest("now"), bestNext = cheapest("next");
    const up = upcomingAlerts();
    $("#heroStats").innerHTML = `
      <li><b>${c2(evRate(bestNow, "now"))}</b><span>cheapest EV rate today<br>${esc(bestNow.supplier)}</span></li>
      <li><b>${c2(evRate(bestNext, "next"))}</b><span>cheapest after ${esc(fmtShort(lastRise))}<br>${esc(bestNext.supplier)}</span></li>
      <li><b>${up.length}</b><span>price changes<br>still to come</span></li>`;

    const p = bestNow, r = evRate(p, "now");
    const rising = p.ev.next != null && !nextLive(p) && p.ev.next > p.ev.now;
    $("#bestCard").innerHTML = `
      <p class="best-card__kicker"><span class="tag tag--best">Cheapest EV rate today</span></p>
      <p class="best-card__sup">${esc(p.supplier)}</p>
      <p class="best-card__plan">${esc(p.plan)}</p>
      <p class="best-card__rate">${r.toFixed(2)}<small>c/kWh</small></p>
      ${rising ? `<p><i class="tag tag--up">▲ ${c2(p.ev.next)} from ${fmtShort(p.ev.nextDate)}</i></p>` : ""}
      <dl class="best-card__facts">
        <div><dt>Cheap window</dt><dd>${esc(p.evWindow)}</dd></div>
        <div><dt>Standing charge</dt><dd>${eur2(scRate(p, "now"))}/yr</dd></div>
        <div><dt>€ per 100 km</dt><dd>${eur2(r * 16 / 100)}</dd></div>
      </dl>
      ${switchBlock(p.supplier, { note: true })}
      <p class="best-card__more"><a href="compare.html">Compare all ${D.plans.length} plans →</a></p>`;

    $("#upcoming").innerHTML = up.length ? up.map(a => {
      const n = daysUntil(a.date); const [, m, d] = a.date.split("-").map(Number);
      return `<article class="up up--${esc(a.level)}">
        <div class="up__date" aria-hidden="true"><b>${d}</b><span>${MONTHS[m - 1]}</span></div>
        <div class="up__body">
          <p class="up__meta"><span>${esc(a.supplier)}</span><span class="badge badge--soon">${countdown(n)}</span></p>
          <h3>${esc(a.title)}</h3>
          <p>${esc(a.body)}</p>
          <p class="up__links">${ext(a.url, "Source ↗")}${(a.extra || []).map(x => ext(x.url, esc(x.label) + " ↗")).join("")}</p>
        </div></article>`;
    }).join("") : `<p class="muted">No announced price changes still to come.</p>`;

    const top = openPlans().slice().sort((a, b) => evRate(a, "now") - evRate(b, "now")).slice(0, 3);
    $("#miniRank").innerHTML = top.map((q, i) => `<li class="mini">
      <span class="rankno${i === 0 ? " is-first" : ""}">${i + 1}</span>
      <div class="mini__main"><b>${esc(q.supplier)}</b><span>${esc(q.plan)} · ${esc(q.evWindow)}</span></div>
      <div class="mini__rate">${c2(evRate(q, "now"))}<small>/kWh</small></div>
      <div class="mini__cta">${switchBlock(q.supplier, { noGuide: true })}</div></li>`).join("");
  }

  /* ---------- Compare ---------- */
  const state = { basis: "now", sortKey: "ev", sortDir: 1, showClosed: false, cbasis: "now" };
  function sortVal(p, key) {
    switch (key) {
      case "supplier": return (p.supplier + " " + p.plan).toLowerCase();
      case "hours": return p.evHours == null ? -1 : p.evHours;
      case "day": return p.day == null ? Infinity : p.day;
      case "standing": return scRate(p, state.basis);
      default: return evRate(p, state.basis);
    }
  }
  function renderTable() {
    const b = state.basis;
    const rows = D.plans.filter(p => state.showClosed || p.status === "open");
    const byRate = rows.slice().sort((x, y) => evRate(x, b) - evRate(y, b));
    const rankOf = new Map(byRate.map((p, i) => [p.id, i + 1]));
    const bestId = byRate.find(p => p.status === "open")?.id;
    rows.sort((x, y) => { const va = sortVal(x, state.sortKey), vb = sortVal(y, state.sortKey); return (va < vb ? -1 : va > vb ? 1 : 0) * state.sortDir; });
    $("#rankTable tbody").innerHTML = rows.map(p => {
      const r = evRate(p, b), sc = scRate(p, b);
      const rises = p.ev.next != null && p.ev.next > p.ev.now;
      let evSub = "";
      if (rises && !usesNext(p, b)) evSub = `<i class="tag tag--up">▲ ${c2(p.ev.next)} from ${fmtShort(p.ev.nextDate)}</i>`;
      if (rises && usesNext(p, b)) evSub = `<span class="sub">was ${c2(p.ev.now)} · ${nextLive(p) ? "since" : "from"} ${fmtShort(p.ev.nextDate)}</span><i class="tag tag--up">▲ +${Math.round((p.ev.next / p.ev.now - 1) * 100)}%</i>`;
      if (isDerived(p, b)) evSub += `<i class="tag tag--derived" title="${esc(p.ev.nextNote || "")}">derived</i>`;
      const std = stdRate(p, b);
      if (std && Math.abs(std - r) > 0.005) evSub += `<span class="sub">Standard: ${c2(std)}</span>`;
      let scNote = "";
      if (p.standing.next != null && !scUsesNext(p, b)) scNote = `<i class="tag tag--up">▲ ${eur0(p.standing.next)}</i>`;
      if (p.standing.next != null && scUsesNext(p, b)) scNote = `<span class="sub">was ${eur0(p.standing.now)}</span>${p.standing.nextVerified === "derived" ? '<i class="tag tag--derived">derived</i>' : ""}`;
      if (p.standing.verified === "derived") scNote += `<i class="tag tag--derived" title="${esc(p.standing.note || "")}">derived</i>`;
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
        <td class="c-src">${switchBlock(p.supplier, { note: p.status === "closed" || p.supplier === "Yuno Energy" })}
          <div class="srcs"><span class="srcs__h">Sources</span>${p.sources.map(s => ext(s.url, esc(s.label) + " ↗")).join("")}<span class="asof">Checked ${fmtDate(p.checked)}</span></div></td>
      </tr>`;
    }).join("");
    $$("#rankTable th[data-sort]").forEach(th => th.setAttribute("aria-sort", th.dataset.sort === state.sortKey ? (state.sortDir === 1 ? "ascending" : "descending") : "none"));
  }
  function initCompare() {
    $$("#rankTable th[data-sort]").forEach(th => {
      th.tabIndex = 0;
      const go = () => { const k = th.dataset.sort; if (state.sortKey === k) state.sortDir *= -1; else { state.sortKey = k; state.sortDir = (k === "hours") ? -1 : 1; } renderTable(); };
      th.addEventListener("click", go);
      th.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    $$("[data-basis]").forEach(btn => btn.addEventListener("click", () => {
      state.basis = btn.dataset.basis;
      $$("[data-basis]").forEach(x => { x.classList.toggle("is-on", x === btn); x.setAttribute("aria-checked", String(x === btn)); });
      renderTable();
    }));
    $("#showClosed").addEventListener("change", e => { state.showClosed = e.target.checked; renderTable(); });
    renderTable();
  }

  /* ---------- Calculator ---------- */
  const num = (id, def) => { const el = $("#" + id); const v = el ? parseFloat(el.value) : NaN; return isNaN(v) ? def : v; };
  function dynNightEstimate(whsEx) {
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
    const homeKwh = km * eff / 100 * (1 + loss) * home;
    const perNight = homeKwh / 365;
    const dyn = dynNightEstimate(whs);
    const items = openPlans().map(p => {
      const r = evRate(p, b), cap = p.evHours ? p.evHours * kw : null;
      return { label: p.supplier, sub: p.plan, rate: r, cost: homeKwh * r / 100, kind: "plan", derived: isDerived(p, b), fits: cap == null ? null : perNight <= cap + 1e-9, cap };
    });
    const hasMine = !isNaN(mine) && mine > 0;
    if (hasMine) items.push({ label: "My current rate", sub: `${mine.toFixed(2)}c/kWh (you entered)`, rate: mine, cost: homeKwh * mine / 100, kind: "mine" });
    items.push({ label: "Dynamic tariff (est.)", sub: `${dyn.who} night base + wholesale, ≈${dyn.rate.toFixed(2)}c`, rate: dyn.rate, cost: homeKwh * dyn.rate / 100, kind: "dyn" });
    items.push({ label: "Normal 24-hour rate", sub: `${D.reference24h.label}, ${D.reference24h.rate.toFixed(2)}c`, rate: D.reference24h.rate, cost: homeKwh * D.reference24h.rate / 100, kind: "ref" });
    items.sort((x, y) => x.cost - y.cost);
    const max = Math.max(...items.map(i => i.cost), 1);
    const dynCost = homeKwh * dyn.rate / 100;
    const bestPlan = items.find(i => i.kind === "plan");
    const mineCost = hasMine ? homeKwh * mine / 100 : null;

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
    $("#cheapestCta").innerHTML = `<p><b>Cheapest at these settings:</b> ${esc(bestPlan.label)}, ${esc(bestPlan.sub)} (${c2(bestPlan.rate)}/kWh). <a href="compare.html">Check its standing charge and day rate</a> before switching.</p>${switchBlock(bestPlan.label, { noGuide: true })}`;
    const misfits = items.filter(i => i.fits === false).map(i => i.label + " (" + i.sub.split(" (")[0] + ")");
    $("#fitNote").innerHTML = `Assumes everything you charge at home fits in each plan's cheap window at ${esc(String(kw))} kW. ` +
      (misfits.length ? `<b>Not enough window time:</b> ${esc(misfits.join(", "))}. The overflow would cost that plan's night/day rate (not included).` : "At these settings every listed window is long enough.") +
      ` Standing charges are not included (see <a href="compare.html">Compare plans</a>).`;
  }
  function initCalc() {
    const link = (rangeId, numId) => {
      const r = $("#" + rangeId), n = $("#" + numId);
      r.addEventListener("input", () => { n.value = r.value; calc(); });
      n.addEventListener("input", () => { r.value = n.value; calc(); });
    };
    link("kmRange", "km"); link("effRange", "eff"); link("homeRange", "home");
    ["mine", "kw", "loss", "whs"].forEach(id => $("#" + id).addEventListener("input", calc));
    $$("[data-cbasis]").forEach(btn => btn.addEventListener("click", () => {
      state.cbasis = btn.dataset.cbasis;
      $$("[data-cbasis]").forEach(x => { x.classList.toggle("is-on", x === btn); x.setAttribute("aria-checked", String(x === btn)); });
      calc();
    }));
    calc();
  }

  /* ---------- Dynamic ---------- */
  function dynRows() {
    const whs = D.wholesale.avg2to5;
    return D.dynamic.map(d => ({ d, rate: d.base.night + whs * VAT })).sort((a, b) => a.rate - b.rate);
  }
  function renderDynamic() {
    const rows = dynRows();
    const best = cheapest("now");
    const lo = Math.round(rows[0].rate), hi = Math.round(rows[rows.length - 1].rate);
    $("#dynRange").textContent = `about ${lo}–${hi}c`;
    $("#dynVerdict").innerHTML = `<div class="verdict__num"><b>≈${lo}–${hi}c</b><span>dynamic tariff at 2–5am (estimate)</span></div>
      <div class="verdict__vs">vs</div>
      <div class="verdict__num verdict__num--good"><b>${c2(evRate(best, "now"))}</b><span>best fixed EV night rate<br>${esc(best.supplier)}, ${esc(best.evWindow)}</span></div>
      <p class="verdict__txt">On average wholesale prices (${esc(D.wholesale.period)}), a good EV night rate is far cheaper than charging on a dynamic tariff.</p>`;
    $("#dynTable").innerHTML = rows.map(({ d, rate }) => `<div class="dyn-row"><span>${esc(d.supplier)}: ${esc(d.plan)}</span><b>≈${c2(rate)}</b><small>${c2(d.base.night)} night base + ${c2(D.wholesale.avg2to5 * VAT)} wholesale incl VAT${d.note ? " · " + esc(d.note) : ""} · ${ext(d.url, "source ↗")}</small></div>`).join("") +
      `<div class="dyn-row dyn-row--ev"><span>Best fixed EV night rate: ${esc(best.supplier)}</span><b>${c2(evRate(best, "now"))}</b><small>${esc(best.evWindow)}, fixed, known in advance</small></div>`;
    $("#dynCards").innerHTML = D.dynamic.map(d => `<article class="card dyn-card">
      <h3>${esc(d.supplier)}</h3><p class="muted">${esc(d.plan)}</p>
      <dl class="dl-grid"><div><dt>Night base</dt><dd>${c2(d.base.night)}</dd></div><div><dt>Day base</dt><dd>${c2(d.base.day)}</dd></div><div><dt>Peak base</dt><dd>${c2(d.base.peak)}</dd></div><div><dt>Standing</dt><dd>${eur0(d.standing)}/yr</dd></div></dl>
      <p class="fineprint">Base rates incl VAT; the half-hourly wholesale price is added on top. Effective ${fmtDate(d.effective)}.${d.note ? " " + esc(d.note) : ""} ${ext(d.url, "Source ↗")}</p>
      ${switchBlock(d.supplier, { noGuide: true })}</article>`).join("");
    drawChart();
    if (themeBtn) themeBtn.addEventListener("click", drawChart);
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
    const best = openPlans().filter(p => windowSpan(p)).sort((a, b) => evRate(a, "now") - evRate(b, "now"))[0];
    const yMax = Math.ceil(Math.max(...series.flatMap(s => s.pts), 20) / 5) * 5;
    const x = (h) => m.l + h / 24 * iw, y = (v) => m.t + ih - v / yMax * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
    s += `<rect x="${x(2)}" y="${m.t}" width="${x(5) - x(2)}" height="${ih}" fill="#169b62" opacity=".10"/>`;
    s += `<text x="${(x(2) + x(5)) / 2}" y="${m.t + 12}" text-anchor="middle" style="font-weight:700;fill:#169b62">2–5am</text>`;
    for (let v = 0; v <= yMax; v += 5) s += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke-width="1"/><text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${v}c</text>`;
    for (let h = 0; h <= 24; h += 3) s += `<text x="${x(h)}" y="${H - 12}" text-anchor="middle">${String(h % 24).padStart(2, "0")}:00</text>`;
    series.forEach(se => {
      let d = ""; se.pts.forEach((v, h) => { d += (h === 0 ? `M${x(h)},${y(v)}` : `L${x(h)},${y(v)}`) + `L${x(h + 1)},${y(v)}`; });
      s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="3" stroke-dasharray="${se.dash}" stroke-linejoin="round"/>`;
    });
    if (best) {
      const [a, b2] = windowSpan(best), r = evRate(best, "now");
      s += `<line x1="${x(a)}" x2="${x(b2)}" y1="${y(r)}" y2="${y(r)}" stroke="#169b62" stroke-width="5" stroke-linecap="round"/>`;
      s += `<text x="${x(b2) + 6}" y="${y(r) + 4}" style="font-weight:700;fill:#169b62">${r.toFixed(2)}c</text>`;
    }
    s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="currentColor" opacity=".3"/></svg>`;
    el.innerHTML = s;
    $("#chartLegend").innerHTML = series.map(se => `<span><i style="background:${se.color}"></i>${esc(se.name)}</span>`).join("") +
      (best ? `<span><i style="background:#169b62;height:5px"></i>${esc(best.supplier)} EV rate (${esc(best.evWindow)})</span>` : "") +
      `<span>Wholesale: ${ext(D.wholesale.source, esc(D.wholesale.sourceLabel))}, ${esc(D.wholesale.period)}</span>`;
  }

  /* ---------- Price changes ---------- */
  function tlItem(a) {
    const n = daysUntil(a.date);
    const badge = a.level === "good" ? '<span class="badge badge--good">Good news</span>' :
      n >= 0 ? `<span class="badge badge--soon">${n === 0 ? "Today" : n === 1 ? "Tomorrow" : "In " + n + " days"}</span>` : '<span class="badge badge--done">In effect</span>';
    return `<li class="tl tl--${esc(a.level)}"><div class="tl__card">
      <div class="tl__meta"><span class="tl__date">${fmtDate(a.date)}</span><span>· ${esc(a.supplier)}</span>${badge}</div>
      <h3>${esc(a.title)}</h3><p>${esc(a.body)}</p>
      ${ext(a.url, "Source ↗")}${(a.extra || []).map(x => ext(x.url, esc(x.label) + " ↗")).join("")}
    </div></li>`;
  }
  function renderChanges() {
    const up = upcomingAlerts();
    const past = D.alerts.filter(a => daysUntil(a.date) < 0).sort((a, b) => b.date.localeCompare(a.date));
    $("#timelineUpcoming").innerHTML = up.length ? up.map(tlItem).join("") : '<li class="muted">Nothing announced.</li>';
    $("#timelinePast").innerHTML = past.map(tlItem).join("");
  }

  /* ---------- How to switch ---------- */
  function renderSwitch() {
    $("#supplierGrid").innerHTML = Object.keys(D.suppliers).map(name => {
      const plans = D.plans.filter(p => p.supplier === name);
      const open = plans.filter(p => p.status === "open").sort((a, b) => evRate(a, "now") - evRate(b, "now"));
      const best = open[0];
      const s = D.suppliers[name];
      return `<article class="card sup-card${s.current ? " is-current" : ""}">
        <h3>${esc(name)}</h3>
        <p class="muted">${best ? `Cheapest EV plan here: <b>${c2(evRate(best, "now"))}</b>/kWh on ${esc(best.plan)}` : "No EV plan open to new customers that we list"}</p>
        ${switchBlock(name, { note: true })}
      </article>`;
    }).join("");
  }

  /* ---------- About ---------- */
  function renderAbout() {
    const nSup = new Set(D.plans.map(p => p.supplier)).size;
    $("#facts").innerHTML = `
      <div class="fact"><b>${fmtDate(D.meta.asOf)}</b><span>prices last checked</span></div>
      <div class="fact"><b>${D.plans.length} plans</b><span>from ${nSup} suppliers</span></div>
      <div class="fact"><b>${fmtDate(D.meta.linksChecked || D.meta.asOf)}</b><span>switch links checked</span></div>
      <div class="fact"><b>${fmtDate(D.meta.siteUpdated || D.meta.built)}</b><span>site last updated</span></div>`;
    const groups = new Map();
    const add = (g, label, url) => { if (!groups.has(g)) groups.set(g, new Map()); if (!groups.get(g).has(url)) groups.get(g).set(url, label); };
    D.plans.forEach(p => p.sources.forEach(s => add(p.supplier, s.label, s.url)));
    Object.entries(D.suppliers).forEach(([n, s]) => { add(n, `${n} switching / sign-up page`, s.switchUrl); if (s.guideUrl) add(n, `${n} switching guide`, s.guideUrl); });
    D.dynamic.forEach(d => add(d.supplier, `${d.plan} rates`, d.url));
    add("Wholesale prices", D.wholesale.sourceLabel, D.wholesale.source);
    add("Reference 24-hour rate", D.reference24h.label, D.reference24h.url);
    D.alerts.forEach(a => { add("Price-change news & notices", `${fmtDate(a.date)}: ${a.title}`, a.url); (a.extra || []).forEach(x => add("Price-change news & notices", x.label, x.url)); });
    [["CRU: Switch energy supplier", "https://www.cru.ie/consumer-information/switch-supplier/switch-energy-supplier/"],
     ["ESB Networks: how to find my MPRN", "https://www.esbnetworks.ie/services/manage-my-meter/how-to-find-my-mprn"],
     ["Citizens Information: switching electricity", "https://www.citizensinformation.ie/en/consumer/utilities/electricity-services/"],
     ["bonkers.ie: how to switch", "https://www.bonkers.ie/guides/gas-electricity/how-to-switch-gas-and-electricity-supplier/"],
     ["bonkers.ie: energy cancellation fees", "https://www.bonkers.ie/blog/gas-electricity/everything-you-need-to-know-about-energy-cancellation-fees/"]
    ].forEach(([l, u]) => add("Switching guidance", l, u));
    $("#sourceList").innerHTML = Array.from(groups).map(([g, m]) => `<details class="src-group"><summary>${esc(g)} <span class="muted">(${m.size})</span></summary><ul>${Array.from(m).map(([u, l]) => `<li>${ext(u, esc(l) + " ↗")}</li>`).join("")}</ul></details>`).join("");
  }

  /* ---------- Boot ---------- */
  const page = document.body.dataset.page;
  const run = { home: renderHome, compare: initCompare, calculator: initCalc, dynamic: renderDynamic, changes: renderChanges, switch: renderSwitch, about: renderAbout }[page];
  try { if (run) run(); } catch (e) { console.error(e); }
})();
