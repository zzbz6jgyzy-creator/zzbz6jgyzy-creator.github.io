# Orbital Command — progress

**Current phase:** unlisted test (hidden from the public site)  
**Branch:** `cursor/hide-orbital-command-6603`  
**Updated:** 2026-10-26  
**Hidden URL:** https://superchargeddaily.com/lab/oc-1e1ef40d/  
**Old public URL:** `/orbital-command/` — no longer served (404)

The app is off every public surface until the owner has fully tested it. CelesTrak snapshots still write to `/data/orbital-command/snapshot.json`. SEO/nav/newsletter/wayfinding builders skip `/lab/` so the 30-minute job cannot re-list it. `/lab/` is **not** in `robots.txt`.

## Completed

- Repository audit (static HTML, GitHub Pages, existing CelesTrak Starlink bake, no auth required).
- Architecture, implementation, data-source, performance, testing and deployment docs.
- Vite + TypeScript sub-app at `apps/orbital-command/`.
- CelesTrak ingestion (`FORMAT=TLE` + optional OMM JSON) with last-good fallback. Snapshot: 240 objects (stations / visual / weather), retrieved 2026-10-26T14:45:34Z, includes ISS (ZARYA).
- NASA Visible Earth textures hosted locally (day 1k/2k, night, clouds).
- Phases 1–8 source: globe, workers, Starlink on-demand, time machine, Above Me (Killarney default), CRS-35 replay with fidelity labels, localStorage challenges, analytics names.
- **26 Oct 2026 — unlisted:** public promo, nav, sitemap, Starlink caption, pages.json, OG/canonical and pill-menu links removed. Build moved to `/lab/oc-1e1ef40d/` with `noindex, nofollow` and no public canonical.

## Tests executed

| Suite | Result |
|---|---|
| `apps/orbital-command` vitest (20) | pass |
| `tests/orbital-command-ingest.test.mjs` (2) | pass |
| `npm run build` (tsc + Vite → `lab/oc-1e1ef40d/`) | pass |
| Public HTML / sitemap / feed / robots grep for `orbital-command` and `/lab/` | pass (no hits) |
| `sync-nav.py --check`, `inject-members.py --check`, footer/wayfinding `--check` | pass |
| Playwright browser smokes | CI workflow; not run in this environment |
| Lighthouse / Web Vitals lab | not run here |

## Known issues

- No physical iPhone measurement in this environment.
- CelesTrak OMM `FORMAT=JSON` does **not** include `TLE_LINE1/2`; ingestion uses `FORMAT=TLE`.
- Historical CRS-35 Dragon trajectory is an illustrative reconstruction; ISS path in that replay is a calculated segment from **current** elements, labelled as such.
- Starlink (~11k) loads on demand from `/data/starlink.json`. Full density on low-end phones should stay on Reduced/Sparse.

## Re-launch checklist

Do this only after the owner approves going public. Surgical restore — do not re-add `/lab/` to `robots.txt` at any point.

1. **Move the app back**
   - Vite `base` and `outDir` → `/orbital-command/` and `../../orbital-command`.
   - Deep-link builder + tests → `/orbital-command/`.
   - Browser smoke paths → `/orbital-command/`.
   - CI path filter → `orbital-command/**`.
   - `js-bundles.json` `skipPages` → `orbital-command/index.html`.
   - Rebuild; `git rm -r lab/oc-1e1ef40d`; commit `orbital-command/`.

2. **Public SEO shell on the app page**
   - Remove `<meta name="robots" content="noindex, nofollow">`.
   - Restore canonical `https://superchargeddaily.com/orbital-command/`.
   - Restore OG / Twitter / JSON-LD WebApplication (public URL only).
   - Restore the noscript related-tools list if wanted.

3. **Public surfaces**
   - `scripts/nav.json`: add Orbital Command under SpaceX and Explore → SpaceX.
   - Run `python3 scripts/sync-nav.py` so every pill menu lists it.
   - Homepage: restore the `<!--oc:promo-->` section and the “More tools” link.
   - `starlink.html`: restore the `#oc-from-starlink` caption/link.
   - `data/pages.json`: restore the `/orbital-command/` search entry.
   - `scripts/build-seo.py` `sitemap()`: restore the `orbital-command/index.html` glob (or rely on a root/dir glob once the folder exists).
   - Run sitemap/feed rebuild so `sitemap.xml` lists the public URL. Keep it out of `sitemap-news.xml` unless it becomes a news article.

4. **Keep**
   - `/lab/` skip in `seo_lib.html_files` and the nav/newsletter/footer/members/bundle walkers (harmless; nothing public lives there).
   - CelesTrak refresh Action writing `data/orbital-command/`.
   - Ingest tests, vitest, and the checks workflow.

5. **Verify**
   - Production build.
   - Public pages, sitemap and feed contain `/orbital-command/` where intended and do **not** contain `/lab/`.
   - `robots.txt` still has no `/lab/` and no `/orbital-command/` Disallow.

## Outstanding dependencies

- Owner merge of the hide/move PR, then owner testing at the hidden URL.
- Optional later: anonymous Supabase leaderboard at `https://luidcuzdrcvmzdxpiiwf.supabase.co` (v1 scores stay in `localStorage`).
- Optional free-tier Cloudflare Worker only if Actions ever cannot reach CelesTrak — sketched in `deployment.md`, not deployed.

## Next

Owner review of the hide/move PR. Do not merge from this agent.
