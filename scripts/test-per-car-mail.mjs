import fs from "fs";
import { cmpVer, newestByCountry, deltas, matchSoftware } from "../workers/sd-mail/newest.mjs";
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

const html = fs.readFileSync("my-tesla.html", "utf8");
const js = fs.readFileSync("my-tesla.js", "utf8");
const worker = fs.readFileSync("workers/sd-mail/sd-mail.js", "utf8");
const toml = fs.readFileSync("workers/sd-mail/wrangler.toml", "utf8");
const newsJs = fs.readFileSync("newsletter.js", "utf8");
const snap = JSON.parse(fs.readFileSync("updates-live.json", "utf8"));
const action = fs.readFileSync(".github/workflows/updates-snapshot.yml", "utf8");

if (/id="mt-email"/.test(html) && /Save alerts to Supercharged Daily/.test(html) && /not live/.test(html) && /Not Tesla/.test(html)) ok("my-tesla form copy");
else bad("my-tesla form copy", "missing email, save, or honest copy");
if (/my-tesla\.js\?v=202610191930/.test(html) && /my-tesla\.css\?v=202610191930/.test(html)) ok("pins");
else bad("pins", "my-tesla assets not bumped");
if (js.includes("sd-mail.superchargeddaily.workers.dev/mail") && !/api[_-]?key|BEEHIIV_/i.test(js)) ok("client posts to worker, no key");
else bad("client posts to worker, no key", "missing MAIL_URL or secret leaked");
if (!/api[_-]?key|BEEHIIV_/i.test(newsJs)) ok("newsletter still keyless");
else bad("newsletter still keyless", "secret leaked");
if (worker.includes("tesla_notify_software") && worker.includes("automations/") && worker.includes("delivery") && !worker.includes("BEEHIIV_API_KEY =")) ok("worker hook");
else bad("worker hook", "missing Beehiiv upsert/scan or a baked-in key");
if (toml.includes("aut_2a6b7603-cdd1-4bc1-9fef-64f509ca3dc3") && toml.includes("612db1a5b0784de39ceda04edba73ae4")) ok("wrangler ids");
else bad("wrangler ids", toml.slice(0, 200));
if (action.includes("sd-mail.superchargeddaily.workers.dev/scan") && action.includes("MAIL_SCAN_SECRET")) ok("snapshot ping");
else bad("snapshot ping", "workflow missing scan hook");
if (/https:\/\/x\.com\/ALJR86/.test(html) && /twitter:site" content="@ALJR86"/.test(html)) ok("follow + site");
else bad("follow + site", "handle changed");
if (/ts\.la\/alex474841/.test(html)) ok("referral");
else bad("referral", "affiliate changed");

const newest = newestByCountry(snap);
if (newest.US && newest.US.id === "2026.38.5.1" && newest.US.n > 0) ok("US newest reporting");
else bad("US newest reporting", JSON.stringify(newest.US || null));
if (!Object.values(newest).some((v) => v.id === snap.latest && !(snap.versions || []).find((x) => x.id === snap.latest && x.count > 0))) ok("skip ghost latest");
else bad("skip ghost latest", "zero-count latest leaked into newest map");
if (cmpVer("2026.38.5.1", "2026.32.100") > 0) ok("cmpVer");
else bad("cmpVer", "version order");

const seen = { US: { id: "2026.26.3" } };
const d = deltas(newest, seen);
if (d.find((x) => x.cc === "US" && x.previous === "2026.26.3")) ok("delta vs last-seen");
else bad("delta vs last-seen", JSON.stringify(d.filter((x) => x.cc === "US")));

const sub = {
  status: "active",
  custom_fields: [
    { name: "tesla_notify_software", value: true },
    { name: "tesla_country", value: "US" },
    { name: "tesla_software", value: "2026.26.3" },
  ],
};
if (matchSoftware(sub, "US", "2026.38.5.1") && !matchSoftware(sub, "DE", "2026.38.5.1")) ok("match country");
else bad("match country", "filter failed");
const current = {
  status: "active",
  custom_fields: [
    { name: "tesla_notify_software", value: true },
    { name: "tesla_country", value: "US" },
    { name: "tesla_software", value: "2026.38.5.1" },
  ],
};
if (!matchSoftware(current, "US", "2026.38.5.1")) ok("skip already-current");
else bad("skip already-current", "would mail a car already on the sample");

fs.mkdirSync(SHOT, { recursive: true });
const browser = await chromium.launch({ headless: true });

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.addInitScript(() => {
  localStorage.removeItem("sd-my-tesla-v1");
  localStorage.removeItem("sd-my-tesla-notify-v1");
  localStorage.removeItem("sd-my-tesla-mail-v1");
});
let posted = null;
await page.route("https://sd-mail.superchargeddaily.workers.dev/**", async (route) => {
  posted = JSON.parse(route.request().postData() || "{}");
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, saved: true, delivery: "not_live" }),
  });
});
await page.goto(BASE + "/my-tesla.html?model=3&year=2024&hw=hw4&cc=US", { waitUntil: "domcontentloaded" });
await page.waitForSelector("#mt-email", { timeout: 8000 });
const heading = await page.$eval("#mt-n-h", (el) => el.textContent);
if (/Alerts for this car/.test(heading)) ok("heading");
else bad("heading", heading);
await page.fill("#mt-email", "qa@example.com");
await page.check('[data-mt-n="software"]');
await page.click("#mt-mail-save");
await page.waitForTimeout(400);
const stamp = await page.$eval("#mt-notify-state", (el) => el.innerText);
if (/Saved to Supercharged Daily/.test(stamp) && /nothing is sent yet|not live/i.test(stamp) && !/emails are live/i.test(stamp)) ok("captured not live");
else bad("captured not live", stamp);
if (posted?.email === "qa@example.com" && posted?.country === "US" && posted?.model === "3" && posted?.notify?.software === true) ok("payload");
else bad("payload", JSON.stringify(posted));
await page.screenshot({ path: SHOT + "/per-car-mail-saved.png" });
await page.close();

const down = await browser.newPage({ viewport: { width: 390, height: 844 } });
await down.addInitScript(() => {
  localStorage.removeItem("sd-my-tesla-notify-v1");
  localStorage.removeItem("sd-my-tesla-mail-v1");
});
await down.route("https://sd-mail.superchargeddaily.workers.dev/**", async (route) => {
  await route.abort("failed");
});
await down.goto(BASE + "/my-tesla.html?model=Y&year=2025&hw=hw4&cc=DE", { waitUntil: "domcontentloaded" });
await down.fill("#mt-email", "qa@example.com");
await down.check('[data-mt-n="software"]');
await down.click("#mt-mail-save");
await down.waitForTimeout(400);
const downStamp = await down.$eval("#mt-notify-state", (el) => el.innerText);
if (/not live yet|nothing is sent/i.test(downStamp)) ok("hook down copy");
else bad("hook down copy", downStamp);
await down.screenshot({ path: SHOT + "/per-car-mail-mobile.png" });
await down.close();

const light = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await light.addInitScript(() => localStorage.setItem("sd-theme", "light"));
await light.goto(BASE + "/my-tesla.html?model=3&year=2024&hw=hw4&cc=US", { waitUntil: "domcontentloaded" });
await light.waitForSelector("#mt-email");
const card = await light.$eval("#mt-mail", (el) => el.closest(".mt-card").innerText);
if (/not live|nothing is sent/i.test(card) && /Software is the first mail hook/.test(card)) ok("light copy");
else bad("light copy", card.slice(0, 200));
await light.screenshot({ path: SHOT + "/per-car-mail-light.png" });
await light.close();

await browser.close();
if (fail.length) {
  console.log("FAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("ALL_PASS");
