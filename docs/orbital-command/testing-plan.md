# Orbital Command — testing plan

Do not mark a test passed unless it was executed.

## Unit (`apps/orbital-command` Vitest / Node)

| Area | Fixture / check |
|---|---|
| GP parse + validate | Reject missing NORAD, bad TLE, invented fields |
| SGP4 | Vallado ISS published TLE; position is finite and near expected LEO radius |
| Period | `1440 / meanMotion` minutes |
| Geodetic ↔ scene | Round-trip lon/lat at equator / poles |
| Observer az/el | Known zenith / horizon cases |
| Horizon crossing / passes | Synthetic circular LEO over Killarney |
| Clock | play/pause/speed/jump; all consumers read one `now` |
| Freshness | epoch age bands; do not use page-build time |
| Deep links | valid / invalid query params |
| Challenges | deterministic daily seed; scoring from snapshot, not live noise |

## Ingestion

- Happy path: mock CelesTrak JSON → snapshot schema.
- Upstream 5xx / empty body → previous snapshot kept, `stale: true`.
- Dedup by NORAD. Epoch and `retrievedAt` recorded.

## Browser (Playwright, Chromium)

Desktop 1280 and iPhone-ish 390×844: launch, landing actions, select ISS, Starlink filter, time scrub, deny geolocation + manual Killarney, mission CRS-35 fidelity labels, search, no-WebGL fallback, keyboard focus, reduced motion.

These tests run against the **built** `orbital-command/index.html` via a local static server. They are not a substitute for a physical iPhone.

## Performance

Log frame times in the Playwright session where possible. Long-session / GPU memory checks are manual; record as unverified until done.
