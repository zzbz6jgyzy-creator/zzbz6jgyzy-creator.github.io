import fs from "fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const M = require("../calendar-merge.js");
const pick = require("./live-home-pick.js");

const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => {
  fail.push(name + ": " + msg);
  console.log("FAIL", name, msg);
};

const events = JSON.parse(fs.readFileSync("data/events.json", "utf8"));
const live = JSON.parse(fs.readFileSync("live-data.json", "utf8"));
const see = fs.readFileSync("see-the-launch-data.js", "utf8");
const cal = fs.readFileSync("calendar.js", "utf8");
const ship = fs.readFileSync("starship-data.js", "utf8");

const band = events.events["bandwagon-5"];
if (band && band.start === "2026-10-20T11:04:00Z") ok("events Bandwagon Tue");
else bad("events Bandwagon Tue", band && band.start);

const liveBand = (live.events || []).find((e) => e.id === "f9-bandwagon5");
if (liveBand && Date.parse(liveBand.start) === Date.parse("2026-10-20T11:04:00Z")) ok("live-data Bandwagon Tue");
else bad("live-data Bandwagon Tue", liveBand && liveBand.start);

if (/title: "Falcon 9 · Bandwagon-5"/.test(see) && /start: "2026-10-20T11:04:00Z"/.test(see)) ok("see-the-launch Bandwagon Tue");
else bad("see-the-launch Bandwagon Tue", "fallback still stale");

if (/id: "ll-bandwagon-5"/.test(cal) && /start: "2026-10-20T11:04:00Z"/.test(cal)) ok("calendar Bandwagon Tue");
else bad("calendar Bandwagon Tue", "CURATED date");

if (M.sameLaunch({ id: "bandwagon-5", title: band.title, start: band.start }, { id: "f9-bandwagon5", title: liveBand.title, start: liveBand.start }))
  ok("homepage/calendar same launch");
else bad("homepage/calendar same launch", "alias miss");

const stale = M.mergeEvents(
  [{ id: "ll-bandwagon-5", title: "Falcon 9 · Bandwagon-5", start: band.start, source: "curated" }],
  [{ id: "ll-old", title: "Falcon 9 Block 5 | Bandwagon 5", start: "2026-10-19T10:30:00Z", source: "ll2", status: "go" }]
);
if (stale.length === 1 && stale[0].start === "2026-10-20T11:04:00Z") ok("merge keeps editorial Tuesday");
else bad("merge keeps editorial Tuesday", JSON.stringify(stale[0]));

const patched = pick.withSharedDates(live.events, events.events);
const patchedBand = patched.find((e) => e.id === "f9-bandwagon5");
if (patchedBand && Date.parse(patchedBand.start) === Date.parse(band.start)) ok("shared start overlay");
else bad("shared start overlay", patchedBand && patchedBand.start);

if (/start: "2026-11-12T12:00:00Z"/.test(ship) && /precision: "day"/.test(ship)) ok("starship F15 day NET");
else bad("starship F15 day NET", "clock still drifted");

const f15see = /id: "starship-f15"[\s\S]{0,80}start: "2026-11-12T12:00:00Z"/.test(see);
const f15cal = /id: "starship-f15"[\s\S]{0,80}start: "2026-11-12T12:00:00Z"/.test(cal);
if (f15see && f15cal) ok("F15 clocks aligned");
else bad("F15 clocks aligned", `see=${f15see} cal=${f15cal}`);

if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
