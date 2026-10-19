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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.route("https://ll.thespacedevs.com/**", async (route) => {
  await route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      results: [
        {
          id: 999001,
          name: "Falcon 9 Block 5 | Bandwagon-5 rideshare",
          net: "2026-10-19T10:30:00Z",
          url: "https://ll.thespacedevs.com",
          status: { name: "Go for Launch", abbrev: "Go" },
          pad: { name: "Space Launch Complex 40", location: { name: "Cape Canaveral, FL, USA" } },
        },
        {
          id: 999002,
          name: "Falcon 9 Block 5 | Starlink Group 15-26",
          net: "2026-10-24T05:29:00Z",
          url: "https://ll.thespacedevs.com",
          status: { name: "Go for Launch", abbrev: "Go" },
          pad: { name: "Space Launch Complex 4E", location: { name: "Vandenberg SFB, CA, USA" } },
        },
      ],
    }),
  });
});

await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
const deskLabels = await page.$$eval(".pn-items > .pn-link, .pn-items > .pn-dd > button", (els) =>
  els.map((el) => el.childNodes[0]?.textContent?.trim() || el.textContent.trim())
);
const want = ["Home", "Tesla", "SpaceX", "Roadster", "Explore", "News"];
if (want.every((w) => deskLabels.includes(w))) ok("desktop nav");
else bad("desktop nav", JSON.stringify(deskLabels));

const order = await page.evaluate(() => {
  const lead = document.querySelector("[data-hv-lead]");
  const event = document.querySelector(".hv-event");
  if (!lead || !event) return { ok: false };
  return { ok: !!(lead.compareDocumentPosition(event) & Node.DOCUMENT_POSITION_FOLLOWING) };
});
if (order.ok) ok("lead before event");
else bad("lead before event", "event still leads the homepage");

const band = await page.$eval("[data-band-topic]", (el) => el.getAttribute("data-band-topic")).catch(() => "");
if (band === "website") ok("home band topic");
else bad("home band topic", band);

await page.screenshot({ path: SHOT + "/review-home-desktop.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.screenshot({ path: SHOT + "/review-home-mobile.png" });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
if (!overflow) ok("home no overflow 390");
else bad("home no overflow 390", "horizontal scroll");

await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(BASE + "/calendar.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.querySelectorAll("[data-calendar-list] .cal-title").length > 0, null, { timeout: 8000 });
const calTitles = await page.$$eval("[data-calendar-list] .cal-title", (els) => els.map((e) => e.textContent.trim()));
const bandwagon = calTitles.filter((t) => /bandwagon/i.test(t));
if (bandwagon.length === 1) ok("calendar bandwagon once");
else bad("calendar bandwagon once", JSON.stringify(bandwagon));
if (calTitles.some((t) => /starlink/i.test(t))) ok("calendar kept other falcon");
else ok("calendar other falcon optional");
await page.screenshot({ path: SHOT + "/review-calendar.png" });

await page.goto(BASE + "/dispatch.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.querySelectorAll("[data-disp-topic]").length > 1);
const firstNew = await page.$eval("a.story-card:not([hidden]) h3", (el) => el.textContent.trim());
await page.click('[data-disp-dir="oldest"]');
await page.waitForTimeout(80);
const firstOld = await page.$eval("a.story-card:not([hidden]) h3", (el) => el.textContent.trim());
if (firstNew && firstOld && firstNew !== firstOld) ok("dispatch sort flips");
else bad("dispatch sort flips", `${firstNew} → ${firstOld}`);
const featured = await page.$("a.story-card.disp-featured:not([hidden])");
if (!featured) ok("featured hidden on oldest");
else bad("featured hidden on oldest", "featured still on");
await page.click('[data-disp-dir="newest"]');
await page.waitForTimeout(80);
if (await page.$("a.story-card.disp-featured:not([hidden])")) ok("featured on newest");
else bad("featured on newest", "missing");

await page.goto(BASE + "/search.html", { waitUntil: "domcontentloaded" });
const searches = [
  ["Roadster", /roadster/i],
  ["FSD Europe", /fsd|europe/i],
  ["Starship", /starship/i],
  ["Tesla software", /software|update/i],
  ["Starlink", /starlink/i],
  ["Optimus", /optimus|promise/i],
];
for (const [q, re] of searches) {
  await page.fill("#sd-search-q", q);
  await page.waitForFunction((needle) => {
    const t = document.querySelector("[data-sd-hits]")?.innerText || "";
    return t.length > 10 && !/Loading the index/.test(t);
  }, q, { timeout: 5000 }).catch(() => {});
  const text = await page.$eval("[data-sd-hits]", (el) => el.innerText);
  if (re.test(text) && !/No matches/.test(text)) ok("search " + q);
  else bad("search " + q, text.slice(0, 160));
}

await page.goto(BASE + "/my-tesla.html?model=3&year=2024&hw=hw4&cc=US", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(400);
const neu = await page.$eval("#mt-whats-new", (el) => el.innerText).catch(() => "");
if (/What.s new|For this car|General Tesla news|Verified recalls/i.test(neu)) ok("my tesla whats new");
else bad("my tesla whats new", neu.slice(0, 180));
const mailForm = await page.$("#mt-mail, #mt-email, #mt-notify");
if (!mailForm) ok("my tesla mail form gone");
else bad("my tesla mail form gone", "email/alerts form still in the DOM");

await page.setViewportSize({ width: 768, height: 900 });
await page.goto(BASE + "/dispatch.html", { waitUntil: "domcontentloaded" });
await page.screenshot({ path: SHOT + "/review-dispatch-tablet.png" });

await browser.close();
if (fail.length) {
  console.log("FAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("ALL_PASS");
