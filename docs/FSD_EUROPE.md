# FSD Europe atlas: editorial and operating guide

This replaces the previous recognition/vote meters with separate national permission, manufacturer availability and customer-observation records. It covers EU27 plus UK, Norway, Switzerland and Iceland. A country on Tesla’s current list does not establish entitlement for any particular car. Unknown hardware, software and rollout dates remain unknown. National recognitions are not EU committee votes.

## Step 1: evidence and design

`data/fsd-europe.json` is the editable source. Every claim references typed original sources, with claim dates distinct from source checks. `fsd-europe-model.js` validates the data. `fsd-europe-view.js` renders both saved HTML and browser updates. The map is a checked-in Natural Earth public-domain asset, with no external map request. The initial HTML contains all 31 dossiers, dated records, evidence and comparison examples; navigation works without JavaScript.

The atlas keeps the site’s logo, Inter/Orbitron/IBM Plex font families and dark/red brand direction, with light-theme support. It adds a country inspector, searchable library, keyboard-accessible map, permission/availability layers and accessible view navigation. The homepage and global Europe rows derive the manufacturer-listing summary from the same data. Approximate national-recognition vote meters and the false December 1 countdown were removed. December 2026 remains an unconfirmed month-only report.

The imported country context is retained but labelled as imported reporting. Not every historical source has been independently rechecked. Source URLs, publication dates and actual checked dates are visible. An inaccessible source never changes a country to approved or rejected.

## Step 2: updates, history and profiles

`.github/workflows/fsd-europe-source-checks.yml` checks public authority and manufacturer pages daily at 05:15 UTC and on manual dispatch. It compares normalized main text (or bounded PDF fingerprints) with the initial/reviewed baseline. Retrieval failures preserve the last successful record and pending-review state. It publishes only hashes, timestamps and retrieval status, not copies of third-party articles. A first baseline is not a verified decision. HTML layout changes and dynamic pages can cause false positives or inaccessible results; review the original source.

To review a flag:

1. Open the source from the tracker’s Changes review queue. Check the legal/manufacturer wording and scope.
2. If a fact changed, edit its independent country field and evidence in `data/fsd-europe.json`, add a dated event, and update `revision`/`updated`. Use a full date only when the source establishes that date. Do not infer customer installations from legal recognition.
3. Run `node scripts/build-fsd-europe.mjs`, then `sh scripts/rebuild-js.sh`. Review and merge the resulting changes.
4. To acknowledge reviewed source content, manually run the source-check workflow with `review_source` and its current `observedHash` as `review_hash`. Acknowledgement clears a content-change flag only. It cannot approve a country or clear an inaccessible fetch.

Country status changes require editorial review; source retrieval and review-queue updates are automatic. The normal homepage workflow regenerates saved HTML and bundles from the JSON. Recognition history replays only dated national-recognition events, never historical owner telemetry. Nine substantive country profiles have stable canonical URLs under `/fsd-europe/`; other records remain in the atlas rather than generating thin pages.

## Step 3: reader tools

Country comparison and border-trip guidance keep legal scope, Tesla market listings and vehicle eligibility separate. Registration country is context, not an eligibility determination. The tracker does not know a VIN, route position or actual vehicle permissions. Tesla’s own current app/support conditions remain the personal check.

Country follows and the selected-country preference stay in local browser storage. Following a country filters the dated journal; it does not subscribe anyone to email or push. No newsletter checkbox or consent flow changed. Country/comparison URLs are shareable. JSON downloads contain curated summaries with source links; SVG status cards include the editorial dataset date. No paid service, Tesla owner OAuth or commercial feed was introduced.

## Validation and known limits

Run `node tests/fsd-europe.test.mjs`, `python -m unittest discover -s tests -p test_fsd_europe_sources.py`, then `python tests/fsd-europe-browser.py` with Chromium/Playwright installed. CI also checks existing tracker/software tests. Browser checks cover 320/390/768/1440 layouts, dark/light themes, all views, history playback/stop, country follows, comparisons, trip changes, downloads, no-JavaScript records and country profiles.

The Tesla list is manufacturer-reported availability, not independent live fleet telemetry. Countries have different evidence quality. No owner location is inferred. Border restrictions and hardware/build eligibility can change independently. The source-check schedule depends on GitHub Actions being enabled, external pages remaining accessible and GitHub scheduling; it is not a real-time regulatory feed. Editorial source review, any custom notification service, legal text changes and paid datasets remain human decisions.

Additional regression note: the legacy `scripts/test-intelligence.mjs` home-clock assertion expects wording absent from the current main homepage; its other 46 assertions pass. The homepage content was refreshed from main and only its Europe summary and bundle references were edited. The maintained tracker/software, explainer and new FSD Europe suites pass.
