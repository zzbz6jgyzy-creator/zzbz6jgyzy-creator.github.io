/* Propagate the cached Starlink catalog off the UI thread.
   Fetches only /data/starlink.json — never CelesTrak. */
/* eslint-disable no-undef */
importScripts("/vendor/satellite.min.js");

const sat = self.satellite;
let recs = [];

const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

const load = async (url) => {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error("catalog " + res.status);
  const data = await res.json();
  recs = [];
  const rows = data.satellites || [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row[0];
    const norad = row[1];
    const gen = row[2];
    const tle1 = row[3];
    const tle2 = row[4];
    try {
      const rec = sat.twoline2satrec(tle1, tle2);
      if (!rec || rec.error) continue;
      recs.push({ rec, name, norad, gen, tle1 });
    } catch {
      /* skip a bad TLE */
    }
  }
  return {
    type: "ready",
    count: recs.length,
    updated: data.tleAsOf || data.updated || "",
    tleAsOf: data.tleAsOf || data.updated || "",
    gens: data.gens || {},
    sources: data.sources || {},
  };
};

const look = (lat, lon, now) => {
  const date = new Date(now);
  const gmst = sat.gstime(date);
  const observer = {
    longitude: toRad(lon),
    latitude: toRad(lat),
    height: 0.02,
  };
  const visible = [];
  for (let i = 0; i < recs.length; i++) {
    const s = recs[i];
    const pv = sat.propagate(s.rec, date);
    if (!pv || !pv.position) continue;
    const ecf = sat.eciToEcf(pv.position, gmst);
    const ang = sat.ecfToLookAngles(observer, ecf);
    const el = toDeg(ang.elevation);
    if (el < -1) continue;
    visible.push({
      name: s.name,
      norad: s.norad,
      gen: s.gen,
      intl: (s.tle1 || "").slice(9, 17).trim(),
      az: (toDeg(ang.azimuth) + 360) % 360,
      el,
      range: ang.rangeSat,
    });
  }
  visible.sort((a, b) => b.el - a.el);
  return { type: "look", at: now, visible };
};

self.onmessage = (e) => {
  const msg = e.data || {};
  if (msg.type === "load") {
    load(msg.url)
      .then((ready) => self.postMessage(ready))
      .catch((err) => self.postMessage({ type: "error", error: String(err && err.message ? err.message : err) }));
    return;
  }
  if (msg.type === "look") {
    if (!recs.length) {
      self.postMessage({ type: "look", at: msg.now, visible: [] });
      return;
    }
    self.postMessage(look(msg.lat, msg.lon, msg.now));
  }
};
