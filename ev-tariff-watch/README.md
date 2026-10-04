# Irish EV Tariff Watch

Static multi-page website, no build step. GitHub Pages serves these files as-is from
`ev-tariff-watch/` in the `zzbz6jgyzy-creator.github.io` repo:
https://zzbz6jgyzy-creator.github.io/ev-tariff-watch/

Run it locally:

    cd /workspace/ev-tariff-watch && python3 -m http.server 8765
    # then visit http://127.0.0.1:8765/

## Pages
| File | Page |
|---|---|
| `index.html` | Home: cheapest plan today, upcoming price changes, top 3, quick links |
| `compare.html` | Compare plans: sortable table (cards on mobile) with "Switch to X" buttons and sources |
| `calculator.html` | Yearly home-charging cost by plan vs dynamic and a 24-hour rate |
| `dynamic.html` | Dynamic tariffs vs fixed EV night rates (chart, 2–5am estimates, trend) |
| `price-changes.html` | Timeline of announced changes (coming up / in effect) |
| `how-to-switch.html` | Steps for switching in Ireland (sourced: CRU, ESB Networks, Citizens Information, bonkers.ie) + supplier switch links |
| `about.html` | Method, last-updated dates, disclaimer, every source link |

## Shared files
- `data.js`: **all prices, switch links and alerts live here.** Edit this weekly.
- `app.js`: navigation (hamburger menu below 1180px), theme toggle, and the renderer for each page (`<body data-page="...">`). No network calls.
- `styles.css`: mobile-first styles, light/dark (follows system; toggle in header).
- `manifest.webmanifest`, `apple-touch-icon.png`, `icon-*.png`: Add to Home Screen support.

Header and footer HTML are repeated in each page. If you add or rename a page, update the
`<nav>` and footer links in all seven files.

Announced prices (`ev.next` / `standing.next` with `ev.nextDate`) switch on automatically
from their start date, so "Today" is always right even between weekly updates.

## Weekly update checklist (data.js)
1. For each plan, re-check the supplier source URL(s) and update `ev.now`, `day/night/peak`, `standing.now`, `checked`.
2. When a supplier announces a change, set `ev.next`, `ev.nextDate`, `standing.next`, and add an entry to `alerts` (newest first).
3. After a change takes effect, move `next` to `now` and set `next: null` (the site already shows the new price from `nextDate`, so this is housekeeping).
4. Mark anything you calculated as `"derived"` (with a note). Mark anything you couldn't confirm as unverified. Never invent numbers.
5. Re-check every `suppliers[...].switchUrl` (curl with a browser User-Agent should return 200) and update `meta.linksChecked`.
6. Refresh `wholesale.hourly` / `avg2to5` from SEMOpx day-ahead results (SEMO reports API, report EA-001, ROI-DA market).
7. Update `meta.asOf` (and `meta.siteUpdated` if you changed the pages).
