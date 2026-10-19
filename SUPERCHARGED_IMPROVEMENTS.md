# Supercharged Daily — hub stamps + tracker JSON-LD (batch 22)

Living progress document. Dark remains the default. Existing routes kept. No production deploy.

## Why this batch

After #129 the homepage eight is honest, but Tesla and SpaceX hubs still promised weekday tracker updates with no date, and Tesla cards hardcoded a software build and an EU count that can drift from `updates-live.json` / `fsd-europe-data.js`. Flagship tracker pages also lacked WebPage JSON-LD.

## Changes implemented

### 1. Tesla hub
- Stamp under the lede fills from FSD Europe `updated` and Teslascope `updates-live.json` `updated`.
- Software card uses the same pick as the homepage tracker: `count > 0`, newest `firstSeen`. Not the ghost `latest` field (`2026.32.100` / count 0).
- Copy is “Newest reporting” / “Teslascope sample”, not “US build”.
- FSD card fills the approved count as `N of 27 EU countries` from `FSD_EUROPE.countries`.
- Fallback HTML stays if the fetch fails. Tesla `<picture>` set is not rewritten.

### 2. SpaceX hub
- Stamp is **Starship compiled {date}.** from `STARSHIP.updated` only.
- Falcon and Starlink are not labelled fresh from `starship-data.js`.

### 3. Tracker JSON-LD
- WebPage blocks on FSD Europe, FSD, Software Update Tracker, Starlink, Starship, My Tesla, Can I see the launch?, and Cybercab.
- Name, description and URL come from each page’s existing title/meta. Publisher is Organization Supercharged Daily / `@ALJR86`. No invented Person.

`nav.json` untouched. Follow on X / `twitter:site` / referral untouched. `build-home.js` not run.

## Files modified

- `tesla-hub.js`, `spacex-hub.js` (new)
- `tesla.html`, `tesla-page.css`, `spacex.html`
- `fsd-europe.html`, `fsd.html`, `updates.html`, `starlink.html`, `starship.html`, `my-tesla.html`, `see-the-launch.html`, `cybercab.html`
- `scripts/test-hub-stamps.mjs`
- `SUPERCHARGED_IMPROVEMENTS.md`, `docs/TRANSFORMATION.md`

## Tests executed

- `node scripts/test-hub-stamps.mjs` @ `http://127.0.0.1:4173`
- `node scripts/test-build-home-lock.mjs`
- `node scripts/test-wire-quality.mjs`

## Outstanding / incomplete

- Production Lighthouse / CWV not claimed.
- My Tesla notifications: preferences only.
- Beehiiv `Tag ·` automations stay draft.
- No ads. No Worker deploy.

## Next recommended batch

- Measure production CWV after merge.
- Publish Beehiiv tag automations if segmented signup mail is wanted.
- Per-car mail only after a real send hook exists.
