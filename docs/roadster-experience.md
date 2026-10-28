# Roadster experience (the rebuilt Roadster page)

A dark, cinematic scroll page that will replace `/roadster.html`. While it is being built it lives at the hidden preview address
`/roadster-preview.html` (`noindex`, not in the menu, sitemap or search index). The live `roadster.html` is still built by
`scripts/build-roadster-studio.mjs` and is not touched until the owner approves the preview and PR 4 swaps it in.

## Files

- `data/roadster-experience.json`: the new facts, reveal steps, reservation terms, questions, chapters, change log and the sources opened for them. Validated by `roadster-experience-model.js`.
- `data/roadster-studio.json` and `data/roadster-media.json`: the shared editorial record and media provenance (gallery, engineering, configurations, film). The experience reads them; it does not change them.
- `scripts/build-roadster-experience.mjs`: writes only `roadster-preview.html` (title, meta, JSON-LD and `<main>`). The shell (menu, footer, bundles) lives in the page itself.
- `roadster-experience.css` (scoped to `.rx`) and `roadster-experience.js` (own bundle `roadster-x`). Bump the `?v=` on the stylesheet link in the page when the CSS changes, and run `sh scripts/rebuild-js.sh` after changing the JS.
- Tests: `tests/roadster-experience.test.mjs` and `tests/roadster-experience-browser.py`; CI: `.github/workflows/roadster-experience-checks.yml`.

## Video loops

The stage loops are silent, 12 seconds or less, faded in and out, and cut from Tesla's official event video on Tesla's public video CDN (`data/roadster-clips.json` pins the source by SHA-256 and lists every segment and output checksum). The 101 MB source is never committed.
`python3 scripts/make-roadster-clips.py --source /tmp/roadster-clips/event.mp4` rebuilds them (ffmpeg; Pillow for the posters); `--check` verifies the committed files. Each clip is written as WebM (VP9) and MP4 (H.264) at 1280 px and 720 px. A visitor downloads one format at one size, so the budget is per set: 5 MB for a whole set, 1 MB per file. The source is 720p, so there is no 1080p version: we do not upscale.
Each step's loop plays only while its step is the active one, and the next loop is fetched one step ahead. The footage is credited on the page and linked to the original.

## Labels (keep them honest)

- **Shown at the reveal**: Tesla showed it happen at the event.
- **Tesla's claim**: Tesla said it. Not independently verified.
- **Target**: an aim or a date, never a result (2028 is a target).
- **Reported**: an outlet or our own report said it and we opened the source. A test requires a Reported item to cite reporting or our own report, never a company page alone.
- **Our analysis**: our reading of the facts.

Tesla's own Roadster pages (`tesla.com/roadster`, the reserve page) return 403 to our fetcher and we leave them. Anything we could not open is attributed to the outlet that reported it.

## Motion rules

Muted, inline, `preload="none"`, started only near the viewport, paused off-screen, at most two playing at once. Reduced motion, Save-Data, no script or a failed video show the still instead. A visible **Pause motion** button (WCAG 2.2.2) is remembered in `localStorage` (`sd-rx-motion`). No audio autoplay. Scroll effects use CSS scroll-driven animations where supported, with an IntersectionObserver fallback (Firefox). No animation library.

## Build and verify

```
node scripts/build-roadster-experience.mjs
sh scripts/rebuild-js.sh
node --test tests/roadster-experience.test.mjs
CHROMIUM_PATH=/path/to/chrome python3 tests/roadster-experience-browser.py
node scripts/audit/axe.mjs roadster-preview.html
```

## Refresh checklist

- Re-open the sources before changing a figure; add a `changes` entry for anything a reader should know.
- Reservation terms and prices change: check Tesla's current terms (through the outlets) and the date of each source.
- When Tesla publishes a price, a delivery date or an independent test result, update the facts and the FAQ and say so in the change log.
