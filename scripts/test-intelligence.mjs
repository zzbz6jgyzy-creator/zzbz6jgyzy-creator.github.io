import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const I = require("../intel-core.js");
const M = require("../calendar-merge.js");

const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => {
  fail.push(name + ": " + msg);
  console.log("FAIL", name, msg);
};

if (I.EVIDENCE.indexOf("officially_confirmed") >= 0 && I.EVIDENCE.indexOf("confidence") < 0) ok("evidence states");
else bad("evidence states", "numeric confidence leaked in");

const good = I.makeFact({
  topic: "starship",
  tracker: "starship",
  field: "next-flight",
  value: "15|2026-11-08|day",
  at: "2026-10-16T00:00:00Z",
  evidence: "estimated",
  source: "FAA planning slides",
});
if (!I.validateFact(good).length) ok("valid fact");
else bad("valid fact", I.validateFact(good).join(","));

const badFact = I.makeFact({ topic: "starship", field: "x", value: "1", evidence: "pretty_sure", source: "" });
if (I.validateFact(badFact).length >= 2) ok("rejects invented evidence");
else bad("rejects invented evidence", I.validateFact(badFact));

const prev = [I.makeFact({ topic: "robotaxi", tracker: "robotaxi", field: "tx-cybercab", value: "319", at: "2026-10-08", evidence: "independently_corroborated", source: "TxDMV" })];
const next = [I.makeFact({ topic: "robotaxi", tracker: "robotaxi", field: "tx-cybercab", value: "349", at: "2026-10-15", evidence: "independently_corroborated", source: "TxDMV" })];
const diffs = I.detectChanges(prev, next);
if (diffs.length === 1 && diffs[0].previous === "319" && diffs[0].next === "349") ok("change keeps previous and next");
else bad("change keeps previous and next", JSON.stringify(diffs[0]));

const none = I.detectChanges(next, next);
if (none.length === 0) ok("no false change");
else bad("no false change", none.length);

const src = {
  events: {
    updated: "2026-10-18T08:50:00+01:00",
    events: {
      "bandwagon-5": { title: "Falcon 9 · Bandwagon-5", start: "2026-10-20T10:30:00Z", status: "go", source: "https://www.spacex.com/launches/bandwagon5" },
      "starship-flight-15": { title: "Starship Flight 15", date: "2026-11-08", precision: "day", status: "net", sources: ["FAA CADENA"] },
    },
  },
  live: {
    events: [
      { id: "f9-bandwagon5", title: "Falcon 9 · Bandwagon-5 rideshare", start: "2026-10-19T10:30:00Z", status: "scheduled" },
    ],
  },
  updates: {
    updated: "2026-10-19T10:52:28Z",
    sourceUrl: "https://teslascope.com/software",
    fleet: 10,
    versions: [{ id: "2026.38.5.1", count: 4, percent: 40, firstSeen: "2026-10-13T00:00:00Z" }],
  },
  updatesHistory: { snapshots: [
    { t: "2026-10-12T00:00:00Z", v: { "2026.33.5": [10, { US: 8, CA: 2 }] } },
    { t: "2026-10-13T00:00:00Z", v: { "2026.33.5": [10, { US: 8, CA: 2 }], "2026.38.5.1": [4, { US: 4 }] } },
    { t: "2026-10-14T00:00:00Z", v: { "2026.33.5": [10, { US: 8, CA: 2 }], "2026.38.5.1": [50, { US: 40, CA: 10 }] } },
  ] },
  starlinkHistory: { source: "https://planet4589.org/space/con/star/stats.html", snapshots: [
    { updated: "2026-10-13T09:30:20Z", inOrbit: 11156, working: 11142, operational: 9726, launched: 13015 },
    { updated: "2026-10-15T19:00:26Z", inOrbit: 11154, working: 11140, operational: 9726, launched: 13015 },
  ] },
  fsdEurope: {
    updated: "2026-10-18",
    countries: [{ code: "NL", status: "approved" }, { code: "DE", status: "review" }],
    changelog: [{
      date: "2026-10-16",
      code: "SK",
      type: "approval",
      text: "Slovakia recognises RDW.",
      source: "https://example.test/sk",
      honesty: "Recognition is not a customer rollout. Owners have not been shown receiving the software.",
    }, {
      date: "2026-10-16",
      code: "SK",
      type: "statement",
      text: "Tesla Europe: rollout begins soon.",
      source: "https://example.test/tesla-europe",
      evidence: "company_claim",
      honesty: "Company claim. Soon is not a date.",
    }],
  },
  promises: { updated: "2026-10-16", promises: [{ id: "optimus-x", topic: "Optimus", title: "Test", status: "Missed", source: { outlet: "CNBC", url: "https://www.cnbc.com/" }, revisions: [] }] },
  optimusDemos: { updated: "2026-10-19", demos: [{ id: "ai-day-2022", shown: ["walk"] }] },
  starship: { updated: "2026-10-16", next: { flight: 15, start: "2026-11-08T12:00:00Z", precision: "day" }, schedule: [{ date: "2026-10-09", mission: 15, confirmed: false, change: "Ship 42 cryo campaign", source: { outlet: "NASASpaceflight", url: "https://www.nasaspaceflight.com/" } }] },
  robotaxiTx: { history: [
    { date: "2026-09-26", cybercab: 126, src: "https://teslant.com/" },
    { date: "2026-10-03", cybercab: 169, src: "https://teslant.com/" },
    { date: "2026-10-08", cybercab: 319, src: "https://notateslakiller.com/" },
    { date: "2026-10-15", cybercab: 349, src: "https://fsddb.com/" },
    { date: "2026-10-19", cybercab: 349, src: "https://fsddb.com/" },
  ] },
  starlinkLive: { updated: "2026-10-15T19:00:26Z", totals: { inOrbit: 11154 }, source: "https://planet4589.org/space/con/star/stats.html" },
  articles: { articles: [
    { url: "/dispatch/spacex-cant-rent-compute.html", title: "SpaceX rents out its compute, but can’t rent any itself", summary: "Musk says AWS had no inference capacity.", date: "2026-10-19T09:23:56Z", topic: "xai", tag: "SpaceX AI" },
    { url: "/dispatch/musk-spacex-share-every-kid.html", title: "Musk pledges a SpaceX share to every kid in America", summary: "One share each.", date: "2026-10-18T12:00:00Z", topic: "spacex", tag: "SpaceX" },
  ] },
  production: { updated: "2026-10-19", quarters: [{ id: "Q3 2026", deliveries: 486532, production: 464391, published: "2026-10-02", sourceUrl: "https://ir.tesla.com/" }] },
  merge: M,
  jobs: [],
};

const bundle = I.build(src, { facts: prev }, "2026-10-19T12:00:00Z");
if (bundle.facts.some((f) => f.field === "newest-reporting" && f.value === "2026.38.5.1")) ok("software fact");
else bad("software fact", "missing newest");
if (bundle.facts.some((f) => f.field === "sourced-demos" && f.value === "1" && /shown/.test(f.summary))) ok("optimus sourced demos fact");
else bad("optimus sourced demos fact", "missing");
if (bundle.changes.some((c) => c.topic === "starship" && c.source === "NASASpaceflight" && /Flight 15 change/.test(c.title))) ok("starship schedule keeps outlet");
else bad("starship schedule keeps outlet", JSON.stringify(bundle.changes.filter((c) => c.topic === "starship").slice(0, 2)));
if (bundle.conflicts.length === 1 && bundle.conflicts[0].kept.indexOf("2026-10-20") >= 0) ok("conflict keeps Tuesday");
else bad("conflict keeps Tuesday", JSON.stringify(bundle.conflicts[0]));
if (bundle.changes.some((c) => c.previous === "319" && c.next === "349")) ok("robotaxi history change");
else bad("robotaxi history change", "missing");
if (bundle.freshness.every((r) => "lastChecked" in r && "lastVerified" in r)) ok("freshness pair");
else bad("freshness pair", "missing stamps");

const tz = I.iso("2026-10-20T10:30:00Z");
if (tz === "2026-10-20T10:30:00.000Z") ok("utc storage");
else bad("utc storage", tz);

const a = { id: "bandwagon-5", title: "Falcon 9 · Bandwagon-5", start: "2026-10-20T10:30:00Z" };
const b = { id: "ll-bandwagon-5", title: "Falcon 9 Block 5 | Bandwagon 5", start: "2026-10-20T10:30:00Z" };
if (M.sameLaunch(a, b) && M.uniqueByLaunch([a, b]).length === 1) ok("launch dedupe");
else bad("launch dedupe", "aliases missed");

const stale = M.mergeEvents(
  [{ id: "bandwagon-5", title: a.title, start: a.start, source: "curated" }],
  [{ id: "ll-old", title: b.title, start: "2026-10-19T10:30:00Z", source: "ll2", status: "go" }]
);
if (stale.length === 1 && stale[0].start === a.start) ok("reschedule keeps later date");
else bad("reschedule keeps later date", JSON.stringify(stale[0]));

if (I.filterChanges(bundle.changes, { topics: ["robotaxi"] }).every((c) => c.topic === "robotaxi")) ok("topic filter");
else bad("topic filter", "mixed topics");

if (!/pretty_sure|confidence score/i.test(I.changesHtml(bundle.changes))) ok("html no fake score");
else bad("html no fake score", "score leaked");

const waves = I.softwareWaves(src.updatesHistory);
if (waves.some((w) => w.version === "2026.38.5.1" && /wide rollout|not a rollout/.test(w.summary) && /your car getting it|not an offer/.test(w.summary))) ok("software wave first seen");
else bad("software wave first seen", JSON.stringify(waves[0]));
if (waves.some((w) => w.previous === "4" && w.next === "50")) ok("software wave count jump");
else bad("software wave count jump", JSON.stringify(waves));
if (bundle.changes.some((c) => c.field === "wave:2026.38.5.1" && /Teslascope/.test(c.source))) ok("software wave in bundle");
else bad("software wave in bundle", "missing wave change");

const sk = I.autonomyLayer("eu", { approved: true, recognised: true, rolloutLive: false });
if (sk.layer === "permit_not_rollout") ok("slovakia recognised not live");
else bad("slovakia recognised not live", sk.layer);
const austin = I.autonomyLayer("robotaxi", { commercial: true });
if (austin.layer === "commercial_service") ok("austin commercial layer");
else bad("austin commercial layer", austin.layer);
const dallas = I.autonomyLayer("robotaxi", { namedNext: true });
if (dallas.layer === "company_claim") ok("dallas named next is claim");
else bad("dallas named next is claim", dallas.layer);
const fsd = I.autonomyLayer("fsd-supervised");
if (/not unsupervised/.test(fsd.note)) ok("supervised is not unsupervised");
else bad("supervised is not unsupervised", fsd.note);

const store = {
  mem: {},
  getItem(k) { return this.mem[k] || null; },
  setItem(k, v) { this.mem[k] = String(v); },
};
I.alertWrite(store, { ids: [], items: [], enabled: false });
const off = I.alertEnqueue(store, bundle.changes, ["robotaxi"]);
if (off.sent === 0 && off.queued === 0) ok("alerts off queues nothing");
else bad("alerts off queues nothing", JSON.stringify(off));
I.alertWrite(store, { ids: [], items: [], enabled: true });
const on = I.alertEnqueue(store, bundle.changes, ["robotaxi"]);
const again = I.alertEnqueue(store, bundle.changes, ["robotaxi"]);
if (on.sent === 0 && on.queued >= 1 && again.queued === 0) ok("alert enqueue dedupes and never sends");
else bad("alert enqueue dedupes and never sends", JSON.stringify({ on, again }));
const preview = I.digestPreview(bundle.changes, ["robotaxi"], "2026-10-19T12:00:00Z");
if (preview.sent === false && /not sent/.test(preview.subject) && /No email/.test(preview.disclaimer)) ok("digest preview not sent");
else bad("digest preview not sent", JSON.stringify(preview));
if (!/sent="true"/.test(I.digestHtml(preview))) ok("digest html marks unsent");
else bad("digest html marks unsent", I.digestHtml(preview).slice(0, 120));

const countryWaves = I.softwareWavesForCountry(src.updatesHistory, "US");
if (countryWaves.some((w) => w.version === "2026.38.5.1" && w.type === "appeared" && /your car getting it|particular VIN/.test(w.summary))) ok("country wave first seen");
else bad("country wave first seen", JSON.stringify(countryWaves[0]));
if (countryWaves.some((w) => w.previous === "4" && w.next === "40" && /not Tesla confirming your car will get it|not Tesla confirming this car is eligible/.test(w.summary))) ok("country wave jump");
else bad("country wave jump", JSON.stringify(countryWaves));
if (!/you are eligible|this VIN is eligible|your car is eligible/i.test(I.countryWavesHtml(countryWaves, "US"))) ok("country waves never claim VIN eligible");
else bad("country waves never claim VIN eligible", "eligibility leaked");

const cab = I.cybercabJumps(src.robotaxiTx.history);
if (cab.jumps.map((j) => j.previous + "->" + j.next).join(",") === "126->169,169->319,319->349") ok("cybercab sourced jumps");
else bad("cybercab sourced jumps", JSON.stringify(cab.jumps));
if (cab.unchanged && cab.unchanged.date === "2026-10-19" && cab.unchanged.count === 349 && /No change since the last count|Unchanged days/.test(cab.unchanged.summary) && /isn.t necessarily in service|not a car in service/.test(cab.unchanged.summary)) ok("cybercab unchanged streak");
else bad("cybercab unchanged streak", JSON.stringify(cab.unchanged));
const cabHtml = I.cybercabChangesHtml(src.robotaxiTx.history);
if (/Count jump/.test(cabHtml) && /Unchanged/.test(cabHtml) && /not a car in service|isn.t necessarily in service/.test(cabHtml) && /Not live fleet telemetry/.test(cabHtml)) ok("cybercab html honesty");
else bad("cybercab html honesty", cabHtml.slice(0, 240));

const sl = I.starlinkDiffs(src.starlinkHistory);
if (sl.length === 1 && sl[0].previous === "11156" && sl[0].next === "11154" && /not a live operator feed/.test(sl[0].summary)) ok("starlink mcdowell diff");
else bad("starlink mcdowell diff", JSON.stringify(sl));
if (bundle.changes.some((c) => c.topic === "starlink" && c.previous === "11156" && /not a live operator feed/.test(c.summary))) ok("starlink diff in bundle");
else bad("starlink diff in bundle", "missing");
const slHtml = I.starlinkChangesHtml(src.starlinkHistory);
if (/not interpolated/i.test(slHtml) && /not a live operator feed/.test(slHtml) && /11,154/.test(slHtml)) ok("starlink html snapshot");
else bad("starlink html snapshot", slHtml.slice(0, 240));

const clocks = I.conflictsHtml(bundle.conflicts);
const clockRaw = JSON.stringify(bundle.conflicts);
if (/Confirmed time|Kept \(events.json\)/.test(clocks) && /Live feed|Live overlay/.test(clocks) && /keep the confirmed time|Kept the confirmed time|keep_canonical_events_json|keep_completed/.test(clocks + clockRaw) && /keep_completed|keep_canonical_events_json/.test(clockRaw)) ok("conflicts html kept clocks");
else bad("conflicts html kept clocks", clocks.slice(0, 280));
const home = I.homeSection(bundle);
if (/data-intel-clocks/.test(home) && /Kept launch clocks/.test(home) && /data-intel-changed/.test(home) && /keep_canonical_events_json|Bandwagon|events\.json/.test(home)) ok("home section kept clocks");
else bad("home section kept clocks", home.slice(0, 400));
if (I.fmtClock("2026-10-15T14:27:00.000Z").indexOf("UTC") >= 0) ok("fmtClock utc");
else bad("fmtClock utc", I.fmtClock("2026-10-15T14:27:00.000Z"));

if (bundle.changes.some((c) => c.field === "approval" && /Recognition is not a customer rollout/.test(c.summary))) ok("fsd approval honesty in bundle");
else bad("fsd approval honesty in bundle", "missing");
if (bundle.changes.some((c) => c.evidence === "company_claim" && /Soon is not a date/.test(c.summary))) ok("fsd tesla europe company claim");
else bad("fsd tesla europe company claim", "missing");

const dispatchRows = bundle.changes.filter((c) => c.field === "dispatch");
if (dispatchRows.length === 2 && dispatchRows.every((c) => c.tracker === "dispatch" && c.href.indexOf("/dispatch/") === 0)) ok("dispatch tracker not promises");
else bad("dispatch tracker not promises", JSON.stringify(dispatchRows.map((c) => c.tracker)));
const dispHtml = I.changesHtml(dispatchRows);
if (/Dispatch/.test(dispHtml) && !/Promise Tracker/.test(dispHtml)) ok("dispatch html label");
else bad("dispatch html label", dispHtml.slice(0, 220));
if (dispatchRows.some((c) => /compute/.test(c.title) && c.topic === "spacex-launches")) ok("dispatch spacex topic");
else bad("dispatch spacex topic", JSON.stringify(dispatchRows[0]));

const freshTable = I.freshnessTableHtml(bundle.freshness);
if (/Last checked/.test(freshTable) && /Last verified/.test(freshTable) && /not live telemetry/.test(freshTable) && /Starship Mission Control/.test(freshTable)) ok("freshness table");
else bad("freshness table", freshTable.slice(0, 240));

if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
