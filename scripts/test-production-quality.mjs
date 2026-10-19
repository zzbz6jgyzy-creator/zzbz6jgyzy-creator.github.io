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

const pages = ["index.html", "calendar.html", "search.html", "dispatch.html", "news.html", "my-tesla.html", "see-the-launch.html"];
for (const p of pages) {
  const html = fs.readFileSync(p, "utf8");
  if (/twitter:site" content="@ALJR86"/.test(html) || /twitter:site" content="@ALJR86"/.test(html)) ok(`twitter ${p}`);
  else if (p === "search.html" && /twitter:site/.test(html)) ok(`twitter ${p}`);
  else {
    const has = /twitter:site" content="@ALJR86"/.test(html);
    if (has) ok(`twitter ${p}`);
    else bad(`twitter ${p}`, "site handle");
  }
  if (/rel="canonical"/.test(html)) ok(`canonical ${p}`);
  else bad(`canonical ${p}`, "missing");
}

const sitemap = fs.readFileSync("sitemap.xml", "utf8");
if (sitemap.includes("https://superchargeddaily.com/") && sitemap.includes("see-the-launch.html") && !sitemap.includes("/search.html"))
  ok("sitemap keep + noindex search out");
else bad("sitemap keep + noindex search out", "search should stay out of sitemap");

const browser = await chromium.launch({ headless: true });

const home = await browser.newPage({ viewport: { width: 390, height: 844 } });
await home.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await home.waitForSelector(".lw-title", { timeout: 8000 });
const homeTitle = (await home.locator(".lw-title").first().textContent()) || "";
const homeWhen = (await home.locator(".lw-when").first().textContent()) || "";
if (/Bandwagon/i.test(homeTitle) && /Oct 20|20 Oct|Tue 20/i.test(homeWhen + homeTitle)) ok("home Bandwagon Tue");
else bad("home Bandwagon Tue", `${homeTitle} | ${homeWhen}`);
const homeOverflow = await home.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
if (!homeOverflow) ok("home no horizontal scroll");
else bad("home no horizontal scroll", "overflow");
await home.screenshot({ path: SHOT + "/home_bandwagon_mobile.png" });

const cal = await browser.newPage({ viewport: { width: 1100, height: 900 } });
await cal.route("https://ll.thespacedevs.com/**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      results: [
        {
          id: "999001",
          name: "Falcon 9 Block 5 | Bandwagon 5 (Dedicated Mid-Inclination Rideshare)",
          net: "2026-10-19T10:30:00Z",
          url: "https://ll.thespacedevs.com",
          status: { name: "Go for Launch", abbrev: "Go" },
          pad: { name: "Space Launch Complex 40", location: { name: "Cape Canaveral, FL, USA" } },
        },
      ],
    }),
  })
);
await cal.goto(BASE + "/calendar.html", { waitUntil: "domcontentloaded" });
await cal.waitForFunction(() => /Bandwagon/i.test(document.body.innerText), { timeout: 8000 });
const bandRows = await cal.$$eval(".cal-row", (els) =>
  els.filter((el) => /bandwagon/i.test(el.textContent || "")).map((el) => el.textContent)
);
if (bandRows.length === 1) ok("calendar Bandwagon once");
else bad("calendar Bandwagon once", String(bandRows.length));
const whenTxt = await cal.$eval(".cal-row", (el) => {
  const hit = [...el.ownerDocument.querySelectorAll(".cal-row")].find((r) => /bandwagon/i.test(r.textContent || ""));
  return hit ? (hit.querySelector(".cal-when strong") || {}).textContent || "" : "";
});
if (/20 Oct/.test(whenTxt) && !/19 Oct/.test(whenTxt)) ok("calendar Bandwagon Tue");
else bad("calendar Bandwagon Tue", whenTxt);
await cal.screenshot({ path: SHOT + "/calendar_bandwagon_once.png" });

const news = await browser.newPage({ viewport: { width: 390, height: 844 } });
await news.goto(BASE + "/", { waitUntil: "domcontentloaded" });
const form = news.locator("[data-newsletter-form]").first();
if (await form.count()) {
  const required = await form.locator("input[name='email']").first().evaluate((el) => !!el.required);
  const href = await news.evaluate(() => !!document.querySelector('script[src*="newsletter.js"]') || !!document.querySelector('script[src*="grow.js"]'));
  if (required && href) ok("newsletter required + beehiiv hook");
  else bad("newsletter required + beehiiv hook", JSON.stringify({ required, href }));
} else bad("newsletter required + beehiiv hook", "no form");

const my = await browser.newPage({ viewport: { width: 390, height: 844 } });
await my.goto(BASE + "/my-tesla.html", { waitUntil: "domcontentloaded" });
const empty = await my.locator("#mt-empty").textContent();
if (empty && /Pick a model and a country first/.test(empty) && !/Ireland/.test(empty)) ok("my tesla empty copy");
else bad("my tesla empty copy", empty || "");
const body = await my.locator("body").innerText();
const mailCount = await my.locator("#mt-mail, #mt-email, #mt-notify").count();
if (mailCount === 0 && !/Save alerts to Supercharged Daily/.test(body)) ok("my tesla mail gone");
else bad("my tesla mail gone", `count=${mailCount} body=${body.slice(0, 160)}`);

await browser.close();
if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
