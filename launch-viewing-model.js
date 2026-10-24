(function(root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./calendar-studio-model.js") : root.SDCalendarStudio);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SDLaunchViewing = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(C) {
  "use strict";
  const R = 6371.0088, RAD = Math.PI / 180, DEG = 180 / Math.PI;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n)), wrap = (n) => (n % 360 + 360) % 360, esc = C.esc, url = C.url;
  function location(raw) {
    if (!raw || typeof raw !== "object") return null;
    const lat = Number(raw.lat), lon = Number(raw.lon);
    if (raw.lat == null || raw.lon == null || String(raw.lat).trim() === "" || String(raw.lon).trim() === "" || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return { name: String(raw.name || raw.place || "Selected location").slice(0, 120), lat, lon, zone: C.zone(raw.zone || "UTC"), country: String(raw.country || "").slice(0, 2), region: String(raw.region || "").slice(0, 50) };
  }
  function coordinates(text) {
    const m = String(text).trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$/);
    return m ? location({ lat: Number(m[1]), lon: Number(m[2]), name: "Pinned coordinates", zone: "UTC" }) : null;
  }
  function distance(a, b) {
    const p = a.lat * RAD, q = b.lat * RAD, x = (b.lat - a.lat) * RAD, y = (b.lon - a.lon) * RAD;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(Math.sin(x / 2) ** 2 + Math.cos(p) * Math.cos(q) * Math.sin(y / 2) ** 2)));
  }
  function bearing(a, b) {
    const p = a.lat * RAD, q = b.lat * RAD, d = (b.lon - a.lon) * RAD;
    return wrap(Math.atan2(Math.sin(d) * Math.cos(q), Math.cos(p) * Math.sin(q) - Math.sin(p) * Math.cos(q) * Math.cos(d)) * DEG);
  }
  function destination(p, angle, km2) {
    const a = angle * RAD, d = km2 / R, lat = p.lat * RAD, lon = p.lon * RAD, q = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(a)), l = lon + Math.atan2(Math.sin(a) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(q));
    return { lat: q * DEG, lon: (l * DEG + 540) % 360 - 180 };
  }
  function elevation(altitudeKm, groundKm) {
    const d = groundKm / R;
    return Math.atan2((R + altitudeKm) * Math.cos(d) - R, (R + altitudeKm) * Math.sin(d)) * DEG;
  }
  function horizonRange(altitudeKm, minAngle = 0) {
    const angle = minAngle * RAD;
    return R * (Math.acos(clamp(R / (R + altitudeKm) * Math.cos(angle), -1, 1)) - angle);
  }
  const compass = (n) => ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"][Math.round(wrap(n) / 22.5) % 16];
  function solar(when2, place) {
    const ms = Date.parse(when2);
    if (!Number.isFinite(ms) || !location(place)) return null;
    const d = ms / 864e5 + 24405875e-1 - 2451545, l = wrap(280.46 + 0.9856474 * d) * RAD, g = wrap(357.528 + 0.9856003 * d) * RAD, lambda = l + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD, epsilon = (23.439 - 4e-7 * d) * RAD, ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda)), dec = Math.asin(Math.sin(epsilon) * Math.sin(lambda)), gmst = wrap(280.46061837 + 360.98564736629 * d), lon = (ra * DEG - gmst + 540) % 360 - 180, lat = dec * DEG, p = place.lat * RAD, h = (place.lon - lon) * RAD, alt = Math.asin(clamp(Math.sin(p) * Math.sin(dec) + Math.cos(p) * Math.cos(dec) * Math.cos(h), -1, 1)) * DEG;
    return { altitude: alt, azimuth: bearing(place, { lat, lon }), lat, lon, phase: alt >= 0 ? "Daylight" : alt >= -6 ? "Civil twilight" : alt >= -12 ? "Nautical twilight" : alt >= -18 ? "Astronomical twilight" : "Night" };
  }
  function padFor(e, pads) {
    const name = e.where + " " + e.title;
    let id = /vandenberg|slc.?4e|complex 4e/i.test(name) ? "slc4e" : /starbase|boca chica/i.test(name) ? /pad.?2|olp.?2/i.test(name) ? "sb2" : "starbase" : /39a|kennedy/i.test(name) ? "lc39a" : /slc.?40|complex 40|cape canaveral/i.test(name) ? "slc40" : null;
    return id && pads[id] ? { ...pads[id] } : null;
  }
  function azimuth(e) {
    const t = e.title + " " + e.note;
    if (/starship/i.test(t)) return 97;
    if (e.pad?.coast === "west") return 186;
    if (/gto|geostationary|transfer|geo\b/i.test(t)) return 95;
    if (/iss|dragon|crs|crew|cygnus/i.test(t)) return 45;
    return 48;
  }
  function normalize(calendar, defs) {
    const presets = (defs.cities || []).map((p) => location({ ...p, country: p.region === "Mexico" ? "MX" : "US", zone: p.region === "California" ? "America/Los_Angeles" : p.region === "Texas" ? "America/Chicago" : p.region === "Mexico" ? "America/Monterrey" : "America/New_York" }));
    const pads = defs.pads;
    return { version: 1, checked: calendar.launchChecked, editorialUpdated: calendar.updated, presets, launches: calendar.events.filter((e) => e.group === "spacex" && e.category === "Launch" && C.dated(e)).map((e) => ({ ...e, pad: padFor(e, pads) })) };
  }
  function upcoming(data, now = /* @__PURE__ */ new Date()) {
    return data.launches.filter((e) => C.upcoming(e, now, "UTC")).sort((a, b) => a.start.localeCompare(b.start));
  }
  function options(raw = {}) {
    const val = (key, def, min, max) => Number.isFinite(Number(raw[key])) && raw[key] != null ? clamp(Number(raw[key]), min, max) : def;
    return { altitude: val("altitude", 80, 10, 250), downrange: val("downrange", 120, 0, 600), horizon: val("horizon", 5, 0, 30), units: raw.units === "mi" ? "mi" : "km" };
  }
  function scenario(launch, place, settings = {}) {
    if (!location(place) || !launch?.pad) return null;
    const o = options(settings), az = azimuth(launch), point = destination(launch.pad, az, o.downrange), padDistance = distance(place, launch.pad), groundDistance = distance(place, point), look = bearing(place, launch.pad), ascentLook = bearing(place, point), angle = elevation(o.altitude, groundDistance), sun = launch.precision === "datetime" ? solar(launch.start, place) : null, skySun = sun ? solar(launch.start, point) : null, sunlit = skySun ? skySun.altitude > -Math.acos(R / (R + o.altitude)) * DEG : null;
    const key = angle < 0 ? "below" : angle < o.horizon ? "obstructed" : angle < 10 ? "low" : "open";
    return { ...o, azimuth: az, point, padDistance, groundDistance, bearing: look, ascentBearing: ascentLook, elevation: angle, horizonKm: horizonRange(o.altitude, o.horizon), sun, sunlit, contrast: sun ? sun.altitude < 0 && sun.altitude > -18 && sunlit : null, key, label: { below: "Below the modelled horizon", obstructed: "Below your horizon setting", low: "Low on the modelled horizon", open: "Geometric line of sight" }[key] };
  }
  function when(e, zone = "UTC") {
    return C.dateLabel(e, zone) + (e.precision === "datetime" ? " · " + C.time(e, zone) : " · time unconfirmed");
  }
  function km(value, units = "km") {
    return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value * (units === "mi" ? 0.621371 : 1)) + " " + units;
  }
  function cityLabel(p) {
    return [p.name, p.region, p.country].filter(Boolean).join(", ");
  }
  function searchCities(query, rows) {
    const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(), q = norm(query).trim();
    if (q.length < 2) return [];
    const words = q.replace(/,/g, " ").split(/\s+/);
    const score = (row) => {
      const name = norm(row[0]), ascii = norm(row[6]), hay = name + " " + ascii + " " + norm(row[1]) + " " + norm(row[7]);
      if (!words.every((w) => hay.includes(w))) return -1;
      return name === q || ascii === q ? 4 : name.startsWith(q) || ascii.startsWith(q) ? 3 : words.every((w) => name.includes(w) || ascii.includes(w)) ? 2 : 1;
    };
    return rows.map((row) => ({ row, score: score(row) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || b.row[5] - a.row[5]).slice(0, 8).map(({ row }) => location({ name: row[0], country: row[1], lat: row[2], lon: row[3], zone: row[4], region: row[1] === "US" ? row[7] : "" }));
  }
  function duration(text) {
    const m = String(text).match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
    return m ? ((+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0)) * 1e3 : NaN;
  }
  function intervalValue(field, when2) {
    const time = Date.parse(when2);
    if (!Number.isFinite(time) || !Array.isArray(field?.values)) return null;
    for (const v of field.values) {
      const [start, span] = String(v.validTime).split("/"), a = Date.parse(start), length = duration(span);
      if (time >= a && time < a + length && typeof v.value === "number" && Number.isFinite(v.value)) return v.value;
    }
    return null;
  }
  function weather(grid, when2, now = Date.now()) {
    const p = grid?.properties;
    if (!p || !Array.isArray(p.skyCover?.values)) return null;
    const cloud = intervalValue(p.skyCover, when2), rain = intervalValue(p.probabilityOfPrecipitation, when2), stamp = p.updateTime || p.generatedAt;
    if (cloud === null) return { available: false, reason: "No cloud forecast covers this launch time.", updated: stamp || "" };
    return { available: true, cloud: clamp(cloud, 0, 100), rain: rain === null ? null : clamp(rain, 0, 100), updated: stamp || "", stale: !Number.isFinite(Date.parse(stamp)) || now - Date.parse(stamp) > 6 * 36e5 };
  }
  function readPreferences(raw = {}) {
    return { place: location(raw.place) || location(raw), launchId: typeof raw.launchId === "string" ? raw.launchId : "", view: ["sky", "launches", "guide", "method"].includes(raw.view) ? raw.view : "sky", ...options(raw) };
  }
  function shortTitle(e) {
    return String(e.title || '').replace(/^Falcon (?:9(?: Block 5)?|Heavy)\s*[·|]\s*/i, '').replace(/\bStarlink\s+Group\s+/i, 'Starlink ');
  }
  function brief(e, p, s) {
    return [e.title, when(e, p.zone), cityLabel(p), s ? "Pad direction: " + Math.round(s.bearing) + "° true (" + compass(s.bearing) + "). " + km(s.padDistance, s.units) + " from the pad." : "Pad not identified.", s ? s.label + ". Illustration: " + s.altitude + " km altitude, " + s.downrange + " km downrange." : "No geometry available.", "An estimate, not a trajectory or visibility guarantee. Check the launch source and local conditions.", "https://superchargeddaily.com/see-the-launch.html?launch=" + encodeURIComponent(e.id)].join("\n");
  }
  return { R, esc, url, clamp, wrap, location, coordinates, distance, bearing, destination, elevation, horizonRange, compass, solar, normalize, upcoming, options, scenario, when, km, cityLabel, searchCities, duration, intervalValue, weather, readPreferences, shortTitle, brief };
});
