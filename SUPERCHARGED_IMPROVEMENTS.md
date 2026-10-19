# Supercharged Daily — leftover polish

Living progress document for leftover cheap polish after the 15-phase optimisation mission. Dark remains the default. Existing routes kept.

## Prioritised tasks

1–10. Nav through live Worker — done (#119–#123)
11. Tesla / SpaceX story-card poster lock, Promise Tracker reserved wells, Tesla clubs lookup fail copy — this session

## Completed this session

- Story-grid posters stay 160px even when a card still has inline `height:auto`. Lock lives in `styles.css` (`.story-grid .story-card > picture` + `img { height:160px !important }`). Pin bumped on `tesla.html` and `spacex.html` only. Inline `height:auto` stripped from those two desks. Did **not** run `build-home.js`.
- Promise Tracker empty chips, topic tiles, and ring legend reserve space before `promises.json` lands. List still starts with “Loading promises…”.
- Tesla clubs city lookup now writes `#tc-hint` and holds it when Open-Meteo fails, returns no city, or location is blocked. No invented clubs. No Ireland/UK default.

## Files modified

- `styles.css`, `tesla.html`, `spacex.html`
- `promise-tracker.css`, `promise-tracker.html`
- `tesla-clubs.js`, `tesla-clubs.html`
- `scripts/test-leftover-polish.mjs`
- `SUPERCHARGED_IMPROVEMENTS.md`, `docs/TRANSFORMATION.md`

## Tests performed

- `node scripts/test-leftover-polish.mjs` against `http://127.0.0.1:4173` — ALL_PASS (Tesla/SpaceX/Dispatch posters 160px, Promise empty wells reserved then filled, clubs fail/empty/geo hold, Austin still returns 3 clubs)

## Known limitations

- Notifications are preferences only. Newsletter signup is the live email path.
- No ads. Do not add empty slots.
- Do not run full `build-home.js` unless tesla.html / spacex.html `<picture>` diffs are reverted.
- Follow on X and `twitter:site` unchanged.

## Remaining work

- Watch live `sd-events` counts.
- Per-car software / recall mail or push only after a real hook is designed and tested.
- Labelled sponsorship only when there is a creative to put in the slot.
