# Earth: current light and satellite clouds

The Earth-to-Milky-Way extension is documented in [earth-cosmos.md](earth-cosmos.md).

Review URL: `/mission-control.html`. This isolated preview stays `noindex,follow`.
The Starship replay is unchanged; it still shares the same exported Earth shader strings.

## What changes

- Retains the NASA day surface (2K/4K/8K, with guarded manual 16K Studio selection), Black Marble city lights, custom atmospheric scattering, ocean glint and GPU-adaptive rendering.
- Adds a current UTC solar direction in Earth-fixed coordinates. Rotating the viewing angle does not move day and night across geographic places. The sun updates even when camera rotation is paused. Artistic Day/Night studies remain explicitly labelled.
- Adds UTC time, IANA civil clocks for 12 featured destinations (including DST), and a calculated daylight/twilight/night state at the selected coordinates. Other coordinates use labelled UTC. Geolocation uses labelled device time and is requested only on a user gesture.
- Adds a dated EUMETSAT infrared cloud proxy at 2K, or up to 4K when a higher surface-quality mode is selected. Cloud geometry stays registered to geography, with no decorative drift of the observed mask.
- The ground view (MapLibre street map, terrain, satellite-imagery link) was removed on 30 October 2026; see `docs/decisions.md`. The camera stops at a 400 km orbital floor. The place picker flies the globe to a place.

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
retries transient provider HTTP failures at most twice within the same deadline;
other errors are not retried. Confirmed provider outages are verified against the
visible fallback in the real-source browser check, while invalid data stays fatal.
The page
checks at entry, on becoming visible, on manual refresh and every 30 minutes
while visible. Frames older than 12 hours are marked older. Failed refreshes keep
the previous dated frame with an unavailable label; without one, the static cloud
layer is explicitly illustrative. No weather-image commits, scheduled workflow,
API key, billing account or backend deployment are required.

## Verification

`node tests/earth-live-model.test.mjs` checks independent solar equinox/solstice bounds,
solar noon, antipodal darkness, coordinate round trips/dateline wrapping, invalid input,
and stale/future cloud dates.

The Earth workflow runs actual Three.js in Chromium/SwiftShader at
390, 768 and 1440 px, shorter phone screens and landscape, light/dark, touch/pinch and reduced motion. It checks
8K upload, pause, lighting modes, place search, the zoom floor, absence of ground UI, no requests to map or tile hosts,
coordinates, location permission, feed failures,
WebGL failures/context loss and module failures. It records screenshots and a real
provider cloud film. Synthetic cloud metadata is used only in deterministic
tests; the final film uses the actual public feed. All external traffic is read-only
and restricted to the EUMETSAT host.

## Later decisions

- The satellite composite has a source frame time, not per-pixel observation times.
  Keep the three-hour cadence and infrared-proxy limitations visible.
- Street-level, photogrammetric and 3D-tile views are out of scope. The honest limit of the
  imagery is low orbit.
- Public services can change availability. Keep fallbacks and attribution; revisit
  hosting only if real traffic makes it necessary.

