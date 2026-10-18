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

### Batch 3 — Starship clocks (this PR)

- Phase times labelled **SpaceX clock**, **Approx**, or **No clock**.
- Explore card and compare heads show SpaceX source links.
- Explicit “not live telemetry” line. No unofficial video.

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

1. **On-site news framing** — keep Google News links but pair each topic with a Dispatch or tracker jump.
2. **SEO cluster** — run `build-seo.py` gaps (Roadster reveal JSON-LD), breadcrumbs on Dispatch, about/author block.
3. **Performance** — wallpaper thumbs, home CSS merge (`home.css` vs `home-v2.css`), font subset.
4. **Search** — client-side index over `data/articles.json` + nav pages (no paid API).
5. **Buying advisor / cost calculator** — only with editable assumptions and sourced defaults.
6. **Light theme** — last; dark is the brand. Do not bolt on a half theme.

## Rules that stay in force

Do not rewrite games. Do not invent FSD / Robotaxi / launch facts. Do not embed unofficial videos. Do not deploy without explicit approval. Do not activate ads. Prefer enhancing existing tools.
