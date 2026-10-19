# Supercharged Daily — remaining desk JSON-LD (batch 24)

Living progress document. Dark remains the default. Existing routes kept. No production deploy.

## Why this batch

After #131 the news wire and homepage Cybercab number are honest, but the remaining nav desks still had no WebPage JSON-LD, Dispatch’s meta still led with “300 Cybercabs in Austin”, and the clubs directory printed a raw ISO date.

## Changes implemented

### 1. Dispatch meta
- Description / og / twitter now name the current lead stories: earnings week, Bandwagon-5 / Starfall, Robotaxi until midnight.
- The 10 Oct “300 Cybercabs in Austin” story card stays in the grid.

### 2. Remaining desk JSON-LD
- WebPage blocks from each page’s existing title, description and `@ALJR86`.
- Pages: Grok, Dispatch, Games (hub only), Explainers, Tesla clubs, Markets, TCMV, Gear, buying guide, reviews index + five cars, Wallpapers.
- Game pages themselves (`robotaxi.html`, `catch.html`, `staging.html`) untouched. No invented Person.

### 3. Tesla clubs stamp
- Idle line: **Directory compiled 16 Oct 2026.** Fallback says compiled dates, not live telemetry.

`nav.json` untouched. Follow on X / `twitter:site` / referral untouched. Tesla / SpaceX `<picture>` sets not rewritten. `build-home.js` not run.

## Files modified

- `dispatch.html`, `tesla-clubs.html`, `tesla-clubs.js`
- `grok.html`, `games.html`, `explainers.html`, `tsla.html`, `tcmv.html`, `gear.html`, `guides/tesla-buying-guide.html`, `wallpapers.html`
- `reviews/index.html`, `reviews/model-s.html`, `reviews/model-3.html`, `reviews/model-x.html`, `reviews/model-y.html`, `reviews/cybertruck.html`
- `scripts/test-remaining-desks.mjs`
- `SUPERCHARGED_IMPROVEMENTS.md`, `docs/TRANSFORMATION.md`

## Tests executed

- `node scripts/test-remaining-desks.mjs` @ `http://127.0.0.1:4173`
- `node scripts/test-build-home-lock.mjs`
- `node scripts/test-desk-honesty.mjs`

## Outstanding / incomplete

- Production Lighthouse / CWV not claimed.
- My Tesla notifications: preferences only.
- Beehiiv `Tag ·` automations stay draft.
- No ads. No Worker deploy.

## Next recommended batch

- Measure production CWV after merge.
- Publish Beehiiv tag automations if segmented signup mail is wanted.
- Per-car mail only after a real send hook exists.
