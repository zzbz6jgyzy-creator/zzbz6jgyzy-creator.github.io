# From Earth to the Milky Way

Page: `/mission-control.html` (isolated, `noindex,follow`). No paid services,
API keys, billing account, runtime ephemeris API or new hosting are required.
There is no street-level or ground view: the closest the camera can get is
2,500 km above the surface (see *Zoom floor* below).

## Experience and architecture

- The camera is a 6-DOF flight camera (`earth-flight.js`, see *Flight and autopilot*): quaternion orbit controls that grab the
  surface under the pointer and cross the poles, free flight with inertia, and a curved autopilot between worlds. Pause preserves
  the released view. Taps mark a location without recentering it, or fly to the world tapped. Keyboard, reduced motion and reset remain available.
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
  traverses all scales (and the autopilot flies there on a curve); galaxy-scale zoom smoothly shifts the focus towards the
  galactic centre while keeping Earth as its logical home anchor. Zooming back in
  returns naturally through the Solar System to Earth. Zooming into Earth stops
  at a 2,500 km floor (below).
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
- **Panel** (`#earth-panel`, a modal `<dialog>`): View (mode, perspectives, zoom, reset, deep sky, detail, Show labels), Place, Now (UTC, distance), Time (Live, speeds, reverse, UTC date, next solar/lunar eclipse), Clouds and credits, Keyboard. Side panel from 700 px, bottom sheet below. Perspective choices close the sheet on phones.
- **Labels:** `data-labels="off|on"` on the root, stored in `localStorage['sd-earth-labels']`. Label buttons stay in the DOM; opacity 0 until hover/focus. `#cosmos-focus-name` shows one soft name for 3.2 s after a view change; `#earth-live` announces name, description and distance (debounced).
- **Provenance chip** (`#earth-provenance`, outside the HUD so it never fades; editorial rule 8): shown only when the view is not live or measured. Simulated clock: "Simulated time · HH:MM UTC D Mon YYYY" (galaxy and neighbourhood still append their model notes). Live galaxy: "Illustration · structural model"; neighbourhood scale: "Catalogue positions · distances approximate"; Earth with illustrative clouds: "Illustrative clouds · live feed unavailable" (or "requesting satellite frame" while loading); satellite frame older than 200 min: "Satellite clouds · HH:MM UTC". Hidden on live Earth with a fresh frame. Simulated time keeps the live cloud frame and labels it "not for this time".
- **Planet dots:** with labels off every label keeps a 6 px coloured dot (24 px hit area, so touch devices can find and tap planets); only the name fades. Label boxes are `pointer-events:none`, so drags pass to the canvas. The Sun and Galactic-centre markers (`.is-marker`) stay named regardless of the setting.
- **Toasts:** `#earth-loading`, `#earth-note` (7 s, except the sticky detail-loading message).
- Tests: `tests/earth-browser.py` (intro, session memory, clean-text assertion, HUD, panel focus, credits, no ground UI, zoom floor), `tests/cosmos-browser.py` (labels off/hover/switch/persist, live region), `tests/earth-cosmos.test.mjs` (markup hooks and ids).

## Flight and autopilot

Owner decision, 30 October 2026 ("Free flight + autopilot"): movement was too linear and zooming dived into planets, so the
camera is now a flying camera rather than a zoom slider. All of it lives in `earth-flight.js`, pure maths with no DOM and no
three.js (node-tested, no allocation per frame). `earth-renderer.js` turns its state into a camera, `earth-cosmos.js` supplies the
body positions (`scenePosition`) and the floating origin.

**State.** The camera is stored as (anchor body, offset in km from that body, orientation quaternion). The anchor is the nearest
world in free flight (with hysteresis), the focused world in orbit, and the galactic centre beyond about 2,000 light-years from the
Sun, so the offset is always small next to what is in view and float32 keeps its precision from the 2,500 km Earth floor to the
Milky Way. Units stay km (the cosmos module converts to Earth radii, AU, light-years or kpc for rendering).

**Orbit mode** (default, near a world). Drag turns the world by the surface point under the pointer; on release the momentum decays
on a critically damped spring (none while paused or under reduced motion). Scroll, pinch, W/S and +/- zoom on a log scale through a
critically damped spring, and while zooming in the orbit turns a fraction of the way towards the point under the cursor or fingers.
Floors: Earth keeps `MIN_ORBIT_ALTITUDE_KM` (2,500 km); every other world stops 0.4 radii above its surface (1.4 R from the centre).

**Free flight.** Entered with F (or the panel's Flight section), by right-drag, or when you cancel the autopilot. It moves in
the camera's own axes with a velocity spring (response ~0.25 s) and a 6-DOF orientation that follows the target orientation on
a second spring. The cruise speed is 0.35 x the altitude above the nearest surface per second, so it is metres per second when
you could be that close and light-years per second between the stars, and feels the same at every scale; the multiplier (1/32 to 32)
and Shift (x4) scale it. Floors hold in this mode too: the camera slides along the floor sphere instead of passing through it,
and a move is cut into sub-steps so even a boosted move cannot jump over a world. Each body has a sphere of influence of 40 radii;
inside it the panel offers "Orbit <world>" and O orbits the nearest one (the camera turns to face it smoothly).

| Input | Orbit | Free flight |
|---|---|---|
| Mouse drag | turn the world | right-drag or drag to look (grab the sky) |
| Scroll / trackpad pinch | zoom toward the cursor | change cruise speed |
| Keyboard | arrows or A/D orbit, W/S or +/- zoom | W A S D move, Q/E down/up, arrows look, Z/C roll, Shift boost, [ ] speed |
| One finger | turn the world | look |
| Two fingers | pinch zooms | drag moves (up forward, sideways strafes), pinch changes speed |
| Mode | F free flight | O orbit nearest world |
| Anywhere | Home reset, Space pause, Esc stops the autopilot | |

A key held for less than 140 ms still moves the camera a little, so a tap always does something. While paused or under reduced
motion each key press is one discrete step, with no inertia. There is no thumb pad: two-finger drag does that job on phones, and
the panel's Flight section switches modes without a keyboard.

**Autopilot.** Choosing a world (panel list, a label dot, or a tap on its disc) calls `flyTo()`. The path is a cubic Bezier that
leaves radially away from the nearest world and arrives radially towards the target, plus a sideways swing found by search until
every other world's floor sphere is cleared (checked against the exact polyline, not frames), so Earth to a planet behind the Sun
arcs past the Sun. The pace is the ratio of "travelled plus start altitude" to "left plus end altitude" moving linearly (eased)
in log space: exponential departure, fast middle, exponential deceleration into the target, a smooth speed throughout. A trip is
2 to 6.5 s (Earth to Saturn about 3 s). The camera turns from its current orientation to face the target over the first half.
Arrival is orbit mode at the preset framing distance (6.5 radii, Saturn 12, the Sun 95 AU, the galaxy 60 kpc). Any input (key,
scroll, pointer, touch) cancels it, the camera coasts to a stop on its own velocity, and the mode becomes free flight. Under
reduced motion or pause the autopilot jumps straight to the end.

**Camera paths (for a later Cinema mode).** `flight.playPath(keyframes, {onDone, onKeyframe})` plays an array of
`{target, distance, yaw, pitch, duration, easing, hold}` (`normalizeKeyframes` validates; easings `linear in out inOut smooth`;
yaw/pitch are the camera's offset direction from the target in the scene frame). Each keyframe is one autopilot segment with the
same avoidance. `DEMO_PATH` (Earth, Moon, Earth) is reachable only through `window.__earthPreview.__cinemaDemo()` for tests and
nothing in the interface uses it yet. Input stops a path like any autopilot.

**Known limits.** The Earth-fixed scene frame turns with the Earth. It is rebuilt every frame while the camera is moving (about 0.2 ms) and once a second at rest, so worlds never step; the autopilot also blends from the planned target position to the live one, so a frame turn cannot make a trip jump (tested with a 2.18e-3 rad turn mid-trip). Orbit-mode zoom-out is not cut off at the sphere of influence (scrolling out to the galaxy still works); free flight is entered explicitly. The thumb control was not built: two-finger drag moves, and the panel has Turn buttons for users who cannot drag. Under pause or reduced motion a two-finger move does nothing (use the keys); any movement key, scroll or touch stops the autopilot.

## Time control

Owner-facing clock, 30 October 2026. All of it lives in `earth-time.js` (pure maths plus Astronomy Engine eclipse search; no DOM). `earth-renderer.js` ticks it each frame and passes the Date into `solarPosition` and `cosmos.update`. Pause still only stops the camera.

- **Live** (default): wall-clock UTC. Sunlight, ephemerides and the Now strip follow it. Clouds are the latest EUMETSAT frame.
- **Speed:** ±1, ±10, ±100, ±1 000, ±10 000. Reverse flips the sign. 1× while already Live stays Live; any other speed leaves Live.
- **Date:** a `datetime-local` labelled UTC; picking a value freezes the clock at that instant (speed 0).
- **Eclipse jumps:** `SearchGlobalSolarEclipse` / `SearchLunarEclipse` (and Next* if the peak is already under a minute away). The clock freezes at the peak. Shadows are not drawn yet.
- **Editorial:** the provenance chip reads `Simulated time · HH:MM UTC D Mon YYYY`, and on Earth/Moon appends `· clouds not for this time` (or `· illustrative clouds`). The Clouds row says the same. No historical weather is invented.

Tests: `tests/earth-time.test.mjs`. `?v=` token `20261030-time1`.

## Zoom floor (no ground view)

Owner decision, 30 October 2026: the street-level Ground mode was removed ("it
zooms into a flat map, it looks terrible"). The camera also stops well above the
surface. The first cut was 400 km (like the ISS); after seeing 400, 1,000 and 2,500 km samples the owner chose
**2,500 km**, because the global imagery is only crisp from there (8K surface is about 5 km per texel, the live cloud frame about 20 km;
at 400 km one texel covered 6 to 7 screen pixels). It will be lowered when sharper imagery lands.

- One named constant, `MIN_ORBIT_ALTITUDE_KM = 2500` in `earth-live-model.js` (not the cosmos model, so the Starship replay does not pull in the 412 KB astronomy engine through `earth-renderer.js`). Camera range is stored from Earth's centre, so the renderer converts it with the current `fitDistance` (`earthMaxZoom()`).
- Every route reaches the floor in `earth-flight.js`: wheel and pinch (`zoomBy`), `setDistance` for `setZoom()`, the `+`/`-`/`=` keys and panel buttons, free flight, the autopilot (`flyTo` clamps its framing distance) and `setSceneGeo({zoom})`, `viewLocation()` (place picker) and resize (`scaleDistance`). The floor sphere is also enforced every frame against free flight and orbit.
- Soft approach: the zoom is a critically damped spring on log distance aimed at the clamped target, so the camera glides onto the floor without overshoot or bounce (the flight module also pins it to the floor if a spring ever crossed). `easeToAltitudeFloor()` stays exported and tested in `earth-live-model.js` but is no longer on the zoom path.
- At the floor the camera is about 1.39 Earth radii from the centre. The near plane is derived from the distance (also before the cosmos module loads).
- Detail: once the camera is within twice the floor altitude (`CLOSE_DETAIL_ALTITUDE_KM`), Auto asks for a sharper tier, then keeps it: 8K on desktop, 4K on phones (width under 800 px or 4 GB or less reported memory; iOS reports no memory, so width decides); save-data keeps the lower tier.
- The selection marker is scaled with distance and sits at 1.0005 R, so it stays a small dot on the tapped point.
- The place picker still exists: choosing a place (or the card's "Fly to this place") brings the camera home to Earth if it was at another scale, turns the globe to the place and jumps (it does not animate) to 1.1 x the floor altitude. It opens nothing else.

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

## Phone support (30 Oct 2026)

The explorer is a full-bleed canvas, so every edge matters on a phone. What the page does now:

- **Viewport:** `width=device-width,initial-scale=1,viewport-fit=cover`; pinch zoom stays allowed. `html{touch-action:manipulation}` stops double-tap zoom on controls, the canvas keeps `touch-action:none` for orbit and pinch, `overscroll-behavior:none` stops the page rubber-banding (a product call: it also disables pull-to-refresh on this page), and the panel and dialogs use `overscroll-behavior:contain`.
- **Height:** `.earth-experience` is `100vh`, then `100svh` (not `dvh`, so the hero never grows and reallocates WebGL when the toolbar hides; the panel and dialogs use `dvh`); there is no `min-height` any more (the old 420 px floor cut the bottom off landscape phones, which are 360-430 px tall). `ResizeObserver` resizes the renderer, which caps pixel ratio at 2 and at 2.4 MP on tall screens.
- **Safe areas:** `:root` defines `--sat/--sar/--sab/--sal` from `env(safe-area-inset-*,0px)`. HUD, provenance chip, toasts, focus name, intro overlay, panel head and body, dialogs and the discover section all use them, so a landscape notch on either side and the home indicator are respected.
- **Panel:** bottom sheet (grabber, `max-height:min(82dvh,720px)`, internal scroll, bottom padding includes the home indicator) when the viewport is under 700 px wide and over 500 px tall. Shorter screens (every landscape phone) and wider ones get the right-hand side sheet, with the right inset added so nothing sits under the notch.
- **Intro:** the overlay is a scrolling flex container with `margin:auto` on the card, so it centres when it fits and scrolls from the top (never clips the heading) with large text or tiny screens. Enter is visible without scrolling on every device in the matrix.
- **Dialogs (places, search, about):** pinned inside the safe area (`inset` plus insets), `max-height` in `dvh`, internal scroll. While the on-screen keyboard is up (`visualViewport` scale 1, height more than 120 px below `innerHeight`, a dialog open; pinch zoom is not a keyboard) `html.kb-open` pins the dialog to the visual viewport via `--vv-h/--vv-top` and the focused field is scrolled into view. The search input is 16 px so iOS Safari does not zoom the page on focus.
- **Targets:** every button, link and select is at least 44 px (the Sky credit link and the label switch rows were 24 px and 26 px); planet dots keep their 24 px hit area.
- **Close buttons:** their focus ring sits inside the box (`outline-offset:-3px`) because the dialog and panel clip overflow.

### Phone test

`tests/earth-phone-browser.py` (CI group `phone` in `earth-preview-checks.yml`) runs nine devices (iPhone SE, 13 mini, 15, 16 Pro Max, Pixel 7, Galaxy S20 and S23, a 360x640 Android, iPad mini), portrait and landscape, with touch, device pixel ratio and **real safe areas**: it sends `Emulation.setSafeAreaInsetsOverride` over CDP so `env(safe-area-inset-*)` resolves to iPhone-like notch and home-indicator values. Per scenario it asserts: intro card and Enter inside the safe rectangle; HUD buttons, provenance chip, toasts and focus name inside it; no control under 44 px (24 px for inline links); canvas covers the viewport with a drawing buffer at or below 2x; no horizontal overflow; panel inside the viewport, its close button clear of the notch and its last item reachable; search and about dialogs inside the safe area and scrolling to their end; rotation resizes the canvas and keeps the buffer aspect; viewport heights shrunk by 56 and 100 px (browser toolbar) still covered. Extra cases at 150% text (intro, panel; simulates Android font scale) on three devices, and a keyboard case that stubs `VisualViewport` (height 55%, offset 40 px), asserts `kb-open`, the dialog below the offset and the search field inside the visible band, that a pinched `scale:2` does not set it, and that closing the dialog clears it. Chrome 108+ resizes the visual viewport for the keyboard like iOS, so the stub is the realistic case. The CI group is split into `phone-ios` and `phone-android` (`PHONE_GROUP`); screenshots are JPEG at pixel ratio 2 or less. The focus name sits above the toast stack and the test asserts they never overlap. `PHONE_AUDIT=1` prints problems instead of failing; `PHONE_SHOTS=<dir>` sets where screenshots go.

Not covered by headless Chromium and needing a real device: iOS Safari's toolbar behaviour and the `visualViewport` keyboard path (the test stubs `visualViewport` height, offset and scale; it cannot reproduce a real keyboard), real notch geometry, rubber-band feel, and WebGL performance on a phone GPU.

Remaining source limits are visible design decisions, not paid-service setup:
the clouds are dated infrared proxies, surface maps are historical, nothing closer
than 2,500 km is offered, and the outer galaxy is a model. Higher fidelity weather would need
a cloud-classification product with its own availability and licence review.
