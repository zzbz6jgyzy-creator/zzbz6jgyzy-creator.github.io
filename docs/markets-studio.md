# Markets desk

The old TSLA/SPCX switch changed the external chart while financial cards stayed on Tesla. `/tsla.html` is now a complete company-aware Markets desk, preserving the site's typography, logo, navigation, newsletter and red identity. Tesla uses the red accent; SpaceX uses a secondary ice-blue accent.

## What changed

- Editorial hero and source-dated revenue snapshot, accessible original SVG graphics, sticky section navigation and a persistent company/measure selection.
- A single TradingView stock chart, requested only on explicit opening. Changing company replaces the chart. Provider failure offers retry and a full-chart link. Dark/light themes follow the site setting. No quote is scraped, cached or inferred.
- Native revenue, operating-income and capex charts; negative operating income uses a visible zero baseline. Missing quarters occupy blank slots. Exact source tables and CSV remain available without JavaScript.
- Company-aware revenue mix, operating context, cash bridges, original reporting and related tools. Both companies remain visible in saved HTML for readers without JavaScript and search crawlers.
- Manually entered price-return calculator with optional fractional shares, inline validation, clear/reset and total-loss handling. Changing company clears all inputs. Only company and chart measure are stored locally; calculator inputs never are.
- Shared-calendar financial events retain date precision. An expected month does not become an invented exact day or time; undated earnings releases stay unconfirmed.
- Eight financial definitions, original-source links, explicit data timing, updated metadata, CollectionPage/Dataset JSON-LD and searchable section records.

## Financial sources and limits

Reviewed 25 October 2026. Money is stored in USD millions; the page displays USD billions and the CSV exports exact source units.

- Tesla Q3 2026 update: https://assets-ir.tesla.com/tesla-contents/IR/TSLA-Q3-2026-Update.pdf (financial summary and segment tables). Five comparative quarters. Net income is attributable to common stockholders. Q3 free cash flow is company-reported operating cash less capex.
- SpaceX Q3 2026 release: https://www.sec.gov/Archives/edgar/data/1181412/000162828026066482/spaceexplorationtechnologi.htm . Q3 2025, Q2 2026 and Q3 2026 comparative data. Unsaved quarters and unavailable fields stay missing. The cash statement covers **nine months**: operating cash 13,097 minus reported capex 48,069 equals **−34,972**. This is explicitly an editorial nine-month bridge, **not company-reported quarterly free cash flow**. Source notes identify excluded capitalized interest and rebates.
- Nasdaq instrument pages and TradingView symbol pages verify NASDAQ:TSLA and NASDAQ:SPCX. TradingView embeds supply their own feed timing. An iframe opening confirms only the integration, not price freshness.

Quarterly results are deliberately editorially maintained, not an unsourced financial API. Calculated percentages use exact saved figures and can differ from whole-number rounded percentages in company releases. Cross-company definitions differ; the page states those limits.

## Updating

1. Review a new original company release. Edit `data/markets-studio.json`: append comparative quarters in chronological order, retaining null unknown fields; update segments, cash-period notes, context, source/publication dates, review date and the next-results record. Never fill quarterly cash from year-to-date values.
2. Run `node tests/markets-studio.test.mjs` and `node scripts/build-markets-studio.mjs`.
3. Rebuild JS using `sh scripts/rebuild-js.sh`; commit generated HTML, CSV, search data and bundles alongside source changes.
4. Run `python tests/markets-studio-browser.py` with Chromium/Chrome installed. The dedicated PR workflow runs the source, deterministic-build and browser checks automatically.

The existing homepage pre-render workflow now invokes the Markets builder and stages its CSV. As shared reporting/calendar records change, generated selections refresh with the site build. A browser filters expired events using its current date. Saved financial data older than 120 days show a check-the-source notice.

## Validation

14 model/build tests cover source reconciliation, exact values, missing quarters, negative comparison bases, calculator edge cases, coarse dates, escaped content, safe links, preferences, CSV and deterministic generation. Browser checks cover 320/390/768/1440 widths in both themes, no JavaScript, blocked storage, blocked charts, legacy `#spcx`, stale figures, selector/keyboard flows, calculator clearing, persistence, chart lifecycle and theme changes. The provider is a deterministic fixture; it is not a test of a real quote's accuracy. Previews are in `docs/previews/markets-*` and CI artifacts.

## Later decisions

- A licensed real-time feed, market-cap/valuation engine or portfolio/brokerage connection would require a separate data and product decision. None is needed for this release; no paid service or API key was introduced.
- More historical quarters can be added after checking original filings. Keep missing periods honest until that review happens.
- A custom social-sharing image could replace the site's existing brand image later.
