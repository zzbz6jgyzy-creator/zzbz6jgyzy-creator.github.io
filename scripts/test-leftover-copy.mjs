import fs from "fs";
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

const tesla = fs.readFileSync("tesla.html", "utf8");
const updates = fs.readFileSync("updates.html", "utf8");
const updatesJs = fs.readFileSync("updates-v3.js", "utf8");
const myTesla = fs.readFileSync("my-tesla.js", "utf8");
const myTeslaHtml = fs.readFileSync("my-tesla.html", "utf8");
const liveCss = fs.readFileSync("live.css", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const spacex = fs.readFileSync("spacex.html", "utf8");
const starship = fs.readFileSync("starship.html", "utf8");

if (!/every weekday/i.test(tesla) && /owner and shareholder/.test(tesla)) ok("tesla lede no weekday");
else bad("tesla lede no weekday", "weekday claim still in tesla.html");
if (/id="tz-updated"[^>]*>Dates below are compiled stamps, not live telemetry\./.test(tesla)) ok("tesla stamp fallback");
else bad("tesla stamp fallback", "fallback still overclaims a schedule");
if (/<span>Newest reporting<\/span>/.test(updates) && !/Newest build/.test(updates)) ok("updates tile label");
else bad("updates tile label", "tile still says Newest build");
if (/Newest reporting in \$\{RNAME\[rg\]\}/.test(updatesJs) && /% of tracked cars/.test(updatesJs) && !/Newest build/.test(updatesJs)) ok("updates-v3 copy");
else bad("updates-v3 copy", "still says Newest build or % of cars");
if (/updates-v3\.js\?v=202610191800/.test(updates)) ok("updates-v3 pin");
else bad("updates-v3 pin", "pin not bumped");
if (/Newest reporting Teslascope has seen/.test(myTesla) && /newest reporting in \$\{countryName\(\)\}/.test(myTesla) && !/Newest build/.test(myTesla)) ok("my-tesla copy");
else bad("my-tesla copy", "my-tesla.js still says Newest build");
if (/my-tesla\.js\?v=202610192000/.test(myTeslaHtml)) ok("my-tesla pin");
else bad("my-tesla pin", "pin not bumped");
if (/html\[data-theme="light"\] \.lv-quiet \.lw:not\(\.lw-live\)/.test(liveCss) && /LIVE \/ Watch-live/.test(liveCss)) ok("live.css quiet lift");
else bad("live.css quiet lift", "missing light-theme quiet .lw rules");
const livePin = "live.css?v=202610191800";
if ([tesla, index, spacex, starship, myTeslaHtml].every((h) => h.includes(livePin))) ok("live.css pins");
else bad("live.css pins", "a live page still on 202610190630");
if (/theme\.css\?v=202610191800/.test(index)) ok("home theme pin");
else bad("home theme pin", "index.html theme.css pin");
if (/https:\/\/x\.com\/ALJR86/.test(tesla + updates + myTeslaHtml) && /twitter:site" content="@ALJR86"/.test(tesla)) ok("follow + site");
else bad("follow + site", "handle changed");
if (/ts\.la\/alex474841/.test(myTeslaHtml)) ok("referral");
else bad("referral", "affiliate changed");

fs.mkdirSync(SHOT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(BASE + "/tesla.html", { waitUntil: "domcontentloaded" });
const lede = await page.locator(".tz-lede").first().textContent();
if (lede && /owner and shareholder/.test(lede) && !/weekday/i.test(lede)) ok("tesla lede rendered");
else bad("tesla lede rendered", lede || "");
await page.waitForFunction(() => /compiled/.test(document.getElementById("tz-updated")?.textContent || ""), { timeout: 10000 });
const stamp = await page.locator("#tz-updated").textContent();
if (stamp && /FSD Europe compiled/.test(stamp) && /Teslascope/.test(stamp) && !/weekday/i.test(stamp)) ok("tesla stamp compiled");
else bad("tesla stamp compiled", stamp || "");
await page.locator(".tz-lede").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/leftover-copy-tesla-hero.png" });

await page.goto(BASE + "/updates.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => {
  const b = document.getElementById("t-new");
  return b && b.textContent && b.textContent !== "—";
}, { timeout: 10000 });
const tile = await page.locator(".sw-tile").first().innerText();
if (/newest reporting/i.test(tile) && !/newest build/i.test(tile)) ok("updates tile rendered");
else bad("updates tile rendered", tile || "");
const mycar = await page.locator("#mycar-out .lbl").first().textContent();
if (/Newest reporting in/.test(mycar || "") && !/Newest build/.test(mycar || "")) ok("updates mycar label");
else bad("updates mycar label", mycar || "");
await page.locator(".sw-now").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/leftover-copy-updates-tiles.png" });

await page.addInitScript(() => localStorage.setItem("sd-theme", "light"));
await page.goto(BASE + "/tesla.html", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".lv-quiet .lw");
const light = await page.evaluate(() => {
  const html = document.documentElement.getAttribute("data-theme");
  const card = document.querySelector(".lv-quiet .lw:not(.lw-live)");
  if (!card) return { html, bg: null };
  const bg = getComputedStyle(card).backgroundColor;
  const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  const lum = m ? (Number(m[1]) * 299 + Number(m[2]) * 587 + Number(m[3]) * 114) / 1000 : 0;
  const title = getComputedStyle(card.querySelector(".lw-title") || card).color;
  return { html, bg, lum, title, live: !!document.querySelector(".lw-live") };
});
if (light.html === "light" && light.lum > 180) ok("tesla quiet card lifts");
else bad("tesla quiet card lifts", JSON.stringify(light));
await page.locator(".lv-quiet .lw").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/leftover-copy-tesla-light.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/tesla.html", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".tz-lede");
await page.locator(".tz-lede").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/leftover-copy-tesla-mobile.png" });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
if (!overflow) ok("tesla no overflow 390");
else bad("tesla no overflow 390", "horizontal scroll");

await browser.close();
if (fail.length) {
  console.error("FAIL", fail.length, fail.join(" | "));
  process.exit(1);
}
console.log("ALL_PASS");
