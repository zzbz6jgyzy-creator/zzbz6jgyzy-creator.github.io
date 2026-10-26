/** Curated cities for Above Me. Killarney is the owner’s default example. Open-Meteo handles free-text search. */
export interface City {
  name: string;
  region: string;
  lat: number;
  lon: number;
  tz: string;
}

export const DEFAULT_CITY: City = {
  name: "Killarney",
  region: "Co. Kerry, Ireland",
  lat: 52.0599,
  lon: -9.5044,
  tz: "Europe/Dublin",
};

export const CITIES: City[] = [
  DEFAULT_CITY,
  { name: "Dublin", region: "Ireland", lat: 53.3498, lon: -6.2603, tz: "Europe/Dublin" },
  { name: "Cork", region: "Ireland", lat: 51.8985, lon: -8.4756, tz: "Europe/Dublin" },
  { name: "Galway", region: "Ireland", lat: 53.2707, lon: -9.0568, tz: "Europe/Dublin" },
  { name: "Belfast", region: "Northern Ireland", lat: 54.5973, lon: -5.9301, tz: "Europe/London" },
  { name: "London", region: "United Kingdom", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
  { name: "Paris", region: "France", lat: 48.8566, lon: 2.3522, tz: "Europe/Paris" },
  { name: "Berlin", region: "Germany", lat: 52.52, lon: 13.405, tz: "Europe/Berlin" },
  { name: "Madrid", region: "Spain", lat: 40.4168, lon: -3.7038, tz: "Europe/Madrid" },
  { name: "Rome", region: "Italy", lat: 41.9028, lon: 12.4964, tz: "Europe/Rome" },
  { name: "Amsterdam", region: "Netherlands", lat: 52.3676, lon: 4.9041, tz: "Europe/Amsterdam" },
  { name: "Stockholm", region: "Sweden", lat: 59.3293, lon: 18.0686, tz: "Europe/Stockholm" },
  { name: "New York", region: "USA", lat: 40.7128, lon: -74.006, tz: "America/New_York" },
  { name: "Los Angeles", region: "USA", lat: 34.0522, lon: -118.2437, tz: "America/Los_Angeles" },
  { name: "Chicago", region: "USA", lat: 41.8781, lon: -87.6298, tz: "America/Chicago" },
  { name: "Cape Canaveral", region: "Florida, USA", lat: 28.3922, lon: -80.6077, tz: "America/New_York" },
  { name: "Hawthorne", region: "California, USA", lat: 33.9164, lon: -118.3526, tz: "America/Los_Angeles" },
  { name: "Boca Chica", region: "Texas, USA", lat: 25.9971, lon: -97.1556, tz: "America/Chicago" },
  { name: "Toronto", region: "Canada", lat: 43.6532, lon: -79.3832, tz: "America/Toronto" },
  { name: "Mexico City", region: "Mexico", lat: 19.4326, lon: -99.1332, tz: "America/Mexico_City" },
  { name: "São Paulo", region: "Brazil", lat: -23.5505, lon: -46.6333, tz: "America/Sao_Paulo" },
  { name: "Tokyo", region: "Japan", lat: 35.6762, lon: 139.6503, tz: "Asia/Tokyo" },
  { name: "Seoul", region: "South Korea", lat: 37.5665, lon: 126.978, tz: "Asia/Seoul" },
  { name: "Singapore", region: "Singapore", lat: 1.3521, lon: 103.8198, tz: "Asia/Singapore" },
  { name: "Sydney", region: "Australia", lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney" },
  { name: "Auckland", region: "New Zealand", lat: -36.8509, lon: 174.7645, tz: "Pacific/Auckland" },
  { name: "Cape Town", region: "South Africa", lat: -33.9249, lon: 18.4241, tz: "Africa/Johannesburg" },
  { name: "Dubai", region: "UAE", lat: 25.2048, lon: 55.2708, tz: "Asia/Dubai" },
  { name: "Mumbai", region: "India", lat: 19.076, lon: 72.8777, tz: "Asia/Kolkata" },
];

export function filterCities(q: string): City[] {
  const s = q.trim().toLowerCase();
  if (!s) return CITIES.slice(0, 8);
  return CITIES.filter((c) => `${c.name} ${c.region}`.toLowerCase().includes(s)).slice(0, 10);
}

export interface GeoHit {
  name: string;
  region: string;
  lat: number;
  lon: number;
  tz: string;
}

export async function geocodeCity(name: string): Promise<GeoHit[]> {
  const q = name.trim();
  if (q.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: Array<{ name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone?: string }> };
  return (data.results || []).map((r) => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(", "),
    lat: r.latitude,
    lon: r.longitude,
    tz: r.timezone || "UTC",
  }));
}
