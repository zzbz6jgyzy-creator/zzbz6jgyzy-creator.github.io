#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), require = createRequire(import.meta.url), M = require("../calendar-studio-model.js"), V = require("../calendar-studio-view.js");
export function buildCalendarStudio(root = ROOT) {
  const read = (f) => fs.readFileSync(path.join(root, f), "utf8"), legacy = read("calendar.js"), ctx = {};
  vm.runInNewContext(legacy.slice(legacy.indexOf("const CURATED"), legacy.indexOf("const MONTHS")) + ";globalThis.seed={curated:CURATED,watching:WATCHING}", ctx);
  const data = M.normalize(ctx.seed, JSON.parse(read("data/events.json")), JSON.parse(read("data/launches.json")), JSON.parse(read("live-data.json"))), file = path.join(root, "calendar.html");
  let html = read("calendar.html");
  if (!html.includes("<!--cs:studio-->")) throw Error("Missing calendar studio marker");
  html = html.replace(/<!--cs:studio-->[\s\S]*?<!--\/cs:studio-->/, "<!--cs:studio-->\n" + V.render(data) + "\n<!--/cs:studio-->").replace(/<script type="application\/json" id="cs-data">[\s\S]*?<\/script>/, '<script type="application/json" id="cs-data">' + JSON.stringify(data).replace(/</g, "\\u003c") + "<\/script>");
  fs.writeFileSync(file, html);
  fs.writeFileSync(path.join(root, "data/calendar-studio.json"), JSON.stringify(data, null, 1) + "\n");
  fs.writeFileSync(path.join(root, "data/calendar.ics"), M.calendar(data.events, data.launchChecked));
  return data;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const d = buildCalendarStudio();
  console.log("Calendar studio: " + d.events.length + " records, source checked " + d.launchChecked);
}
