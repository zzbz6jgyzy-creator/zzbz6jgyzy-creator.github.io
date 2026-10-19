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

const index = fs.readFileSync("index.html", "utf8");
if (/theme\.css\?v=202610191800/.test(index)) ok("home theme pin locked");
else bad("home theme pin locked", "index.html theme.css pin drifted");
if ((index.match(/class="hv-t"/g) || []).length === 4 && /grid-template-columns:repeat\(4,1fr\)/.test(fs.readFileSync("home-v2.css", "utf8"))) ok("homepage four tracker columns");
else bad("homepage four tracker columns", "tracker row changed");
if (/my-tesla\.js\?v=202610192200/.test(fs.readFileSync("my-tesla.html", "utf8"))) ok("my-tesla pin locked");
else bad("my-tesla pin locked", "pin drifted");

const pages = JSON.parse(fs.readFileSync("data/pages.json", "utf8"));
const cal = (pages.pages || []).find((p) => p.url === "/calendar.html");
if (cal && /earlier dated|Flight 14/i.test(cal.summary)) ok("calendar archive indexed");
else bad("calendar archive indexed", JSON.stringify(cal));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.locator("[data-intel-clocks] table").waitFor({ timeout: 8000 });
const homeClocks = await page.locator("[data-intel-clocks]").innerText();
if (/crs35-docking/.test(homeClocks) && /ussf-481/.test(homeClocks) && /events\.json/i.test(homeClocks) && /Live overlay/i.test(homeClocks)) ok("homepage kept clocks");
else bad("homepage kept clocks", homeClocks.slice(0, 400));
await page.locator("[data-intel-clocks]").evaluate((el) => el.scrollIntoView({ block: "start" }));
await page.screenshot({ path: SHOT + "/crosslinks-home-clocks.png" });

await page.goto(BASE + "/production.html", { waitUntil: "domcontentloaded" });
await page.locator("[data-intel-production] table").waitFor({ timeout: 8000 });
const prod = await page.locator("[data-intel-production]").innerText();
if (/Q1 2026 vs Q1 2025/.test(prod) && /energy -15\.4%/.test(prod) && /8\.8 vs 10\.4 GWh/.test(prod) && /Q2 2026 vs Q2 2025/.test(prod) && /energy \+40\.6%/.test(prod) && /Q3 2026 vs Q3 2025/.test(prod) && /energy \+9\.6%/.test(prod)) ok("energy yoy three pairs");
else bad("energy yoy three pairs", prod.slice(0, 700));
if (/Q4 2025/.test(prod) && !/Q4 2025 vs/.test(prod)) ok("q4 2025 no invented energy yoy");
else bad("q4 2025 no invented energy yoy", "unexpected year-ago");
await page.locator("[data-intel-production]").screenshot({ path: SHOT + "/crosslinks-production-energy.png" });

await page.goto(BASE + "/autonomy.html", { waitUntil: "domcontentloaded" });
const auto = await page.locator("main").innerText();
if (/not a car in service/.test(auto) && /city layers are not that count/.test(auto) && await page.locator('a.intel-chip[href="/cybercab.html"]').count()) ok("autonomy related desks");
else bad("autonomy related desks", auto.slice(0, 360));
await page.locator(".intel-related").screenshot({ path: SHOT + "/crosslinks-autonomy-desks.png" });

await page.goto(BASE + "/cybercab.html", { waitUntil: "domcontentloaded" });
const cab = await page.locator(".cc-hero-copy").innerText();
if (/How we judge/.test(cab) && /not a car in service/.test(cab) && await page.locator('.cc-hero-copy a[href="/autonomy.html"]').count()) ok("cybercab how we judge");
else bad("cybercab how we judge", cab.slice(0, 360));
await page.locator(".cc-hero-copy").screenshot({ path: SHOT + "/crosslinks-cybercab-judge.png" });

await page.goto(BASE + "/calendar.html", { waitUntil: "domcontentloaded" });
await page.locator("#cal-archive-h").evaluate((el) => {
  el.scrollIntoView({ block: "start" });
  window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80));
});
await page.waitForFunction(() => /Flight 14/.test(document.querySelector("[data-calendar-archive]")?.innerText || ""), null, { timeout: 12000 });
const archive = await page.evaluate(() => document.querySelector("[data-calendar-archive]")?.innerText || "");
const archiveHead = await page.evaluate(() => document.querySelector("[aria-labelledby='cal-archive-h']")?.innerText || "");
if (/Flight 14/.test(archive) && /Flight 13/.test(archive) && /not live telemetry/i.test(archiveHead)) ok("calendar earlier flights");
else bad("calendar earlier flights", (archiveHead + "\n" + archive).slice(0, 500));
await page.locator("[data-calendar-archive]").screenshot({ path: SHOT + "/crosslinks-calendar-archive.png" });

await page.fill("[data-calendar-search]", "Flight 14");
await page.waitForFunction(() => {
  const titles = [...document.querySelectorAll("[data-calendar-list] .cal-title")].map((e) => e.textContent);
  return titles.some((t) => /Flight 14/i.test(t));
}, null, { timeout: 8000 });
ok("calendar search flight 14");
const archiveWhileSearch = await page.locator("[data-calendar-archive]").innerText();
if (/listed with upcoming results/.test(archiveWhileSearch)) ok("archive defers to search list");
else bad("archive defers to search list", archiveWhileSearch.slice(0, 200));
await page.locator("[data-calendar-list]").evaluate((el) => el.scrollIntoView({ block: "start" }));
await page.screenshot({ path: SHOT + "/crosslinks-calendar-search-f14.png" });

const helpers = await page.evaluate(() => {
  const C = window.SDCalendar;
  const now = new Date("2026-10-19T16:00:00Z");
  return {
    recent: C && C.isRecentPast({ start: "2026-10-10T10:31:25Z" }, now),
    archive: C && C.isArchivePast({ start: "2026-09-28T12:00:00Z" }, now),
    upcoming: C && C.isUpcoming({ start: "2026-11-08T12:00:00Z", precision: "day", status: "net" }, now),
    days: C && C.RECENT_DAYS,
  };
});
if (helpers.recent && helpers.archive && helpers.upcoming && helpers.days === 21) ok("calendar window helpers");
else bad("calendar window helpers", JSON.stringify(helpers));

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.locator("[data-intel-clocks] table").waitFor({ timeout: 8000 });
await page.locator("[data-intel-clocks]").evaluate((el) => el.scrollIntoView({ block: "start" }));
await page.screenshot({ path: SHOT + "/crosslinks-home-clocks-mobile.png" });
ok("homepage clocks mobile");

await browser.close();
if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
