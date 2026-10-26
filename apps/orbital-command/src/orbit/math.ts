/**
 * Coordinate pipeline and SGP4 wrappers.
 *
 * TEME/ECI (satellite.js propagate) → GMST → geodetic / ECEF → Three.js Y-up.
 * Geodetic altitude is height above the ellipsoid, not distance from Earth's centre.
 * SGP4 is a prediction from dated elements, not live telemetry.
 */
import * as satellite from "satellite.js";
import type { DerivedState, Ecef, Freshness, Geodetic, LookAngles, SourceFacts } from "../types";

export const EARTH_RADIUS_KM = 6371.0;
export const MU_KM3_S2 = 398600.4418;

export function periodMinutes(meanMotionRevPerDay: number): number {
  if (!(meanMotionRevPerDay > 0) || !Number.isFinite(meanMotionRevPerDay)) return NaN;
  return 1440 / meanMotionRevPerDay;
}

export function parseTleEpoch(line1: string): string | null {
  if (!line1 || line1.length < 32) return null;
  const yy = Number(line1.slice(18, 20));
  const day = Number(line1.slice(20, 32));
  if (!Number.isFinite(yy) || !Number.isFinite(day)) return null;
  const year = yy < 57 ? 2000 + yy : 1900 + yy;
  const ms = Date.UTC(year, 0, 1) + (day - 1) * 86400000;
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().replace(/\.\d+Z$/, "Z");
}

/** Inclination (deg) and mean motion (rev/day) from a TLE line 2. */
export function tleLine2Elements(line2: string): { inclinationDeg: number; meanMotionRevPerDay: number; eccentricity: number; raanDeg: number; argPerigeeDeg: number; meanAnomalyDeg: number } | null {
  if (!line2 || line2.length < 63) return null;
  const inclinationDeg = Number(line2.slice(8, 16));
  const raanDeg = Number(line2.slice(17, 25));
  const eccentricity = Number("0." + line2.slice(26, 33).trim());
  const argPerigeeDeg = Number(line2.slice(34, 42));
  const meanAnomalyDeg = Number(line2.slice(43, 51));
  const meanMotionRevPerDay = Number(line2.slice(52, 63));
  if (![inclinationDeg, raanDeg, eccentricity, argPerigeeDeg, meanAnomalyDeg, meanMotionRevPerDay].every(Number.isFinite)) {
    return null;
  }
  return { inclinationDeg, raanDeg, eccentricity, argPerigeeDeg, meanAnomalyDeg, meanMotionRevPerDay };
}

export function freshnessOf(epochIso: string, nowMs: number): Freshness {
  const t = Date.parse(epochIso);
  if (!Number.isFinite(t) || t > nowMs + 3600_000) return "unverified";
  const ageH = (nowMs - t) / 3600_000;
  if (ageH < 36) return "current";
  if (ageH < 72) return "aging";
  return "stale";
}

export function freshnessLabel(status: Freshness, epochIso: string, retrievedAt: string): string {
  const epoch = formatUtc(epochIso);
  const retrieved = formatUtc(retrievedAt);
  if (status === "unverified") return `Orbital epoch could not be verified. Retrieval ${retrieved}.`;
  if (status === "stale") return `Prediction uncertainty increased. Element epoch ${epoch}. Retrieved ${retrieved}.`;
  if (status === "aging") return `Data ageing. Element epoch ${epoch}. Retrieved ${retrieved}.`;
  return `Current calculated position from elements at ${epoch}. Retrieved ${retrieved}.`;
}

export function formatUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace(".000Z", "Z").replace("T", " ").replace("Z", " UTC");
}

export function wrapLon(deg: number): number {
  let x = ((deg + 180) % 360 + 360) % 360 - 180;
  return x === -180 ? 180 : x;
}

export function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}

export function geodeticToEcef(latDeg: number, lonDeg: number, altKm: number): Ecef {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const r = EARTH_RADIUS_KM + altKm;
  const cosLat = Math.cos(lat);
  return {
    x: r * cosLat * Math.cos(lon),
    y: r * Math.sin(lat),
    z: -r * cosLat * Math.sin(lon),
  };
}

/** Scene units: Earth radius = 1, Y-up, lon 0 at +X. */
export function ecefToScene(ecef: Ecef): { x: number; y: number; z: number } {
  return {
    x: ecef.x / EARTH_RADIUS_KM,
    y: ecef.y / EARTH_RADIUS_KM,
    z: ecef.z / EARTH_RADIUS_KM,
  };
}

export function sceneToGeodetic(x: number, y: number, z: number): Geodetic {
  const r = Math.hypot(x, y, z);
  const lat = (Math.asin(clamp(y / r, -1, 1)) * 180) / Math.PI;
  const lon = (Math.atan2(-z, x) * 180) / Math.PI;
  return { latitudeDeg: lat, longitudeDeg: lon, altitudeKm: (r - 1) * EARTH_RADIUS_KM };
}

export type SatRec = ReturnType<typeof satellite.twoline2satrec>;

export function satrecFromFacts(obj: SourceFacts): SatRec | null {
  try {
    const rec = satellite.twoline2satrec(obj.tle1, obj.tle2);
    if (!rec || rec.error) return null;
    return rec;
  } catch {
    return null;
  }
}

export function propagateDerived(rec: SatRec, date: Date, norad: number, meanMotionRevPerDay: number): DerivedState | null {
  const pv = satellite.propagate(rec, date);
  const position = pv.position;
  const velocity = pv.velocity;
  if (!position || position === true || !velocity || velocity === true) return null;
  if (![position.x, position.y, position.z].every(Number.isFinite)) return null;
  const gmst = satellite.gstime(date);
  const geo = satellite.eciToGeodetic(position, gmst);
  const lat = satellite.degreesLat(geo.latitude);
  const lon = satellite.degreesLong(geo.longitude);
  const alt = geo.height;
  if (![lat, lon, alt].every(Number.isFinite)) return null;
  const ecef = geodeticToEcef(lat, lon, alt);
  const velocityKmS = Math.hypot(velocity.x, velocity.y, velocity.z);
  return {
    norad,
    latitudeDeg: lat,
    longitudeDeg: wrapLon(lon),
    altitudeKm: alt,
    ecef,
    velocityKmS,
    periodMin: periodMinutes(meanMotionRevPerDay),
  };
}

export function lookAngles(observer: Geodetic, sat: DerivedState, date: Date, rec: SatRec): LookAngles | null {
  const pv = satellite.propagate(rec, date);
  if (!pv.position || pv.position === true) return null;
  const gmst = satellite.gstime(date);
  const observerGd = {
    longitude: satellite.degreesToRadians(observer.longitudeDeg),
    latitude: satellite.degreesToRadians(observer.latitudeDeg),
    height: observer.altitudeKm,
  };
  const ecf = satellite.eciToEcf(pv.position, gmst);
  const look = satellite.ecfToLookAngles(observerGd, ecf);
  return {
    azimuthDeg: ((look.azimuth * 180) / Math.PI + 360) % 360,
    elevationDeg: (look.elevation * 180) / Math.PI,
    rangeKm: look.rangeSat,
  };
}

/**
 * Sun unit vector in the same Y-up ECEF scene frame.
 * Low-precision (Meeus-style) is enough for a terminator and shadow tests.
 */
export function sunEcefUnit(date: Date): Ecef {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * (Math.PI / 180);
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * (Math.PI / 180);
  const epsilon = (23.439 - 0.0000004 * n) * (Math.PI / 180);
  const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
  const gmst = siderealRad(jd);
  const lon = ra - gmst;
  const cosDec = Math.cos(dec);
  const x = cosDec * Math.cos(lon);
  const y = Math.sin(dec);
  const z = -cosDec * Math.sin(lon);
  const mag = Math.hypot(x, y, z) || 1;
  return { x: x / mag, y: y / mag, z: z / mag };
}

function siderealRad(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
  gmst = ((gmst % 360) + 360) % 360;
  return (gmst * Math.PI) / 180;
}

/** Observer solar elevation (degrees). Negative = night. */
export function sunElevation(observer: Geodetic, date: Date): number {
  const s = sunEcefUnit(date);
  const n = geodeticToEcef(observer.latitudeDeg, observer.longitudeDeg, 0);
  const mag = Math.hypot(n.x, n.y, n.z) || 1;
  const dot = (s.x * n.x + s.y * n.y + s.z * n.z) / mag;
  return (Math.asin(clamp(dot, -1, 1)) * 180) / Math.PI;
}

/** Cylindrical Earth-shadow test. True if the satellite is likely in sunlight. */
export function satelliteSunlit(sat: Geodetic, date: Date): boolean {
  const s = sunEcefUnit(date);
  const p = geodeticToEcef(sat.latitudeDeg, sat.longitudeDeg, sat.altitudeKm);
  const along = p.x * s.x + p.y * s.y + p.z * s.z;
  if (along >= 0) return true;
  const px = p.x - along * s.x;
  const py = p.y - along * s.y;
  const pz = p.z - along * s.z;
  return Math.hypot(px, py, pz) > EARTH_RADIUS_KM;
}

export function orbitPolyline(rec: SatRec, date: Date, meanMotion: number, norad: number, samples = 96): Geodetic[] {
  const periodMs = periodMinutes(meanMotion) * 60_000;
  if (!Number.isFinite(periodMs) || periodMs <= 0) return [];
  const out: Geodetic[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = new Date(date.getTime() + (i / samples) * periodMs);
    const d = propagateDerived(rec, t, norad, meanMotion);
    if (d) out.push({ latitudeDeg: d.latitudeDeg, longitudeDeg: d.longitudeDeg, altitudeKm: d.altitudeKm });
  }
  return out;
}

export function groundTrack(points: Geodetic[]): Geodetic[] {
  return points.map((p) => ({ latitudeDeg: p.latitudeDeg, longitudeDeg: p.longitudeDeg, altitudeKm: 0 }));
}

export function cardinalFromAzimuth(az: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(((az % 360) + 360) % 360 / 22.5) % 16];
}
