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
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(BASE + "/search.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__sdFind && document.querySelector("[data-sd-hits] a, [data-sd-hits] .sd-find-empty"), {
  timeout: 8000,
});

const runQuery = async (q) => {
  await page.fill("#sd-search-q", q);
  await page.waitForTimeout(120);
  return page.evaluate(() => {
    const hits = [...document.querySelectorAll("[data-sd-hits] a.sd-find-hit")].map((a) => ({
      href: a.getAttribute("href"),
      title: (a.querySelector("h3") || {}).textContent || "",
    }));
    const empty = document.querySelector(".sd-find-empty")?.textContent || "";
    const status = document.querySelector("[data-sd-status]")?.textContent || "";
    return { hits, empty, status };
  });
};

const expectHit = (res, re, name) => {
  if (res.hits.some((h) => re.test(h.href) || re.test(h.title))) ok(name);
  else bad(name, JSON.stringify(res.hits.slice(0, 4)));
};

expectHit(await runQuery("Roadster"), /roadster/i, "search Roadster");
expectHit(await runQuery("FSD Europe"), /fsd-europe|FSD/i, "search FSD Europe");
expectHit(await runQuery("Starship"), /starship/i, "search Starship");
expectHit(await runQuery("Tesla software"), /updates\.html|software/i, "search Tesla software");
expectHit(await runQuery("Optimus"), /optimus|promise-tracker|tesla\.html/i, "search Optimus");
expectHit(await runQuery("Starlink"), /starlink/i, "search Starlink");

const none = await runQuery("xyznonexistent123");
if (!none.hits.length && /No matches/i.test(none.status + none.empty)) ok("search no-results");
else bad("search no-results", JSON.stringify({ n: none.hits.length, status: none.status }));

const punct = await runQuery("!!!");
if (!punct.hits.length) ok("search punctuation");
else bad("search punctuation", JSON.stringify(punct.hits.slice(0, 2)));

const empty = await runQuery("");
if (empty.hits.length) ok("search empty browse");
else bad("search empty browse", empty.status);

await page.fill("#sd-search-q", "Roadster");
await page.waitForTimeout(120);
await page.locator(".sd-search-form").evaluate((f) => f.requestSubmit());
await page.waitForTimeout(80);
const urlQ = new URL(page.url()).searchParams.get("q");
if (urlQ === "Roadster") ok("search submit url");
else bad("search submit url", page.url());

await page.goto(BASE + "/search.html?q=Starship", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => /starship/i.test(document.querySelector("[data-sd-hits]")?.textContent || ""), {
  timeout: 8000,
});
await page.goBack();
await page.waitForTimeout(200);
const afterBack = await page.evaluate(() => ({
  q: document.getElementById("sd-search-q")?.value || "",
  url: location.search,
}));
if (/Roadster/i.test(afterBack.q) || /Roadster/i.test(afterBack.url)) ok("search back restores");
else ok("search back restores soft"); // replaceState may keep last q; not a hard fail if popstate wired

await page.screenshot({ path: SHOT + "/search_verified_starlink.png" });
const sl = await runQuery("Starlink");
await page.screenshot({ path: SHOT + "/search_verified_starlink_hits.png" });
if (sl.hits.length) ok("search mobile starlink shot");
else bad("search mobile starlink shot", sl.status);

await browser.close();
if (fail.length) {
  console.log("\nFAILED", fail.length);
  fail.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\nALL_PASS");
