import fs from "fs";
import path from "path";
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
const newsJs = fs.readFileSync("newsletter.js", "utf8");
const action = fs.readFileSync(".github/workflows/updates-snapshot.yml", "utf8");
const repoText = [
  html,
  js,
  newsJs,
  action,
  fs.readFileSync("updates.html", "utf8"),
].join("\n");

if (!fs.existsSync("workers/sd-mail")) ok("sd-mail worker removed");
else bad("sd-mail worker removed", "workers/sd-mail still on disk");

if (!/id="mt-email"|id="mt-mail"|id="mt-notify"|Save alerts to Supercharged Daily|Alerts for this car/.test(html)) ok("my-tesla form gone");
else bad("my-tesla form gone", "email/alerts markup still in my-tesla.html");
if (/This profile never leaves the device/.test(html)) ok("profile stays local");
else bad("profile stays local", "missing never-leaves-device copy");
if (/my-tesla\.js\?v=202610192500/.test(html) && /my-tesla\.css\?v=202610191930/.test(html)) ok("pins");
else bad("pins", "my-tesla assets not bumped");

if (!/sd-mail|MAIL_URL|MAIL_KEY|NOTIFY_KEY|sd-my-tesla-mail-v1|sd-my-tesla-notify-v1/.test(js)) ok("client has no mail hook");
else bad("client has no mail hook", "mail constants or sd-mail URL remain");
if (!/api[_-]?key|BEEHIIV_|reactivate_existing/i.test(js)) ok("client no beehiiv secret");
else bad("client no beehiiv secret", "secret or reactivate flag leaked");

if (/alexs-newsletter-84b17e\.beehiiv\.com/.test(newsJs) && /location\.href/.test(newsJs) && !/api[_-]?key|BEEHIIV_|reactivate_existing/i.test(newsJs)) ok("newsletter still keyless");
else bad("newsletter still keyless", "Sunday signup changed");

if (!/sd-mail|MAIL_SCAN_SECRET/.test(action)) ok("snapshot ping gone");
else bad("snapshot ping gone", "workflow still pings sd-mail");

const walk = (dir, acc = []) => {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".tmp-shots") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(js|mjs|html|yml|toml|css)$/.test(name)) acc.push(p);
  }
  return acc;
};
const reactivateHits = walk(".").filter((p) => {
  if (p.includes("test-per-car-mail")) return false;
  return fs.readFileSync(p, "utf8").includes("reactivate_existing");
});
if (!reactivateHits.length) ok("no reactivate_existing");
else bad("no reactivate_existing", reactivateHits.join(", "));
const mailHits = walk(".").filter((p) => {
  if (p.includes("test-per-car-mail") || p.includes("SUPERCHARGED_") || p.includes("TRANSFORMATION") || p.includes("data/README") || p.includes("IMPROVEMENTS")) return false;
  return /sd-mail\.superchargeddaily|workers\/sd-mail/.test(fs.readFileSync(p, "utf8"));
});
if (!mailHits.length) ok("no live sd-mail callers");
else bad("no live sd-mail callers", mailHits.join(", "));

if (/https:\/\/x\.com\/ALJR86/.test(html) && /twitter:site" content="@ALJR86"/.test(html)) ok("follow + site");
else bad("follow + site", "handle changed");
if (/ts\.la\/alex474841/.test(html)) ok("referral");
else bad("referral", "affiliate changed");
if (!/reactivate_existing/.test(repoText)) ok("html/js workflow no reactivate");
else bad("html/js workflow no reactivate", "flag still present");

fs.mkdirSync(SHOT, { recursive: true });
const browser = await chromium.launch({ headless: true });

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.addInitScript(() => {
  localStorage.removeItem("sd-my-tesla-v1");
  localStorage.removeItem("sd-my-tesla-notify-v1");
  localStorage.removeItem("sd-my-tesla-mail-v1");
});
let mailed = false;
await page.route("https://sd-mail.superchargeddaily.workers.dev/**", async (route) => {
  mailed = true;
  await route.abort("failed");
});
await page.goto(BASE + "/my-tesla.html?model=3&year=2024&hw=hw4&cc=US", { waitUntil: "domcontentloaded" });
await page.waitForSelector("#mt-dash", { timeout: 8000 });
const hidden = await page.$eval("#mt-dash", (el) => el.hidden);
if (!hidden) ok("dashboard shown");
else bad("dashboard shown", "dash stayed hidden");
const stamp = await page.$eval("#mt-live", (el) => el.innerText);
if (/never uploaded/.test(stamp)) ok("never uploaded stamp");
else bad("never uploaded stamp", stamp);
const form = await page.$("#mt-mail, #mt-email, #mt-notify, #mt-mail-save");
if (!form) ok("no mail form in browser");
else bad("no mail form in browser", "form still rendered");
const feat = await page.$eval("#mt-feats", (el) => el.innerText);
if (feat && feat.length > 20) ok("features still render");
else bad("features still render", feat.slice(0, 120));
if (!mailed) ok("no sd-mail fetch");
else bad("no sd-mail fetch", "client still posted");
await page.screenshot({ path: SHOT + "/per-car-mail-removed.png" });
await page.close();

const down = await browser.newPage({ viewport: { width: 390, height: 844 } });
await down.goto(BASE + "/my-tesla.html?model=Y&year=2025&hw=hw4&cc=DE", { waitUntil: "domcontentloaded" });
await down.waitForSelector("#mt-dash");
const downForm = await down.$("#mt-email");
if (!downForm) ok("mobile no email");
else bad("mobile no email", "email field on phone");
const downDash = await down.$eval("#mt-dash", (el) => !el.hidden);
if (downDash) ok("mobile dashboard");
else bad("mobile dashboard", "dash hidden on phone");
await down.screenshot({ path: SHOT + "/per-car-mail-mobile.png" });
await down.close();

const light = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await light.addInitScript(() => localStorage.setItem("sd-theme", "light"));
await light.goto(BASE + "/my-tesla.html?model=3&year=2024&hw=hw4&cc=US", { waitUntil: "domcontentloaded" });
await light.waitForSelector("#mt-dash");
const lightBody = await light.$eval("body", (el) => el.innerText);
if (!/Save alerts to Supercharged Daily|Alerts for this car/.test(lightBody)) ok("light copy");
else bad("light copy", lightBody.slice(0, 200));
await light.screenshot({ path: SHOT + "/per-car-mail-light.png" });
await light.close();

await browser.close();
if (fail.length) {
  console.log("FAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("ALL_PASS");
