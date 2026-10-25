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
  const c = { href: m[1], img: g(/poster="([^"]+)"/) || g(/<img[^>]*src="([^"]+)"/), tag: strip(g(/<span class="tag[^"]*">([\s\S]*?)<\/span>/)) || "Dispatch", h: strip(g(/<h3>([\s\S]*?)<\/h3>/)), p: strip(g(/<div class="story-copy">[\s\S]*?<p>([\s\S]*?)<\/p>/)) };
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
const preload = `<link rel="preload" as="image" type="image/avif" href="/assets/roadster-studio/finale-640w.avif" imagesrcset="/assets/roadster-studio/finale-640w.avif 640w, /assets/roadster-studio/finale-1280w.avif 1280w, /assets/roadster-studio/finale-1920w.avif 1920w" imagesizes="(max-width:760px) 100vw,560px" fetchpriority="high" />`;
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
  trk.push({ href: "/starship.html", k: "Starship", v: "Flight " + S.next.flight, s: (prec === "day" ? "NET " : "") + day(new Date(start)) + " · " + (S.next.headline || "") });
}
if (F && F.countries) {
  const ok = F.countries.filter((c) => c.status === "approved"), pop = ok.reduce((a, c) => a + (c.pop || 0), 0);
  const pct = F.thresholds ? Math.round((pop / F.thresholds.euPopulationM) * 100) : 0;
  trk.push({ href: "/fsd-europe.html", k: "FSD Europe", v: F.countries.filter((c) => c.jurisdiction === "EU" && c.availability?.status === "listed").length + " Tesla-listed EU markets", s: "Vehicle eligibility applies · national recognition and committee votes are separate" });
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
  const u = JSON.parse(rd("updates-live.json")), vs = (u.versions || []).filter((x) => x.count > 0);
  const top = [...vs].sort((a, b) => b.count - a.count)[0], nw = [...vs].sort((a, b) => (b.firstSeen || "").localeCompare(a.firstSeen || ""))[0];
  if (nw) trk.push({ href: "/updates.html", k: "Software updates", v: nw.id, s: "newest build reporting · most common: " + (top ? top.id + " (" + top.percent + "% of " + Number(u.fleet || top.fleet).toLocaleString("en-US") + " cars)" : "—") + " · Teslascope, " + String(u.updated || "").slice(0, 10) });
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

// Newsletter band (same markup as grow.js data-band; grow.js skips building it when it's already here)
const band = `<section class="hs-newsletter" id="newsletter-bottom" data-newsletter="band" data-band-topic="website" data-newsletter-placement="footer" aria-labelledby="hs-newsletter-h"><div class="hs-newsletter-copy"><p class="hs-eyebrow">The free Sunday briefing</p><h2 id="hs-newsletter-h">Your week.<br/><span>Supercharged.</span></h2><p class="hs-newsletter-intro">The stories that mattered. The tracker changes worth following. The context behind it all.</p><ul class="hs-newsletter-benefits"><li>Original reporting and analysis</li><li>Tesla, SpaceX and xAI in one place</li><li>Direct links for your next deep dive</li></ul><form class="sd-form hs-form" data-newsletter-form action="https://alexs-newsletter-84b17e.beehiiv.com/" method="get"><label class="visually-hidden" for="hs-bottom-email">Email address</label><input id="hs-bottom-email" type="email" name="email" autocomplete="email" inputmode="email" placeholder="Your email address" required aria-describedby="hs-bottom-email-note hs-bottom-email-status"/><input type="text" name="website" hidden tabindex="-1" autocomplete="off" aria-hidden="true"/><input type="hidden" name="utm_source" value="website"/><input type="hidden" name="utm_medium" value="site-band"/><input type="hidden" name="utm_campaign" value="/"/><input type="hidden" name="utm_content" value="website"/><button class="sd-btn" type="submit">Get the free briefing <span aria-hidden="true">↗</span></button></form><p class="hs-form-note" id="hs-bottom-email-note">Free, every Sunday. Unsubscribe anytime.</p><p class="newsletter-status" id="hs-bottom-email-status" data-newsletter-status role="status"></p></div><div class="hs-newsletter-preview" id="newsletter-preview"><div class="hs-paper"><div class="hs-paper-brand"><img src="/assets/brand/icon-1b-mark.svg" width="28" height="28" alt=""/><span>SUPERCHARGED<br/><b>DAILY</b></span><small>SUNDAY<br/>BRIEFING</small></div><p class="hs-paper-kicker">Your briefing, at a glance</p><h3>A clearer picture.<br/>In one email.</h3><div class="hs-paper-row"><span>01</span><div><strong>The stories that matter</strong><p>What happened. Why it matters.</p></div></div><div class="hs-paper-row"><span>02</span><div><strong>What changed this week</strong><p>The developments worth following.</p></div></div><div class="hs-paper-row"><span>03</span><div><strong>Your next deep dive</strong><p>Go further with the site’s tools.</p></div></div><a class="hs-paper-link sd-latest" href="https://alexs-newsletter-84b17e.beehiiv.com/p/supercharged-daily-musk-s-big-earnings-week?utm_source=website&amp;utm_medium=site-band&amp;utm_campaign=latest-issue" target="_blank" rel="noopener">Read a real issue <span aria-hidden="true">↗</span></a></div></div></section>`;

let html = rd("index.html"); const before = html;
const put = (name, inner) => {
  if (inner == null || inner === "") return;
  const re = new RegExp(`<!--hv:${name}-->[\\s\\S]*?<!--/hv:${name}-->`);
  if (!re.test(html)) throw new Error("marker missing: " + name);
  html = html.replace(re, () => `<!--hv:${name}-->${inner}<!--/hv:${name}-->`);
};
put("lead", lead); put("preload", preload); put("band", band);
html = replaceEventCard(html, eventCard, "index.html");
 put("supp", supp); put("slasof", slAsOf); put("trk", trkHtml); put("feed", feed);
try {
  const intel = require("../intel-core.js");
  const bundle = JSON.parse(rd("data/intelligence/bundle.json"));
  put("changed", intel.homeSection(bundle));
} catch (e) { console.warn("intel changed skip", e.message); }
if (html.includes('class="hv hs-home"')) html = html.replace(/↗/g, '<svg class="hs-arrow" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 13L13 3M3 3H13V13"/></svg>');
if (html !== before) { fs.writeFileSync(path.join(R, "index.html"), html); console.log("index.html updated"); } else console.log("index.html unchanged");

