"use strict";
// Shared homepage next-event pick used by scripts/build-home.js.
// Must stay aligned with live.js's home filter: keep timed Falcon/Dragon
// (page === "starship" but not NET/TBC/ended), drop NET Starship planning.
// Featured/major earnings must not hide a timed Falcon.

function keepOnHome(e) {
  if (!e) return false;
  if (e.page !== "starship") return true;
  return !e.net && !e.timeTbc && e.status !== "ended";
}

const SHARED_IDS = { "f9-bandwagon5": "bandwagon-5", "f9-ussf481": "ussf-481", "f9-crs35": "crs35-docking" };

function withSharedDates(events, shared) {
  return (events || []).map((e) => {
    const x = Object.assign({}, e);
    const s = shared && (shared[e.id] || shared[SHARED_IDS[e.id]]);
    if (!s) return x;
    if (s.start) x.start = s.start;
    if (s.end) x.end = s.end;
    if (s.date && !s.start) {
      const tz = s.tz || "Z";
      x.start = s.date + "T00:00:00" + tz;
      x.end = s.date + "T23:59:00" + tz;
    }
    return x;
  });
}

function eligible(events, page, now) {
  return events.filter(
    (e) =>
      e.status !== "ended" &&
      new Date(e.end) > now &&
      (page === "home" || e.page === page || (page === "spacex" && e.page === "starship"))
  );
}

function isLive(e, now, H) {
  return e.status === "live" || (!e.timeTbc && !e.net && now >= new Date(e.start) - H / 2);
}

// Prebuilt card pick. Returns null when something is already live — live.js
// mounts that card itself, so the static fallback stays empty.
function pickNextEvent(events, opts) {
  const page = (opts && opts.page) || "home";
  const shared = (opts && opts.shared) || {};
  const now = opts && opts.now != null ? opts.now : Date.now();
  const H = (opts && opts.H) || 36e5;
  const list = eligible(withSharedDates(events, shared), page, now);
  const evs = page === "home" ? list.filter(keepOnHome) : list;
  if (evs.some((e) => isLive(e, now, H))) return null;
  const fut = evs.filter((e) => new Date(e.start) > now).sort((a, b) => new Date(a.start) - new Date(b.start));
  return evs.find((x) => x.featured) || fut.find((x) => !x.timeTbc && !x.net) || fut[0] || null;
}

// Mirror of live.js ll2Events(): upcoming LL2 launches (data/launches.json) as live-card events.
function ll2Events(L, have, H, now) {
  H = H || 36e5; now = now != null ? now : Date.now();
  return ((L && L.results) || []).map((r) => {
    const parts = String(r.name || "").split(" | "), rocket = (parts[0] || "").replace(/\s*Block \d+$/, ""), mission = parts[1] || parts[0] || "";
    const p = (r.net_precision && r.net_precision.abbrev) || "", s = (r.status && r.status.abbrev) || "";
    if (!r.net || /starship/i.test(r.name) || !/^(SEC|MIN|HR|HOUR|DAY)?$/.test(p) || /^(Success|Failure|Partial Failure)$/.test(s)) return null;
    const t = new Date(r.net).getTime();
    if (/^(Hold|TBD)$/.test(s) || (/^(SEC|MIN)?$/.test(p) && s !== "In Flight" && now - t > H / 2)) return null;
    if ((have || []).some((e) => e.page === "starship" && Math.abs(new Date(e.start) - t) < 6 * H)) return null;
    const day = p === "DAY", falcon = /falcon/i.test(rocket);
    return { id: "ll2-" + r.id, page: "starship", title: rocket + " \u00b7 " + mission.replace(/^Starlink Group /, "Starlink "),
      start: day ? r.net.slice(0, 10) + "T00:00:00Z" : r.net, end: day ? r.net.slice(0, 10) + "T23:59:00Z" : new Date(t + H).toISOString(),
      net: day || undefined, timeTbc: (p === "HR" || p === "HOUR") || undefined, status: "scheduled", provider: "link",
      fallbackUrl: "https://x.com/SpaceX", fallbackLabel: "Webcast on X (@SpaceX)", source: "https://thespacedevs.com/llapi",
      image: falcon ? "/assets/live/falcon9.jpg" : "", imageCredit: falcon ? "Photo: U.S. Space Force/Senior Airman Samuel Becker, public domain" : "" };
  }).filter(Boolean);
}

module.exports = { ll2Events, keepOnHome, pickNextEvent, isLive, withSharedDates, SHARED_IDS };
