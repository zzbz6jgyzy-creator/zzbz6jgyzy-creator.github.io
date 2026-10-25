# Tesla review studio

Replaces the reviews hub and all five existing review pages, preserving their URLs, shared navigation, branding, member controls and footer/newsletter. The editorial design uses large existing photographs, stronger typographic hierarchy, sticky chapter links, a reading progress indicator and responsive dark/light styling. Named UK Model 3/Y and US Cybertruck configuration panels add dated range/charging and selected acceleration, drive, seating or towing figures without mixing EPA and WLTP. All five reviews also explain three model-specific strengths. Article copy is expanded into driving character, cabin and equipment, charging, software and ownership, plus model-specific questions and test-drive preparation.

## Editorial approach and sources

`data/reviews-studio.json` is the dated source of truth. Reviews are enthusiastic editorial buying analysis, not fabricated hands-on road tests. The editor's owner/shareholder interest is disclosed. Unexplained numerical scores are replaced with recommendations for specific uses; no ratings or offers are invented in structured data. Tesla strengths are explored while equipment, availability and driver-supervision requirements stay accurate.

The 25 October 2026 source review used Tesla's named UK Model 3/Y specification pages (175 kW entry rear-drive and 250 kW Premium/Performance references), US Cybertruck specifications (325 kW references and trim-specific towing/equipment), Tesla Supercharging/home-charging guidance, and Tesla's Q3 2026 filing identifying the Model S/X product sunset. S/X pages now emphasise exact-generation used/inventory research; the Model S hatch description is corrected. A family-level 250 kW support figure is explicitly not assigned to every historic S/X. No regional list, photograph or film is presented as equipment confirmation for every trim. Source URLs and notes are stored in the data and displayed in expandable ledgers.

Five full reviews contain over 600 words of model-specific core chapter copy each, plus charging analysis, FAQs, sources and tools. No live Tesla price, measured charging trace, independently tested range or new-car S/X availability is implied. The original Tesla YouTube promotional links are retained as external click-to-open links; there are no embedded players or third-party video requests before a visitor chooses to leave the site.

## Features and persistence

The hub supports search, use-case filters and saved-review filtering. Up to three model families can be compared with explicit market references. Saved reviews, comparison choices and model-specific checklists are stored only under `sd-review-studio-v1` in this browser. Storage is bounded and sanitized; failure leaves the tools usable in memory with visible feedback. This is not account sync. Each review offers a downloadable plain-text checklist. Search and filtering are enhancements; all five reviews remain linked and readable without JavaScript. Native FAQs, sources and source links remain usable without it.

## Charging lab

DC example: usable kWh × (departure% − arrival%) gives battery energy; divide by user-entered **battery-side average** kW for time. Default 75 kWh, 10–80%, 100 kW average gives 52.5 kWh / 31.5 minutes. These are illustrative inputs, not Tesla battery specifications or a measured charging session. The tool deliberately does not pretend a peak limit is maintained throughout a stop or draw a fabricated vehicle charging curve.

Home example: daily kilometres × kWh/100 km gives battery energy. Divide by charging efficiency for wall energy; divide by entered wall power for time; multiply by entered tariff for energy cost. Default 60 km, 17 kWh/100 km, 90%, 7.4 kW and £0.25/kWh gives 11.33 kWh at the wall, 1.53 h and £2.83. Miles/kilometres convert distance and consumption together, preserving the physical journey. Currency selection relabels a user-entered tariff; it does not convert FX. Inputs are validated, including empty fields and departure no higher than arrival. Climate, parked consumption, taxes/session fees and changing thermal/site limits are excluded and disclosed.

## Build and checks

- `node scripts/build-reviews-studio.mjs` rebuilds all six saved pages and their search records, preserving unrelated record order.
- It is also called by `scripts/build-noscript.mjs` in the main pre-render workflow.
- `node scripts/build-js.mjs && python scripts/inject-js-bundles.py` builds the dedicated reviews bundle using pinned esbuild 0.25.12.
- `node --test tests/reviews-studio.test.mjs` checks arithmetic, invalid inputs, source references, persistence bounds, editorial distinctions, rebuild reproducibility, metadata and no-JavaScript content.
- `CHROMIUM_EXECUTABLE=/usr/bin/chromium python tests/reviews-studio-browser.py` covers 320/390/768/1440 widths, dark/light themes, storage failure, no JavaScript, filters, persistence, comparison limit, checklist downloads, DC arithmetic, validation, currency and physical-unit conversion. CI uses preinstalled Chrome and retains screenshots.

Photos retain the existing AVIF/WebP derivatives and Wikimedia Commons credits (CC BY-SA 4.0); no new image service, paid asset or database migration. Primary images load eagerly; collection cards are lazy-loaded. Metadata includes canonical/social tags and CollectionPage/Article plus breadcrumbs, without invented review ratings. Existing URLs keep working.

Later editorial work: obtain reproducible instrumented charge traces for exact year/trim/battery/site/software combinations; add original owner interviews with permission and declared provenance; refresh regional equipment references when Tesla changes them. An actual driving test and attributed original photography require human reporting. No paid tools or extra configuration are required for this implementation.
