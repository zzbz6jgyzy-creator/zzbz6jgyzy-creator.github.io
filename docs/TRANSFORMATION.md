# Supercharged Daily transformation

Living progress document for the product rebuild. Resume from here in later Cursor sessions.

**Live site:** https://superchargeddaily.com  
**Stack:** static HTML on GitHub Pages. No app server. Data refresh is GitHub Actions.

## Shipped

### Batch 1 — homepage discovery (PR #107)

- Subscribe (`/#newsletter`) lands on the newsletter band.
- Explore strip: Starlink identify, My Tesla, Roadster hub, Visual explainers.
- Desktop pitch restored; 8 headlines; off-site ↗ marks; `poll.js` removed; tracker scripts deferred.

### Batch 2 — My Tesla trust labels (this PR)

- Feature rows now carry a trust line: **From our FSD tracker** / **Desk read** / **Estimate**.
- “Fits this car” is gone — FSD live stays tracker-verified; other yes-rows say listed/this body.
- Year→hardware is labelled an estimate until the owner overrides it.
- Relevant updates mix desk notes with matching Teslascope sample lines (attributed, not official).
- Privacy copy: remembered in this browser only, never uploaded.

## Ranked next batches

1. **Starship Flight Lab** — tighten timeline, sources, compare; no fake telemetry.
2. **On-site news framing** — keep Google News links but pair each topic with a Dispatch or tracker jump.
3. **SEO cluster** — `build-seo.py` gaps (Roadster reveal JSON-LD), breadcrumbs on Dispatch, about/author block.
4. **Performance** — wallpaper thumbs, home CSS merge (`home.css` vs `home-v2.css`), font subset.
5. **Search** — client-side index over `data/articles.json` + nav pages (no paid API).
6. **Buying advisor / cost calculator** — only with editable assumptions and sourced defaults.
7. **Light theme** — last; dark is the brand.

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

## Rules that stay in force

Do not rewrite games. Do not invent FSD / Robotaxi / launch facts. Do not embed unofficial videos. Do not deploy without explicit approval. Do not activate ads. Prefer enhancing existing tools.
