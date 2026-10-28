# FSD tracker: refresh checklist

`/fsd-tracker.html` ("FSD by the numbers") is generated from `data/fsd-tracker.json` by `scripts/build-fsd-tracker.mjs` and validated by
`fsd-tracker-model.js`. Never hand-edit the HTML. It is a separate page from `/fsd.html` so the two can be compared; the owner chooses which to keep.

## Labels (keep them honest)

- **Disclosed**: Tesla or a regulator said it in a document we opened. Enforced by a test: a Disclosed figure must cite a `primary` or `regulator` source.
- **Reported**: a journalist, analyst or tracker found it.
- **Our estimate**: our own arithmetic on disclosed numbers (for example subscriptions per delivered car). Shown dashed.
- **Approx. from chart**: read off a published chart with no exact labels.
- **Target**: a stated aim or date.
- **Our expectation**: our guess at when a number next changes (the "When it updates next" table). Never a Tesla schedule.

## Each quarter, also

- Re-read the "When it updates next" rows in `data/fsd-tracker.json` (`refresh`): the dates in the "Last updated from" column are built from the sources, but the "Next update" wording is ours.
- Regenerate the share image: `node scripts/fsd-tracker-og-card.mjs`, serve the repo, screenshot `scripts/fsd-tracker-og-card.html` at 1200x630 to `assets/og-fsd-tracker.jpg`. A test fails if the card HTML is stale.
- The RSS feed (`fsd-tracker-feed.xml`) is rebuilt with the page; add a `changes` entry for anything a reader should know.

Every figure needs a source with a `checked` date no later than `reviewed`.

## Each quarter (Tesla shareholder deck: late Jan, Apr, Jul, Oct)

1. Download the deck and add it to `sources` with the date you opened it.
2. Add the new quarter to `adoption.points` (subscriptions and cumulative deliveries from the "Key metrics" table; the deck footnotes define both). Quarters must stay in date order and cumulative deliveries must not fall.
3. Update the KPI cards, the attach-rate step (`adoption.attach`) and the Europe callout from the deck text.
4. Add a `changes` entry (newest first) and set `reviewed`.

Cumulative miles (`miles.points`): re-measure Tesla's chart in the new deck (render the page, read the red and blue band tops at each quarter tick against the axis gridlines) and keep the 'approximate' label. Replace it with Tesla's own number if one is ever published, and log a correction.

Pinned slices (`software`, `atlas`, `europe`): the page does not read the bot-updated software history or the other trackers' data at build time. To refresh them run `node scripts/refresh-fsd-pins.mjs` (it also fetches the Eurostat population table), then rebuild. Check that the recognition list and Tesla-listed markets still match `/fsd-europe.html` and `/fsd.html`. The numbers are running totals of cars Teslascope has seen on each build (the last snapshot of each UTC day), not a share of cars on a build today. Keep the wording that says so, and keep the sample caveat.

When re-measuring Tesla's miles chart in a new deck, match each tick label to its position instead of assuming the axis starts at the same month: the Q1 and Q2 decks start at Sep 2021, the Q3 deck at Sep 2022.

The markets KPI is computed from the pinned atlas slice. Update `data/fsd-global.json` and `data/fsd-europe.json` through their own checks first, then re-pin.

```
node scripts/build-fsd-tracker.mjs
sh scripts/rebuild-js.sh
node --test tests/fsd-tracker.test.mjs
python3 tests/test_fsd_tracker_ownership.py
CHROMIUM_PATH=... python3 tests/fsd-tracker-browser.py
node scripts/audit/axe.mjs fsd-tracker.html
```
