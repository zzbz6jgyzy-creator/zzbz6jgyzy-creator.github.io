#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), require = createRequire(import.meta.url), M = require("../launch-viewing-model.js"), V = require("../launch-viewing-view.js");
export function buildLaunchViewing(root = ROOT) {
  const read = (p) => fs.readFileSync(path.join(root, p), "utf8"), ctx = { window: {} };
  vm.runInNewContext(read("see-the-launch-data.js"), ctx);
  const data = M.normalize(JSON.parse(read("data/calendar-studio.json")), ctx.window.SEE_LAUNCH), world = JSON.parse(read("data/viewing/world.json")), file = path.join(root, "see-the-launch.html");
  let html = read("see-the-launch.html");
  if (!html.includes("<!--lv:studio-->")) throw Error("Missing launch viewing marker");
  const inline = (d) => JSON.stringify(d).replace(/</g, "\\u003c");
  html = html.replace(/<!--lv:studio-->[\s\S]*?<!--\/lv:studio-->/, "<!--lv:studio-->\n" + V.render(data, world) + "\n<!--/lv:studio-->").replace(/<script type="application\/json" id="lv-data">[\s\S]*?<\/script>/, '<script type="application/json" id="lv-data">' + inline(data) + "<\/script>").replace(/<script type="application\/json" id="lv-world">[\s\S]*?<\/script>/, '<script type="application/json" id="lv-world">' + inline(world) + "<\/script>");
  fs.writeFileSync(file, html);
  fs.writeFileSync(path.join(root, "data/launch-viewing.json"), JSON.stringify(data, null, 1) + "\n");
  return data;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const d = buildLaunchViewing();
  console.log("Launch viewing observatory: " + d.launches.length + " dated launch records, checked " + d.checked);
}
