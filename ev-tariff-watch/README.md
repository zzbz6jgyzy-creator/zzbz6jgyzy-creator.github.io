# Irish EV Tariff Watch: prototype

Static, no-build prototype. Open `index.html` directly or serve it:

    cd /workspace/ev-tariff-watch && python3 -m http.server 8765
    # then visit http://127.0.0.1:8765/

## Files
- `index.html`: page structure (hero, ranking, alerts, calculator, dynamic explainer, demo newsletter/X, footer)
- `styles.css`: mobile-first styles, light/dark (follows system; toggle in header)
- `app.js`: rendering, sortable table, calculator, inline-SVG chart. No network calls.
- `data.js`: **all tariff data**. Edit this weekly.
- `screenshots/`: Playwright screenshots (desktop 1280 full page, iPhone 390x844, calculator in use, dark mode)

## Weekly update checklist (data.js)
1. For each plan, re-check the supplier source URL(s) and update `ev.now`, `day/night/peak`, `standing.now`, `checked`.
2. When a supplier announces a change, set `ev.next`, `ev.nextDate`, `standing.next`, and add an entry to `alerts` (newest first).
3. After a change takes effect, move `next` to `now` and set `next: null`.
4. Mark anything you calculated as `"derived"` (with a note). Mark anything you couldn't confirm as unverified. Never invent numbers.
5. Refresh `wholesale.hourly` / `avg2to5` from SEMOpx day-ahead results (SEMO reports API, report EA-001, ROI-DA market).
6. Update `meta.asOf`.
