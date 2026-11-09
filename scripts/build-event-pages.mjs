#!/usr/bin/env node
// Event pages: single-topic hubs (e.g. /starship-flight-15.html) built from data/event-pages/<slug>.json.
// The launch / event time comes from data/events.json (eventId), so there is ONE place to change it.
// First run copies the site shell (head, nav, footer) from editorial.html; later runs keep the page's own
// shell and only replace the <!--ev:head--> block and <main>. Scripts are added by inject-js-bundles.py
// (bundle "event" in scripts/js-bundles.json). Run: node scripts/build-event-pages.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("..", import.meta.url)), SITE = "https://superchargeddaily.com";
const rd = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
import { createRequire } from "node:module";
const { whenText, countdownHtml, eventPages } = createRequire(import.meta.url)("./event-shared.cjs");
export { whenText, countdownHtml };
const CSS_V = "20261109c";
const fmtDate = (d) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(d + "T12:00:00Z"));


// Calendar: an .ics file next to the page (deterministic, so CI rebuilds match) and a Google Calendar link.
const calStamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const calText = (t) => String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// RFC 5545: fold at 75 octets (not characters), never inside a multi-byte character.
const fold = (line) => {
  const out = []; let cur = "", room = 75;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (n > room) { out.push(cur); cur = " "; room = 74; }
    cur += ch; room -= n;
  }
  out.push(cur);
  return out.join("\r\n");
};
function calDetails(p, ev, url) {
  return `${p.windowNote ? p.windowNote.split(" · ").join(", ") + ". " : ""}Times can move: check ${url} for the latest.`;
}
function googleCal(p, ev, url) {
  const q = new URLSearchParams({ action: "TEMPLATE", text: ev.title, dates: `${calStamp(ev.start)}/${calStamp(ev.end || ev.start)}`, details: calDetails(p, ev, url), location: p.location.name });
  return "https://calendar.google.com/calendar/render?" + q.toString();
}
function icsFor(p, ev, url, stampIso) {
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Supercharged Daily//Event pages//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:${p.slug}@superchargeddaily.com`, `DTSTAMP:${calStamp(stampIso)}`, `SEQUENCE:${Math.max(0, Math.floor((Date.parse(stampIso) - Date.UTC(2026, 0, 1)) / 6e4))}`,
    `DTSTART:${calStamp(ev.start)}`, `DTEND:${calStamp(ev.end || ev.start)}`, `SUMMARY:${calText(ev.title)}`,
    `DESCRIPTION:${calText(calDetails(p, ev, url))}`, `LOCATION:${calText(p.location.name)}`, `URL:${url}`, "STATUS:TENTATIVE",
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${calText(ev.title + " window opens in 30 minutes")}`, "TRIGGER:-PT30M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR", "",
  ].map(fold).join("\r\n");
}

function pageMain(p, ev, articles) {
  const url = `${SITE}/${p.slug}.html`;
  const chip = (k) => `<span class="ev-chip ev-chip-${esc(k.toLowerCase())}">${esc(k)}</span>`;
  const rel = (p.related || []).map((h) => articles.find((a) => a.url === h)).filter(Boolean);
  for (const u of p.updates || []) if (u.time && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/.test(u.time)) throw new Error(`${p.slug}: update time "${u.time}" must be UTC, like 2026-11-13T22:47:00Z`);
  const stamp = (u) => u.time || u.date;
  const updates = [...(p.updates || [])].sort((a, b) => stamp(b).localeCompare(stamp(a)));
  const when = (u) => u.time ? `${fmtDate(u.time.slice(0, 10))}, ${new Date(u.time).toISOString().slice(11, 16)} UTC` : fmtDate(u.date);
  const latest = updates.length ? stamp(updates[0]) : "";
  return `<main id="main" class="ev-page">
  <nav class="ev-crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="${esc(p.sectionUrl)}">${esc(p.section)}</a></li><li aria-current="page">${esc(ev.title)}</li></ol></nav>
  <header class="ev-hero">
    <p class="ev-kicker">${esc(p.kicker)}</p>
    <h1>${esc(p.title)}</h1>
    ${countdownHtml(ev, p.windowNote)}
    <p class="ev-where">${esc(p.location.name)}</p>
    <div class="ev-share" data-share><a class="ev-share-x" href="https://x.com/intent/post?text=${encodeURIComponent(p.title)}&amp;url=${encodeURIComponent(url)}&amp;via=ALJR86" target="_blank" rel="noopener">Share on X</a><button type="button" data-share-copy data-url="${esc(url)}">Copy link</button><button type="button" data-share-native data-url="${esc(url)}" data-title="${esc(p.title)}" hidden>Share…</button></div>
    <div class="ev-cal" aria-label="Add to your calendar"><a href="/${esc(p.slug)}.ics" download>Add to calendar</a><a href="${esc(googleCal(p, ev, url))}" target="_blank" rel="noopener">Google Calendar ↗</a></div>
  </header>
  <section class="ev-section" aria-labelledby="ev-mission">
    <h2 id="ev-mission">The mission</h2>
    ${p.summaryTodo ? `<!-- ${esc(p.summaryTodo)} -->` : ""}
    ${p.summary.map((t) => `<p>${esc(t)}</p>`).join("\n    ")}
  </section>
  ${p.heatShield ? `<section class="ev-section" aria-labelledby="ev-heat">
    <h2 id="ev-heat">Why the heat shield matters</h2>
    ${p.heatShield.todo ? `<!-- ${esc(p.heatShield.todo)} -->` : ""}
    <p>${esc(p.heatShield.lead)}</p>
    <ul class="ev-points">${p.heatShield.points.map((t) => typeof t === "string" ? `<li>${esc(t)}</li>` : `<li>${esc(t.text)}${t.source ? ` <a href="${esc(t.source)}" target="_blank" rel="noopener">${esc(t.sourceName || "Source")}</a>` : ""}</li>`).join("")}</ul>
  </section>` : ""}
  <section class="ev-section" aria-labelledby="ev-watch">
    <h2 id="ev-watch">Where to watch</h2>
    ${p.watchTodo ? `<!-- ${esc(p.watchTodo)} -->` : ""}
    <ul class="ev-cards">${p.watch.map((w) => `<li><a href="${esc(w.href)}" target="_blank" rel="noopener"><strong>${esc(w.title)} ↗</strong><span>${esc(w.text)}</span></a></li>`).join("")}</ul>
  </section>
  <section class="ev-section" aria-labelledby="ev-follow">
    <h2 id="ev-follow">Follow it on Supercharged Daily</h2>
    <ul class="ev-cards">${p.links.map((l) => `<li><a href="${esc(l.href)}"><strong>${esc(l.title)}</strong><span>${esc(l.text)}</span></a></li>`).join("")}</ul>
  </section>
  <section class="ev-section" id="updates" aria-labelledby="ev-updates">
    <h2 id="ev-updates">Updates</h2>
    <p class="ev-note">Newest first. Each line carries its date and how sure we are: Disclosed (from the company), Reported (from outlets), Target (a plan, not a result) or Correction (a change to this page).</p>
    <p class="ev-fresh" data-ev-fresh hidden role="status"><span></span> <a href="#updates" data-ev-reload>Reload</a></p>
    <ol class="ev-log" data-ev-log data-ev-src="/data/event-pages/${esc(p.slug)}.json" data-ev-event="${esc(p.eventId)}" data-ev-latest="${esc(latest)}" data-ev-count="${updates.length}" data-ev-start="${esc(new Date(ev.start).toISOString())}">${updates.map((u) => `<li><time datetime="${esc(stamp(u))}">${esc(when(u))}</time> ${chip(u.kind)} ${esc(u.text)}${u.source ? ` <a href="${esc(u.source)}" target="_blank" rel="noopener">Source</a>` : ""}</li>`).join("")}</ol>
  </section>
  ${rel.length ? `<section class="ev-section" aria-labelledby="ev-related"><h2 id="ev-related">Related reporting</h2><ul class="ev-cards">${rel.map((a) => `<li><a href="${esc(a.url)}"><strong>${esc(a.title)}</strong><span>${esc(fmtDate(a.date.slice(0, 10)))}</span></a></li>`).join("")}</ul></section>` : ""}
  <p class="ev-small">Independent coverage. Not affiliated with SpaceX. Times are SpaceX's published window, not a guaranteed lift-off time.</p>
</main>`;
}

function pageHead(p, ev) {
  const url = `${SITE}/${p.slug}.html`, img = SITE + p.ogImage, title = `${p.seoTitle} | Supercharged Daily`;
  const latest = [...(p.updates || [])].map((u) => u.date).sort().pop() || ev.start.slice(0, 10);
  const ld = [
    { "@context": "https://schema.org", "@type": "Event", name: ev.title, description: p.description, startDate: ev.start, endDate: ev.end || ev.start,
      eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
      location: [{ "@type": "Place", name: p.location.name, address: { "@type": "PostalAddress", addressRegion: p.location.region, addressCountry: p.location.country } },
                 { "@type": "VirtualLocation", url: (p.watch[1] || p.watch[0]).href }],
      organizer: { "@type": "Organization", name: "SpaceX", url: "https://www.spacex.com" }, image: [img], url },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: p.section, item: SITE + p.sectionUrl },
      { "@type": "ListItem", position: 3, name: ev.title, item: url }] },
    { "@context": "https://schema.org", "@type": "WebPage", name: title, url, dateModified: latest, publisher: { "@type": "Organization", name: "Supercharged Daily", url: SITE + "/" } },
  ];
  return `<!--ev:head-->
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(p.description)}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Supercharged Daily" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(p.description)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:image" content="${esc(img)}" />
    <meta property="og:image:alt" content="${esc(p.ogImageAlt)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@ALJR86" />
    <meta name="twitter:creator" content="@ALJR86" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(p.description)}" />
    <meta name="twitter:image" content="${esc(img)}" />
    <meta name="twitter:image:alt" content="${esc(p.ogImageAlt)}" />
    <link rel="stylesheet" href="/event-page.css?v=${CSS_V}" />
    <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
    <!--/ev:head-->`;
}

export function buildEventPages(root = ROOT) {
  const eventsFile = JSON.parse(fs.readFileSync(path.join(root, "data/events.json"), "utf8")), events = eventsFile.events;
  const articles = JSON.parse(fs.readFileSync(path.join(root, "data/articles.json"), "utf8")).articles;
  const built = [];
  for (const { file: f, page: p } of eventPages(root)) {
    const ev = events[p.eventId];
    if (!ev || !ev.start) throw new Error(`${f}: eventId ${p.eventId} has no start in data/events.json`);
    const out = path.join(root, `${p.slug}.html`);
    let html = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : fs.readFileSync(path.join(root, "editorial.html"), "utf8");
    if (!html.includes("<!--ev:head-->")) {
      // First build from the donor shell: drop its page-specific SEO, styles and JSON-LD.
      html = html.replace(/\s*<title>[\s\S]*?<meta name="twitter:image:alt"[^>]*\/>/, "\n    <!--ev:head--><!--/ev:head-->")
        .replace(/\s*<link rel="stylesheet" href="\/page-studios\.css[^>]*>/, "")
        .replace(/\s*<!-- seo:ld -->[\s\S]*?<!-- \/seo:ld -->/, "");
    }
    html = html.replace(/<!--ev:head-->[\s\S]*?<!--\/ev:head-->/, () => pageHead(p, ev).trimStart());
    html = html.replace(/<main id="main"[\s\S]*?<\/main>/, () => pageMain(p, ev, articles));
    if (!/<!--ev:head-->/.test(html) || !/class="ev-page"/.test(html)) throw new Error(`${f}: page markers missing`);
    if (!fs.existsSync(out) || fs.readFileSync(out, "utf8") !== html) fs.writeFileSync(out, html);
    // DTSTAMP/SEQUENCE follow the event data, not the clock, so a rebuild is byte-identical.
    const stampIso = [...(p.updates || [])].map((u) => u.time || `${u.date}T00:00:00Z`).concat([eventsFile.updated || ev.start]).filter((t) => !Number.isNaN(Date.parse(t))).sort().pop();
    const ics = icsFor(p, ev, `${SITE}/${p.slug}.html`, stampIso);
    const icsOut = path.join(root, `${p.slug}.ics`);
    if (!fs.existsSync(icsOut) || fs.readFileSync(icsOut, "utf8") !== ics) fs.writeFileSync(icsOut, ics);
    built.push(p.slug);
  }
  return built;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log("Event pages built: " + buildEventPages().join(", "));
