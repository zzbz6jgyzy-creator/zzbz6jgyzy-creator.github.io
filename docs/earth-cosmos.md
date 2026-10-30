# From Earth to the Milky Way

Page: `/mission-control.html` (isolated, `noindex,follow`). No paid services,
API keys, billing account, runtime ephemeris API or new hosting are required.
There is no street-level or ground view: the closest the camera can get is a
low Earth orbit (see *Zoom floor* below).

## Experience and architecture

- Quaternion arcball controls grab the surface under the pointer, cross the poles,
  support touch pinch and return smoothly to one-finger dragging. Pause preserves
  the released view. Taps mark a location without recentering it. Keyboard orbit,
  canvas trackpad zoom, reduced motion and reset remain available.
- The Earth gains a restrained 4K terrain-normal layer and an ocean mask used for GGX sun glint (see the lighting model below).
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
  returns naturally through the Solar System to Earth. Zooming into Earth stops
  at a 400 km orbital floor (below).
- Animation stops while hidden. Reduced motion and pause make destination jumps
  immediate. Planet textures load as needed
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
- **HUD** (`#earth-hud`): brand mark, Pause (`#earth-motion`), fullscreen, menu (`#earth-menu`). `data-hud` is `active` or `idle`; idle after 2.5 s without pointer, touch, key or wheel activity. It never idles while the intro or any dialog is open or a `:focus-visible` element is inside it. Reduced motion removes the fade (instant).
- **Panel** (`#earth-panel`, a modal `<dialog>`): View (mode, perspectives, zoom, reset, deep sky, detail, Show labels), Place, Now (UTC, distance), Clouds and credits, Keyboard. Side panel from 700 px, bottom sheet below. Perspective choices close the sheet on phones.
- **Labels:** `data-labels="off|on"` on the root, stored in `localStorage['sd-earth-labels']`. Label buttons stay in the DOM; opacity 0 until hover/focus. `#cosmos-focus-name` shows one soft name for 3.2 s after a view change; `#earth-live` announces name, description and distance (debounced).
- **Provenance chip** (`#earth-provenance`, outside the HUD so it never fades; editorial rule 8): shown only when the view is not live or measured. Galaxy: "Illustration · structural model"; neighbourhood scale: "Catalogue positions · distances approximate"; Earth with illustrative clouds: "Illustrative clouds · live feed unavailable" (or "requesting satellite frame" while loading); satellite frame older than 200 min: "Satellite clouds · HH:MM UTC". Hidden on live Earth with a fresh frame.
- **Planet dots:** with labels off every label keeps a 6 px coloured dot (24 px hit area, so touch devices can find and tap planets); only the name fades. Label boxes are `pointer-events:none`, so drags pass to the canvas. The Sun and Galactic-centre markers (`.is-marker`) stay named regardless of the setting.
- **Toasts:** `#earth-loading`, `#earth-note` (7 s, except the sticky detail-loading message).
- Tests: `tests/earth-browser.py` (intro, session memory, clean-text assertion, HUD, panel focus, credits, no ground UI, zoom floor), `tests/cosmos-browser.py` (labels off/hover/switch/persist, live region), `tests/earth-cosmos.test.mjs` (markup hooks and ids).

## Zoom floor (no ground view)

Owner decision, 30 October 2026: the street-level Ground mode was removed ("it
zooms into a flat map, it looks terrible"). The camera now stops at a realistic
orbital altitude.

- One named constant, `MIN_ORBIT_ALTITUDE_KM = 400` in `earth-live-model.js` (not the cosmos model, so the Starship replay does not pull in the 412 KB astronomy engine through `earth-renderer.js`) (about the ISS). Camera range is stored from Earth's centre, so the renderer converts it with the current `fitDistance` (`earthMaxZoom()`).
- Every route goes through `setZoom()`: wheel, ctrl-wheel/trackpad pinch, touch pinch, `+`/`-`/`=` keys and the panel buttons (`zoomBy`) all call it. `setScale('earth')` clamps its destination to the floor, `setSceneGeo({zoom})` clamps, and `viewLocation()` (used by the place picker) clamps. `updateCamera()` re-clamps every frame, so a resize that changes `fitDistance` cannot leave the camera under the floor.
- Soft approach: `easeToAltitudeFloor()`. Inside the last 1,500 km the remaining margin can at most halve per input step, so the camera glides in geometrically and snaps exactly on the floor under 0.5 km. It is monotone: no overshoot, no bounce, no jitter. Zooming out is never eased.
- At the floor the camera is at about 1.063 Earth radii. The near plane is derived from the distance (also before the cosmos module loads) so the surface is not clipped.
- Detail: once the camera is under 3,000 km, Auto asks for the sharpest tier the device allows (8K, or 4K on low-memory devices; save-data keeps the lower tier), then keeps it. The 4K terrain normal map and ocean mask are already loaded. Source limits still apply: the 8K surface is about 5 km per texel and the live cloud frame about 20 km.
- The selection marker is scaled with distance so it stays a small dot at the floor (it is 45 km wide at scale 1).
- The place picker still exists: choosing a place (or the card's "Fly to this place") turns the globe to it and eases to 2,500 km altitude. It opens nothing else.

## Earth lighting model (stage 2)

All of this lives in `earth-renderer.js` (`PBR_*` shader strings, exported as `earthShadersPhysical`). The older
`earthShaders` export is unchanged and still drives the isolated Starship replay, which only supplies
`uDay/uNight/uCloud/uSun/uCloudOffset`; it keeps its legacy flat look on purpose until it gets its own pass.
Three.js stays at the vendored r170 (WebGL2 only; it has `NeutralToneMapping`, `AgXToneMapping`, `textureGrad`, `textureSize`).

**Atmosphere.** Single scattering after O'Neil, GPU Gems 2 ch. 16: Rayleigh plus Mie (g = 0.76, Cornette-Shanks phase),
exponential density, scale heights in Earth radii. One function (`atmosphereScatter`, in `ATMO_COMMON`) integrates the view ray;
the optical depth from a point to the Sun is the closed-form Chapman function, so there is no inner light-ray loop. The
Chapman fit (leading factor and grazing term tuned by me, after Schueler) is within 3% of a numeric integral for zenith
cosines from 1 to -0.08 (checked at three heights). The Sun path uses real planet curvature (scale height 8 km) with the
exaggerated density profile above the ground, so the horizon path is twice as long while zenith transmittance is unchanged.
The view integral crowds its samples around the limb tangent (limb rays) or towards the ground (rays that hit the planet),
so there is no banding. Steps follow the quality tier: 2K 4, 4K 6, 8K and 16K 10; rays that end on the planet away from the
limb use 3 (grazing ones keep the full count so the limb has no seam).
The **shell mesh only draws the limb glow** beyond the disc. Over the planet the in-scatter is added inside the surface and
cloud shaders, in linear light before tone mapping (`color * viewTransmittance + inscatter`). Doing it in a separate
tone-mapped pass (the first version) summed haze in display space and washed the oceans out.

**Surface.** Land diffuse is albedo x Sun x transmittance of the Sun path, so the day/night edge turns orange. Sky fill is
blue by day and mixes towards a warm tint in a narrow band around sunset. Ocean is the `earth-specular-4k` mask (colour
heuristic only until it loads). Sun glint is a Cox-Munk style Beckmann slope distribution on the smooth geometric normal
(m2 = 0.005; real sea m2 = 0.003 + 0.00512 U, so this is a calm sea of about 0.4 m/s, chosen so the patch stays modest on a
small screen), Schlick Fresnel, a soft clamp so the peak stays near cloud-white. It is a patch with a defined edge that
stretches towards the limb, not a point. The terrain normal map is applied to land diffuse only. City lights start when the
Sun is 6 degrees below the horizon, ramp through nautical and are complete at 18 degrees; the gating on twilight angles is a
design choice. Cloud shadows: the surface looks up the cloud map where the ray towards the Sun meets the cloud shell.

**Clouds.** Lit through transmittance at cloud height, a mild forward-scatter phase (Henyey-Greenstein) with a silver lining
near the terminator, a front-loaded ramp so cloud tops past the ground terminator turn orange-pink, relief shading from the
source brightness, a quintic-smoothed texture read (`textureGrad` with the true screen derivatives), and sub-texel edge
noise above the 2K tier (it adds no cloud where the data has none). The live EUMETSAT frame is 2048 x 1024 (about 20 km per
texel), so close up the shapes are source-limited; smoothing removes stair-steps but cannot invent structure.

**Tone mapping.** Khronos PBR Neutral at exposure 1.2 (see `docs/decisions.md`). Moon, planets and galaxy share it. No
post-processing bloom: an `EffectComposer` at r170 would add an HDR target and blur passes on phones for one highlight.

**Physical versus artistic.**
- Physical in form: Rayleigh and Mie scattering and phase functions, Chapman optical depth, twilight angles (6, 12, 18
  degrees), Fresnel, a wind-roughened-sea slope distribution, view-dependent aerial perspective.
- Graphics constants, not measurements: vertical optical depths 0.0464/0.108/0.265 (R/G/B) are the Bruneton and Neyret 2008
  graphics coefficients (Bucholtz 1995 gives about 0.044/0.097/0.24); Mie 0.022 scattering and 0.025 extinction is a clear-sky
  constant (typical aerosol optical depth is about 0.1).
- Artistic, and labelled in the code: scale heights (about 4x real Rayleigh, 6x Mie) so the limb is visible; `SUN_E` (the
  exposure link to the old look); the in-scatter gain 0.2; view-path extinction x0.6 (`MS`, stands in for multiple scattering,
  keeps the limb blue); the soft 0.004 sun-visibility edge; glint gain, soft peak clamp and roughness; the water-leaving
  radiance and the Fresnel sky colour and gain; city-light strength and halo; sky-fill colours and the cloud night
  ambient; cloud edge noise and relief strength. The cloud shell sits at 0.009 Earth radii (57 km), four to five times real
  cloud tops, so cloud-shadow parallax and cloud-top sunlight timing are exaggerated.
- The day, night and cloud maps are historical or proxy data, not a rendering of the current sky.

**Test and screenshot hook.** `viewer.setSceneGeo({sunLat, sunLon, camLat, camLon, zoom})` fixes the sub-solar point and
points the camera straight down at a place. It also stops the cloud drift and the idle auto-orbit, and is only used by tests
and review captures.

**Sources.** O'Neil, "Accurate Atmospheric Scattering", GPU Gems 2 ch. 16
(<https://developer.nvidia.com/gpugems/gpugems2/part-ii-shading-lighting-and-shadows/chapter-16-accurate-atmospheric-scattering>);
Bruneton and Neyret 2008 and Bruneton 2017 precomputed atmospheric scattering
(<https://github.com/ebruneton/precomputed_atmospheric_scattering>); Hillaire, "A Scalable and Production Ready Sky and
Atmosphere Rendering Technique", EGSR 2020 (<https://sebh.github.io/publications/egsr2020.pdf>); Schueler, "An Analytic
Approximation of the Chapman Function", GPU Pro 3, 2012; Walter et al., "Microfacet Models for Refraction", 2007 (GGX);
Cornette and Shanks 1992 and Henyey and Greenstein 1941 (phase functions); Cox and Munk 1954 (sea-surface slopes); Bucholtz 1995 (Rayleigh optical depth); Khronos PBR Neutral tone mapper (three.js `NeutralToneMapping`) and AgX (Troy Sobotka).
Hillaire's LUT approach is the best fit for a ground-level sky with many lights; for one planet seen from space the
per-pixel analytic form needs no extra render passes or LUT textures, so it was chosen. References for the look: NASA Blue
Marble and ISS photographs of the limb, sun glint and terminator.

## Sources, maintenance and validation

See [all image/data credits](../assets/cosmos/SOURCES.md), the asset manifest and
the [Earth light and cloud documentation](earth-live-explorer.md). Each raster has
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
- Existing Earth browser journeys cover light/dark, reduced motion, short
  screens, pinch, the zoom floor (wheel, ctrl-wheel, keys, buttons, pinch, API),
  no ground UI and no map/tile host requests, missing feeds/modules/textures,
  WebGL context loss and a real provider cloud film. The Starship
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
the clouds are dated infrared proxies, surface maps are historical, nothing closer
than low orbit is offered, and the outer galaxy is a model. Higher fidelity weather would need
a cloud-classification product with its own availability and licence review.
