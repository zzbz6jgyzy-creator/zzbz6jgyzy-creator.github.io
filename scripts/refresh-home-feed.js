#!/usr/bin/env node
/* Update only <!--hv:feed--> in index.html. Does not touch tesla.html / spacex.html. */
const fs = require("fs");
const path = require("path");
const keep = require("../news-keep.js");
const pairer = require("../home-pair.js");
const R = path.join(__dirname, "..");
const rd = (f) => fs.readFileSync(path.join(R, f), "utf8");
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const day = (d) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d);

const news = JSON.parse(rd("news-data.json"));
let arts = [];
try { arts = JSON.parse(rd("data/articles.json")).articles || []; } catch (e) {}
let held = {};
try { held = JSON.parse(rd("data/news-hold.json")); } catch (e) {}
const seen = new Set();
const raw = (news.items || []).filter((it) => {
  const k = (it.title || "").toLowerCase();
  if (!k || seen.has(k) || !/^https:\/\//.test(it.url || "")) return false;
  seen.add(k);
  return true;
});
const used = new Set();
const feed = keep.forHomepage(raw, held).slice(0, 8).map((it) =>
  pairer.itemHtml(it, pairer.pairItem(it, arts, used), esc, `${it.source || ""} · ${it.published ? day(new Date(it.published)) : ""}`.replace(/^ · /, ""))
).join("");

let html = rd("index.html");
const re = /<!--hv:feed-->[\s\S]*?<!--\/hv:feed-->/;
if (!re.test(html)) {
  console.error("feed marker missing");
  process.exit(1);
}
const next = html.replace(re, () => `<!--hv:feed-->${feed}<!--/hv:feed-->`);
if (next === html) console.log("index.html feed unchanged");
else {
  fs.writeFileSync(path.join(R, "index.html"), next);
  console.log("index.html feed updated");
}
