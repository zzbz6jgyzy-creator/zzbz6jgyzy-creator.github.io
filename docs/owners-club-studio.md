# Owners club directory

The old page hid every listing until a location or name search and offered no usable directory without JavaScript. It depended on external city/reverse-geocoding services and could present approximate regional reference coordinates as precise distances. `/tesla-clubs.html` is now an accessible community directory with original graphics and a complete saved HTML directory.

## Experience

- New editorial hero and original SVG country-coverage graphic using the site's public-domain Natural Earth asset. All map dots are country reference points, not venues; connecting curves are decorative.
- Country/territory explorer, club/chapter/community filters, contact-channel filtering, text search, card/list views, pagination, saved clubs and shareable searches.
- Club-detail dialogs with source links, published contact channels, parent-network navigation, local bookmarking and correction references. Native dialogs support Escape and focus return. The directory never enrols people in a club.
- Optional city search uses the existing first-party GeoNames index only on demand. Device location is requested only when the reader presses the button. Neither operation calls an outside geocoder. Coordinates and city queries are not saved to storage or placed in new share links.
- Regional suggestions use the existing publication compiler's approximate regional references. They are suggestions to browse, not territorial coverage boundaries or actual meetup locations. Country-centre coordinates never masquerade as local venues.
- Practical joining guide, FAQs and links to My Tesla, the software tracker and reviews. Fees, membership requirements and event schedules remain with each club.
- Updated description/social metadata, CollectionPage/ItemList structured data and searchable section records. All 174 listings and contact links are readable without JavaScript; country links jump through the saved directory.

The existing logo, Inter / IBM Plex Mono font families, global navigation and footer remain. The original page had no newsletter block; no mailing-list opt-in was introduced or coupled to bookmarks.

## Source integrity

`tesla-clubs-data.js` remains the unchanged public source. Its **16 October 2026** publication audit includes 45 owners clubs, 94 regional chapters and 35 independent communities (174 total) across 42 country/territory labels plus four worldwide listings. The 51 excluded historical, duplicate or unresolved records remain unpublished. The visual redesign is not a new verification of all clubs, links, memberships or activity.

`data/owners-club-guide.json` supplies country ISO codes, broad browsing areas, country reference points and the known regional-reference keys from the existing publication compiler. It adds no new club records or endorsements. The guide's design-review date does not replace the directory audit date.

Primary context reviewed:

- Tesla Owners Club programme: https://www.tesla.com/ownersclub (redirects to Tesla Engage; automated access can be challenged).
- Tesla Owners UK: https://teslaowners.uk/ and https://teslaowners.uk/regions/ . The site describes its own membership and regional network. These pages do not establish status for unrelated listings.
- Tesla Owners Club of Australia: https://www.teslaowners.org.au/ . The club publishes its own joining information, state representatives and events. Current membership terms should be checked there.
- Natural Earth map outline, public domain: https://www.naturalearthdata.com/about/terms-of-use/ . Existing `/assets/world-land.svg` is reused unchanged.
- GeoNames city index: https://download.geonames.org/export/dump/ , CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ . Existing `/data/viewing/cities.json` is reused unchanged and attributed on the page. It covers larger cities; it is not every town.

## Updating

1. Review club corrections against public sources. Keep the original publication exclusions in place until their issues are resolved. The existing `scripts/build-tesla-clubs.py` imports an editorial publication audit; its default path is an older local upload path, so pass the actual reviewed audit file explicitly when using it.
2. Update `tesla-clubs-data.js` through that publication process. Keep stable listing IDs, including the existing CA-prefixed records. If a new country is introduced, add its ISO code, area and reference coordinates to `data/owners-club-guide.json`; add a regional reference key only when it is supported by the source process.
3. Run `node tests/owners-club.test.mjs`, `node scripts/build-owners-club.mjs`, then `sh scripts/rebuild-js.sh`. Commit source plus generated HTML/search data/bundles.
4. Run `python tests/owners-club-browser.py` with Chromium/Chrome. The dedicated pull-request workflow repeats model, deterministic-build and responsive checks.

The existing site pre-render workflow now runs the Owners Club builder when relevant sources change. This is an editorial directory: no automated process verifies external membership terms or event calendars.

## Storage and later decisions

Only known saved listing IDs and country/area/type/channel/layout preferences use `sd-owners-clubs-v2`. Bookmarks are local to this browser, not member-account sync. Blocked storage falls back to the current page session. Search links whitelist descriptive filters and never include coordinates. Old coordinate-bearing links have those parameters removed on enhancement.

No paid service, key, new backend or external map is required. Account-synced bookmarks, direct club applications, club-submitted event feeds and organiser accounts would need a separate product/data decision. A club-wide link/activity re-audit remains a later editorial task; the page does not claim it has happened.

## Verification

Model/build tests cover source counts, filters, Unicode/aliases, country-versus-region scope, parent networks, missing contacts, safe links/escaping, city matching, privacy, bounded saved state and deterministic generation. Browser checks cover responsive layouts, both themes, no JavaScript, storage restrictions, filters, pagination, dialogs, bookmarks, share fallbacks, city-index failure and location permission behavior. The location/city fixtures test integration rather than asserting real meetup proximity. Preview images are in `docs/previews/owners-club-*` and CI artifacts.

The repository-wide checks also exposed two existing generated-page mismatches outside this redesign: the SpaceX hub's saved calendar snapshot and Starship's saved media markup. Their existing builders were rerun against unchanged main-branch source records; only the generated `spacex.html` and `starship.html` outputs accompany this maintenance. No launch records or unrelated designs were edited.
