# Supercharged Daily — desk honesty (batch 23)

Living progress document. Dark remains the default. Existing routes kept. No production deploy.

## Why this batch

After #130 the hubs show sourced compile dates, but two desks still led with the older claim:

- `/news.html` listed the snapshot newest-first, so clickbait and ticker notes sat above the same wire the homepage already ranked.
- The homepage Cybercab tracker used `stats[0]` (Tesla’s 10 Oct “300+ serving Austin”) instead of the later Texas DMV `live: "cybercab"` count (349 on 15 Oct).

## Changes implemented

### 1. News desk ranking
- `forDesk` ranks the full unique wire the same way as the homepage eight, without cluster caps.
- Both jellyfish stories can still appear on News; homepage still caps jellyfish at one.
- Cache key bumped so a 10-minute session store does not keep the old date order.
- “How this is built” says the list is ranked, titles not rewritten.

### 2. Cybercab homepage number
- `home-v2.js` and `scripts/build-home.js` pick `stats.find(s => s.live === "cybercab")`, then fall back to `stats[0]`.
- Prebuilt `<!--hv:trk-->` shows **349** / Texas DMV / 15 Oct. Tesla’s 300+ claim stays on the Cybercab tracker as a separate sourced stat.
- Full `build-home.js` was not run.

### 3. My Tesla desk copy
- `updates-data.js` no longer says “Newest US build”. Teslascope is a sample.

`nav.json` untouched. Follow on X / `twitter:site` / referral untouched. Tesla / SpaceX `<picture>` sets not rewritten.

## Files modified

- `news-keep.js`, `news.js`, `news.html`
- `home-v2.js`, `scripts/build-home.js`, `index.html` (tracker slot + pins only)
- `updates-data.js`, `my-tesla.html` (pin)
- `scripts/test-desk-honesty.mjs`, `scripts/test-wire-quality.mjs` (pin)
- `SUPERCHARGED_IMPROVEMENTS.md`, `docs/TRANSFORMATION.md`

## Tests executed

- `node scripts/test-desk-honesty.mjs` @ `http://127.0.0.1:4173`
- `node scripts/test-news-keep.mjs`
- `node scripts/test-wire-quality.mjs`
- `node scripts/test-build-home-lock.mjs`

## Outstanding / incomplete

- Production Lighthouse / CWV not claimed.
- My Tesla notifications: preferences only.
- Beehiiv `Tag ·` automations stay draft.
- No ads. No Worker deploy.

## Next recommended batch

- Measure production CWV after merge.
- Publish Beehiiv tag automations if segmented signup mail is wanted.
- Per-car mail only after a real send hook exists.
