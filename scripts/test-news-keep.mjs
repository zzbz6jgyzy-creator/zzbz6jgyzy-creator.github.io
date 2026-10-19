import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const keep = require("../news-keep.js");

const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => {
  fail.push(`${name}: ${msg}`);
  console.log("FAIL", name, msg);
};

const NOW = Date.parse("2026-10-19T12:00:00Z");
const row = (over) => ({
  title: "x",
  source: "Example Desk",
  published: "2026-10-19T08:00:00Z",
  url: "https://example.com/a",
  topic: "tesla",
  ...over,
});

const fixtures = [
  row({ title: "SpaceX confirms Falcon 9 Bandwagon-5 is go", source: "SpaceX", topic: "spacex" }),
  row({ title: "Tesla FSD Supervised expands in Europe", source: "Teslarati", topic: "tesla" }),
  row({ title: "Appeals Court Blocks Class Actions Over Tesla’s Self-Driving Claims", source: "Claims Journal" }),
  row({ title: "Tesla (TSLA) Casts Optimus And Cybercab As Its Next Growth Drivers", source: "Simply Wall Street" }),
  row({ title: "TSLA: Tesla Reports Earnings with Shares Down 21% on Year (and a Failed Roadster Pump)", source: "TradingView" }),
  row({ title: "Tesla Model Y L Launch Series Waits Stretch to Early 2027", source: "BASENOR - Tesla Accessories" }),
  row({ title: "Elon Musk Says The Tesla Roadster Will Be 'Sentient' And Can Do Autonomous Stunts On A Texas Loop", source: "Motor1.com" }),
  row({ title: "EchoStar: SpaceX Deal Could Unlock Value Despite Operating Weakness", source: "Seeking Alpha" }),
  row({ title: "A small publisher finds Starlink outages in rural Texas", source: "Hill Country Ledger", topic: "spacex" }),
  row({
    title: "SpaceX’s Gwynne Shotwell just made a quiet gesture toward Tesla",
    source: "Teslarati",
    published: "2025-01-01T00:00:00Z",
  }),
];

try {
  if (keep.classify(fixtures[0]) === "launch") ok("classify launch");
  else bad("classify launch", keep.classify(fixtures[0]));
  if (keep.classify(fixtures[1]) === "software") ok("classify software");
  else bad("classify software", keep.classify(fixtures[1]));
  if (keep.classify(fixtures[2]) === "regulatory") ok("classify regulatory");
  else bad("classify regulatory", keep.classify(fixtures[2]));
  if (keep.classify(fixtures[3]) === "finance") ok("classify finance");
  else bad("classify finance", keep.classify(fixtures[3]));
  if (keep.classify(fixtures[5]) === "accessory" || keep.classify(fixtures[5]) === "general") ok("classify accessory-or-wait");
  else bad("classify accessory-or-wait", keep.classify(fixtures[5]));
} catch (err) {
  bad("classify", err.message);
}

const ranked = keep.forHomepage(fixtures, {}, NOW);
const titles = ranked.map((r) => r.title);
const top = titles.slice(0, 3).join(" | ");

if (/Bandwagon-5|FSD Supervised|Class Actions/i.test(top)) ok("serious news on top");
else bad("serious news on top", top);

if (titles.indexOf(fixtures[0].title) < titles.indexOf(fixtures[3].title)) ok("launch above finance");
else bad("launch above finance", titles.slice(0, 5).join(" | "));

if (keep.rankScore(fixtures[0], NOW) > keep.rankScore(fixtures[4], NOW)) ok("launch beats tradingview");
else bad("launch beats tradingview", `${keep.rankScore(fixtures[0], NOW)} vs ${keep.rankScore(fixtures[4], NOW)}`);

if (keep.rankScore(fixtures[8], NOW) > keep.rankScore(fixtures[5], NOW)) ok("small publisher kept above accessory");
else bad("small publisher kept above accessory", `${keep.rankScore(fixtures[8], NOW)} vs ${keep.rankScore(fixtures[5], NOW)}`);

if (keep.rankScore(fixtures[9], NOW) < keep.rankScore(fixtures[1], NOW)) ok("old teslarati not breaking");
else bad("old teslarati not breaking", `${keep.rankScore(fixtures[9], NOW)} vs ${keep.rankScore(fixtures[1], NOW)}`);

if (!keep.keepItem(row({ title: "If you invested $5,000 in Tesla" }))) ok("drop invested-if");
else bad("drop invested-if", "kept finance bait");

const prepared = keep.prepare([
  row({ title: "SpaceX Falcon 9 Bandwagon-5 rideshare lifts off" }),
  row({ title: "SpaceX Falcon 9 Bandwagon-5 rideshare lifts off from Florida", source: "Other" }),
]);
if (prepared.length === 1 && (prepared[0].related || []).length === 1) ok("duplicate stem collapsed");
else bad("duplicate stem collapsed", JSON.stringify(prepared.map((p) => p.title)));

if (keep.RANK && keep.RANK.note && keep.RANK.kindScore.launch === 8) ok("transparent RANK");
else bad("transparent RANK", "missing export");

if (fail.length) {
  console.log("FAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("ALL_PASS");
