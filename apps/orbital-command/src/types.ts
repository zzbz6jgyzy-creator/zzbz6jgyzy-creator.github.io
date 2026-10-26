/** Wire and domain types. Source facts stay separate from derived values. */

export type ObjectGroup = "stations" | "visual" | "weather" | "starlink" | "featured" | "other";

export type Freshness =
  | "current"
  | "aging"
  | "stale"
  | "unverified";

export type TrajectoryFidelity =
  | "observed"
  | "calculated-orbital-segment"
  | "illustrative-reconstruction";

export type VisibilityClass =
  | "above-horizon"
  | "potentially-sunlit"
  | "potentially-visible";

export interface SourceFacts {
  norad: number;
  name: string;
  objectType: string | null;
  operator: string | null;
  epoch: string;
  inclinationDeg: number;
  eccentricity: number;
  meanMotionRevPerDay: number;
  raanDeg: number;
  argPerigeeDeg: number;
  meanAnomalyDeg: number;
  bstar: number | null;
  tle1: string;
  tle2: string;
  sourceId: string;
  sourceUrl: string;
  retrievedAt: string;
  group: ObjectGroup;
  /** Hardware generation for Starlink rows from the existing catalogue. Never guessed. */
  starlinkGen: string | null;
  mission: string | null;
}

export interface SnapshotFile {
  schema: "orbital-command.snapshot.v1";
  retrievedAt: string;
  source: { name: string; url: string; attribution: string };
  stale: boolean;
  lastSuccessAt: string | null;
  error: string | null;
  objects: SourceFacts[];
}

export interface Geodetic {
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeKm: number;
}

export interface Ecef {
  x: number;
  y: number;
  z: number;
}

export interface LookAngles {
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
}

export interface DerivedState extends Geodetic {
  norad: number;
  ecef: Ecef;
  velocityKmS: number;
  periodMin: number;
}

export interface Observer {
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeKm: number;
  label: string;
  timeZone: string;
}

export interface PassEvent {
  norad: number;
  name: string;
  aos: string;
  tca: string;
  los: string;
  maxElevationDeg: number;
  aosAzimuthDeg: number;
  tcaAzimuthDeg: number;
  losAzimuthDeg: number;
  durationSec: number;
  minElevationDeg: number;
}

export type AppMode = "explore" | "starlink" | "above" | "missions" | "discover" | "challenges";

export type QualityTier = "high" | "balanced" | "low";

export interface Settings {
  quality: QualityTier | "auto";
  markerDensity: "full" | "reduced" | "sparse";
  showOrbits: boolean;
  showLabels: boolean;
  units: "metric" | "imperial";
  timeFormat: "utc" | "local";
  reducedMotion: boolean;
}

export interface MissionEvent {
  id: string;
  label: string;
  at: string | null;
  dateOnly?: string;
  kind: string;
  fidelity: TrajectoryFidelity;
  source: string;
  note?: string;
}

export interface MissionRecord {
  id: string;
  name: string;
  vehicle: string;
  launchDate: string;
  launchSite: string;
  missionType: string;
  verified: boolean;
  summary: string;
  articles: { title: string; url: string }[];
  replayFidelity: TrajectoryFidelity;
  fidelityNote: string;
  events: MissionEvent[];
  followNorad: number | null;
}

export interface DeepLink {
  mode: AppMode;
  satellite: number | null;
  lat: number | null;
  lon: number | null;
  time: string | null;
  mission: string | null;
}
