# Supercharged Daily — watch counts

Living progress document. Dark remains the default. Existing routes kept.

## Prioritised tasks

1–12. Nav through newsletter tags — done (#119–#125)
13. Watch live `sd-events` counts — this session

## Completed this session

- Unlisted `/counts.html` fetches `https://sd-events.superchargeddaily.workers.dev/stats?days=30` and paints the eight allowlisted actions.
- Tiles, by-day rows and top pages reserve height. Zeros stay zeros. Fail copy when the Worker is blocked.
- About links to the page. `noindex`. Not in nav. Not unique visitors.
- `?stats=/path.json` override for tests. No Worker redeploy. No ads.

## Files modified

- `counts.html`, `counts.css`, `counts.js`
- `about.html`, `data/README.md`
- `scripts/test-watch-counts.mjs`
- `SUPERCHARGED_IMPROVEMENTS.md`, `docs/TRANSFORMATION.md`

## Tests performed

- `node scripts/test-watch-counts.mjs` against `http://127.0.0.1:4173` — ALL_PASS (fixture totals, labels kept, fail dashes, zero copy, live Worker, Follow on X)

## Known limitations

- Counts are approximate. Ad blockers drop some. `/verify` paths can appear from Cloudflare challenges.
- Tag automations stay draft until published at app.beehiiv.com.
- Beehiiv plan allowed three saved segments. SpaceX / website use `utm_content` until a slot frees up.
- Notifications are preferences only. Newsletter signup is the live email path.
- No ads. Do not add empty slots.
- Do not run full `build-home.js` unless tesla.html / spacex.html `<picture>` diffs are reverted.
- Follow on X and `twitter:site` unchanged.

## Remaining work

- Publish the five `Tag ·` automations in Beehiiv if you want tags applied automatically.
- Per-car software / recall mail only after a real send hook is designed and tested.
- Labelled sponsorship only when there is a creative to put in the slot.
