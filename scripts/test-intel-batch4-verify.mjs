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

const prod = JSON.parse(fs.readFileSync("data/production.json", "utf8"));
const ids = (prod.quarters || []).map((q) => q.id);
if (ids[0] === "Q1 2025" && ids.includes("Q2 2025") && ids.includes("Q3 2026")) ok("production json year-ago rows");
else bad("production json year-ago rows", ids.join(","));
const q1 = prod.quarters.find((q) => q.id === "Q1 2025");
const q2 = prod.quarters.find((q) => q.id === "Q2 2025");
if (q1 && q1.deliveries === 336681 && q1.production === 362615 && /and-deployments/.test(q1.sourceUrl)) ok("q1 2025 opened ir");
else bad("q1 2025 opened ir", JSON.stringify(q1));
if (q2 && q2.deliveries === 384122 && q2.production === 410244 && /deliveries-deployments/.test(q2.sourceUrl) && !/and-deployments/.test(q2.sourceUrl)) ok("q2 2025 opened ir");
else bad("q2 2025 opened ir", JSON.stringify(q2));

const pages = JSON.parse(fs.readFileSync("data/pages.json", "utf8"));
const urls = (pages.pages || []).map((p) => p.url);
if (["/optimus.html#ai-day-2021", "/optimus.html#ai-day-2022", "/optimus.html#roadster-reveal-2026", "/optimus.html#paris-motor-show-2026"].every((u) => urls.includes(u))) ok("demo archive indexed");
else bad("demo archive indexed", urls.filter((u) => /optimus/.test(u)).join(","));

const searchSrc = fs.readFileSync("search.js", "utf8");
if (/\/optimus\.html/.test(searchSrc) && /\/production\.html/.test(searchSrc) && /\/autonomy\.html/.test(searchSrc) && /\/daily\.html/.test(searchSrc) && /\/calendar\.html/.test(searchSrc)) ok("overlay pages include new trackers");
else bad("overlay pages include new trackers", "missing urls");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(BASE + "/production.html", { waitUntil: "networkidle" });
await page.locator("[data-intel-production] table").waitFor({ timeout: 8000 });
const prodText = await page.locator("[data-intel-production]").innerText();
if (/Q1 2026 vs Q1 2025/.test(prodText) && /\+6\.3%/.test(prodText) && /Q2 2026 vs Q2 2025/.test(prodText) && /\+25\.0%/.test(prodText) && /Q3 2026 vs Q3 2025/.test(prodText)) ok("production yoy three pairs");
else bad("production yoy three pairs", prodText.slice(0, 500));
if (/Q4 2025/.test(prodText) && !/Q4 2025 vs/.test(prodText)) ok("q4 2025 no invented yoy");
else bad("q4 2025 no invented yoy", "unexpected year-ago");
await page.screenshot({ path: SHOT + "/batch4-production-yoy.png" });

await page.goto(BASE + "/calendar.html", { waitUntil: "networkidle" });
await page.locator("[data-intel-clocks] table").waitFor({ timeout: 8000 });
await page.locator("[data-calendar-recent] .cal-title").first().waitFor({ timeout: 10000 });
await page.click("[data-cal-filter='spacex']");
await page.fill("[data-calendar-search]", "USSF-481");
await page.waitForFunction(() => {
  const titles = [...document.querySelectorAll("[data-calendar-list] .cal-title")].map((e) => e.textContent);
  return titles.some((t) => /USSF-481/i.test(t));
}, null, { timeout: 8000 });
ok("calendar search ussf");
await page.locator("[data-intel-clocks]").evaluate((el) => el.scrollIntoView({ block: "start" }));
await page.screenshot({ path: SHOT + "/batch4-calendar-clocks.png" });
await page.locator("[data-calendar-list]").evaluate((el) => el.scrollIntoView({ block: "start" }));
await page.screenshot({ path: SHOT + "/batch4-calendar-ussf.png" });

await page.goto(BASE + "/optimus.html", { waitUntil: "networkidle" });
await page.locator("a.pn-search").first().click();
await page.waitForSelector(".sd-find-root:not([hidden]) .sd-find-hit", { timeout: 8000 });
const emptyHrefs = await page.$$eval(".sd-find-hit", (as) => as.map((a) => a.getAttribute("href")));
if (["/optimus.html", "/production.html", "/autonomy.html", "/daily.html", "/calendar.html"].every((h) => emptyHrefs.includes(h))) ok("overlay empty lists new trackers");
else bad("overlay empty lists new trackers", JSON.stringify(emptyHrefs.slice(0, 20)));
await page.fill("#sd-find-q", "Optimus");
await page.waitForFunction(() => {
  const status = document.querySelector("[data-sd-status]")?.textContent || "";
  const hrefs = [...document.querySelectorAll(".sd-find-hit")].map((a) => a.getAttribute("href") || "");
  return /match/i.test(status) && hrefs[0] && /\/optimus\.html/.test(hrefs[0]);
}, null, { timeout: 8000 });
const optHrefs = await page.$$eval(".sd-find-hit", (as) => as.map((a) => a.getAttribute("href")));
if (optHrefs[0] && /\/optimus\.html/.test(optHrefs[0])) ok("overlay optimus ranks lab");
else bad("overlay optimus ranks lab", JSON.stringify(optHrefs.slice(0, 4)));
await page.screenshot({ path: SHOT + "/batch4-search-overlay.png" });
await page.keyboard.press("Escape");

await page.goto(BASE + "/tesla.html#trackers", { waitUntil: "networkidle" });
await page.locator(".intel-desk [data-intel='production'] .intel-fresh").waitFor({ timeout: 8000 });
await page.locator(".intel-desk").evaluate((el) => el.scrollIntoView({ block: "start" }));
await page.screenshot({ path: SHOT + "/batch4-tesla-desk.png" });
ok("tesla desk shot");

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/calendar.html", { waitUntil: "networkidle" });
await page.locator("[data-calendar-search]").waitFor({ timeout: 8000 });
await page.fill("[data-calendar-search]", "CRS-35");
await page.waitForFunction(() => /CRS-35/i.test(document.querySelector("[data-calendar-list]")?.innerText || ""), null, { timeout: 8000 });
await page.screenshot({ path: SHOT + "/batch4-calendar-mobile-crs.png" });
ok("calendar mobile crs-35");

await browser.close();
if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
