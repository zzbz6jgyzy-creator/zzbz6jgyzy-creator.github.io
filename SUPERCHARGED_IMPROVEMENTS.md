# Supercharged Daily — site optimisation

Living progress document for the full-site optimisation mission. Dark remains the default. No production deploy. No paid APIs or ads. Existing routes kept.

## Initial audit (2026-10-18)

Static GitHub Pages. Nav from `scripts/nav.json`. Homepage `<!--hv:*-->` via `scripts/build-home.js` + `home-v2.js`. Wire in `news-data.json`. Newsletter Beehiiv. Analytics: Cloudflare Web Analytics pageviews + `sd-events` Worker counters. Theme is an explicit toggle, not `prefers-color-scheme`.

## Prioritised tasks

1–8. Nav, news keep, Dispatch browse, search, homepage, My Tesla, leftover wells / tools, events + lab CWV — done (#119–#121)
9. Dispatch archive CLS (the leftover 0.104) + related reveal / a11y leftovers — this session

## Completed this session

- Re-ran production Lighthouse after #121 merged. Calendar CLS is now **0** on the live host; homepage LCP is the Falcon 9 `<picture>` thumb.
- Dispatch archive still **CLS 0.104** on production. Cards 13+ no longer paint before JS paginates. Chips, status and date/read-time lines are reserved. Hero and cards no longer start at `opacity: 0`. First poster is preloaded and eager; `sizes` match the 3-column grid. Inline `height:auto` no longer wins over the 160px row.
- News hero dropped the same `.reveal` fade. Light theme lifts `.art-lead-media` / `.art-media` off charcoal.
- Model 3 and Cybertruck explorers get a skip link and `<main id="main">`. 3D stages stay dark.

## Files modified

- `dispatch.html`, `dispatch-browse.js`, `dispatch-browse.css`
- `news.html`, `news-articles.css`
- `model3-explorer.html`, `cybertruck-explorer.html`, `model3-explorer.css`
- `scripts/test-dispatch-cls.mjs`, `SUPERCHARGED_IMPROVEMENTS.md`

## Tests performed

- `node scripts/test-dispatch-cls.mjs` against `http://127.0.0.1:4173` → `ALL_PASS`
- Local Lighthouse on `/dispatch.html` after the CLS reserve
- Production Lighthouse re-check of `/`, `/calendar.html`, `/dispatch.html` (19 Oct 2026)

## Measured performance

Lighthouse 12.6.1, mobile, headless Chrome. Lab only — not CrUX.

**Production after #121** (this session, 19 Oct 2026):

| Page | Perf | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|---|
| `/` | 0.98 | 1.7 s | 2.1 s | 7 ms | 0.003 | 1.7 s |
| `/calendar.html` | 0.99 | 1.6 s | 1.7 s | 45 ms | **0** | 1.6 s |
| `/dispatch.html` | 0.86 | 1.6 s | 3.7 s | 56 ms | **0.104** | 1.9 s |

Home LCP element is now `div.lw-thumb > picture > img`. Calendar LCP is the hero paragraph (no fade). Dispatch LCP is the first archive poster; CLS is the leftover this PR targets.

**Localhost :4173 after this PR** (not comparable to production CDN / Cloudflare JS):

| Page | Perf | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|---|
| `/dispatch.html` | 0.91 | 2.3 s | 3.2 s | 0 | **0** | 2.3 s |

Do not treat localhost as field CWV. Re-run production Dispatch after merge.

## Known limitations

- `sd-events` Worker still needs a deploy for the new event names.
- Notifications are preferences only.
- Do not run full `build-home.js` unless tesla.html / spacex.html `<picture>` diffs are reverted.
- Follow on X and `twitter:site` unchanged.

## Remaining work

- Deploy `sd-events` Worker when ready.
- Re-run production Dispatch Lighthouse after this merge.
- Ads / notification delivery only with explicit approval.
