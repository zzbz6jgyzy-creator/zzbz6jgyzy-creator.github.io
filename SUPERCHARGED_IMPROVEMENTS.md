# Supercharged Daily — review fixes (batch 19)

Living progress document for the 15-phase review. Dark remains the default. Existing routes kept. No production deploy.

## Baseline audit (19 Oct 2026)

Confirmed on `origin/main` at `8fd18f2`:

1. **Duplicate Bandwagon-5** — real. `calendar.js` `launchKey()` did not strip `rideshare`, so curated `Falcon 9 · Bandwagon-5` and LL2 / `events.json` `Falcon 9 · Bandwagon-5 rideshare` both rendered at 19 Oct 2026 10:30. Root cause: weak title key + dual sources (CURATED, `data/events.json`, Launch Library 2), not duplicate DB rows.
2. **Nav** — already Home / Tesla / SpaceX / Roadster / Explore / News from `scripts/nav.json`. No second nav system. Left `nav.json` untouched.
3. **Homepage hero** — editorial lead existed (Roadster) but the next-livestream card sat above it, so scheduled events visually led. `data-major-slot` was unused. Homepage `live.js` also hid timed Falcon flights whenever a major non-Starship event existed, so today’s Bandwagon lost to Tuesday’s earnings call.
4. **Homepage news** — keep/rank existed but still promoted BASENOR, TradingView, Simply Wall Street and clickbait Roadster copy into the top eight.
5. **Dispatch** — chips, search, pagination and reading time already shipped. Missing newest/oldest sort and a featured state.
6. **Search / My Tesla / newsletter** — search and notify foundation already existed. Homepage band had lost `data-band-topic="website"` after `build-home`. Notify copy already said delivery is not live.

## Changes implemented

### 1. Calendar dedup
- New `calendar-merge.js`: stable IDs, `launchKey` (strips Falcon / rideshare / mission / launch / demo), `sameLaunch` fallback (start ±3h + pad + tokens).
- Guards: Starlink group numbers, Starship flight numbers, CRS numbers, Bandwagon numbers, USSF numbers, docking vs launch.
- Reschedules: if LL2 moves the window by more than 3 hours, or reports hold/TBD/in-flight, the live status/time wins.
- `events.json` now overlays **title** as well as start/href/note.
- Same merge used by see-the-launch and homepage countdown rows.

### 2. Navigation
- Verified identical primary nav on Home, Dispatch, Search, Tesla, SpaceX, Roadster, trackers. No `nav.json` edit.

### 3. Homepage news ranking
- `news-keep.js` + `scripts/news_keep.py`: source classification, kind weights, recency decay (old wires cannot look breaking), accessory/finance downranks, clickbait penalty, editorial override hooks (`RANK.boostTitleKeys` / `downTitleKeys`).
- Small publishers are not excluded. Headlines and timestamps are not rewritten.
- Homepage feed refreshed with `scripts/refresh-home-feed.js` only (not full `build-home.js`).

### 4. Homepage hero
- Editorial lead stays first. Next-event / livestream module moved below it.
- `live.js` keeps timed Falcon/Dragon launches on the home next-event slot; NET Starship planning stays off that card.
- Restored `data-band-topic="website"` on the homepage band.

### 5. Dispatch
- Newest / oldest sort (URL `sort=oldest`) works with topic + search + pagination.
- Featured label on the newest unfiltered card.
- Meta line: date · reading time · Supercharged Daily.

### 6. Search
- Query boosts for Tesla software → Software Update Tracker and Optimus → promise / Tesla / dream-scenario.
- Richer `data/pages.json` summaries. Loading empty state while the index is in flight.

### 7. My Tesla
- New “What’s new for your Tesla?” dashboard: vehicle-specific software/FSD rows, honest “no recall on file”, general Dispatch news labelled as not car-specific.
- Notify checkboxes remain preferences only. No success-as-live copy.

### 8–14. Data, mobile, SEO, newsletter, analytics
- Launch identity shared across calendar tools.
- Mobile overflow checked at 390px in the review-fixes browser test.
- Newsletter topic restored so Beehiiv `utm_content=website` still works.
- No new paid services, ads, Worker deploy, or Beehiiv automation publish.

## Files modified

- `calendar-merge.js` (new), `calendar.js`, `see-the-launch.js`, `see-the-launch.html`, `calendar.html`, `spacex.html`, `tsla.html`
- `news-keep.js`, `scripts/news_keep.py`, `index.html`, `home-v2.js`, `home-v2.css`, `live.js`, `news.html`
- `dispatch-browse.js`, `dispatch-browse.css`, `dispatch.html`
- `search.js`, `search.html`, `data/pages.json`, `nav-pill.js`
- `my-tesla.html`, `my-tesla.js`, `my-tesla.css`
- `scripts/test-calendar-dedup.mjs`, `scripts/test-news-keep.mjs`, `scripts/test-review-fixes.mjs`
- `SUPERCHARGED_IMPROVEMENTS.md`, `docs/TRANSFORMATION.md`

## Merge with `origin/main` (19 Oct 2026)

Fetched `origin/main` at `b41282c`. Three snapshot commits after our branch point (`8fd18f2`): headlines, software updates, TeslaFi extras.

One conflict, **simple**: generated `<!--hv:feed-->` in `index.html`. Main’s snapshot used the old ranker (BASENOR / TradingView / Simply Wall Street). Ours had the new ranker on an older snapshot. Resolution: keep main’s `news-data.json` (updated `2026-10-19T07:52:07Z`) and re-run `scripts/refresh-home-feed.js`. Hero order and `data-band-topic="website"` were already merged cleanly.

No complicated conflicts.

## Tests executed

- `node scripts/test-calendar-dedup.mjs` — ALL_PASS (Bandwagon once, Starlink 15-25 ≠ 15-26, CRS launch ≠ docking, reschedule/hold, missing IDs)
- `node scripts/test-news-keep.mjs` — ALL_PASS (launch/software/regulatory/finance classes, small publisher kept, stale Teslarati not breaking)
- `node scripts/refresh-home-feed.js` — feed rewritten. TradingView / Simply Wall Street / BASENOR dropped from the top eight.
- `node scripts/test-review-fixes.mjs` @ `http://127.0.0.1:4173` — ALL_PASS (nav, lead before event, band topic, Bandwagon once with mocked LL2, Dispatch sort, search queries, My Tesla what’s new, 390px no overflow)
- `node scripts/test-site-optimisation.mjs` — ALL_PASS
- `node scripts/test-newsletter-tags.mjs` — ALL_PASS
- `node scripts/test-leftover-polish.mjs` — ALL_PASS
- Syntax: `node --check` on edited JS; `python3 -m py_compile scripts/news_keep.py`

### Measured performance (local only)

Lighthouse 12.6.1 desktop against `http://127.0.0.1:4173/` after the changes:

- Performance score 0.99
- LCP 0.8 s
- CLS 0.005
- TBT 0 ms
- INP not emitted by this run

These are **local** numbers on a quiet VM, not production Core Web Vitals. Do not treat them as field CWV.

## Outstanding / incomplete

- Full production Lighthouse / CWV not claimed until measured on this branch.
- Optimus Dispatch chip still omitted — no Optimus-only archive cards.
- My Tesla notifications: preferences only. Need a mail/push hook before activation.
- Beehiiv `Tag ·` automations stay draft until published at app.beehiiv.com.
- Do not run full `build-home.js` (strips tesla.html / spacex.html `<picture>`).
- No ads. Follow on X / `twitter:site` unchanged.

## Next recommended batch

- Measure production CWV after merge.
- Publish Beehiiv tag automations if segmented signup mail is wanted.
- Design a real per-car mail hook before claiming alerts.
