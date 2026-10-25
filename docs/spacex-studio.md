# SpaceX mission hub

Rebuilds `spacex.html` into a flagship entry point to launches, vehicles, spacecraft, Starlink, engineering and original reporting. Retains the existing URL, shared navigation/branding/fonts, member controls and footer/newsletter. The design uses a public-domain Falcon launch-arc hero, a compact mission board, large Starship/Starlink destinations, original SVG programme illustrations, a reusable-flight mechanism explorer, archival catch footage, historical milestones and filtered reporting. It works in light/dark themes and with reduced motion.

## Inputs and updates

`data/spacex-studio.json` is dated editorial guidance, not a second launch database. The builder joins it with `data/calendar-studio.json` and `data/articles.json`, embedding complete semantic HTML and the same validated record used by browser enhancements. It runs after the shared calendar builder in `scripts/build-noscript.mjs`. Normal article/launch updates in the main pre-render pipeline therefore refresh this hub. The main workflow rebuilds it once more after responsive image generation, so saved story markup uses the derivatives that will actually be committed. The page shows the calendar's actual `launchChecked` source timestamp separately from the editorial review date.

The old `hv:event` widget is removed because the new launch board supplies that function. The older homepage event-card builder only replaces existing markers, so it cannot insert a second widget or overwrite the new main content. The dedicated SpaceX bundle replaces the former legacy Starship-data/calendar/live bundle on this page; it does not change those tools elsewhere. The global navigation and newsletter continue using the shared core bundle.

## Launch semantics

Exact timed openings, day targets, month/quarter/year windows and unknown dates keep their original precision. Day-only targets are not timezone-shifted into the previous day. Month/year placeholders are displayed as periods, not midnight on an arbitrary final day. Status/expiry filtering does not invent a launch outcome. A reached timed window says to check its source, while expired records leave the upcoming view. A stale schedule is labelled after 48 hours. A fallback appears when no future timed opening remains. No launch-success rate, live vehicle telemetry or made-up fleet counter is introduced.

The board shows up to five matching records, with vehicle/spacecraft filters, several display timezones and a saved-launch view. Complete scheduling and calendar exports remain in the existing Calendar tool. Countdown text refers to the target opening and updates once a minute while the page is visible.

## Personal tools and accessible enhancements

Pinned tools and saved launch IDs live only in `sd-spacex-desk-v1` in this browser, not in the member account. Stored values are bounded, deduplicated and limited to known IDs. Storage failure leaves the page usable in memory with visible feedback. A storage event updates choices from another tab.

All five programme descriptions, all five mechanism explanations, reporting cards and sourced launch records exist in saved HTML. JavaScript narrows the visible programme/step; native source and comparison disclosures still work without it. Programme and mechanism selectors support arrow keys, Home and End. The wide architecture table scrolls inside its own labelled region. The constellation and flight diagrams explicitly identify themselves as editorial schematics, not positions, engineering drawings or trajectories.

## Evidence and media

Programme references: SpaceX Falcon 9/Falcon Heavy/Starship pages; NASA commercial crew material for Dragon; Starlink technology descriptions. Milestones use SpaceX mission history, NASA's Demo-2 launch record and NASA APOD's first-catch reference. The fleet distinguishes launchers, a spacecraft and a communications network. Falcon first-stage recovery is not equated to Starship full-system reuse; Starship's full reuse remains a programme goal.

Hero: Joshua Conti/U.S. Space Force, public domain, via https://commons.wikimedia.org/wiki/File:Falcon_9_Starlink_6-45_Launch_(8316286).jpg . This is a long exposure from March 2024, not a live view. Starship photo: Steve Jurvetson, CC BY 2.0, https://commons.wikimedia.org/wiki/File:SpaceX_Starship_before_IFT-5.jpg . Existing responsive derivatives are reused. Story imagery remains credited in each linked article. Original SVG diagrams add no paid dependency.

The existing SpaceX Flight 5 catch clip is reused, dated 13 October 2024, with native controls, muted initial sound, preload none, a direct mission reference, visible prose description and a VTT visual-description track. It pauses when offscreen/hidden; there is no autoplay or third-party player. The clip depicts booster recovery, not proof of ship recovery or instant reuse.

## Build and verification

```
node scripts/build-spacex-studio.mjs
node scripts/build-js.mjs
python scripts/inject-js-bundles.py
node --test tests/spacex-studio.test.mjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium python tests/spacex-studio-browser.py
```

Node tests cover source validity, precision, timezone behaviour, expired windows, filters, bounded persistence, escaping, shared-input parity, unique anchors, metadata and exact rebuild reproducibility. Browser checks cover 320/390/768/1440 widths, dark/light themes, no JavaScript, blocked storage, expired schedules, video failure, native playback, selectors/keyboard controls, saved-launch persistence, tool pins and reporting filters. CI uses preinstalled Chrome and retains screenshots. Search records preserve unrelated ordering. Metadata is a CollectionPage with direct links to the tools, without invented live statistics.

No SQL, paid tools or extra service configuration. Future work: add new programmes only with a clear user journey and verifiable sources; add licensed new media as it becomes available. A direct operator telemetry feed would require a real accessible source and should not be inferred from public schedules.
