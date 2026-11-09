import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import vm from "node:vm";
import { createRequire } from "node:module";
import { buildEventPages } from "../scripts/build-event-pages.mjs";
const require = createRequire(import.meta.url), shared = require("../scripts/event-shared.cjs");
const events = JSON.parse(fs.readFileSync("data/events.json", "utf8")).events;

function sandbox() {
  // A copy of only what the builder reads, so the test never touches the real pages.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "event-pages-"));
  fs.mkdirSync(path.join(dir, "data/event-pages"), { recursive: true });
  for (const f of ["data/events.json", "data/articles.json", "editorial.html", "starship-flight-15.html"]) fs.copyFileSync(f, path.join(dir, f));
  for (const f of fs.readdirSync("data/event-pages")) fs.copyFileSync(path.join("data/event-pages", f), path.join(dir, "data/event-pages", f));
  return dir;
}

test("saved event pages match the builder and a second build changes nothing", () => {
  const dir = sandbox();
  try {
    buildEventPages(dir);
    const first = fs.readFileSync(path.join(dir, "starship-flight-15.html"), "utf8");
    buildEventPages(dir);
    assert.equal(fs.readFileSync(path.join(dir, "starship-flight-15.html"), "utf8"), first);
    const saved = fs.readFileSync("starship-flight-15.html", "utf8");
    const strip = (h) => h.replace(/<!--sd:bundles-->[\s\S]*?<!--\/sd:bundles-->/, "");
    assert.equal(strip(first), strip(saved), "run node scripts/build-event-pages.mjs and commit the page");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("the launch time has one source: data/events.json", () => {
  const html = fs.readFileSync("starship-flight-15.html", "utf8"), home = fs.readFileSync("index.html", "utf8");
  const start = new Date(events["starship-flight-15"].start).toISOString();
  assert.ok(html.includes(`data-start="${start}"`));
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).flat();
  const ev = ld.flat().find((x) => x["@type"] === "Event");
  assert.equal(ev.startDate, events["starship-flight-15"].start);
  assert.equal(ev.endDate, events["starship-flight-15"].end);
  assert.ok(ld.flat().some((x) => x["@type"] === "BreadcrumbList"));
  for (const k of ["name", "description", "location", "organizer", "image", "eventStatus"]) assert.ok(ev[k], k);
  // While the page is featured, the homepage strip uses the same start time.
  if (shared.activeFeature(".", Date.now())) assert.ok(home.includes(`data-start="${start}"`));
});

test("head has standard title, description, canonical, og and twitter tags", () => {
  const html = fs.readFileSync("starship-flight-15.html", "utf8");
  assert.equal((html.match(/<title>/g) || []).length, 1);
  for (const re of [/<meta name="description" content="[^"]{60,}"/, /<link rel="canonical" href="https:\/\/superchargeddaily\.com\/starship-flight-15\.html"/,
    /<meta property="og:image" content="https:\/\/superchargeddaily\.com\/assets\/og\/starship-flight-15\.jpg"/, /<meta name="twitter:card" content="summary_large_image"/])
    assert.match(html, re);
  assert.ok(fs.existsSync("assets/og/starship-flight-15.jpg"));
  assert.doesNotMatch(html, /(name|property)="meta-/);
});

test("countdown shows window open, then the after label, from the saved markup", () => {
  const src = fs.readFileSync("event-countdown.js", "utf8");
  const el = { attrs: { "data-start": "2026-11-13T22:45:00.000Z", "data-end": "2026-11-14T00:00:00.000Z", "data-after-sub": "closed" }, kids: {},
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, setAttribute(k, v) { this.attrs[k] = String(v); }, hasAttribute(k) { return k in this.attrs; },
    querySelector(s) { return this.kids[s] || (this.kids[s] = { textContent: s === "[data-cd-time]" ? "13 Nov, 22:45 UTC" : "" }); } };
  const ctx = { window: {}, document: { readyState: "complete", querySelectorAll: () => [] }, setInterval() {}, Date };
  vm.runInNewContext(src, ctx);
  const { render } = ctx.window.SDCountdown;
  render(el, Date.parse("2026-11-13T22:44:00Z")); assert.equal(el.attrs["data-cd-state"], "before"); assert.equal(el.kids["[data-cd-time]"].textContent, "00:01:00");
  render(el, Date.parse("2026-11-13T23:00:00Z")); assert.equal(el.attrs["data-cd-state"], "open"); assert.match(el.kids["[data-cd-label]"].textContent, /window open/);
  render(el, Date.parse("2026-11-14T01:00:00Z")); assert.equal(el.attrs["data-cd-state"], "after"); assert.equal(el.kids["[data-cd-time]"].textContent, "13 Nov, 22:45 UTC");
});
