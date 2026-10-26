# Orbital Command — implementation plan

Work the brief’s eight phases. Source lives in `apps/orbital-command/`. Built files are committed to `orbital-command/` so Pages serves them without an app server.

## Decisions (no approval needed)

| Decision | Choice | Rejected |
|---|---|---|
| UI runtime | Vite + TypeScript + vanilla Three.js 0.170 | R3F/Drei (no React elsewhere; heavier on iPhone) |
| Orbital math | `satellite.js` SGP4 in a Web Worker | Main-thread SGP4 every frame |
| Starlink data | Reuse `/data/starlink.json` | Second CelesTrak Starlink fetch |
| Other GP groups | New CI snapshot, 3×/day | Per-visit CelesTrak |
| Auth / scores | localStorage | Required accounts, paid APIs |
| Site nav HTML | Edit `nav.json` only | Running `sync-nav.py` (would rewrite every page and collide with the SEO PR) |
| Earth textures | NASA Visible Earth, attributed, multi-res | Unlicensed “public” textures; runtime CDN |

## Phases

1. **Foundation** — route, cinematic Earth, camera, responsive chrome, loading + no-WebGL fallback.
2. **Real satellite engine** — ingestion Action, SGP4 worker, instanced markers, search, inspector.
3. **Starlink explorer** — constellation mode, filters, follow, selected orbit + ground track.
4. **Time Machine** — one simulation clock driving Earth, Sun, sats, trails, observer math.
5. **Above Me** — location (permission optional), horizon list, pass prediction, 2D sky view, visibility classes.
6. **Mission replay** — schema + CRS-35 (verified events; trajectory fidelity labelled).
7. **Discovery / challenges** — deterministic cards, daily challenges, share links, article links.
8. **Hardening** — tests, a11y, SEO, analytics, docs, mobile quality tiers.

## Risks

- CelesTrak may refuse GitHub runners (already true for Starlink). Keep last-good snapshot.
- 11k Starlink markers on iPhone: density caps + quality tiers + interpolate between worker ticks.
- Historical CRS-35 positions need historical elements we do not have. Replay is **illustrative reconstruction** + current ISS **calculated orbital segment**, never silent telemetry.
- Concurrent SEO PR: keep template/sitemap/homepage diffs minimal; rebase onto `main` if it lands first.

## Dependencies

- Existing `starlink-refresh` job (do not raise its cadence).
- Open-Meteo geocoding (client, already used on site).
- Site fonts and `track.js` Worker allowlist.
- NASA texture licence/attribution check (see `data-sources.md`).
