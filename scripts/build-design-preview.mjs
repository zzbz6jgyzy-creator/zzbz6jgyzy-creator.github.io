#!/usr/bin/env node
// Builds the hidden design-preview pages in /preview/ from the live pages and the data files.
//
// Live pages and their builders are untouched. Each preview is composed from a live page (its tools, scripts and every
// hook a script needs are kept) plus the shared renderers in ds-components.js and the styles in ds.css / ds-preview.css.
// Previews are noindex,nofollow with a canonical to the live URL; robots.txt disallows /preview/; the sitemap, search
// index, nav sync, indexnow and the integrity check skip them. The preview pipeline is deleted at the switch.
//
// Every cut must match exactly once, so a change to a live page fails loudly here instead of producing a broken preview.
// Usage: node scripts/build-design-preview.mjs [--check]   (--check: exit 1 if a preview would change)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { findElement, one, between, replaceOnce, VOID, children, htmlText, BAND_SIZES, bandFrom, MONTH, newestDate, hubSection, GROK_LABEL } from "./ds-pages.mjs";
export { findElement, one, between, replaceOnce, children, htmlText, newestDate };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const DS = require("../ds-components.js");
const SITE = "https://superchargeddaily.com";
export const DS_CSS_V = "20261123f"; // bump when ds.css or ds-preview.css changes

const read = (rel, root = ROOT) => fs.readFileSync(path.join(root, rel), "utf8");

// ---- HTML helpers: no parser dependency; scripts and comments are skipped while balancing tags ----







function sectionCssVersion(root) {
  const m = read("theme-boot.js", root).match(/SECTION_CSS_V\s*=\s*"([^"]+)"/);
  if (!m) throw new Error("SECTION_CSS_V not found in theme-boot.js");
  return m[1];
}

/** Previews live one folder deeper (/preview/...), so every local URL in a source page must be root-relative. */
export function assertRootRelative(html, label) {
  // Query-only links ("?event=x") stay on the same page wherever it lives, and any URL with a scheme is absolute.
  const bad = [...html.matchAll(/\s(?:src|href|poster|action)="(?!\/|#|\?|\{|[a-z][a-z0-9+.-]*:)([^"]+)"/gi)].map((m) => m[1]);
  if (bad.length) throw new Error(`${label}: relative URLs would break under /preview/: ${bad.slice(0, 3).join(", ")}`);
}

const navCache = new Map();
/**
 * Renders the navigation from scripts/nav.json (no duplicate links, a Grok menu, "Cybercab
 * fleet", no phone "Quick access" list). sync-nav.py renders it, so the markup is exactly what the switch would ship.
 */
export function withNextNav(html, root = ROOT) {
  const block = between(html, "<!--sd:navigation-->", "<!--/sd:navigation-->");
  const tag = (block.match(/<nav class="pn"[^>]*>/) || [])[0];
  if (!tag) throw new Error('No <nav class="pn"> in the navigation block');
  if (!navCache.has(tag)) {
    navCache.set(tag, execFileSync("python3", [path.join(root, "scripts/sync-nav.py"), "--block", "scripts/nav.json"], { input: tag, encoding: "utf8", cwd: root }));
  }
  return replaceOnce(html, block, navCache.get(tag));
}

/** Head changes shared by every preview: noindex, canonical check, section theme, design CSS, LCP preload. */
export function previewHead(html, { live, section = "", preload = "", keepImagePreloads = false, root = ROOT }) {
  let h = html.replace(/<title>(?!Preview · )/, "<title>Preview · ");
  const robots = '<meta name="robots" content="noindex, nofollow" />';
  h = /<meta name="robots"[^>]*>/.test(h) ? h.replace(/<meta name="robots"[^>]*>/, robots) : replaceOnce(h, "</title>", "</title>\n    " + robots);
  const canon = `<link rel="canonical" href="${SITE}${live}" />`;
  if (!h.includes(canon)) throw new Error("Live page has no canonical " + canon);
  if (section) h = h.replace(/<html\b([^>]*)>/, (m, a) => (/data-section=/.test(a) ? m : `<html${a} data-section="${section}">`));
  // The old hero's preload (and any other image preload) goes; the new LCP image gets its own.
  h = h.replace(/<!--hv:preload-->[\s\S]*?<!--\/hv:preload-->/, "");
  if (!keepImagePreloads) h = h.replace(/\s*<link rel="preload" as="image"[^>]*>/g, "");
  const css = [];
  if (section && !h.includes("/section-theme.css")) css.push(`<link rel="stylesheet" href="/section-theme.css?v=${sectionCssVersion(root)}" />`);
  if (!h.includes('href="/ds.css')) css.push(`<link rel="stylesheet" href="/ds.css?v=${DS_CSS_V}" />`); // live pages carry it since the switch
  css.push(`<link rel="stylesheet" href="/ds-preview.css?v=${DS_CSS_V}" />`);
  h = replaceOnce(h, "</head>", (preload ? "    " + preload + "\n" : "") + "    " + css.join("\n    ") + "\n  </head>");
  h = withNextNav(h, root);
  // inject-js-bundles.py (run by the bots on every page, previews included) collapses blank-line runs the same way;
  // matching it keeps the bots and the preview refresh from rewriting each other's output.
  return h.replace(/\n{3,}/g, "\n\n");
}

/** Article records from data/articles.json, with picture sets only where the 480w files exist on disk. */
export function articles(root = ROOT) {
  const list = JSON.parse(read("data/articles.json", root)).articles || [];
  return list.map((a) => {
    const p = a.picture;
    const ok = p && p.base && [480].every((w) => ["avif", "webp"].every((ext) => fs.existsSync(path.join(root, `${p.base}-${w}w.${ext}`.replace(/^\//, "")))));
    return ok ? a : { ...a, picture: null };
  });
}

function preloadFor(pictureHtml, sizes) {
  const m = pictureHtml.match(/<source type="image\/avif" srcset="([^"]+)"/);
  return m ? `<link rel="preload" as="image" type="image/avif" imagesrcset="${m[1]}" imagesizes="${sizes}" fetchpriority="high" />` : "";
}

/** Adds classes to <body>, with or without an existing class attribute. */
export function addBodyClass(html, cls) {
  if (/<body\b[^>]*\bclass="/.test(html)) return html.replace(/<body\b([^>]*?)\bclass="([^"]*)"/, (m, a, c) => `<body${a}class="${c} ${cls}"`);
  return replaceOnce(html, "<body>", `<body class="${cls}">`);
}


/** The first card of a list becomes the likely LCP image: load it eagerly at high priority and preload its AVIF set. */
function promoteFirstImage(page, cardRe, sizes) {
  const card = findElement(page, cardRe);
  if (!card) return { page, preload: "" };
  const html = page.slice(card.start, card.end);
  const eager = html.replace(/\sloading="lazy"/, ' loading="eager" fetchpriority="high"');
  return { page: page.slice(0, card.start) + eager + page.slice(card.end), preload: preloadFor(html, sizes) };
}

// ---- Pages ----

/** Homepage trackers and tools, by plain name. Every URL is a live page linked from the nav or the old tool cards. */
// ---- Hubs: compact masthead with the hub's own key numbers and a slim photo band, then its latest stories ----










// ---- Trackers: plain title, dek, updated/source line and the tracker's own key numbers; the tool starts right after ----

function finishTracker(page, liveUrl, slug, section, root) {
  page = addBodyClass(page, `ds-page ds-tracker ds-tracker-${slug}`);
  page = replaceOnce(page, "</main>", DS.previewFlag(liveUrl) + "\n</main>");
  return previewHead(page, { live: liveUrl, section, root });
}

const firstSentence = (text) => text.split(/(?<=[.?!])\s/)[0];

export function buildFsdTracker(root = ROOT) {
  const liveUrl = "/fsd-tracker.html";
  const live = read("fsd-tracker.html", root);
  assertRootRelative(live, liveUrl);
  const hero = one(live, /<header class="ft-hero">/, "FSD tracker hero");
  const kpis = one(hero, /<div class="ft-kpis">/, ".ft-kpis");
  const jump = one(hero, /<nav class="ft-jump"/, ".ft-jump");
  const meta = (hero.match(/<p class="ft-hero-meta">([\s\S]*?)<\/p>/) || [])[1];
  const lede = htmlText((hero.match(/<p class="ft-lede">([\s\S]*?)<\/p>/) || [])[1] || "");
  if (!meta || !lede) throw new Error("fsd-tracker.html: hero lede or meta changed shape");
  const mast = DS.masthead({ kicker: "Tesla", title: "FSD tracker", dek: firstSentence(lede), metaHtml: meta, statsHtml: `<div class="ds-tracker-numbers">${kpis}</div>`, extraHtml: jump });
  return finishTracker(replaceOnce(live, hero, mast), liveUrl, "fsd", "", root);
}

/** Starship: the next-flight card (#ss-hero-next, #ss-hero-window) and #ss-source-date move into the masthead. */
export function buildStarship(root = ROOT) {
  const liveUrl = "/starship.html";
  const live = read("starship.html", root);
  assertRootRelative(live, liveUrl);
  const top = one(live, /<div class="ss-topline">/, "Starship top line");
  const date = one(top, /<span id="ss-source-date"/, "#ss-source-date");
  const hero = one(live, /<header class="ss-hero" id="top">/, "Starship hero");
  const img = (hero.match(/<img class="ss-hero-photo"[^>]*>/) || [])[0];
  const brief = one(hero, /<a class="ss-hero-brief"/, "next-flight card");
  const credit = one(live, /<p class="ss-photo-credit">/, "photo credit");
  if (!img) throw new Error("starship.html: hero photo missing");
  const mast = DS.masthead({
    id: "top",
    kicker: "SpaceX",
    title: "Starship flights",
    dek: "Every Starship flight so far and the next one, with dated sources.",
    metaHtml: `${date} · <a href="#sources">Sources</a>`,
    statsHtml: `<div class="ds-tracker-numbers">${brief}</div>`,
    extraHtml: bandFrom(`<picture>${img}</picture>`, credit.replace(/^<p class="ss-photo-credit">/, "").replace(/<\/p>$/, "")),
  });
  let page = replaceOnce(live, credit, "");
  page = replaceOnce(page, hero, "");
  page = replaceOnce(page, top, mast);
  return finishTracker(page, liveUrl, "starship", "spacex", root);
}

/**
 * Cybercab: the masthead sits before #mw-app. The old hero stays inside it, hidden, with its h1 demoted, because
 * build-mobility.mjs renders #mw-app whole; the overview's own metrics then sit just under the masthead.
 */
export function buildCybercab(root = ROOT) {
  const liveUrl = "/cybercab.html";
  const live = read("cybercab.html", root);
  assertRootRelative(live, liveUrl);
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
    dek: "Where Tesla's Cybercabs and Robotaxis run, how many there are, and the evidence behind each claim.",
    metaHtml: small,
    extraHtml: bandFrom(pic, cap),
  });
  const quiet = hero.replace(/<h1>([\s\S]*?)<\/h1>/, '<p class="mw-hero-title">$1</p>').replace('<header class="mw-hero">', '<header class="mw-hero" hidden>');
  let page = replaceOnce(live, hero, quiet);
  page = replaceOnce(page, app, mast + "\n" + app);
  return finishTracker(page, liveUrl, "cybercab", "", root);
}

/** Calendar: calendar-studio.js rewrites #cs-hero on start, so it becomes an inert <template> stub after the masthead. */
export function buildCalendar(root = ROOT) {
  const liveUrl = "/calendar.html";
  const live = read("calendar.html", root);
  assertRootRelative(live, liveUrl);
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
  page = replaceOnce(page, '<div id="cs-app">', '<div id="cs-app" class="cs-enhanced">');
  return finishTracker(page, liveUrl, "calendar", "", root);
}

/** Starlink: the masthead replaces the workspace's top line; the source strip and key figures move into it (still inside .so-workspace). */
export function buildStarlink(root = ROOT) {
  const liveUrl = "/starlink.html";
  const live = read("starlink.html", root);
  assertRootRelative(live, liveUrl);
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
  return finishTracker(page, liveUrl, "starlink", "spacex", root);
}

/** Production: the quarter picker (#pd-quarter) and the stats (#pd-stats) move into the masthead; #pd-spotlight stays, hidden. */
export function buildProduction(root = ROOT) {
  const liveUrl = "/production.html";
  const live = read("production.html", root);
  assertRootRelative(live, liveUrl);
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
    statsHtml: `<div class="ds-tracker-numbers">${picker}${note}${status}${stats}<div hidden>${spot}</div></div>`,
  });
  let page = replaceOnce(live, note, "");
  page = replaceOnce(page, status, "");
  page = replaceOnce(page, stats, "");
  page = replaceOnce(page, hero, mast);
  // Same for the quarter picker, which the script shows by flagging main.pd-studio.
  page = replaceOnce(page, '<main id="main" class="pd-studio">', '<main id="main" class="pd-studio" data-enhanced="true">');
  return finishTracker(page, liveUrl, "production", "", root);
}

/** Three article types: a news story, a long feature, and a finance story with the share disclosure. */

export const PAGES = []; // every preview switched to the live site on 23 Nov 2026; the pipeline goes in the cleanup step

/**
 * Builds every preview and reports every failing page at once instead of stopping at the first (a failing page keeps
 * its old file). The CLI exits 1 if any page failed, so the refresh workflow commits nothing until it is fixed.
 */
export function buildAll(root = ROOT, { check = false } = {}) {
  const changed = [];
  const failed = [];
  for (const p of PAGES) {
    let html;
    try {
      html = p.build(root);
    } catch (e) {
      failed.push({ out: p.out, error: e });
      continue;
    }
    const file = path.join(root, p.out);
    const old = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    if (old !== html) {
      changed.push(p.out);
      if (!check) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, html);
      }
    }
  }
  return { changed, failed };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const { changed, failed } = buildAll(ROOT, { check });
  console.log((check ? "Previews out of date: " : "Previews written: ") + (changed.length ? changed.join(", ") : "none"));
  for (const f of failed) console.error(`Preview failed: ${f.out}: ${f.error.message}`);
  if (failed.length || (check && changed.length)) process.exit(1);
}
