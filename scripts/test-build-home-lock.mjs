import fs from "fs";
import { createRequire } from "module";
import pkg from "/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pkg;
const require = createRequire(import.meta.url);
const { keepOnHome, pickNextEvent } = require("./live-home-pick.js");

const BASE = process.env.BASE || "http://127.0.0.1:4173";
const SHOT = process.env.SHOT || "/opt/cursor/artifacts";
const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => {
  fail.push(name + ": " + msg);
  console.log("FAIL", name, msg);
};

const build = fs.readFileSync("scripts/build-home.js", "utf8");
const live = fs.readFileSync("live.js", "utf8");
const home = fs.readFileSync("index.html", "utf8");
const tesla = fs.readFileSync("tesla.html", "utf8");
const spacex = fs.readFileSync("spacex.html", "utf8");
const search = fs.readFileSync("search.html", "utf8");
const sitemap = fs.readFileSync("sitemap.xml", "utf8");
const events = JSON.parse(fs.readFileSync("live-data.json", "utf8")).events;
const shared = JSON.parse(fs.readFileSync("data/events.json", "utf8")).events;

if (build.includes('data-band-topic="website"')) ok("build-home band topic");
else bad("build-home band topic", "band template missing data-band-topic=website");
if (!build.includes('page === "home" && featOn')) ok("old featOn filter gone");
else bad("old featOn filter gone", "home still hides all starship when a major event exists");
if (build.includes("would drop <picture>") && build.includes("event markers span <main>")) ok("picture/main guard");
else bad("picture/main guard", "tesla/spacex rewrite guard missing");

const liveFilter =
  live.includes("if (e.page !== 'starship') return true;") &&
  live.includes("return !e.net && !e.timeTbc && e.status !== 'ended';") &&
  live.includes("scripts/live-home-pick.js");
if (liveFilter) ok("live.js home filter");
else bad("live.js home filter", "home filter drifted from live-home-pick.js");

const now = Date.parse("2026-10-19T08:10:00Z");
const picked = pickNextEvent(events, { page: "home", shared, now });
if (picked && /bandwagon/i.test(picked.title)) ok("pick Bandwagon over earnings");
else bad("pick Bandwagon over earnings", JSON.stringify(picked && picked.title));
if (keepOnHome({ page: "starship", net: true, status: "scheduled" }) === false) ok("drop NET Starship");
else bad("drop NET Starship", "NET Starship still kept on home");
if (keepOnHome({ page: "spacex", net: false, status: "scheduled" }) === true) ok("keep non-starship");
else bad("keep non-starship", "spacex page events dropped");

const netOnly = [
  { id: "starship-flight-15", title: "Starship Flight 15", page: "starship", start: "2026-11-08T00:00:00-06:00", end: "2026-11-08T23:59:00-06:00", net: true, status: "scheduled" },
  { id: "spacex-q3-2026-earnings", title: "SpaceX Q3 2026 earnings call", page: "spacex", start: "2026-10-20T15:30:00-05:00", end: "2026-10-20T16:30:00-05:00", status: "scheduled" },
];
const fallback = pickNextEvent(netOnly, { page: "home", shared, now });
if (fallback && /earnings/i.test(fallback.title)) ok("earnings when Falcon is NET");
else bad("earnings when Falcon is NET", JSON.stringify(fallback && fallback.title));

const eventBlock = (home.match(/<!--hv:event-->[\s\S]*?<!--\/hv:event-->/) || [""])[0];
if (/Bandwagon/i.test(eventBlock) && !/SpaceX Q3 2026 earnings/i.test(eventBlock)) ok("prebuilt Bandwagon");
else bad("prebuilt Bandwagon", eventBlock.slice(0, 220));
if (/data-band-topic="website"/.test(home)) ok("index band topic");
else bad("index band topic", "homepage band missing data-band-topic=website");

const teslaPics = (tesla.match(/<picture\b/gi) || []).length;
const spacexPics = (spacex.match(/<picture\b/gi) || []).length;
if (teslaPics >= 10) ok("tesla pictures kept");
else bad("tesla pictures kept", String(teslaPics));
if (spacexPics >= 7) ok("spacex pictures kept");
else bad("spacex pictures kept", String(spacexPics));
if (!/class="story-grid"[\s\S]*?style="width:100%;height:auto"/.test(tesla + spacex)) ok("desks no height:auto");
else bad("desks no height:auto", "story-grid height:auto returned");

if (/name="robots"[^>]*noindex/.test(search.slice(0, 2500))) ok("search noindex");
else bad("search noindex", "search.html still indexable");
if (!/search\.html/.test(sitemap) && !/counts\.html/.test(sitemap)) ok("sitemap skips search/counts");
else bad("sitemap skips search/counts", "utility pages still listed");
if (/https:\/\/x\.com\/ALJR86/.test(home) && /ts\.la\/alex474841/.test(fs.readFileSync("grow.js", "utf8"))) ok("follow + referral");
else bad("follow + referral", "handle or referral changed");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
const band = await page.$eval("[data-band-topic]", (el) => el.getAttribute("data-band-topic")).catch(() => "");
if (band === "website") ok("rendered band topic");
else bad("rendered band topic", band);
const title = await page.$eval(".hv-event .lw-title, .hv-event .lws-t", (el) => el.textContent.trim()).catch(() => "");
if (/bandwagon/i.test(title)) ok("rendered next event");
else bad("rendered next event", title);
await page.locator(".hv-event").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/build-home-lock-event.png" });
await page.locator("#newsletter").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/build-home-lock-band.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.locator(".hv-event").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/build-home-lock-event-mobile.png" });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
if (!overflow) ok("home no overflow 390");
else bad("home no overflow 390", "horizontal scroll");

await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(BASE + "/search.html", { waitUntil: "domcontentloaded" });
const robots = await page.locator('meta[name="robots"]').getAttribute("content");
if (/noindex/i.test(robots || "")) ok("search robots meta");
else bad("search robots meta", String(robots));
await page.screenshot({ path: SHOT + "/build-home-lock-search.png" });

await page.goto(BASE + "/tesla.html", { waitUntil: "domcontentloaded" });
const teslaH = await page.$$eval(".story-grid .story-card > picture img", (els) =>
  els.map((el) => Math.round(el.getBoundingClientRect().height))
);
if (teslaH.length && teslaH.every((h) => h === 160)) ok("tesla posters 160");
else bad("tesla posters 160", JSON.stringify(teslaH.slice(0, 8)));

await browser.close();
if (fail.length) {
  console.error("FAIL", fail.length, fail.join(" | "));
  process.exit(1);
}
console.log("ALL_PASS");
