import pkg from "/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pkg;
const BASE = process.env.BASE || "http://127.0.0.1:4173";
const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => { fail.push(name + ": " + msg); console.log("FAIL", name, msg); };

const src = await (await fetch(BASE + "/track.js?v=202610190630")).text();
if (["search_open", "search_go", "theme_toggle", "dispatch_filter", "tesmag_click"].every((n) => src.includes('"' + n + '"'))) ok("track allowlist");
else bad("track allowlist", "missing names");
if (!/location\.search|searchParams|input\.value/.test(src)) ok("no query in tracker");
else bad("no query in tracker", "track.js looks like it sends a query");

const { readFileSync } = await import("fs");
const wsrc = readFileSync("workers/sd-events/sd-events.js", "utf8");
if (wsrc.includes("search_open") && wsrc.includes("theme_toggle")) ok("worker allowlist");
else bad("worker allowlist", "worker source missing new events");

const home = await (await fetch(BASE + "/")).text();
if (home.includes("falcon9-480w.avif") && home.includes('width="1200"')) ok("home live picture");
else bad("home live picture", "homepage still raw falcon9.jpg");

const calHtml = await (await fetch(BASE + "/calendar.html")).text();
if (/page-hero[\s\S]*?<h1>Calendar<\/h1>/.test(calHtml) && !/page-hero[\s\S]*reveal delay-2/.test(calHtml)) ok("calendar hero no reveal");
else bad("calendar hero no reveal", "reveal still on hero");
if (calHtml.includes("cal-skel")) ok("calendar skeletons");
else bad("calendar skeletons", "missing");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const beacons = [];
await page.addInitScript(() => {
  navigator.sendBeacon = (url) => { window.__sdBeacons = window.__sdBeacons || []; window.__sdBeacons.push(String(url)); return true; };
});

await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".pn-theme, .pn-search");
await page.click(".pn-theme");
await page.waitForTimeout(80);
await page.click(".pn-search");
await page.waitForSelector(".sd-find-root:not([hidden])", { timeout: 4000 });
await page.waitForTimeout(80);
const homeBeacons = await page.evaluate(() => window.__sdBeacons || []);
if (homeBeacons.some((u) => /[?&]n=theme_toggle/.test(u))) ok("theme_toggle beacon");
else bad("theme_toggle beacon", JSON.stringify(homeBeacons));
if (homeBeacons.some((u) => /[?&]n=search_open/.test(u))) ok("search_open beacon");
else bad("search_open beacon", JSON.stringify(homeBeacons));
if (homeBeacons.some((u) => /[?&]q=/.test(u))) bad("beacon has query", JSON.stringify(homeBeacons));
else ok("beacon path only");

await page.goto(BASE + "/dispatch.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.querySelectorAll("[data-disp-topic]").length > 1);
await page.evaluate(() => { window.__sdBeacons = []; });
await page.click('[data-disp-topic="tesla"]');
await page.waitForTimeout(80);
const disp = await page.evaluate(() => window.__sdBeacons || []);
if (disp.some((u) => /[?&]n=dispatch_filter/.test(u))) ok("dispatch_filter beacon");
else bad("dispatch_filter beacon", JSON.stringify(disp));

await page.goto(BASE + "/calendar.html", { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-calendar-countdown] .cal-next-card");
const cards = await page.$$eval("[data-calendar-countdown] .cal-next-card", (els) => els.map((el) => el.className));
if (cards.length && cards.every((c) => !c.includes("cal-skel") || cards.some((x) => !x.includes("cal-skel")))) ok("calendar cards");
else bad("calendar cards", JSON.stringify(cards));
const filled = cards.filter((c) => !c.includes("cal-skel"));
if (filled.length) ok("calendar replaced skel");
else bad("calendar replaced skel", JSON.stringify(cards));

const follow = await page.$eval('a[href="https://x.com/ALJR86"]', (el) => el.getAttribute("href"));
if (follow === "https://x.com/ALJR86") ok("follow on X");
else bad("follow on X", String(follow));

await browser.close();
if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
