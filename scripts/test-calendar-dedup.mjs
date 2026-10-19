import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const M = require("../calendar-merge.js");

const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => {
  fail.push(`${name}: ${msg}`);
  console.log("FAIL", name, msg);
};

const key = (a, b) => {
  try {
    assert.equal(M.launchKey(a), M.launchKey(b));
    ok(`key ${a} ≡ ${b}`);
  } catch (err) {
    bad(`key ${a} ≡ ${b}`, err.message);
  }
};

key("Falcon 9 · Bandwagon-5", "Falcon 9 · Bandwagon-5 rideshare");
key("Falcon 9 Block 5 | Bandwagon-5", "Falcon 9 · Bandwagon 5");
key("Falcon 9 · Bandwagon-5 (Varda / Starfall)", "Falcon 9 · Bandwagon-5");

try {
  assert.notEqual(M.launchKey("Falcon 9 · Starlink Group 15-25"), M.launchKey("Falcon 9 · Starlink Group 15-26"));
  ok("starlink keys differ");
} catch (err) {
  bad("starlink keys differ", err.message);
}

const curatedBand = {
  id: "ll-bandwagon-5",
  title: "Falcon 9 · Bandwagon-5",
  start: "2026-10-19T10:30:00Z",
  where: "Cape Canaveral · SLC-40",
  status: "go",
  source: "curated",
};
const liveBand = {
  id: "ll-999",
  ll2Id: "999",
  title: "Falcon 9 · Bandwagon-5 rideshare",
  start: "2026-10-19T10:30:00Z",
  where: "Cape Canaveral · SLC-40",
  status: "go",
  source: "ll2",
};

try {
  assert.equal(M.sameLaunch(curatedBand, liveBand), true);
  const merged = M.mergeEvents([curatedBand], [liveBand]);
  const hits = merged.filter((e) => /bandwagon/i.test(e.title));
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, "ll-bandwagon-5");
  ok("bandwagon once");
} catch (err) {
  bad("bandwagon once", err.message);
}

try {
  const a = { id: "a", title: "Falcon 9 · Starlink Group 15-25", start: "2026-10-20T22:14:00Z", where: "Vandenberg · SLC-4E" };
  const b = { id: "b", title: "Falcon 9 · Starlink Group 15-26", start: "2026-10-24T05:29:00Z", where: "Vandenberg · SLC-4E" };
  assert.equal(M.sameLaunch(a, b), false);
  const merged = M.mergeEvents([a], [b]);
  assert.equal(merged.filter((e) => /starlink/i.test(e.title)).length, 2);
  ok("starlink 15-25 ≠ 15-26");
} catch (err) {
  bad("starlink 15-25 ≠ 15-26", err.message);
}

try {
  const launch = {
    id: "ll-crs-35",
    title: "Falcon 9 · Dragon CRS-2 SpX-35",
    start: "2026-10-13T10:33:44Z",
    where: "Cape Canaveral · SLC-40",
    source: "curated",
  };
  const dock = {
    id: "crs35-docking",
    title: "Dragon · CRS-35 docked with the ISS",
    start: "2026-10-15T14:27:00Z",
    where: "ISS · Harmony zenith",
    source: "curated",
  };
  assert.equal(M.sameLaunch(launch, dock), false);
  const merged = M.mergeEvents([launch, dock], []);
  assert.equal(merged.length, 2);
  ok("crs launch ≠ docking");
} catch (err) {
  bad("crs launch ≠ docking", err.message);
}

try {
  const slipped = { ...liveBand, start: "2026-10-20T10:30:00Z", status: "hold" };
  const merged = M.mergeEvents([curatedBand], [slipped]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].start, "2026-10-20T10:30:00Z");
  assert.equal(merged[0].status, "hold");
  ok("reschedule + hold");
} catch (err) {
  bad("reschedule + hold", err.message);
}

try {
  const noIdLive = { title: "Bandwagon-5 rideshare", start: "2026-10-19T10:31:00Z", where: "Cape Canaveral · SLC-40", source: "ll2" };
  const noIdCur = { id: "ll-bandwagon-5", title: "Falcon 9 · Bandwagon-5", start: "2026-10-19T10:30:00Z", where: "Cape Canaveral", source: "curated" };
  assert.equal(M.sameLaunch(noIdCur, noIdLive), true);
  ok("missing ll2 id fallback");
} catch (err) {
  bad("missing ll2 id fallback", err.message);
}

try {
  const f15 = { id: "starship-f15", title: "Starship Flight 15", start: "2026-11-08T12:00:00Z", source: "curated" };
  const f16 = { id: "ll-16", title: "Starship Flight 16", start: "2026-12-01T12:00:00Z", source: "ll2" };
  assert.equal(M.sameLaunch(f15, f16), false);
  ok("starship 15 ≠ 16");
} catch (err) {
  bad("starship 15 ≠ 16", err.message);
}

try {
  const a = { id: "1", title: "Falcon 9 · USSF-481", start: "2026-10-15T23:57:00Z" };
  const b = { id: "2", title: "Falcon 9 · USSF-48", start: "2026-10-15T23:57:00Z", where: a.where };
  assert.equal(M.sameLaunch(a, b), false);
  ok("ussf numbers stay distinct");
} catch (err) {
  bad("ussf numbers stay distinct", err.message);
}

try {
  const rows = M.uniqueByLaunch([curatedBand, liveBand, { ...liveBand, id: "other" }]);
  assert.equal(rows.length, 1);
  ok("uniqueByLaunch");
} catch (err) {
  bad("uniqueByLaunch", err.message);
}

if (fail.length) {
  console.log("FAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("ALL_PASS");
