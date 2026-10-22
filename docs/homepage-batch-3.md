# Homepage tracker consistency — batch 3

## Source verification

On 22 October 2026 at 12:36 UTC, the existing importer’s exact URL and User-Agent received HTTP 200 from the FSD Database Texas registry page. Its unchanged VIN parser extracted 858 entries: 351 Cybercabs and 507 Model Ys. The latest scheduled GitHub run independently logged those same counts at 06:00:23 UTC: https://github.com/zzbz6jgyzy-creator/zzbz6jgyzy-creator.github.io/actions/runs/39731258324 . This confirms current access and parsing, not a guarantee that the external service will remain available.

## Root cause and changes

The saved homepage and browser refresh used manually maintained `cybercab-data.js` statistics, while the detailed tracker and changes feed used `data/robotaxi-tx.json`. They currently both show 351, but independently maintained sources could drift again. The registry refresh did not rebuild the homepage, and its bot commit does not trigger the separate homepage push workflow.

- Added `home-tracker-data.js`, shared by homepage pre-rendering and browser hydration. It selects the latest valid, nonnegative integer count from the existing registry snapshot. Count date and checked date come from that snapshot. Labels distinguish Texas registrations from cars in service.
- The browser keeps the saved card while fetching the current snapshot; it does not replace it with an older embedded statistic first. Rejected requests, malformed JSON and invalid counts retain the last good saved value.
- `scripts/build-home.js` uses the same selector and adds `--trackers-only`. The refresh job can update saved tracker cards without rewriting other homepage regions or other pages. An unavailable/invalid snapshot preserves the existing saved Cybercab card, with the existing curated statistic used only when no saved card exists.
- The registry workflow refreshes the intelligence feed and saved homepage tracker cards in the same commit as the data. The homepage workflow also watches the registry JSON for manual updates.
- The registry importer now fails visibly on an unexpected HTTP-200 page shape instead of reporting success while skipping it. Its accepted-response checks remain intact; failed extraction leaves the previous snapshot untouched. HTTP failures already fail without overwriting the snapshot.
- Rebuilt only the homepage JavaScript bundle, updated its manifest entry and homepage reference, and regenerated the saved tracker strip. No count was invented or manually substituted in the source data.

## Validation

- Live source probe with the importer’s exact request and the latest actual GitHub job log agreed on 351 Cybercabs and 507 Model Ys.
- Shared-selector tests cover unsorted history, valid zero counts, formatting, dates, invalid/future records, required source/checked metadata and safe fallbacks.
- Tracker-only build integration verifies that all other homepage bytes remain unchanged, the newsletter CTA survives, and malformed JSON preserves the previous count.
- Three Python importer tests cover accepted records, an unexpected HTTP-200 page and HTTP 403, including preservation of the last good snapshot on failure.
- 36 bounded browser checks passed across current desktop/mobile data, delayed newer data, HTTP 403, malformed JSON, invalid counts and JavaScript disabled. No request to the external registry was made by these fixture tests.
- The actual intelligence-runner then tracker-only rebuild succeeded in an isolated copy of the current repository data. Workflow YAML parses, JavaScript syntax checks and diff whitespace checks pass.

## Remaining recommendations

The detailed tracker’s manually written historical/editorial statements are not rewritten by this batch. It continues to read the same registry JSON for its live count. Broader request deduplication, stale-data presentation, editorial refinements and audits of other pages remain separate approved batches. If the upstream blocks access or changes its markup later, fix the public data integration deliberately; do not bypass a challenge or present an unverified count as newly checked. No paid service, credential or new production package is required here.
