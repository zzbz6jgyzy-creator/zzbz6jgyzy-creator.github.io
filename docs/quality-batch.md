# Homepage, editorial dates and mobile baseline

The homepage uses optional `homeTitle` and `homeSummary` in `data/articles.json` for a concise lead. Article H1s, full archive titles, reporting and search metadata stay unchanged. Future stories fall back to their normal card copy; do not truncate headlines automatically. The article index generator preserves these optional fields.

On phones the lead keeps the same image and typefaces with a shorter crop and tighter spacing. Upcoming homepage streams use compact shared server/browser markup: date, time-zone or NET/TBC label, a minute-level countdown when the time is known, official coverage, calendar and source links. The existing actual-live treatment and click-to-load players remain. Other pages keep their existing stream cards.

Normal bundle regeneration also removes redundant standalone `grow.js` tags where the same newsletter code is already included in the core bundle. Newsletter signup behavior is unchanged.

## Editorial timestamps

`scripts/editorial-dates.py` compares first-parent Git revisions of each article's text, citations, image/alt text and video/audio sources. Changes to generated navigation, author/related/newsletter/contents blocks, CSS, script bundles, loading attributes or heading IDs do not make a story editorially updated. `datePublished` remains the registry publication timestamp. `dateModified` and article sitemap `lastmod` use the last supported editorial change. Sitemap dates normalize to UTC.

The normal homepage build already checks out full history. Without full history, a parseable article or a committed timestamp for the current editorial content, the generator omits unsupported modification metadata rather than inventing a date. Genuine editorial edits must be committed before running the SEO build. Historical dates are rebuilt from history; no content or publication dates are rewritten.

## Performance baseline

The `Editorial dates, homepage and mobile baseline` workflow audits the **currently deployed** homepage, an article and the software tracker on a normal GitHub runner. Each page gets three Lighthouse 13.0.1 mobile runs using its default simulated mobile throttling. HTML/JSON reports, settings, audit version and median LCP/CLS/TBT/performance results are saved as workflow artifacts and job summaries. These are advisory lab measurements; they are not real-user Core Web Vitals, and TBT is not INP. Repeat the manual workflow after deployment for a comparable after measurement. External requests and live data can vary between runs.

The public PageSpeed API returned HTTP 429 (shared API quota exhausted) during preparation; no score from that failed call is reported. Proxy-intercepted local browser tests verify layout and interactions only; their timing is not a live-site performance baseline.

No paid services, account settings or database migrations are required. Changes to editorial policy, account features and analytics remain separate recommendations.

Validation: `python3 tests/test_editorial_dates.py`, `node scripts/test-home-tracker-data.mjs`, `python3 tests/homepage-quality-browser.py`, plus the existing wayfinding, membership and navigation checks.
