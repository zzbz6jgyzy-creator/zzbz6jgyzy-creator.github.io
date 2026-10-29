# Earth: current light and free ground exploration

The Earth-to-Milky-Way extension is documented in [earth-cosmos.md](earth-cosmos.md).

Review URL: `/mission-control.html`. This isolated preview stays `noindex,follow`.
The Starship replay is unchanged; it still shares the same exported Earth shader strings.

## What changes

- Retains the NASA day surface (2K/4K/8K, with guarded manual 16K Studio selection), Black Marble city lights, custom atmospheric scattering, ocean glint and GPU-adaptive rendering.
- Adds a current UTC solar direction in Earth-fixed coordinates. Rotating the viewing angle does not move day and night across geographic places. The sun updates even when camera rotation is paused. Artistic Day/Night studies remain explicitly labelled.
- Adds UTC time, IANA civil clocks for 12 featured destinations (including DST), and a calculated daylight/twilight/night state at the selected coordinates. Other coordinates use labelled UTC. Geolocation uses labelled device time and is requested only on a user gesture.
- Adds a dated EUMETSAT infrared cloud proxy at 2K, or up to 4K when a higher surface-quality mode is selected. Zooming past the globe hands off to a map at the geographic view centre. Cloud geometry stays registered to geography, with no decorative drift of the observed mask.
- Adds a lazy-loaded MapLibre ground view, styled specifically for this site: roads, labels, building outlines/extrusions, hillshade and real elevation. Includes place/coordinate finder, optional location permission, map zoom/tilt/compass/scale, flat view, terrain/building switches, return to globe and four illustrated destination cards.
- Adds an external Satellite imagery link to Google Maps at the current map centre, using Maps URLs. No Google API, keys, embedding, billing account or paid 3D tiles.

## Free sources and limits

**Satellite infrared:** [EUMETSAT EUMETView](https://view.eumetsat.int/), public WMS
layer `mumi:worldcloudmap_ir108`. Attribution: **Contains modified EUMETSAT data**.
The viewer reads the published frame time from GetCapabilities, rejects missing,
future or >3-day-old frames, and requests that exact time through GetMap. The
source advances in three-hour steps and can be delayed. A composite combines
satellite observations; its frame time is not one simultaneous capture of Earth.

Infrared brightness is converted to a visual cloud-opacity proxy. It can miss low
cloud and confuse cold surfaces with cloud. It is not a full cloud-classification,
forecast or instantaneous-weather product. Polar areas beyond ±67.5° are masked,
with a soft transition from ±63°. Missing coverage does not mean clear skies.
Observed imagery stays geographically registered with no decorative drift.

The old Matt Eason feed was removed: it supplied no image timestamp, and three
recent archived downloads contained identical image digests. An archive download
time or HTTP request date cannot establish observation freshness. See the audit
and source links in [earth-cosmos.md](earth-cosmos.md).

Browser fetches have bounded timeouts, no credentials and no referrer. The page
checks at entry, on becoming visible, on manual refresh and every 30 minutes
while visible. Frames older than 12 hours are marked older. Failed refreshes keep
the previous dated frame with an unavailable label; without one, the static cloud
layer is explicitly illustrative. No weather-image commits, scheduled workflow,
API key, billing account or backend deployment are required.

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

- The satellite composite has a source frame time, not per-pixel observation times.
  Keep the three-hour cadence and infrared-proxy limitations visible.
- Photogrammetric buildings, household-resolution photographic terrain and Google
  3D Tiles remain outside the no-cost scope. The ground view uses open map geometry.
- Public services can change availability. Keep fallbacks and attribution; revisit
  hosting only if real traffic makes it necessary.

