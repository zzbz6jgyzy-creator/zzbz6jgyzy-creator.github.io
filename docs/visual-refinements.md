# Visual refinements: items 2–8

The approved scope is visual recommendations 2–8 from the 22 October review. Item 1 is excluded: the homepage lead headline, lead layout and livestream presentation are preserved. No logo, font family or core color palette changes are included.

## Changes and reasons

| Item | Change | Purpose |
|---|---|---|
| 2 | Mobile What Changed and Latest Headlines initially show four entries. Keyboard-accessible buttons reveal or collapse the full feed. Explore uses compact two-column cards above 350px and a single column on narrower phones. | Reduce the initial mobile scroll while keeping all stories, topic filters and destinations accessible. Without JavaScript all eight pre-rendered entries remain visible. Desktop feeds remain expanded. |
| 3 | Brighten secondary text through the existing dark-theme muted token; improve small tracker, source, footer and newsletter labels. Preserve light-theme overrides. | Make timestamps, caveats and sources easier to read without changing the brand palette. |
| 4 | Allow tracker descriptions to wrap fully; standardize card label/value placement. Change the FSD homepage label to “9 approved” with the 15-state vote requirement stated separately. Update both build-time and runtime output. | Avoid truncated context and distinguish approvals from the threshold needed for a vote. Existing population requirements, source dates and registry caveats remain. |
| 5 | Shorten the FSD Europe introduction and link directly to methodology. Move the existing detailed explanation to the methodology panel. | Bring current figures higher on the page while retaining the distinction between national recognition, an EU-wide vote and customer rollout. |
| 6 | Display Home / Dispatch breadcrumbs without repeating the article headline. Reduce the weight of standfirst text, remove its fixed mobile minimum height and give all direct article figures a consistent credit/caption style. | Improve article hierarchy and prevent a clipped repeating breadcrumb. The full current-page breadcrumb remains in structured data. |
| 7 | Move the existing homepage newsletter form below Trackers and before What Changed. Use a shorter statement of the free Sunday briefing's benefit. Update the build template as well. | Make the signup visible earlier while preserving the form, field IDs, labels, status region and submission handlers. |
| 8 | Share card radius/padding tokens across homepage, FSD and evidence cards; align supporting-section gaps and button sizing. | Make related components feel consistent while retaining each page's layout. |

## Verification

- Browser checks covered homepage widths 320, 390, 768 and 1440px; light and dark themes; a 390px FSD tracker; 320/390px articles; and the desktop Software Update Tracker.
- Follow-up checks covered a desktop light-theme homepage and a mobile homepage with JavaScript disabled.
- No page errors or horizontal document overflow were observed in these checks.
- Both mobile feeds expanded from four to eight visible entries and collapsed to four. Enter-key activation and a topic-filter re-render were checked. No-JavaScript mode retained all eight entries in both feeds.
- The homepage contained one newsletter form, in the intended document order, with its associated email label. No real subscription was submitted.
- At the sampled 390px viewport, the initial homepage height fell from approximately 8,049px to 6,602px, before a small final signup-copy refinement. This is a layout observation, not a performance measurement or conversion claim.
- The FSD counter moved from approximately y=734px to y=596px at the sampled mobile width.
- Source comparison confirmed that the lead-story and livestream HTML marker blocks were unchanged.
- The existing `test-home-tracker-data.mjs` checks passed, including last-good snapshot fallback and protection of unrelated homepage regions during a tracker-only rebuild.
- A full homepage rebuild in an isolated fixture preserved newsletter placement, copy and tracker labels; a second build produced no further homepage change.
- JavaScript syntax checks, hashed home-bundle generation and `git diff --check` passed. Only the home bundle changed; the shared core bundle was not rebuilt.

Screenshots and browser evidence were retained in the local review workspace. External analytics and other third-party requests were blocked during browser checks. HTTPS resources were fetched with verified system trust and relayed into Chromium; these timings are unsuitable for performance scores.

## Remaining recommendations

SEO date integrity, duplicate article schema, tracker prerendering and Search Console measurement remain the separate SEO audit recommendations. This visual batch does not claim to fix them. Other tracker introductions can be reviewed individually if they have a similarly lengthy lead-in; FSD Europe was the confirmed example in this batch. Validate conversion changes against actual signup data after deployment.
