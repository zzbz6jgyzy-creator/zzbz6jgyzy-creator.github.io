import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import vm from "node:vm";
import { createRequire } from "node:module";
import { buildEventPages } from "../scripts/build-event-pages.mjs";
const require = createRequire(import.meta.url), shared = require("../scripts/event-shared.cjs");
const events = JSON.parse(fs.readFileSync("data/events.json", "utf8")).events;

function slugs() {
  return fs.readdirSync("data/event-pages").filter((x) => x.endsWith(".json")).map((x) => x.replace(/\.json$/, ""));
}
function sandbox() {
  // A copy of only what the builder reads, so the test never touches the real pages.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "event-pages-"));
  fs.mkdirSync(path.join(dir, "data/event-pages"), { recursive: true });
  for (const f of ["data/events.json", "data/articles.json", "editorial.html"]) fs.copyFileSync(f, path.join(dir, f));
  for (const slug of slugs()) {
    fs.copyFileSync(path.join("data/event-pages", slug + ".json"), path.join(dir, "data/event-pages", slug + ".json"));
    if (fs.existsSync(slug + ".html")) fs.copyFileSync(slug + ".html", path.join(dir, slug + ".html"));
  }
  return dir;
}

test("saved event pages match the builder and a second build changes nothing", () => {
  const dir = sandbox();
  try {
    buildEventPages(dir);
    const strip = (h) => h.replace(/<!--sd:bundles-->[\s\S]*?<!--\/sd:bundles-->/, "");
    for (const slug of slugs()) {
      const first = fs.readFileSync(path.join(dir, slug + ".html"), "utf8");
      buildEventPages(dir);
      assert.equal(fs.readFileSync(path.join(dir, slug + ".html"), "utf8"), first, slug + " second build");
      const saved = fs.readFileSync(slug + ".html", "utf8");
      assert.equal(strip(first), strip(saved), "run node scripts/build-event-pages.mjs and commit " + slug + ".html");
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("the launch time has one source: data/events.json", () => {
  const home = fs.readFileSync("index.html", "utf8");
  const start = new Date(events["starship-flight-15"].start).toISOString();
  for (const slug of slugs()) {
    const page = JSON.parse(fs.readFileSync(path.join("data/event-pages", slug + ".json"), "utf8"));
    const html = fs.readFileSync(slug + ".html", "utf8");
    const evTimes = events[page.eventId];
    assert.ok(html.includes(`data-start="${new Date(evTimes.start).toISOString()}"`), slug);
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).flat();
    const ev = ld.flat().find((x) => x["@type"] === "Event");
    assert.equal(ev.startDate, evTimes.start, slug);
    assert.equal(ev.endDate, evTimes.end, slug);
    assert.ok(ld.flat().some((x) => x["@type"] === "BreadcrumbList"), slug);
    for (const k of ["name", "description", "location", "organizer", "image", "eventStatus"]) assert.ok(ev[k], slug + " " + k);
  }
  // While the page is featured, the homepage strip uses the same start time.
  if (shared.activeFeature(".", Date.now())) assert.ok(home.includes(`data-start="${start}"`));
});

test("head has standard title, description, canonical, og and twitter tags", () => {
  for (const slug of slugs()) {
    const html = fs.readFileSync(slug + ".html", "utf8");
    const page = JSON.parse(fs.readFileSync(path.join("data/event-pages", slug + ".json"), "utf8"));
    assert.equal((html.match(/<title>/g) || []).length, 1, slug);
    for (const re of [/<meta name="description" content="[^"]{60,}"/, new RegExp(`<link rel="canonical" href="https://superchargeddaily\\.com/${slug}\\.html"`),
      new RegExp(`<meta property="og:image" content="https://superchargeddaily\\.com${page.ogImage.replace(/\./g, "\\.")}"`), /<meta name="twitter:card" content="summary_large_image"/])
      assert.match(html, re, slug);
    assert.ok(fs.existsSync(page.ogImage.slice(1)), page.ogImage);
    assert.doesNotMatch(html, /(name|property)="meta-/);
  }
});

test("countdown shows window open, then the after label, from the saved markup", () => {
  const src = fs.readFileSync("event-countdown.js", "utf8");
  const el = { attrs: { "data-start": "2026-11-13T22:45:00.000Z", "data-end": "2026-11-14T00:00:00.000Z", "data-after-sub": "closed" }, kids: {},
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, setAttribute(k, v) { this.attrs[k] = String(v); }, removeAttribute(k) { delete this.attrs[k]; }, hasAttribute(k) { return k in this.attrs; },
    querySelector(s) { return this.kids[s] || (this.kids[s] = { textContent: s === "[data-cd-time]" ? "13 Nov, 22:45 UTC" : "" }); } };
  const ctx = { window: {}, document: { readyState: "complete", querySelectorAll: () => [] }, setInterval() {}, Date };
  vm.runInNewContext(src, ctx);
  const { render } = ctx.window.SDCountdown;
  render(el, Date.parse("2026-11-13T22:44:00Z")); assert.equal(el.attrs["data-cd-state"], "before"); assert.equal(el.kids["[data-cd-time]"].textContent, "00:01:00");
  // Launch-clock tension: none until 10 minutes out, "soon" inside 10 minutes, "final" inside the last minute, none once open.
  render(el, Date.parse("2026-11-13T22:30:00Z")); assert.equal(el.attrs["data-cd-urgent"], undefined);
  render(el, Date.parse("2026-11-13T22:35:00Z")); assert.equal(el.attrs["data-cd-urgent"], "soon");
  render(el, Date.parse("2026-11-13T22:44:30Z")); assert.equal(el.attrs["data-cd-urgent"], "final");
  render(el, Date.parse("2026-11-13T22:45:00Z")); assert.equal(el.attrs["data-cd-urgent"], undefined, "window open: the open state takes over");
  render(el, Date.parse("2026-11-13T23:00:00Z")); assert.equal(el.attrs["data-cd-state"], "open"); assert.match(el.kids["[data-cd-label]"].textContent, /window open/);
  render(el, Date.parse("2026-11-14T01:00:00Z")); assert.equal(el.attrs["data-cd-state"], "after"); assert.equal(el.kids["[data-cd-time]"].textContent, "13 Nov, 22:45 UTC");
});

test("calendar: a deterministic .ics next to the page and a Google Calendar link with the same times", () => {
  const dir = sandbox();
  try {
    buildEventPages(dir);
    for (const slug of slugs()) {
      const ics = fs.readFileSync(path.join(dir, slug + ".ics"), "utf8");
      buildEventPages(dir);
      assert.equal(fs.readFileSync(path.join(dir, slug + ".ics"), "utf8"), ics, slug + " rebuild must not change the .ics");
      assert.equal(ics, fs.readFileSync(slug + ".ics", "utf8"), "run node scripts/build-event-pages.mjs and commit " + slug + ".ics");
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  const stamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  for (const slug of slugs()) {
    const page = JSON.parse(fs.readFileSync(path.join("data/event-pages", slug + ".json"), "utf8"));
    const ev = events[page.eventId], ics = fs.readFileSync(slug + ".ics", "utf8");
    assert.match(ics, new RegExp(`\\r\\nDTSTART:${stamp(ev.start)}\\r\\n`));
    assert.match(ics, new RegExp(`\\r\\nDTEND:${stamp(ev.end)}\\r\\n`));
    assert.match(ics, new RegExp(`\\r\\nUID:${slug}@superchargeddaily\\.com\\r\\n`));
    assert.match(ics, /BEGIN:VALARM[\s\S]*TRIGGER:-PT30M[\s\S]*END:VALARM/);
    for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75, slug + " fold at 75 octets: " + line);
    const html = fs.readFileSync(slug + ".html", "utf8");
    assert.match(html, new RegExp(`<a href="/${slug}\\.ics" download>Add to calendar</a>`));
    const g = html.match(/href="(https:\/\/calendar\.google\.com\/calendar\/render\?[^"]+)"/);
    assert.ok(g, slug + " Google Calendar link");
    assert.equal(new URL(g[1].replace(/&amp;/g, "&")).searchParams.get("dates"), `${stamp(ev.start)}/${stamp(ev.end)}`);
  }
});

test("Ship 42 is a companion hub on the same Flight 15 window", () => {
  const page = JSON.parse(fs.readFileSync("data/event-pages/ship-42.json", "utf8"));
  assert.equal(page.eventId, "starship-flight-15");
  assert.equal(page.slug, "ship-42");
  const html = fs.readFileSync("ship-42.html", "utf8");
  assert.match(html, />Ship 42</);
  assert.match(html, /Why this ship/);
  assert.match(html, /What to watch on Ship 42/);
  assert.match(html, /The tower for a Ship catch/);
  assert.match(html, /href="\/starship-flight-15\.html"/);
  const f15 = fs.readFileSync("starship-flight-15.html", "utf8");
  assert.match(f15, /href="\/ship-42\.html"/);
});

test("Ship 42 loads the tower X post on request and embeds the Obvious Later call", () => {
  const html = fs.readFileSync("ship-42.html", "utf8");
  const f15 = fs.readFileSync("starship-flight-15.html", "utf8");
  assert.match(html, /blockquote class="twitter-tweet"/);
  assert.match(html, /x\.com\/AlJR86\/status\/2120458679652696160/);
  assert.match(html, /x-embed\.css/);
  assert.match(html, /x-embed\.js/);
  assert.doesNotMatch(html, /platform\.twitter\.com\/widgets\.js/);
  assert.match(html, /obviouslater\.com\/embed\/call\/starship-ship-catch-by-end-2026\?l=en/);
  assert.match(html, /Will SpaceX catch a Starship upper stage with its launch tower arms by December 31, 2026\?/);
  assert.doesNotMatch(html, /crowd(?:'s)? (?:odds|forecast|percent|average)/i);
  assert.doesNotMatch(f15, /twitter-tweet/);
  assert.doesNotMatch(f15, /x-embed\.js/);
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
    // A date after every real entry, so this one is always the newest.
    p.updates.push({ date: "2027-01-01", time: "2027-01-01T22:47:00Z", kind: "Disclosed", text: "Lift-off.", source: "https://www.spacex.com/" });
    fs.writeFileSync(f, JSON.stringify(p));
    buildEventPages(dir);
    const out = fs.readFileSync(path.join(dir, "starship-flight-15.html"), "utf8");
    const first = out.match(/<ol class="ev-log"[^>]*><li>([\s\S]*?)<\/li>/)[1];
    assert.match(first, /<time datetime="2027-01-01T22:47:00Z">1 Jan 2027, 22:47 UTC<\/time>/);
    assert.match(out, /data-ev-latest="2027-01-01T22:47:00Z"/);
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

test("Ship 42 shows an at-a-glance strip, jump links and a latest-update line", async () => {
  const fs = await import("node:fs");
  const html = fs.readFileSync(new URL("../ship-42.html", import.meta.url), "utf8");
  assert.match(html, /class="ev-glance"/);
  assert.match(html, /class="ev-jump"[^>]*aria-label="On this page"/);
  assert.match(html, /data-ev-latest-line/);
  assert.equal((html.match(/<nav class="ev-jump"/g) || []).length, 1);
});

test("Ship 42 has a credited photo, a flight timeline, fact cards and a labelled diagram", () => {
  const html = fs.readFileSync(new URL("../ship-42.html", import.meta.url), "utf8");
  assert.match(html, /<figure class="ev-photo">[\s\S]*?Photo: <a href="https:\/\/commons\.wikimedia\.org[^"]+"[\s\S]*?CC BY 2\.0/);
  assert.equal((html.match(/<ol class="ev-tl">/g) || []).length, 1);
  assert.equal((html.match(/class="ev-tl-t"/g) || []).length, 4);
  assert.match(html, /<ul class="ev-facts">/);
  assert.match(html, /<figure class="ev-diagram">[\s\S]*?Illustration by Supercharged Daily, not to scale/);
  assert.match(html, /<figure class="ev-quote">[\s\S]*?x\.com\/elonmusk\/status\/2115634093949911506/);
});

test("Ship 42 puts the road-to-Flight-15 video before the mission, with no autoplay", () => {
  const page = JSON.parse(fs.readFileSync("data/event-pages/ship-42.json", "utf8"));
  const road = page.sections[0];
  assert.equal(road.id, "road");
  assert.equal(road.jumpTitle, "Road to Flight 15");
  assert.equal(road.placement, "before-mission");
  assert.equal(road.embed.kind, "video");
  const html = fs.readFileSync("ship-42.html", "utf8");
  const jump = html.match(/<nav class="ev-jump"[^>]*>([\s\S]*?)<\/nav>/)[1];
  assert.match(jump, /^<a href="#ev-road">Road to Flight 15<\/a><a href="#ev-mission">The mission<\/a>/);
  assert.doesNotMatch(jump, /From a tumbling first flight/);
  const roadAt = html.indexOf('id="ev-road"');
  const missionAt = html.indexOf('id="ev-mission"');
  assert.ok(roadAt > 0 && roadAt < missionAt);
  assert.equal((html.match(/id="ev-road"/g) || []).length, 1);
  assert.match(html, /<video controls playsinline preload="metadata" poster="\/assets\/video\/starship-hero-poster\.jpg" width="1920" height="1080" aria-label="Official SpaceX footage from Starship Flights 1 to 14, the Flight 15 preview and Elon Musk's May 2025 Starbase talk, set to Pathfinder by Scott Buckley">/);
  assert.match(html, /<source src="\/assets\/video\/starship-hero-1080p\.mp4" type="video\/mp4" media="\(min-width: 800px\)" \/>/);
  assert.match(html, /<source src="\/assets\/video\/starship-hero-720p\.mp4" type="video\/mp4" \/>/);
  assert.doesNotMatch(html, /\sautoplay\b/i);
  assert.doesNotMatch(html, /electrek/i);
  assert.match(html, /<figcaption>Video: SpaceX \(@SpaceX\), official footage from Starship Flights 1 to 14, the Flight 15 preview and Elon Musk's May 2025 Starbase talk\. Music: 'Pathfinder' by Scott Buckley, <a href="https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/">CC BY 4\.0<\/a> \(<a href="https:\/\/scottbuckley\.com\.au">scottbuckley\.com\.au<\/a>\)\.<\/figcaption>/);
  assert.match(html, /pending regulatory approval \(as of 13 Nov 2026\)/);
  assert.match(html, /href="https:\/\/www\.spacex\.com\/launches\/starship-flight-15"[^>]*>SpaceX's Flight 15 page/);
  assert.match(html, /Steve Jurvetson/);
  assert.match(html, /event-page\.css\?v=20261113a/);
});

test("event-page video embed, body links, jumpTitle and before-mission placement are wired in the builder", () => {
  const dir = sandbox();
  try {
    const f = path.join(dir, "data/event-pages/ship-42.json"), p = JSON.parse(fs.readFileSync(f, "utf8"));
    p.sections[0].embed.kind = "youtube";
    fs.writeFileSync(f, JSON.stringify(p));
    assert.throws(() => buildEventPages(dir), /unknown embed kind youtube/);
    p.sections[0].embed.kind = "video";
    p.sections[0].placement = "after-watch";
    fs.writeFileSync(f, JSON.stringify(p));
    assert.throws(() => buildEventPages(dir), /unknown section placement after-watch/);
    p.sections[0].placement = "before-mission";
    p.sections[0].body[1].linkText = "not on the page";
    fs.writeFileSync(f, JSON.stringify(p));
    assert.throws(() => buildEventPages(dir), /linkText not found/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
