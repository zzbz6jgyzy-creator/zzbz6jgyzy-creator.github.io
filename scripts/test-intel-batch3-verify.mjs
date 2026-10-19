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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(BASE + "/optimus.html#demos", { waitUntil: "networkidle" });
await page.locator("[data-intel-demos] .intel-demo").nth(3).waitFor({ timeout: 8000 });
const cards = await page.$$eval("[data-intel-demos] .intel-demo", (els) =>
  els.map((el) => ({
    id: el.id,
    text: el.innerText,
  }))
);
if (cards.map((c) => c.id).join(",") === "ai-day-2021,ai-day-2022,roadster-reveal-2026,paris-motor-show-2026") ok("demo ids");
else bad("demo ids", cards.map((c) => c.id).join(","));
if (cards.every((c) => /shown/i.test(c.text) && /not shown/i.test(c.text) && /Autonomy:/i.test(c.text) && /Remote assistance:/i.test(c.text))) ok("demo fields");
else bad("demo fields", cards[0]?.text.slice(0, 160));
if (cards.some((c) => /Company claims/i.test(c.text) && /not verified specs/i.test(c.text))) ok("claims labelled");
else bad("claims labelled", "missing");
await page.locator("#ai-day-2022").evaluate((el) => el.scrollIntoView({ block: "start" }));
await page.screenshot({ path: SHOT + "/batch3-optimus-demos.png" });

await page.evaluate(() => window.scrollTo(0, 0));
await page.locator('button[aria-controls="pn-ex"]').click({ force: true });
await page.waitForSelector("#pn-ex a[href='/daily.html']", { state: "visible" });
const navHrefs = await page.$$eval("#pn-ex a", (as) => as.map((a) => a.getAttribute("href")));
if (["/autonomy.html", "/daily.html", "/production.html", "/optimus.html"].every((h) => navHrefs.includes(h))) ok("explore hrefs");
else bad("explore hrefs", JSON.stringify(navHrefs));
await page.screenshot({ path: SHOT + "/batch3-explore-nav.png" });
await page.click("#pn-ex a[href='/autonomy.html']");
await page.waitForURL(/autonomy\.html/);
if (page.url().includes("autonomy.html")) ok("explore to autonomy");
else bad("explore to autonomy", page.url());

await page.goto(BASE + "/calendar.html", { waitUntil: "networkidle" });
await page.locator("[data-calendar-list] .cal-title").first().waitFor({ timeout: 10000 });
await page.click("[data-cal-filter='spacex']");
await page.fill("[data-calendar-search]", "Flight 15");
await page.waitForFunction(() => {
  const titles = [...document.querySelectorAll("[data-calendar-list] .cal-title")].map((e) => e.textContent);
  return titles.length && titles.every((t) => /starship|flight 15/i.test(t));
}, null, { timeout: 8000 });
await page.screenshot({ path: SHOT + "/batch3-calendar-search.png" });
ok("calendar filter+search");

await page.goto(BASE + "/starship.html#schedule", { waitUntil: "networkidle" });
await page.locator(".starship-change-src").first().waitFor({ timeout: 8000 });
const srcs = await page.locator(".starship-change-src").allInnerTexts();
if (srcs.length >= 3 && srcs.every((s) => /Not live telemetry/.test(s))) ok("starship sources");
else bad("starship sources", JSON.stringify(srcs.slice(0, 3)));
await page.screenshot({ path: SHOT + "/batch3-starship-changes.png" });

await page.goto(BASE + "/my-tesla.html", { waitUntil: "domcontentloaded" });
await page.selectOption("#mt-cc", "");
await page.locator("#mt-waves").waitFor({ timeout: 5000 }).catch(() => {});
const emptyDash = await page.locator("#mt-dash").isHidden();
if (emptyDash) ok("my tesla empty until profile");
else {
  const waveEmpty = await page.locator("#mt-waves").innerText();
  if (/Pick a country/.test(waveEmpty)) ok("my tesla empty until profile");
  else bad("my tesla empty until profile", waveEmpty.slice(0, 160));
}

await page.goto(BASE + "/my-tesla.html?model=3&year=2024&hw=hw4&cc=US", { waitUntil: "networkidle" });
await page.waitForFunction(() => /Teslascope sample/.test(document.querySelector("#mt-waves")?.innerText || ""), null, { timeout: 8000 });
const us = await page.locator("#mt-waves").innerText();
if (/not Tesla offering this build to this VIN/.test(us) && !/you are eligible|this VIN is eligible|your car is eligible/i.test(us)) ok("US waves honest");
else bad("US waves honest", us.slice(0, 200));
await page.locator("#mt-waves").evaluate((el) => el.scrollIntoView({ block: "start" }));
await page.screenshot({ path: SHOT + "/batch3-mytesla-us-waves.png" });

await page.selectOption("#mt-cc", "DE");
await page.waitForTimeout(400);
const de = await page.locator("#mt-waves").innerText();
if (/sample/i.test(de) && /not Tesla offering this build to this VIN|No sample waves for Germany/.test(de)) ok("DE waves regional");
else bad("DE waves regional", de.slice(0, 200));

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/calendar.html", { waitUntil: "networkidle" });
await page.locator("[data-calendar-search]").waitFor({ timeout: 8000 });
await page.fill("[data-calendar-search]", "earnings");
await page.waitForTimeout(300);
await page.screenshot({ path: SHOT + "/batch3-calendar-mobile.png" });
ok("calendar mobile search");

await page.goto(BASE + "/optimus.html#demos", { waitUntil: "networkidle" });
await page.locator("[data-intel-demos] .intel-demo").first().waitFor({ timeout: 8000 });
await page.screenshot({ path: SHOT + "/batch3-optimus-mobile.png" });
ok("optimus mobile");

await browser.close();
if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
