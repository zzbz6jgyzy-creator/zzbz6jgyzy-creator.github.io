---
name: build-tracker
description: Build or extend a data tracker or "studio" page (SpaceX, Tesla, Starlink, FSD, software, production-style desks) the way this site does it: sourced data file, shared model/view, builder, tests, CI check, docs. Use when asked to add a tracker, add a new data field or page section, or refresh a tracker's data.
---
# Building a tracker in house style

Every tracker here is a **studio**: one dated data file is the source of truth, one builder renders the page, the browser
enhances it, and CI proves the committed page equals a fresh build. Copy the shape of an existing one
(`production` is the cleanest to read: `docs/production-studio.md`).

## Files for a tracker called `<name>`
| Piece | File | Notes |
|---|---|---|
| Data | `data/<name>-studio.json` (+ shared `data/*.json`) | dated, every row has a source URL; unknown stays `null`, never guessed |
| Model | `<name>-studio-model.js` | pure functions shared by the builder and the browser (validation, maths, formatting) |
| View | `<name>-studio-view.js` | HTML/SVG renderers shared by builder and browser |
| Browser | `<name>-studio.js` | enhancement only; the page must read fully with JavaScript off |
| Styles | `<name>-studio.css` | use the theme tokens; light and dark both |
| Builder | `scripts/build-<name>-studio.mjs` | writes the page, search entries into `data/pages.json`, optional CSV; deterministic |
| Bundle | entry in `scripts/js-bundles.json` | then `sh scripts/rebuild-js.sh` |
| Tests | `tests/<name>-studio.test.mjs`, `tests/<name>-studio-browser.py` | maths, sources, determinism; 320/390/768/1440, light/dark, no-JS, blocked storage |
| CI | `.github/workflows/<name>-studio-checks.yml` | copy `spacex-studio-checks.yml`: test, rebuild, `git diff --exit-code`, browser run |
| Docs | `docs/<name>-studio.md` | inputs and update method, semantics, verification |

Also: add the page to `scripts/nav.json` (then `python3 scripts/sync-nav.py`), `scripts/build-seo.py` (`PAGE_TYPES` or
`TRACKER_DATASETS` unless the builder owns its own schema), and `data/pages.json` search records (the builder writes them).

## Honesty rules (these are the product)
- Show **last checked** and **last verified** separately. A refresh that changed nothing says so.
- Label what a number is: sample is not rollout, registered is not in service, recognition is not customer availability,
  company claim is not confirmation. Use the evidence states already in `intel-core.js`.
- Primary sources first (regulator, filing, company IR); secondary trackers are marked as such.
- Missing data renders blank or "not saved", never zero. Failed fetches keep the last good data and show a stale notice.
- Dates: ISO UTC in data; local time only as a display choice with the zone named.

## Live data
Today data refreshes through GitHub Actions that commit JSON to main (news and software about every 30 minutes). Keep new
fetchers polite (cache, one request per run, respect rate limits: Launch Library 2 allows 15 unauthenticated requests per
hour per IP), validate before writing, and fail soft. The planned move to Cloudflare Worker crons writing to R2 is in
`docs/research.md`; don't start it without the owner's approval.

## Done means
Builder deterministic (rebuild, `git diff --exit-code`), `node --test tests/<name>-studio.test.mjs` passes, the browser test passes,
`scripts/audit/run.sh /<page>.html --quick` is clean, screenshots checked at 390/768/1440 in light and dark, docs written,
and the `reviewer` agent said SHIP.
