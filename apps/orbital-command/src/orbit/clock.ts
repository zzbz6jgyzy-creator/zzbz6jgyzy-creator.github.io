/**
 * One simulation clock. Earth lighting, satellites, trails, observer math
 * and the timeline all read `clock.now`. Speeds above 1× do not skip the
 * underlying date — they advance it faster. Historical replay of current
 * elements years backward is refused with an explicit limit.
 */

export const SPEEDS = [1, 10, 60, 300, 1000] as const;
export type Speed = (typeof SPEEDS)[number];

/** Reliable window around the newest element epoch (ms). */
export const RELIABLE_MS = 3 * 86400000;
export const HARD_LIMIT_MS = 14 * 86400000;

export class SimulationClock {
  private playing = true;
  private speed: Speed = 1;
  private lastWall = performance.now();
  private simMs: number;
  private live = true;
  readonly epochMs: number;

  constructor(epochIso?: string) {
    this.epochMs = epochIso ? Date.parse(epochIso) : Date.now();
    this.simMs = Date.now();
  }

  get now(): Date {
    return new Date(this.simMs);
  }

  get nowMs(): number {
    return this.simMs;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get isLive(): boolean {
    return this.live;
  }

  get playbackSpeed(): Speed {
    return this.speed;
  }

  tick(wallNow = performance.now()): void {
    const dt = Math.min(0.25, (wallNow - this.lastWall) / 1000);
    this.lastWall = wallNow;
    if (!this.playing) return;
    if (this.live && this.speed === 1) {
      this.simMs = Date.now();
      return;
    }
    this.live = false;
    this.simMs += dt * 1000 * this.speed;
  }

  play(): void {
    this.playing = true;
    this.lastWall = performance.now();
  }

  pause(): void {
    this.playing = false;
  }

  toggle(): void {
    this.playing ? this.pause() : this.play();
  }

  setSpeed(speed: Speed): void {
    this.speed = SPEEDS.includes(speed) ? speed : 1;
    if (this.speed !== 1) this.live = false;
  }

  resetToNow(): void {
    this.simMs = Date.now();
    this.live = true;
    this.speed = 1;
    this.playing = true;
    this.lastWall = performance.now();
  }

  jumpMs(delta: number): void {
    this.live = false;
    this.simMs += delta;
  }

  setMs(ms: number): void {
    this.live = false;
    this.simMs = ms;
  }

  clampToEpochWindow(): { clamped: boolean; reason: string | null } {
    const max = this.epochMs + HARD_LIMIT_MS;
    const min = this.epochMs - HARD_LIMIT_MS;
    if (this.simMs > max) {
      const moved = this.simMs !== max;
      this.simMs = max;
      this.live = false;
      return {
        clamped: true,
        reason: moved ? "Historical data unavailable that far from the element epoch. Clock stopped at ±14 days." : null,
      };
    }
    if (this.simMs < min) {
      const moved = this.simMs !== min;
      this.simMs = min;
      this.live = false;
      return {
        clamped: true,
        reason: moved ? "Historical data unavailable that far from the element epoch. Clock stopped at ±14 days." : null,
      };
    }
    return { clamped: false, reason: null };
  }

  reliabilityWarning(): string | null {
    const delta = Math.abs(this.simMs - this.epochMs);
    if (delta > HARD_LIMIT_MS) return "Outside the published element window.";
    if (delta > RELIABLE_MS) {
      return "Prediction uncertainty increased. This clock is more than three days from the orbital-element epoch. SGP4 is not historical ephemeris.";
    }
    return null;
  }
}
