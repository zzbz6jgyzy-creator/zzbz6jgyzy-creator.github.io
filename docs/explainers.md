# Visual explainers

The learning hub and four standalone lessons preserve the existing logo, font families, black/red palette, shared navigation and footer. Original lightweight SVG diagrams replace the dense all-in-one layout. Each lesson has a short answer, five interactive stages, a readable explanation, common misunderstandings, glossary, primary-source links and relevant tracker links.

## Editing and generation

- Edit `data/explainers.json` for copy and references; `scripts/lesson-graphics.py` for artwork; `explainers.css` and `explainers.js` for presentation and controls.
- Run `node scripts/build-js.mjs`, then `python scripts/build-explainers.py`. The builder reuses the shared shell from `explainers.html` and applies the existing bundle injector to each generated page.
- `python scripts/build-explainers.py --check` detects generated-file drift. The main build regenerates the pages and search entries. The SEO builder includes the lesson directory in the sitemap.
- Change the catalog's `reviewed` date only after a substantive reference review. That date is separate from the FSD comparison's tracker snapshot date.
- The FSD table is rendered from `fsd-data.js`, also used by the global tracker. Its optional small data bundle refreshes the table from that maintained source. If that bundle fails, the complete dated table and comparison controls remain usable. No manual duplicate release-version list.

## Reader experience

The hub groups illustrated lesson cards by SpaceX and Tesla. Each guide has its own canonical URL, metadata and Article/LearningResource plus breadcrumb JSON-LD. The site search index includes all four lessons. Old `#hot-staging`, `#catch`, `#fsd` and `#evasion` links redirect with JavaScript; without JavaScript, those anchors still locate the matching hub cards. Topic anchors remain native links.

Controls are opt-in: play/pause, previous/next, keyboard arrow navigation, scrubbing and restart. Playback stops offscreen or when the tab is hidden. Reduced-motion preferences suppress transitions. All five explanations remain visible without JavaScript. Hot/cold staging changes both the drawing and the caption. Native disclosure elements show common misunderstandings without a dependency.

Artwork is original, schematic and explicitly not to scale. It shows mechanisms and event order, not measured trajectories, sensor specifications, stopping distances, catch tolerances or Tesla's proprietary software architecture. Essential labels also appear as readable HTML legends. No paid assets or heavy rendering library. Catch footage uses the existing video with `preload="none"`; the hot-staging film is an external link, avoiding an embedded third-party player.

## Editorial correction and limits

The old Collision Evasion lesson made confident claims about release-specific FSD re-engagement. An exact public primary reference establishing those claims was not found during this review. The revised lesson distinguishes documented collision warnings, possible automatic braking and supervised FSD engagement, and directs release-specific availability questions to the exact release notes and vehicle manual. It does not assert that an absence of public evidence proves a feature cannot exist. Confirm an exact primary release note before adding that behaviour back.

SpaceX links support mission sequences and demonstrated milestones; the hot-staging timeline identifies its specific flight. FSD comparisons report tracker observations, not a guarantee for a particular VIN. Review changing manuals and release notes during future editorial updates. No database, login, newsletter opt-in or moderation changes are included.

## Verification

- `python -m unittest discover -s tests -p test_explainers.py`: generated-file consistency, unique IDs, source anchors, canonical/structured metadata, searchable and sitemap destinations, valid accessible SVG, and maintained tracker comparison.
- `python tests/explainers-browser.py`: Chromium at 320, 390 and 1440 pixels, dark/light themes; all four lessons; controls and keyboard navigation; hot/cold copy; FSD selection and unavailable data bundle; legacy and topic links; complete no-JavaScript text/table; no page overflow or runtime errors.
- Browser routing supplies local first-party files and blocks external/video requests. These are functional and visual checks, not live performance measurements. Source images/video are existing production assets.
