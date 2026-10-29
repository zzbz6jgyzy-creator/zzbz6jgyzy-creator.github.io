# Starship Flight 14 cinematic replay

The isolated `/starship-replay.html` prototype builds on the existing NASA Earth study without changing the public homepage or replacing the Starship editorial hub. It remains `noindex,follow` while reviewed. A link from the Earth study opens it.

## Scope and source boundary

The delivered experience is a replay, not live tracking. Flight 14 launched on 28 September 2026 with B21/S41, reached orbit and deployed 26 operational Starlink V3s. The booster landed offshore in the Gulf; the Ship returned early to the North Pacific after approximately three hours. Do not substitute the superseded six-orbit/ten-hour preflight plan or add a tower catch.

Milestone references: [SpaceX mission](https://www.spacex.com/launches/starship-flight-14), [SpaceX broadcast](https://x.com/i/broadcasts/1qxvvenMPMQxB), [Launch Library 2 record](https://spacelaunchnow.app/launch/7d1afb26-6f9c-429b-9ccf-29012fd1e519/), [AIAA post-flight report](https://aerospaceamerica.aiaa.org/spacex-shortens-starships-first-orbital-flight-but-achieves-other-objectives/). Clocks are approximate where independently verified timings are incomplete. The terminal replay stops at the water; the Ship’s subsequent loss is stated in the chapter and source information.

The flight path and altitude envelope, attitudes, pad, exterior vehicle details, satellite spacing, exhaust, plasma and light are original modelled illustrations. They are not recorded GPS, onboard engine state, measured heating or surveyed CAD. This disclosure is visible on the page and in the source dialog. No live feed, paid API, third-party tracking requests or account permissions are needed. A future telemetry adapter must preserve that distinction and carry provenance and gaps alongside any position samples.

## Rendering and interaction

One local Three.js r170 WebGL context renders two scale spaces. The far scene uses the exact shared Earth surface, clouds and atmosphere shaders; the local scene preserves fine vehicle geometry without placing a metre-scale rocket at Earth-scale coordinates. Independent cameras are composited in a single frame.

Original procedural models include stainless barrels, geometric weld bands, thousands of instanced heat-shield tiles, flaps/hinges, service conduits, hot-stage vents, open grid-fin lattices and 33 booster / six Ship engine bells. These are a visual study of public features, not a blueprint. Environment reflections, engine light, animated exhaust and entry envelopes provide cinematic lighting. The orbital overview deliberately uses enlarged stage markers, not scale-sized rockets.

Nine chapters, Ship/booster/globe camera choices, drag/pinch/keyboard navigation, playback speeds and a mission-time scrubber all use one deterministic clock. The guided cut compresses the mission into 150 seconds. The replay starts paused, pauses on tab changes and when offscreen, and has no auto-playing sound. 2K/4K/8K Earth detail adapts to GPU/memory/data-saving limits. Motion and rendering are demand driven while paused. Loading, unavailable WebGL, imagery failure and context loss retain accessible mission information and a retry action. Page hide disposes resources.

Earth imagery retains the existing [credits and manifest](/assets/earth/SOURCES.md). It is static historical imagery, not launch-day cloud cover. All new vehicle geometry, effects and interface code are authored for this project; no proprietary vehicle model or competitor interface is copied.

## Validation

`node --test tests/starship-replay.test.mjs` checks clock/event ordering, bounded continuous altitude envelopes, stage independence and the early-return endpoint. `tests/starship-replay-browser.py` runs real Chromium WebGL with SwiftShader against local committed files, tests phone/tablet/desktop, light/dark, reduced motion, controls, resolution upload and failure states, and captures stage screenshots plus a rendered film. The existing Earth browser workflow also runs because its shaders are now exported for reuse. CI artifacts show the actual implemented rendering; they do not establish performance on every physical phone.

Future work: an explicitly licensed/attributed recorded Flight 14 trajectory with gap coverage, more faithful externally reviewed vehicle/pad geometry, and physical-device profiling. Live ingestion/synchronisation is a separate later phase requested by the owner.
