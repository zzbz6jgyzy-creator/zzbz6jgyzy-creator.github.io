import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { buildTrackerSnapshots, renderUpdates, renderCounts, renderChanges, renderCities } from "../scripts/build-tracker-snapshots.mjs";

const repo = fileURLToPath(new URL("../", import.meta.url));
const stamp = "2026-10-22T12:00:00Z";
const updates = `<head><script src="/members.js"></script></head><main><p class="sw-live" id="sw-live">Loading Teslascope snapshot…</p><section>${["new", "fast", "common", "next"].map((x) => `<b id="t-${x}">—</b><small id="t-${x}-s"></small>`).join("")}</section><ol class="sw-waves" id="waves-list"></ol></main>`;
const cybercab = '<head><meta name="description" content="unchanged"></head><main><div class="cc-count" data-cc-count><p>Loading the latest counts&hellip;</p></div><div data-cc-changes><p>Loading sourced jumps&hellip;</p></div><div data-rt-cities><p>Loading the Reality Map&hellip;</p></div></main>';
const live = { updated: stamp, fleet: 100, sourceUrl: "https://teslascope.com/software", versions: [
  { id: "2026.38.9", count: 70, percent: 70, date: "2026-10-20", countryCounts: { US: 70 } },
  { id: "2026.38.10", count: 30, percent: 30, date: "2026-10-22", countryCounts: { GB: 30 } },
  { id: "2026.39", count: 0, date: "2026-10-22", countryCounts: {} },
] };
const history = { snapshots: [
  { t: "2026-10-20T12:00:00Z", v: { "2026.38.9": [60, {}], "2026.38.10": [5, {}] } },
  { t: "2026-10-21T12:00:00Z", v: { "2026.38.9": [65, {}], "2026.38.10": [10, {}] } },
] };
const source = "https://example.com/source?a=1&b=2";
const tx = { checked: stamp, source: { url: source }, history: [
  { date: "2026-10-14", cybercab: 10, modelY: 20, src: source },
  { date: "2026-10-21", cybercab: 15, modelY: 25, src: source },
  { date: "2026-10-22", cybercab: 15, modelY: 25, src: source },
] };
const fleet = { checked: stamp, states: {
  Texas: { count: 25, kind: "registered", asOf: "2026-10-22", src: source },
  California: { count: 7, kind: "estimate", asOf: "2026-08-26", src: source },
} };
const geo = { checked: stamp, source: { url: source }, features: [{ properties: { slug: "austin", name: "Austin, TX", areaSqMi: 264.1 } }] };
const areas = { cities: { austin: { status: "active", statusLabel: "Public rides", statusSrc: source, log: [] } } };
const reality = { updated: "2026-10-22", areas: { austin: { verification: "verified", supervision: "unsupervised" } }, claims: [
  { id: "austin-live", slug: "austin", kind: "operational", verification: "verified", supervision: "unsupervised", title: 'Austin <img src=x onerror="alert(1)">', text: 'A & B <script>alert(1)</script>', vehicle: 'Model "Y"', date: "2026-10-21", src: source, srcLabel: "Source & evidence" },
] };

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sd-tracker-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const put = (file, value) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), typeof value === "string" ? value : JSON.stringify(value)); };
  put("updates.html", updates); put("cybercab.html", cybercab);
  put("updates-live.json", live); put("data/updates-history.json", history);
  put("data/robotaxi-tx.json", tx); put("data/robotaxi-fleet.json", fleet);
  put("data/robotaxi-areas.geojson", geo); put("data/robotaxi-areas-history.json", areas);
  put("robotaxi-reality-data.js", "window.ROBOTAXI_REALITY=" + JSON.stringify(reality));
  const get = (file) => fs.readFileSync(path.join(root, file), "utf8");
  return { root, put, get, build: (page = "all") => buildTrackerSnapshots(root, { page, warn() {} }) };
}

test("software figures select numeric versions, observed counts and dated source data", () => {
  const html = renderUpdates(updates, live, history);
  assert.match(html, /id="t-new">2026\.38\.10</);
  assert.match(html, /id="t-common">2026\.38\.9</);
  assert.match(html, /id="t-fast">2026\.38\.10</);
  assert.match(html, /\+20 cars in the last 24 h/);
  assert.match(html, /Saved snapshot · <time datetime="2026-10-22T12:00:00Z"/);
  assert.match(html, /href="https:\/\/teslascope.com\/software"/);
  assert.match(html, /70% of 100 tracked cars/);
  assert.equal((html.match(/class="sw-wave"/g) || []).length, 2);
  assert.equal((html.match(/id="waves-list"/g) || []).length, 1);
  assert.ok(!html.includes("NaN") && !html.includes("Infinity"));
  assert.match(html, /<script src="\/members.js"><\/script>/);
});

test("missing comparison history and small samples never manufacture zero growth", () => {
  const data = { ...live, versions: [{ ...live.versions[1], count: 2, percent: 2 }] };
  const html = renderUpdates(updates, data, { snapshots: [{ t: "2026-10-21T12:00:00Z", v: {} }] });
  assert.match(html, /id="t-fast">Not available</);
  assert.match(html, /No comparable earlier count/);
  assert.match(html, /2 cars · 2% of sample/);
  assert.equal((html.match(/class="sw-wave"/g) || []).length, 1);
  assert.doesNotMatch(html, /(?:\+0|±0) cars/);
});

test("the workspace uses source dates instead of a prominent next-build forecast", () => {
 const src=fs.readFileSync(path.join(repo,"updates.html"),"utf8");
 assert.match(src,/Latest first sighting/);
 assert.doesNotMatch(src,/Next new build likely|id="t-next"/);
 assert.match(src,/<!--snapshot:software-workspace-->/);
});

test("counts retain registered/estimated distinctions and old source dates", () => {
  const html = renderCounts(tx, fleet);
  assert.match(html, /<strong>15<\/strong>registered/);
  assert.match(html, /<strong>~32<\/strong>across 2 states \(approx\.\)/);
  assert.match(html, /California: ~7 estimate, 26 Aug 2026/);
  assert.match(html, /Texas: 25 registered, 22 Oct 2026/);
  assert.match(html, /These are not cars confirmed in service/);
  assert.match(html, /href="https:\/\/example.com\/source\?a=1&amp;b=2"/);
  assert.throws(() => renderCounts(tx, { ...fleet, states: { Texas: { ...fleet.states.Texas, count: null } } }), /Invalid state/);
  assert.throws(() => renderCounts({ ...tx, history: [] }, fleet), /Invalid Texas/);
  const zero = renderCounts({ ...tx, history: [{ ...tx.history[0], cybercab: 0 }] }, fleet);
  assert.match(zero, /<strong>0<\/strong>registered/); // Explicit observed zero remains valid.
});

test("sourced registration changes include unchanged days without inventing jumps", () => {
  const html = renderChanges(tx);
  assert.match(html, />Unchanged</);
  assert.match(html, /Still 15 registered on 2026-10-22/);
  assert.match(html, /moved from 10 to 15/);
  assert.equal((html.match(/>Count jump</g) || []).length, 1);
});

test("city records escape text and attributes, keep supervision and seven table columns", () => {
  const html = renderCities(geo, areas, reality, fleet);
  assert.match(html, /Austin &lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /A &amp; B &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /Source &amp; evidence/);
  assert.doesNotMatch(html, /<img|<script>/);
  assert.match(html, /Unsupervised/);
  assert.match(html, /Public rides/);
  assert.equal((html.match(/<th scope="col">/g) || []).length, 7);
  assert.match(html, /264 mi²/);
  assert.match(html, /Texas: 25 registered/);
  assert.throws(() => renderCities(geo, areas, { ...reality, claims: [{ ...reality.claims[0], src: "javascript:alert(1)" }] }, fleet), /Invalid sourced/);
});

test("build is idempotent and page-specific; missing and older snapshots keep last good HTML", (t) => {
  const f = fixture(t);
  f.build("updates");
  assert.equal(f.get("cybercab.html"), cybercab);
  f.build("cybercab");
  const goodUpdates = f.get("updates.html"), goodCybercab = f.get("cybercab.html");
  f.build();
  assert.equal(f.get("updates.html"), goodUpdates);
  assert.equal(f.get("cybercab.html"), goodCybercab);
  assert.match(goodCybercab, /name="description" content="unchanged"/);
  f.put("updates-live.json", { ...live, updated: "2026-10-20T12:00:00Z", fleet: 999 });
  f.put("data/robotaxi-fleet.json", { ...fleet, checked: "2026-10-20T12:00:00Z", states: { ...fleet.states, Texas: { ...fleet.states.Texas, count: 999 } } });
  f.build();
  assert.equal(f.get("updates.html"), goodUpdates);
  assert.equal(f.get("cybercab.html"), goodCybercab);
  f.put("updates-live.json", "{broken");
  fs.unlinkSync(path.join(f.root, "data/robotaxi-tx.json"));
  f.build();
  assert.equal(f.get("updates.html"), goodUpdates);
  assert.match(f.get("cybercab.html"), /<strong>15<\/strong>registered/);
  assert.match(f.get("cybercab.html"), /moved from 10 to 15/);
});

test("a first build with missing input gives honest unavailable copy", (t) => {
  const f = fixture(t);
  fs.unlinkSync(path.join(f.root, "updates-live.json"));
  fs.unlinkSync(path.join(f.root, "data/robotaxi-tx.json"));
  f.build();
  assert.match(f.get("updates.html"), /Software snapshot unavailable/);
  assert.match(f.get("updates.html"), /id="t-new">Unavailable</);
  assert.match(f.get("cybercab.html"), /Counts unavailable/);
  assert.match(f.get("cybercab.html"), /Registration history unavailable/);
  assert.doesNotMatch(f.get("cybercab.html"), /Loading sourced jumps/);
  assert.doesNotMatch(f.get("cybercab.html"), /<strong>0<\/strong>registered/);
});

class Mount {
  constructor() { this.innerHTML = '<time datetime="2026-10-22T12:00:00Z">22 Oct 2026</time><a href="https://example.com/source">Saved sourced record</a>'; this.attrs = { "data-snapshot-at": stamp }; }
  hasAttribute(k) { return k in this.attrs; }
  getAttribute(k) { return this.attrs[k] ?? null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  querySelector(s) { return s === "[data-refresh-status]" && this.innerHTML.includes("data-refresh-status") ? {} : null; }
  insertAdjacentHTML(_, s) { this.innerHTML += s; }
}
async function browserFailure(file, { response, saved = true } = {}) {
  const mount = new Mount();
  if (!saved) mount.attrs = {};
  const selectors = { "cybercab-count.js": "[data-cc-count]", "cybercab-cities.js": "[data-rt-cities]", "intel.js": "[data-cc-changes]" };
  const ctx = { window: { SDIntel: {}, ROBOTAXI_REALITY: reality }, document: { querySelector: (s) => s === selectors[file] ? mount : null, getElementById: (s) => s === "sw-live" ? mount : null }, Intl, console: { error() {} }, fetch: response ? async (u) => ({ ok: true, json: async () => response(u) }) : async () => { throw new Error("offline"); } };
  vm.runInNewContext(fs.readFileSync(path.join(repo, file), "utf8"), ctx, { timeout: 1000 });
  await new Promise((resolve) => setImmediate(resolve));
  return mount;
}

test("browser refresh failures preserve dated sourced HTML on all four affected paths", async () => {
  for (const file of ["cybercab-count.js", "cybercab-cities.js", "updates-v3.js", "intel.js"]) {
    const mount = await browserFailure(file);
    assert.match(mount.innerHTML, /Saved sourced record/, file);
    assert.match(mount.innerHTML, /datetime="2026-10-22T12:00:00Z"/, file);
    assert.match(mount.innerHTML, /Refresh unavailable/, file);
    assert.equal((mount.innerHTML.match(/data-refresh-status/g) || []).length, 1, file);
  }
});

test("malformed and older successful HTTP responses cannot erase saved figures", async () => {
  const malformed = await browserFailure("cybercab-count.js", { response: () => ({ history: [], states: {} }) });
  assert.match(malformed.innerHTML, /Saved sourced record/);
  const older = await browserFailure("updates-v3.js", { response: (u) => u === "/updates-live.json" ? { ...live, updated: "2026-10-20T12:00:00Z" } : u.includes("history") ? history : {} });
  assert.match(older.innerHTML, /Saved sourced record/);
  assert.match(older.innerHTML, /Refresh unavailable/);
  const incompleteCity = await browserFailure("cybercab-cities.js", { response: (u) => u.includes("fleet") ? { states: fleet.states } : u.includes("history") ? areas : geo });
  assert.match(incompleteCity.innerHTML, /Saved sourced record/);
  assert.match(incompleteCity.innerHTML, /Refresh unavailable/);
  assert.doesNotMatch(incompleteCity.innerHTML, /data-snapshot-fleet-at="undefined"/);
});
