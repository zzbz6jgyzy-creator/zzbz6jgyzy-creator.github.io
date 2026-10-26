/**
 * Horizon crossing and pass prediction.
 * Times are UTC internally. Local display uses the observer time zone.
 * A satellite above the horizon is not automatically visible to the eye.
 */
import type { DerivedState, Geodetic, PassEvent, SourceFacts, VisibilityClass } from "../types";
import { lookAngles, propagateDerived, satelliteSunlit, sunElevation, type SatRec } from "./math";

export function classifyVisibility(observer: Geodetic, sat: Geodetic, elevationDeg: number, date: Date, minEl = 0): VisibilityClass | null {
  if (elevationDeg < minEl) return null;
  const satLit = satelliteSunlit(sat, date);
  const sunEl = sunElevation(observer, date);
  const observerDark = sunEl < -6;
  if (satLit && observerDark) return "potentially-visible";
  if (satLit) return "potentially-sunlit";
  return "above-horizon";
}

export function visibilityLabel(c: VisibilityClass): string {
  if (c === "potentially-visible") {
    return "Potentially visible under favourable conditions (satellite sunlit, observer in darkness). Weather and brightness are not known.";
  }
  if (c === "potentially-sunlit") {
    return "Geometrically above the horizon and likely sunlit. Daylight usually hides the satellite from the unaided eye.";
  }
  return "Geometrically above the horizon. Not a naked-eye forecast.";
}

function elevationAt(rec: SatRec, facts: SourceFacts, observer: Geodetic, ms: number): { el: number; az: number; state: DerivedState } | null {
  const date = new Date(ms);
  const state = propagateDerived(rec, date, facts.norad, facts.meanMotionRevPerDay);
  if (!state) return null;
  const look = lookAngles(observer, state, date, rec);
  if (!look) return null;
  return { el: look.elevationDeg, az: look.azimuthDeg, state };
}

function refineCrossing(rec: SatRec, facts: SourceFacts, observer: Geodetic, a: number, b: number, minEl: number, rising: boolean): number {
  let lo = a;
  let hi = b;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    const s = elevationAt(rec, facts, observer, mid);
    if (!s) break;
    const above = s.el >= minEl;
    if (rising ? above : !above) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Predict geometric passes in [fromMs, toMs].
 * Sample step 30 s; refine AOS/LOS. This is not a visual-magnitude forecast.
 */
export function predictPasses(
  rec: SatRec,
  facts: SourceFacts,
  observer: Geodetic,
  fromMs: number,
  toMs: number,
  minEl = 10,
): PassEvent[] {
  const step = 30_000;
  const events: PassEvent[] = [];
  let prev = elevationAt(rec, facts, observer, fromMs);
  let open: { aos: number; aosAz: number } | null = null;
  let peak = { ms: fromMs, el: prev?.el ?? -90, az: prev?.az ?? 0 };

  for (let t = fromMs + step; t <= toMs; t += step) {
    const cur = elevationAt(rec, facts, observer, t);
    if (!cur || !prev) {
      prev = cur;
      continue;
    }
    if (!open && prev.el < minEl && cur.el >= minEl) {
      const aos = refineCrossing(rec, facts, observer, t - step, t, minEl, true);
      const a = elevationAt(rec, facts, observer, aos);
      open = { aos, aosAz: a?.az ?? cur.az };
      peak = { ms: t, el: cur.el, az: cur.az };
    }
    if (open) {
      if (cur.el > peak.el) peak = { ms: t, el: cur.el, az: cur.az };
      if (prev.el >= minEl && cur.el < minEl) {
        const los = refineCrossing(rec, facts, observer, t - step, t, minEl, false);
        const l = elevationAt(rec, facts, observer, los);
        events.push({
          norad: facts.norad,
          name: facts.name,
          aos: new Date(open.aos).toISOString(),
          tca: new Date(peak.ms).toISOString(),
          los: new Date(los).toISOString(),
          maxElevationDeg: peak.el,
          aosAzimuthDeg: open.aosAz,
          tcaAzimuthDeg: peak.az,
          losAzimuthDeg: l?.az ?? cur.az,
          durationSec: Math.max(0, (los - open.aos) / 1000),
          minElevationDeg: minEl,
        });
        open = null;
      }
    }
    prev = cur;
  }
  return events;
}
