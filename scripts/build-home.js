#!/usr/bin/env node
// Pre-renders the homepage's Dispatch lead, supporting stories, tracker numbers and headlines
// into index.html between <!--hv:NAME--> ... <!--/hv:NAME--> markers, so the content is in the
// raw HTML for crawlers and no-JS visitors. home-v2.js still replaces it live in the browser.
// Run: node scripts/build-home.js   (refresh workflows + home-build.yml re-run it)
const fs = require("fs"), path = require("path"), vm = require("vm");
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
const L = cards[0];
const lead = L ? `<a class="hv-lead" href="${esc(L.href)}" data-hv-lead>
            <div class="hv-lead-media"><img src="${esc(L.img || "/assets/dispatch/cybercab-austin-poster.jpg")}" alt="" data-hv-img /></div>
            <div class="hv-lead-copy"><span class="hv-tag" data-hv-tag>${esc(L.tag)}</span><h2 data-hv-h>${esc(L.h)}</h2><p data-hv-p>${esc(L.p)}</p><span class="hv-read">Read the story →</span></div>
          </a>` : null;
const supp = cards.slice(1, 4).map((c) => `<a class="hv-s" href="${esc(c.href)}">${c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy" />` : ""}<div><span class="hv-tag">${esc(c.tag)}</span><h3>${esc(c.h)}</h3></div></a>`).join("");

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
  trk.push({ href: "/fsd-europe.html", k: "FSD Europe", v: ok.length + " / " + (F.thresholds ? F.thresholds.statesNeeded : 15), s: "states recognise RDW approval · " + pct + "% of EU pop. (need " + (F.thresholds ? F.thresholds.populationNeeded : 65) + "%)" });
}
if (C && C.stats && C.stats[0]) trk.push({ href: "/cybercab.html", k: "Cybercab", v: C.stats[0].value, s: C.stats[0].label });
try {
  const u = JSON.parse(rd("updates-live.json")), vs = (u.versions || []).filter((x) => x.count > 0);
  const top = [...vs].sort((a, b) => b.count - a.count)[0], nw = [...vs].sort((a, b) => (b.firstSeen || "").localeCompare(a.firstSeen || ""))[0];
  if (nw) trk.push({ href: "/updates.html", k: "Software updates", v: nw.id, s: "newest build reporting · most common: " + (top ? top.id + " (" + top.percent + "%)" : "—") + " · Teslascope" });
} catch (e) {}
const trkHtml = trk.map((x) => `<a class="hv-t" href="${x.href}"><span class="hv-t-k">${esc(x.k)}</span><strong>${esc(x.v)}</strong><span class="hv-t-s">${esc(x.s)}</span></a>`).join("");

// Headlines
let feed = "";
try {
  const d = JSON.parse(rd("news-data.json")), s2 = new Set(), lab = { tesla: "Tesla", spacex: "SpaceX", grok: "xAI", xai: "xAI", x: "X" };
  feed = (d.items || []).filter((it) => { const k = (it.title || "").toLowerCase(); if (!k || s2.has(k)) return false; s2.add(k); return /^https:\/\//.test(it.url || ""); }).slice(0, 8)
    .map((it) => `<li><a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer"><span class="hv-f-t">${esc(lab[it.topic] || "News")}</span><span class="hv-f-h">${esc((it.title || "").replace(/\s+-\s+[^-]+$/, ""))}</span><span class="hv-f-m">${esc(it.source || "")} · ${it.published ? day(new Date(it.published)) : ""}</span></a></li>`).join("");
} catch (e) {}

let html = rd("index.html"); const before = html;
const put = (name, inner) => {
  if (inner == null || inner === "") return;
  const re = new RegExp(`<!--hv:${name}-->[\\s\\S]*?<!--/hv:${name}-->`);
  if (!re.test(html)) throw new Error("marker missing: " + name);
  html = html.replace(re, () => `<!--hv:${name}-->${inner}<!--/hv:${name}-->`);
};
put("lead", lead); put("supp", supp); put("trk", trkHtml); put("feed", feed);
if (html !== before) { fs.writeFileSync(path.join(R, "index.html"), html); console.log("index.html updated"); } else console.log("index.html unchanged");
