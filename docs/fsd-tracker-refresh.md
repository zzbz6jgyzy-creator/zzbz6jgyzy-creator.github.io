# FSD tracker: refresh checklist

`/fsd-tracker.html` ("FSD by the numbers") is generated from `data/fsd-tracker.json` by `scripts/build-fsd-tracker.mjs` and validated by
`fsd-tracker-model.js`. Never hand-edit the HTML. It is a separate page from `/fsd.html` so the two can be compared; the owner chooses which to keep.

## Labels (keep them honest)

- **Disclosed**: Tesla or a regulator said it in a document we opened. Enforced by a test: a Disclosed figure must cite a `primary` or `regulator` source.
- **Reported**: a journalist, analyst or tracker found it.
- **Our estimate**: our own arithmetic on disclosed numbers (for example subscriptions per delivered car). Shown dashed.
- **Approx. from chart**: read off a published chart with no exact labels.
- **Target**: a stated aim or date.

Every figure needs a source with a `checked` date no later than `reviewed`.

## Each quarter (Tesla shareholder deck: late Jan, Apr, Jul, Oct)

1. Download the deck and add it to `sources` with the date you opened it.
2. Add the new quarter to `adoption.points` (subscriptions and cumulative deliveries from the "Key metrics" table; the deck footnotes define both). Quarters must stay in date order and cumulative deliveries must not fall.
3. Update the KPI cards, the attach-rate step (`adoption.attach`) and the Europe callout from the deck text.
4. Add a `changes` entry (newest first) and set `reviewed`.

The markets KPI is computed from `data/fsd-global.json`, so refresh that file (it has its own checks) and rebuild.

```
node scripts/build-fsd-tracker.mjs
sh scripts/rebuild-js.sh
node --test tests/fsd-tracker.test.mjs
python3 tests/test_fsd_tracker_ownership.py
CHROMIUM_PATH=... python3 tests/fsd-tracker-browser.py
node scripts/audit/axe.mjs fsd-tracker.html
```
