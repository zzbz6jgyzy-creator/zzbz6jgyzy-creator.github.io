# Supercharged Daily — homepage wire quality (batch 21)

Living progress document. Dark remains the default. Existing routes kept. No production deploy.

## Why this batch

After #128 the homepage builder stays locked, but the prebuilt eight still led with Roadster clickbait (Motor1 “sentient”, Top Gear “forget the Tesla”, CarBuzz “380 MPH”) and two copies of the same jellyfish launch. #127 downranked those titles by 4 and still classified them as **milestone** because “Roadster” is checked first.

## Changes implemented

### 1. News ranking
- Clickbait is classified as speculation *before* milestone. Penalty is −10.
- Regex also catches `380 mph` and `autonomous stunts`.
- Same-story clusters: one jellyfish, one Bandwagon/Starfall, one class-action. At most two Roadster wires.
- MarketBeat-style “lowers position” / price-target copy is finance when the source is a stock desk.

### 2. On-this-site pairing
- Jellyfish / Carolina skies → Can I see it?
- Class-action / self-driving claims → FSD tracker.
- Bandwagon / Starfall still → Launch calendar.

### 3. Hub JSON-LD
- Tesla, SpaceX, News and Calendar get a WebPage block from the existing title, description and `@ALJR86`. No invented Person credentials.

`nav.json` untouched. Follow on X / `twitter:site` / referral untouched. Tesla / SpaceX `<picture>` sets not rewritten. `build-home.js` not run.

## Files modified

- `news-keep.js`, `scripts/news_keep.py`, `home-pair.js`
- `index.html` (feed + pins only), `news.html` (pin + JSON-LD)
- `tesla.html`, `spacex.html`, `calendar.html` (JSON-LD)
- `scripts/test-news-keep.mjs`, `scripts/test-wire-quality.mjs`
- `SUPERCHARGED_IMPROVEMENTS.md`, `docs/TRANSFORMATION.md`

## Tests executed

- `node scripts/test-news-keep.mjs`
- `node scripts/test-wire-quality.mjs` @ `http://127.0.0.1:4173`
- `node scripts/test-build-home-lock.mjs` (homepage locks still hold)
- `python3 -m py_compile scripts/news_keep.py`

## Outstanding / incomplete

- Production Lighthouse / CWV not claimed.
- My Tesla notifications: preferences only.
- Beehiiv `Tag ·` automations stay draft.
- No ads. No Worker deploy.

## Next recommended batch

- Measure production CWV after merge.
- Publish Beehiiv tag automations if segmented signup mail is wanted.
- Per-car mail only after a real send hook exists.
