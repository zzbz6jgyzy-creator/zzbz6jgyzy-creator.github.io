# From Earth to the Milky Way

Page: `/mission-control.html` (isolated, `noindex,follow`). No paid services,
API keys, billing account, runtime ephemeris API or new hosting are required.
The detailed map still uses free open geometry, rather than Google 3D Tiles.

## Experience and architecture

- Quaternion arcball controls grab the surface under the pointer, cross the poles,
  support touch pinch and return smoothly to one-finger dragging. Pause preserves
  the released view. Taps mark a location without recentering it. Keyboard orbit,
  canvas trackpad zoom, reduced motion and reset remain available.
- The Earth gains a restrained 4K terrain-normal layer and ocean reflection mask.
  The opening camera selects a naturally lit three-quarter view using the current
  Sun direction; geographic sunlight is unchanged. The day/night base maps remain
  historical. Auto adapts to the GPU and data-saving
  preference. Studio is manual, requires a large screen, at least 8 GB reported
  device memory and a 16K-capable GPU, and downloads a 19.7 MB 16384×8192 JPEG.
  No source texture is upscaled. Other devices retain 2K/4K/8K tiers.
- One Three.js context renders Earth, the Moon, planets, stars and galaxy. Camera
  range is stored in kilometres; floating origins and Earth/AU/light-year/kpc units
  avoid near/far precision loss. Body radii and distances are physical. Enlarged
  labels make unresolved worlds selectable without enlarging their physical disks.
- A four-stop scale rail and world finder provide direct navigation. Manual zoom
  traverses all scales; galaxy-scale zoom smoothly shifts the focus towards the
  galactic centre while keeping Earth as its logical home anchor. Zooming back in
  returns naturally through the Solar System to Earth. Zooming into Earth hands
  off to the existing map. A visitor's zoom gesture below map level 3 returns to
  the globe at the map centre; automatic map flights and resizes do not. The wide
  map releases its workers/context on return and is recreated when opened again.
- Animation stops while hidden. Reduced motion and pause make destination jumps
  immediate. Planet textures load as needed, the map engine only when opened,
  and the 16K surface only when explicitly selected. Failed extra assets preserve
  the Earth experience; WebGL/module failures retain the original fallbacks.

## What is calculated, photographed and modelled

`earth-cosmos-model.js` uses locally vendored **Astronomy Engine 2.1.19** (MIT) for
current J2000 Sun, Moon and planet positions and IAU body orientations. The
Earth-fixed transform uses Greenwich sidereal time and precession. Independent
tests check galactic axes, lunar orientation and physical scale bounds. These
are visualisation ephemerides, not a spacecraft-navigation instrument.

The **ESO/S. Brunier** 2009 photographic panorama is projected in IAU galactic
coordinates. The Deep sky control changes its viewing exposure. It is a historical
composite combined with the rendered Earth, rather than one camera exposure.
It fades away outside the Solar System; an Earth-view panorama is unsuitable as
the background of a distant outside observer. Its credit is visible alongside
the source status whenever the photographic sky is displayed.

**13,747 HYG v4.1 stars** have catalogue positions and linear proper motions,
originally at epoch 2000. The selection includes apparent magnitude ≤6.5 or
distance ≤40 pc and excludes the catalogue’s unknown-distance sentinel. Coverage
is incomplete and distances uncertain. Marker size and brightness are illustrative.
The modified database is distributed under **CC BY-SA 4.0**, with credit and
transformation notes embedded in `assets/cosmos/stars.json`.

The outside **Milky Way is a structural illustration**, not an external photograph
or measured map of every star. It uses a roughly 100,000-light-year disk,
bar/bulge, schematic arms, dust and a synthetic stellar population. The Sun is
marked about 8.2 kpc (26,700 light-years) from the centre and 20.8 pc above the
plane. IAU galactic orientation is retained. Arm paths and luminosity are artistic;
their uncertainty is not hidden behind a claim of photographic accuracy.

## Weather audit and replacement

The old Matt Eason endpoint returned HTTP 200 and CORS access but supplied no
image timestamp. At 16:46 and 17:04 UTC on 29 October 2026 its 4K image digest was
`591d9787eba11242abddff7ad41c311a51bc6e8df79c1f80c165900d356c28ff`.

Independent downloader releases `maps-20261029_0600`, `_0900` and `_1200` all
contained the same 8K cloud digest:
`d871cc4615e32a2116c40c0c02aec05257224a8f3e95a420a27823f27ef8dfb5`.
Sources: [old generator](https://github.com/matteason/live-cloud-maps) and
[download archive](https://github.com/joshuabinswanger/matteason_live-cloud-maps_downloader/releases).
This does not establish the exact age of the image, but it does prevent us from
verifying current weather. Download/retrieval times are not observation times.

The replacement reads the EUMETSAT public WMS `mumi:worldcloudmap_ir108` time
dimension and pins the exact frame in GetMap. The source probe returned the
**2026-10-29 15:00 UTC** frame, a three-hour cadence, CORS `*`, and a 2048×1024 PNG
with digest `10b466e02c2cf36ae1557dc95e93946cb4027ed54ecc1e51f0a56f0e4324afee`.
Endpoint: <https://view.eumetsat.int/geoserver/ows>. The runtime requests JPEG
for a smaller transfer and honours the pinned image URL’s normal cache policy;
metadata is revalidated separately. The audit above used the source PNG.

**Contains modified EUMETSAT data.** The image is infrared, converted to an
opacity proxy; cold surfaces can look cloudy and low clouds can be missed.
It is not a full weather/classification product. A composite frame combines
satellite observations and may be delayed. Missing polar coverage is masked,
not filled with invented weather. The visible UI shows source frame time,
older/unavailable status and illustrative fallback status. The metadata and
image are separate requests, so the frame is explicitly pinned to prevent races.

No weather snapshots are repeatedly committed to the repository. Direct public
requests can be slow or fail; the previous dated frame is preserved and labelled.
No current frame means illustrative clouds, never an invented “live” label.

Transient HTTP 408, 429, 500, 502, 503 and 504 responses get at most three attempts
within the existing 100-second overall deadline. A numeric Retry-After is honoured
up to four seconds; other retries use short bounded delays. Cancellation stops
the retry, and other HTTP errors are not retried. The exact pinned frame URL is
retained. Diagnostics expose the final provider status without calling it a
successful image load.

## Immersive viewer (stage 1)

- **Opening overlay** (`#earth-intro`, a modal-style dialog): title, one line, Enter button, small instructions. Enter, a tap or Esc dismisses it; focus moves to the canvas; `sessionStorage['sd-earth-intro']` skips it for the rest of the session (a tiny inline script sets `html.earth-entered` before first paint so it never flashes). The page `h1` is a visually hidden heading. Without JavaScript the overlay shows the text only.
- **HUD** (`#earth-hud`): brand mark, Pause (`#earth-motion`), fullscreen, menu (`#earth-menu`), plus Back to Earth in ground mode. `data-hud` is `active` or `idle`; idle after 2.5 s without pointer, touch, key or wheel activity. It never idles while the intro or any dialog is open or a `:focus-visible` element is inside it. Reduced motion removes the fade (instant).
- **Panel** (`#earth-panel`, a modal `<dialog>`): View (mode, perspectives, zoom, reset, deep sky, detail, Show labels), Place, Now (UTC, distance), Clouds and credits, Keyboard. Side panel from 700 px, bottom sheet below. Perspective choices close the sheet on phones.
- **Labels:** `data-labels="off|on"` on the root, stored in `localStorage['sd-earth-labels']`. Label buttons stay in the DOM; opacity 0 until hover/focus. `#cosmos-focus-name` shows one soft name for 3.2 s after a view change; `#earth-live` announces name, description and distance (debounced).
- **Toasts:** `#earth-loading`, `#earth-note` (7 s, except the sticky detail-loading message), `#ground-status` (while the map loads and for 5 s after a new message).
- Tests: `tests/earth-browser.py` (intro, session memory, clean-text assertion, HUD, panel focus, credits, ground view text), `tests/cosmos-browser.py` (labels off/hover/switch/persist, live region), `tests/earth-cosmos.test.mjs` (markup hooks and ids).

## Sources, maintenance and validation

See [all image/data credits](../assets/cosmos/SOURCES.md), the asset manifest and
the [existing ground-view documentation](earth-live-explorer.md). Each raster has
its exact URL, dimensions, size and SHA-256 in `assets/cosmos/manifest.json`.
`scripts/build-cosmos-assets.py` is a manual reproducible asset preparation tool;
`--check` verifies the committed files offline. No content-writing workflow remains.

- `node tests/earth-cosmos.test.mjs`: independent IAU galactic-centre direction,
  coordinate round trips, lunar prime meridian, Sun/Moon/Neptune distances, body
  basis vectors, units and bounded galaxy population.
- `node tests/earth-weather.test.mjs`: timestamp extraction, future/old/missing
  frame rejection, WMS axis order and explicit frame pinning, preserved old frame
  on failure. Browser fixtures identify themselves as fixtures.
- `tests/cosmos-browser.py`: actual Three.js at desktop, tablet and phone sizes,
  held surface point, over-pole drags, pause stability, touch drag, trackpad zoom,
  measured scale transitions, catalogue loading, optional 16K upload, flights,
  screenshots and a film. Actual public satellite requests are logged.
- Existing Earth/ground browser journeys cover light/dark, reduced motion, short
  screens, pinch, map geometry and terrain, missing feeds/modules/textures,
  WebGL context loss and a real provider cloud/city/terrain film. The Starship
  cinematic replay is checked separately; exported shared shaders are unchanged.

The real-provider film checks either a dated infrared texture or the expected
labelled illustrative fallback after an observed transient provider HTTP error.
Fallback requires the browser response status to match the weather diagnostic,
no observed texture, no invented timestamp, and the visible “Illustrative” label.
Missing/future/invalid metadata, bad image data, unexpected HTTP errors, unknown
network failures and rendering errors remain failures. `satellite-results.json`
records which branch ran and the actual responses. Deterministic browser journeys
continue to require a valid satellite texture using explicitly identified fixtures;
unit tests cover transient recovery, exhausted retries, cancellation and preserving
a previously loaded dated frame. No workflow failure is ignored or skipped.

Remaining source limits are visible design decisions, not paid-service setup:
the ground is mapped geometry, the clouds are dated infrared proxies, maps are
historical, and the outer galaxy is a model. Higher fidelity weather would need
a cloud-classification product with its own availability and licence review.
