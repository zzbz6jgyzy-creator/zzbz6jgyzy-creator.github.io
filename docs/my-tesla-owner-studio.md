# My Tesla Owner Studio

The original My Tesla page was a software/feature filter. It stored a model, year, country, hardware and software in one browser key and mirrored these into the page URL. It did not distinguish trims or record ownership history. Year-based computer estimates could later look owner-confirmed.

The replacement makes My Tesla a personal garage, while preserving the site's Inter/IBM Plex Mono typography, red accent, dark/light themes, global navigation and separate newsletter signup.

## Owner experience

- Three-step setup asks for original model year, exact trim (free text plus suggestions), market, wheels, units and currency. Hardware, battery chemistry and drive type remain unconfirmed unless entered. Original model year is distinct from registration/delivery year.
- Up to five independent cars with a persistent active-car selector. Returning owners land on their saved workspace; quick readings update odometer, battery percentage and software without repeating setup.
- An explicit US EPA record selector matches the original year, model and complete certification label, retaining wheel/variant suffixes. No nearest-trim match or inferred usable battery capacity is applied. Outside the US, owners can enter their documented local rating, labelled EPA/WLTP/CLTC/other.
- The passport includes optional owner-documented usable capacity, acceleration with its exact test convention, top speed, peak power and reference notes. Unknown figures remain unknown. Acceleration tests are not converted between 0–60 mph and 0–100 km/h.
- Overview combines period-specific owner statistics, a six-month recorded-distance chart, home/away charging-energy mix, next actions, software context and model-specific reading/explorer links.
- Driving journal records distance and energy from the same non-overlapping trip interval. Consumption is total driving energy divided by total distance. Charging records use delivered energy and optional total cost; unknown cost is excluded, zero is preserved as genuinely free. The average charging rate is energy-weighted across priced sessions only.
- Energy view includes an editable/deleteable journal, period/type filters and a clear distinction between trip energy, charge energy and certification consumption. Charts have textual descriptions and an exact-figure table.
- AC planner explicitly models usable capacity, start/target percentages, actual AC power, efficiency and tariff. It is a constant-power estimate, not a DC charging curve. Journey cost lab uses owner-supplied consumption, reserve and energy-price assumptions, with an optional energy-only petrol comparison. No weather, route or battery-health claims are made.
- Care reminders use owner-chosen dates and/or odometer thresholds; either threshold can make an item due. Completion history is retained and can be reopened. No notification permission, appointment booking or inferred service schedule.
- Software view fetches the existing public fleet snapshot, combines it with confirmed owner fields and sourced market context, and links to the full software/autonomy trackers. Country fleet rows mix configurations and never establish eligibility, installed features or update delivery dates.
- Separate demo has clearly labelled illustrative records, never saves itself over a personal garage, and restores the previous garage on exit.

## Persistence, privacy and compatibility

`sd-my-tesla-garage-v2` stores the validated schema-2 garage in localStorage. Numeric records use kilometres internally; presentation can use miles or kilometres per car. Up to 500 driving records, 500 charge records and 100 care reminders per car; backups are capped at 2 MB.

The existing `sd-my-tesla-v1` key is migrated when possible and remains a small compatibility pointer for the active car (`model`, `year`, `cc`, `hw`, `sw`), so Your Daily and the software tracker continue to recognize its country/model. Legacy hardware is deliberately reset to unconfirmed because the previous version could have inferred it. Old car URLs are reviewed explicitly, never silently written over a saved garage; profile parameters are removed from the URL after reading.

Export/import transfers all garage records through a private JSON download. Replacing a garage, deleting a car and deleting a journal entry require concrete confirmation. Invalid import preserves the saved garage; corrupt local data can be exported before explicit replacement. Storage failures leave a working session and visible export guidance. Cross-tab updates refresh safely when no editor is open; competing writes during editing are blocked and the owner is asked to export before reloading.

This release has **no Tesla vehicle connection and no account/cloud sync**. Google sign-in and the separate personal Daily do not upload these car records. No VIN, Tesla password or location history is requested. No vehicle commands or paid APIs are used. If public data fetches fail, the garage and local tools continue working; this is not a service-worker offline application.

## Public data and refresh

`data/my-tesla-epa.json` contains 187 Tesla records from the public FuelEconomy.gov CSV checked on 2026-10-24, covering model years 2012–2027. Original record IDs and variant labels are preserved. Ratings are US certification values, not WLTP or observed range; EPA energy consumption includes charging losses and is not directly compared with trip-counter energy.

`python scripts/refresh-my-tesla-epa.py` downloads the public government archive, validates the Tesla subset and atomically replaces the saved snapshot only after successful parsing. Empty/implausible/duplicate results fail while retaining the previous saved file. A local archive can be supplied with `--input` for reproducible validation. The scheduled GitHub workflow runs Mondays at 07:23 UTC (best effort) and commits only the reference JSON after tests pass. It can also be run manually from Actions. Personal car data is never part of this process.

The software sample continues to use the site's existing automated `updates-live.json` pipeline. A dated source snapshot is displayed; it is not a live vehicle read.

## Research and decisions

- [TeslaFi](https://www.teslafi.com/) and [Tessie](https://www.tessie.com/) establish strong expectations for an owner dashboard: driving/charging history, costs, efficiency and useful return visits. This build adds a free, explicit-input owner workspace around the site's existing editorial tools. It does not claim to match their connected telemetry or to be objectively ranked above them.
- [FuelEconomy.gov downloads](https://www.fueleconomy.gov/feg/download.shtml) and [web services](https://www.fueleconomy.gov/feg/ws/index.shtml) provide variant-specific government certification records. Wheel variants stay distinct. Dynamic Tesla sales pages are not reliable historical trim lookups, so they are not used to guess a past car's specification.
- [Tesla range guidance](https://www.tesla.com/support/range) distinguishes certification/displayed range from real driving conditions.
- [Tesla maintenance](https://www.tesla.com/support/vehicle-maintenance) and [manuals](https://www.tesla.com/ownersmanual) support referring owners to their actual vehicle's recommendations, rather than prescribing one interval or daily charge target across all packs.
- [Tesla warranty guidance](https://www.tesla.com/support/vehicle-warranty) says the individual supplied warranty is authoritative; no inferred warranty eligibility counter is included.
- [Tesla Fleet API announcements](https://developer.tesla.com/docs/fleet-api/announcements) describe paid access and telemetry. Automatic private stats would need approved OAuth access, secure server infrastructure, billing/retention decisions and owner consent. No Tesla client secrets belong in this static site.

## Validation

`node --test tests/my-tesla.test.mjs` checks certification matching/provenance, legacy hardware handling, weighted calculations, units, unknown/free costs, date boundaries, charging losses, journey budgets, care milestones, backup validation and version comparison.

`python tests/my-tesla-browser.py` exercises 36 responsive/theme section views (320/390/768/1440, dark and light), setup, exact EPA selection, logging/reload, quick readings, calculator outputs, care completion/reopen, multiple-car isolation, legacy compatibility, backup/cancel/invalid input, HTML-injection safety, failed public sources, blocked storage, corrupt storage and JavaScript fallbacks. All traffic is local test fixtures; it performs no live owner writes.

Existing software-workspace and personal-home tests cover integration with the preserved active-car pointer. PR checks also reproduce the frontend build. Preview screenshots are in `docs/previews/my-tesla-*.webp`.

## Later decisions

1. Optional private account sync for the garage needs a separately reviewed schema and conflict/ownership rules; do not reuse a public member profile as a car-data store.
2. Automatic Tesla telemetry requires a service/operator decision and ongoing cost budget, then an approved OAuth integration. This build is useful without that connection.
3. Extend exact non-US specification coverage only from authoritative model-year/market/wheel-specific datasets. Never relabel EPA as WLTP or infer battery chemistry by year.
4. Add a connector-specific CSV import only after inspecting real Tessie/TeslaFi export formats, units and cost definitions. The current JSON backup format is supported and validated.
