import { describe, expect, it } from "vitest";
import { parseSnapshot, starlinkToFacts, validateFacts } from "./catalog";

const tle1 = "1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927";
const tle2 = "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537";

describe("catalogue validation", () => {
  it("rejects missing NORAD and short TLE", () => {
    expect(validateFacts({ name: "x", tle1: "short", tle2: "short" })).toBeNull();
    expect(validateFacts({ norad: 25544, tle1, tle2: "2 25544" })).toBeNull();
  });

  it("does not invent operator or mission", () => {
    const f = validateFacts({ norad: 25544, name: "ISS (ZARYA)", tle1, tle2, group: "stations", retrievedAt: "2026-10-26T00:00:00Z" });
    expect(f?.operator).toBeNull();
    expect(f?.mission).toBeNull();
    expect(f?.inclinationDeg).toBeCloseTo(51.6416, 3);
  });

  it("parses a snapshot and deduplicates NORAD", () => {
    const snap = parseSnapshot({
      schema: "orbital-command.snapshot.v1",
      retrievedAt: "2026-10-26T00:00:00Z",
      source: { name: "CelesTrak", url: "https://celestrak.org/", attribution: "GP" },
      stale: false,
      lastSuccessAt: "2026-10-26T00:00:00Z",
      error: null,
      objects: [
        { norad: 25544, name: "ISS", tle1, tle2, retrievedAt: "2026-10-26T00:00:00Z" },
        { norad: 25544, name: "DUP", tle1, tle2, retrievedAt: "2026-10-26T00:00:00Z" },
      ],
    });
    expect(snap?.objects).toHaveLength(1);
  });

  it("maps the existing Starlink catalogue arrays", () => {
    const rows = starlinkToFacts({
      tleAsOf: "2026-10-26T09:12:29Z",
      sources: { orbits: "https://celestrak.org/" },
      satellites: [["STARLINK-1008", 44714, "v10", tle1, tle2]],
    });
    expect(rows[0].group).toBe("starlink");
    expect(rows[0].starlinkGen).toBe("v10");
    expect(rows[0].norad).toBe(44714);
  });
});
