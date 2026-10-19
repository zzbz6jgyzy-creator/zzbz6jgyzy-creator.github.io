# Supercharged Daily — homepage builder lock (batch 20)

Living progress document. Dark remains the default. Existing routes kept. No production deploy.

## Why this batch

`#127` restored `data-band-topic="website"` on the homepage band and taught `live.js` to keep timed Falcon flights on the home next-event card. The next `home-build.yml` pre-render (`bcfd5a4`) ran `scripts/build-home.js` and undid both:

1. The band template in `build-home.js` still omitted `data-band-topic`, so grow.js skipped rebuilding the band and the topic attr disappeared.
2. `eventCardFor("home")` still used the old `featOn` filter (`hide every page === "starship" whenever a major non-Starship event exists`), so the static card showed Tuesday’s SpaceX Q3 earnings instead of Monday’s timed Bandwagon-5.

`live.js` was already correct; crawlers and no-JS visitors got the stale prebuilt card.

## Changes implemented

### 1. Homepage band topic
- `scripts/build-home.js` band markup now includes `data-band-topic="website"`.
- Restored the attr on `index.html` so homepage signups keep `utm_content=website`.

### 2. Homepage next-event pick
- New `scripts/live-home-pick.js`: keep timed Falcon/Dragon on home, drop NET Starship planning. Featured/major earnings no longer hide a timed Falcon.
- `build-home.js` uses that pick. `live.js` documents the same filter.
- Prebuilt homepage card is now **Falcon 9 · Bandwagon-5 rideshare** (Mon 19 Oct · 10:30 UTC). SpaceX Q3 earnings stays the next event after Bandwagon ends.

### 3. Tesla / SpaceX picture guard
- Desk rewrite only replaces an existing `<!--hv:event-->` pair.
- Aborts if the markers span `<main>` or the write would drop a `<picture>`.
- Tesla still 10 `<picture>` sets, SpaceX still 7. Story-grid posters untouched.

### 4. Search noindex
- `/search.html` is a utility page. `noindex,follow` plus drop from `sitemap.xml` (same skip as `/counts.html`).
- Canonical, Follow on X, and `twitter:site` unchanged.

## Files modified

- `scripts/live-home-pick.js` (new), `scripts/build-home.js`, `live.js`
- `index.html` (band topic + Bandwagon prebuilt card)
- `search.html`, `sitemap.xml`
- `scripts/test-build-home-lock.mjs`
- `SUPERCHARGED_IMPROVEMENTS.md`, `docs/TRANSFORMATION.md`

`nav.json` untouched. Follow on X / `twitter:site` / referral untouched. Tesla / SpaceX desks not rewritten.

## Tests executed

- `node scripts/test-build-home-lock.mjs` @ `http://127.0.0.1:4173`
- `node scripts/test-newsletter-tags.mjs` (homepage `utm_content=website`)
- `node --check` on edited JS

## Outstanding / incomplete

- Production Lighthouse / CWV not claimed.
- My Tesla notifications: preferences only.
- Beehiiv `Tag ·` automations stay draft until published at app.beehiiv.com.
- No ads. No Worker deploy.

## Next recommended batch

- Measure production CWV after merge.
- Publish Beehiiv tag automations if segmented signup mail is wanted.
- Design a real per-car mail hook before claiming alerts.
