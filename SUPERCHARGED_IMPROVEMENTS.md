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

## Prioritised tasks

1. Navigation restructure — done (#119)
2. News keep / dedupe / relevance — done (#119)
3. Dispatch browse — done (#119)
4. Search ranking + filters — done (#119)
5. Homepage explore + feed quality — done (#119)
6. My Tesla opt-in prefs — done (#119)
7. Leftover light wells + interactive tools + newsletter/mobile — this session
8. Later: Core Web Vitals lab numbers, commercial briefs (no activation), event analytics wiring

## Completed earlier (#119)

- Nav: Home / Tesla / SpaceX / Roadster / Explore / News.
- Shared `news-keep.js` + `scripts/news_keep.py`, Dispatch chips/search/reading time, search aliases/filters, homepage 3×2 explore, My Tesla on-device notify prefs (not delivered).

## Completed this session

- Light theme leftover wells now use paper surfaces: `.mj` / `.mj-b`, review `.gear-band` (and category tiles), older Dispatch `.sd-box` / `.sd-table` / `.sd-nl`, plus newer table `thead` wells. LIVE / Watch-live / maps / explainer boards stay dark.
- Calendar: `Checking Launch Library 2…` status before the fetch, `role="status"`, filter chips `min-height: 40px`. Existing curated fallback and Launch Library 2 attribution unchanged.
- Promise tracker: `#pt-list` starts with `Loading promises…`. Existing load-fail copy kept.
- Starship Flight Lab: visible fail copy in `#slab-detail` if `STARSHIP_LAB` / `STARSHIP` is missing. Desk-read disclaimer already on the page.
- Newsletter band copy follows the page (Roadster / Tesla software / SpaceX / Tesla desk / default). Scroll popup is skipped on every mobile viewport — not just the first view. No new popups. Homepage prerendered band stays the default week copy.
- Affiliate codes, Follow on X, `twitter:site`, and `nav.json` untouched.

## Files modified

- `theme.css` — leftover well lifts
- `styles.css` — calendar filter touch target
- `grow.js`, `scripts/build-articles.py` — topic band + no mobile pop; cache pin
- `calendar.js`, `calendar.html` — checking status
- `starship-lab.js` — fail copy
- `promise-tracker.html` — loading row
- HTML cache pins: `theme.css`, `styles.css`, `grow.js`, `calendar.js`, `starship-lab.js`, `promise-tracker.js` → `202610190500`
- `scripts/test-tools-polish.mjs`
- `SUPERCHARGED_IMPROVEMENTS.md`

## Tests performed

All executed in this session:

- `node scripts/test-tools-polish.mjs` against `http://127.0.0.1:4173` → `ALL_PASS`:
  - Light theme via `localStorage sd-theme=light`
  - `.gear-band` and `.sd-box` not near-black; table `th` lifted
  - Injected `.mj` uses paper
  - TESMAG `J72E6FRRQ7QK` and Tesla `ts.la/alex474841` unchanged
  - Calendar status + 40px filters
  - Starship disclaimer + populated lab + fail-copy present in JS
  - Promise cards replace the loading row
  - Starlink CelesTrak stamp
  - Newsletter topics on Roadster / My Tesla / SpaceX
  - No `.sd-pop` on a 390px Tesla page after a mid-scroll
  - Follow on X still `https://x.com/ALJR86`

## Measured performance

No new Lighthouse / CWV lab run this session. Do not invent numbers. Previous merged perf work (#112) still applies.

## Known limitations

- Notifications are preferences only. Nothing is sent.
- Wire relevance is deterministic string/source scoring, not factual accuracy.
- Homepage feed prerender is updated by `scripts/refresh-home-feed.js`; do not run full `build-home.js` unless tesla.html / spacex.html `<picture>` diffs are reverted.
- Cloudflare analytics remains pageview-only.
- Official SpaceX YouTube only; Follow on X and `twitter:site` unchanged.
- Newsletter topic copy is path/tag framing, not Beehiiv list tags. Topic-specific Beehiiv tags still need approval.
- Scroll popup still exists on desktop after 50% scroll (one-time). Mobile never gets it.

## Remaining work

- Lab CWV measurements on a production-like host.
- Commercial: labelled sponsorship slots only after approval.
- Event-level analytics if a privacy-respecting store is connected.
- Broader tool QA on globes / games chrome only if something regresses.

## Recommended next steps

1. Merge this tools + leftover-wells batch.
2. Only then consider a CWV lab run or ads / a notification delivery worker.
