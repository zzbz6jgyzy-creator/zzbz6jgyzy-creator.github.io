# Software tracker: foundation and presentation batch

`updates.html` now provides Overview, Releases, Compare and Rollouts views, with a persistent desktop rail and a compact sticky phone navigation. The shared logo, global menu and site themes remain in the existing shell. Native anchors, release disclosures, source tables and comparison excerpts remain readable without JavaScript. The saved page includes the full core workspace rather than leaving its key sections empty until a fetch completes.

## Scope

This is the first review batch from the approved tracker plan: layout/navigation, search and country filters, explicit FSD mapping filters, saved release-note reading, source freshness and accurate first-sighting/sample measures. Country choice can start from the existing local My Tesla profile and is then remembered independently; this does not turn a country observation into a verified model/hardware cohort.

Full permitted release-note ingestion, feature-level applicability, dedicated canonical release pages, deeper installed-version comparisons and the feature reference library remain subsequent batches. Current source excerpts are explicitly labelled and retain links to the complete source. No new text/image licence, commercial feed, vehicle-account permission, database change or notification service is assumed.

## Shared rendering and data rules

- `software-data.js` supplies the pure source rules to the browser and static generator. Versions sort by actual first sighting, with numeric version comparison only as a tie-breaker. Every numeric version component is compared.
- `software-view.js` produces semantic HTML from the snapshot, retained history, per-provider extras and maintained `fsd-data.js` mappings.
- `scripts/build-tracker-snapshots.mjs` regenerates the owned `software-workspace` block using those same modules. Existing scheduled snapshot and homepage builds already call this generator.
- `updates-v3.js` enhances the saved page with tabs, filters, release dialogs, comparison sharing and optional globe playback. It validates incoming snapshots, protects newer primary/provider data, and keeps the saved page on failure. A refresh arriving during interaction waits for an explicit apply action.
- Shared bootstrap history keeps counts but omits historical country breakdowns to limit the initial payload. The optional globe loads the complete history when requested. Missing breakdowns are labelled unavailable, never fabricated as zero.

The primary overview selects the latest first sighting rather than the largest-looking build number. The prominent next-build prediction is removed. Saved-count changes remain signed and are labelled net changes, not total installations. Chart x coordinates use actual saved timestamps and missing points create gaps.

Provider timestamps stay independent. TeslaFi shares more than 24 hours older than the primary snapshot are withheld from the comparison; an explicitly dated disclosure preserves access to that older snapshot and its pending counts. The threshold is a presentation rule relative to the displayed primary snapshot, not a claim that data under 24 hours old is real-time.

FSD mappings come only from explicit source hardware fields or the maintained global tracker; no hard-coded European/Oceania fallbacks remain. A mapping is not a VIN entitlement or proof of regional availability. Unknown hardware records remain visible in the unfiltered library and do not become matches for a hardware-specific filter.

Comparison distinguishes matching titles, wording differences and titles found only in one saved excerpt. Incomplete/missing notes are not called feature removals. Text and attribute escaping also protects the inline JSON bootstrap against embedded closing-script text.

## Navigation and accessibility

The four views support keyboard tab navigation with arrow/Home/End keys. Search and selects have visible labels. Country controls stay available on phones and share one selection. Tables scroll within labelled focusable regions. Release dialogs use native focus containment, Escape dismissal and focus restoration. Existing anchors (`mycar`, `waves`, `sample-waves`, `check`, `ladder`, `globe`, `diff`) route to the corresponding view. Release and comparison queries provide shareable entry points before canonical release pages arrive in the next batch.

The globe is loaded only after a reader requests it; scrolling into Rollouts does not fetch Cesium or imagery. Playback stops on view/tab visibility changes. Source credits are not hidden. On load failure, the country table and saved timeline remain useful. Reduced-motion, light theme and dark theme styles are included.

## Build and verification

Run:

```
node scripts/build-js.mjs
node scripts/build-tracker-snapshots.mjs --page updates
python scripts/inject-js-bundles.py
node --test tests/tracker-snapshots.test.mjs tests/software-workspace.test.mjs
python tests/tracker-browser.py
python tests/software-workspace-browser.py
```

The software workflow runs source/snapshot tests, syntax checks, existing tracker regression checks and the broader workspace browser suite for pull requests. It uploads phone/desktop light/dark screenshots as a seven-day review artifact. Browser routes supply local first-party files and block external requests: these are functional/layout checks, not live speed measurements. The broader suite exercises search, filters, modal focus, keyboard navigation, share links, country-profile defaults, legacy anchors, deliberate globe failure and no-JavaScript/blocked/older/malformed/partial-data cases.

The sandboxed Node runner can use `--test-isolation=none` where worker-process sockets are restricted. Chromium requires the execution environment's socket permission; this is independent of whether the test routes request external URLs.


## Automatic updates and maintenance

The existing `Snapshot Tesla updates` GitHub Actions workflow (`.github/workflows/updates-snapshot.yml`) is scheduled at minutes **20 and 50 of every hour, UTC**. GitHub may delay or skip a scheduled run; this is a polling schedule, not a freshness guarantee. The workflow also supports **Run workflow** on the `main` branch in GitHub Actions.

1. `scripts/snapshot-updates.py` requests Teslascope's public software API and individual release records. It currently keeps up to **16 builds**, considering the source's first 24 valid version identifiers plus its `latest` endpoint. Version identifiers are accepted across year boundaries. These records include observed car/country counts, first/last sightings, explicit FSD hardware fields and saved release-note excerpts. The importer currently limits each build to eight feature excerpts and 220 characters per description; it does not ingest a complete release archive.
2. `scripts/snapshot-extras.py` refreshes Teslascope's recent-update feed each run. TeslaFi is attempted on manual runs and in the first 35 minutes of even-numbered UTC hours, aiming for roughly two-hourly requests. Delayed GitHub runs can miss that window. Each provider retains its own successful-fetch timestamp and previous data on a source failure.
3. The job commits `updates-live.json`, reconstructs saved count/country history from committed snapshots, keeps one history point per approximately three-hour bucket, and rebuilds the software page's saved HTML with the shared renderer. The history is retained Git snapshots, not continuous vehicle telemetry.
4. GitHub Pages publishes the committed files. The browser displays the saved page first, then requests the published primary JSON, history and extras once on page load. It does not poll continuously while a page stays open; reload to request newer published data. Refresh arriving during interaction waits for the reader to apply it.

Source outages retain the last successful data rather than making up observations. The primary importer rejects empty listings, an absent/zero observed fleet, all-zero observations, negative counts and counts exceeding the reported fleet before writing. Per-provider dates remain visible; the top-level extras timestamp does not establish that TeslaFi refreshed successfully. As checked on 23 October 2026, the primary/recent feed had refreshed at 14:57 UTC, while TeslaFi's retained snapshot was from 19 October and was correctly withheld from current comparisons.

The additional `fsd-data.js` global FSD mappings are maintained editorial data, not automatically refreshed by this workflow. Deeper release-note curation, applicability checks and an expanded historical release library also need their own subsequent ingestion/editorial work. This tracker does not connect to a reader's vehicle or send software notifications.

## Build timestamp conflict follow-up

The homepage and JavaScript workflows both rebuild hashed bundles. On the 23 October merge, they produced identical bundle content but different wall-clock `generated` values in `assets/js/manifest.json`; the homepage job then failed while rebasing that manifest onto the other job's commit. The site deployment and tracker checks succeeded separately.

The bundle manifest now describes only content: bundle paths, byte sizes and input filenames. Identical inputs generate byte-identical files, independent of build time, so the timestamp-only conflict and unnecessary timestamp-only commits disappear. It does not remove the real source timestamps shown to readers. It also does not automatically resolve unrelated simultaneous edits to generated pages or different source changes.

`tests/js-bundle-build.test.mjs` builds with two deliberately different clocks, checks that a source edit changes only its bundle, and reproduces the concurrent homepage/bundle push-and-rebase sequence in temporary local Git repositories. `tests/test_software_import.py` covers year rollover, unusable upstream data and retention of the previous file. `.github/workflows/build-pipeline-checks.yml` runs these checks without contacting data providers or writing to the live repository.
