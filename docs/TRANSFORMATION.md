# Supercharged Daily transformation

Living progress document for the product rebuild. Resume from here in later Cursor sessions.

**Live site:** https://superchargeddaily.com  
**Stack:** static HTML on GitHub Pages. No app server. Data refresh is GitHub Actions.

## Shipped

### Batch 1 — homepage discovery (merged #107)

- Subscribe (`/#newsletter`) now lands on the newsletter band.
- Explore strip: Starlink identify, My Tesla, Roadster hub, Visual explainers.
- Desktop shows the site pitch again.
- Latest headlines shows all 8 items (was 6 on desktop) and marks off-site links.
- Dead `poll.js` removed from the homepage.
- Tracker data scripts on home are `defer` (same execution order as `home-v2.js`).
- Reduced-motion: no hover lift on cards.

### Batch 2 — My Tesla trust labels (PR #108)

- Feature rows carry a trust line: **From our FSD tracker** / **Desk read** / **Estimate**.
- Year-to-hardware is labelled an estimate until the owner overrides it.
- Relevant updates mix desk notes with attributed Teslascope sample lines.
- Privacy copy: remembered in this browser only, never uploaded.

### Batch 3 — Starship clocks (merged #109)

- Phase times labelled **SpaceX clock**, **Approx**, or **No clock**.
- Explore card and compare heads show SpaceX source links.
- Explicit “not live telemetry” line. No unofficial video.

### Batch 4 — On-site news framing (merged #110)

- Latest headlines stay off-site Google News links.
- Each row gets an “On this site” jump to a matching Dispatch piece, tracker, or topic hub.
- Weak matches fall back to Tesla / SpaceX / Grok desks — no invented coverage.

### Batch 5 — SEO cluster (merged #111)

- Roadster reveal was in `articles.json` but missing `</head>`, so `build-seo.py` never injected JSON-LD. Script now repairs that.
- Every Dispatch article gets NewsArticle + BreadcrumbList JSON-LD, a visible Home → Dispatch → story crumb, and a desk block (Supercharged Daily / Alex R / @ALJR86 / About). No invented Person credentials.
- `about.html` gets Organization JSON-LD from the same facts.

### Batch 6 — Performance (merged #112)

- Wallpaper lightbox opens a 1280w / 720w WebP preview, not the 4K / phone master. Download links stay full-res. Remaining JPG grid thumbs converted to WebP.
- Homepage drops unused `home.css` (old hx-hero) and folds `home-focus.css` into `home-v2.css`.
- Homepage fonts: drop Inter 800 (use 700), load Michroma subsetted to “Supercharged Daily”.
- “More from Dispatch” uses existing 480w WebP posters.

### Batch 7 — Search (merged #113)

- Overlay (`⌘K` / nav Search) plus `/search.html`. Index is `data/articles.json` + `data/pages.json`.
- Injected by `nav-pill.js` — do not edit `nav.json`.

### Batch 8 — Buying-guide cash sheet (merged #114)

- Sourced Tesla list prices, dest/order fees, charger SKUs, FSD $99/mo. Tax / rebate / install / FSD months are the reader’s.

### Batch 9 — Search everywhere (merged #115)

- Cache-bump `nav-pill.js` / `nav-pill.css` to `202610182231` on every leftover page so Search injects sitewide.
- No `nav.json` / `sync-nav.py`. Redirect stubs (`videos.html`, `goldcab.html`, `grok-bot.html`) still have no pill.

### Batch 10 — Light theme (merged #116 / #117)

- Dark stays the default. An explicit Light / Dark control in the pill persists in `localStorage` (`sd-theme`).
- Tokens remapped on `html[data-theme=light]`; homepage, nav, search, Dispatch, newsletter, forms and hubs lift to warm paper.
- Photo heroes, maps, globes, explainer boards, 3D explorers and game stages stay dark. Games were not rewritten.
- No `prefers-color-scheme` auto-switch. No `nav.json` / `sync-nav.py`.

### Batch 11 — Tracker light wells (merged #118)

- Starship chips / moments / compare heads / selects lift to paper. Official player and empty poster stay black.
- Software Update Tracker remaps local `--card` / `--line` / `--mute` and hardcoded `#fff` numbers. Globe well stays `#050608`.
- FSD Europe buttons, flags, bar track, table head and log rail lift. Europe map stays dark.
- Calendar countdown cards, tiles and clock ink lift. Featured photo stays a photo.
- Gear photo tiles stay dark under the images. Page chrome already used tokens.

### Batch 12 — Site optimisation + tools (merged #119 / #120)

- Nav Home / Tesla / SpaceX / Roadster / Explore / News. News keep, Dispatch browse, search filters, leftover light wells, tool fail/loading copy, topic newsletter bands, no mobile pop.

### Batch 13 — Events + lab CWV (merged #121)

- Production Lighthouse recorded (mobile lab, 19 Oct 2026). Calendar CLS reserved; homepage Falcon 9 live thumb uses existing AVIF/WebP.
- `sd-events` gains search / theme / Dispatch / TESMAG counts. Worker allowlist updated in-repo; live Worker not deployed from this PR.
- Commercial brief only. No ads.

### Batch 14 — Dispatch CLS (merged #122)

- Re-measured production after #121: calendar CLS 0, home LCP is the picture thumb. Dispatch still 0.104.
- Archive no longer paints every card before pagination. Hero/cards drop `.reveal`. First poster eager. News hero + explorer skip links.

### Batch 15 — Live events Worker (merged #123)

- `sd-events` Worker deployed 19 Oct 2026. New event names return 204.
- Production Dispatch after #122: CLS 0, LCP 2.2 s.
- Ads and per-car notification delivery not activated (no sponsor creative; no mail/push hook).

### Batch 16 — Leftover polish (merged #124)

- Tesla / SpaceX story-grid posters lock to 160px (CSS `!important` beats leftover `height:auto`).
- Promise Tracker empty chips / tiles / legend reserve height before JSON lands.
- Tesla clubs city lookup and blocked geolocation write `#tc-hint` and hold it.

### Batch 17 — Newsletter tags (merged #125)

- Site signup sends allowlisted `utm_content` (`roadster`, `tesla`, `tesla-software`, `spacex`, `website`).
- Topic is inferred from the page path first, then `.art-tag` — not from story-card `.tag` chips.
- Beehiiv subscriber tags created. Three live UTM segments. Tag-apply automations are draft until published in the editor.
- Sunday send is still one list. No per-car mail. No ads.

### Batch 18 — Watch counts (this session)

- Unlisted `/counts.html` paints live `sd-events` `/stats?days=30`. Eight allowlisted actions only.
- About links to it. `noindex`. Not in nav. Zeros stay zeros. Fail copy when the Worker is blocked.
- Not unique visitors. No invented traffic. No ads.

## Architecture (do not rip out)

| Piece | Path / note |
|---|---|
| Nav source of truth | `scripts/nav.json` + `scripts/sync-nav.py` — **do not edit unless required** |
| Homepage slots | `<!--hv:*-->` in `index.html`, filled by `scripts/build-home.js` and `home-v2.js` |
| Dispatch | `dispatch/*.html`, `data/articles.json` |
| Trackers | Starship, FSD Europe, Cybercab, Software updates, Starlink, Promise |
| Newsletter | Beehiiv via `newsletter.js` — `alexs-newsletter-84b17e.beehiiv.com`. Topic via `utm_content` + subscriber tags |
| X handle | `@ALJR86` / `twitter:site` — do not change |
| Referral | `ts.la/alex474841` — do not invent affiliates |

## Ranked next batches

None queued. Dark remains the default brand. Do not auto-switch on OS light mode.

## Rules that stay in force

Do not rewrite games. Do not invent FSD / Robotaxi / launch facts. Do not embed unofficial videos. Do not deploy without explicit approval. Do not activate ads. Prefer enhancing existing tools.
