# Supercharged Daily — Data Sources

Last verified: 19 Oct 2026. Do not add a source without opening its current terms.

## Rule

Respect robots, ToS, copyright, and rate limits. Do not scrape X, Tesla owner accounts, or anything behind a login. Do not treat social posts as confirmed facts. Do not invent citations.

## Official / structured (in use)

| Source | Used for | How | Licence / access | Cadence |
|---|---|---|---|---|
| Tesla IR production releases | `/production.html`, engine facts | Copied tables from opened IR pages: Q1 2025, Q2 2025, Q3 2025, Q4 2025, Q1–Q3 2026 | Public IR | Event-driven (quarterly print) |
| Tesla IR / SpaceX IR / SEC | Earnings clocks in `data/events.json` | Hand-entered with URL | Public | Editorial |
| Tesla VIN recall search | My Tesla official-lookup row | Link only: `https://www.tesla.com/vin-recall-search` (opened 19 Oct 2026) | Tesla public tool | On use |
| NHTSA VIN recall lookup | My Tesla official-lookup row | Link only: `https://www.nhtsa.gov/recalls` | US public | On use |
| SpaceX mission pages / official X posts | Launch outcomes, livestream URLs | Hand-entered into `live-data.json` and events | Public pages | Editorial + overlay |
| Launch Library 2 (`ll.thespacedevs.com`) | Calendar / Can I see it? overlay | Browser fetch, 14-day `localStorage` | LL2 terms; not the canonical clock | On page view |
| Open-Meteo | Geocode + weather for Can I see it? / clubs | Browser | CC BY 4.0, free | On use |
| Teslascope software list | `updates-live.json` | `scripts/snapshot-updates.py` | Public site; sample, not Tesla | ~30 min CI |
| Teslascope history we saved | `data/updates-history.json` → software waves | `scripts/build-updates-history.py` | Same sample caveat | With updates snapshot |
| TeslaFi firmware page | `data/updates-extras.json` | `scripts/snapshot-extras.py` every ~2h | Public page; polite | CI |
| Jonathan McDowell Starlink stats | `starlink-live.js` | `scripts/build-starlink-stats.py` | Cite McDowell | 8h CI |
| CelesTrak GP | `starlink-gp.js`, `data/starlink.json` | CI only; browser never calls CelesTrak | CelesTrak terms | 8h CI |
| Texas DMV via fsddb.com | `data/robotaxi-tx.json` | `scripts/build-robotaxi-tx.py` | Public mirror | 2× daily |
| Google News RSS | `news-data.json` | `scripts/snapshot-news.py` | Headlines only, not rewritten | ~30 min CI |
| Beehiiv subscribe endpoint | Newsletter forms | Browser POST, no API key in JS | Beehiiv | On signup |

## Tesla IR pages opened this session

| Quarter | URL | Totals copied |
|---|---|---|
| Q1 2025 | https://ir.tesla.com/press-release/tesla-first-quarter-2025-production-deliveries-and-deployments | Prod 362,615 / Del 336,681 / Energy 10.4 GWh · opened 19 Oct 2026 |
| Q2 2025 | https://ir.tesla.com/press-release/tesla-second-quarter-2025-production-deliveries-deployments | Prod 410,244 / Del 384,122 / Energy 9.6 GWh · opened 19 Oct 2026. The `and-deployments` URL 404s. |
| Q3 2025 | https://ir.tesla.com/press-release/tesla-third-quarter-2025-production-deliveries-deployments | Prod 447,450 / Del 497,099 / Energy 12.5 GWh |
| Q4 2025 | https://ir.tesla.com/press-release/tesla-fourth-quarter-2025-production-deliveries-deployments | Prod 434,358 / Del 418,227 / Energy 14.2 GWh |
| Q3 2026 | https://ir.tesla.com/press-release/tesla-third-quarter-2026-production-deliveries-and-deployments | Prod 464,391 / Del 486,532 / Energy 13.7 GWh (already on file; re-opened) |

YoY only when both quarters were opened: Q1 2026 vs Q1 2025 deliveries +6.3% / production +12.6%; Q2 2026 vs Q2 2025 deliveries +25.0% / production +10.1%; Q3 2026 vs Q3 2025 deliveries −2.1% / production +3.8%. No Q4 2024 table on file, so Q4 2025 has no YoY figure.

## Editorial compiled files (in use)

| File | Used for | Evidence habit |
|---|---|---|
| `data/events.json` | Canonical dates for homepage, Starship, calendar, live | Every entry needs a real source URL |
| `live-data.json` | Livestream cards | Official stream URL, never a profile page |
| `starship-data.js` | Flight log + schedule notes | Desk read of SpaceX pages / FAA slides; NET ≠ T-0 |
| `fsd-europe-data.js` / `fsd-data.js` / `tcmv-data.js` | Approval maps + `/autonomy.html` | Ministry / RDW / Reuters; empty if unconfirmed |
| `data/promises.json` | Promise tracker, Optimus, Roadster, autonomy promises | Quote opened; Electrek banned |
| `data/optimus-demos.json` | Optimus demonstration archive | Opened Verge 2021 + 2022, Engadget Roadster 2026, Dispatch Paris 2026. No invented specs. |
| `cybercab-data.js` | Robotaxi reality map + autonomy city layers | Permit ≠ commercial service |
| `data/articles.json` | Dispatch index, homepage lead | Our own stories |

## Intelligence engine outputs

Written by `node scripts/sd-intel.js` (also on news / updates / home-build workflows):

| File | Role |
|---|---|
| `data/intelligence/bundle.json` | Facts, changes, conflicts, freshness, health |
| `data/intelligence/snapshot.json` | Last fact snapshot for the next diff |
| `data/intelligence/changes.json` | Change log only |
| `data/intelligence/freshness.json` | Last checked vs last verified per tracker |
| `data/intelligence/conflicts.json` | Launch clock disagreements, kept not overwritten |
| `data/intelligence/health.json` | Admin summary |

## Sources investigated, not implemented

| Source | Why not |
|---|---|
| PostgreSQL | No existing DB. Cost and hosting need approval. |
| Tesla Fleet API | No owner OAuth. Do not ask for vehicle credentials. |
| NHTSA recalls API | Public, but no job yet. Link Tesla + NHTSA VIN tools until a snapshot exists. |
| FAA / NASA dumps | Use only opened publications already cited in events / Starship notes. |
| 10-minute GitHub cron | Existing jobs are ~30 min (news, updates). Faster needs Worker cron + approval. |
| `https://www.tesla.com/support/legal-recalls` | 404 on 19 Oct 2026. Use `/vin-recall-search` instead. |

## Rate / honesty notes

- Teslascope `latest` can be a 0-count ghost. Site logic uses `count > 0`.
- Software waves are sample first-seen / sample-count changes. Not Tesla offering a build to a car. Country waves use `countryCounts` inside `data/updates-history.json` snapshots.
- Launch Library 2 can rewind slips. `calendar-merge.pickStart` keeps the later official date unless the flight is flown.
- Starlink globe is SGP4 on a snapshot, not live telemetry.
- Software sample ≠ rollout ≠ regional availability ≠ your car being offered an update.
- Slovakia RDW recognition (16 Oct 2026) is not a confirmed customer rollout.
- Digest / alert queue is local preview. `sent` is always 0 until approval.
