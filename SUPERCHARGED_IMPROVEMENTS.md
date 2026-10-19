# Supercharged Daily — newsletter tags

Living progress document. Dark remains the default. Existing routes kept.

## Prioritised tasks

1–11. Nav through leftover polish — done (#119–#124)
12. Beehiiv subscriber tags from site topic bands — this session

## Completed this session

- Signup still redirects to Beehiiv with no API key in public code. It now sends allowlisted `utm_content`: `roadster`, `tesla`, `tesla-software`, `spacex`, or `website`.
- Topic comes from the path first (then `.art-tag`), so Tesla desk cards tagged Roadster do not steal the signup.
- Homepage band is `data-band-topic="website"`. `grow.js` uses `website` instead of `default`.
- Beehiiv tags created: `roadster`, `tesla`, `tesla-software`, `spacex`, `website`. Existing `creator` tag left alone.
- Live segments (plan limit 3): Site · Roadster, Site · Tesla, Site · Tesla software. SpaceX and website can be filtered by `utm_content` in the subscriber table.
- Draft automations apply the matching tag on signup. They are **not live** until published in the Beehiiv editor. Sunday send is still one list. No per-car mail. No ads.

## Files modified

- `newsletter.js`, `grow.js`, `script.js`, `newsletter-cta.js`, `index.html`
- Cache-bust `script.js` / `grow.js` / `newsletter.js` pins on the pages that load them
- `scripts/test-newsletter-tags.mjs`
- `SUPERCHARGED_IMPROVEMENTS.md`, `docs/TRANSFORMATION.md`

## Tests performed

- `node scripts/test-newsletter-tags.mjs` against `http://127.0.0.1:4173` — ALL_PASS (home/roadster/tesla/tesla-software/spacex UTMs, honeypot, Follow on X)

## Known limitations

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
