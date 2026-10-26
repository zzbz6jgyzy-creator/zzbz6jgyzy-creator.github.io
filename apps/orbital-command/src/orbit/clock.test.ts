import { describe, expect, it } from "vitest";
import { HARD_LIMIT_MS, RELIABLE_MS, SimulationClock } from "./clock";

describe("simulation clock", () => {
  it("stays live at 1× until jumped", () => {
    const c = new SimulationClock("2026-10-26T00:00:00Z");
    expect(c.isLive).toBe(true);
    c.tick(performance.now() + 16);
    expect(c.isLive).toBe(true);
    c.jumpMs(3600_000);
    expect(c.isLive).toBe(false);
    c.resetToNow();
    expect(c.isLive).toBe(true);
    expect(c.playbackSpeed).toBe(1);
  });

  it("clamps to ±14 days of epoch and warns after 3 days", () => {
    const c = new SimulationClock("2026-10-26T00:00:00Z");
    c.setMs(c.epochMs + HARD_LIMIT_MS + 86400000);
    const r = c.clampToEpochWindow();
    expect(r.clamped).toBe(true);
    c.setMs(c.epochMs + RELIABLE_MS + 1000);
    expect(c.reliabilityWarning()).toMatch(/uncertainty/i);
  });
});
