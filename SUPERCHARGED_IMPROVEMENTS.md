# Supercharged Daily — leftover copy + quiet light cards (batch 25)

Living progress document. Dark remains the default. Existing routes kept. No production deploy.

## Why this batch

Tesla hub still claimed “the trackers update every weekday.” The Software Update Tracker still labelled Teslascope’s sample “Newest build.” Quiet next-stream cards stayed a dark well in light theme.

## Changes implemented

### 1. Tesla hub copy
- Lede keeps owner/shareholder + facts. Drops the weekday schedule claim.
- Stamp fallback is compiled stamps, not live telemetry. `tesla-hub.js` still fills FSD Europe + Teslascope sample dates.

### 2. Software wording
- Tracker tile: **Newest reporting**.
- Region card: **Newest reporting in {region}**. Percent is of tracked cars.
- My Tesla: newest reporting Teslascope has seen / you match the newest reporting.

### 3. Light theme
- Quiet `.lw` next-stream cards lift to paper. **LIVE / Watch-live** (`.lw-live`) stay dark-red.
- Homepage `.mj` countdown ink already lifted; red eyebrow/tile labels stay red.

`nav.json` untouched. Follow on X / `twitter:site` / referral untouched. Tesla / SpaceX `<picture>` sets not rewritten. `build-home.js` not run. No ads. No Beehiiv publish.

## Files modified

- `tesla.html`, `updates.html`, `updates-v3.js`, `my-tesla.html`, `my-tesla.js`
- `live.css`, `theme.css`
- `index.html`, `spacex.html`, `starship.html` (live.css pin)
- `scripts/test-leftover-copy.mjs`
- `SUPERCHARGED_IMPROVEMENTS.md`, `docs/TRANSFORMATION.md`

## Tests executed

- `node scripts/test-leftover-copy.mjs` @ `http://127.0.0.1:4173`
- `node scripts/test-hub-stamps.mjs`

## Outstanding / incomplete

- Beehiiv `Tag ·` automations stay draft.
- My Tesla notifications: preferences only.
- No ads. No Worker deploy.

## Next recommended batch

- Publish Beehiiv tag automations if segmented signup mail is wanted.
- Per-car mail only after a real send hook exists.
