import fs from "fs";
import pkg from "/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pkg;

const BASE = process.env.BASE || "http://127.0.0.1:4173";
const SHOT = process.env.SHOT || "/opt/cursor/artifacts";
fs.mkdirSync(SHOT, { recursive: true });

const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => {
  fail.push(name + ": " + msg);
  console.log("FAIL", name, msg);
};

const searchSrc = fs.readFileSync("search.js", "utf8");
if (["/promise-tracker.html", "/see-the-launch.html", "/fsd.html", "/tcmv.html"].every((u) => searchSrc.includes('"' + u + '"'))) ok("overlay pages include leftover desks");
else bad("overlay pages include leftover desks", "missing urls");

const pages = JSON.parse(fs.readFileSync("data/pages.json", "utf8"));
const urls = (pages.pages || []).map((p) => p.url);
if (["/optimus.html#demos", "/updates.html#sample-waves"].every((u) => urls.includes(u))) ok("deep links indexed");
else bad("deep links indexed", urls.filter((u) => /optimus|sample-waves/.test(u)).join(","));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.locator("[data-intel-changed] .intel-item").first().waitFor({ timeout: 8000 });
const homeK = await page.$$eval("[data-intel-changed] .intel-item a", (as) =>
  as.filter((a) => /\/dispatch\//.test(a.getAttribute("href") || "")).map((a) => (a.querySelector(".intel-k") || {}).textContent)
);
if (homeK.length && homeK.every((k) => k === "Dispatch")) ok("homepage dispatch desk");
else bad("homepage dispatch desk", JSON.stringify(homeK.slice(0, 6)));
await page.locator("[data-intel-changed]").screenshot({ path: SHOT + "/hubs-home-dispatch.png" });

await page.goto(BASE + "/spacex.html", { waitUntil: "domcontentloaded" });
await page.locator(".intel-desk [data-intel='starship'] .intel-fresh").waitFor({ timeout: 8000 });
const desk = await page.locator(".intel-desk").innerText();
if (/Last checked/.test(desk) && /Starship|compiled|telemetry/i.test(desk) && /Starlink|McDowell|CelesTrak/i.test(desk)) ok("spacex intel desk");
else bad("spacex intel desk", desk.slice(0, 280));
await page.locator(".intel-desk").screenshot({ path: SHOT + "/hubs-spacex-desk.png" });

await page.goto(BASE + "/promise-tracker.html", { waitUntil: "domcontentloaded" });
const method = await page.locator(".pt-method").innerText();
if (/demonstration archive/.test(method) && /not a shipped robot/.test(method) && /optimus\.html#demos/.test(await page.locator('.pt-method a[href="/optimus.html#demos"]').getAttribute("href"))) ok("promise archive cross-link");
else bad("promise archive cross-link", method.slice(0, 240));

await page.goto(BASE + "/intel-health.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => /Teslascope sample/.test(document.querySelector("[data-intel-health]")?.innerText || ""), null, { timeout: 8000 });
const health = await page.evaluate(() => document.querySelector("[data-intel-health]")?.innerText || "");
if (/Teslascope sample/.test(health) && /Compiled stamps only/.test(health) && /Starship Mission Control/.test(health)) ok("intel-health freshness table");
else bad("intel-health freshness table", health.length + " " + health.slice(0, 200));
await page.locator("[data-intel-health]").screenshot({ path: SHOT + "/hubs-intel-health.png" });

await page.goto(BASE + "/spacex.html", { waitUntil: "domcontentloaded" });
await page.locator("a.pn-search").first().click();
await page.waitForSelector(".sd-find-root:not([hidden]) .sd-find-hit", { timeout: 8000 });
const emptyHrefs = await page.$$eval(".sd-find-hit", (as) => as.map((a) => a.getAttribute("href")));
if (["/promise-tracker.html", "/see-the-launch.html", "/fsd.html"].every((h) => emptyHrefs.includes(h))) ok("overlay empty leftover desks");
else bad("overlay empty leftover desks", JSON.stringify(emptyHrefs.slice(0, 24)));
await page.fill("#sd-find-q", "Promise tracker");
await page.waitForFunction(() => {
  const hrefs = [...document.querySelectorAll(".sd-find-hit")].map((a) => a.getAttribute("href") || "");
  return hrefs[0] && /promise-tracker\.html/.test(hrefs[0]);
}, null, { timeout: 8000 });
ok("overlay promise ranks tracker");
await page.screenshot({ path: SHOT + "/hubs-search-overlay.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/spacex.html", { waitUntil: "domcontentloaded" });
await page.locator(".intel-desk [data-intel='launches'] .intel-fresh").waitFor({ timeout: 8000 });
await page.locator(".intel-desk").screenshot({ path: SHOT + "/hubs-spacex-desk-mobile.png" });
ok("spacex desk mobile");

await browser.close();
if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
