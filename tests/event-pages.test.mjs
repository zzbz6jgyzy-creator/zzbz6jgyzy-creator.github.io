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

test("calendar: a deterministic .ics next to the page and a Google Calendar link with the same times", () => {
  const dir = sandbox();
  try {
    buildEventPages(dir);
    const ics = fs.readFileSync(path.join(dir, "starship-flight-15.ics"), "utf8");
    buildEventPages(dir);
    assert.equal(fs.readFileSync(path.join(dir, "starship-flight-15.ics"), "utf8"), ics, "a rebuild must not change the .ics");
    assert.equal(ics, fs.readFileSync("starship-flight-15.ics", "utf8"), "run node scripts/build-event-pages.mjs and commit the .ics");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  const ev = events["starship-flight-15"], ics = fs.readFileSync("starship-flight-15.ics", "utf8");
  const stamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  assert.match(ics, new RegExp(`\\r\\nDTSTART:${stamp(ev.start)}\\r\\n`));
  assert.match(ics, new RegExp(`\\r\\nDTEND:${stamp(ev.end)}\\r\\n`));
  assert.match(ics, /\r\nUID:starship-flight-15@superchargeddaily\.com\r\n/);
  assert.match(ics, /BEGIN:VALARM[\s\S]*TRIGGER:-PT30M[\s\S]*END:VALARM/);
  for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75, "fold at 75 octets: " + line);
  const html = fs.readFileSync("starship-flight-15.html", "utf8");
  assert.match(html, /<a href="\/starship-flight-15\.ics" download>Add to calendar<\/a>/);
  const g = html.match(/href="(https:\/\/calendar\.google\.com\/calendar\/render\?[^"]+)"/);
  assert.ok(g, "Google Calendar link");
  assert.equal(new URL(g[1].replace(/&amp;/g, "&")).searchParams.get("dates"), `${stamp(ev.start)}/${stamp(ev.end)}`);
});

test("updates log carries what event-live.js needs, and timed entries sort and render with their time", () => {
  const html = fs.readFileSync("starship-flight-15.html", "utf8");
  const log = html.match(/<ol class="ev-log"([^>]*)>/)[1];
  for (const k of ["data-ev-log", 'data-ev-src="/data/event-pages/starship-flight-15.json"', 'data-ev-event="starship-flight-15"', "data-ev-latest=", "data-ev-count=", "data-ev-start="]) assert.ok(log.includes(k), k);
  // script.js (core bundle) rewrites every [data-count] element as a number; on the log that wiped the whole list.
  assert.doesNotMatch(log, /\sdata-(count|start|src|latest|event)=/);
  assert.doesNotMatch(fs.readFileSync("event-live.js", "utf8"), /"data-count"/);
  assert.match(html, /<p class="ev-fresh" data-ev-fresh hidden role="status">/);
  const dir = sandbox();
  try {
    const f = path.join(dir, "data/event-pages/starship-flight-15.json"), p = JSON.parse(fs.readFileSync(f, "utf8"));
    p.updates.push({ date: "2026-11-13", time: "2026-11-13T22:47:00Z", kind: "Disclosed", text: "Lift-off.", source: "https://www.spacex.com/" });
    fs.writeFileSync(f, JSON.stringify(p));
    buildEventPages(dir);
    const out = fs.readFileSync(path.join(dir, "starship-flight-15.html"), "utf8");
    const first = out.match(/<ol class="ev-log"[^>]*><li>([\s\S]*?)<\/li>/)[1];
    assert.match(first, /<time datetime="2026-11-13T22:47:00Z">13 Nov 2026, 22:47 UTC<\/time>/);
    assert.match(out, /data-ev-latest="2026-11-13T22:47:00Z"/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test(".ics folds by octets without splitting characters, and update times must be UTC", () => {
  const dir = sandbox();
  try {
    const f = path.join(dir, "data/event-pages/starship-flight-15.json"), p = JSON.parse(fs.readFileSync(f, "utf8"));
    p.windowNote = "75-minute window · pending regulatory approval · SpaceX’s “best effort” – timing ✓ ".repeat(3);
    p.location.name = "Starbase – Texas’ “Pad 2” ".repeat(4);
    fs.writeFileSync(f, JSON.stringify(p));
    buildEventPages(dir);
    const ics = fs.readFileSync(path.join(dir, "starship-flight-15.ics"), "utf8");
    for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75, line);
    const unfolded = ics.replace(/\r\n /g, "");
    assert.ok(unfolded.includes("Starbase – Texas’ “Pad 2”"), "no character split across a fold");
    assert.doesNotMatch(unfolded, /DESCRIPTION:[^\r]*·/, "every ' · ' becomes a comma");
    p.updates.push({ date: "2026-11-13", time: "2026-11-13T16:47:00-06:00", kind: "Disclosed", text: "x" });
    fs.writeFileSync(f, JSON.stringify(p));
    assert.throws(() => buildEventPages(dir), /must be UTC/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
