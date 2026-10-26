# Newsroom and story discovery

The old News page loaded most original reporting and publisher headlines only after JavaScript ran. It had separate browsing controls, weak links into the redesigned trackers, no integrated reading-list controls, and no saved article catalogue in the page itself.

## Result

- An original editorial masthead and three featured/latest story positions, with real article imagery and original decorative artwork when the catalogue supplies only the generic site image. An editorial pin is labelled **Featured reporting**, with its actual publication date; it is not described as the newest story.
- One browsing area with clear **Our reporting**, **Around the web** and **Saved** choices. Search matches words across titles, summaries, labels and topics. Overlapping topic chips cover Tesla, SpaceX, Starship, Starlink, Optimus, Grok, FSD/Robotaxi, Roadster and X.
- Cards and compact layouts, chronological sorting and shortest-read sorting for original articles. Filter state can be shared through the URL. Legacy `#tesla`, `#spacex`, `#grok` and `#xai` wire links still select the appropriate source and topic.
- Reading-time estimates calculated from the actual local article text at 220 words per minute. Scripts, style and navigation text are excluded. An article missing from the build has no invented reading time. A genuine, later `article:modified_time` is shown separately from publication; a feed refresh never creates an Updated date for an article.
- **More on this** leads to three related original stories and relevant tracker/explainer paths, using subject overlap rather than an external recommendation service. Broad company topics weigh less than specific product topics. The starting story is excluded.
- Direct access to Your Daily and the existing reading list. The dedicated newsroom newsletter block uses the existing Beehiiv form flow, latest-issue link and status handling; saving an article does not subscribe anyone.
- Source-labelled publisher headlines with actual publication times, safe external links, and the existing keep/deduplication/wording rules. No full publisher articles or invented summaries are copied. No reading times are assigned to external stories.
- All indexed original stories and a source-linked publisher snapshot are readable in the saved HTML. Native source expansion works without JavaScript. Failed or older refreshes preserve the readable snapshot, and malformed embedded data leaves the static page intact.
- Updated metadata, CollectionPage/ItemList JSON-LD and internal search entries. Brand logo, Inter and IBM Plex Mono font families, navigation, member module and footer are retained. Light/dark layouts and reduced-motion preferences are supported.

## Reading-list contract

`news-reading-list.js` uses the existing `personal-model.js` document, not a new list or schema. Device saves use `sd-personal-guest-v1` and retain personal settings and removal tombstones. A save merges the latest locally stored document before changing one story, so another tab’s changes are preserved. The existing 100-story capacity is respected.

If the user previously connected an account in Your Daily, the adapter checks the existing connection marker and verifies the current user before reading that account’s document. Account and device lists are never automatically combined. A mismatch or unavailable account connection falls back to the separate device list with an explicit status. No account state is read or written under an unmatched identity.

A user’s save in an already connected account reuses `personal-sync.js`, including its owner checks and revision-safe writes. Failed synchronization leaves a dirty local document that Your Daily can retry. Authentication changes stop account synchronization and return to device scope. Guests do not initialize Supabase or make account requests. There are no database migrations or authentication-setting changes.

Blocked storage leaves an honest visit-only selection; the interface does not claim it was persisted. Only the cards/compact preference is stored separately under `sd-news-layout-v1`. Search text and filter history are not stored there.

## Publishing and update path

The existing article catalogue and news snapshot remain the content sources:

- `data/articles.json` for original reporting, including editorial pins and dates.
- Local `/dispatch/*.html` for estimated read time and real modification metadata.
- `news-data.json` and `data/news-hold.json` for publisher headlines and existing editorial holds.
- `data/news-studio-guide.json` for the curated local tracker/explainer paths.

`node scripts/build-news-studio.mjs` builds the saved newsroom and its search entries. The general saved-page build calls it after the other studio builders. The scheduled news snapshot workflow now also rebuilds the newsroom after updating the article catalogue and headlines; it commits the updated search entries. The existing half-hourly schedule is unchanged.

```sh
node scripts/build-news-studio.mjs
node scripts/build-js.mjs
python3 scripts/inject-js-bundles.py
```

The renderer preserves existing responsive picture markup through the shared image helper. Newly generated images explicitly specify eager/lazy loading, so the later image optimization pipeline can keep stable fallback markup. Original image files are not changed by this work.

## Verification

Eighteen unit/model/integration checks cover safe source URLs, deduplication, future/invalid publication records, overlapping topics, source/search/saved filtering, chronology, reading-time derivation, editorial pins, related-story exclusion, URL state, escaping, readable HTML, deterministic output, and the existing reading-list contract. Reading-list fixtures cover device-state preservation, blocked storage, capacity limits, verified account scope, account mismatch, unavailable account reads, sign-out during an in-flight account read, and cross-tab saves/removals.

Eighteen browser scenarios cover 320, 390, 768 and 1440px in both themes; no JavaScript; malformed embedded data; blocked/corrupted storage; filter links; legacy links; failed refreshes; older feeds; and newly published stories with unknown reading time. They exercise pagination, token search, empty states, topic/source filters, compact mode, save/remove, related paths and refresh. External services are blocked, and an unconnected guest is verified to make no Supabase request. Dedicated CI rebuilds the saved page and bundles before running the browser suite.

Design previews are in `docs/previews/newsroom-*.webp`.

## Later decisions

No paid tools are required. Potential separate work includes editorially curated series, richer article-level recommendation modules, richer publisher-specific feeds under their terms, and reader-controlled notification subscriptions. This change does not alter article copy, publisher headlines, existing ranking rules, account settings or newsletter subscriptions.
