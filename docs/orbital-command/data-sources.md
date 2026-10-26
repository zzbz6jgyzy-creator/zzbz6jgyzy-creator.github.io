# Orbital Command — data sources

Last reviewed: 26 Oct 2026. Do not add a paid source without approval. Visitors must never query CelesTrak.

## Orbital elements

| Source | Use | How it reaches the browser | Licence / policy |
|---|---|---|---|
| [CelesTrak GP](https://celestrak.org/NORAD/documentation/gp-data-formats.php) | Stations, visual, weather, featured objects | `scripts/build-orbital-command-gp.py` in GitHub Actions (≤3×/day). Fetches `FORMAT=TLE` (OMM JSON has no `TLE_LINE1/2`) plus optional JSON for BSTAR / object type. Writes `/data/orbital-command/*.json`. Failed fetch keeps the last valid file. | [CelesTrak usage policy](https://celestrak.org/usage-policy.php): GP download once per update (currently ~2 h). Our 8-hour Starlink job + this 8-hour job stay inside that. |
| `/data/starlink.json` | Full Starlink catalogue | Existing `scripts/build-starlink-gp.py` / `starlink-refresh.yml`. Loaded on demand in Starlink mode. | Same CelesTrak GP terms. Hardware buses: Jonathan McDowell GCAT, CC BY 4.0. |

GP fields stored as **source facts** only: NORAD, name, epoch, inclination, eccentricity, mean motion, RAAN, argument of perigee, mean anomaly, BSTAR, TLE lines, retrieval time, source URL. Derived values (lat/lon/alt, period, az/el) are calculated in the client and labelled as such.

Object type / operator / mission are filled **only** when present in the record or in a curated, sourced metadata table. Missing fields stay empty. Operational / inactive / deorbiting status is **not** invented.

## Imagery

| Asset | Source | Licence |
|---|---|---|
| Earth day (Blue Marble land/shallow topo) | NASA Visible Earth [57752](https://visibleearth.nasa.gov/images/57752/blue-marble-land-surface-shallow-water-and-shaded-topography) | NASA imagery generally not copyrighted; attribution required. Not every NASA-hosted file is free to redistribute — these Visible Earth stills are the documented set. |
| Earth night lights | NASA Visible Earth [55167](https://visibleearth.nasa.gov/images/55167/earths-city-lights) | Same NASA attribution. |
| Clouds | NASA Visible Earth [57747](https://visibleearth.nasa.gov/images/57747/blue-marble-clouds) | Same. |

Hosted under `apps/orbital-command/public/textures/` with `ATTRIBUTION.md`. Quality tiers pick 1k vs 2k. If a texture fails to load, the shader falls back to a procedural globe — the page still works.

## Other public inputs

| Source | Use | Notes |
|---|---|---|
| Open-Meteo geocoding | City search for Above Me | Already used by launch viewing / Starlink sky finder. Client-side. CC BY 4.0. |
| `/data/articles.json`, `/data/events.json`, `/data/launches.json` | Discovery cards + related Dispatch links | Existing Supercharged Daily snapshots. |
| CRS-35 mission card | Mission replay | NASA ISS blog 15 Oct 2026 (dock 10:27 a.m. EDT); Supercharged Daily [docking](/dispatch/crs35-dragon-docks.html) and [launch](/dispatch/crs35-final-solar-arrays.html) (liftoff 6:33 a.m. ET, 13 Oct 2026). |

## Honesty labels (required in UI)

- **Current calculated position** — SGP4 at the simulation clock.
- **Orbital data updated at [timestamp]** — element epoch and retrieval time, both shown.
- **Data ageing / prediction uncertainty increased** — when the newest epoch is older than 36 h, or the clock is more than 3 days from epoch.
- **Historical data unavailable** — time machine beyond the reliable window, or mission replay without historical elements.
- **Simulation reconstruction / illustrative reconstruction** — CRS-35 Dragon path. ISS path in that replay is a **calculated orbital segment** from *current* elements, not October 2026 ephemeris.
- **Geometric line-of-sight / potentially sunlit / potentially visible** — never “confirmed Starlink coverage” or “you will see this”.

SGP4 is not onboard telemetry. Geodetic altitude is not geocentric radius. Weather and local conditions are out of scope for optical claims.
