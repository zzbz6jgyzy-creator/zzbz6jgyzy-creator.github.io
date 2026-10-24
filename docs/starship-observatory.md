# Starship Observatory

## Purpose and inspection

The previous Starship page had substantial flight notes, recaps and a comparison tool, but navigation was a long sequence of sections. The opening countdown converted a day-precision, unconfirmed planning reference into hours/minutes/seconds and used an arbitrary timestamp. Flight 14 also mixed a planned late-flight clock with a description of an early return. Some schedule entries had a confirmation flag without an attached source URL. Those are material distinctions for a trustworthy flight destination.

This overhaul preserves the site's Inter/IBM Plex Mono fonts, brand red, global navigation, member links, newsletter signup and historical imagery attribution. It replaces the page body, page-specific presentation and browser controller with a five-section observatory.

## What changed

- A cinematic Starbase hero, deliberately historical image label/credit, large typography and a separate next-flight status card. No upcoming flight is illustrated as already flown.
- Sticky local navigation: Overview, Next flight, Flight archive, Engineering and Watch. Mobile uses a contained horizontal rail with room below the global fixed navigation.
- Overview has completed-flight totals, booster-catch count, vehicle generations, a latest-flight briefing, an illustrative orbital sequence and four linked development milestones. Overall editorial labels are not turned into a success rate.
- A clear next-flight briefing shows the saved planning reference, vehicle pairing, objectives and a chronological evidence trail. Source-less notes remain explicitly unverified. Regulatory context is linked without equating an environmental review, a road closure or planning slide with launch permission.
- The completed-flight archive supports exact flight-number search, free-text booster/ship/milestone search, generation and assessment filters, chronological ordering, card/table layouts and a saved-flight filter.
- Flight records separate objectives, vehicles, notes and ten mission phases. A meaningful result can coexist with loss of a stage. Phase text and labels supplement colour.
- Side-by-side comparison keeps each flight's phase outcomes visible. Identical selections ask the visitor to choose different flights; upcoming objectives are not silently compared as achieved outcomes.
- Engineering has an original SVG cutaway with interactive ship/staging/booster/engine focus and an illustrative 33-engine layout (20 outer, 13 inner). It uses no live engine-status animation or version-specific dimension claim. The orbital drawing is also explicitly illustrative.
- Watch library retains existing curated SpaceX recaps and local clips, labelled by actual flight and by recap/pre-flight/clip. Players are created only on request. YouTube needs an explicit additional play action; players are removed or paused on close. Original-source links remain usable when embedding fails.
- Saved flights, recent records and card/table preference use a small localStorage document. No signup, account sync, notification or car-data access. Storage failure leaves a working session with a visible message.
- Old `#lab/N`, `#lab/compare/A/B`, `#log`, `#schedule` and `#next-flight` links retain their intent in the new navigation. Flight and comparison links can be copied, with a visible fallback if clipboard access is unavailable.
- Full semantic saved HTML remains readable without JavaScript or when the page bundle is blocked. Native flight details expand into objectives and phase notes. JavaScript adds filters, dialogs, comparison, saved state and inline players.
- Page title, descriptions, Open Graph/Twitter image description and CollectionPage JSON-LD reflect the new purpose. The canonical URL remains `/starship.html`.

## Data and precision

`starship-studio-model.js` normalizes the existing `starship-data.js` and `starship-lab-data.js` into `data/starship-studio.json`. `starship-studio-view.js` supplies the same semantic rendering to the build and browser. `scripts/build-starship-studio.mjs` updates the saved page and JSON deterministically.

The builder is called by the existing `scripts/build-noscript.mjs` pipeline. The homepage build workflow watches the new model/view/builder inputs and commits the saved JSON along with the existing page output. Updating the underlying flight catalogs therefore updates the observatory through the existing build/deploy process. Public source/editorial facts are still curated; this is not a live telemetry feed or an automatic scraper of license determinations.

The browser starts with the embedded snapshot and has an explicit newer-snapshot check. Failed, malformed or older downloads preserve the saved page and filters. A refresh does not replace an open modal while the visitor is reading it.

A countdown requires all of: explicit confirmed timing, second precision, a valid timestamp and a SpaceX source URL. The present planning reference does not meet these criteria and shows an awaiting-confirmation status. Calendar-only dates are formatted in UTC so a visitor's time zone cannot move them to a different day.

Flight 14's saved planned deorbit/reentry/terminal clocks are withheld. Its terminal outcome is labelled not verified in this view rather than promoted to a verified controlled recovery. The archival overall label remains the site's editorial assessment, explained alongside the phase data. Flight 3's earlier “first to space” wording is removed from the new view; it is described by its coast and reentry tests. The legacy catalogs are not rewritten for unrelated pages in this PR.

Booster catches are counted from explicit recorded recovery notes (or a specific recovery field), excluding aborted/diverted/splashdown descriptions; future completed flights do not depend on a hard-coded list of old catch numbers.

## Research and sources

- [Next Spaceflight Starship](https://new.nextspaceflight.com/starship/) provides a strong reference for hardware status, test activity and event discovery. [Flight Club](https://flightclub.io/) demonstrates the value of explaining a mission visually. This build focuses on accessible flight evidence, comparison and source clarity; its drawings do not claim either service's trajectory data.
- [SpaceX mission records](https://www.spacex.com/launches), including [Flight 12](https://www.spacex.com/launches/starship-flight-12), [Flight 13](https://www.spacex.com/launches/starship-flight-13) and [Flight 14](https://www.spacex.com/launches/starship-flight-14), are primary reference links. The dynamically served pages were not fully extractable during this audit; existing phase timings are therefore labelled as transcribed editorial notes, not independently verified telemetry.
- [SpaceX system design reference](https://www.spacex.com/vehicles/starship/design) supports the published engine-layout explanation. Illustrations are original SVG schematics, not a build-specific CAD drawing.
- [SpaceX Flight 14 payload-deployment post](https://x.com/SpaceX/status/2104571161254474020) is linked with the record. Conflicting planned versus flown timing is not resolved by guessing.
- [FAA Starship Boca Chica project](https://www.faa.gov/space/stakeholder_engagement/spacex_starship) and [FAA statements](https://www.faa.gov/newsroom/statements/general-statements) distinguish environmental/regulatory context and flight-specific statements.
- [Our Flight 15 source review](https://superchargeddaily.com/dispatch/starship-flight-15-catch-timeline.html) retains its linked transcript, SpaceX posts, reporting and regulator documents. Its planning claims are not relabelled as a launch announcement.

The Starbase hero and historical catch photo reuse existing Steve Jurvetson images with visible Wikimedia Commons/CC BY 2.0 attribution. Existing SpaceX video assets are labelled as such. No generated historical flight imagery, paid data or new external media dependency is introduced.

## Validation

- 13 Node tests: source normalization, schedule precision, confirmed-time requirements, disputed clocks, source-less claims, exact search and combined filters, catch totals, invalid preferences, legacy routes, media labels/no eager players, escaping, semantic phases and deterministic saved builds. Includes a future-flight catch regression.
- Browser journeys: 30 responsive/theme section views at 320/390/768/1440 widths, dark/light; search/empty/reset, saved flights and reload, cards/table, dialog focus, comparison/copy links, engineering focus and 33-engine schematic; old bookmarks; media filtering and explicit player loading/cleanup; failed/older/malformed snapshots; blocked storage, invalid preferences, no/blocked JS; calendar date across a +14-hour time zone.
- Existing homepage tracker-data checks and the shared saved-page build cover the integration. PR checks reproduce the page and page bundle and upload review screenshots.

## Remaining decisions

- A true live countdown or launch-status feed requires a reliable flight-specific authoritative feed. A day-precision planning reference is insufficient.
- An automatic hardware/test activity feed needs a permitted source and explicit attribution/refresh rules; no fabricated readiness percentages are shown.
- Calendar reminders/push alerts and cross-device saved flights are optional later features requiring user preference, persistence and permission decisions. Newsletter subscription remains a separate explicit action.
- Verify and source each disputed Flight 14 terminal detail before publishing exact flown event times. This release exposes the uncertainty rather than resolving it by inference.
