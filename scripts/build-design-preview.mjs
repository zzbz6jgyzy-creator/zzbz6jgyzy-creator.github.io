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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const DS = require("../ds-components.js");
const SITE = "https://superchargeddaily.com";
export const DS_CSS_V = "20261123a"; // bump when ds.css or ds-preview.css changes

const read = (rel, root = ROOT) => fs.readFileSync(path.join(root, rel), "utf8");

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

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

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

function sectionCssVersion(root) {
  const m = read("theme-boot.js", root).match(/SECTION_CSS_V\s*=\s*"([^"]+)"/);
  if (!m) throw new Error("SECTION_CSS_V not found in theme-boot.js");
  return m[1];
}

/** Previews live one folder deeper (/preview/...), so every local URL in a source page must be root-relative. */
export function assertRootRelative(html, label) {
  const bad = [...html.matchAll(/\s(?:src|href|poster|action)="(?!\/|https?:|#|mailto:|tel:|data:|javascript:|\{)([^"]+)"/gi)].map((m) => m[1]);
  if (bad.length) throw new Error(`${label}: relative URLs would break under /preview/: ${bad.slice(0, 3).join(", ")}`);
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
  css.push(`<link rel="stylesheet" href="/ds.css?v=${DS_CSS_V}" />`, `<link rel="stylesheet" href="/ds-preview.css?v=${DS_CSS_V}" />`);
  h = replaceOnce(h, "</head>", (preload ? "    " + preload + "\n" : "") + "    " + css.join("\n    ") + "\n  </head>");
  return h;
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

// ---- Pages ----

/** Homepage trackers and tools, by plain name. Every URL is a live page linked from the nav or the old tool cards. */
export const HOME_TOOLS = [
  { url: "/starlink.html", topic: "spacex", tag: "SpaceX", title: "Starlink tracker", meta: "Satellites in orbit, and identify one overhead" },
  { url: "/starship.html", topic: "spacex", tag: "SpaceX", title: "Starship flights", meta: "Every flight so far and the next one" },
  { url: "/see-the-launch.html", topic: "spacex", tag: "SpaceX", title: "Can I see the launch?", meta: "Where to look from where you are" },
  { url: "/updates.html", topic: "tesla", tag: "Tesla", title: "Software updates", meta: "Release notes and reported rollouts" },
  { url: "/fsd-tracker.html", topic: "tesla", tag: "Tesla", title: "FSD tracker", meta: "Subscriptions, miles, builds and safety claims" },
  { url: "/fsd-europe.html", topic: "tesla", tag: "Tesla", title: "FSD in Europe", meta: "Approvals and availability, country by country" },
  { url: "/cybercab.html", topic: "tesla", tag: "Tesla", title: "Cybercab fleet", meta: "Registrations, cities and evidence" },
  { url: "/promise-tracker.html", topic: "tesla", tag: "Tesla", title: "Promise tracker", meta: "What was promised and what happened" },
  { url: "/my-tesla.html", topic: "tesla", tag: "Tesla", title: "My Tesla", meta: "Your car's software and running costs" },
  { url: "/grok.html", topic: "xai", tag: "xAI", title: "Grok guide", meta: "Models, plans and what's new" },
  { url: "/explainers.html", topic: "", tag: "Explainers", title: "Visual explainers", meta: "FSD, hot staging, booster catches and more" },
];

/** Homepage: lead story, then the latest list, then live numbers, newsletter, trackers, launches and the wire. */
export function buildHome(root = ROOT) {
  const live = read("index.html", root);
  assertRootRelative(live, "index.html");
  const mainOpen = '<main id="main" class="hv hs-home">';
  const main = one(live, /<main id="main" class="hv hs-home">/, "homepage <main>");

  const part = (re, label) => one(main, re, label);
  const liveTop = part(/<div class="hv-live-top"/, "live slot");
  const feature = between(main, "<!--hv:feature-->", "<!--/hv:feature-->");
  const updated = part(/<p class="hv-updated"/, "updated line");
  let lead = part(/<div class="pv-lead"/, "lead story");
  const supp = part(/<div class="hv-supp" data-hv-supp/, "supporting stories");
  const event = part(/<div class="hv-live hv-event"/, "next-event card");
  const signup = part(/<div class="hs-hero-signup"/, "newsletter form");
  let tools = part(/<section class="hs-tools hs-section"/, "trackers and tools");
  const band = part(/<div data-band-slot/, "newsletter band slot");
  const wire = part(/<div class="hs-latest-grid hs-section"/, "what changed and wire");
  let calendar = part(/<section class="hs-calendar"/, "launch calendar");

  // Tracker numbers move out of the tools section into their own band, right under the stories.
  const snapshot = one(tools, /<div class="hs-snapshot"/, "tracker snapshot");
  tools = replaceOnce(tools, snapshot, "");
  const trkRow = one(snapshot, /<div class="hv-trk-row" data-hv-trk/, "tracker row");
  // Plain tracker names replace the slogan cards ("Your window to the constellation."); home-studio.js skips filters when the grid is absent.
  const toolsHead = one(tools, /<header class="hs-section-head"/, "tools heading");
  const toolsBody = tools.slice(tools.indexOf(toolsHead) + toolsHead.length, tools.lastIndexOf("</section>"));
  tools = replaceOnce(tools, toolsHead + toolsBody, DS.sectionHead({ id: "hv-trk-h", title: "Trackers and tools" }) + DS.storyList(HOME_TOOLS, { thumbs: false, label: "Trackers and tools", id: "ds-tools" }));
  calendar = replaceOnce(calendar, one(calendar, /<div>/, "calendar heading"), DS.sectionHead({ id: "ds-launch-h", title: "Upcoming launches", href: "/calendar.html", linkText: "Calendar" }));
  calendar = calendar.replace('<section class="hs-calendar"', '<section class="hs-calendar" aria-labelledby="ds-launch-h"');

  // The lead image is the first thing on a phone: load it eagerly at high priority.
  const leadPicture = (lead.match(/<picture>[\s\S]*?<\/picture>/) || [""])[0];
  lead = lead.replace(/(<div class="hv-lead-media">[\s\S]*?<img\b[^>]*?)\sloading="lazy"/, '$1 loading="eager" fetchpriority="high"');
  const leadHref = (lead.match(/<a class="hv-lead" href="([^"]+)"/) || [])[1];
  if (!leadHref) throw new Error("Lead story link not found");

  const latest = DS.storyList(articles(root), { limit: 7, exclude: [leadHref], label: "Latest stories" });
  // home-v2.js still repaints the three supporting cards; they stay in the page, hidden, so the script keeps working.
  const suppHidden = supp.replace('<div class="hv-supp" data-hv-supp', '<div class="hv-supp" data-hv-supp hidden');

  const body = [
    mainOpen.replace('class="hv hs-home"', 'class="hv hs-home ds-page ds-home"'),
    '<div class="pn-spacer"></div>',
    liveTop,
    feature,
    DS.masthead({ small: true, title: "Tesla, SpaceX and xAI news", className: "ds-home-mast", extraHtml: updated }),
    '<section class="ds-home-top" id="latest-stories" aria-labelledby="ds-top-h">',
    '<h2 id="ds-top-h" class="visually-hidden">Top story</h2>',
    lead,
    '<div class="ds-home-latest">',
    DS.sectionHead({ id: "ds-latest-h", title: "Latest", href: "/dispatch.html", linkText: "All stories" }),
    latest,
    suppHidden,
    "</div>",
    // Tracker numbers (dated snapshots) sit under the lead on desktop and after the latest list on phones (grid areas in ds-preview.css).
    '<section class="ds-home-numbers" aria-labelledby="ds-numbers-h">',
    DS.sectionHead({ id: "ds-numbers-h", title: "From the trackers" }),
    trkRow,
    event,
    "</section>",
    "</section>",
    '<section class="ds-section ds-home-signup" aria-label="The Sunday briefing">',
    signup,
    "</section>",
    tools,
    calendar,
    wire,
    band,
    DS.previewFlag("/"),
    "</main>",
  ].join("\n");

  let page = replaceOnce(live, main, body);
  page = previewHead(page, { live: "/", preload: preloadFor(leadPicture, "(max-width: 760px) 100vw, 640px"), root });
  return page;
}

/** Header furniture an article opens with, before its first piece of content. */
const ARTICLE_HEADER = new Set(["eyebrow", "standfirst", "meta", "sd-disclosure", "sd-updated"]);

/**
 * Article: the reading tools (rs:tools) and "On this page" (sd:article-wayfinding) move from between the standfirst and
 * the byline to just after the lead photo or video, so the headline, standfirst, byline and lead image sit together in
 * the first screen. Nothing else moves. Both blocks are page furniture for scripts/editorial-dates.py once rs:tools joins
 * its BLOCKS list (redesign step 3), so the same move in build-article-reader.py and build-wayfinding.py at the switch
 * does not re-stamp "Updated" dates. Where the story has no lead figure the blocks go just before its first content.
 */
export function buildArticle(slug, root = ROOT) {
  const liveUrl = `/dispatch/${slug}.html`;
  const live = read(liveUrl.slice(1), root);
  assertRootRelative(live, liveUrl);
  if (!/<article\b[^>]*class="[^"]*\brs-article\b/.test(live)) throw new Error(liveUrl + " is not a Dispatch article");
  let page = live.replace(/<body class="([^"]*)"/, (m, c) => `<body class="${c} ds-page ds-article"`);
  if (!page.includes("ds-article")) throw new Error(liveUrl + ": no <body class> to extend");
  const tools = between(page, "<!--rs:tools-->", "<!--/rs:tools-->");
  page = replaceOnce(page, tools, "");
  let way = "";
  if (page.includes("<!--sd:article-wayfinding-->")) {
    way = between(page, "<!--sd:article-wayfinding-->", "<!--/sd:article-wayfinding-->");
    page = replaceOnce(page, way, "");
  }
  const art = findElement(page, /<article\b[^>]*class="[^"]*\brs-article\b[^"]*"[^>]*>/);
  const inner = page.indexOf(">", art.start) + 1;
  const kids = children(page, inner, page.lastIndexOf("</article>", art.end));
  const first = kids.find((k) => k.tag !== "h1" && !k.cls.split(/\s+/).some((c) => ARTICLE_HEADER.has(c)));
  if (!first) throw new Error(liveUrl + ": no content after the article header");
  const at = first.tag === "figure" ? first.end : first.start;
  page = page.slice(0, at) + "\n" + tools + (way ? "\n" + way : "") + "\n" + page.slice(at);
  page = replaceOnce(page, "</main>", DS.previewFlag(liveUrl) + "\n</main>");
  return previewHead(page, { live: liveUrl, keepImagePreloads: true, root });
}

/** Three article types: a news story, a long feature, and a finance story with the share disclosure. */
export const ARTICLES = ["tesla-cybercab-dallas-launch", "starship-every-flight-1-to-15", "spacex-q3-2026-results"];

export const PAGES = [
  { out: "preview/index.html", build: buildHome },
  ...ARTICLES.map((slug) => ({ out: `preview/dispatch/${slug}.html`, build: (root) => buildArticle(slug, root) })),
];

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
