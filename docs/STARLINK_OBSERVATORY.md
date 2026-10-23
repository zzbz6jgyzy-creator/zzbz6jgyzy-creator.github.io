# Starlink observatory

The existing tracker had strong orbit and sky-finder foundations, but most facts were JavaScript-only, sections required a long undirected scroll, the count source date could be obscured by a newer orbital timestamp, and unknown hardware defaulted to V2 Mini Optimized.

This revision adds a bespoke orbital illustration from actual catalogue records, section navigation, an accessible satellite directory and inspector, local saved satellites, SGP4 time exploration, hardware schematics, altitude distribution, lifecycle definitions and a sparse snapshot journal. The established logo, Inter / IBM Plex Mono typography, navigation and newsletter remain. Orbital blue supplements the existing charcoal / red brand. Hardware schematics are editorial, not engineering drawings. Natural Earth outlines are public domain.

## Sources and evidence

- Counts: https://planet4589.org/space/con/star/stats.html — Jonathan McDowell, CC BY. Source dated 15 October 2026 at this review. The live source was fetched directly and matched the saved count; no inferred post-source launch additions were made.
- Orbits: https://celestrak.org/NORAD/elements/ — dated GP/TLE elements; latest element in the initial catalogue is 21 October 2026. The page exposes newest, median and oldest epochs, and each selected satellite's own epoch.
- Hardware buses: https://planet4589.org/space/gcat/ — Jonathan McDowell, CC BY 4.0. New unmatched buses remain `unknown`, never guessed as Optimized. The original saved catalogue predates this fix; classifications are replaced by the next normal source refresh.
- Availability: https://www.starlink.com/map — official service map. Orbital geometry cannot establish coverage, ordering availability, capacity or latency.
- Direct to Cell: https://direct.starlink.com/ — official product context, not a per-country service assertion.
- Observing: https://www.heavens-above.com/StarlinkLaunchPasses.aspx — complementary observing tools. Sky-finder matches are geometric candidates, not sightings.

Benchmark review on 23 October 2026: https://satellitemap.space/ offers a broad WebGL constellation explorer; Heavens-Above provides observation-focused pass tools; https://starlink.sx/ now displays its creator's retirement notice. We retained useful existing tools instead of adding placeholder launch/event tabs. No claim to outperform every tracker is made.

## Definitions

Counts and the orbital catalogue have separate dates, inclusion rules and purposes. Never substitute the catalogue total for the independent in-orbit count. `working` is not a service measurement. `operational` describes placement in an orbital shell. McDowell's `down` includes failed orbital attempts: the visible reentry count is `down - failedToOrbit`. Retired Tintin / V0.9 prototypes contribute 62 launched and zero in orbit. History contains only saved source observations; no daily curve is invented.

Positions are SGP4 predictions, not measured telemetry. The first SVG view is calculated at the newest saved element epoch, with an explicitly sampled distribution and enlarged dots. The interactive explorer propagates the full valid catalogue in a local worker and renders a deterministic subset for mobile performance. Its clock is explicit. It does not infer illumination, naked-eye visibility, internet capacity or working status for individual satellites.

## Updates

`.github/workflows/starlink-refresh.yml` already runs at 01:25, 09:25 and 17:25 UTC, plus manual dispatch. CelesTrak policy (https://celestrak.org/usage-policy.php) allows GP downloads once per update, currently every two hours; the existing eight-hour central schedule stays within that cadence. Visitors never query CelesTrak.

After successful source updates, `node scripts/build-starlink-observatory.mjs` rebuilds saved HTML, real source-epoch positions, altitude bins and `data/starlink-observatory.json`. The job then rebuilds bundles and commits those artifacts **and `data/starlink-history.json`**. Previously the history file was omitted from the commit list. A source failure must retain its previous valid artifact; the displayed source epoch is never replaced with the page build time. Scheduled GitHub jobs can run late or be disabled; this is not a refresh guarantee.

Canonical files:

- `starlink-live.js`: generated count source, not manual editorial totals.
- `data/starlink.json`: generated same-origin orbit / identity catalogue.
- `starlink-model.js`, `starlink-view.js`: pure validation and saved rendering.
- `templates/starlink-sky.html`: existing sky-finder markup, with clearer candidate language.
- `starlink-observatory.js`, `starlink-orbit-worker.js`: optional directory / rendering / propagation.
- `starlink-observatory.css`: scoped responsive theme.
- `assets/starlink/land.json`: simplified Natural Earth outlines, https://www.naturalearthdata.com/.

Run `node scripts/build-starlink-observatory.mjs`, `node scripts/build-js.mjs` and `python3 scripts/inject-js-bundles.py` after relevant edits. Commit the regenerated page, snapshot, manifest and changed hashed bundles; remove superseded bundles. The old `starlink-tracker.js` is retained as historical source but no longer included in the active bundle.

## Performance, privacy and fallback

Counts, definitions, hardware, sources and the source-epoch visual are saved HTML. The full 2MB orbital catalogue and propagation worker load when the explorer is requested. The sky finder loads its existing worker when that section approaches the viewport; an existing saved location can initiate its calculations. Saved satellites stay in localStorage on this device. City search sends a query to Open-Meteo; location and compass permissions remain optional. The optional Cesium fly-through is preserved and loads additional third-party scripts / imagery on request. Animation pauses off screen / in background tabs and defaults to paused for reduced motion. A failed, malformed or older catalogue keeps the saved facts visible and offers retry.

## Validation

`node --test tests/starlink-observatory.test.mjs`; `python3 tests/test_starlink_sources.py`; `python3 tests/starlink-observatory-browser.py` (Playwright / Chromium). Browser checks cover 320 / 390 / 768 / 1440px, both themes, reduced motion, real worker propagation, search, filters, inspector, local saves, time controls, CSV, no-JavaScript and blocked / malformed catalogues. CI reproduces saved artifacts and bundles.

## Recommendations needing a later decision

- Historical expansion: ingest McDowell's dated daily dataset with its own definitions / reconciliation before adding a longer growth timeline.
- Optical pass prediction: add solar illumination / darkness calculations and validated observer coordinates before promising visible passes; weather and brightness remain uncertain.
- Operational telemetry / actual routing: needs operator or consented terminal data; public orbital elements cannot provide it. No paid API is needed for this release.
- An alternate user-selected map / photorealistic base layer could be added later, with licensing, bandwidth and availability review. The default experience needs no map token, subscription or external imagery.
