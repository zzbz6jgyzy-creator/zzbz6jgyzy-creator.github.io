# Supercharged Daily — site optimisation

Living progress document for the full-site optimisation mission. Dark remains the default. No production deploy. No paid APIs or ads. Existing routes kept.

## Initial audit (2026-10-18)

Static GitHub Pages. Nav from `scripts/nav.json`. Homepage `<!--hv:*-->` via `scripts/build-home.js` + `home-v2.js`. Wire in `news-data.json`. Newsletter Beehiiv. Analytics: Cloudflare Web Analytics pageviews + `sd-events` Worker counters. Theme is an explicit toggle, not `prefers-color-scheme`.

## Prioritised tasks

1–7. Nav, news keep, Dispatch browse, search, homepage explore, My Tesla prefs, leftover wells / tools / newsletter — done (#119, #120)
8. Lab CWV numbers + event wiring + commercial brief — this session

## Completed this session

- Ran Lighthouse 12.6.1 mobile lab against **production** `https://superchargeddaily.com` on 19 Oct 2026. Numbers below are measured, not invented.
- Calendar CLS 0.523 was the worst lab result. Reserved countdown space (skeletons + min-height), paint curated rows before `events.json`, and dropped `.reveal` on the calendar hero (LCP was waiting on the fade-in).
- Homepage live thumb used full `falcon9.jpg` (~LCP). Now a `<picture>` of the existing 480/960/1200 AVIF/WebP set. `live.js` and `scripts/build-home.js` match (builder not run).
- Event counts: `track.js` now also records `search_open`, `search_go`, `theme_toggle`, `dispatch_filter`, `tesmag_click`. No query text, emails, or IDs. Worker allowlist updated in-repo — **not deployed** (needs `wrangler deploy` in `workers/sd-events` after merge).
- Commercial: brief only. No slots, no ads.

## Files modified

- `track.js`, `workers/sd-events/sd-events.js`, `data/README.md`
- `theme.js`, `search.js`, `dispatch-browse.js`, `nav-pill.js`, `script.js`, `grow.js`
- `calendar.js`, `calendar.html`, `calendar-next.css`
- `live.js`, `scripts/build-home.js`, `index.html` (event thumb only)
- HTML cache pins for `script.js`, `grow.js`, `nav-pill.js`, `live.js`, `calendar.js`
- `scripts/test-events-cwv.mjs`, `SUPERCHARGED_IMPROVEMENTS.md`

## Tests performed

- `node scripts/test-events-cwv.mjs` against `http://127.0.0.1:4173`
- Local Lighthouse re-check of `/` and `/calendar.html` after the CLS / picture changes (localhost, not production)

## Measured performance

Lighthouse 12.6.1, mobile emulation, headless Chrome, **production host** (19 Oct 2026). Lab only — not CrUX field data.

| Page | Perf | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|---|
| `/` | 0.83 | 2.6 s | 3.7 s | 140 ms | 0.003 | 3.2 s |
| `/dispatch.html` | 0.87 | 1.6 s | 3.6 s | 30 ms | 0.104 | 1.8 s |
| `/calendar.html` | 0.73 | 1.5 s | 2.7 s | 130 ms | **0.523** | 1.5 s |

Homepage LCP element: live Falcon 9 JPEG. Calendar LCP: hero paragraph (78% render delay from `.reveal`). Calendar CLS: empty countdown / list filling after JS.

Same Lighthouse settings on **localhost :4173** after this PR’s calendar / picture changes (not comparable to production CDN / Cloudflare JS):

| Page | Perf | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|---|
| `/` | 0.88 | 2.3 s | 3.5 s | 80 ms | 0.003 | 2.3 s |
| `/calendar.html` | 0.96 | 2.1 s | 2.5 s | 30 ms | **0** | 2.1 s |

Local homepage LCP is now the `<picture>` thumb. Local calendar CLS dropped from the production 0.523 to 0. Do not treat localhost as field CWV. Re-run production after merge.

## Commercial brief (not activated)

If sponsorship is ever approved, labelled slots only:

- Homepage: one labelled “Sponsored” band below Explore, never inside Live / Dispatch / newsletter.
- Dispatch archive: not inside the story grid.
- Gear: TESMAG is an affiliate disclosure, not an ad slot.

Nothing was added to the HTML. No ad network, no empty slot markup.

## Known limitations

- New event names 400 on the live Worker until it is deployed.
- Notifications are preferences only.
- Do not run full `build-home.js` unless tesla.html / spacex.html `<picture>` diffs are reverted.
- Follow on X and `twitter:site` unchanged.

## Remaining work

- Deploy `sd-events` Worker when ready.
- Re-run production Lighthouse after merge to see calendar CLS / homepage LCP.
- Ads / notification delivery only with explicit approval.
