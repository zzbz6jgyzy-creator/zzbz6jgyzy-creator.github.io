#!/usr/bin/env node
// Mobile Lighthouse + request counts for the five pages in the bundling brief.
import { spawnSync } from "child_process";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const BASE = process.env.BASE || "http://127.0.0.1:4173";
const LABEL = process.env.LH_LABEL || "run";
const OUT = process.env.LH_OUT || join("tmp", "lighthouse-" + LABEL);
const PAGES = [
  ["home", "/"],
  ["starship", "/starship.html"],
  ["starlink", "/starlink.html"],
  ["my-tesla", "/my-tesla.html"],
  ["updates", "/updates.html"],
];

mkdirSync(OUT, { recursive: true });
const chrome = process.env.CHROME || "/usr/local/bin/chrome";
const rows = [];

for (const [name, path] of PAGES) {
  const dest = join(OUT, name + ".json");
  const url = BASE.replace(/\/$/, "") + path;
  console.error("lighthouse", LABEL, name, url);
  const r = spawnSync(
    "npx",
    [
      "--yes",
      "lighthouse@13.0.1",
      url,
      "--only-categories=performance,accessibility,best-practices,seo",
      "--form-factor=mobile",
      "--screenEmulation.mobile",
      "--throttling-method=simulate",
      "--output=json",
      "--output-path=" + dest,
      "--quiet",
      "--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage --disable-gpu",
      "--chrome-path=" + chrome,
    ],
    { encoding: "utf8", timeout: 180000 }
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error("lighthouse failed for " + name);
  }
  const lh = JSON.parse(readFileSync(dest, "utf8"));
  const cats = lh.categories || {};
  const audits = lh.audits || {};
  const reqs = (audits["network-requests"] && audits["network-requests"].details && audits["network-requests"].details.items) || [];
  const jsReqs = reqs.filter((i) => /javascript|\.js(\?|$)/i.test((i.resourceType || "") + " " + (i.url || "")));
  const firstPartyJs = jsReqs.filter((i) => {
    const u = i.url || "";
    return !/cloudflareinsights|twitter\.com|googletag|doubleclick|cesium|jsdelivr|tradingview/i.test(u);
  });
  const row = {
    page: name,
    path,
    perf: Math.round((cats.performance?.score || 0) * 100),
    a11y: Math.round((cats.accessibility?.score || 0) * 100),
    seo: Math.round((cats.seo?.score || 0) * 100),
    lcp: Math.round(audits["largest-contentful-paint"]?.numericValue || 0),
    cls: Number((audits["cumulative-layout-shift"]?.numericValue || 0).toFixed(3)),
    tbt: Math.round(audits["total-blocking-time"]?.numericValue || 0),
    requests: reqs.length,
    jsRequests: jsReqs.length,
    firstPartyJs: firstPartyJs.length,
    firstPartyJsUrls: firstPartyJs.map((i) => (i.url || "").replace(BASE, "")),
  };
  rows.push(row);
  console.log(JSON.stringify(row));
}

writeFileSync(join(OUT, "summary.json"), JSON.stringify(rows, null, 2) + "\n");
console.log("\n# " + LABEL);
console.log("| Page | Perf | A11y | SEO | LCP (ms) | CLS | TBT (ms) | Requests | JS | First-party JS |");
console.log("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
for (const r of rows) {
  console.log(
    `| ${r.page} | ${r.perf} | ${r.a11y} | ${r.seo} | ${r.lcp} | ${r.cls} | ${r.tbt} | ${r.requests} | ${r.jsRequests} | ${r.firstPartyJs} |`
  );
}
