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

const html = await (await fetch(BASE + "/counts.html")).text();
if (html.includes('name="robots" content="noindex,follow"') && html.includes("https://x.com/ALJR86")) ok("noindex + follow");
else bad("noindex + follow", "missing robots or handle");
if (["signup_submit", "latest_issue_click", "referral_click", "tesmag_click", "search_open", "search_go", "theme_toggle", "dispatch_filter"].every((n) => html.includes('data-sd-ev="' + n + '"'))) ok("eight tiles");
else bad("eight tiles", "missing allowlisted tiles");
if (html.includes("min-height") || (await (await fetch(BASE + "/counts.css?v=202610190820")).text()).includes("min-height: 12rem")) ok("reserved wells");
else bad("reserved wells", "counts.css missing reserved height");

const about = await (await fetch(BASE + "/about.html")).text();
if (about.includes('href="/counts.html"')) ok("about link");
else bad("about link", "about.html missing counts link");

const js = await (await fetch(BASE + "/counts.js?v=202610190820")).text();
if (js.includes("sd-events.superchargeddaily.workers.dev/stats") && !/api[_-]?key/i.test(js)) ok("stats url no secret");
else bad("stats url no secret", "wrong endpoint or secret");

const fixture = {
  since: "2026-09-20",
  totals: {
    signup_submit: 4,
    latest_issue_click: 0,
    referral_click: 2,
    tesmag_click: 0,
    search_open: 3,
    search_go: 0,
    theme_toggle: 1,
    dispatch_filter: 0,
  },
  byDay: { "2026-10-19": { signup_submit: 4, search_open: 3, theme_toggle: 1 }, "2026-10-16": { referral_click: 2 } },
  topPages: { signup_submit: { "/": 4 }, referral_click: { "/gear.html": 2 }, search_open: { "/": 3 } },
  note: "test",
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.route("**/sd-events.superchargeddaily.workers.dev/stats**", async (route) => {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) });
});
await page.goto(BASE + "/counts.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => {
  const el = document.querySelector('[data-sd-ev="signup_submit"] [data-sd-ev-n]');
  return el && el.textContent === "4";
}, null, { timeout: 8000 });
const tiles = await page.$$eval("[data-sd-ev]", (els) =>
  Object.fromEntries(els.map((el) => [el.getAttribute("data-sd-ev"), el.querySelector("[data-sd-ev-n]").textContent]))
);
if (tiles.signup_submit === "4" && tiles.referral_click === "2" && tiles.latest_issue_click === "0") ok("fixture totals");
else bad("fixture totals", JSON.stringify(tiles));
const labels = await page.$eval('[data-sd-ev="signup_submit"]', (el) => el.textContent);
if (/Newsletter handoffs/.test(labels)) ok("tile labels kept");
else bad("tile labels kept", String(labels));
const gridH = await page.$eval("[data-counts-grid]", (el) => el.getBoundingClientRect().height);
if (gridH >= 180) ok("grid height");
else bad("grid height", String(gridH));
const days = await page.textContent("#sd-counts-days");
if (/Newsletter handoffs/.test(days) && /Tesla referral/.test(days)) ok("by day");
else bad("by day", String(days));
const pages = await page.textContent("#sd-counts-pages");
if (pages.includes("/gear.html") && pages.includes("/")) ok("top pages");
else bad("top pages", String(pages));
const follow = await page.$eval('a[href="https://x.com/ALJR86"]', (el) => el.getAttribute("href"));
if (follow === "https://x.com/ALJR86") ok("follow on X");
else bad("follow on X", String(follow));
await page.screenshot({ path: SHOT + "/watch-counts-desktop.png" });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.route("**/sd-events.superchargeddaily.workers.dev/stats**", async (route) => {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) });
});
await mobile.goto(BASE + "/counts.html", { waitUntil: "domcontentloaded" });
await mobile.waitForFunction(() => document.querySelector('[data-sd-ev="signup_submit"] [data-sd-ev-n]')?.textContent === "4", null, { timeout: 8000 });
await mobile.screenshot({ path: SHOT + "/watch-counts-mobile.png" });
await mobile.close();

const failPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await failPage.route("**/sd-events.superchargeddaily.workers.dev/stats**", (route) => route.abort());
await failPage.goto(BASE + "/counts.html", { waitUntil: "domcontentloaded" });
await failPage.waitForFunction(() => /Could not load counts/.test(document.getElementById("sd-counts-hint")?.textContent || ""), null, { timeout: 8000 });
const dash = await failPage.$$eval("[data-sd-ev-n]", (els) => els.every((el) => el.textContent === "—"));
if (dash) ok("fail dash");
else bad("fail dash", "tiles not dashed after fail");
await failPage.screenshot({ path: SHOT + "/watch-counts-fail.png" });
await failPage.close();

const zero = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await zero.route("**/sd-events.superchargeddaily.workers.dev/stats**", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ since: "2026-09-20", totals: Object.fromEntries(["signup_submit", "latest_issue_click", "referral_click", "tesmag_click", "search_open", "search_go", "theme_toggle", "dispatch_filter"].map((k) => [k, 0])), byDay: {}, topPages: {} }),
  });
});
await zero.goto(BASE + "/counts.html", { waitUntil: "domcontentloaded" });
await zero.waitForFunction(() => document.querySelector('[data-sd-ev="signup_submit"] [data-sd-ev-n]')?.textContent === "0", null, { timeout: 8000 });
const zeroHint = await zero.textContent("#sd-counts-hint");
if (/No actions recorded/.test(zeroHint)) ok("zero state");
else bad("zero state", String(zeroHint));
await zero.close();

const liveRes = await fetch("https://sd-events.superchargeddaily.workers.dev/stats?days=30").catch(() => null);
const live = liveRes && liveRes.ok ? await liveRes.json() : null;
if (live?.totals && "signup_submit" in live.totals && "theme_toggle" in live.totals) ok("live worker");
else bad("live worker", JSON.stringify(live && live.totals));

await page.close();
await browser.close();
if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
