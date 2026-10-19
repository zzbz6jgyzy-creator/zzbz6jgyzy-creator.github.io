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

const seeHtml = fs.readFileSync("see-the-launch.html", "utf8");
const clubsHtml = fs.readFileSync("tesla-clubs.html", "utf8");
const seeJs = fs.readFileSync("see-the-launch.js", "utf8");
const clubsJs = fs.readFileSync("tesla-clubs.js", "utf8");
const slJs = fs.readFileSync("starlink-identify.js", "utf8");
const slHtml = fs.readFileSync("starlink.html", "utf8");

if (!/Ireland, the UK/.test(seeHtml) && /Search a city, tap a nearby pad town, or use this device\./.test(seeHtml))
  ok("see copy");
else bad("see copy", "Ireland/UK guess sentence still on Can I see it?");
if (!/Ireland, the UK/.test(clubsHtml) && /Search a town or city, or use this device\./.test(clubsHtml)) ok("clubs copy");
else bad("clubs copy", "Ireland/UK guess sentence still on clubs");
if (!/we will not guess/.test(seeJs) && !/we will not guess/.test(slJs)) ok("no guess hint");
else bad("no guess hint", "blocked-location copy still says we will not guess");
if (/see-the-launch\.js\?v=202610191945/.test(seeHtml)) ok("see pin");
else bad("see pin", "see-the-launch.js pin");
if (/tesla-clubs\.js\?v=202610191945/.test(clubsHtml)) ok("clubs pin");
else bad("clubs pin", "tesla-clubs.js pin");
if (/starlink-identify\.js\?v=202610191945/.test(slHtml)) ok("starlink pin");
else bad("starlink pin", "starlink-identify.js pin");
if (/inAppBrowser/.test(seeJs) && /GEO_OPTS/.test(seeJs) && /matchCity/.test(seeJs)) ok("see geo helpers");
else bad("see geo helpers", "missing in-app / timeout / city match");
if (/inAppBrowser/.test(clubsJs) && /GEO_OPTS/.test(clubsJs)) ok("clubs geo helpers");
else bad("clubs geo helpers", "missing in-app / timeout");
if (/https:\/\/x\.com\/ALJR86/.test(seeHtml) && /twitter:site" content="@ALJR86"/.test(seeHtml)) ok("follow + site");
else bad("follow + site", "handle changed");

fs.mkdirSync(SHOT, { recursive: true });
const browser = await chromium.launch({ headless: true });

const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(() => {
  try {
    localStorage.removeItem("sd-see-launch-v1");
  } catch {}
});
await page.route("https://geocoding-api.open-meteo.com/**", (route) => route.abort());
await page.route("https://api.open-meteo.com/**", (route) => route.abort());
await page.route("https://seasonal-api.open-meteo.com/**", (route) => route.abort());
await page.route("https://ll.thespacedevs.com/**", (route) => route.abort());
await page.goto(BASE + "/see-the-launch.html", { waitUntil: "domcontentloaded" });

const sub = await page.locator(".see-sub").first().textContent();
if (sub && /Search a city/.test(sub) && !/Ireland|UK|guess/i.test(sub)) ok("see sub rendered");
else bad("see sub rendered", sub || "");

await page.fill("#see-q", "Brownsville, Texas");
await page.waitForFunction(() => {
  const box = document.getElementById("see-suggest");
  return box && !box.hidden && /Brownsville/.test(box.textContent || "");
}, { timeout: 4000 });
const localSuggest = await page.locator("#see-suggest").innerText();
if (/Brownsville/.test(localSuggest)) ok("local suggest");
else bad("local suggest", localSuggest);

await page.locator("#see-q").press("Enter");
await page.waitForFunction(() => {
  const dash = document.getElementById("see-dash");
  const hint = document.getElementById("see-hint")?.textContent || "";
  return dash && !dash.hidden && /Brownsville/.test(hint);
}, { timeout: 4000 });
const applied = await page.evaluate(() => ({
  hint: document.getElementById("see-hint")?.textContent || "",
  empty: document.getElementById("see-empty")?.hidden,
  dash: !document.getElementById("see-dash")?.hidden,
  chip: document.querySelector('.see-chip.is-on')?.textContent || "",
}));
if (applied.dash && applied.empty && /Brownsville/.test(applied.hint) && applied.chip === "Brownsville")
  ok("enter applies Brownsville");
else bad("enter applies Brownsville", JSON.stringify(applied));
await page.locator("#see-loc-h").scrollIntoViewIfNeeded();
await page.screenshot({ path: SHOT + "/see-location-brownsville-enter.png" });

await page.click("#see-clear");
await page.evaluate(() => {
  navigator.geolocation.getCurrentPosition = (_ok, err) => err({ code: 1, message: "denied" });
});
await page.click("#see-geo");
const denied = await page.locator("#see-hint").textContent();
if (/Location is off or blocked/.test(denied || "") && !/guess/i.test(denied || "")) ok("geo deny copy");
else bad("geo deny copy", denied || "");
await page.screenshot({ path: SHOT + "/see-location-geo-deny.png" });

await page.evaluate(() => {
  navigator.geolocation.getCurrentPosition = (success) =>
    success({ coords: { latitude: 25.9017, longitude: -97.4975 } });
});
await page.click("#see-geo");
await page.waitForFunction(() => /Your location/.test(document.getElementById("see-hint")?.textContent || ""), {
  timeout: 4000,
});
const geoOk = await page.evaluate(() => ({
  hint: document.getElementById("see-hint")?.textContent || "",
  dash: !document.getElementById("see-dash")?.hidden,
}));
if (geoOk.dash && /Your location/.test(geoOk.hint) && /25\.90/.test(geoOk.hint)) ok("geo success immediate");
else bad("geo success immediate", JSON.stringify(geoOk));
await page.screenshot({ path: SHOT + "/see-location-geo-ok.png" });
await page.close();

const xpage = await browser.newPage({
  viewport: { width: 390, height: 844 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22A335 Twitter for iPhone",
});
await xpage.addInitScript(() => {
  try {
    localStorage.removeItem("sd-see-launch-v1");
  } catch {}
});
await xpage.route("https://geocoding-api.open-meteo.com/**", (route) => route.abort());
await xpage.route("https://api.open-meteo.com/**", (route) => route.abort());
await xpage.route("https://seasonal-api.open-meteo.com/**", (route) => route.abort());
await xpage.route("https://ll.thespacedevs.com/**", (route) => route.abort());
await xpage.addInitScript(() => {
  navigator.geolocation.getCurrentPosition = (_ok, err) => err({ code: 1, message: "denied" });
});
await xpage.goto(BASE + "/see-the-launch.html", { waitUntil: "domcontentloaded" });
await xpage.click("#see-geo");
const inApp = await xpage.locator("#see-hint").textContent();
if (/in-app browser/.test(inApp || "") && /Safari or Chrome/.test(inApp || "") && !/guess/i.test(inApp || ""))
  ok("x in-app hint");
else bad("x in-app hint", inApp || "");
await xpage.locator("#see-loc-h").scrollIntoViewIfNeeded();
await xpage.screenshot({ path: SHOT + "/see-location-x-in-app.png" });
await xpage.close();

await browser.close();
if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
