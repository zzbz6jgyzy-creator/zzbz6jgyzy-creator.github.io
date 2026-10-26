import { describe, expect, it } from "vitest";
import { satrecFromFacts } from "./math";
import { classifyVisibility, predictPasses } from "./pass";
import type { SourceFacts } from "../types";

const ISS: SourceFacts = {
  norad: 25544,
  name: "ISS (ZARYA)",
  objectType: null,
  operator: null,
  epoch: "2008-09-20T12:25:40Z",
  inclinationDeg: 51.6416,
  eccentricity: 0.0006703,
  meanMotionRevPerDay: 15.72125391,
  raanDeg: 247.4627,
  argPerigeeDeg: 130.536,
  meanAnomalyDeg: 325.0288,
  bstar: null,
  tle1: "1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927",
  tle2: "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537",
  sourceId: "vallado-fixture",
  sourceUrl: "https://celestrak.org/NORAD/documentation/gp-data-formats.php",
  retrievedAt: "2008-09-20T12:25:40Z",
  group: "stations",
  starlinkGen: null,
  mission: null,
};

describe("visibility classes", () => {
  it("does not claim naked-eye sightings", () => {
    expect(classifyVisibility({ latitudeDeg: 52, longitudeDeg: -9.5, altitudeKm: 0 }, { latitudeDeg: 52, longitudeDeg: -9.5, altitudeKm: 400 }, -2, new Date("2026-10-26T00:00:00Z"))).toBeNull();
  });
});

describe("pass prediction", () => {
  it("returns ordered geometric passes with AOS before LOS", () => {
    const rec = satrecFromFacts(ISS)!;
    const observer = { latitudeDeg: 52.0599, longitudeDeg: -9.5044, altitudeKm: 0 };
    const from = Date.parse("2008-09-20T12:00:00Z");
    const passes = predictPasses(rec, ISS, observer, from, from + 24 * 3600_000, 5);
    for (const p of passes) {
      expect(Date.parse(p.aos)).toBeLessThan(Date.parse(p.los));
      expect(p.maxElevationDeg).toBeGreaterThanOrEqual(5);
      expect(p.durationSec).toBeGreaterThan(0);
    }
  });
});
