import { describe, expect, it } from "vitest";
import { buildDeepLink, parseDeepLink } from "./deeplink";

describe("deep links", () => {
  it("accepts valid params and drops junk", () => {
    const l = parseDeepLink("?mode=starlink&satellite=25544&lat=52.06&lon=-9.5&t=2026-10-26T12:00:00Z&mission=crs-35&foo=1");
    expect(l.mode).toBe("starlink");
    expect(l.satellite).toBe(25544);
    expect(l.lat).toBeCloseTo(52.06);
    expect(l.lon).toBeCloseTo(-9.5);
    expect(l.mission).toBe("crs-35");
    expect(l.time).toMatch(/^2026-10-26T12:00:00/);
  });

  it("rejects out-of-range values", () => {
    const l = parseDeepLink("?mode=hack&satellite=nope&lat=200&lon=400&t=yesterday");
    expect(l.mode).toBe("explore");
    expect(l.satellite).toBeNull();
    expect(l.lat).toBeNull();
    expect(l.lon).toBeNull();
    expect(l.time).toBeNull();
  });

  it("builds a shareable path", () => {
    expect(buildDeepLink({ mode: "above", satellite: 25544, lat: 52.0599, lon: -9.5044 })).toBe(
      "/orbital-command/?mode=above&satellite=25544&lat=52.0599&lon=-9.5044",
    );
  });
});
