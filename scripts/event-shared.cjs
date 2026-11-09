// Shared by build-event-pages.mjs (event hubs) and build-home.js (homepage feature strip):
// one countdown markup, one time format, one rule for which event the homepage features.
const fs = require("fs"), path = require("path");
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtCT = (iso) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace("AM", "a.m.").replace("PM", "p.m.");
const fmtDay = (iso) => new Intl.DateTimeFormat("en-GB", { timeZone: "America/Chicago", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)).replace(",", "");
const fmtUTC = (iso) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
function whenText(ev) { return `${fmtDay(ev.start)}, ${fmtCT(ev.start)} CT (${fmtUTC(ev.start)} UTC)`; }
// Short form for the big countdown line: same shape as "4d 21:19:10", so swapping it causes no layout shift.
function shortWhen(ev) { return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(ev.start)) + `, ${fmtUTC(ev.start)} UTC`; }
function countdownHtml(ev, note, cls = "evc") {
  // The saved HTML shows the absolute time: right without JavaScript, never a stale "in 2d".
  return `<div class="${cls}" data-countdown data-start="${esc(new Date(ev.start).toISOString())}" data-end="${esc(new Date(ev.end || ev.start).toISOString())}" data-after-sub="The window has closed. See the updates log for what happened."><p class="evc-label" data-cd-label>Launch window opens</p><p class="evc-time" data-cd-time>${esc(shortWhen(ev))}</p><p class="evc-sub" data-cd-sub>${esc([whenText(ev), note].filter(Boolean).join(" · "))}</p></div>`;
}
function eventPages(root) {
  const dir = path.join(root, "data/event-pages");
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort().map((f) => ({ file: f, page: JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) })) : [];
}
function activeFeature(root, now = Date.now()) {
  const events = JSON.parse(fs.readFileSync(path.join(root, "data/events.json"), "utf8")).events;
  for (const { page } of eventPages(root)) if (page.featureUntil && Date.parse(page.featureUntil) > now && events[page.eventId]) return { page, ev: events[page.eventId] };
  return null;
}
function featureHtml(f) {
  if (!f) return "";
  return `<a class="hv-feature" href="/${esc(f.page.slug)}.html"><span class="hv-feature-inner"><span class="ev-kicker">${esc(f.page.kicker)}</span><span class="hv-feature-title">${esc(f.page.title)}</span><span class="hv-feature-go">Countdown, the double-catch plan and where to watch →</span>${countdownHtml(f.ev, f.page.windowNote).replace(/<(\/?)(div|p)\b/g, "<$1span")}</span></a>`;
}
module.exports = { esc, whenText, shortWhen, countdownHtml, eventPages, activeFeature, featureHtml };
