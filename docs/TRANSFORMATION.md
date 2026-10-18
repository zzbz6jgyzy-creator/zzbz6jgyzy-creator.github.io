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

### Batch 11 — Tracker light wells (this PR)

- Starship chips / moments / compare heads / selects lift to paper. Official player and empty poster stay black.
- Software Update Tracker remaps local `--card` / `--line` / `--mute` and hardcoded `#fff` numbers. Globe well stays `#050608`.
- FSD Europe buttons, flags, bar track, table head and log rail lift. Europe map stays dark.
- Calendar countdown cards, tiles and clock ink lift. Featured photo stays a photo.
- Gear photo tiles stay dark under the images. Page chrome already used tokens.

## Architecture (do not rip out)

| Piece | Path / note |
|---|---|
| Nav source of truth | `scripts/nav.json` + `scripts/sync-nav.py` — **do not edit unless required** |
| Homepage slots | `<!--hv:*-->` in `index.html`, filled by `scripts/build-home.js` and `home-v2.js` |
| Dispatch | `dispatch/*.html`, `data/articles.json` |
| Trackers | Starship, FSD Europe, Cybercab, Software updates, Starlink, Promise |
| Newsletter | Beehiiv via `newsletter.js` — `alexs-newsletter-84b17e.beehiiv.com` |
| X handle | `@ALJR86` / `twitter:site` — do not change |
| Referral | `ts.la/alex474841` — do not invent affiliates |

## Ranked next batches

None queued. Dark remains the default brand. Do not auto-switch on OS light mode.

## Rules that stay in force

Do not rewrite games. Do not invent FSD / Robotaxi / launch facts. Do not embed unofficial videos. Do not deploy without explicit approval. Do not activate ads. Prefer enhancing existing tools.
