# Supercharged Daily — Master Plan

Last updated: 19 Oct 2026. This file is the resume document for later sessions.

## What this site actually is

Static GitHub Pages at `superchargeddaily.com` (CNAME). No app server. No PostgreSQL. State lives in committed JSON/JS, browser `localStorage`, and Cloudflare KV (`sd-events`, `aljr-boards`, undeployed `sd-mail`).

Do not replace that stack with a fashionable backend. A Postgres intelligence warehouse, 10-minute crons, Tesla Fleet API, NHTSA scrapes, and live notification sending all need explicit approval and new secrets.

## Architecture (confirmed in repo)

| Layer | Reality |
|---|---|
| Frontend | Hand-written HTML + CSS + JS. Homepage slots `<!--hv:*-->` filled by `scripts/build-home.js` and hydrated by `home-v2.js`. |
| Routing | Flat URLs. Search index: `data/pages.json` + `data/articles.json`. |
| Data | `data/events.json` is the canonical dated-event overlay. `live-data.json` is livestream state. Tracker files: `*-data.js`, `updates-live.json`, `data/promises.json`, `data/robotaxi-tx.json`, `starlink-live.js`. |
| Merge / rank | `calendar-merge.js` (launches). `news-keep.js` (wire). |
| CI | `.github/workflows/`: news ~30 min, updates ~30 min, Starlink 8h, robotaxi 2× daily, home-build on path push, nav-sync. `node scripts/sd-intel.js` runs on news, updates, and home-build. |
| Workers | `sd-events` live. `sd-mail` coded, **not deployed**. `aljr-boards` live for games. |
| Newsletter | Beehiiv form POST. Per-car mail automation is **draft**. Do not send. |
| Analytics | Cloudflare beacon + `track.js` → `sd-events`. No GA. |
| Personalisation | `localStorage` keys `sd-follow-v1`, `sd-intel-visit-v1`, `sd-alerts-v1`, `sd-my-tesla-v1`. No accounts. |

## Tracker inventory

| Tracker | URL | Mode | Notes |
|---|---|---|---|
| Starship Mission Control | `/starship.html` | Compiled + events overlay | Flight lab compare already exists. Not live telemetry. |
| Launch calendar | `/calendar.html` | Hybrid LL2 + events.json | Dedup in `calendar-merge.js`. |
| Can I see it? | `/see-the-launch.html` | Hybrid + Open-Meteo | Shares merge with calendar. |
| Software updates | `/updates.html` | Teslascope sample | Sample ≠ offer to a VIN. First-seen waves from `data/updates-history.json`. |
| My Tesla | `/my-tesla.html` | localStorage + sample | Mail not live. Official Tesla/NHTSA VIN recall links only. |
| Your Supercharged Daily | `/daily.html` | localStorage follow | Digest **preview only**. sent always 0. |
| FSD Europe / global / TCMV | `/fsd-europe.html`, `/fsd.html`, `/tcmv.html` | Editorial | Manual sources. |
| FSD & Robotaxi evidence | `/autonomy.html` | Reuses compiled files | Layers: supervised vs permit vs commercial. No new claims. |
| Cybercab / robotaxi | `/cybercab.html` | Hybrid TX DMV | Registered ≠ serving. |
| Starlink | `/starlink.html` | McDowell + CelesTrak snapshot | Not a live operator feed. |
| Promise Tracker | `/promise-tracker.html` | `data/promises.json` | Manual, sourced. |
| Roadster hub | `/roadster.html` | Static + sourced table | No invented progress %. |
| Optimus Evolution Lab | `/optimus.html` | Promises-only | No invented specs. |
| Production & deliveries | `/production.html` | Tesla IR Q3 2025–Q3 2026 | Official tables only. YoY only when both quarters opened. |
| Intelligence health | `/intel-health.html` | noindex | Admin view of last bundle. |

## Supercharged Intelligence Engine (implemented)

Internal name. Files:

- `intel-core.js` — validate, collect, change-detect, conflict, freshness, software waves, autonomy layers, digest preview, homepage HTML.
- `scripts/sd-intel.js` — reads existing snapshots, writes `data/intelligence/*`, fills `<!--hv:changed-->`.
- `intel.js` / `intel.css` — follow chips, freshness bars, change lists, Roadster table, local alert queue.
- Tests: `scripts/test-intelligence.mjs`, `scripts/test-intelligence-browser.mjs`.

Pipeline on this stack:

SOURCE FILES → COLLECT FACTS → VALIDATE → DEDUPE (calendar-merge) → CHANGE DETECT vs last snapshot → MERGE HISTORICAL LOGS + SOFTWARE WAVES → WRITE BUNDLE → HOMEPAGE / TRACKER BARS.

Evidence states (not a numeric score): officially confirmed, independently corroborated, company claim, reported unconfirmed, estimated, historical, superseded, disputed.

Conflicts are recorded, not overwritten. Canonical launch clocks stay in `data/events.json`.

## What is implemented

1. Audited the real stack.
2. Engine on JSON, not Postgres.
3. Homepage **What changed** from sourced tracker/Dispatch rows.
4. Follow topics in `sd-follow-v1`.
5. Freshness bars (last checked vs last verified) on major trackers.
6. Optimus lab and Production IR dashboard (Q3 2025–Q3 2026, sourced YoY).
7. Roadster sourced promises table (no progress %).
8. Teslascope software-wave sentences (first seen / sample-count jumps), including per-country sample waves on `/updates.html` (sample ≠ VIN).
9. FSD & Robotaxi evidence board (`/autonomy.html`). FSD Europe changelog honesty: recognition ≠ rollout (Slovakia).
10. Your Supercharged Daily + local digest preview (`/daily.html`). Alert enqueue never sends.
11. CI hooks on news, updates, and home-build workflows.
12. Cybercab sourced Texas registration jumps (registered ≠ serving). Unchanged days labelled.
13. See-the-launch + calendar kept-clock tables (events.json wins).
14. Starlink McDowell snapshot diffs (`data/starlink-history.json`). Not a live operator feed.

## Explicitly not done (blockers / approval)

- PostgreSQL, migrations, user accounts.
- 10–15 minute collection (GitHub cron floor is ~30 min on existing jobs).
- Tesla Fleet API, NHTSA live ingest, FAA scrape.
- Deploy `sd-mail`, publish Beehiiv automation, send alerts.
- AI editorial queue / model-generated citations.
- Ads, paywalls, Worker spend.
- Production deploy.

## Next implementation batch (when continuing)

1. Optional Worker cron for engine health ping — needs approval.
2. Notification digest remains preview-only until Beehiiv automation is published.
3. NHTSA snapshot job only after confirming API terms and adding a polite CI cadence.
4. Do not mark notification delivery live until a safe test send is approved.
