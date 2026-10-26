import { describe, expect, it } from "vitest";
import { dailyChallenge, scoreChallenge, shareText } from "./engagement";

describe("challenges", () => {
  it("is deterministic for a UTC day", () => {
    expect(dailyChallenge("2026-10-26").id).toBe(dailyChallenge("2026-10-26").id);
  });

  it("scores correctness, speed and hints without random data", () => {
    expect(scoreChallenge({ correct: false, elapsedMs: 1000, usedHint: false, difficulty: 2 })).toBe(0);
    expect(scoreChallenge({ correct: true, elapsedMs: 10_000, usedHint: false, difficulty: 2 })).toBe(225);
    expect(scoreChallenge({ correct: true, elapsedMs: 10_000, usedHint: true, difficulty: 2 })).toBe(205);
  });

  it("share copy does not invent visibility", () => {
    expect(shareText("above", "12 satellites")).toMatch(/Geometric line-of-sight/);
    expect(shareText("iss", "Ireland")).toMatch(/not live telemetry/);
  });
});
