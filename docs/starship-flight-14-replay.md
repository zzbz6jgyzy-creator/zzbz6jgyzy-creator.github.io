# Starship Flight 14 cinematic replay

The isolated `/starship-replay.html` prototype builds on the existing NASA Earth study without changing the public homepage or replacing the Starship editorial hub. It remains `noindex,follow` while reviewed. A link from the Earth study opens it.

## Scope and source boundary

The delivered experience is a replay, not live tracking. Flight 14 launched on 28 September 2026 with B21/S41, reached orbit and deployed 26 operational Starlink V3s. The booster landed offshore in the Gulf; the Ship returned early to the North Pacific after approximately three hours. Do not substitute the superseded six-orbit/ten-hour preflight plan or add a tower catch.

Milestone references: [SpaceX mission](https://www.spacex.com/launches/starship-flight-14), [SpaceX broadcast](https://x.com/i/broadcasts/1qxvvenMPMQxB), [Launch Library 2 record](https://spacelaunchnow.app/launch/7d1afb26-6f9c-429b-9ccf-29012fd1e519/), [AIAA post-flight report](https://aerospaceamerica.aiaa.org/spacex-shortens-starships-first-orbital-flight-but-achieves-other-objectives/). Clocks are approximate where independently verified timings are incomplete. The terminal replay stops at the water; the Ship’s subsequent loss is stated in the chapter and source information.

Ship 41 uses 373 reported SpaceX position facts archived by [StarDash](https://stardash.live/?replay=14), retaining mission time, reported altitude, latitude and longitude at the original cadence (maximum retained gap 40 seconds). The public archived numeric facts are extracted without copying dashboard code, models, icons or artwork. The underlying primary feed is `https://sxcontent9668.azureedge.us/cms-assets/starship_tracker_public.json`; its present terminal position agrees with the archive endpoint. The feed’s predicted `trajectory` field is **not** used. The source snapshot, checksums, coverage and processing are recorded in `docs/starship-flight-14-archive.json`.

Position and altitude between samples are linearly interpolated, with longitude unwrapped across the dateline. The last prelaunch position is held at the known liftoff anchor before interpolation towards the first ascent packet. Negative terminal GPS altitude is clamped at sea level. The replay ends at the first archived sample on the water (T+03:08:44.4), not a claimed exact touchdown time. The final descent is interpolated between sparse samples; the landing animation and all attitudes and engine states remain illustrative. No future samples are extrapolated beyond the archive.

The booster path/altitude and offshore endpoint, attitudes, pad, exterior vehicle details, satellite spacing, exhaust, plasma and light are original modelled illustrations. They are not recorded booster GPS, onboard engine state, measured heating or surveyed CAD. This disclosure is visible on the page and in the source dialog. No live feed, paid API, third-party tracking requests or account permissions are needed. A future telemetry adapter must preserve that distinction and carry provenance and gaps alongside any position samples.

## Rendering and interaction

One local Three.js r170 WebGL context renders two scale spaces. The far scene uses the exact shared Earth surface, clouds and atmosphere shaders; the local scene preserves fine vehicle geometry without placing a metre-scale rocket at Earth-scale coordinates. Independent cameras are composited in a single frame.

Original procedural models include stainless barrels, geometric weld bands, thousands of instanced heat-shield tiles, flaps/hinges, service conduits, hot-stage vents, open grid-fin lattices and 33 booster / six Ship engine bells. These are a visual study of public features, not a blueprint. Environment reflections, engine light, animated exhaust and entry envelopes provide cinematic lighting. The orbital overview deliberately uses enlarged stage markers, not scale-sized rockets.

Nine chapters, Ship/booster/globe camera choices, drag/pinch/keyboard navigation, playback speeds and a mission-time scrubber all use one deterministic clock. The globe’s active Ship camera follows the archived route; historical path is solid and the remaining replay route is faint and dashed. The guided cut compresses the mission into 150 seconds. The replay starts paused, pauses on tab changes and when offscreen, and has no auto-playing sound. 2K/4K/8K Earth detail adapts to GPU/memory/data-saving limits. Motion and rendering are demand driven while paused. Loading, unavailable WebGL, imagery failure and context loss retain accessible mission information and a retry action. Page hide disposes resources.

Earth imagery retains the existing [credits and manifest](/assets/earth/SOURCES.md). It is static historical imagery, not launch-day cloud cover. All new vehicle geometry, effects and interface code are authored for this project; no proprietary vehicle model or competitor interface is copied.

## Validation

`node --test tests/starship-replay.test.mjs` checks clock/event ordering, bounded continuous altitude envelopes, stage independence and the early-return endpoint. `tests/starship-replay-browser.py` runs real Chromium WebGL with SwiftShader against local committed files, tests phone/tablet/desktop, light/dark, reduced motion, controls, resolution upload and failure states, and captures stage screenshots plus a rendered film. The existing Earth browser workflow also runs because its shaders are now exported for reuse. CI artifacts show the actual implemented rendering; they do not establish performance on every physical phone.

Future work: additional independently reviewed position provenance and any available booster telemetry, more faithful externally reviewed vehicle/pad geometry, and physical-device profiling. Live ingestion/synchronisation is a separate later phase requested by the owner.
