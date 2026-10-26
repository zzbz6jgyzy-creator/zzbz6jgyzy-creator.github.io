# Orbital Command — architecture

Orbital Command is a **bundled static sub-app** at `/orbital-command/`. It does not change Supercharged Daily’s static-HTML / GitHub Pages architecture.

## Repository audit (26 Oct 2026)

| Item | Finding |
|---|---|
| Framework | Static HTML on GitHub Pages. No root `package.json`. No app server, database, or site-wide auth. |
| Routing | File paths. `CNAME` is `superchargeddaily.com`. Cloudflare sits in front of Pages. |
| Components / design | Per-page HTML + CSS. Inter + IBM Plex Mono (self-hosted). Crimson brand; charcoal theme. Desk pages use `pn-wrap` pill nav from `scripts/nav.json`. |
| Auth | Optional Google + Supabase comments on Dispatch (`members-config.json`). Public trackers need no account. |
| Data / jobs | Python/Node builders commit JSON snapshots. Starlink GP already ingested by `.github/workflows/starlink-refresh.yml` (01:25 / 09:25 / 17:25 UTC). Headlines refresh ~30 min. |
| Analytics | Cloudflare Web Analytics + `track.js` → `sd-events` Worker (allowlisted event names, pathname only). |
| Space / 3D | `starlink.html` (Cesium + `satellite.min.js`, CelesTrak **CI-only**). `see-the-launch.html`, `starship.html`, `calendar.html`, `spacex.html`. Three.js r170 vendored for car explorers. |
| Tests | `node --test`, Python unittest, Playwright (`*-browser.py`). |
| SEO | Per-page meta + JSON-LD. `scripts/build-seo.py` rebuilds `sitemap.xml` from globs. Marker comments: `seo:ld`, `<!--nl:start-->`, `<!--sd:bundles-->`, `<!--hv:*-->`. |

## Integration strategy

Reuse, do not duplicate:

- **Starlink catalogue:** `/data/starlink.json` (existing CelesTrak GP bake). Orbital Command loads it on demand. Visitors never hit CelesTrak.
- **Featured / stations / visual / weather:** new compact snapshots at `/data/orbital-command/` from a scheduled Action (few times a day).
- **Launches / articles:** read existing `/data/launches.json`, `/data/articles.json`, `/data/events.json` for discovery links.
- **Typography:** site fonts at `/assets/fonts/`.
- **Geocoding:** Open-Meteo (already used by launch viewing / Starlink sky finder).
- **Default observer example:** Killarney, Co. Kerry (`52.0599, -9.5044`).

Keep shared-file edits small so they merge beside the concurrent SEO-fixes PR:

- `scripts/nav.json` only (do **not** run `sync-nav.py` on every page in this PR).
- One sitemap glob line in `build-seo.py`.
- `data/pages.json` entries.
- Homepage static promo **outside** `<!--hv:*-->` markers.
- A few `track.js` allowlist names.
- `js-bundles.json` skip for the built page.

## Runtime shape

```
apps/orbital-command/     source (Vite + TypeScript + Three.js)
orbital-command/          committed build output (GitHub Pages)
data/orbital-command/     GP snapshots (CI)
docs/orbital-command/     this folder
```

**Vanilla Three.js**, not React Three Fiber. The rest of the site is not React; car explorers already use Three r170. R3F would add a second UI runtime and a larger mobile bundle without a matching component library.

The 3D canvas is a client enhancement. The built `index.html` is crawlable: title, description, OG, JSON-LD, explanatory copy, and a no-JS satellite list / 2D fallback.

## Coordinate pipeline

SGP4 (`satellite.js`) → TEME/ECI km → GMST → geodetic lat/lon/alt → Three.js Y-up ECEF (Earth radius = 1). The Earth mesh is texture-fixed; the Sun and satellites move with the **simulation clock**. Positions are calculated, not telemetry.

## Persistence

v1: `localStorage` for settings, saved observer (with consent), challenge progress and streaks. No accounts.

Supabase (`https://luidcuzdrcvmzdxpiiwf.supabase.co`) is reserved for a later optional leaderboard. See `deployment.md`.

## What this is not

- Not a replacement for `/starlink.html` (counts, generations, McDowell journal).
- Not a replacement for `/see-the-launch.html` (launch visibility + weather).
- Not live operator telemetry, Starlink service coverage, or centimetre-level accuracy.
