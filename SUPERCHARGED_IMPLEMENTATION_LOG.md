# Supercharged Daily — Implementation Log

Branch: `cursor/intelligence-engine-5e96`  
Date: 19 Oct 2026

## Batch 1 — Intelligence Engine + tracker vertical slice

### Problem

The brief asked for a central intelligence platform (Postgres, 10-minute jobs, Fleet API, AI review queue, ten flagship trackers). The repo is a static GitHub Pages site. Inventing a warehouse or live APIs would be dishonest.

### Decision

Build the Supercharged Intelligence Engine on the files that already exist. Record conflicts. Label evidence. Do not deploy mail or ads.

### Files added (batch 1)

- `intel-core.js`, `intel.js`, `intel.css`
- `scripts/sd-intel.js`, `scripts/test-intelligence.mjs`, `scripts/test-intelligence-browser.mjs`
- `data/production.json`, `data/intelligence/*`
- `optimus.html`, `optimus.js`, `production.html`, `production.js`, `intel-health.html`
- `SUPERCHARGED_MASTER_PLAN.md`, `SUPERCHARGED_DATA_SOURCES.md`, this log

## Batch 2 — Software waves, autonomy evidence, Daily preview, official YoY

### Implemented

- Teslascope history → human wave sentences in `intel-core.softwareWaves` (first seen and ≥40-car sample jumps). Labelled reported/unconfirmed. Never an offer to a VIN.
- `/autonomy.html` reuses `fsd-data.js`, `fsd-europe-data.js`, `cybercab-data.js`, `data/promises.json`. Layers: supervised assistance, recognised-not-rollout (Slovakia), commercial paid rides (Austin), company claim (Dallas), staging (Houston).
- `/daily.html` follow chips, since-last-visit, digest **preview**. `alertEnqueue` returns `sent: 0`. Checkbox stores `sd-alerts-v1` locally.
- Production: opened Tesla IR Q3 2025 and Q4 2025 pages; added official rows. Q3 2026 vs Q3 2025 YoY now sourced (−2.1% deliveries, +3.8% production).
- Roadster `#promise` panel is a sourced table. No invented %.
- My Tesla recall row links Tesla VIN recall search and NHTSA VIN lookup only.
- Search + sitemap: `autonomy.html`, `daily.html`.

### Engine results (after batch 2)

- Facts: 16
- Sourced change rows: 67 (includes Teslascope waves)
- Conflicts kept: 2 (same CRS-35 docking and USSF-481 clocks as batch 1)
- Health: `ok: true`

### Tests executed

```
node scripts/test-intelligence.mjs
```

ALL_PASS — previous cases plus software waves, Slovakia recognised-not-live, Austin commercial, Dallas claim, digest `sent: false`, alert dedupe.

```
node scripts/sd-intel.js
```

facts 16, changes 67, conflicts 2, ok true.

```
node scripts/test-intelligence-browser.mjs
```

ALL_PASS — homepage What changed + follow, Optimus, Production Q3 + YoY, Starship freshness, software honesty + sample waves, autonomy layers, Daily unsent queue, Roadster table, My Tesla bar, mobile shot.

```
node scripts/test-launch-consistency.mjs
node scripts/test-search.mjs
node scripts/test-build-home-lock.mjs
```

ALL_PASS.

Browser verification used Playwright click-through against `http://127.0.0.1:4173`. computerUse subagent could not start (model quota). Screenshots: `/opt/cursor/artifacts/intel-*.png`.

### Not claimed

- Live notifications (preview only; nothing emailed)
- Tesla Fleet / VIN eligibility
- Real-time satellite positions
- Postgres
- Production deploy
- AI-written citations
- NHTSA live ingest (official lookup links only)

### Next batch

See `SUPERCHARGED_MASTER_PLAN.md` → Next implementation batch.

## Batch 5 — Sourced tracker change lists (off merged main)

Branch: `cursor/tracker-sourced-changes-5e96`  
Date: 19 Oct 2026

Four slices, in order:

1. **FSD Europe + Cybercab what-changed.** Changelog already had sources. Slovakia 16 Oct 2026 now carries an honesty line: recognition is not a customer rollout. Tesla Europe “soon” is labelled a company claim. Cybercab `/cybercab.html#cc-changes` lists Texas DMV jumps 126→169→319→349 and labels 15–19 Oct as unchanged. A registration is not a car in service.
2. **See-the-launch kept clocks.** `/see-the-launch.html` and the calendar share `[data-intel-clocks]`. Canonical start stays in `data/events.json`. Current disagreements: CRS-35 docking 15 Oct 14:27Z vs live 13:15Z; USSF-481 16 Oct 00:02:07Z vs live 15 Oct 23:57Z.
3. **Starlink sourced diffs.** `data/starlink-history.json` is two committed McDowell snapshots from `starlink-live.js` git history (13 Oct 11,156 in orbit → 15 Oct 11,154). Not a live operator feed. Days between snapshots are not interpolated. `scripts/build-starlink-stats.py` appends only when McDowell’s published table actually moved.
4. **Software tracker country waves.** `/updates.html#sample-waves` can filter the Teslascope sample by country. First seen + latest ≥10-car jump per version. Sample ≠ rollout ≠ VIN offer.

### Not claimed

- Live operator Starlink counts
- Tesla VIN eligibility
- Interpolated Starlink days
- Cybercab in-service fleet
- Slovakia customer rollout
- Notifications / Postgres / Fleet / NHTSA ingest / faster cron

## Batch 6 — Leftover desks (off merged main after #138)

Branch: `cursor/optimus-archive-5e96`  
Date: 19 Oct 2026

PR #137 squash-merged only batches 1–2. Batches 3–4 never landed. Reimplemented off current main:

1. **Optimus demonstration archive** on `/optimus.html#demos`. Four opened events (AI Day 2021, AI Day 2022, Roadster reveal seat, Paris Motor Show 2026). Shown / not shown / autonomy / remote assistance. We Robot 2024 omitted.
2. **Nav.** Autonomy, Daily, Production, Optimus in Tesla and Explore via `scripts/nav.json` + `sync-nav.py`.
3. **Calendar search + Recently done (21 days).** CRS-35 and USSF-481 findable. Canonical clocks stay in `data/events.json`.
4. **Starship Flight 15 sourced schedule notes.** Outlet + URL. Not live telemetry.
5. **My Tesla country waves** from Teslascope history. Sample ≠ VIN offer.
6. **Production YoY Q1 and Q2 2026** from opened Tesla IR Q1 2025 and Q2 2025 tables. Q4 2025 still has no year-ago table.
7. **Search** ranks Optimus lab, demo cards, Production, Autonomy, Daily, Calendar.

### Not claimed

- We Robot 2024 demo card
- Q4 2025 YoY
- VIN eligibility
- Live notifications / Postgres / Fleet / NHTSA ingest / faster cron
