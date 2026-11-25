// Shared HTML helpers and the live page transforms of the news-first redesign (switched 23 Nov 2026).
// A studio builder renders its page from its view and data, then passes the result through its transform here just before
// writing, so the transform always sees the same fresh view output and never edits an already-switched page. Every cut must
// match exactly once, so a change to a view fails the build loudly instead of shipping a half-switched page.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const DS = require("../ds-components.js");

// ---- HTML helpers: no parser dependency; scripts and comments are skipped while balancing tags ----

/** Balanced element starting at the first match of openRe (at or after `from`). Returns { start, end } or null. */
export function findElement(html, openRe, from = 0) {
  const re = new RegExp(openRe.source, "g" + openRe.flags.replace(/g/g, ""));
  re.lastIndex = from;
  const m = re.exec(html);
  if (!m) return null;
  const tag = (m[0].match(/^<([a-z][a-z0-9-]*)/i) || [])[1];
  if (!tag) throw new Error("Pattern must match an opening tag: " + openRe);
  const scan = new RegExp(`<script\\b[^>]*>[\\s\\S]*?<\\/script>|<!--[\\s\\S]*?-->|<(\\/?)${tag}(?=[\\s>/])[^>]*>`, "gi");
  scan.lastIndex = m.index;
  let depth = 0;
  let t;
  while ((t = scan.exec(html))) {
    if (t[1] === undefined) continue; // script or comment
    if (t[1] === "/") depth--;
    else if (!t[0].endsWith("/>")) depth++;
    if (depth === 0) return { start: m.index, end: t.index + t[0].length };
  }
  throw new Error("Unbalanced <" + tag + "> for " + openRe);
}

/** The element matched by openRe, which must occur exactly once in html. */
export function one(html, openRe, label = String(openRe)) {
  const count = (html.match(new RegExp(openRe.source, "g")) || []).length;
  if (count !== 1) throw new Error(`Expected exactly one ${label}, found ${count}`);
  const r = findElement(html, openRe);
  return html.slice(r.start, r.end);
}

/** Text from marker a through marker b; each marker must occur exactly once. */
export function between(html, a, b) {
  const i = html.indexOf(a);
  const j = html.indexOf(b);
  if (i < 0 || j < i || html.indexOf(a, i + 1) >= 0 || html.indexOf(b, j + 1) >= 0) throw new Error("Marker pair not unique: " + a);
  return html.slice(i, j + b.length);
}

/** Replace exactly one occurrence of needle. Slices, so "$&" or "$'" in third-party text are never expanded. */
export function replaceOnce(html, needle, value) {
  const i = html.indexOf(needle);
  if (i < 0 || html.indexOf(needle, i + needle.length) >= 0) throw new Error("Needle not unique: " + needle.slice(0, 80));
  return html.slice(0, i) + value + html.slice(i + needle.length);
}

export const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/** Element children of html[start, end), skipping text and comments: [{ tag, cls, start, end }]. */
export function children(html, start, end) {
  const out = [];
  let i = start;
  while (i < end) {
    const lt = html.indexOf("<", i);
    if (lt < 0 || lt >= end) break;
    if (html.startsWith("<!--", lt)) {
      i = html.indexOf("-->", lt) + 3;
      continue;
    }
    const m = /^<([a-z][a-z0-9-]*)\b[^>]*>/i.exec(html.slice(lt, lt + 4000));
    if (!m) throw new Error("Unexpected markup inside the range at " + lt + ": " + html.slice(lt, lt + 40));
    const tag = m[1].toLowerCase();
    let e;
    if (VOID.has(tag) || m[0].endsWith("/>")) e = lt + m[0].length;
    else if (tag === "script" || tag === "style") e = html.indexOf(`</${tag}>`, lt) + tag.length + 3;
    else e = findElement(html, new RegExp(`<${tag}\\b`, "i"), lt).end;
    if (e > end) throw new Error(`<${tag}> at ${lt} runs past the end of the range`);
    out.push({ tag, cls: (m[0].match(/\bclass="([^"]*)"/) || [])[1] || "", start: lt, end: e });
    i = e;
  }
  return out;
}

/** Plain text of a small HTML fragment (tags dropped, common entities decoded), for renderers that escape their input. */
export function htmlText(fragment) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : named[e.toLowerCase()] ?? m))
    .replace(/\s+/g, " ")
    .trim();
}

/** A slim photo band from a live <picture> (kept as is: its sources, sizes and credits are the live page's). */
export const BAND_SIZES = "(min-width:1228px) 1180px, 100vw";

export function bandFrom(pictureHtml, captionHtml) {
  const pic = pictureHtml
    .replace(/(<img\b[^>]*?)\s+class="[^"]*"/, "$1") // the old hero's image classes position it full-screen
    .replace(/\ssizes="[^"]*"/g, ` sizes="${BAND_SIZES}"`); // a slim band, not a full-screen hero
  return `<figure class="ds-band">${pic}${captionHtml ? `<figcaption>${captionHtml}</figcaption>` : ""}</figure>`;
}

export const MONTH = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

/** Newest of the dates in a string of card dates (datetime attributes or "20 Nov 2026" text); pass card dates only, not summaries. */
export function newestDate(html) {
  const iso = [...html.matchAll(/datetime="(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
  for (const m of html.matchAll(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\w* (\d{4})\b/g)) {
    iso.push(`${m[3]}-${String(MONTH[m[2].toLowerCase()]).padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  }
  if (!iso.length) throw new Error("No dated story to take an Updated date from");
  return DS.fmtDate(iso.sort().pop() + "T12:00:00Z");
}

export function hubSection(id, title, href, linkText, inner, attrs = "") {
  return `<section class="ds-section ds-hub-stories"${attrs} aria-labelledby="${id}">` + DS.sectionHead({ id, title, href, linkText }) + inner + "</section>";
}

export const GROK_LABEL = { model: "Grok model", bot: "Grok Bot", voice: "Grok Voice", imagine: "Grok Imagine", api: "xAI API" };

/** inject-js-bundles.py (run by the bots on every page) collapses blank-line runs; transforms match it so they agree. */
export const settle = (html) => html.replace(/\n{3,}/g, "\n\n");

/** Add classes to <body> once: builders keep the existing <body> tag between runs. */
export function ensureBodyClass(html, cls) {
  const m = html.match(/<body\b([^>]*)>/);
  if (!m) throw new Error("No <body> tag");
  const have = ((m[1].match(/\bclass="([^"]*)"/) || [])[1] || "").split(/\s+/).filter(Boolean);
  const want = [...have, ...cls.split(/\s+/).filter((c) => !have.includes(c))].join(" ");
  const tag = /\bclass="/.test(m[1]) ? m[0].replace(/\bclass="[^"]*"/, `class="${want}"`) : m[0].replace("<body", `<body class="${want}"`);
  return html.replace(m[0], () => tag);
}

// ---- Hubs: compact masthead with the hub's own key numbers and a slim photo band, then its latest stories ----
/** Tesla hub: the masthead takes the hub's own numbers (#to-brief-grid and its note); #to-stories moves up under it. */
export function teslaHub(live) {
  const hero = one(live, /<section class="to-hero"/, "Tesla hero");
  const pic = one(hero, /<picture>/, "Tesla hero picture");
  const grid = one(live, /<div id="to-brief-grid"/, "#to-brief-grid");
  const after = live.slice(live.indexOf(grid) + grid.length);
  const fine = (after.match(/^\s*<p class="to-fine">[\s\S]*?<\/p>/) || [])[0];
  if (!fine) throw new Error("tesla.html: the numbers note no longer follows #to-brief-grid");
  const stories = one(live, /<div id="to-stories"/, "#to-stories");
  const caption = hero.match(/<a class="to-hero-caption" href="(\/[^"]+)"><span>([^<]*)<\/span>[\s\S]*?<small>([^<]*)<\/small>/);
  if (!caption) throw new Error("tesla.html: hero caption changed shape");
  const subject = caption[2].split("/").pop().trim();
  const mast = DS.masthead({
    kicker: "Tesla",
    title: "Tesla news, trackers and guides",
    titleId: "to-title",
    dek: "The cars, the software, Robotaxi and the numbers, from an owner and shareholder.",
    metaHtml: `Latest story ${newestDate([...stories.matchAll(/<p class="to-eyebrow">[^<]*<span>\s*\/\s*([^<]+)<\/span>/g)].map((m) => m[1]).join(" "))} · <a href="#sources">Sources</a>`,
    statsHtml: `<div class="ds-hub-numbers">${grid}<details class="ds-hub-note"><summary>About these numbers</summary>${fine.trim()}</details></div>`,
    band: null,
    extraHtml: bandFrom(pic, `<a href="${DS.esc(htmlText(caption[1]))}">${DS.esc(htmlText(subject))}</a> · ${DS.esc(htmlText(caption[3]))}`), // text read from HTML is decoded once, then escaped
  });
  let page = replaceOnce(live, grid + fine, "");
  page = replaceOnce(page, stories, "");
  page = replaceOnce(page, hero, mast + hubSection("ds-hub-stories-h", "Latest stories", "/dispatch.html?topic=tesla", "All Tesla stories", stories));
  return settle(ensureBodyClass(page, "ds-page ds-hub ds-hub-tesla"));
}

/** SpaceX hub: the next-launch card (#sx-next, kept live by spacex-studio.js) joins the masthead; the stories move up. */
export function spacexHub(live) {
  const hero = one(live, /<header class="sx-hero"/, "SpaceX hero");
  const pic = one(hero, /<picture>/, "SpaceX hero picture");
  const credit = hero.match(/<div class="sx-hero-bottom">[\s\S]*?<a href="(#[^"]+)">([^<]+)<\/a>/);
  if (!credit) throw new Error("spacex.html: photo credit changed shape");
  const next = one(live, /<aside class="sx-next" id="sx-next"/, "#sx-next");
  const section = one(live, /<section class="sx-section" id="stories"/, "SpaceX stories section");
  const head = one(section, /<header class="sx-section-head"/, "SpaceX stories heading");
  const asOf = (live.match(/"scheduleAsOf":\s*"([^"]+)"/) || [])[1];
  const mast = DS.masthead({
    kicker: "SpaceX",
    title: "SpaceX launches, Starship and Starlink",
    dek: "The launch schedule, the fleet and our reporting, with dated sources.",
    metaHtml: (asOf ? `Schedule as of ${DS.fmtDate(asOf)} · ` : "") + '<a href="#sources">Sources</a>',
    statsHtml: `<div class="ds-hub-numbers">${next}</div>`,
    extraHtml: bandFrom(pic, DS.esc(htmlText(credit[2]))),
  });
  const stories = section
    .replace(head, DS.sectionHead({ id: "ds-hub-stories-h", title: "Latest stories", href: "/dispatch.html?topic=spacex", linkText: "All SpaceX stories" }))
    .replace('<section class="sx-section" id="stories">', '<section class="sx-section ds-section ds-hub-stories" id="stories" aria-labelledby="ds-hub-stories-h">');
  let page = replaceOnce(live, next, "");
  page = replaceOnce(page, section, "");
  page = replaceOnce(page, hero, mast + stories);
  return settle(ensureBodyClass(page, "ds-page ds-hub ds-hub-spacex"));
}

/** Grok hub: the newest official release per product line as key numbers; the reporting grid moves up from #latest. */
export function grokHub(live) {
  const hero = one(live, /<header class="gx-hero"/, "Grok hero");
  const latest = one(live, /<section class="gx-section" id="latest"/, "Grok #latest");
  const sub = one(latest, /<div class="gx-subhead" id="stories"/, "Grok reporting heading");
  const grid = one(latest, /<div class="gx-story-grid"/, "Grok reporting grid");
  const note = (latest.slice(latest.indexOf(sub) + sub.length, latest.indexOf(grid)).match(/<p class="gx-fine">[\s\S]*?<\/p>/) || [""])[0];
  const description = htmlText((hero.match(/<p class="gx-hero-description">([\s\S]*?)<\/p>/) || [])[1] || "");
  const checked = (hero.match(/Source reference checked ([^<]+)</) || [])[1];
  if (!description || !checked) throw new Error("grok.html: hero description or source date missing");
  const seen = new Set();
  const releases = [...latest.matchAll(/<article class="gx-release"><p class="gx-kicker">([^<]+)<\/p><span>([^<]+)<\/span>[\s\S]*?<a class="gx-source-link" href="(https:[^"]+)"/g)]
    .map((m) => ({ date: m[1].trim(), product: m[2].split("/")[0].trim(), version: m[2].split("/").slice(1).join("/").trim(), href: m[3] }))
    .filter((r) => r.version && !seen.has(r.product.toLowerCase()) && seen.add(r.product.toLowerCase()))
    .slice(0, 3);
  if (releases.length < 2) throw new Error("grok.html: fewer than two dated releases in #latest");
  const mast = DS.masthead({
    kicker: "Grok and xAI",
    title: "Grok and xAI: models, plans and news",
    dek: description.split(/(?<=\.)\s/)[0],
    metaHtml: `Source reference checked ${DS.esc(checked.trim())} · <a href="#sources">Sources</a>`,
    statsHtml: DS.stats(releases.map((r) => ({ label: GROK_LABEL[r.product.toLowerCase()] || r.product, value: r.version, asOf: r.date, asOfLabel: "Released", source: { href: r.href, label: "Release notes" } })), { label: "Newest official releases" }),
  });
  let page = replaceOnce(live, sub, "");
  page = replaceOnce(page, grid, "");
  if (note) page = replaceOnce(page, note, "");
  page = replaceOnce(page, hero, mast + hubSection("ds-hub-stories-h", "Latest stories", "/dispatch.html?topic=xai", "All Grok stories", note + grid, ' id="stories"'));
  return settle(ensureBodyClass(page, "ds-page ds-hub ds-hub-grok"));
}

// ---- Trackers: plain title, dek, updated/source line and the tracker's own key numbers; the tool starts right after ----

export const firstSentence = (text) => text.split(/(?<=[.?!])\s/)[0];

export function fsdTracker(live) {
  const hero = one(live, /<header class="ft-hero">/, "FSD tracker hero");
  const kpis = one(hero, /<div class="ft-kpis">/, ".ft-kpis");
  const jump = one(hero, /<nav class="ft-jump"/, ".ft-jump");
  const meta = (hero.match(/<p class="ft-hero-meta">([\s\S]*?)<\/p>/) || [])[1];
  const lede = htmlText((hero.match(/<p class="ft-lede">([\s\S]*?)<\/p>/) || [])[1] || "");
  if (!meta || !lede) throw new Error("fsd-tracker.html: hero lede or meta changed shape");
  const mast = DS.masthead({ kicker: "Tesla", title: "FSD tracker", dek: firstSentence(lede), metaHtml: meta, statsHtml: `<div class="ds-tracker-numbers">${kpis}</div>`, extraHtml: jump });
  return settle(ensureBodyClass(replaceOnce(live, hero, mast), "ds-page ds-tracker ds-tracker-fsd"));
}

/**
 * Cybercab: the masthead sits before #mw-app. The old hero stays inside it, hidden, with its h1 demoted, because
 * build-mobility.mjs renders #mw-app whole; the overview's own metrics then sit just under the masthead.
 */
export function cybercabTracker(live) {
  const app = (live.match(/<div id="mw-app"[^>]*>/) || [])[0];
  const hero = one(live, /<header class="mw-hero">/, "Cybercab hero");
  const small = (hero.match(/<p class="mw-small">([\s\S]*?)<\/p>/) || [])[1];
  const fig = one(hero, /<figure class="mw-studio">/, "Cybercab studio figure");
  const pic = one(fig, /<picture>/, "studio picture");
  const cap = ((fig.match(/<figcaption>[\s\S]*?<span>([\s\S]*?)<\/span><\/figcaption>/) || [])[1] || "").trim();
  if (!app || !small || !cap) throw new Error("cybercab.html: #mw-app, the registry line or the photo credit changed shape");
  const mast = DS.masthead({
    kicker: "Tesla Robotaxi",
    title: "Cybercab fleet",
    dek: "Where Tesla's Cybercabs and Robotaxis run, how many are registered, and the evidence behind each claim.",
    metaHtml: small,
    extraHtml: bandFrom(pic, cap),
  });
  const quiet = hero.replace(/<h1>([\s\S]*?)<\/h1>/, '<p class="mw-hero-title">$1</p>').replace('<header class="mw-hero">', '<header class="mw-hero" hidden>');
  let page = replaceOnce(live, hero, quiet);
  page = replaceOnce(page, app, mast + "\n" + app);
  return settle(ensureBodyClass(page, "ds-page ds-tracker ds-tracker-cybercab"));
}

/** Calendar: calendar-studio.js rewrites #cs-hero on start, so it becomes an inert <template> stub after the masthead. */
export function calendarTracker(live) {
  const hero = one(live, /<div id="cs-hero">/, "#cs-hero");
  const asOf = (live.match(/Launch times as of ([^<.]+)\./) || [])[1];
  if (!asOf) throw new Error("calendar.html: launch-times stamp missing");
  const mast = DS.masthead({
    kicker: "Tesla, SpaceX and xAI",
    title: "Launch calendar",
    dek: "Launches, Tesla events and earnings calls, with how certain each date is.",
    metaHtml: `Launch times as of ${DS.esc(asOf.trim())} · Targets can change`,
  });
  let page = replaceOnce(live, hero, mast + '<template id="cs-hero"></template>');
  // The week strip and filters are hidden until the script flags #cs-app; with the old hero gone they sit in the first
  // screen, so the preview ships the flag and they are there from first paint instead of pushing the page down.
  // With the old hero gone the week strip and filters sit in the first screen. Flag #cs-app while the page parses, so they
  // are there from first paint with JavaScript (no layout shift) and stay hidden without it (calendar-studio.js sets the
  // same class later anyway). #cs-app sits outside the cs:studio block the builder re-renders, so this stays put.
  // If the calendar script never starts (blocked or failed), the flag comes off at load and the static listing returns.
  const flag = '<div id="cs-app"><script>(function(a){a.classList.add("cs-enhanced");addEventListener("load",function(){var c=document.getElementById("cs-result-count");if(!c||!c.textContent)a.classList.remove("cs-enhanced")})})(document.getElementById("cs-app"))</script>';
  page = page.replace(/<div id="cs-app"><script>[^<]*<\/script>/, '<div id="cs-app">');
  page = replaceOnce(page, '<div id="cs-app">', flag);
  return settle(ensureBodyClass(page, "ds-page ds-tracker ds-tracker-calendar"));
}

/** Starlink: the masthead replaces the workspace's top line; the source strip and key figures move into it (still inside .so-workspace). */
export function starlinkTracker(live) {
  const mastLine = one(live, /<header class="so-mast">/, "Starlink top line");
  const strip = one(live, /<div class="so-source-strip">/, "source strip");
  const metrics = one(live, /<section class="so-metrics"/, "key figures");
  const overview = one(live, /<section class="so-hero" id="overview"/, "#overview");
  const quietOverview = overview.replace(/<h1 id="so-title">([\s\S]*?)<\/h1>/, '<h2 id="so-title" class="so-hero-title">$1</h2>');
  if (quietOverview === overview) throw new Error("starlink.html: the overview h1 moved");
  const mast = DS.masthead({
    kicker: "SpaceX",
    title: "Starlink tracker",
    dek: "How many Starlink satellites are in orbit, how the constellation is built, and what is passing above you.",
    statsHtml: `<div class="ds-tracker-numbers">${strip}${metrics}</div>`,
  });
  let page = replaceOnce(live, strip, "");
  page = replaceOnce(page, metrics, "");
  page = replaceOnce(page, overview, quietOverview);
  page = replaceOnce(page, mastLine, mast);
  return settle(ensureBodyClass(page, "ds-page ds-tracker ds-tracker-starlink"));
}

/** Production: the quarter picker (#pd-quarter) and the stats (#pd-stats) move into the masthead. The old hero's spotlight
 * only supplies the report's publication date for the masthead line; the stats row shows the same quarter's figures. */
export function productionTracker(live) {
  const hero = one(live, /<header class="pd-hero">/, "production hero");
  const picker = one(hero, /<div class="pd-quarter-select/, "quarter picker");
  const spot = one(hero, /<div class="pd-spotlight" id="pd-spotlight">/, "#pd-spotlight");
  const note = one(live, /<p class="pd-view-note" id="pd-view-note">/, "#pd-view-note");
  const status = one(live, /<p class="pd-status" id="pd-status"/, "#pd-status");
  const stats = one(live, /<div class="pd-stats" id="pd-stats">/, "#pd-stats");
  const published = (spot.match(/published ([^<]+)</) || [])[1];
  if (!published) throw new Error("production.html: publication date missing from the spotlight");
  const mast = DS.masthead({
    kicker: "Tesla",
    title: "Tesla production and deliveries",
    dek: "Tesla's quarterly production, deliveries and energy storage, from its official reports.",
    metaHtml: `Latest report published ${DS.esc(published.trim())} · <a href="#sources">Sources</a>`,
    statsHtml: `<div class="ds-tracker-numbers">${picker}${note}${status}${stats}</div>`,
  });
  let page = replaceOnce(live, note, "");
  page = replaceOnce(page, status, "");
  page = replaceOnce(page, stats, "");
  page = replaceOnce(page, hero, mast);
  // Same for the quarter picker, which the script shows by flagging main.pd-studio.
  // Flagged while the page parses (no layout shift with JavaScript, nothing dead without it); if production-studio.js
  // never starts, the flag comes off at load and the static view returns.
  page = replaceOnce(page, '<main id="main" class="pd-studio">', '<main id="main" class="pd-studio"><script>(function(m){m.dataset.enhanced="true";addEventListener("load",function(){if(!window.SDProductionReady)delete m.dataset.enhanced})})(document.getElementById("main"))</script>');
  return settle(ensureBodyClass(page, "ds-page ds-tracker ds-tracker-production"));
}
