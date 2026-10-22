#!/usr/bin/env node
// Dated initial HTML for the existing tracker mounts; browser scripts enhance it in place.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const DAY = 864e5;
const defaultRoot = fileURLToPath(new URL("../", import.meta.url));
const esc = (value) => String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const number = (n) => Number.isFinite(n) && n >= 0;
const date = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(s) && Number.isFinite(Date.parse(s));
const num = (n) => n.toLocaleString("en-US");
const day = (s) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const time = (s) => `<time datetime="${esc(s)}">${esc(new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }))} UTC</time>`;
const url = (s) => { try { const u = new URL(s); return ["http:", "https:"].includes(u.protocol) ? u.href : null; } catch { return null; } };
const link = (s, label = "Source") => url(s) ? `<a href="${esc(url(s))}" rel="noopener">${esc(label)}</a>` : esc(label);
const cmpVersion = (a, b) => {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
  return 0;
};
const NA = ["US", "CA", "MX", "PR"], EU = ["AT","BE","BG","CH","CZ","DE","DK","EE","ES","FR","GB","GR","HU","IE","IS","IT","LT","NL","NO","PL","PT","RO","SE","SI","SK","UA"], AP = ["AU","NZ","JP","KR","TW","HK","SG","MY","TH","PH"];
const region = (c) => NA.includes(c) ? "North America" : EU.includes(c) ? "Europe" : AP.includes(c) ? "Asia-Pacific" : "Middle East & other";
const readJson = (root, file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const readWindow = (root, file, key) => { const context = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, file), "utf8"), context, { timeout: 1000 }); return context.window[key]; };
function requireData(ok, message) { if (!ok) throw new Error(message); }

// Markers surround whole mounts, so nested cards/tables remain replaceable on later builds.
function mount(src, name, initial, html, stamp, sources = {}) {
  const marker = new RegExp(`<!--snapshot:${name}-->[\\s\\S]*?<!--/snapshot:${name}-->`);
  const block = `<!--snapshot:${name}-->${html}<!--/snapshot:${name}-->`;
  const old = src.match(marker)?.[0];
  // An older saved data file must not roll back a newer, working HTML snapshot.
  const prior = old?.match(/data-snapshot-at="([^"]+)"/)?.[1];
  if (prior && date(prior) && Date.parse(prior) > Date.parse(stamp)) return src;
  for (const [name, next] of Object.entries(sources)) {
    const previous = old?.match(new RegExp(`data-snapshot-${name}-at="([^"]+)"`))?.[1];
    if (previous && date(previous) && Date.parse(previous) > Date.parse(next)) return src;
  }
  requireData(marker.test(src) || initial.test(src), `Missing tracker mount: ${name}`);
  return marker.test(src) ? src.replace(marker, () => block) : src.replace(initial, () => block);
}
function id(src, name, value) {
  const re = new RegExp(`(<(?:b|small)[^>]*\\bid="${name}"[^>]*>)[\\s\\S]*?(<\\/(?:b|small)>)`);
  requireData(re.test(src), `Missing tracker figure: ${name}`);
  return src.replace(re, (_, open, close) => open + esc(value) + close);
}
function signed(n) { return `${n > 0 ? "+" : n < 0 ? "−" : "±"}${num(Math.abs(n))}`; }

export function renderUpdates(src, live, history) {
  requireData(date(live?.updated) && number(live.fleet) && live.fleet > 0 && url(live.sourceUrl), "Invalid software snapshot date, sample or source");
  requireData(Array.isArray(live.versions) && live.versions.length && live.versions.every((v) => typeof v.id === "string" && /^\d+(?:\.\d+)+$/.test(v.id) && number(v.count)), "Invalid software version counts");
  const seen = live.versions.filter((v) => v.count > 0);
  requireData(seen.length > 0, "Software snapshot has no reported builds");
  const priorStamp = src.match(/id="sw-live"[^>]*data-snapshot-at="([^"]+)"/)?.[1];
  if (priorStamp && date(priorStamp) && Date.parse(priorStamp) > Date.parse(live.updated)) return src;
  const newest = [...seen].sort((a, b) => cmpVersion(b.id, a.id))[0];
  const common = [...seen].sort((a, b) => b.count - a.count)[0];
  const percent = (v) => number(v.percent) && v.percent <= 100 ? v.percent : Math.round(v.count / live.fleet * 1000) / 10;
  const snaps = (Array.isArray(history?.snapshots) ? history.snapshots : []).filter((s) => date(s.t) && s.v && Date.parse(s.t) <= Date.parse(live.updated)).sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
  const before = (days) => snaps.filter((s) => Date.parse(s.t) <= Date.parse(live.updated) - days * DAY).at(-1);
  const base = before(1), earlier = before(2);
  // A missing build/count is unknown, rather than a fabricated zero.
  const delta = (v) => number(base?.v?.[v.id]?.[0]) ? v.count - base.v[v.id][0] : null;
  const rate = (v) => {
    const change = delta(v);
    const previous = number(earlier?.v?.[v.id]?.[0]) && number(base?.v?.[v.id]?.[0]) ? base.v[v.id][0] - earlier.v[v.id][0] : null;
    return { change, status: change == null ? null : change <= 2 ? "slow" : previous != null && change > previous * 1.2 && change >= 6 ? "up" : "steady" };
  };
  const ranked = seen.map((v) => ({ v, r: rate(v) })).sort((a, b) => (b.r.change ?? -Infinity) - (a.r.change ?? -Infinity) || b.v.count - a.v.count);
  const fast = ranked.find(({ r }) => r.change != null);
  const elapsed = base ? (Date.parse(live.updated) - Date.parse(base.t)) / DAY : null;
  const period = elapsed && elapsed <= 1.1 ? "in the last 24 h" : base ? `since ${day(base.t)}` : "";
  const spark = (v) => {
    const points = snaps.map((s) => s.v[v.id]?.[0]).filter(number).concat(v.count);
    if (points.length < 2) return '<svg viewBox="0 0 300 40" aria-hidden="true"></svg>';
    const max = Math.max(...points, 1);
    const xy = points.map((p, i) => `${(i / (points.length - 1) * 300).toFixed(1)},${(37 - p / max * 34).toFixed(1)}`).join(" ");
    return `<svg viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true"><polyline points="${xy}" fill="none" stroke="#e31937" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  };
  const rows = ranked.filter(({ v }) => v.count >= 20).slice(0, 7);
  const list = (rows.length ? rows : ranked.slice(0, 7)).map(({ v, r }) => {
    const countries = [...new Set(Object.keys(v.countryCounts || {}).map(region))].join(", ") || "Regions not listed";
    return `<li class="sw-wave"><div><b>${esc(v.id)}</b><span class="sub">${esc(countries)}</span>${r.status ? `<span class="sw-pill ${r.status}">${{ up: "Speeding up", steady: "Steady", slow: "Settled" }[r.status]}</span>` : ""}</div>${spark(v)}<div class="rate">${r.change == null ? "No comparable earlier count" : `<b>${signed(r.change)}</b> cars ${esc(period)}`}<span class="sub">${num(v.count)} cars · ${percent(v)}% of sample</span></div></li>`;
  }).join("");
  src = id(src, "t-new", newest.id);
  src = id(src, "t-new-s", `${date(newest.firstSeen || newest.date) ? "first seen " + day(newest.firstSeen || newest.date) + " · " : ""}${percent(newest)}% of tracked cars`);
  src = id(src, "t-common", common.id);
  src = id(src, "t-common-s", `${percent(common)}% of ${num(live.fleet)} tracked cars`);
  src = id(src, "t-fast", fast?.v.id || "Not available");
  src = id(src, "t-fast-s", fast ? `${signed(fast.r.change)} cars ${period}` : "Not enough comparable saved history");
  const dates = [...new Set(live.versions.map((v) => v.date).filter(date))].sort();
  const gaps = dates.slice(1).map((d, i) => (Date.parse(d) - Date.parse(dates[i])) / DAY).sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  // A cadence is not a promised release date; anchor the estimate to the saved snapshot.
  if (gaps.length) {
    const from = Math.max(Date.parse(live.updated), Date.parse(dates.at(-1)) + gaps[Math.floor(gaps.length / 4)] * DAY);
    const to = Math.max(from, Date.parse(dates.at(-1)) + gaps[Math.floor(gaps.length * 3 / 4)] * DAY);
    src = id(src, "t-next", day(from) === day(to) ? day(from) : `${day(from)}–${day(to)}`);
    src = id(src, "t-next-s", `Estimate at ${day(live.updated)} · recent median gap ${median.toFixed(0)} days`);
  } else {
    src = id(src, "t-next", "No estimate");
    src = id(src, "t-next-s", "Not enough first-sighting dates; Tesla has no fixed release schedule");
  }
  src = mount(src, "software-status", /<p class="sw-live" id="sw-live">[\s\S]*?<\/p>/, `<p class="sw-live" id="sw-live" data-snapshot-at="${esc(live.updated)}">Saved snapshot · ${time(live.updated)} · ${num(live.fleet)} connected cars · ${link(live.sourceUrl, "Teslascope")}</p>`, live.updated);
  return mount(src, "software-waves", /<ol class="sw-waves" id="waves-list">[\s\S]*?<\/ol>/, `<ol class="sw-waves" id="waves-list" data-snapshot-at="${esc(live.updated)}">${list}</ol>`, live.updated);
}

export function renderCounts(tx, fleet) {
  const history = tx?.history;
  requireData(date(tx?.checked) && url(tx?.source?.url) && Array.isArray(history) && history.length && history.every((h) => date(h.date) && number(h.cybercab) && number(h.modelY)), "Invalid Texas count history");
  const last = [...history].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  requireData(date(fleet?.checked) && fleet.states && Object.keys(fleet.states).length && Object.values(fleet.states).every((s) => number(s.count) && date(s.asOf) && url(s.src) && ["estimate", "registered"].includes(s.kind)), "Invalid state fleet data");
  const states = Object.entries(fleet.states), total = states.reduce((n, [, s]) => n + s.count, 0);
  const delta = (days) => {
    const base = history.filter((h) => Date.parse(h.date) <= Date.parse(last.date) - days * DAY).at(-1);
    if (!base) return "";
    const n = last.cybercab - base.cybercab;
    return `<li class="${n > 0 ? "is-up" : "is-flat"}"><strong>${signed(n)}</strong> since ${esc(day(base.date))}</li>`;
  };
  const cybercab = `<article class="cc-count-card is-cybercab"><p class="cc-count-tag">Cybercab</p><h3>Cybercabs</h3><p class="cc-count-what">Purpose-built two-seater. No steering wheel, no pedals.</p><ul class="cc-count-facts"><li class="cc-count-total"><strong>${num(last.cybercab)}</strong>registered</li>${delta(7)}${delta(30)}</ul><ul class="cc-count-break"><li>Texas DMV registry: ${num(last.cybercab)} as of ${esc(day(last.date))} ${link(tx.source.url)}</li><li>Other states: no published count. A registration isn’t a car in service.</li></ul><p class="cc-count-meta"><span>Texas registry. No other state publishes a count yet.</span><span>Snapshot checked ${time(tx.checked)}</span></p></article>`;
  const lines = states.map(([name, s]) => `<li>${esc(name)}: ${s.kind === "estimate" ? "~" : ""}${num(s.count)} ${esc(s.kind === "estimate" ? "estimate" : "registered")}, ${esc(day(s.asOf))} ${link(s.src)}</li>`).join("");
  const modelY = `<article class="cc-count-card is-robotaxi"><p class="cc-count-tag">Robotaxi · Model Y</p><h3>Robotaxis (Model Y)</h3><p class="cc-count-what">Standard Model Y cars running Tesla’s ride-hail service.</p><ul class="cc-count-facts"><li class="cc-count-total"><strong>~${num(total)}</strong>across ${states.length} states (approx.)</li></ul><ul class="cc-count-break">${lines}</ul><p class="cc-count-meta"><span>Approximate: adds state registrations to third-party estimates from the dates shown. These are not cars confirmed in service.</span><span>Snapshot checked ${time(fleet.checked)}${url(fleet.aggregator?.url) ? " · via " + link(fleet.aggregator.url, fleet.aggregator.name) : ""}</span></p></article>`;
  return cybercab + modelY;
}

export function renderChanges(tx) {
  const history = [...tx.history].sort((a, b) => a.date.localeCompare(b.date));
  requireData(history.every((h) => url(h.src)), "Missing registration-history source");
  const jumps = history.slice(1).map((next, i) => ({ next, previous: history[i] })).filter(({ next, previous }) => next.cybercab !== previous.cybercab).reverse();
  const last = history.at(-1), changed = jumps[0]?.next;
  const rows = jumps.map(({ next, previous }) => ({ date: next.date, src: next.src, status: "Count jump", summary: `Texas Cybercab registrations moved from ${previous.cybercab} to ${next.cybercab}. A registered car isn’t necessarily in service yet.` }));
  if (changed && last.date !== changed.date && last.cybercab === changed.cybercab) rows.unshift({ date: last.date, src: last.src, status: "Unchanged", summary: `Still ${last.cybercab} registered on ${last.date}. No change since the last count. A registered car isn’t necessarily in service yet.` });
  if (!rows.length) return '<p class="intel-empty">No sourced Cybercab registration jumps in the stored Texas history.</p>';
  return `<div class="sourced-changes">${rows.map((r) => `<article class="sourced-change"><div class="sourced-change-head"><time datetime="${esc(r.date)}">${esc(day(r.date))}</time><span class="fsd-status ${r.status === "Count jump" ? "fsd-status-done" : "fsd-status-watch"}">${r.status}</span></div><p>${esc(r.summary)}</p><p class="sourced-change-src">Source: ${link(r.src, r.src === tx.source.url ? "Texas DMV list" : "Historical source")}. Not live fleet telemetry.</p></article>`).join("")}</div>`;
}

export function renderCities(geo, history, reality, fleet) {
  requireData(date(geo?.checked) && url(geo?.source?.url) && Array.isArray(geo.features) && geo.features.length && history?.cities && date(reality?.updated) && reality.areas && Array.isArray(reality.claims), "Invalid city snapshot");
  const rank = (c) => c.kind === "operational" && c.supervision === "unsupervised" ? 0 : c.kind === "expansion" && c.verification === "announced" ? 1 : c.kind === "sighting" ? 2 : c.kind === "operational" ? 3 : c.kind === "expansion" ? 4 : 5;
  const claims = reality.claims.filter((c) => c.kind === "operational" || c.kind === "expansion" || c.kind === "regulatory" || c.kind === "sighting").sort((a, b) => rank(a) - rank(b) || (b.date || "").localeCompare(a.date || ""));
  requireData(claims.every((c) => c.id && c.title && date(c.date) && url(c.src)), "Invalid sourced city claim");
  const verify = { verified: "Verified", announced: "Announced", sighted: "Sighted", regulatory: "Regulatory" }, supervision = { unsupervised: "Unsupervised", supervised: "Supervised", unknown: "Unknown" };
  const count = (filter) => new Set(claims.filter(filter).map((c) => c.slug).filter(Boolean)).size;
  const unsupervised = count((c) => c.kind === "operational" && c.supervision === "unsupervised"), supervised = count((c) => c.kind === "operational" && c.supervision === "supervised");
  const announced = claims.filter((c) => c.kind === "expansion" && c.verification === "announced").length, regulatory = claims.filter((c) => c.kind === "regulatory").length, sightings = claims.filter((c) => c.kind === "sighting").length;
  const glance = `<div class="rt-glance">${[[unsupervised, `Unsupervised public ${unsupervised === 1 ? "city" : "cities"}`], [supervised, `Supervised / testing area${supervised === 1 ? "" : "s"}`], [announced, `Announced expansion${announced === 1 ? "" : "s"}`], [regulatory, `Regulatory item${regulatory === 1 ? "" : "s"}`], [sightings, `Vehicle sighting${sightings === 1 ? "" : "s"}`]].map(([n, label]) => `<div class="rt-glance-item"><b>${n}</b><span>${label}</span></div>`).join("")}</div>`;
  const claimHtml = claims.map((c) => `<article class="rt-claim is-${esc(c.kind)}" id="claim-${esc(c.id)}"><header><h3>${esc(c.title)}</h3><p class="rt-claim-pills"><span class="rt-pill is-verify is-${esc(c.verification)}">${esc(verify[c.verification] || c.verification)}</span><span class="rt-pill is-super is-${esc(c.supervision)}">${esc(supervision[c.supervision] || c.supervision)}</span><span class="rt-pill is-kind is-${esc(c.kind)}">${esc(c.kind)}</span></p></header><p>${esc(c.text)}</p><p class="rt-claim-meta"><span>${esc(c.vehicle)}</span><time datetime="${esc(c.date)}">${esc(day(c.date))}</time> ${link(c.src, c.srcLabel || "Source")}</p></article>`).join("");
  const stateName = { TX: "Texas", CA: "California", FL: "Florida" };
  const rows = geo.features.map(({ properties: p }) => {
    requireData(p?.slug && p.name && number(p.areaSqMi), "Invalid city area");
    const h = history.cities[p.slug], meta = reality.areas[p.slug];
    requireData(h?.statusLabel && url(h.statusSrc) && meta?.verification && meta?.supervision, `Missing status for ${p.slug}`);
    const expanded = (h.log || []).filter((l) => l.kind === "expanded" && date(l.date) && number(l.areaSqMi) && number(l.from) && url(l.src)).at(-1);
    const expansion = expanded ? `${expanded.dateApprox ? "by " : ""}${esc(day(expanded.date))} <span class="rt-sub">${num(expanded.from)} → ${num(expanded.areaSqMi)} mi²</span> ${link(expanded.src)}` : "None recorded since launch";
    const state = stateName[p.name.split(", ")[1]], s = fleet?.states?.[state];
    const fleetText = s && number(s.count) && date(s.asOf) && url(s.src) ? `${p.slug === "bay_area" ? "~" + num(s.count) + " estimate" : "No city count"} <span class="rt-sub">(${esc(state)}: ${s.kind === "estimate" ? "~" : ""}${num(s.count)} ${esc(s.kind)}, ${esc(day(s.asOf))})</span> ${link(s.src)}` : "No sourced count";
    return `<tr class="is-${esc(h.status || "testing")}" data-rt-city="${esc(p.slug)}"><th scope="row">${esc(p.name)}</th><td><span class="rt-status">${esc(h.statusLabel)}</span> ${link(h.statusSrc)}</td><td><span class="rt-pill is-verify is-${esc(meta.verification)}">${esc(meta.verificationLabel || verify[meta.verification] || meta.verification)}</span></td><td><span class="rt-pill is-super is-${esc(meta.supervision)}">${esc(meta.supervisionLabel || supervision[meta.supervision] || meta.supervision)}</span></td><td>${num(Math.round(p.areaSqMi))} mi²</td><td>${expansion}</td><td>${fleetText}</td></tr>`;
  }).join("");
  return `${glance}<p class="rt-fine">Claims updated ${esc(day(reality.updated))}. Shapes checked ${time(geo.checked)}. A geofence in the app is not the same as public unsupervised rides.</p><div class="rt-board"><div class="rt-map" aria-label="Service area map"><p class="rt-map-hint">The sourced city table below is available while the map loads.</p></div><div class="rt-claims">${claimHtml}</div></div><div class="rt-table-wrap"><table class="rt-table"><thead><tr>${["City", "Status", "Verification", "Supervision", "Area", "Last expanded", "Model Y fleet"].map((s) => `<th scope="col">${s}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div><p class="rt-fine">Service areas from ${link(geo.source.url, "Robotaxi Service Areas project")} (MIT), traced from the Tesla Robotaxi app. Counts are registrations or estimates from the dates shown.</p>`;
}

// Keep the previous block when required input is missing or malformed. An initial
// build without saved values gets honest unavailable copy, never an assumed zero.
export function buildTrackerSnapshots(root = defaultRoot, { page = "all", warn = console.warn } = {}) {
  requireData(["all", "updates", "cybercab"].includes(page), "Use --page updates or --page cybercab");
  const edit = (file, run) => {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) return;
    const src = fs.readFileSync(filePath, "utf8"), result = run(src);
    if (result !== src) fs.writeFileSync(filePath, result);
  };
  if (page !== "cybercab") edit("updates.html", (src) => {
    try { return renderUpdates(src, readJson(root, "updates-live.json"), (() => { try { return readJson(root, "data/updates-history.json"); } catch { return {}; } })()); }
    catch (e) {
      warn(`Software HTML snapshot kept: ${e.message}`);
      if (src.includes("<!--snapshot:software-status-->")) return src;
      src = src.replace("Loading Teslascope snapshot…", "Software snapshot unavailable. Check the Teslascope source below.");
      for (const figure of ["t-new", "t-common", "t-fast", "t-next"]) src = id(src, figure, "Unavailable");
      return src;
    }
  });
  if (page !== "updates") edit("cybercab.html", (src) => {
    try {
      const tx = readJson(root, "data/robotaxi-tx.json"), fleet = readJson(root, "data/robotaxi-fleet.json");
      const counts = renderCounts(tx, fleet);
      src = mount(src, "cybercab-counts", /<div class="cc-count" data-cc-count>[\s\S]*?<\/div>/, `<div class="cc-count" data-cc-count data-snapshot-at="${esc(tx.checked)}" data-snapshot-fleet-at="${esc(fleet.checked)}">${counts}</div>`, tx.checked, { fleet: fleet.checked });
      const changes = renderChanges(tx);
      src = mount(src, "cybercab-changes", /<div data-cc-changes>[\s\S]*?<\/div>/, `<div data-cc-changes data-snapshot-at="${esc(tx.checked)}">${changes}</div>`, tx.checked);
    } catch (e) {
      warn(`Cybercab HTML counts kept: ${e.message}`);
      if (!src.includes("<!--snapshot:cybercab-counts-->")) src = src.replace("Loading the latest counts&hellip;", 'Counts unavailable. See the <a href="https://fsddb.com/robotaxi?operator=tesla-robotaxi-llc" rel="noopener">Texas Robotaxi Database</a>.');
      if (!src.includes("<!--snapshot:cybercab-changes-->")) src = src.replace("Loading sourced jumps&hellip;", "Registration history unavailable. Check the Texas Robotaxi Database source above.");
    }
    try {
      const geo = readJson(root, "data/robotaxi-areas.geojson"), history = readJson(root, "data/robotaxi-areas-history.json"), reality = readWindow(root, "robotaxi-reality-data.js", "ROBOTAXI_REALITY");
      let fleet; try { fleet = readJson(root, "data/robotaxi-fleet.json"); } catch { /* optional state counts */ }
      if (src.includes("<!--snapshot:cybercab-cities-->") && !date(fleet?.checked)) throw new Error("State counts unavailable; keep the saved city records");
      const cities = renderCities(geo, history, reality, fleet);
      src = mount(src, "cybercab-cities", /<div data-rt-cities>[\s\S]*?<\/div>/, `<div data-rt-cities data-snapshot-at="${esc(geo.checked)}" data-snapshot-claims-at="${esc(reality.updated)}"${date(fleet?.checked) ? ` data-snapshot-fleet-at="${esc(fleet.checked)}"` : ""}>${cities}</div>`, geo.checked, { claims: reality.updated, ...(date(fleet?.checked) ? { fleet: fleet.checked } : {}) });
    } catch (e) {
      warn(`Cybercab HTML city snapshot kept: ${e.message}`);
      if (!src.includes("<!--snapshot:cybercab-cities-->")) src = src.replace("Loading the Reality Map&hellip;", "City snapshot unavailable. Check the sourced tracker again later.");
    }
    return src;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const at = process.argv.indexOf("--page");
  buildTrackerSnapshots(defaultRoot, { page: at === -1 ? "all" : process.argv[at + 1] });
}
