# Supercharged Daily — site optimisation

Living progress document for the full-site optimisation mission. Dark remains the default. Existing routes kept.

## Initial audit (2026-10-18)

Static GitHub Pages. Nav from `scripts/nav.json`. Homepage `<!--hv:*-->` via `scripts/build-home.js` + `home-v2.js`. Wire in `news-data.json`. Newsletter Beehiiv. Analytics: Cloudflare Web Analytics pageviews + `sd-events` Worker counters. Theme is an explicit toggle, not `prefers-color-scheme`.

## Prioritised tasks

1–9. Nav through Dispatch CLS — done (#119–#122)
10. Live `sd-events` Worker deploy + production Dispatch re-measure — this session

## Completed this session

- Deployed `sd-events` Worker from `workers/sd-events/sd-events.js` (Cloudflare account Superchargeddaily@gmail.com, 19 Oct 2026 06:30 UTC). Same KV `EVENTS` / `57ee0b9c3c2647fe84176ca976aba17e`. New names `search_open`, `search_go`, `theme_toggle`, `dispatch_filter`, `tesmag_click` now return **204**. Unknown names still **400**.
- Re-ran production Lighthouse after #122. Dispatch CLS is **0** on the live host (was 0.104).
- Ads: not activated. No network, no empty “Sponsored” slot. Brief in the previous batch still stands — need a real sponsor creative first.
- Notifications: My Tesla prefs stay on-device. Newsletter (Beehiiv) is the live mail channel. No push hook, no per-car email job. Copy still says delivery is not live.

## Files modified

- `data/README.md`, `SUPERCHARGED_IMPROVEMENTS.md`, `docs/TRANSFORMATION.md`

## Tests performed

- Live `GET /e?n=theme_toggle` and `search_open` → 204; bogus name → 400
- Live `/stats?days=7` totals include the eight allowlisted names
- Production Lighthouse `/dispatch.html` after #122

## Measured performance

Lighthouse 12.6.1, mobile, headless Chrome, **production** `https://superchargeddaily.com`. Lab only.

| When | Page | Perf | LCP | CLS |
|---|---|---|---|---|
| After #121 | `/dispatch.html` | 0.86 | 3.7 s | **0.104** |
| After #122 (this session) | `/dispatch.html` | 0.98 | 2.2 s | **0** |

LCP element remains the first archive poster (`div.story-grid > a.story-card > picture > img`).

## Known limitations

- Notifications are preferences only. Newsletter signup is the live email path.
- No ads. Do not add empty slots.
- Do not run full `build-home.js` unless tesla.html / spacex.html `<picture>` diffs are reverted.
- Follow on X and `twitter:site` unchanged.

## Remaining work

- Per-car software / recall mail or push only after a real hook (Beehiiv tags or Web Push) is designed and tested.
- Labelled sponsorship only when there is a creative to put in the slot.
