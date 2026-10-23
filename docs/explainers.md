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

## October 2026 reference expansion

The four guides now each include six detailed chapters, three contextual fact cards, a chapter contents disclosure, numbered source citations, a comparison table and three further questions. The expansion adds roughly 3,700 words of technical explanation, plus table content, captions and glossary entries; reading-time labels increase accordingly.

- Hot staging: event order, ideal rocket equation versus gravity losses, NASA plume/CFD work, exhaust momentum, earlier interstage versus V3 integration, and flight-specific timing.
- Booster catch: return trajectory, instantaneous force balance, position/attitude geometry, load transfer, revised V3 interfaces and the distinction between recovery and reuse.
- FSD: documented camera/computer roles, identifying installed hardware, build/version/entitlement differences, rolling distribution, download versus installation, calibration and evidence quality.
- Collision assistance: warning/braking/acceleration functions, closing speed, chosen-assumption stopping arithmetic, IIHS 2017 and 2019 research, visibility and release-specific evidence requirements.

Three additional original SVG figures show a simplified booster force balance, the camera inventory in the cited US Model Y manual and an illustrative stopping-distance model. Their complete descriptions and assumptions are also available as HTML. Tables scroll within their own labelled keyboard-focusable regions on small screens.

Primary references include NASA Marshall's November 2024 hot-staging work, NASA Glenn mechanics, the NASA Trick model, NASA's Crew-9 event report, SpaceX mission/update material, distinct Tesla manual/support chapters, Rhode Island DMV stopping guidance and the original IIHS research abstracts. Source dates and vehicle/market applicability are preserved. Historical IIHS percentages are not Tesla-specific performance results. The V3 section is dated; earlier-ring artwork is explicitly scoped to earlier hardware.

The worked geometry and stopping examples are original calculations with hypothetical inputs. They are not flight tolerances, Tesla measurements, operating instructions or performance promises. The collision guide continues to require an exact primary release note before publishing a configuration-specific re-engagement specification; inaccessible social posts or secondary summaries do not settle those conditions.

Expanded validation adds chapter/fact/source integrity and valid companion SVG tests; browser coverage verifies chapter jumps, native disclosures and all new content alongside the existing controls and fallbacks. The added reference content works without JavaScript, external embeds or paid resources. The existing staging enhancement now uses distinct hot/cold positions and shows the small continuing booster plume during hot staging.
