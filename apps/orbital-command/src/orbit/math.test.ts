import { describe, expect, it } from "vitest";
import {
  EARTH_RADIUS_KM,
  ecefToScene,
  freshnessOf,
  geodeticToEcef,
  periodMinutes,
  propagateDerived,
  satrecFromFacts,
  sceneToGeodetic,
  tleLine2Elements,
  wrapLon,
} from "./math";
import type { SourceFacts } from "../types";

/** Vallado / CelesTrak published ISS TLE (2008), used as an SGP4 fixture — not live data. */
const ISS: SourceFacts = {
  norad: 25544,
  name: "ISS (ZARYA)",
  objectType: "payload",
  operator: null,
  epoch: "2008-09-20T12:25:40Z",
  inclinationDeg: 51.6416,
  eccentricity: 0.0006703,
  meanMotionRevPerDay: 15.72125391,
  raanDeg: 247.4627,
  argPerigeeDeg: 130.536,
  meanAnomalyDeg: 325.0288,
  bstar: -0.11606e-4,
  tle1: "1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927",
  tle2: "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537",
  sourceId: "vallado-fixture",
  sourceUrl: "https://celestrak.org/NORAD/documentation/gp-data-formats.php",
  retrievedAt: "2008-09-20T12:25:40Z",
  group: "stations",
  starlinkGen: null,
  mission: null,
};

describe("period and TLE parse", () => {
  it("period is 1440 / mean motion", () => {
    expect(periodMinutes(16)).toBe(90);
    expect(periodMinutes(ISS.meanMotionRevPerDay)).toBeCloseTo(91.595, 2);
    expect(periodMinutes(0)).toBeNaN();
  });

  it("reads inclination and mean motion from TLE line 2", () => {
    const e = tleLine2Elements(ISS.tle2);
    expect(e?.inclinationDeg).toBeCloseTo(51.6416, 3);
    expect(e?.meanMotionRevPerDay).toBeCloseTo(15.72125391, 5);
  });
});

describe("coordinates", () => {
  it("round-trips equator lon 0", () => {
    const e = geodeticToEcef(0, 0, 0);
    expect(e.x).toBeCloseTo(EARTH_RADIUS_KM, 6);
    const s = ecefToScene(e);
    const g = sceneToGeodetic(s.x, s.y, s.z);
    expect(g.latitudeDeg).toBeCloseTo(0, 6);
    expect(g.longitudeDeg).toBeCloseTo(0, 6);
    expect(g.altitudeKm).toBeCloseTo(0, 6);
  });

  it("wraps longitude", () => {
    expect(wrapLon(190)).toBeCloseTo(-170);
    expect(wrapLon(-190)).toBeCloseTo(170);
  });
});

describe("SGP4 fixture", () => {
  it("propagates ISS to a LEO radius", () => {
    const rec = satrecFromFacts(ISS);
    expect(rec).toBeTruthy();
    const d = propagateDerived(rec!, new Date("2008-09-20T12:25:40Z"), 25544, ISS.meanMotionRevPerDay);
    expect(d).toBeTruthy();
    expect(d!.altitudeKm).toBeGreaterThan(300);
    expect(d!.altitudeKm).toBeLessThan(500);
    expect(Math.abs(d!.latitudeDeg)).toBeLessThanOrEqual(52);
    expect(d!.velocityKmS).toBeGreaterThan(7);
    expect(d!.velocityKmS).toBeLessThan(8.2);
  });
});

describe("freshness", () => {
  const now = Date.parse("2026-10-26T12:00:00Z");
  it("bands by epoch age, not page build time", () => {
    expect(freshnessOf("2026-10-26T10:00:00Z", now)).toBe("current");
    expect(freshnessOf("2026-10-24T12:00:00Z", now)).toBe("aging");
    expect(freshnessOf("2026-10-20T12:00:00Z", now)).toBe("stale");
    expect(freshnessOf("not-a-date", now)).toBe("unverified");
    expect(freshnessOf("2027-01-01T00:00:00Z", now)).toBe("unverified");
  });
});
