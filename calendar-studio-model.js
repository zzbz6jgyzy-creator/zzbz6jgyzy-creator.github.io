(function(root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./calendar-merge.js") : root.SDCalendarMerge);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SDCalendarStudio = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(Merge) {
  "use strict";
  const GROUPS = { tesla: "Tesla", spacex: "SpaceX", xai: "xAI" }, DAY = 864e5;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const url = (s) => /^https?:\/\//i.test(s || "") || /^\/(?!\/)/.test(s || "") ? s : "";
  // Launch Library 2 only powers countdowns in the background; never link readers to its feed or API.
  const feed = (s) => /(^|\.)thespacedevs\.com(\/|$)/i.test(String(s || "").replace(/^https?:\/\//i, "").split(/[/?#]/)[0] + "/");
  const link = (s) => feed(s) ? "" : url(s);
  const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const valid = (s) => typeof s === "string" && Number.isFinite(Date.parse(s));
  function identity(e) {
    const t = e.title || "";
    if (Merge.isDocking(t)) return "crs-" + (Merge.crsNum(t) || slug(t)) + "-docking";
    for (const [prefix, fn] of [["starship", Merge.starshipFlight], ["starlink", Merge.starlinkGroup], ["bandwagon", Merge.bandwagonNum], ["ussf", (t2) => t2.match(/ussf[-\s]*(\d+)/i)?.[1]], ["crs", (t2) => /cygnus/i.test(t2) ? "" : Merge.crsNum(t2)]]) {
      const n = fn(t);
      if (n) return prefix + "-" + n;
    }
    return slug(e.id || t);
  }
  function group(e) {
    return e.group && GROUPS[e.group] ? e.group : /spacex|starship|falcon|dragon|starlink|spcx|ussf/i.test(e.title) ? "spacex" : /grok|xai/i.test(e.title) ? "xai" : "tesla";
  }
  function category(e) {
    return /dock(ed|ing)/i.test(e.title) ? "Docking" : /earnings/i.test(e.title) ? "Earnings" : /lock.up/i.test(e.title) ? "Markets" : /deliveries/i.test(e.title) ? "Deliveries" : /shareholder|annual meeting|\bagm\b|drawing deadline/i.test(e.title) ? "Meeting" : /starship|falcon|starlink|ussf|bandwagon|crs|transporter|nrol/i.test(e.title) ? "Launch" : /grok/i.test(e.title) ? "Release" : "Reveal";
  }
  function sources(e) {
    const list = [...Array.isArray(e.sources) ? e.sources : [], e.source, e.href].filter((x) => typeof x === "string");
    return [...new Set(list.flatMap((s) => s.match(/https?:\/\/[^\s)"<>]+/g) || []))].filter(link).map((href) => ({ href, label: new URL(href).hostname.replace(/^www\./, "") }));
  }
  function item(e) {
    const precision = e.precision || (e.start ? "datetime" : "unknown");
    let start = e.precision === "day" && e.date ? e.date + "T12:00:00Z" : e.date && e.time ? e.date + "T" + e.time + (e.time.length === 5 ? ":00" : "") + (e.tz || "Z") : e.start || (e.date ? e.date + "T12:00:00Z" : "");
    if (start && !valid(start)) start = "";
    const date = e.date || start.slice(0, 10);
    return { id: identity(e), title: String(e.title || ""), group: group(e), category: category(e), start, end: valid(e.end) ? e.end : "", date, precision, status: String(e.status || "expected"), note: String(e.summary || e.note || ""), where: String(e.where || ""), href: link(e.href), sources: sources(e), origin: e.origin || "Editorial calendar", ...e.coverage ? { coverage: e.coverage } : {} };
  }
  function launchStatus(abbrev) {
    const s = String(abbrev || "");
    if (/^success$/i.test(s)) return "done";
    if (/partial/i.test(s)) return "partial";
    if (/^failure$/i.test(s)) return "failed";
    if (/in.?flight/i.test(s)) return "done";
    return s;
  }
  function staleInFlight(raw, start, now) {
    return /in.?flight/i.test(String(raw || "")) && valid(start) && Date.parse(start) < +new Date(now);
  }
  function normalize(seed, manual, launches, live, now = Date.now()) {
    const rows = (seed.curated || []).map((e) => item(e));
    function equal(a, b) {
      return a.id === b.id || a.category === b.category && Merge.launchKey(a.title) === Merge.launchKey(b.title);
    }
    function put(e) {
      const index = rows.findIndex((x) => equal(x, e));
      if (index < 0) rows.push(e);
      else rows[index] = { ...rows[index], ...e, where: e.where || rows[index].where, href: e.href || rows[index].href, sources: e.sources.length ? e.sources : rows[index].sources };
    }
    for (const [id, e] of Object.entries(manual.events || {})) {
      const old = rows.find((x) => x.id === identity({ ...e, id }));
      put(item({ ...old, ...e, id, precision: e.precision || (e.start ? "datetime" : old?.precision), origin: "Editorial calendar" }));
    }
    for (const l of launches.results || []) {
      const p = String(l.net_precision?.abbrev || "").toUpperCase(), precision = { SEC: "datetime", MIN: "datetime", HR: "hour", H: "hour", DAY: "day", D: "day", M: "month", MTH: "month", MON: "month", Q1: "quarter", Q2: "quarter", Q3: "quarter", Q4: "quarter", QTR: "quarter", H1: "half", H2: "half", Y: "year", YR: "year" }[p] || "unknown";
      const rawStatus = l.status?.abbrev || "TBD";
      const e = item({ id: "ll2-" + l.id, title: l.name, start: l.net, precision, status: launchStatus(rawStatus), group: "spacex", where: [l.pad?.name, l.pad?.location?.name].filter(Boolean).join(" · "), note: l.mission?.type ? [l.mission.type, l.mission.orbit?.name].filter(Boolean).join(" · ") : "Launch Library 2 schedule. Launch targets can change.", origin: "Launch Library 2" });
      if (!e.start) continue;
      e.providerId = l.id;
      e.windowStart = valid(l.window_start) ? l.window_start : "";
      e.windowEnd = valid(l.window_end) ? l.window_end : "";
      e.vehicle = l.vehicle || "";
      e.providerStatus = staleInFlight(rawStatus, e.start, now) ? "Success" : (l.status?.name || e.status);
      const old = rows.find((x) => equal(x, e));
      if (old && old.origin === "Editorial calendar" && !/success|failure|partial/i.test(rawStatus)) {
        old.providerId = l.id;
        if (staleInFlight(rawStatus, old.start, now)) {
          old.status = "done";
          old.providerStatus = "Success";
        } else {
          old.providerStatus = e.providerStatus;
        }
        continue;
      }
      put({ ...old, ...e, note: old && old.origin === "Editorial calendar" ? old.note : e.note, sources: [...old?.sources || [], ...e.sources] });
    }
    for (const e of rows) {
      const coverage = (live.events || []).find((l) => identity(l) === e.id || Merge.sameLaunch(l, e));
      if (coverage) {
        e.coverage = { url: link(coverage.fallbackUrl), article: link(coverage.articleUrl), status: coverage.status };
      }
    }
    // A roadmap entry must never rewind a later dated editorial/provider record.
    for (const source of seed.watching || []) {
      const watch = item({ ...source, id: "watch-" + slug(source.title), precision: "unknown", status: "expected" });
      if (!rows.some(e => equal(e, watch))) put(watch);
    }
    const cutoff = +new Date(now) - 45 * DAY;
    const kept = rows.filter((e) => e.origin !== "Launch Library 2" || !valid(e.start) || !terminal(e) || Date.parse(e.start) >= cutoff);
    rows.length = 0;
    rows.push(...kept);
    rows.sort((a, b) => (a.start || "9999").localeCompare(b.start || "9999") || a.title.localeCompare(b.title));
    return { version: 1, updated: manual.updated || "", launchChecked: launches.checked || launches.updated || "", launchSource: url(launches.source) || "https://ll.thespacedevs.com/", events: rows };
  }
  function zone(z) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: z }).format();
      return z;
    } catch {
      return "UTC";
    }
  }
  function dayKey(e, z = "UTC") {
    if (e.precision === "day") return e.date || e.start.slice(0, 10);
    if (e.precision !== "datetime" || !valid(e.start)) return "";
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone(z), year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(e.start));
    return ["year", "month", "day"].map((k) => parts.find((p) => p.type === k).value).join("-");
  }
  const today = (now = /* @__PURE__ */ new Date(), z = "UTC") => dayKey({ start: new Date(now).toISOString(), precision: "datetime" }, z);
  const dated = (e) => ["datetime", "day"].includes(e.precision) && valid(e.start);
  function terminal(e) {
    return /^(done|ended|success|failure|failed|partial|partial failure|cancelled)$/i.test(e.status);
  }
  function upcoming(e, now = /* @__PURE__ */ new Date(), z = "UTC") {
    return dated(e) && !terminal(e) && (e.precision === "day" ? dayKey(e, z) >= today(now, z) : Date.parse(e.start) >= +new Date(now));
  }
  function label(e, now = /* @__PURE__ */ new Date(), z = "UTC") {
    if (/success/i.test(e.status)) return "Launch successful";
    if (/partial/i.test(e.status)) return "Partial outcome";
    if (/fail/i.test(e.status)) return "Reported failure";
    if (/cancelled/i.test(e.status)) return "Cancelled";
    if (terminal(e)) return "Completed";
    if (/in.?flight|^live$/i.test(e.status)) return "In progress · source reported";
    if (!dated(e)) return "Planning · date unconfirmed";
    if (!upcoming(e, now, z)) return "Target passed · awaiting update";
    if (/hold/i.test(e.status)) return "On hold";
    if (e.precision === "day") return /net/i.test(e.status) ? "NET date · time unconfirmed" : "Date only · time unconfirmed";
    if (/tbc|tbd|expected|net/i.test(e.status)) return "Provisional target";
    return "Scheduled target";
  }
  function time(e, z = "UTC") {
    if (e.precision === "day") return "Time unconfirmed";
    if (e.precision !== "datetime" || !valid(e.start)) return "No confirmed time";
    return new Intl.DateTimeFormat("en-GB", { timeZone: zone(z), hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(new Date(e.start));
  }
  function dateLabel(e, z = "UTC") {
    if (!valid(e.start)) return "No date announced";
    const d = new Date(e.start), p = e.precision;
    if (p === "year") return d.getUTCFullYear() + " · year target";
    if (p === "half") return (d.getUTCMonth() < 6 ? "First" : "Second") + " half of " + d.getUTCFullYear() + " · half-year target";
    if (p === "hour") return d.toISOString().slice(0, 13).replace("T", " ") + " UTC · hour target";
    if (p === "quarter") return "Q" + (Math.floor(d.getUTCMonth() / 3) + 1) + " " + d.getUTCFullYear() + " · quarter target";
    if (p === "month") return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" }).format(d) + " · month target";
    return new Intl.DateTimeFormat("en-GB", { timeZone: p === "day" ? "UTC" : zone(z), weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(d);
  }
  function shiftDay(key, n) {
    return new Date(Date.parse(key + "T12:00:00Z") + n * DAY).toISOString().slice(0, 10);
  }
  function monthDays(month) {
    const first = month + "-01", d = /* @__PURE__ */ new Date(first + "T12:00Z"), offset = (d.getUTCDay() + 6) % 7, count = new Date(d.getUTCFullYear(), d.getUTCMonth() + 1, 0).getUTCDate();
    return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) => ({ date: shiftDay(first, i - offset), inMonth: i >= offset && i < offset + count }));
  }
  function filter(events, state, now = /* @__PURE__ */ new Date()) {
    const q = (state.query || "").trim().toLowerCase();
    return events.filter((e) => (!state.group || state.group === "all" || e.group === state.group) && (!state.category || state.category === "all" || e.category === state.category) && (!q || [e.title, e.note, e.where, e.category].join(" ").toLowerCase().includes(q)) && (state.view === "planning" ? !dated(e) : state.view === "saved" ? (state.saved || []).includes(e.id) : state.view === "month" ? dated(e) : state.range === "past" ? dated(e) && !upcoming(e, now, state.zone) : state.range === "all" ? dated(e) : upcoming(e, now, state.zone) && (state.range === "7" || state.range === "30" ? dayKey(e, state.zone) <= shiftDay(today(now, state.zone), Number(state.range) - 1) : true)));
  }
  function exportRows(events, state, now = new Date()) {
    return filter(events, state, now).filter(e => dated(e) && (state.view !== "month" || dayKey(e, state.zone).startsWith(state.month)));
  }
  function preferences(raw = {}) {
    return { view: ["agenda", "month", "saved", "planning"].includes(raw.view) ? raw.view : "agenda", zone: zone(raw.zone || "UTC"), group: ["all", ...Object.keys(GROUPS)].includes(raw.group) ? raw.group : "all", range: ["upcoming", "7", "30", "past", "all"].includes(raw.range) ? raw.range : "upcoming", category: "all", query: "", saved: Array.isArray(raw.saved) ? [...new Set(raw.saved.filter((x) => typeof x === "string"))].slice(0, 200) : [] };
  }
  function calendar(events, stamp) {
    const txt = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
    const utc = (s) => new Date(s).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Supercharged Daily//Calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Supercharged Daily", "X-WR-CALDESC:Public event targets. Dates may change. Day-only entries have no confirmed time."];
    for (const e of events.filter(dated)) {
      lines.push("BEGIN:VEVENT", "UID:" + e.id + "@superchargeddaily.com", "DTSTAMP:" + utc(valid(stamp) ? stamp : (/* @__PURE__ */ new Date()).toISOString()), ...e.precision === "day" ? ["DTSTART;VALUE=DATE:" + e.date.replace(/-/g, ""), "DTEND;VALUE=DATE:" + shiftDay(e.date, 1).replace(/-/g, "")] : ["DTSTART:" + utc(e.start), ...valid(e.end) && Date.parse(e.end) > Date.parse(e.start) ? ["DTEND:" + utc(e.end)] : []], "SUMMARY:" + txt((e.precision === "day" ? "[Date only] " : !terminal(e) ? "[Target] " : "") + e.title), "DESCRIPTION:" + txt(label(e) + "\n" + e.note + "\n" + e.sources.map((s) => s.href).join("\n")), "LOCATION:" + txt(e.where), "URL:https://superchargeddaily.com/calendar.html?event=" + encodeURIComponent(e.id), "STATUS:" + (/cancelled/i.test(e.status) ? "CANCELLED" : terminal(e) ? "CONFIRMED" : "TENTATIVE"), "TRANSP:TRANSPARENT", "END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return lines.map((line) => {
      let out = "", bytes = 0;
      for (const char of line) {
        const size = new TextEncoder().encode(char).length;
        if (bytes + size > 75) {
          out += "\r\n ";
          bytes = 1;
        }
        out += char;
        bytes += size;
      }
      return out;
    }).join("\r\n") + "\r\n";
  }
  return { GROUPS, esc, url, identity, launchStatus, normalize, zone, dayKey, today, dated, terminal, upcoming, label, time, dateLabel, shiftDay, monthDays, filter, exportRows, preferences, calendar };
});
