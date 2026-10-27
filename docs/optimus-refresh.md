# Optimus guide: refresh checklist

The guide (`/optimus.html`) is an edited snapshot, not live data. Everything is generated from `data/optimus-studio.json` by
`scripts/build-optimus-studio.mjs`; `optimus-model.js` validates it. Never hand-edit `optimus.html`.

## When to refresh

- **Tesla unveils Gen 3** (the big one; see below).
- A new Tesla quarterly update or earnings call (late Jan, Apr, Jul, Oct): production status, capacity, ramp, deliveries, AI5.
- A new official film, post or demonstration; a leadership change; a price or customer announcement.
- Any correction: fix it, then add a `changes` entry marked `correction` (editorial rule 6).

## When Tesla unveils Gen 3

Work through these in order, in `data/optimus-studio.json` unless noted. Quote Tesla's own words and keep the claim labels
honest: only Tesla's published statements are `disclosed`; everything else stays `reported` or `target`.

1. **Sources:** add the unveil source (film, post, deck, transcript), open it, set `checked` to the date, and recheck the sources it replaces.
2. **Generations table (`specs`, `specGens`):** fill the Gen 3 column with what Tesla published (height, weight, hands, actuators, battery, speed, compute). Upgrade cells from `reported` to `disclosed` only where Tesla itself said it. Leave a cell out unless a source gives a value; a missing cell renders as "Not published".
3. **Metrics and status:** update `status`, `metrics` (hand DoF, production, capacity) and `asOf` dates.
4. **Timeline:** add the unveil as a `hardware` event; move the "target" events that have happened into dated ones.
5. **Promises:** `p-gen3` (unveil promised for Q1 2026) gets its outcome and result text, with the date it happened. Check `p-sop`, `p-ramp`, `p-customers`.
6. **FAQs and evidence:** rewrite "What is Gen 3?", the hands and size answers; add evidence records for the unveil footage with the control mode Tesla states (`company_autonomy`, `human_assistance`, `mixed_reported`, `unspecified`).
7. **Illustrations:** the X-ray (`scripts/optimus-art.mjs`) and 3D internals (`optimus-explorer.js`) follow the 2022 layout. If Tesla publishes a Gen 3 layout, redraw them and update the captions and `model3d` cards. If an official model or press images exist, check the licence before using them; the fan model (Michael, CC BY 4.0) resembles Gen 2 and its labels must stay accurate.
8. **Hero and share card:** replace the portrait in `assets/optimus-studio/` if there is a rights-cleared Gen 3 image (update `provenance.json`), then regenerate `assets/og-optimus.jpg` from `scripts/optimus-og-card.html` and refresh its provenance hash in `assets/3d/optimus-provenance.json`.
9. **Reviewed date and change log:** set `reviewed`, add a `changes` entry (newest first), and say what changed. Use `correction` for anything previously wrong.

## Then

```
node scripts/build-optimus-studio.mjs
sh scripts/rebuild-js.sh
node --test tests/optimus-studio.test.mjs
python3 tests/test_optimus_refresh.py
export CHROMIUM_PATH=...   # a Chrome or Chromium binary
python3 tests/optimus-studio-browser.py
python3 tests/optimus-3d-browser.py
node scripts/audit/axe.mjs optimus.html
node scripts/audit/axe.mjs optimus-viewer.html
```

`tests/optimus-studio-browser.py` pins record counts (timeline events, evidence records, table cells, actuator counts);
update those numbers when you add or remove records. Merge `origin/main` before pushing, and have the `reviewer`
subagent read the diff against the sources before the PR opens.
