# Promise Tracker

The redesigned `/promise-tracker.html` presents the existing source collection as a searchable evidence ledger. It preserves Supercharged Daily’s logo, font families and red, dark and light themes, while replacing the previous summary score with source status counts, an original claim matrix, project navigation and individual evidence histories.

The page includes cards and an interactive timeline, company/project/status filters, search, sorting, shareable filtered views, direct links to individual claims and a browser watchlist. Evidence panels bring together the statement, original source, target interpretation, revisions, supporting evidence, outcome and review date. Related tracker links lead readers to the wider context. The complete collection and expandable evidence remain in saved HTML when JavaScript is unavailable.

## What the numbers mean

`data/promises.json` remains the editorial source of truth and is unchanged by this redesign. Its current snapshot contains 64 claim records across Tesla, SpaceX and xAI. Those records are not 64 distinct products or milestones: several statements concern the same launch, first delivery or approval. Counts describe this selected collection; they are not a representative company delivery rate.

The five editorial status labels remain unchanged: Delivered, Delivered late, In progress, Missed and Revised. Passing a target window produces a review warning for an open claim, without automatically changing its status. Delivered records retain their recorded scope; a regional approval or first delivery does not establish worldwide availability.

This work improves presentation and source handling. It does not claim a fresh external fact-check of every statement or evidence item. Missing evidence is disclosed in the record rather than filled with invented content.

## Dates and source boundaries

- `data/promises.json.updated` identifies the saved source snapshot. Each record’s `last_verified` remains visible separately.
- `data/promise-studio-guide.json.reviewed` identifies the review of display precision and wording. It is not a new claim verification date.
- Year-only and month-only dates retain their original precision. The timeline uses broad intervals rather than inventing a midpoint or an exact countdown.
- The presentation guide supplies a target label, precision, approximation flag and explanation for every record. Quarter, half-year and year cutoffs represent the stated window, not a newly confirmed event date.
- The Cybertruck pricing record’s stored comparison date is not a promised pricing deadline. Its target is displayed as undated.
- The Terafab test-chip window spans May–June 2027. Its recorded volume target spans Q3–Q4 2028. Explicit `window_start` and exclusive `window_end` values preserve this broader source wording without editing the underlying cutoff.
- Where an evidence item lacks its own date, its source publication date is labelled as such. Exact-quote and paraphrase labels are preserved.

The original source links, photography and credits remain available. The claim matrix and timelines are original visualisations of saved editorial records, not live telemetry.

## Saved preferences and privacy

The watchlist and descriptive filters use the browser’s `sd-promise-ledger-v1` local-storage key. No account is required. The watchlist does not sync between devices and does not send push or email notifications. If storage is blocked, watchlist changes last for the current page visit and the page explains that limitation.

Shared URLs contain the selected public filters or a claim ID; they do not include the private watchlist. Search text can be included when the reader chooses to copy a filtered view. Existing claim-ID links continue to open the relevant evidence panel.

## Updating the tracker

1. Review the original statement and any new evidence. Edit `data/promises.json` deliberately, retaining source links, the claim’s scope, revisions and the appropriate verification date. Status changes require editorial judgment.
2. Add or revise the matching target entry in `data/promise-studio-guide.json` when the source wording or date precision changes. Every source record must have a presentation entry. Do not change a raw date just to make a chart look cleaner.
3. Run the builder and regenerate the existing JavaScript bundles:

   ```sh
   node scripts/build-promise-studio.mjs
   node scripts/build-js.mjs
   python scripts/inject-js-bundles.py
   ```

4. Review the generated `promise-tracker.html`, Promise Tracker entries in `data/pages.json`, hashed Promise Tracker bundle and `assets/js/manifest.json`. Confirm that unrelated generated changes are expected before committing them.
5. Run the checks below and review the page in both themes on a phone and desktop.

The general homepage build also calls this builder through `scripts/build-noscript.mjs`. Its workflow watches the source dataset and presentation guide, so source edits regenerate the saved snapshot. The page does not need a separate fetch of `data/promises.json` to display or filter its embedded source snapshot.

## Verification

The model suite covers source integrity, partial dates, broad target windows, URL safety, filtering, saved preferences, share privacy, timeline bounds, escaped rendering and deterministic generated output. The browser suite covers 320, 390, 768 and 1440 pixel widths in both themes, plus JavaScript-disabled, blocked-storage, stale-date, legacy-link, shared-view, malformed-snapshot and invalid-filter cases.

```sh
node --test tests/promise-studio.test.mjs
CHROMIUM_EXECUTABLE="$(command -v google-chrome)" python tests/promise-studio-browser.py
```

`Promise Tracker checks` uses Node 22, Python 3.12, esbuild 0.25.12 and Playwright 1.62.0 with the runner’s system Google Chrome. It verifies that rebuilding does not alter the committed page, search index or JavaScript assets, then uploads browser screenshots from `/tmp/promise-studio` for review. Passing results are reported in the pull request; the commands above describe the suite rather than asserting an unrecorded test run.

## Recorded validation and generated maintenance

Local validation passed 21 Promise Tracker model tests and all 16 browser cases. A separate 23-test SpaceX/Starship model run passed for the generated maintenance outputs. The existing SpaceX builder refreshes its saved schedule timestamp from the current calendar cache, and the Starship builder normalizes its media markup; those two generated HTML outputs are synchronized to keep their existing deterministic checks green. Their source catalogs and recorded facts are unchanged.

The six WebP screenshots in `docs/previews/promise-*` show both themes, phone and desktop layouts, the timeline and an evidence panel.

## Later editorial decisions

A full source re-audit, new claim selection and changes to status methodology remain editorial work. Account-synced watchlists or notifications would require a separate product decision and implementation. No paid service is required for the current page.
