# Cybercab and Tesla Robotaxi workspace

This rebuild combines the Cybercab rollout and Tesla Model Y Robotaxi service at the existing `/cybercab.html` URL. The separate Robotaxi game is unchanged.

## What changed

The former long page becomes four linked views: Overview, Fleet, Cities and Evidence. The saved HTML includes every city record, registry observation, source and comparison example; JavaScript adds filters, map selection, history replay, local follows and downloads. Seven substantive city profiles have stable canonical URLs. The studio hero uses responsive AVIF/WebP assets, with the smallest AVIF about 10 KB and largest about 37 KB. Reduced-motion support, keyboard controls and light/dark page themes are included.

The hero is a studio adaptation of Dllu’s existing CC BY-SA 4.0 photograph. Its background/lighting were adapted with AI assistance. It is labelled and credited as editorial artwork, not an official Tesla render or a fleet observation. Image attribution and the share-alike licence are in `assets/mobility/ATTRIBUTION.md` and linked from the page.

The old nationwide fleet percentage combined Texas registrations with older regional estimates. Fleet share now uses only the same Texas registry snapshot for both vehicles. Old regional estimates remain separately visible with their original dates. Capacity, a company-reported active fleet and a registration count are independent measures. No live vehicle positions, fabricated wait times or nationwide active-fleet total are displayed.

## Evidence corrections and research

Tesla’s current general Robotaxi support page lists Austin, Dallas, Houston, Miami, Orlando and Tampa. Its separate Cybercab FAQ lists Cybercab rides in limited parts of Austin. Several former testing labels were outdated; they were replaced with manufacturer-listed service records, with supervision separately attributed. The shorter Model Y list in the Cybercab FAQ omits Orlando, while the general page includes it; this discrepancy is visible, and city-specific vehicle attribution remains unresolved there.

Tesla’s Q3 report supports the 3 September Austin Cybercab launch, reported Austin operating hours and installed annual manufacturing capacity above 125,000. Installed capacity is not annual output. Tesla’s safety report is operator-level, covers a specified period and excludes onboard-monitor miles; it is not presented as Cybercab-only safety data.

The registry mirror changed during the audit. The build includes the complete public response retrieved at its recorded file timestamp, with its timestamp retained rather than relabelled as a later fetch. Vehicle counts are derived, never baked into the design. The ingest validates that the unique VIN list matches the source’s declared complete fleet count. Unknown vehicle prefixes remain `other`. Daily records remain unique by UTC day, with known intraday observations retained separately.

Benchmarks reviewed: Robotaxi Tracker, Pioneerlands Cybercab Counter, Cybercab Hunter, Texas AV Tracker, Robotaxi Signal, FSD Database, Platform Aeronaut, Robo Tracker, MyCybercab and Austin Cyber Fleet. Useful patterns include city-first navigation, distinct registry/observation measures, source-dated cards and accessible history. A competitor’s community sightings, camera network or proprietary feeds cannot be recreated by relabelling registration data; no such coverage is claimed here.

## Data and updates

- `data/robotaxi-evidence.json`: editable city/vehicle facts, typed sources, dated events, targets, conflicts and methodology. Update `updated` and `revision` when editorial facts change.
- `data/robotaxi-tx.json`: Texas registry observations, via the explicitly named FSD Database mirror of TxDMV. The direct official portal is linked; its public page is a JavaScript shell and is not claimed as a directly ingested VIN feed.
- `data/robotaxi-fleet.json`: separately scoped regional estimates and dates.
- `data/robotaxi-areas*.json`: retained app-derived shapes and area history. The canonical upstream is Robotaxi-Tracker/robotaxi-service-areas. Its current licence is CC BY 4.0, replacing the older MIT metadata. Visible attribution is retained. Future upstream shape reads are pinned to one Git revision per run.
- `data/mobility-snapshot.json`: generated public aggregate for saved HTML and browser refreshes. It excludes raw VIN lists. Each source has its own clock; malformed or older records retain the last good version independently.

The existing registry/area workflow runs at **05:35 and 17:35 UTC**. It rebuilds the aggregate, main page and city profiles. The homepage workflow also regenerates the workspace when its source inputs change. A separate daily source-check workflow at **06:15 UTC** compares primary-source content hashes and exposes changed or inaccessible pages. It never promotes a city automatically.

Review source changes by opening the original page. Edit the evidence JSON only when the source supports the fact and its scope. Add a dated event with day or month precision as established by the source. A source hash can be acknowledged through the workflow’s `review_source` and `review_hash` inputs; acknowledgement clears a content flag, not an unavailable fetch or a city status.

Build with `node scripts/build-mobility.mjs`, then `node scripts/build-js.mjs` and `python scripts/inject-js-bundles.py`. The existing `build-tracker-snapshots.mjs` delegates to this build when it sees the new workspace mount; legacy fixture/page paths remain supported.

## Reader tools and limits

Follows stay in local browser storage; no email or push subscriptions are created. City/vehicle/range/comparison links are shareable. Downloads include dated city SVG cards, registry CSV and curated JSON with sources. Historical map replay shows dated service evidence, including retrospective reports; it is not a complete reconstruction of past fleet positions. The retained previous-boundary control appears only where a prior shape exists.

Use Tesla’s app for actual ride allocation, pickup areas, fares, wait times and current operating hours. A map boundary is not a Cybercab-specific geofence or airport-access guarantee. No precise launch day is invented for a month-only target. An inaccessible source and unavailable new data preserve the existing sourced record and date. Daily source checks can produce layout-change false positives and depend on GitHub Actions and upstream availability.

A first-party community observation network, verified ride receipts, camera data or reliable live fare estimates would require additional data access and an editorial/moderation process. They remain later decisions. This implementation introduces no paid map subscription, external backend, new Supabase table or Tesla owner OAuth flow.

## Validation

The new model/build suite covers independent vehicle access, compatible registry denominators, date/reference validation, per-source stale/failure retention, genuine baselines and negative changes, dated replay, saved HTML, escaping, provenance and repeatable builds. Source-check tests cover baseline/change/failure handling and acknowledgement. Browser checks cover 320/390/768/1440 layouts, both themes, all views, follows, comparison links, replay stopping, CSV/JSON/SVG downloads, no-JavaScript records and seven city profiles. Existing tracker/software tests remain in the checks.
