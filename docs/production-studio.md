# Tesla production desk

The `/production.html` overhaul preserves the site logo, Inter / IBM Plex Mono typography, red identity, global navigation, member integration and newsletter footer. It replaces the old fetch-only table with a complete saved page and progressive enhancement.

## Reader experience

- Quarterly spotlight and four contextual measures; choose any reported quarter.
- Zero-based SVG charts for production/deliveries, storage deployed, and delivery-minus-production. Quarter or annual/YTD grouping; all/latest eight/latest four periods.
- Reported Model 3/Y and Other Models delivery mix. No unsupported individual-model split.
- Two-quarter comparison, year-over-year/sequential presets, swap, shareable URL and clipboard fallback.
- A regional factory explorer with distinct vehicle/year and GWh/year capacities, reported `>` qualifiers and production/construction/ramp statuses.
- Full source table, year filtering, CSV download and linked primary sources.
- Local saved view, reset control, keyboard arrow/Home/End navigation, reduced-motion support, dark/light themes and complete no-JavaScript content.

## Data and update method

`data/production.json` remains the canonical quarterly source for the site. Existing 2025–2026 figures are retained. Four opened Tesla IR releases extend coverage to Q1–Q4 2024. `annualTotals` records Tesla's published 2024 and 2025 annual values.

Q1 2024 storage was published as 4,053 MWh: converted exactly to 4.053 GWh. Tesla's reported 2024 annual storage deployment is 31.4 GWh; individually reported quarters sum to 31.353 GWh. Annual charts use the published annual total. Vehicle totals reconcile exactly. Incomplete 2026 is explicitly YTD. Percentage comparisons use equivalent reporting periods; missing baselines remain missing. Charts never fabricate future quarters.

`data/production-studio.json` is the dated factory/editorial catalogue. Manufacturing capacities and statuses were checked against the Q3 2026 shareholder deck, published 21 October 2026, printed page 6 (PDF page 6). The original table was visually inspected. Map markers are regional groups, not exact site coordinates. Capacity is not current production, a forecast or an inferred utilisation percentage. Different capacity units are never summed.

Primary source: https://assets-ir.tesla.com/tesla-contents/IR/TSLA-Q3-2026-Update.pdf#page=6

Every quarter has its original release URL. All eleven releases were opened during the review. Competitor research included Beanvest, Midgard Finance, Brighter Finance and OhMyTesla; none supplies figures to this page.

When a new quarter is published:

1. Open the Tesla IR production/delivery release. Add its exact period, release date, totals and reported groupings to `data/production.json`.
2. At Q4, add the published annual totals; don't replace rounded annual energy with a quarterly sum.
3. Review the new shareholder deck and update factory period, publication date, capacities, statuses and results link in `data/production-studio.json`.
4. Enter a next-release date only if Tesla has confirmed it. Leave `published` null otherwise. A reporting quarter ending is not a release date.
5. Run `node scripts/build-production-studio.mjs` and `node scripts/build-tesla-overview.mjs`; run the tests. The existing homepage build does both as part of `build-noscript.mjs` and commits the generated CSV.

The page uses no paid service or API and doesn't scrape third-party estimates automatically. Accurate updating still requires editorial verification of official releases. The stale-data notice directs readers to Tesla IR if the saved dataset is over 120 days old.

## Implementation

- Model: `production-studio-model.js`, shared by the builder and browser.
- View: `production-studio-view.js`, shared HTML/SVG renderers.
- Browser: `production-studio.js`; reads embedded validated data, with no data fetch needed for first render.
- Builder: `scripts/build-production-studio.mjs`; writes the page, `data/production.csv` and five search entries while preserving unrelated search order.
- The production bundle replaces the old bundle and removes this page's unused intelligence bundle/CSS.
- Production owns its dated Dataset JSON-LD and CSV distribution. `scripts/build-seo.py` leaves it intact.
- The Tesla overview page/snapshot is regenerated because it consumes the shared production dataset. Its design is unchanged.

Storage key: `sd-production-desk-v1`. Only known quarter/metric/group/range/region choices are accepted. Choices are local to the browser, not account-synced. Shared comparison URLs include two quarter IDs only. Clipboard denial reveals a selectable link; storage denial keeps interactions working for the current visit.

## Visuals and performance

All charts and the manufacturing map are original SVG/HTML. No chart framework, map service, autoplay media or new licensed imagery is needed. Existing responsive AVIF/WebP factory images load lazily, with explicit dimensions. Gigafactory Texas photograph: Larry D. Moore, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Gigafactory_Texas_Building_1_June_2022.jpg), CC BY 4.0, cropped. The archival 2022 date is visible.

## Validation

- `node --test tests/production-studio.test.mjs tests/tesla-overview.test.mjs`
- `python tests/production-studio-browser.py` (Playwright 1.62.0, installed Chromium / Chrome)
- Responsive scenarios: 320, 390, 768 and 1440px, dark/light themes; mobile/desktop without JavaScript; blocked storage; stale snapshot; shared URL.
- Tests cover reconciliation, precision, annual totals, matching-period comparisons, unsafe sources, bounded preferences, CSV, source data, deterministic rebuilds and unrelated search-order preservation.

## Later decisions

No setup or paid tool is needed. Further historical coverage and new quarters require opened primary releases. Factory-specific realised output, individual-model estimates, sales forecasts and financial valuation are intentionally not inferred from capacity or grouped figures. Cross-device saved views would require extending the member preference backend; it isn't necessary for this page.
