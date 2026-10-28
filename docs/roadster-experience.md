# Roadster experience (the rebuilt Roadster page)

A dark, cinematic scroll page that will replace `/roadster.html`. While it is being built it lives at the hidden preview address
`/roadster-preview.html` (`noindex`, not in the menu, sitemap or search index). The live `roadster.html` is still built by
`scripts/build-roadster-studio.mjs` and is not touched until the owner approves the preview and PR 4 swaps it in.

## Files

- `data/roadster-experience.json`: the new facts, reveal steps, reservation terms, questions, chapters, change log and the sources opened for them. Validated by `roadster-experience-model.js`.
- `data/roadster-studio.json` and `data/roadster-media.json`: the shared editorial record and media provenance (gallery, engineering, configurations, film). The experience reads them; it does not change them.
- `scripts/build-roadster-experience.mjs`: writes only `roadster-preview.html` (title, meta, JSON-LD and `<main>`). The shell (menu, footer, bundles) lives in the page itself.
- `roadster-experience.css` (scoped to `.rx`) and `roadster-experience.js` (own bundle `roadster-x`). The builder rewrites the `?v=` on the stylesheet link from a hash of the CSS file; run `sh scripts/rebuild-js.sh` after changing the JS.
- Tests: `tests/roadster-experience.test.mjs` and `tests/roadster-experience-browser.py`; CI: `.github/workflows/roadster-experience-checks.yml`.

## Chapters (part 3) and the validator

Chapters, in page order: hero and fact strip (`#top`), the pinned reveal (`#video`) and the film, every angle (`#gallery`, the reel and full-screen viewer), inside (`#cockpit`, hotspots), engineering (`#tech`, six systems and the diagram from `scripts/roadster-experience-art.mjs`), the numbers (`#performance`, with the g-force illustration), three trims (`#trims`), the money (`#money`), the wait (`#timeline`), questions (`#faq`) and evidence (`#evidence`). Everything reads without script: the engineering panels are all visible, and script-only controls (collections, arrows, hotspots, system buttons, comparison, units) are hidden until the script runs.
`roadster-experience-model.js` fails the build when: a source id is duplicated or unknown, a source is not https or is checked after the review date; an item has no label or no source; a Reported item cites no reporting or own report; the hero strip does not have exactly four facts; a reveal step names an unknown clip; hotspots and cockpit cards differ in number; numbers, timeline events or promise rows lack ids, labels or a status; the change log is out of order, dated after the review or not an update or correction.
`data/roadster-colors.json` holds one average colour per gallery and reveal picture (made once with Pillow from the 480 px files); it is the placeholder tint shown until a lazy picture arrives.

## Chapter tabs (phones and small tablets)

The page was one ~31,000 px scroll at 390 px. The opening (hero, fact strip, reveal, film and replay: `#top`, `#facts`, `#video`) stays one continuous cinematic scroll at every width. Below it, at 900 px and narrower, a sticky dark-glass tab bar (under the site header, scrolls sideways, amber hairline under the active tab, active tab centred) shows one chapter at a time:

| Tab | Primary id | Also holds |
|---|---|---|
| 01 Pictures | `#gallery` | |
| 02 Inside | `#cockpit` | |
| 03 Engineering | `#tech` | |
| 04 Numbers | `#performance` | own tab: it is the longest chapter, so folding it into Engineering would make a 8,000 px panel |
| 05 Models | `#trims` | `#money` |
| 06 Timeline | `#timeline` | `#promise` |
| 07 Questions | `#faq` | `#evidence` (sources ledger) |

The changes log (`#changes`, with the credit line) and the newsletter band close the page outside the tabs, so a correction is never hidden behind a tab. The changes log used to be the right-hand column of `#evidence`; it is now its own section after the tabs, and the ledger is two columns on desktop.

- **Markup** (`tabsHtml` in the builder): tablist, seven `role="tab"` buttons (roving `tabindex`, `aria-selected`, `aria-controls`), seven `role="tabpanel"` panels, a "Next: <name>" button at the end of each panel and "Back to the top" on the last. No `hidden` attributes: without script, and on wide screens, every panel is visible in order and the tab chrome is `display:none`.
- **Script** (end of `roadster-experience.js`): a `matchMedia('(max-width: 900px)')` listener hides inactive panels only when it matches and restores all of them (and removes the tabpanel roles) when it stops matching, so rotating a tablet works. Left/Right/Home/End move and activate tabs. Scrolling is always `behavior: 'instant'` (the site sets `scroll-behavior: smooth` on `html`, so `auto` would animate).
- **Deep links:** every anchor id inside a panel opens its tab and scrolls below the sticky bars, on load with a hash, on `hashchange`, and for in-page link clicks (hero buttons, rail, "next"). The offset comes from the CSS `scroll-margin-top` on the target (`--rx-offset`), so script and native jumps agree. Choosing a tab writes its primary id with `history.replaceState`; link clicks also use `replaceState`, so Back never walks through tab changes.
- **Media:** inactive panels are `display:none`, so their lazy pictures are not fetched and the existing clip IntersectionObserver sees the loops leave the screen and pauses them. The first two gallery pictures are `loading="eager"` (they belong to the default tab) and are fetched even when a deep link opens another tab.
- **Colour:** tab labels are `--rx-dim` (#bdb8ad) on the dark glass bar, active `#fff`, numerals `--rx-dim`; the bar stays dark in the light theme (like the header), and the worst case (bar over the light reading sections) still has more than 6:1 for the labels.
- **Tests:** `tests/roadster-experience.test.mjs` (markup: tablist, every anchor id in exactly one panel, nothing hidden) and the `tab_checks` block of `tests/roadster-experience-browser.py` (one panel at 390 and 768, click, arrows, Home/End, deep links, Next, rotation to 1440, no-JS, heights).

## Look and feel (the cinematic pass)

The hero is the studio still `world` (night, doors up, rear wing) full bleed with a vignette and film grain (a small inline SVG noise tile, no image request); the flight loop is blended in softly at the bottom only. Scroll drift, the hero fade and the reveal-on-scroll use CSS scroll-driven animations (`animation-timeline`), with small IntersectionObserver fallbacks in the JS. The site header on this page is dark glass in both themes (rules under `.rx-page`, so no other page changes). Hero numbers count up once when motion is on. The stage shows a quiet progress mark (CSS `:has()` on the active layer).

## Video loops

The stage loops are silent, 12 seconds or less, faded in and out, and cut from Tesla's official event video on Tesla's public video CDN (`data/roadster-clips.json` pins the source by SHA-256 and lists every segment and output checksum). The 101 MB source is never committed.
`python3 scripts/make-roadster-clips.py --source /tmp/roadster-clips/event.mp4` rebuilds them (ffmpeg); `--check` verifies the committed files. Each clip is written as WebM (VP9) and MP4 (H.264) at 1280 px and 720 px. A visitor downloads one format at one size, so the budget is per set: 5 MB for a whole set, 1 MB per file. The source is 720p, so there is no 1080p version: we do not upscale.
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
