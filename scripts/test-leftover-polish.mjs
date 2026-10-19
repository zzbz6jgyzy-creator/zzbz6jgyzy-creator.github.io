import pkg from "/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pkg;
const BASE = process.env.BASE || "http://127.0.0.1:4173";
const SHOT = process.env.SHOT || "/opt/cursor/artifacts";
const fail = [];
const ok = (name) => console.log("PASS", name);
const bad = (name, msg) => {
  fail.push(name + ": " + msg);
  console.log("FAIL", name, msg);
};

const tesla = await (await fetch(BASE + "/tesla.html")).text();
const spacex = await (await fetch(BASE + "/spacex.html")).text();
if (tesla.includes("/styles.css?v=202610190700") && spacex.includes("/styles.css?v=202610190700")) ok("styles pin");
else bad("styles pin", "tesla/spacex still on old styles.css");
if (!/class="story-grid"[\s\S]*?style="width:100%;height:auto"/.test(tesla)) ok("tesla no height:auto");
else bad("tesla no height:auto", "inline height:auto still in Tesla grid");
if (!/class="story-grid"[\s\S]*?style="width:100%;height:auto"/.test(spacex)) ok("spacex no height:auto");
else bad("spacex no height:auto", "inline height:auto still in SpaceX grid");
if (tesla.includes("https://x.com/ALJR86") && spacex.includes("https://x.com/ALJR86")) ok("follow on X desks");
else bad("follow on X desks", "handle changed");

const css = await (await fetch(BASE + "/styles.css?v=202610190700")).text();
if (css.includes(".story-grid .story-card > picture") && css.includes("height: 160px !important")) ok("css lock");
else bad("css lock", "missing story-grid picture lock");

const ptCss = await (await fetch(BASE + "/promise-tracker.css?v=202610190700")).text();
if (ptCss.includes(".pt-chips:empty") && ptCss.includes(".pt-tiles:empty") && ptCss.includes(".pt-legend:empty")) ok("promise empty wells");
else bad("promise empty wells", "missing :empty reserves");

const ptHtml = await (await fetch(BASE + "/promise-tracker.html")).text();
if (ptHtml.includes("/promise-tracker.css?v=202610190700") && ptHtml.includes("Loading promises")) ok("promise pin + loading");
else bad("promise pin + loading", "pin or loading copy missing");
if (ptHtml.includes("https://x.com/ALJR86") && ptHtml.includes("ts.la/alex474841")) ok("promise follow + referral");
else bad("promise follow + referral", "handle or referral changed");

const clubsHtml = await (await fetch(BASE + "/tesla-clubs.html")).text();
if (clubsHtml.includes("/tesla-clubs.js?v=202610190700") && clubsHtml.includes("https://x.com/ALJR86")) ok("clubs pin + follow");
else bad("clubs pin + follow", "pin or handle changed");

const clubsJs = await (await fetch(BASE + "/tesla-clubs.js?v=202610190700")).text();
if (clubsJs.includes("Couldn't look up that city") && clubsJs.includes("No matching city") && clubsJs.includes('setHint("Location blocked')) ok("clubs fail copy");
else bad("clubs fail copy", "missing hint strings");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(BASE + "/tesla.html", { waitUntil: "domcontentloaded" });
const teslaH = await page.$$eval(".story-grid .story-card > picture img, .story-grid .story-card > picture", (els) =>
  els.map((el) => Math.round(el.getBoundingClientRect().height))
);
if (teslaH.length && teslaH.every((h) => h === 160)) ok("tesla posters 160");
else bad("tesla posters 160", JSON.stringify(teslaH.slice(0, 8)));
await page.locator(".story-grid .story-card").first().scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/polish-tesla-cards.png" });

await page.goto(BASE + "/spacex.html", { waitUntil: "domcontentloaded" });
const sxH = await page.$$eval(".story-grid .story-card > picture img", (els) =>
  els.map((el) => Math.round(el.getBoundingClientRect().height))
);
if (sxH.length && sxH.every((h) => h === 160)) ok("spacex posters 160");
else bad("spacex posters 160", JSON.stringify(sxH.slice(0, 8)));
await page.locator(".story-grid .story-card").first().scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/polish-spacex-cards.png" });

await page.goto(BASE + "/dispatch.html", { waitUntil: "domcontentloaded" });
const dispH = await page.$$eval(".story-grid .story-card > picture img", (els) =>
  els.slice(0, 6).map((el) => Math.round(el.getBoundingClientRect().height))
);
if (dispH.length && dispH.every((h) => h === 160)) ok("dispatch posters 160");
else bad("dispatch posters 160", JSON.stringify(dispH));

await page.route("**/data/promises.json", (route) => new Promise(() => {}));
await page.goto(BASE + "/promise-tracker.html", { waitUntil: "domcontentloaded" });
const reserved = await page.evaluate(() => {
  const chips = document.getElementById("pt-misses");
  const tiles = document.getElementById("pt-tiles");
  const list = document.getElementById("pt-list");
  return {
    chipsH: chips ? Math.round(chips.getBoundingClientRect().height) : 0,
    chipsEmpty: chips ? chips.children.length === 0 : false,
    tilesH: tiles ? Math.round(tiles.getBoundingClientRect().height) : 0,
    tilesEmpty: tiles ? tiles.children.length === 0 : false,
    loading: /Loading promises/.test(list?.textContent || ""),
  };
});
if (reserved.chipsEmpty && reserved.chipsH >= 72) ok("promise chips reserved");
else bad("promise chips reserved", JSON.stringify(reserved));
if (reserved.tilesEmpty && reserved.tilesH >= 160) ok("promise tiles reserved");
else bad("promise tiles reserved", JSON.stringify(reserved));
if (reserved.loading) ok("promise list loading");
else bad("promise list loading", JSON.stringify(reserved));
await page.locator(".pt-strips").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/polish-promise-wells.png" });
await page.unroute("**/data/promises.json");

await page.goto(BASE + "/promise-tracker.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.querySelectorAll("#pt-list .pt-card").length > 2, { timeout: 8000 });
const filled = await page.$$eval("#pt-list .pt-card", (els) => els.length);
if (filled > 2) ok("promise cards");
else bad("promise cards", String(filled));
await page.locator(".pt-strips").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/polish-promise-filled.png" });

const clubs = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await clubs.route("https://geocoding-api.open-meteo.com/**", (route) => route.abort());
await clubs.addInitScript(() => {
  try {
    localStorage.removeItem("sd-tesla-clubs-v1");
  } catch {}
});
await clubs.goto(BASE + "/tesla-clubs.html", { waitUntil: "domcontentloaded" });
await clubs.fill("#tc-q", "Austin");
await clubs.waitForFunction(() => /Couldn.t look up that city/.test(document.getElementById("tc-hint")?.textContent || ""), {
  timeout: 4000,
});
const failHint = await clubs.$eval("#tc-hint", (el) => ({ t: el.textContent, hold: el.dataset.hold }));
if (/Couldn't look up that city/.test(failHint.t) && failHint.hold === "1") ok("clubs lookup fail");
else bad("clubs lookup fail", JSON.stringify(failHint));
await clubs.locator("#tc-hint").scrollIntoViewIfNeeded();
await clubs.screenshot({ path: SHOT + "/polish-clubs-fail.png" });

await clubs.unroute("https://geocoding-api.open-meteo.com/**");
await clubs.route("https://geocoding-api.open-meteo.com/**", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [] }) })
);
await clubs.fill("#tc-q", "Zzzzzxyz");
await clubs.waitForFunction(() => /No matching city/.test(document.getElementById("tc-hint")?.textContent || ""), {
  timeout: 4000,
});
const emptyHint = await clubs.$eval("#tc-hint", (el) => ({ t: el.textContent, hold: el.dataset.hold }));
if (/No matching city/.test(emptyHint.t) && emptyHint.hold === "1") ok("clubs empty city");
else bad("clubs empty city", JSON.stringify(emptyHint));

await clubs.evaluate(() => {
  navigator.geolocation.getCurrentPosition = (ok, err) => err({ code: 1, message: "denied" });
});
await clubs.click("#tc-geo");
const geoHint = await clubs.$eval("#tc-hint", (el) => ({ t: el.textContent, hold: el.dataset.hold }));
if (/Location blocked/.test(geoHint.t) && geoHint.hold === "1") ok("clubs geo hold");
else bad("clubs geo hold", JSON.stringify(geoHint));

await clubs.unroute("https://geocoding-api.open-meteo.com/**");
await clubs.route("https://geocoding-api.open-meteo.com/**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      results: [{ name: "Austin", admin1: "Texas", country: "United States", latitude: 30.2672, longitude: -97.7431 }],
    }),
  })
);
await clubs.fill("#tc-q", "Austin");
await clubs.waitForSelector("#tc-suggest button", { timeout: 4000 });
await clubs.click("#tc-suggest button");
const hit = await clubs.evaluate(() => ({
  hint: document.getElementById("tc-hint")?.textContent || "",
  hold: document.getElementById("tc-hint")?.dataset.hold || "",
  live: document.getElementById("tc-live")?.textContent || "",
}));
if (/Only clubs for Austin/.test(hit.hint) && hit.hold !== "1" && /3 near Austin/.test(hit.live)) ok("clubs austin hit");
else bad("clubs austin hit", JSON.stringify(hit));
await clubs.screenshot({ path: SHOT + "/polish-clubs-success.png" });

const follow = await clubs.$eval('a[href="https://x.com/ALJR86"]', (el) => el.getAttribute("href"));
if (follow === "https://x.com/ALJR86") ok("follow on X clubs");
else bad("follow on X clubs", String(follow));

await clubs.close();
await browser.close();
if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
