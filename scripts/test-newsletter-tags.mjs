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

const js = await (await fetch(BASE + "/newsletter.js?v=202610190800")).text();
if (js.includes("utm_content=") && js.includes('"roadster"') && js.includes('"tesla-software"') && js.includes('"spacex"') && js.includes('"website"')) ok("newsletter topics");
else bad("newsletter topics", "missing allowlist or utm_content");
if (js.includes('querySelector(".art-tag")') && !js.includes(".art-tag, .tag")) ok("path-first topic");
else bad("path-first topic", "still reads story-card .tag");
if (!/api[_-]?key|BEEHIIV_/i.test(js)) ok("no api key");
else bad("no api key", "secret leaked");

const grow = await (await fetch(BASE + "/grow.js?v=202610190800")).text();
if (grow.includes('["website"') && grow.includes("/newsletter.js?v=202610190800") && !grow.includes(".art-tag, .tag")) ok("grow website topic");
else bad("grow website topic", "still default, old pin, or story-card .tag");

const home = await (await fetch(BASE + "/index.html")).text();
if (home.includes('data-band-topic="website"') && home.includes("https://x.com/ALJR86")) ok("home topic + follow");
else bad("home topic + follow", "missing topic or handle");

const capture = async (browser, path, email = "qa@example.com", shot) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let dest = "";
  await page.route("**/*beehiiv.com/**", async (route) => {
    dest = route.request().url();
    await route.abort();
  });
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-newsletter-form] input[type=email]", { timeout: 8000 });
  const topic = await page.$eval("[data-band-topic]", (el) => el.getAttribute("data-band-topic")).catch(() => "");
  await page.locator("[data-newsletter-form]").first().scrollIntoViewIfNeeded();
  const follow = await page.$eval('a[href="https://x.com/ALJR86"]', (el) => el.getAttribute("href")).catch(() => "");
  if (shot) await page.screenshot({ path: shot });
  await page.fill("[data-newsletter-form] input[type=email]", email);
  await page.click("[data-newsletter-form] button[type=submit]");
  await page.waitForTimeout(300);
  const u = new URL(dest || "https://alexs-newsletter-84b17e.beehiiv.com/");
  return {
    page,
    href: dest,
    email: u.searchParams.get("email"),
    source: u.searchParams.get("utm_source"),
    medium: u.searchParams.get("utm_medium"),
    campaign: u.searchParams.get("utm_campaign"),
    content: u.searchParams.get("utm_content"),
    topic,
    follow,
  };
};

const browser = await chromium.launch({ headless: true });

const homeGo = await capture(browser, "/index.html", "qa@example.com", SHOT + "/newsletter-tags-home.png");
if (homeGo.email === "qa@example.com" && homeGo.source === "website" && homeGo.content === "website" && homeGo.medium === "site-band") ok("home utm");
else bad("home utm", JSON.stringify({ ...homeGo, page: undefined }));
if (homeGo.follow === "https://x.com/ALJR86") ok("follow on X");
else bad("follow on X", String(homeGo.follow));
await homeGo.page.close();

const road = await capture(browser, "/roadster.html", "qa@example.com", SHOT + "/newsletter-tags-roadster.png");
if (road.content === "roadster" && road.topic === "roadster") ok("roadster tag");
else bad("roadster tag", JSON.stringify({ ...road, page: undefined }));
await road.page.close();

const tesla = await capture(browser, "/tesla.html", "qa@example.com", SHOT + "/newsletter-tags-tesla.png");
if (tesla.content === "tesla" && tesla.topic === "tesla") ok("tesla tag");
else bad("tesla tag", JSON.stringify({ ...tesla, page: undefined }));
await tesla.page.close();

const soft = await capture(browser, "/my-tesla.html", "qa@example.com", SHOT + "/newsletter-tags-my-tesla.png");
if (soft.content === "tesla-software" && soft.topic === "tesla-software") ok("tesla-software tag");
else bad("tesla-software tag", JSON.stringify({ ...soft, page: undefined }));
await soft.page.close();

const sx = await capture(browser, "/spacex.html", "qa@example.com", SHOT + "/newsletter-tags-spacex.png");
if (sx.content === "spacex" && sx.topic === "spacex") ok("spacex tag");
else bad("spacex tag", JSON.stringify({ ...sx, page: undefined }));

const honeyPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
let honeyDest = "";
await honeyPage.route("**/*beehiiv.com/**", async (route) => {
  honeyDest = route.request().url();
  await route.abort();
});
await honeyPage.goto(BASE + "/spacex.html", { waitUntil: "domcontentloaded" });
await honeyPage.waitForSelector("[data-newsletter-form] input[type=email]");
await honeyPage.fill("[data-newsletter-form] input[type=email]", "qa@example.com");
await honeyPage.evaluate(() => {
  document.querySelector("[data-newsletter-form] input[name=website]").value = "http://spam.example";
});
await honeyPage.click("[data-newsletter-form] button[type=submit]");
await honeyPage.waitForTimeout(300);
if (!honeyDest) ok("honeypot");
else bad("honeypot", honeyDest);

await honeyPage.close();
await sx.page.close();
await browser.close();
if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
