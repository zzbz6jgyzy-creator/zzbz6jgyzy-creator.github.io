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
const homeRows = await page.$$eval("[data-intel-changed] .intel-item a", (as) =>
  as.map((a) => ({ href: a.getAttribute("href") || "", k: (a.querySelector(".intel-k") || {}).textContent || "" }))
);
const dispatchHome = homeRows.filter((r) => /\/dispatch\//.test(r.href));
if (dispatchHome.length && dispatchHome.every((r) => r.k === "Dispatch")) ok("home dispatch labelled Dispatch");
else if (!dispatchHome.length) ok("home dispatch labelled Dispatch");
else bad("home dispatch labelled Dispatch", JSON.stringify(dispatchHome.slice(0, 4)));
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
await page.locator("[data-intel-wave-country] option[value='US']").waitFor({ state: "attached", timeout: 8000 });
await page.selectOption("[data-intel-wave-country]", "US");
const usWaves = await page.locator("[data-intel-waves]").innerText();
if (/particular VIN|this car is eligible/i.test(usWaves) && !/you are eligible|this VIN is eligible|your car is eligible/i.test(usWaves)) ok("software country waves");
else bad("software country waves", usWaves.slice(0, 280));
await page.locator("#sample-waves").screenshot({ path: SHOT + "/intel-updates-country-waves.png" });

await page.goto(BASE + "/fsd-europe.html#changes", { waitUntil: "networkidle" });
await page.locator("#f2-log").waitFor({ timeout: 8000 });
const fsdLog = await page.locator("#f2-log").innerText();
if (/Slovakia/.test(fsdLog) && /Recognition is not a customer rollout/.test(fsdLog) && /Company claim/.test(fsdLog) && /Soon/.test(fsdLog)) ok("fsd slovakia honesty");
else bad("fsd slovakia honesty", fsdLog.slice(0, 400));
await page.locator("#f2-log").evaluate((el) => el.scrollIntoView({ block: "start" }));
await page.screenshot({ path: SHOT + "/intel-fsd-changes.png" });

await page.goto(BASE + "/cybercab.html#cc-changes", { waitUntil: "networkidle" });
await page.locator("[data-cc-changes] .sourced-change").first().waitFor({ timeout: 8000 });
const cabText = await page.locator("[data-cc-changes]").innerText();
if (/126/.test(cabText) && /169/.test(cabText) && /319/.test(cabText) && /349/.test(cabText) && /Unchanged/.test(cabText) && /not a car in service/.test(cabText)) ok("cybercab sourced jumps");
else bad("cybercab sourced jumps", cabText.slice(0, 400));
await page.locator("[data-cc-changes]").evaluate((el) => el.scrollIntoView({ block: "start" }));
await page.screenshot({ path: SHOT + "/intel-cybercab-changes.png" });

await page.goto(BASE + "/see-the-launch.html", { waitUntil: "domcontentloaded" });
await page.locator("[data-intel-clocks] table").waitFor({ timeout: 8000 });
const seeClocks = await page.locator("[data-intel-clocks]").innerText();
if (/crs35-docking/.test(seeClocks) && /ussf-481/.test(seeClocks) && /events.json/.test(seeClocks) && /Live overlay/.test(seeClocks)) ok("see-the-launch kept clocks");
else bad("see-the-launch kept clocks", seeClocks.slice(0, 400));
await page.locator("[data-intel-clocks]").evaluate((el) => el.scrollIntoView({ block: "start" }));
await page.screenshot({ path: SHOT + "/intel-see-clocks.png" });

await page.goto(BASE + "/calendar.html", { waitUntil: "networkidle" });
await page.locator("[data-intel-clocks] table").waitFor({ timeout: 8000 });
const calClocks = await page.locator("[data-intel-clocks]").innerText();
if (/crs35-docking/.test(calClocks) && /ussf-481/.test(calClocks) && calClocks === seeClocks) ok("calendar clocks match see-the-launch");
else bad("calendar clocks match see-the-launch", calClocks.slice(0, 280));

await page.goto(BASE + "/starlink.html#counts-changed", { waitUntil: "domcontentloaded" });
await page.locator("[data-sl-changes] .sourced-change").first().waitFor({ timeout: 8000 });
const slText = await page.locator("[data-sl-changes]").innerText();
if (/11,156/.test(slText) && /11,154/.test(slText) && /not a live operator feed/.test(slText) && /not interpolated/i.test(slText)) ok("starlink sourced diffs");
else bad("starlink sourced diffs", slText.slice(0, 400));
await page.locator("[data-sl-changes]").evaluate((el) => el.scrollIntoView({ block: "start" }));
await page.screenshot({ path: SHOT + "/intel-starlink-changes.png" });

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
