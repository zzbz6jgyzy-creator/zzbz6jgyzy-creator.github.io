import type { MissionRecord, Observer, PassEvent, SourceFacts } from "../types";
import { buildDeepLink } from "./deeplink";
import crs35 from "../data/missions/crs-35.json";

export const MISSIONS: MissionRecord[] = [crs35 as MissionRecord];

export function missionById(id: string | null): MissionRecord | null {
  if (!id) return null;
  return MISSIONS.find((m) => m.id === id) || null;
}

export interface DiscoveryCard {
  id: string;
  title: string;
  body: string;
  at: string | null;
  source: string;
  kind: "calculated" | "imported" | "editorial";
  href: string;
  article?: { title: string; url: string };
}

export function buildDiscoveries(opts: {
  now: Date;
  iss?: SourceFacts;
  snapshotRetrieved?: string;
  nextIssPass?: PassEvent | null;
  observer?: Observer | null;
  articles: { title: string; url: string; topic?: string; tag?: string }[];
}): DiscoveryCard[] {
  const cards: DiscoveryCard[] = [];
  if (opts.nextIssPass && opts.observer) {
    cards.push({
      id: "iss-pass",
      title: `Next ISS pass over ${opts.observer.label}`,
      body: `Geometric rise ${opts.nextIssPass.aos.replace("T", " ").replace("Z", " UTC")}, max elevation ${opts.nextIssPass.maxElevationDeg.toFixed(0)}°. Not a naked-eye guarantee.`,
      at: opts.nextIssPass.aos,
      source: "Calculated from CelesTrak elements + your observer",
      kind: "calculated",
      href: buildDeepLink({ mode: "above", satellite: 25544, lat: opts.observer.latitudeDeg, lon: opts.observer.longitudeDeg }),
    });
  }
  if (opts.iss) {
    cards.push({
      id: "iss-now",
      title: "International Space Station",
      body: `Calculated from elements dated ${opts.iss.epoch}. Follow it around Earth.`,
      at: opts.iss.epoch,
      source: opts.iss.sourceUrl,
      kind: "calculated",
      href: buildDeepLink({ mode: "explore", satellite: 25544 }),
    });
  }
  cards.push({
    id: "crs-35",
    title: "Replay CRS-35 docking",
    body: "Verified event times from NASA and Supercharged Daily. Dragon path is labelled as an illustrative reconstruction.",
    at: "2026-10-15T14:27:00Z",
    source: "NASA ISS blog · Supercharged Daily",
    kind: "editorial",
    href: buildDeepLink({ mode: "missions", mission: "crs-35" }),
    article: { title: "Cargo Dragon docks with the station’s last new solar arrays", url: "/dispatch/crs35-dragon-docks.html" },
  });
  const starlinkStory = opts.articles.find((a) => /starlink/i.test(a.title) || a.topic === "starlink" || a.tag === "Starlink");
  if (starlinkStory) {
    cards.push({
      id: "starlink-article",
      title: starlinkStory.title,
      body: "From Supercharged Daily. Open the constellation beside the reporting.",
      at: null,
      source: "Supercharged Daily Dispatch",
      kind: "editorial",
      href: buildDeepLink({ mode: "starlink" }),
      article: { title: starlinkStory.title, url: starlinkStory.url },
    });
  }
  cards.push({
    id: "starlink-tool",
    title: "Starlink tracker — counts and generations",
    body: "Orbital Command shows calculated positions. Independent in-orbit counts live on the existing Starlink observatory.",
    at: opts.snapshotRetrieved || null,
    source: "Supercharged Daily",
    kind: "editorial",
    href: "/starlink.html",
  });
  return cards;
}

export interface ChallengeDef {
  id: string;
  title: string;
  body: string;
  hint: string;
  kind: "select-iss" | "inclination" | "period" | "starlink-alt";
  answer: string;
  options?: string[];
  difficulty: 1 | 2 | 3;
}

function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function daySeed(day: string): number {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function dailyChallenge(day = utcDay()): ChallengeDef {
  const defs: ChallengeDef[] = [
    {
      id: "locate-iss",
      title: "Locate the ISS",
      body: "Find and select the International Space Station. Positions are calculated from published elements — not a live GPS feed.",
      hint: "Search NORAD 25544 or ISS.",
      kind: "select-iss",
      answer: "25544",
      difficulty: 1,
    },
    {
      id: "iss-inclination",
      title: "ISS inclination",
      body: "What is the published inclination of the ISS, to the nearest degree? Use the inspector, not a guess.",
      hint: "Open the ISS and read Inclination. LEO crew missions sit near 51–52°.",
      kind: "inclination",
      answer: "52",
      options: ["28°", "52°", "70°", "98°"],
      difficulty: 2,
    },
    {
      id: "iss-period",
      title: "ISS orbital period",
      body: "Roughly how long does the ISS take to complete one calculated orbit?",
      hint: "Period ≈ 1440 / mean motion. LEO is about 90 minutes.",
      kind: "period",
      answer: "93",
      options: ["45 minutes", "93 minutes", "6 hours", "24 hours"],
      difficulty: 2,
    },
    {
      id: "starlink-shell",
      title: "A Starlink shell",
      body: "Open Starlink mode and select any satellite whose calculated altitude is between 500 and 600 km. That is a geometric shell, not a service-availability claim.",
      hint: "Use the altitude filter, then tap a marker.",
      kind: "starlink-alt",
      answer: "500-600",
      difficulty: 3,
    },
  ];
  return defs[daySeed(day) % defs.length];
}

export interface ProgressStore {
  days: Record<string, { id: string; score: number; ms: number }>;
  streak: number;
  best: number;
}

const PROGRESS_KEY = "sd-orbital-command-progress";

export function loadProgress(): ProgressStore {
  try {
    const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null");
    if (!raw || typeof raw !== "object") return { days: {}, streak: 0, best: 0 };
    return {
      days: raw.days && typeof raw.days === "object" ? raw.days : {},
      streak: Number(raw.streak) || 0,
      best: Number(raw.best) || 0,
    };
  } catch {
    return { days: {}, streak: 0, best: 0 };
  }
}

export function saveProgress(p: ProgressStore): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function scoreChallenge(opts: { correct: boolean; elapsedMs: number; usedHint: boolean; difficulty: number }): number {
  if (!opts.correct) return 0;
  let s = 100 * opts.difficulty;
  if (opts.elapsedMs < 30_000) s += 25;
  else if (opts.elapsedMs < 90_000) s += 10;
  if (opts.usedHint) s -= 20;
  return Math.max(10, s);
}

export function recordCompletion(id: string, score: number): ProgressStore {
  const day = utcDay();
  const p = loadProgress();
  p.days[day] = { id, score, ms: Date.now() };
  p.best = Math.max(p.best, score);
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (p.days[key]) streak += 1;
    else break;
  }
  p.streak = streak;
  saveProgress(p);
  return p;
}

export function shareText(kind: "iss" | "above" | "challenge", detail: string): string {
  if (kind === "iss") return `I tracked the ISS over ${detail} in Orbital Command. Calculated position, not live telemetry.`;
  if (kind === "above") return `I found ${detail} above my horizon in Orbital Command. Geometric line-of-sight, not a visibility promise.`;
  return `I completed today’s Orbital Command challenge: ${detail}`;
}

export function xShareUrl(text: string, url: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export const OBSERVER_KEY = "sd-orbital-command-observer";

export function loadSavedObserver(): Observer | null {
  try {
    const raw = JSON.parse(localStorage.getItem(OBSERVER_KEY) || "null");
    if (!raw || typeof raw.latitudeDeg !== "number" || typeof raw.longitudeDeg !== "number") return null;
    if (raw.latitudeDeg < -90 || raw.latitudeDeg > 90 || raw.longitudeDeg < -180 || raw.longitudeDeg > 180) return null;
    return {
      latitudeDeg: raw.latitudeDeg,
      longitudeDeg: raw.longitudeDeg,
      altitudeKm: 0,
      label: String(raw.label || "Saved location"),
      timeZone: String(raw.timeZone || "UTC"),
    };
  } catch {
    return null;
  }
}

export function saveObserver(o: Observer): void {
  try {
    localStorage.setItem(OBSERVER_KEY, JSON.stringify(o));
  } catch {
    /* ignore */
  }
}

export function clearObserver(): void {
  try {
    localStorage.removeItem(OBSERVER_KEY);
  } catch {
    /* ignore */
  }
}
