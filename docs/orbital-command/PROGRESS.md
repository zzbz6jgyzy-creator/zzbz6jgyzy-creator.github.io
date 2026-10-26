# Orbital Command — progress

**Current phase:** 8 (implemented; browser smokes not run in this environment)  
**Branch:** `cursor/orbital-command-6603`  
**Updated:** 2026-10-26

## Completed

- Repository audit (static HTML, GitHub Pages, existing CelesTrak Starlink bake, no auth required).
- Architecture, implementation, data-source, performance, testing and deployment docs.
- Vite + TypeScript sub-app at `apps/orbital-command/`, production build to `/orbital-command`.
- CelesTrak ingestion (`FORMAT=TLE` + optional OMM JSON) with last-good fallback. Initial snapshot: 240 objects (stations / visual / weather), retrieved 2026-10-26T14:45:34Z, includes ISS (ZARYA).
- NASA Visible Earth textures hosted locally (day 1k/2k, night, clouds).
- Phases 1–8 source: globe, workers, Starlink on-demand, time machine, Above Me (Killarney default), CRS-35 replay with fidelity labels, localStorage challenges, homepage promo, SEO shell, analytics names.
- Unit tests: 20 vitest + 2 ingest tests passing. Production `tsc` + Vite build succeeding.

## In progress

- Playwright Chromium smokes (`tests/orbital-command-browser.py`) — Playwright is not installed in this agent environment. CI workflow will run them.
- Physical iPhone 16 Pro measurement — not available here.
- Pill menu HTML on existing pages — `nav.json` is updated; `sync-nav.py` is **not** run (would rewrite every page and collide with the SEO PR). After merge, `nav-sync.yml` can pick it up.

## Tests executed

| Suite | Result |
|---|---|
| `apps/orbital-command` vitest (20) | pass |
| `tests/orbital-command-ingest.test.mjs` (2) | pass |
| `npm run build` (tsc + Vite) | pass |
| Playwright browser smokes | not run here |
| Lighthouse / Web Vitals lab | not run here |

## Known issues

- Pill menu on existing HTML pages will not list Orbital Command until `nav-sync.yml` runs after merge.
- No physical iPhone measurement in this environment.
- CelesTrak OMM `FORMAT=JSON` does **not** include `TLE_LINE1/2`; ingestion uses `FORMAT=TLE`. Documented in `data-sources.md`.
- Historical CRS-35 Dragon trajectory is an illustrative reconstruction; ISS path in that replay is a calculated segment from **current** elements, labelled as such.
- Starlink (~11k) loads on demand from `/data/starlink.json`. Full density on low-end phones should stay on Reduced/Sparse.

## Outstanding dependencies

- Owner merge to `main` starts the 3×/day refresh Action.
- Optional later: anonymous Supabase leaderboard at `https://luidcuzdrcvmzdxpiiwf.supabase.co` (v1 scores stay in `localStorage`).
- Optional free-tier Cloudflare Worker only if Actions ever cannot reach CelesTrak — sketched in `deployment.md`, not deployed.

## Next

Owner review of the PR. Do not merge from this agent.
