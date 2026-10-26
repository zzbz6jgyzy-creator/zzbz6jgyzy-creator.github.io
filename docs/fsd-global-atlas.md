# FSD Global Atlas

The old `/fsd.html` mixed market listings, legal recognition and sampled software under broad “live” labels. Its primary support URL now returns 404, and the page saved almost no country content without JavaScript. The new page answers the country question first and makes the evidence behind each label explicit.

## What changed

- Original illustrated globe, public-domain country map with coloured coverage, regional views, zoom controls and selected-country highlights. Existing logo, Inter / IBM Plex Mono families, red branding, navigation, member integration and newsletter form are retained. Light and dark themes and reduced motion are supported.
- 53 selected country/market records. Tesla’s global availability FAQ checked on 26 October 2026 lists 16 markets, including Puerto Rico as a separate market rather than a sovereign country. China remains “Scope unresolved”: historical reporting and the current global manufacturer list disagree. Absence from that list is not presented as legal refusal.
- Searchable directory with status and region filters, UK / USA / UAE aliases and diacritic-insensitive search. Map pins and directory links open the same country briefing. Country shapes are an additional pointer shortcut; the directory provides the equivalent keyboard and small-screen route.
- Briefings separate manufacturer listing, authority evidence, configuration requirements and independent software observations. No VIN entitlement or private rollout data is inferred.
- Explicit “Set as my country”, shareable `?country=XX#map` links, browser back/forward support and a “Forget country” control. Only a validated two-letter country code is saved under `sd-fsd-global-v1`. No location, VIN, hardware choice or account data is saved. Nothing is synced to Supabase. Blocked storage is described as visit-only selection.
- Side-by-side country comparisons; a source-linked change log with independent country/type filters; an owner guide and driving-computer guidance. The hardware selector explains prerequisites; it does not certify compatibility.
- Dated software references distinguish the FSD model from vehicle firmware and identify independent samples. No “latest worldwide” label, live fleet count or rollout percentage is fabricated. For example, 2026.38.5.10 names separate HW3 Lite and AI4 stacks; European 2026.33.100 is shown as firmware without asserting an independently established FSD model.
- All country records, comparison defaults, software cards, evidence entries and source links are saved in semantic HTML. Native expandable sections work without JavaScript. Malformed embedded data leaves that readable page intact.
- Updated title, description, Open Graph/Twitter text, CollectionPage / WebPageElement JSON-LD and seven useful internal search entries. Existing anchors `map`, `countries`, `versions`, `milestones`, `newsletter` are preserved; `compare`, `guide`, `sources` are added. The newsletter block is preserved exactly.

## Sources and update path

`data/fsd-global.json` is the manually reviewed global source of truth. Each source has its own check date, and each event retains its actual event date. Software observation dates are not manufactured launch dates.

The builder combines the global source with `data/fsd-europe.json`. National permission status, confidence, source references and dates come from that existing evidence dataset. A newer dated Europe availability record can supersede an older global listing without rewriting the global list’s original review date. Other markets require editorial updates to the global JSON. An authority record is not inferred merely because Tesla lists a market.

Run:

```sh
node scripts/build-fsd-global.mjs
node scripts/build-js.mjs
python3 scripts/inject-js-bundles.py
```

The standard saved-page build calls the global builder immediately after the Europe builder. The main build watches the new JSON, stylesheet and builder. There is no paid service, map library, geolocation request, runtime source scrape or model API call. All geography reuses the repository’s Natural Earth 110m public-domain `assets/world-countries.svg`; boundaries and hero graphics are illustrative.

Primary references checked for this work:

- [Tesla worldwide list, in the safety page FAQ](https://www.tesla.com/fsd/safety)
- [Tesla FSD product support](https://www.tesla.com/support/fsd)
- [Tesla subscription eligibility](https://www.tesla.com/support/full-self-driving-subscriptions)
- [Tesla European availability and conditions](https://www.tesla.com/nl_NL/support/tesla-assisted-driving)
- [Tesla Australia features](https://www.tesla.com/en_au/support/fsd) and [subscription conditions](https://www.tesla.com/en_au/support/full-self-driving-subscriptions)
- [Tesla New Zealand features](https://www.tesla.com/en_nz/support/fsd)
- [Teslascope 2026.38.5.11](https://teslascope.com/software/2026.38.5.11), [2026.38.5.10](https://teslascope.com/software/2026.38.5.10), [2026.38.5.5](https://teslascope.com/software/2026.38.5.5), [2026.38.5.6](https://teslascope.com/software/2026.38.5.6), [2026.33.100](https://teslascope.com/software/2026.33.100)
- [Historical China reporting, 21 May 2026](https://carnewschina.com/2026/05/21/tesla-officially-confirms-fsd-supervised-support-for-china-market/)

Competitor review included Not an FSD Tracker’s global table, Teslascope’s firmware pages and Not a Tesla App’s release notes. The new layout and graphics are original. The useful distinction is stronger separation of what each source establishes, especially for China, hardware eligibility and release branches.

## Verification

`node --test tests/fsd-global.test.mjs` checks evidence boundaries, dates, source types, malformed records, search/filter rules, country-only preferences, URL state, source escaping, dated software scope, chronological filtering, future Europe evidence precedence and deterministic generation without changing unrelated search entries or the newsletter.

`python3 tests/fsd-global-browser.py` checks 320, 390, 768 and 1440px in both themes plus no-JavaScript, blocked/corrupted storage, malformed embedded data, country links, invalid country links and legacy anchors. It exercises region views, zoom, country selection, search/filter/empty states, saving/forgetting/reloading, back navigation, clipboard fallback, comparisons, change filters and hardware guidance, with external services blocked. It also checks horizontal overflow, duplicate IDs and browser errors. Screenshots are generated in `/tmp/fsd-global`.

The dedicated GitHub workflow rebuilds saved output and bundles and checks for drift before running the browser suite.

## Recommendations requiring later work

- Maintain an editorial review cadence for Tesla’s market list and regional conditions. No public source used here supplies Tesla’s complete private update queue.
- Add further manufacturer or authority records before giving exact hardware/model/trim eligibility outside the checked conditions. Precise VIN entitlement would require an authorized vehicle integration and a separate user/data decision.
- Country alerts, account-synced preferences and newsletter targeting are separate product decisions; “My country” is deliberately a local preference today.
- Current selected coverage is not every jurisdiction. Add substantive sourced records rather than generating thin country SEO pages.
- No paid resources are required for the implemented feature.

## Build consistency fixes found by site-wide checks

The shared member injector places its block last in the head. The FSD stylesheet is saved before that block so the complete build is stable.

Grok and Starship renderers previously removed responsive `<picture>` wrappers created by the later image build, causing recurring saved-output failures. A small shared helper now preserves an existing wrapper only when the rendered fallback `<img>` is exactly identical. Changed sources, alt text or dimensions render anew; existing picture markup is not nested. The fix changes two builders and adds a regression test, without changing either page’s content, image files or source datasets. Their 31 existing model tests pass alongside the 16 global atlas tests.
