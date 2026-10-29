# Earth: current light and free ground exploration

Review URL: `/mission-control.html`. This isolated preview stays `noindex,follow`.
The Starship replay is unchanged; it still shares the same exported Earth shader strings.

## What changes

- Retains the NASA day surface (2K/4K/8K), Black Marble city lights, custom atmospheric scattering, ocean glint and GPU-adaptive rendering.
- Adds a current UTC solar direction in Earth-fixed coordinates. Rotating the viewing angle does not move day and night across geographic places. The sun updates even when camera rotation is paused. Artistic Day/Night studies remain explicitly labelled.
- Adds UTC time, IANA civil clocks for 12 featured destinations (including DST), and a calculated daylight/twilight/night state at the selected coordinates. Other coordinates use labelled UTC. Geolocation uses labelled device time and is requested only on a user gesture.
- Adds latest EUMETSAT-derived clouds at 2K/4K, or 8K on suitable devices when Ultra is selected. Zooming past the globe hands off to a map at the geographic view centre. Cloud geometry stays registered to geography, with no decorative drift of the observed mask.
- Adds a lazy-loaded MapLibre ground view, styled specifically for this site: roads, labels, building outlines/extrusions, hillshade and real elevation. Includes place/coordinate finder, optional location permission, map zoom/tilt/compass/scale, flat view, terrain/building switches, return to globe and four illustrated destination cards.
- Adds an external Satellite imagery link to Google Maps at the current map centre, using Maps URLs. No Google API, keys, embedding, billing account or paid 3D tiles.

## Free sources and limits

**Clouds:** <https://clouds.matteason.co.uk/> and
<https://github.com/matteason/live-cloud-maps>. Provider images and code are CC0;
required source attribution is **Contains modified EUMETSAT data**.

The provider advertises updates every three hours. CORS was verified on both 2048×1024 and 4096×2048 image endpoints. This is a processed visible/infrared composite, not instantaneous weather. The provider mirrors polar regions and may contain holes. The viewer masks the mirrored pixels beyond ±67.5°, with a soft transition starting at ±63°. Missing polar clouds mean unavailable observations, not clear skies. A separate opacity response preserves detail in the observed cloud mask without altering the shared replay shaders. It must not be used for forecasting or navigation.

The verified production endpoint currently sends **no Last-Modified timestamp**. The UI therefore says **Update time not supplied**, rather than inventing an observation time from request time or a schedule. If the provider supplies Last-Modified later, it is treated as publication time, displayed in UTC and aged; it is never labelled as a single observation timestamp. Images older than 12 hours are marked older; >3 days or >10 minutes in the future are rejected. A failed refresh preserves the last good texture with a failure label. If no latest texture loaded, the original static clouds are clearly labelled illustrative.

Browser fetches use conditional cache revalidation, a bounded timeout, no credentials and no referrer. The page checks at entry, on becoming visible, on manual refresh and every 30 minutes while visible. No weather images are repeatedly committed to Git, and there is no scheduled workflow, API key or deployment to configure.

**Streets/buildings:** <https://openfreemap.org/> and OpenStreetMap/OpenMapTiles.
Verified CORS-enabled TileJSON at `https://tiles.openfreemap.org/planet` and
Noto Sans glyphs. OpenFreeMap explicitly permits commercial use without a key,
request/view limits or payment information; it is a public service without an SLA.
Preserve the visible attribution control. OSM coverage and building-height quality vary;
unrecorded heights are approximate, not a measured or photographic model.

**Terrain:** public Terrarium PNGs from
`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`.
Verified CORS with the production site Origin. No AWS account is needed.
<https://registry.opendata.aws/terrain-tiles/>, <https://www.mapzen.com/rights/>.
Elevation is shown at 1.15× for readability; source age/resolution varies. It is not
live terrain or a survey. Terrain has an independent fallback to a flat street map.

**Satellite photography:** <https://developers.google.com/maps/documentation/urls/get-started>.
Maps URLs need no API key. The user explicitly opens Google Maps externally;
its imagery and dates are separate from this globe. Photo coverage varies.
No Google tiles are fetched, scraped or mixed into the custom renderer.

## Pinned map engine

MapLibre GL JS **6.16.0** (BSD-3-Clause, with bundled third-party notices) is served
locally from `vendor/maplibre/6.16.0/`, fetched verbatim from the published npm distribution:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| maplibre-gl.mjs | 1108049 | fbbdf8ddd9a48e49059a4be6795a4f214a711314bb5809f72d3730b48e7897e3 |
| maplibre-gl-worker.mjs | 519372 | 0bf06492bdb7ba3d4132b78e435621bfba60d5250967991c02b1a73affea8cd5 |
| maplibre-gl.css | 71596 | a90798a1953017790e590f7e1bd35ff103a8a4263972cb47290b78adf86f8c20 |
| LICENSE | 5984 | ee5fc05a0677eaf69601d2c7db0d9ecd6cc27c3abc1d0733bc9ed34707cf8ef2 |

The engine, CSS, worker, elevation and vector tiles load only when the ground view
opens. The globe stops rendering while hidden. Reduced motion disables automatic
camera rotation and animated flights. No geocoding requests, background location
watch, user-location storage, cookies or analytics are added.

## Verification

`node tests/earth-live-model.test.mjs` checks independent solar equinox/solstice bounds,
solar noon, antipodal darkness, coordinate round trips/dateline wrapping, invalid input,
external URL parameters and stale/future cloud dates.

The Earth workflow runs actual Three.js and MapLibre in Chromium/SwiftShader at
390, 768 and 1440 px, shorter phone screens and landscape, light/dark, touch/pinch and reduced motion. It checks lazy
loading, 8K upload, pause, lighting modes, place search, actual rendered provider
building features, map layers, coordinates, location permission, feed failures,
WebGL failures/context loss and module failures. It records screenshots and a real
provider cloud/city/terrain film. Synthetic cloud metadata is used only in deterministic
tests; the final film uses the actual public feed. All external traffic is read-only
and restricted to the three documented provider hosts.

## Later decisions

- Strict observation timestamps require a source that publishes per-frame metadata;
  do not infer one from an HTTP request date. The current cloud provider is honest
  about its approximate cadence and limitations.
- Photogrammetric buildings, household-resolution photographic terrain and Google
  3D Tiles remain outside the no-cost scope. The ground view uses open map geometry.
- Public services can change availability. Keep fallbacks and attribution; revisit
  hosting only if real traffic makes it necessary.
