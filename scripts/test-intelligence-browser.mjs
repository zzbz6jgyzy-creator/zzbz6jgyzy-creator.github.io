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
await page.locator("[data-intel-demos] .intel-demo").first().waitFor({ timeout: 8000 });
const demoText = await page.locator("[data-intel-demos]").innerText();
const demoCards = await page.locator("[data-intel-demos] .intel-demo").count();
if (demoCards >= 4 && /shown/i.test(demoText) && /not shown/i.test(demoText) && /Autonomy:/i.test(demoText) && /Remote assistance:/i.test(demoText) && /The Verge/.test(demoText) && /Engadget/.test(demoText) && /not established|Unknown/i.test(demoText) && /We Robot 2024 omitted|until a source is opened/.test(demoText)) ok("optimus demo archive");
else bad("optimus demo archive", `cards=${demoCards} ` + demoText.slice(0, 280));
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
const shipChanges = await page.locator("#starship-changes").innerText();
if (/What changed on Flight 15/.test(await page.locator("#starship-schedule-heading").innerText()) && /FAA CADENA|NASASpaceflight|dispatch/i.test(shipChanges) && /Not live telemetry/.test(shipChanges)) ok("starship sourced mission changes");
else bad("starship sourced mission changes", shipChanges.slice(0, 240));
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
if (/Q1 2026 vs Q1 2025/.test(prodPage) && /336,681/.test(prodPage) && /358,023/.test(prodPage) && /Q2 2026 vs Q2 2025/.test(prodPage) && /384,122/.test(prodPage) && /480,126/.test(prodPage)) ok("production yoy q1 q2");
else bad("production yoy q1 q2", prodPage.slice(0, 400));

await page.goto(BASE + "/tesla.html#trackers", { waitUntil: "networkidle" });
await page.locator(".intel-desk [data-intel='software'] .intel-fresh").waitFor({ timeout: 8000 });
const desk = await page.locator(".intel-desk").innerText();
if (/Last checked/.test(desk) && /Last verified/.test(desk) && /Teslascope|sample|IR/.test(desk)) ok("tesla desk intel bars");
else bad("tesla desk intel bars", desk.slice(0, 240));
await page.screenshot({ path: SHOT + "/intel-tesla-desk.png" });

await page.goto(BASE + "/intel-health.html", { waitUntil: "networkidle" });
await page.locator(".intel-conflicts table").waitFor({ timeout: 8000 });
const health = await page.locator("[data-intel-health]").innerText();
if (/crs35-docking|CRS-35/i.test(health) && /ussf-481|USSF/i.test(health) && /events\.json|Kept/.test(health) && /14:27|13:15/.test(health)) ok("health conflict rows");
else bad("health conflict rows", health.slice(0, 360));

await page.goto(BASE + "/roadster.html", { waitUntil: "networkidle" });
await page.locator("[data-intel-promises] table").waitFor({ timeout: 8000 });
const rd = await page.locator("[data-intel-promises]").innerText();
if (/No invented progress percentage/.test(rd) && /Missed|In progress|Delivered/.test(rd)) ok("roadster promises table");
else bad("roadster promises table", rd.slice(0, 200));

await page.goto(BASE + "/my-tesla.html?model=3&year=2024&hw=hw4&cc=US", { waitUntil: "networkidle" });
if (await page.locator("[data-intel='mytesla']").count()) ok("my tesla intel bar");
else bad("my tesla intel bar", "missing");
await page.locator("#mt-waves").waitFor({ timeout: 8000 });
const wavesMine = await page.locator("#mt-waves").innerText();
if (/not Tesla offering this build to this VIN|not an offer to a particular VIN|not a notice that this VIN is eligible/i.test(wavesMine) && /Teslascope|sample/i.test(wavesMine) && !/you are eligible/i.test(wavesMine)) ok("my tesla region waves");
else bad("my tesla region waves", wavesMine.slice(0, 280));
await page.screenshot({ path: SHOT + "/intel-my-tesla-waves.png" });

await page.goto(BASE + "/calendar.html", { waitUntil: "networkidle" });
await page.locator("[data-calendar-list] .cal-title").first().waitFor({ timeout: 10000 });
await page.fill("[data-calendar-search]", "Starship");
await page.waitForFunction(() => {
  const titles = [...document.querySelectorAll("[data-calendar-list] .cal-title")].map((e) => e.textContent);
  const empty = document.querySelector("[data-calendar-list] .cal-empty");
  return titles.every((t) => /starship/i.test(t)) || (empty && /match this search/.test(empty.textContent));
}, null, { timeout: 8000 });
const calHits = await page.$$eval("[data-calendar-list] .cal-title", (els) => els.map((e) => e.textContent));
if (calHits.length && calHits.every((t) => /starship/i.test(t))) ok("calendar search starship");
else bad("calendar search starship", JSON.stringify(calHits));
await page.fill("[data-calendar-search]", "");
await page.waitForTimeout(200);
const recentText = await page.locator("[data-calendar-recent]").innerText();
if (/CRS-35|USSF-481|Roadster/i.test(recentText)) ok("calendar recent past");
else bad("calendar recent past", recentText.slice(0, 240));
await page.fill("[data-calendar-search]", "CRS-35");
await page.waitForFunction(() => {
  const titles = [...document.querySelectorAll("[data-calendar-list] .cal-title")].map((e) => e.textContent);
  return titles.some((t) => /CRS-35/i.test(t));
}, null, { timeout: 8000 });
ok("calendar search past crs-35");
const clocks = await page.locator("[data-intel-clocks]").innerText();
if (/events\.json|Kept/.test(clocks) && /14:27|13:15|00:02|23:57/.test(clocks)) ok("calendar kept clocks");
else bad("calendar kept clocks", clocks.slice(0, 280));
await page.fill("[data-calendar-search]", "zzz-no-such-event");
await page.waitForFunction(() => /No events match this search/.test(document.querySelector("[data-calendar-list]")?.textContent || ""), null, { timeout: 5000 });
ok("calendar search empty");
await page.screenshot({ path: SHOT + "/intel-calendar-search.png" });

const explore = await page.locator("#pn-ex");
const navHrefs = await explore.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
if (["/autonomy.html", "/daily.html", "/production.html", "/optimus.html"].every((h) => navHrefs.includes(h))) ok("explore nav four trackers");
else bad("explore nav four trackers", JSON.stringify(navHrefs));

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
