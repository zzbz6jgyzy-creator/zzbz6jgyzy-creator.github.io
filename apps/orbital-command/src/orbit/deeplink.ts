import type { AppMode, DeepLink } from "../types";

const MODES: AppMode[] = ["explore", "starlink", "above", "missions", "discover", "challenges"];

function intParam(raw: string | null, min: number, max: number): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

function floatParam(raw: string | null, min: number, max: number): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export function parseDeepLink(search: string): DeepLink {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const modeRaw = (q.get("mode") || "explore").toLowerCase();
  const mode = (MODES as string[]).includes(modeRaw) ? (modeRaw as AppMode) : "explore";
  const timeRaw = q.get("t") || q.get("time");
  let time: string | null = null;
  if (timeRaw) {
    const ms = Date.parse(timeRaw);
    if (Number.isFinite(ms)) time = new Date(ms).toISOString();
  }
  const mission = (q.get("mission") || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  return {
    mode,
    satellite: intParam(q.get("satellite") || q.get("norad"), 1, 999999),
    lat: floatParam(q.get("lat"), -90, 90),
    lon: floatParam(q.get("lon"), -180, 180),
    time,
    mission: mission || null,
  };
}

export function buildDeepLink(link: Partial<DeepLink>): string {
  const q = new URLSearchParams();
  if (link.mode && link.mode !== "explore") q.set("mode", link.mode);
  if (link.satellite) q.set("satellite", String(link.satellite));
  if (link.lat != null) q.set("lat", link.lat.toFixed(4));
  if (link.lon != null) q.set("lon", link.lon.toFixed(4));
  if (link.time) q.set("t", link.time);
  if (link.mission) q.set("mission", link.mission);
  const s = q.toString();
  return s ? `/orbital-command/?${s}` : "/orbital-command/";
}
