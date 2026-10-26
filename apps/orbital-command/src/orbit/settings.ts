import type { QualityTier, Settings } from "../types";

const KEY = "sd-orbital-command-settings";

export const DEFAULT_SETTINGS: Settings = {
  quality: "auto",
  markerDensity: "reduced",
  showOrbits: true,
  showLabels: true,
  units: "metric",
  timeFormat: "utc",
  reducedMotion: false,
};

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS, reducedMotion: prefersReduced() };
    return {
      quality: ["auto", "high", "balanced", "low"].includes(raw.quality) ? raw.quality : "auto",
      markerDensity: ["full", "reduced", "sparse"].includes(raw.markerDensity) ? raw.markerDensity : "reduced",
      showOrbits: raw.showOrbits !== false,
      showLabels: raw.showLabels !== false,
      units: raw.units === "imperial" ? "imperial" : "metric",
      timeFormat: raw.timeFormat === "local" ? "local" : "utc",
      reducedMotion: raw.reducedMotion === true || prefersReduced(),
    };
  } catch {
    return { ...DEFAULT_SETTINGS, reducedMotion: prefersReduced() };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota */
  }
}

export function prefersReduced(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function guessTier(): QualityTier {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency || 4;
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  if (mem != null && mem <= 2) return "low";
  if (coarse || cores <= 4 || (mem != null && mem <= 4)) return "balanced";
  return "high";
}

export function formatDistance(km: number, units: Settings["units"]): string {
  if (!Number.isFinite(km)) return "—";
  if (units === "imperial") return `${(km * 0.621371).toFixed(0)} mi`;
  return `${km.toFixed(0)} km`;
}

export function formatSpeed(kmS: number, units: Settings["units"]): string {
  if (!Number.isFinite(kmS)) return "—";
  if (units === "imperial") return `${(kmS * 2236.94).toFixed(0)} mph`;
  return `${(kmS * 3600).toFixed(0)} km/h`;
}

export function formatAltitude(km: number, units: Settings["units"]): string {
  return formatDistance(km, units);
}
