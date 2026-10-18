# Supercharged Daily — site optimisation

Living progress document for the full-site optimisation mission. Dark remains the default. No production deploy. No paid APIs or ads. Existing routes kept.

## Initial audit (2026-10-18)

### Architecture

Static GitHub Pages site. Pill nav is generated from `scripts/nav.json` by `scripts/sync-nav.py`. Homepage dual-renders `<!--hv:*-->` blocks via `scripts/build-home.js` + `home-v2.js`. Wire headlines live in `news-data.json` (CI snapshot every 30 minutes). Dispatch cards are static HTML; `data/articles.json` is additive. Search indexes `data/articles.json` + `data/pages.json`. Newsletter is Beehiiv via `newsletter.js` / `grow.js`. Analytics: Cloudflare Web Analytics beacon `1927a50f248444ec9bdcf9f5607e7d7b` (pageviews only). Theme is an explicit toggle (`html[data-theme=light]`), not `prefers-color-scheme`.

### Feature inventory (working)

- Homepage: live slot, mast, lead Dispatch, trackers, explore, wire feed with on-site pairing, newsletter, more Dispatch, countdowns.
- News (`/news.html`): snapshot-only wire + Dispatch article list with topic chips.
- Dispatch archive and individual `/dispatch/*.html` stories with related links.
- Site search overlay (⌘K) and `/search.html`.
- My Tesla: model / year / hardware / software / country, localStorage + query params, no country guess.
- Roadster hub, Tesla / SpaceX desks, Starship flight lab, Starlink tracker, FSD Europe, Software Update Tracker, Cybercab tracker, Promise tracker, calendar, see-the-launch, explainers, clubs, explorers, markets, reviews, Grok, Gear, Games, wallpapers.
- Follow on X → `https://x.com/ALJR86`. Subscribe → `/#newsletter`.

### Confirmed problems

1. **Nav** — six mixed dropdowns (News, Tesla, Roadster, SpaceX, Trackers, More). No desktop Home. Trackers duplicated Starship / Starlink. Sheet always prepended Home.
2. **Homepage** — explore row hid Calendar and Starship. Prerendered feed could lead with Motley Fool “$5,000 Invested…” speculation.
3. **News** — per-topic title_key only; same story could appear twice across topics. Electrek dropped in Python but not in a shared keep layer. No finance-speculation filter. No hold list.
4. **Dispatch** — one long grid. Site-wide search only. No topic chips, local filter, incremental load, or reading time.
5. **Search** — no synonyms, no recency boost, no kind filters, no wire index on the full page.
6. **My Tesla** — no opt-in alert preferences. No delivery system (correctly not claimed).
7. **Analytics** — Cloudflare pageviews only; no event taxonomy in-product.
8. **Commercial** — affiliate disclosure exists; no ad slots (do not activate without approval).

## Prioritised tasks

1. Navigation restructure (Home / Tesla / SpaceX / Roadster / Explore / News)
2. News keep / dedupe / relevance
3. Dispatch browse
4. Search ranking + filters
5. Homepage explore + feed quality
6. My Tesla opt-in prefs
7. Tests + this document
8. Later sessions: leftover light wells (`.mj`, `.gear-band`, Dispatch `.sd-box`), Core Web Vitals lab numbers, commercial briefs, event analytics wiring

## Completed this session

- Restructured nav to Home, Tesla, SpaceX, Roadster, Explore, News. Explore is a two-column desktop panel of high-value tools. Sheet no longer doubles Home. Dropdown parents get `aria-current` when a child matches. Focus rings added.
- Shared `news-keep.js` + `scripts/news_keep.py`: drop Electrek, drop finance-speculation titles, global `title_key`, near-dupe clustering, source trust boost/demote, speculation flag, human hold list (`data/news-hold.json`). Score is **not** a fact check.
- Re-filtered `news-data.json` without refetch. Refreshed only the homepage `<!--hv:feed-->` block (did not run full `build-home.js`).
- Dispatch: topic chips (only categories with cards), local search, incremental load, publication date + reading time from `articles.json`.
- Search: aliases, recency boost, Stories / Pages / Headlines filters, optional wire index on `/search.html` only, better empty state.
- Homepage explore adds Starship Mission Control and Launch calendar (3×2).
- My Tesla: on-device alert checkboxes. Copy states delivery is not live.

## Files modified

- `scripts/nav.json`, `scripts/sync-nav.py` (and every HTML nav block it rewrites)
- `nav-pill.js`, `nav-pill.css`
- `scripts/news_keep.py`, `news-keep.js`, `data/news-hold.json`, `scripts/snapshot-news.py`, `scripts/build-home.js`, `home-v2.js`, `news.js`, `news-data.json`
- `scripts/refresh-home-feed.js`, `index.html` (explore + feed + script pins)
- `dispatch.html`, `dispatch-browse.js`, `dispatch-browse.css`, `scripts/add-reading-minutes.py`, `data/articles.json` (`minutes` only)
- `search.js`, `search.html`, `search.css`
- `my-tesla.html`, `my-tesla.js`, `my-tesla.css`
- `home-v2.css`, `theme.css`, `styles.css`
- `scripts/test_news_keep.py`, `scripts/test-site-optimisation.mjs`
- `SUPERCHARGED_IMPROVEMENTS.md`

## Tests performed

All executed in this session:

- `python3 scripts/test_news_keep.py` → `news_keep ALL_PASS` (finance titles dropped, Electrek dropped, exact-title collapse, speculation flag).
- `python3 scripts/sync-nav.py --check` → `out of sync: 0`.
- `node scripts/test-site-optimisation.mjs` against `http://127.0.0.1:4173` → `ALL_PASS`:
  - Desktop labels Home / Tesla / SpaceX / Roadster / Explore / News; no Trackers / More.
  - Sheet has a single Home link (desktop source + 390px sheet).
  - Homepage feed no longer includes “$5,000 Invested…”.
  - Explore cards include Starship and Calendar.
  - Dispatch chips omit Optimus; Roadster filter only shows Roadster-related cards; local Starship search returns cards.
  - Search queries: Roadster, FSD Europe, Starship, Tesla software, Starlink, Optimus all returned matches. Empty query shows grouped latest stories + pages.
  - My Tesla alerts copy states delivery is not live.
- Re-filtered snapshot: `news-data.json` 49 → 46 items (finance / duplicate title_key removed).
- Reading time: `minutes` added to 48 existing `articles.json` rows; dates/topics/titles untouched.

## Measured performance

No new Lighthouse / CWV lab run this session. Do not invent numbers. Previous merged perf work (#112) still applies.

## Known limitations

- Notifications are preferences only. Nothing is sent.
- Wire relevance is deterministic string/source scoring, not factual accuracy.
- Homepage feed prerender is updated by `scripts/refresh-home-feed.js`; do not run full `build-home.js` unless tesla.html / spacex.html `<picture>` diffs are reverted.
- Cloudflare analytics remains pageview-only; `data-sd-track="search"` is a hook, not a live dashboard.
- Leftover light-theme wells (`.mj`, review `.gear-band`, Dispatch inline `.sd-box`) are unchanged.
- Official SpaceX YouTube only; Follow on X and `twitter:site` unchanged.

## Remaining work

- Broader tool QA (Starlink globe, Flight Lab, games chrome only).
- Lab CWV measurements on a production-like host.
- Article-end newsletter already exists via `grow.js`; topic-specific Beehiiv tags need approval.
- Commercial: labelled sponsorship slots only after approval.
- Event-level analytics if a privacy-respecting store is connected.

## Recommended next steps

1. Merge this nav + news + Dispatch + search batch.
2. Run a mobile pass on Starship / Starlink / My Tesla with the new Explore menu.
3. Fill `data/news-hold.json` when a wire story needs a human hold.
4. Only then consider ads or a notification delivery worker.
