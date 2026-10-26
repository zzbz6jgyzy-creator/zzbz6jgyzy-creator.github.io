/**
 * Load and normalise snapshots. Starlink uses the existing site catalogue.
 * Nothing here invents operator, status, or mission fields.
 */
import type { ObjectGroup, SnapshotFile, SourceFacts } from "../types";
import { parseTleEpoch, tleLine2Elements } from "./math";

export const SNAPSHOT_URL = "/data/orbital-command/snapshot.json";
export const STARLINK_URL = "/data/starlink.json";

interface StarlinkFile {
  updated?: string;
  tleAsOf?: string;
  fields?: string[];
  sources?: { orbits?: string };
  satellites?: Array<[string, number, string, string, string]>;
}

export function validateFacts(raw: unknown): SourceFacts | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const norad = Number(o.norad);
  const tle1 = String(o.tle1 || "");
  const tle2 = String(o.tle2 || "");
  if (!Number.isInteger(norad) || norad <= 0) return null;
  if (tle1.length < 68 || tle2.length < 68) return null;
  const elems = tleLine2Elements(tle2);
  if (!elems) return null;
  const epoch = typeof o.epoch === "string" && o.epoch ? o.epoch : parseTleEpoch(tle1);
  if (!epoch) return null;
  const group = (o.group as ObjectGroup) || "other";
  return {
    norad,
    name: String(o.name || `NORAD ${norad}`),
    objectType: emptyToNull(o.objectType),
    operator: emptyToNull(o.operator),
    epoch,
    inclinationDeg: num(o.inclinationDeg, elems.inclinationDeg),
    eccentricity: num(o.eccentricity, elems.eccentricity),
    meanMotionRevPerDay: num(o.meanMotionRevPerDay, elems.meanMotionRevPerDay),
    raanDeg: num(o.raanDeg, elems.raanDeg),
    argPerigeeDeg: num(o.argPerigeeDeg, elems.argPerigeeDeg),
    meanAnomalyDeg: num(o.meanAnomalyDeg, elems.meanAnomalyDeg),
    bstar: o.bstar == null || o.bstar === "" ? null : Number(o.bstar),
    tle1,
    tle2,
    sourceId: String(o.sourceId || "celestrak-gp"),
    sourceUrl: String(o.sourceUrl || "https://celestrak.org/NORAD/elements/"),
    retrievedAt: String(o.retrievedAt || ""),
    group,
    starlinkGen: emptyToNull(o.starlinkGen),
    mission: emptyToNull(o.mission),
  };
}

function emptyToNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function parseSnapshot(raw: unknown): SnapshotFile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schema !== "orbital-command.snapshot.v1") return null;
  if (!Array.isArray(o.objects)) return null;
  const objects: SourceFacts[] = [];
  const seen = new Set<number>();
  for (const row of o.objects) {
    const f = validateFacts(row);
    if (!f || seen.has(f.norad)) continue;
    seen.add(f.norad);
    objects.push(f);
  }
  const source = (o.source && typeof o.source === "object" ? o.source : {}) as Record<string, string>;
  return {
    schema: "orbital-command.snapshot.v1",
    retrievedAt: String(o.retrievedAt || ""),
    source: {
      name: source.name || "CelesTrak",
      url: source.url || "https://celestrak.org/NORAD/elements/",
      attribution: source.attribution || "CelesTrak GP",
    },
    stale: Boolean(o.stale),
    lastSuccessAt: o.lastSuccessAt ? String(o.lastSuccessAt) : null,
    error: o.error ? String(o.error) : null,
    objects,
  };
}

export function starlinkToFacts(file: StarlinkFile): SourceFacts[] {
  const retrievedAt = file.tleAsOf || file.updated || "";
  const sourceUrl = file.sources?.orbits || "https://celestrak.org/NORAD/elements/";
  const out: SourceFacts[] = [];
  const seen = new Set<number>();
  for (const row of file.satellites || []) {
    const [name, norad, gen, tle1, tle2] = row;
    const facts = validateFacts({
      norad,
      name,
      tle1,
      tle2,
      group: "starlink",
      starlinkGen: gen && gen !== "unknown" ? gen : null,
      sourceId: "celestrak-gp",
      sourceUrl,
      retrievedAt,
    });
    if (!facts || seen.has(facts.norad)) continue;
    seen.add(facts.norad);
    out.push(facts);
  }
  return out;
}

export async function loadSnapshot(url = SNAPSHOT_URL): Promise<SnapshotFile | null> {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return null;
    return parseSnapshot(await res.json());
  } catch {
    return null;
  }
}

export async function loadStarlink(url = STARLINK_URL): Promise<SourceFacts[]> {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return [];
    return starlinkToFacts(await res.json());
  } catch {
    return [];
  }
}

export function newestEpoch(objects: SourceFacts[]): string | null {
  let best: string | null = null;
  for (const o of objects) {
    if (!best || o.epoch > best) best = o.epoch;
  }
  return best;
}

export function searchObjects(objects: SourceFacts[], query: string, limit = 20): SourceFacts[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: SourceFacts[] = [];
  for (const o of objects) {
    if (String(o.norad).includes(q) || o.name.toLowerCase().includes(q) || (o.group && o.group.includes(q))) {
      out.push(o);
      if (out.length >= limit) break;
    }
  }
  return out;
}
