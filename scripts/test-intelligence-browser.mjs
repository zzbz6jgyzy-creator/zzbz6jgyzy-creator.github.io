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

await page.goto(BASE + "/", { waitUntil: "networkidle" });
const changed = page.locator("[data-intel-changed] .intel-item");
await changed.first().waitFor({ timeout: 8000 });
const n = await changed.count();
if (n >= 3) ok("home what-changed rows");
else bad("home what-changed rows", String(n));
if (await page.locator("[data-intel-follow] .intel-chip").count() >= 6) ok("home follow chips");
else bad("home follow chips", "missing");
await page.locator('[data-follow="optimus"]').click();
const pressed = await page.locator('[data-follow="optimus"]').getAttribute("aria-pressed");
if (pressed === "true") ok("follow persist press");
else bad("follow persist press", pressed);
await page.screenshot({ path: SHOT + "/intel-home-changed.png", fullPage: false });

await page.goto(BASE + "/optimus.html", { waitUntil: "networkidle" });
await page.locator("[data-intel-optimus] table").waitFor({ timeout: 8000 });
const optText = await page.locator("[data-intel-optimus]").innerText();
if (/Missed|In progress|Delivered/.test(optText) && /CNBC|Motley Fool|Verge/.test(optText)) ok("optimus sourced table");
else bad("optimus sourced table", optText.slice(0, 200));
if (await page.locator("[data-intel='optimus'] .intel-fresh").count()) ok("optimus freshness");
else bad("optimus freshness", "missing");
await page.screenshot({ path: SHOT + "/intel-optimus.png" });

await page.goto(BASE + "/production.html", { waitUntil: "networkidle" });
await page.locator("[data-intel-production] table").waitFor({ timeout: 8000 });
const prod = await page.locator("[data-intel-production]").innerText();
if (prod.includes("486,532") && prod.includes("Tesla IR") && /Q3 2025/.test(prod)) ok("production official Q3");
else bad("production official Q3", prod.slice(0, 240));
await page.screenshot({ path: SHOT + "/intel-production.png" });

await page.goto(BASE + "/starship.html", { waitUntil: "networkidle" });
if (await page.locator("[data-intel='starship'] .intel-fresh").count()) ok("starship freshness");
else bad("starship freshness", "missing");
const fresh = await page.locator("[data-intel='starship']").innerText();
if (/Last checked/.test(fresh) && /Last verified/.test(fresh)) ok("starship checked vs verified");
else bad("starship checked vs verified", fresh);
await page.screenshot({ path: SHOT + "/intel-starship.png" });

await page.goto(BASE + "/updates.html", { waitUntil: "networkidle" });
const sw = await page.locator("main").innerText();
if (/not a rollout/.test(sw) && /specific car/.test(sw)) ok("software honesty");
else bad("software honesty", sw.slice(0, 200));
await page.locator("[data-intel-waves]").waitFor({ timeout: 8000 });
const waves = await page.locator("[data-intel-waves]").innerText();
if (/Teslascope|sample|first appeared|not a rollout/i.test(waves + sw)) ok("software sample waves");
else bad("software sample waves", waves.slice(0, 200));

await page.goto(BASE + "/autonomy.html", { waitUntil: "networkidle" });
await page.locator("[data-intel-autonomy] table").first().waitFor({ timeout: 8000 });
const auto = await page.locator("[data-intel-autonomy]").innerText();
if (/Driver-supervised assistance/.test(auto) && /Recognised, rollout not confirmed/.test(auto) && /Commercial paid rides/.test(auto) && /Austin/.test(auto) && /Dallas/.test(auto)) ok("autonomy layers");
else bad("autonomy layers", auto.slice(0, 280));
if (/Slovakia/.test(auto) && /recognised-not-live|not the same as owners receiving/.test(auto)) ok("slovakia not rollout");
else bad("slovakia not rollout", auto.slice(0, 240));
await page.screenshot({ path: SHOT + "/intel-autonomy.png" });

await page.goto(BASE + "/daily.html", { waitUntil: "networkidle" });
await page.locator("[data-intel-follow] .intel-chip").first().waitFor({ timeout: 8000 });
if (await page.locator("[data-intel-digest]").count()) ok("daily digest slot");
else bad("daily digest slot", "missing");
await page.locator("[data-intel-alerts-test]").click();
const digest = await page.locator("[data-intel-digest]").innerText();
if (/not sent|No email/i.test(digest) && !/sent=1/.test(digest)) ok("daily test queue unsent");
else bad("daily test queue unsent", digest.slice(0, 240));
await page.screenshot({ path: SHOT + "/intel-daily.png" });

await page.goto(BASE + "/production.html", { waitUntil: "networkidle" });
await page.locator("[data-intel-production] table").waitFor({ timeout: 8000 });
const prodPage = await page.locator("[data-intel-production]").innerText();
if (prodPage.includes("497,099") && prodPage.includes("418,227") && /Q3 2026 vs Q3 2025/.test(prodPage)) ok("production yoy official");
else bad("production yoy official", prodPage.slice(0, 280));

await page.goto(BASE + "/roadster.html", { waitUntil: "networkidle" });
await page.locator("[data-intel-promises] table").waitFor({ timeout: 8000 });
const rd = await page.locator("[data-intel-promises]").innerText();
if (/No invented progress percentage/.test(rd) && /Missed|In progress|Delivered/.test(rd)) ok("roadster promises table");
else bad("roadster promises table", rd.slice(0, 200));

await page.goto(BASE + "/my-tesla.html", { waitUntil: "networkidle" });
if (await page.locator("[data-intel='mytesla']").count()) ok("my tesla intel bar");
else bad("my tesla intel bar", "missing");

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.locator("[data-intel-changed] .intel-item").first().waitFor({ timeout: 8000 });
await page.locator("[data-intel-changed]").evaluate((el) => el.scrollIntoView({ block: "start" }));
await page.screenshot({ path: SHOT + "/intel-home-mobile.png" });
ok("mobile homepage shot");

await browser.close();
if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
