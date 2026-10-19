#!/usr/bin/env node
// Supercharged Intelligence Engine runner.
// Reads existing JSON/JS snapshots, writes data/intelligence/*,
// and fills <!--hv:changed--> on the homepage when that marker exists.
// Does not call third-party APIs. Does not send notifications.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const intel = require("../intel-core.js");
const merge = require("../calendar-merge.js");

const R = path.join(__dirname, "..");
const OUT = path.join(R, "data", "intelligence");
const rd = (f) => fs.readFileSync(path.join(R, f), "utf8");
const j = (f) => JSON.parse(rd(f));

function loadJs(file, key) {
  const win = {};
  vm.createContext({ window: win });
  vm.runInContext(rd(file), vm.createContext({ window: win }));
  return win[key];
}

function loadStarlink() {
  try {
    return JSON.parse(rd("starlink-live.js").replace(/^[\s\S]*?window\.STARLINK_LIVE\s*=\s*/, "").replace(/;\s*$/, ""));
  } catch (e) {
    return null;
  }
}

function ensureDir() {
  fs.mkdirSync(OUT, { recursive: true });
}

function writeJson(name, obj) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function putChanged(html, inner) {
  const re = /<!--hv:changed-->[\s\S]*?<!--\/hv:changed-->/;
  if (!re.test(html)) return html;
  return html.replace(re, () => `<!--hv:changed-->${inner}<!--/hv:changed-->`);
}

function homepageInner(bundle) {
  return intel.homeSection(bundle);
}

function main() {
  ensureDir();
  const jobs = [];
  const job = (name, fn) => {
    const started = new Date().toISOString();
    try {
      const value = fn();
      jobs.push({ name, status: "ok", started, finished: new Date().toISOString() });
      return value;
    } catch (e) {
      jobs.push({ name, status: "failed", started, finished: new Date().toISOString(), error: e.message });
      return null;
    }
  };

  const src = {
    events: job("events", () => j("data/events.json")),
    live: job("live", () => j("live-data.json")),
    updates: job("updates", () => j("updates-live.json")),
    updatesHistory: job("updates-history", () => j("data/updates-history.json")),
    fsdEurope: job("fsd-europe", () => loadJs("fsd-europe-data.js", "FSD_EUROPE")),
    promises: job("promises", () => j("data/promises.json")),
    robotaxiTx: job("robotaxi-tx", () => j("data/robotaxi-tx.json")),
    starlinkLive: job("starlink", () => loadStarlink()),
    starlinkHistory: job("starlink-history", () => j("data/starlink-history.json")),
    starship: job("starship", () => loadJs("starship-data.js", "STARSHIP")),
    articles: job("articles", () => j("data/articles.json")),
    production: job("production", () => j("data/production.json")),
    optimusDemos: job("optimus-demos", () => j("data/optimus-demos.json")),
    merge,
    jobs,
  };

  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(path.join(OUT, "snapshot.json"), "utf8")); } catch (e) {}

  const bundle = intel.build(src, prev, new Date());
  const snapshot = { generatedAt: bundle.generatedAt, facts: bundle.facts };
  writeJson("snapshot.json", snapshot);
  writeJson("bundle.json", bundle);
  writeJson("changes.json", { updated: bundle.generatedAt, changes: bundle.changes });
  writeJson("freshness.json", { updated: bundle.generatedAt, trackers: bundle.freshness });
  writeJson("health.json", bundle.health);
  writeJson("conflicts.json", { updated: bundle.generatedAt, conflicts: bundle.conflicts });

  const indexPath = path.join(R, "index.html");
  const before = fs.readFileSync(indexPath, "utf8");
  const after = putChanged(before, homepageInner(bundle));
  if (after !== before) {
    fs.writeFileSync(indexPath, after);
    console.log("index.html what-changed updated");
  } else {
    console.log("index.html what-changed unchanged or marker missing");
  }

  console.log("intel facts", bundle.facts.length, "changes", bundle.changes.length, "conflicts", bundle.conflicts.length, "ok", bundle.health.ok);
  if (!bundle.health.ok) process.exitCode = 1;
}

main();
