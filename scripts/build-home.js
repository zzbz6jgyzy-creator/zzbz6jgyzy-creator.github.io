#!/usr/bin/env node
// Pre-renders the homepage's Dispatch lead, supporting stories, tracker numbers and headlines
// into index.html between <!--hv:NAME--> ... <!--/hv:NAME--> markers, so the content is in the
// raw HTML for crawlers and no-JS visitors. home-v2.js still replaces it live in the browser.
// Run: node scripts/build-home.js   (refresh workflows + home-build.yml re-run it)
// Locks: homepage band always includes data-band-topic="website"; home event pick
// matches live.js (timed Falcon stays, NET Starship drops); tesla/spacex rewrite
// never inserts markers before <main> and aborts if it would drop a <picture>.
const fs = require("fs"), path = require("path"), vm = require("vm");
const pairer = require("../home-pair.js");
const homeTrackers = require("../home-tracker-data.js");
const { pickNextEvent, ll2Events } = require("./live-home-pick");
const R = path.join(__dirname, ".."), rd = (f) => fs.readFileSync(path.join(R, f), "utf8");
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = (h) => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const day = (d, o) => new Intl.DateTimeFormat("en-GB", Object.assign({ day: "numeric", month: "short", timeZone: "UTC" }, o)).format(d);
const win = {}; vm.createContext({ window: win });
for (const f of ["starship-data.js", "fsd-europe-data.js", "cybercab-data.js"]) { try { vm.runInContext(rd(f), vm.createContext({ window: win })); } catch (e) { console.warn("skip", f, e.message); } }

// Dispatch cards
const cards = [], seen = new Set();
for (const m of rd("dispatch.html").matchAll(/<a class="story-card[^"]*" href="(\/dispatch\/[^"]+)">([\s\S]*?)<\/a>/g)) {
  const b = m[2], g = (re) => ((b.match(re) || [])[1] || "");
  const c = { href: m[1], img: g(/poster="([^"]+)"/) || g(/<img[^>]*src="([^"]+)"/), tag: strip(g(/<span class="tag[^"]*">([\s\S]*?)<\/span>/)) || "Dispatch", h: strip(g(/<h[23]>([\s\S]*?)<\/h[23]>/)), p: strip(g(/<div class="story-copy">[\s\S]*?<p>([\s\S]*?)<\/p>/)) };
  if (c.h && !seen.has(c.href)) { seen.add(c.href); cards.push(c); }
}
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "’");
cards.forEach((c) => { c.h = decode(c.h); c.p = decode(c.p); c.tag = decode(c.tag); });
// Pin: data/articles.json "pinned": true (+ optional "pinUntil" ISO time) holds a story as the lead until it expires
try {
  const now = Date.now(), pin = (JSON.parse(rd("data/articles.json")).articles || []).find((a) => a.pinned && (!a.pinUntil || Date.parse(a.pinUntil) > now));
  if (pin) {
    let i = cards.findIndex((c) => c.href === pin.url);
    const pc = i >= 0 ? cards.splice(i, 1)[0] : { href: pin.url, img: pin.image, tag: pin.tag || "Dispatch", h: pin.title, p: pin.summary };
    cards.unshift(pc);
  }
} catch (e) { console.warn("pin skip", e.message); }
const L = cards[0];
// Optional homepage-only copy never changes the article's title, description or body.
const homeArticle = (() => { try { return (JSON.parse(rd("data/articles.json")).articles || []).find((a) => L && a.url === L.href); } catch (e) { return null; } })();
const homeCopy = (key, fallback) => homeArticle && typeof homeArticle[key] === "string" && homeArticle[key].trim() ? homeArticle[key].trim() : fallback;
// Lead image: <picture> with the AVIF/WebP sets build-images.mjs makes (<name>-<w>w.avif/webp), plus a preload
const pinAlt = (() => { try { const a = (JSON.parse(rd("data/articles.json")).articles || []).find((x) => L && x.url === L.href); return a && a.imageAlt; } catch (e) { return ""; } })();
const leadSrc = (L && L.img) || "/assets/dispatch/cybercab-austin-poster.jpg";
const sets = {};
if (/^\/assets\/.+\.(jpe?g|png)$/i.test(leadSrc)) {
  const base = leadSrc.replace(/\.(jpe?g|png)$/i, ""), dir = path.join(R, path.dirname(leadSrc)), stem = path.basename(base);
  for (const fmt of ["avif", "webp"]) {
    const ws = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).map((f) => (f.match(new RegExp("^" + stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "-(\\d+)w\\." + fmt + "$")) || [])[1]).filter(Boolean).map(Number).filter((w) => w <= 1600).sort((a, b) => a - b);
    if (ws.length) sets[fmt] = ws.map((w) => `${base}-${w}w.${fmt} ${w}w`).join(", ");
  }
}
const SZ = "(max-width: 760px) 100vw, 640px";
const leadAlt = pinAlt || (L ? L.h : "");
const leadImg = `${sets.avif ? `<source type="image/avif" srcset="${esc(sets.avif)}" sizes="${SZ}" />` : ""}${sets.webp ? `<source type="image/webp" srcset="${esc(sets.webp)}" sizes="${SZ}" />` : ""}<img src="${esc(leadSrc)}" alt="${esc(leadAlt)}" width="1280" height="800" loading="lazy" decoding="async" data-hv-img />`;
const SZH = "(max-width:600px) 100vw, (max-width:960px) 48vw, 700px";

const lead = L ? `<a class="hv-lead" href="${esc(L.href)}" data-hv-lead>
            <div class="hv-lead-media"><picture>${leadImg}</picture></div>
            <div class="hv-lead-copy"><span class="hv-tag" data-hv-tag>${esc(L.tag)}</span><h3 data-hv-h>${esc(homeCopy("homeTitle", L.h))}</h3><p data-hv-p>${esc(homeCopy("homeSummary", L.p))}</p><span class="hv-read">Read the story →</span></div>
          </a>` : null;
const suppThumb = (src) => {
  const webp = String(src).replace(/\.(jpe?g|png)$/i, "-480w.webp");
  return `<img src="${esc(webp)}" alt="" width="112" height="70" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${esc(src)}'" />`;
};
const supp = cards.slice(1, 4).map((c) => `<a class="hv-s" href="${esc(c.href)}">${c.img ? suppThumb(c.img) : ""}<div><span class="hv-tag">${esc(c.tag)}</span><h3>${esc(c.h)}</h3></div></a>`).join("");

// Trackers (same rules as home-v2.js)
const trk = [], S = win.STARSHIP, F = win.FSD_EUROPE, C = win.CYBERCAB;
let ev = null; try { ev = JSON.parse(rd("data/events.json")); } catch (e) {}
if (S && S.next) {
  const e = ev && ev.events && ev.events["starship-flight-" + S.next.flight];
  const start = e && e.date ? e.date + "T00:00:00Z" : S.next.start, prec = (e && e.precision) || S.next.precision;
  trk.push({ href: "/starship.html", k: "Starship", v: "Flight " + S.next.flight, s: (!S.next.inFlight && (prec === "day" || (e && /net/i.test(e.status))) ? "NET " : "") + day(new Date(start)) + " · " + (S.next.headline || "") });
}
if (F && F.countries) {
  const rec = F.countries.filter((c) => c.jurisdiction === "EU" && c.permission?.status !== "unknown" && c.permission?.date);
  const listed = F.countries.filter((c) => c.jurisdiction === "EU" && c.availability?.status === "listed").length;
  trk.push({ href: "/fsd-europe.html", k: "FSD Europe", v: rec.length + " EU countries recognised", s: (F.updated ? "As of " + homeTrackers.irishTime(F.updated) + " · " : "") + listed + " Tesla-listed · Finland latest, Tesla listing pending · recognition is not a committee vote" });
}
let tx = null; try { tx = JSON.parse(rd("data/robotaxi-tx.json")); } catch (e) {}
let savedCc = null;
try {
  const saved = rd("index.html").match(/<a class="hv-t" href="\/cybercab\.html">([\s\S]*?)<\/a>/);
  const value = saved && saved[1].match(/<strong>([\s\S]*?)<\/strong>/), label = saved && saved[1].match(/<span class="hv-t-s">([\s\S]*?)<\/span>/);
  if (value && label) savedCc = { value: decode(strip(value[1])), label: decode(strip(label[1])) };
} catch (e) {}
const cc = homeTrackers.cybercab(tx, savedCc || C && C.stats && C.stats.find((s) => s.live === "cybercab"));
if (cc) trk.push({ href: "/cybercab.html", k: "Cybercab", v: cc.value, s: cc.label });
try {
  const sw = homeTrackers.software(JSON.parse(rd("updates-live.json")));
  if (sw) trk.push({ href: "/updates.html", k: "Software updates", v: sw.value, s: sw.label });
} catch (e) {}
const trkHtml = trk.map((x) => `<a class="hv-t" href="${x.href}"><span class="hv-t-k">${esc(x.k)}</span><strong>${esc(x.v)}</strong><span class="hv-t-s">${esc(x.s)}</span></a>`).join("");
// Snapshot refreshes must update saved counts without rewriting other pages.
if (process.argv.includes("--trackers-only")) {
  const file = path.join(R, "index.html"), before = rd("index.html");
  const marker = /<!--hv:trk-->[\s\S]*?<!--\/hv:trk-->/;
  if (!marker.test(before)) throw new Error("homepage tracker markers missing");
  const after = before.replace(marker, () => `<!--hv:trk-->${trkHtml}<!--/hv:trk-->`);
  if (after !== before) fs.writeFileSync(file, after);
  console.log(after === before ? "homepage trackers unchanged" : "homepage trackers updated");
  process.exit(0);
}

// Headlines
let feed = "";
try {
  const d = JSON.parse(rd("news-data.json")), s2 = new Set();
  let arts = [];
  try { arts = (JSON.parse(rd("data/articles.json")).articles || []); } catch (e2) {}
  const used = new Set();
  const keep = require("../news-keep.js");
  const held = (() => { try { return JSON.parse(rd("data/news-hold.json")); } catch (e3) { return {}; } })();
  feed = keep.forHomepage((d.items || []).filter((it) => { const k = (it.title || "").toLowerCase(); if (!k || s2.has(k)) return false; s2.add(k); return /^https:\/\//.test(it.url || ""); }), held).slice(0, 8)
    .map((it) => pairer.itemHtml(it, pairer.pairItem(it, arts, used), esc, `${it.source || ""} · ${it.published ? day(new Date(it.published)) : ""}`.replace(/^ · /, ""))).join("");
} catch (e) {}

// Next-livestream card (same pick + markup as live.js's "Next live stream" card), prebuilt so the
// lead story doesn't jump when live.js mounts it. Times are written in UTC; live.js swaps in the
// visitor's own zone straight away. live.js removes [data-prebuilt] before mounting its own card.
function eventCardFor(page) {
  try {
  const d = JSON.parse(rd("live-data.json")), shared = (ev && ev.events) || {}, now = Date.now(), H = 36e5;
  let L = null; try { L = JSON.parse(rd("data/launches.json")); } catch (_) {}
  const all = (d.events || []).concat(ll2Events(L, (d.events || []).filter((x) => x.status !== "ended"), H));
  const e = pickNextEvent(all, { page, shared, now, H });
  if (!e) return "";
    const canEmbed = e.provider === "youtube" || e.provider === "x";
    const url = e.provider === "youtube" && /^[\w-]{6,20}$/.test(e.embedId || "") ? "https://www.youtube.com/watch?v=" + e.embedId : (/^https:\/\//.test(e.fallbackUrl || e.postUrl || "") ? (e.fallbackUrl || e.postUrl) : "/calendar.html");
    const o = { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" };
    const dm = /^(\d{4})-(\d\d)-(\d\d)/.exec(e.start || ""), dayD = (e.timeTbc || e.net) && dm ? new Date(Date.UTC(+dm[1], dm[2] - 1, +dm[3], 12)) : new Date(e.start);
    const date = new Intl.DateTimeFormat("en-GB", o).format(dayD) + (e.timeTbc || e.net ? "" : " · " + new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(e.start)));
    const chip = e.timeTbc ? "Time TBC" : e.net ? "NET" : "UTC";
    if (page === "home") return '<section class="lv lv-inhero lv-quiet lv-home-next" aria-label="Next livestream" data-prebuilt>' + require('../home-next.js').html(e, {dateText: date, chip, url, now}) + '</section>';
    const src = e.thumb || e.image || "";
    const thumb = /\/assets\/live\/falcon9\.(jpe?g|png|webp)$/i.test(src)
      ? `<div class="lw-thumb" role="img" aria-label="${esc(e.title)}"><picture><source type="image/avif" srcset="/assets/live/falcon9-480w.avif 480w, /assets/live/falcon9-960w.avif 960w, /assets/live/falcon9-1200w.avif 1200w" sizes="(max-width:760px) 92vw, 360px" /><source type="image/webp" srcset="/assets/live/falcon9-480w.webp 480w, /assets/live/falcon9-960w.webp 960w, /assets/live/falcon9-1200w.webp 1200w" sizes="(max-width:760px) 92vw, 360px" /><img src="/assets/live/falcon9.jpg" alt="" width="1200" height="800" fetchpriority="high" decoding="async" /></picture></div>`
      : (e.image ? `<div class="lw-thumb" role="img" aria-label="${esc(e.title)}"><img src="${esc(src)}" alt="" width="1200" height="800" fetchpriority="high" decoding="async" /></div>` : "");
    const credit = e.image && e.imageCredit ? `<small class="lw-cr">${esc(e.imageCredit)}</small>` : "";
    const tile = (n, l) => `<span class="lw-tile"><b>${n}</b><i>${l}</i></span>`;
    const tiles = e.net ? "" : `<div class="lw-cd" aria-live="off">${tile("–", "days") + tile("––", "hrs") + tile("––", "mins")}</div>`;
    if (new Date(e.start) - now > 72 * H) { // >72h out: slim card (live.js swaps in the visitor's zone)
      const dd = Math.round((new Date(e.start) - now) / 864e5);
      return `<section class="lv${page === "home" ? " lv-inhero" : ""} lv-quiet lv-slim" aria-label="Next livestream" data-prebuilt><a class="lw lw-slim" href="${esc(url)}" target="_blank" rel="noopener"><span class="lw-dot"></span><span class="lws-txt"><b class="lws-t">${esc(e.title)}</b><span class="lws-m">${esc(date)} <span class="lv-tz">${esc(chip)}</span> <span class="lws-cd">in ${dd}d</span></span></span>${/^https:\/\/(www\.)?(spacex\.com\/launches|x\.com\/|youtube\.com\/watch)/.test(url) ? '<span class="lws-go">Watch ↗</span>' : ""}</a></section>`;
    }
    return `<section class="lv${page === "home" ? " lv-inhero" : ""} lv-quiet" aria-label="Next livestream" data-prebuilt><div class="lw"><div class="lw-head"><span class="lw-dot"></span><span>Next live stream</span><span class="lw-host">${canEmbed ? "Streamed here on Supercharged Daily" : "Direct link to the official stream"}</span></div><div class="lw-body">${thumb}<div class="lw-info"><h3 class="lw-title">${esc(e.title)}</h3><p class="lw-when">${esc(date)} <span class="lv-tz">${esc(chip)}</span></p>${tiles}<div class="lw-acts"><a class="lw-btn lw-btn-soft" href="${esc(url)}" target="_blank" rel="noopener"><span class="lw-play"></span>Watch the live stream ↗</a><a class="lw-cal" href="/calendar.html">All events →</a></div>${credit}</div></div></div></section>`;
  } catch (err) { console.warn("event card skip", err.message); return ""; }
}
const eventCard = eventCardFor("home");
// Only rewrite an existing <!--hv:event--> pair. Never insert a marker in front of
// <main> — that path previously swallowed tesla.html / spacex.html <picture> sets.
function replaceEventCard(html, card, file) {
  const open = html.indexOf("<!--hv:event-->");
  const close = html.indexOf("<!--/hv:event-->");
  if (open < 0 || close < 0 || close < open) {
    console.warn(file + ": event markers missing; skip");
    return html;
  }
  const block = html.slice(open, close + "<!--/hv:event-->".length);
  if (/<main[\s>]/.test(block)) {
    console.warn(file + ": event markers span <main>; skip");
    return html;
  }
  const next = html.slice(0, open) + "<!--hv:event-->" + card + "<!--/hv:event-->" + html.slice(close + "<!--/hv:event-->".length);
  // count <picture> sets outside the card itself (the old card's own thumb may go)
  const np = (x) => (String(x).match(/<picture\b/gi) || []).length;
  const pics0 = np(html) - np(block);
  const pics1 = np(next) - np("<!--hv:event-->" + card + "<!--/hv:event-->");
  if (pics1 < pics0) {
    console.warn(file + ": would drop <picture> (" + pics0 + " → " + pics1 + "); skip");
    return html;
  }
  return next;
}
for (const [f, pg] of [["tesla.html", "tesla"], ["spacex.html", "spacex"]]) {
  const h0 = rd(f), h = replaceEventCard(h0, eventCardFor(pg), f);
  if (h !== h0) { fs.writeFileSync(path.join(R, f), h); console.log(f + " updated"); }
}


// Starlink "as of" label (homepage Point & identify tile). The tile describes the
// identify catalog, so it reads data/starlink.json (CelesTrak orbits), not
// McDowell's stats page, which updates less often.
let slAsOf = "";
try {
  const SL = JSON.parse(rd("data/starlink.json"));
  const n = SL.count, t = Date.parse(SL.tleAsOf || SL.updated);
  if (n && Number.isFinite(t)) slAsOf = `${Number(n).toLocaleString("en-US")} tracked · orbits as of ${day(new Date(t), { year: "numeric" })} · CelesTrak`;
} catch (e) { console.warn("starlink as-of skip", e.message); }

// Grok page story strip: AI / Grok / xAI / SpaceX AI articles from data/articles.json,
// newest first, reusing the exact story-card markup from dispatch.html.
try {
  const arts = (JSON.parse(rd("data/articles.json")).articles || [])
    .filter((a) => a.topic === "xai" || /\b(AI|Grok|xAI)\b/.test(a.tag || ""))
    .sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6);
  const dh = rd("dispatch.html"), blocks = {};
  for (const m of dh.matchAll(/<a class="story-card[^"]*" href="(\/dispatch\/[^"]+)">[\s\S]*?<\/a>/g)) if (!blocks[m[1]]) blocks[m[1]] = m[0];
  const strip6 = arts.filter((a) => blocks[a.url]).map((a) => blocks[a.url].replace(/^<a class="story-card[^"]*"/, '<a class="story-card reveal"')).join("\n            ");
  const g0 = rd("grok.html"), re = /<!--gk:stories-->[\s\S]*?<!--\/gk:stories-->/;
  if (strip6 && re.test(g0)) {
    const g1 = g0.replace(re, () => `<!--gk:stories-->\n            ${strip6}\n          <!--/gk:stories-->`);
    if (g1 !== g0) { fs.writeFileSync(path.join(R, "grok.html"), g1); console.log("grok.html updated"); }
  }
} catch (e) { console.warn("grok strip skip", e.message); }

// Hero showcase tile: the next-newest story after the lead (the lead itself sits just below), rebuilt with every home build.
// It replaced the permanent Roadster showcase on 7 Nov 2026 (owner decision). Class names are kept for the CSS and tests.
const imgSets = (src) => {
  const out = {};
  if (src && /^\/assets\/.+\.(jpe?g|png)$/i.test(src)) {
    const base = src.replace(/\.(jpe?g|png)$/i, ""), dir = path.join(R, path.dirname(src)), stem = path.basename(base);
    for (const fmt of ["avif", "webp"]) {
      const ws = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).map((f) => (f.match(new RegExp("^" + stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "-(\\d+)w\\." + fmt + "$")) || [])[1]).filter(Boolean).map(Number).filter((w) => w <= 1600).sort((a, b) => a - b);
      if (ws.length) out[fmt] = ws.map((w) => `${base}-${w}w.${fmt} ${w}w`).join(", ");
    }
  }
  return out;
};
const H = cards[1] || L, hSets = imgSets(H && H.img), hAlt = (() => { try { const a = (JSON.parse(rd("data/articles.json")).articles || []).find((x) => H && x.url === H.href); return (a && a.imageAlt) || (H ? H.h : ""); } catch (e) { return H ? H.h : ""; } })();
const preload = H && (hSets.avif || hSets.webp)
  ? `<link rel="preload" as="image" type="${hSets.avif ? "image/avif" : "image/webp"}" imagesrcset="${esc(hSets.avif || hSets.webp)}" imagesizes="${SZH}" fetchpriority="high" />`
  : "";
const heroArrow = '<span class="hs-round-arrow" aria-hidden="true"><svg class="hs-arrow" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 13L13 3M3 3H13V13"/></svg></span>';
const heroTile = H
  ? `<a class="hs-hero-roadster hs-hero-lead" href="${esc(H.href)}"><div class="hs-visual-label"><span class="hs-eyebrow">Also new / ${esc(H.tag || "Dispatch")}</span>${heroArrow}</div><picture>${hSets.avif ? `<source type="image/avif" srcset="${esc(hSets.avif)}" sizes="${SZH}"/>` : ""}${hSets.webp ? `<source type="image/webp" srcset="${esc(hSets.webp)}" sizes="${SZH}"/>` : ""}<img src="${esc((H && H.img) || leadSrc)}" alt="${esc(hAlt)}" width="1280" height="720" decoding="async" fetchpriority="high" loading="eager"/></picture><div class="hs-hero-roadster-copy"><span>${esc(H.h)}</span></div><small class="hs-image-credit">Image credit in the story</small></a>`
  : `<a class="hs-hero-roadster hs-hero-lead" href="/dispatch.html"><div class="hs-visual-label"><span class="hs-eyebrow">Latest from Dispatch</span>${heroArrow}</div><div class="hs-hero-roadster-copy"><span>Read today's stories.</span></div></a>`;

// "Last updated": the newest of the latest Dispatch story and the trackers' own update times.
const lastUpdated = (() => {
  const cands = [];
  try { const a = (JSON.parse(rd("data/articles.json")).articles || []).map((x) => x.date).filter(Boolean).sort().pop(); if (a) cands.push([a, "Dispatch", "/dispatch.html"]); } catch (e) {}
  for (const [f, key, label, href] of [["updates-live.json", "updated", "Software tracker", "/updates.html"], ["data/starlink.json", "updated", "Starlink tracker", "/starlink.html"], ["live-data.json", "updated", "Launch board", "/calendar.html"]]) {
    try { const v = JSON.parse(rd(f))[key]; if (v) cands.push([v, label, href]); } catch (e) {}
  }
  const now = Date.now(), ok = cands.filter(([t]) => Number.isFinite(Date.parse(t)) && Date.parse(t) <= now + 300000).sort((x, y) => Date.parse(y[0]) - Date.parse(x[0]));
  if (!ok.length) return "";
  const [t, label, href] = ok[0], d = new Date(t);
  const text = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(d).replace(",", "");
  return `<p class="hv-updated">Last updated <time datetime="${esc(d.toISOString())}">${esc(text)} UTC</time> · <a href="${esc(href)}">${esc(label)}</a></p>`;
})();

// The saved hero follows its mobile reading order. CSS keeps the desktop split composition.
const hero = `<header class="hs-hero">
  <div class="hs-hero-copy">
    <p class="hs-eyebrow"><span aria-hidden="true"></span> Independent minds. Extraordinary progress.</p>
    ${lastUpdated}
    <h1>Go beyond<br/><span>the headline.</span></h1>
    <p class="hv-pitch">Tesla, SpaceX and xAI. Sourced stories and interactive tools that bring you closer to what’s next.</p>
<!--sd:home-wayfinding--><nav class="hv-start" aria-label="Start exploring"><a href="#latest-stories">Latest stories <span aria-hidden="true">↓</span></a><a href="#hv-trk-h">Explore trackers <svg class="hs-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 13L13 3M3 3H13V13"/></svg></a></nav><!--/sd:home-wayfinding-->
  </div>
  <div class="hs-hero-visual">
    <div class="hs-showcase-index" aria-hidden="true"><span>THE SUPERCHARGED EXPERIENCE</span><span>EXPLORE / 01—03</span></div>
    ${heroTile}

    <div class="hs-hero-pair"><a class="hs-hero-launch" href="/starship.html"><picture><source type="image/avif" srcset="/assets/dispatch/starship-ift5-jurvetson-480w.avif 480w, /assets/dispatch/starship-ift5-jurvetson-960w.avif 960w" sizes="200px"/><img src="/assets/dispatch/starship-ift5-jurvetson-480w.webp" alt="Starship launch infrastructure at Starbase. Photograph: Steve Jurvetson, CC BY 2.0." width="480" height="640" loading="lazy" decoding="async"/></picture><span class="hs-launch-copy"><small>Starship / Flight lab</small><strong>Built to go further.</strong><b>Explore Starship <svg class="hs-arrow" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 13L13 3M3 3H13V13"/></svg></b></span></a><a class="hs-hero-orbit" href="/starlink.html"><svg viewBox="0 0 600 330" fill="none" aria-hidden="true" class="hs-globe"><defs><radialGradient id="hs-mini-planet"><stop stop-color="#344b69"/><stop offset=".65" stop-color="#132c4e"/><stop offset="1" stop-color="#071324"/></radialGradient><radialGradient id="hs-mini-atmosphere"><stop offset=".7" stop-color="#3080bd" stop-opacity="0"/><stop offset=".9" stop-color="#56a7e0" stop-opacity=".15"/><stop offset="1" stop-color="#0b1020" stop-opacity="0"/></radialGradient><clipPath id="hs-mini-globe-clip"><circle cx="350" cy="173" r="108"/></clipPath></defs><circle cx="350" cy="173" r="148" fill="url(#hs-mini-atmosphere)"/><circle cx="350" cy="173" r="108" fill="url(#hs-mini-planet)" stroke="#63819a" stroke-opacity=".5"/><g clip-path="url(#hs-mini-globe-clip)" stroke="#7dabc3" stroke-opacity=".23"><ellipse cx="350" cy="173" rx="42" ry="108"/><ellipse cx="350" cy="173" rx="82" ry="108"/><ellipse cx="350" cy="173" rx="108" ry="35"/><ellipse cx="350" cy="173" rx="108" ry="75"/><path d="M242 173H458M350 65V281"/><path d="M300 100L321 111 325 133 346 146 335 164 314 165 300 188 284 180 278 152 287 135ZM349 187L369 179 393 189 402 212 389 237 375 232 366 207Z" fill="#75a5b6" fill-opacity=".14"/></g><g class="hs-orbits" stroke="#7798b6" stroke-opacity=".4"><ellipse cx="350" cy="173" rx="195" ry="64" transform="rotate(-25 350 173)"/><ellipse cx="350" cy="173" rx="168" ry="60" transform="rotate(34 350 173)"/><ellipse cx="350" cy="173" rx="155" ry="48" transform="rotate(-66 350 173)"/></g><g fill="#bed9ee"><circle cx="194" cy="248" r="3"/><circle cx="492" cy="140" r="3"/><circle cx="419" cy="67" r="3"/><circle cx="268" cy="91" r="2"/></g><circle cx="444" cy="239" r="4" fill="#ed2346"/><circle cx="444" cy="239" r="10" stroke="#ed2346" stroke-opacity=".4"/></svg><span><small>Starlink / Observatory</small><strong>A world in orbit.</strong><b>Explore the tracker <svg class="hs-arrow" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 13L13 3M3 3H13V13"/></svg></b></span></a></div>
    <p class="hs-hero-credits">Starship photo: <a href="https://commons.wikimedia.org/wiki/File:SpaceX_Starship_before_IFT-5.jpg" target="_blank" rel="noopener">Steve Jurvetson</a> · <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener">CC BY 2.0</a> · cropped</p>
  </div>
  <div class="hs-hero-signup" id="newsletter" data-newsletter="band" data-band-topic="website" data-newsletter-placement="hero"><p class="hs-signup-label">Your Sunday advantage. Free in your inbox.</p><form class="sd-form hs-form" data-newsletter-form action="https://alexs-newsletter-84b17e.beehiiv.com/" method="get"><label class="visually-hidden" for="hs-hero-email">Email address</label><input id="hs-hero-email" type="email" name="email" autocomplete="email" inputmode="email" placeholder="Your email address" required aria-describedby="hs-hero-email-note hs-hero-email-status"/><input type="text" name="website" hidden tabindex="-1" autocomplete="off" aria-hidden="true"/><input type="hidden" name="utm_source" value="website"/><input type="hidden" name="utm_medium" value="site-band"/><input type="hidden" name="utm_campaign" value="/"/><input type="hidden" name="utm_content" value="website"/><button class="sd-btn" type="submit">Get the free briefing <span aria-hidden="true"><svg class="hs-arrow" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 13L13 3M3 3H13V13"/></svg></span></button></form><p class="hs-form-note" id="hs-hero-email-note">Free, every Sunday. Unsubscribe anytime.</p><p class="newsletter-status" id="hs-hero-email-status" data-newsletter-status role="status"></p><a class="hs-sample-link sd-latest" href="https://alexs-newsletter-84b17e.beehiiv.com/p/supercharged-daily-goodbye-cybertruck-hello-friday-the-13th?utm_source=website&amp;utm_medium=site-hero&amp;utm_campaign=latest-issue" target="_blank" rel="noopener">Read a real issue <span aria-hidden="true">↗</span></a>
    <p class="hs-author">Independent reporting by Alex R. <a href="/about.html">Meet the editor <svg class="hs-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 13L13 3M3 3H13V13"/></svg></a></p>
  </div>
</header>`;

// One main signup on the homepage: the hero form. The old bottom band (a second full form) was removed on
// 9 Nov 2026; on phones grow.js shows a slim bar (data-bar) that jumps back to the hero form instead.

let html = rd("index.html"); const before = html;
if (!/<header class="hs-hero">[\s\S]*?<\/header>/.test(html)) throw new Error("homepage hero missing");
html = html.replace(/<header class="hs-hero">[\s\S]*?<\/header>/, () => hero);
const put = (name, inner) => {
  if (inner == null || inner === "") return;
  const re = new RegExp(`<!--hv:${name}-->[\\s\\S]*?<!--/hv:${name}-->`);
  if (!re.test(html)) throw new Error("marker missing: " + name);
  html = html.replace(re, () => `<!--hv:${name}-->${inner}<!--/hv:${name}-->`);
};
put("lead", lead); put("preload", preload);
// The band slot stays (grow.js looks for it) but is emptied on every build.
html = html.replace(/<!--hv:band-->[\s\S]*?<!--\/hv:band-->/, "<!--hv:band--><!--/hv:band-->");
// Featured event strip (data/event-pages/*.json with featureUntil in the future). It is rebuilt with
// every home build, so it disappears on its own when featureUntil passes.
{
  const ev = require("./event-shared.cjs"), strip = ev.featureHtml(ev.activeFeature(R));
  const re = /<!--hv:feature-->[\s\S]*?<!--\/hv:feature-->/;
  if (!re.test(html)) html = html.replace('<div class="hv-live-top" data-live-slot data-live-only data-collapsed></div>', (m) => m + "<!--hv:feature--><!--/hv:feature-->");
  if (!re.test(html)) throw new Error("marker missing: feature");
  html = html.replace(re, () => `<!--hv:feature-->${strip}<!--/hv:feature-->`);
}
html = replaceEventCard(html, eventCard, "index.html");
 put("supp", supp); put("slasof", slAsOf); put("trk", trkHtml); put("feed", feed);
try {
  const intel = require("../intel-core.js");
  const bundle = JSON.parse(rd("data/intelligence/bundle.json"));
  put("changed", intel.homeSection(bundle));
} catch (e) { console.warn("intel changed skip", e.message); }
if (html.includes('class="hv hs-home"')) html = html.replace(/↗/g, '<svg class="hs-arrow" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 13L13 3M3 3H13V13"/></svg>');
if (html !== before) { fs.writeFileSync(path.join(R, "index.html"), html); console.log("index.html updated"); } else console.log("index.html unchanged");

