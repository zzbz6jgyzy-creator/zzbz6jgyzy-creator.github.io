# Event pages (single-topic hubs)

Built by `scripts/build-event-pages.mjs` from one JSON file per page in `data/event-pages/`. Examples: `/starship-flight-15.html` from `data/event-pages/starship-flight-15.json`, and `/ship-42.html` from `data/event-pages/ship-42.json` (same Flight 15 window via `eventId`).

## If Flight 15 slips: change the launch time in ONE place
Edit `start` and `end` for `starship-flight-15` in `data/events.json` (keep the offset, e.g. `2026-11-14T16:45:00-06:00`). Then run, or let CI run on push to main:

```
node scripts/build-event-pages.mjs && node scripts/build-home.js
```

The hub countdown, the homepage feature strip and the Event structured data all read that value. Other trackers keep their own copies (`live-data.json` for the live banner, `starship-data.js` for the Starship tracker, `calendar.js`, `see-the-launch-data.js`); update those as you already do for a date change.

## Add a line to the Updates log
Add an object to `updates` in the page's JSON, newest anywhere (the builder sorts by date):

```json
{"date": "2026-11-12", "kind": "Disclosed", "text": "FAA issues the Flight 15 licence.", "source": "https://..."}
```

`kind` is one of `Disclosed` (from the company), `Reported` (from outlets), `Target` (a plan, not a result) or `Correction` (we changed something already on the page, and say what). The first three are the labels the trackers use.

On launch day add a `time` (ISO, UTC) so entries sort to the minute and show "13 Nov 2026, 22:47 UTC":

```json
{"date": "2026-11-13", "time": "2026-11-13T22:47:00Z", "kind": "Disclosed", "text": "Lift-off at 4:47 p.m. CT, per SpaceX's webcast.", "source": "https://x.com/SpaceX/status/..."}
```

Readers who already have the page open see the new entry within about two minutes, without reloading (`event-live.js` re-reads this JSON every two minutes while the page is visible, from a week before the start until three days after). If the start time in `data/events.json` changes, their countdown follows it and they get a note to reload. You can edit the JSON from GitHub's web editor on your phone; the saved page catches up when CI rebuilds it.

## Add to calendar
Each event page gets `/<slug>.ics` (built next to the page, with a 30-minute reminder) and a Google Calendar link, both from the times in `data/events.json`. When the time moves, the rebuilt .ics keeps the same UID with a higher SEQUENCE, so calendar apps that re-import it update the entry rather than adding a second one.

## Make a new event page (e.g. "FSD v14 release notes")
1. Add the event (title, `start`, `end`) to `data/events.json` if it has a time.
2. Copy `data/event-pages/starship-flight-15.json` to `data/event-pages/<slug>.json` and edit `slug`, `eventId`, `section`, `sectionUrl`, `kicker`, `title`, `seoTitle`, `description`, `summary`, `links`, `watch`, `updates`, `related`. `heatShield` is optional (any page can drop it). For a ship-focused companion like Ship 42, use `sections` (id, title, lead, sourced points) instead of `heatShield`, and set `crumb`, `eventName` and `calTitle` so the breadcrumb and calendar entry are not the shared event's generic name. Two pages may share one `eventId` so the countdown stays in one place. A section may also carry `embed` (`kind: "x"` plus url, handle, name, text, dateLabel) for a click-to-load X post, `embed` (`kind: "video"` plus src, src720, poster, width, height, ariaLabel, credit, licenceUrl, musicUrl) for a self-hosted MP4 with a verbatim credit, or `call` (`kind: "obvious-later"` plus slug, question, closes) for the official no-crowd-numbers card from obviouslater.com/en/embed. Optional `jumpTitle` shortens the jump-nav label; `placement: "before-mission"` puts the section after the jump nav and before “The mission”. `body` is an array of paragraphs (plain strings, or `{text, linkText, href}` to wrap one phrase).
3. Add a 1200x630 card: add a line to `CARDS` in `scripts/generate-og.py` and run it, then point `ogImage` at `/assets/og/<slug>.jpg`.
4. Add the page to `pages` in `scripts/js-bundles.json` with `{"bundles": ["core", "event"], "grow": ["data-band"]}` and run `sh scripts/rebuild-js.sh`.
5. Run `node scripts/build-event-pages.mjs`. The first run copies the site shell (nav, footer) from `editorial.html`; later runs only replace the `<!--ev:head-->` block and `<main>`.

## Homepage feature
A page with `featureUntil` in the future is featured as a strip at the top of the homepage (`<!--hv:feature-->`, built by `scripts/build-home.js`). It drops off by itself after that time, on the next home build. Flight 15 is featured until 16 Nov 2026 12:00 UTC.

## Countdown states
`event-countdown.js` (bundles `event` and `home`): before the window it ticks `d hh:mm:ss`; during the window it says "Launch window open"; after the window closes it says "Launched" and points to the Updates log. The saved HTML always shows the absolute time, so it is right with JavaScript off. If a launch scrubs, add an update line and move the time in `data/events.json`; the page goes back to counting down.

## Checks
`node --test tests/event-pages.test.mjs` (rebuilding every event page changes nothing, the start time comes from events.json, Event + BreadcrumbList schema, standard head tags, countdown states).

## Optional rich fields (added 11 Nov 2026)
- `hero`: a credited photo beside the title (`base`, `widths`, `width`, `height`, `alt`, `caption`, `credit`, `creditUrl`, `licence`, `licenceUrl`, optional `note`). The build fails without a credit and licence.
- `quote`: a pull quote under the mission text (`text`, `by`, `source`).
- `glance`: the at-a-glance strip (`label`, `value`, `kind`).
- In a section: `timeline` (`t`, `title`, `text`, `source`), `diagram` (`file` under `assets/explainers/`, `steps`, a `caption` that says it is an illustration), and points with `title` and `kind`, which render as cards.
- `embed.kind: "video"`: self-hosted 1080p (`src`) and 720p (`src720`) MP4s, JPG `poster`, `width`/`height`, `ariaLabel`, verbatim `credit`. The builder links only the substrings `CC BY 4.0` (`licenceUrl`) and `scottbuckley.com.au` (`musicUrl`). No autoplay. There is no raw-HTML escape hatch.
- `body`: paragraphs after the heading (and after a video figure). A string is one paragraph; `{text, linkText, href}` wraps `linkText` inside `text`.
- `jumpTitle`: short jump-nav label; falls back to `title`.
- `placement: "before-mission"`: render immediately after the jump nav and before `#ev-mission`. Those sections are listed first in the jump row, then “The mission”, then the other sections. They are excluded from the later extra-sections pass so they do not appear twice.
