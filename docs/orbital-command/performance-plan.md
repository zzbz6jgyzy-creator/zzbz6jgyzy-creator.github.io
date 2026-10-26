# Orbital Command — performance plan

Target devices: capable desktop (~60 fps) and iPhone-class mobile (~30 fps). These are aims. Claim them only after measurement.

## Rendering

- One Earth mesh, one cloud mesh, GPU-instanced satellite markers.
- No thousands of spacecraft meshes. A simple marker; optional larger marker for the selection only.
- Adaptive pixel ratio (cap 2 on desktop, 1.5 / 1 on mobile).
- Frustum + distance fade for labels. One selected orbit + one ground track at a time.
- Pause the rAF loop when the tab is hidden. Honour `prefers-reduced-motion` (no auto-rotate, shortened camera tweens).
- Texture resolutions: High 2k + clouds + atmosphere; Balanced 1k; Low procedural / 1k, fewer markers, no clouds.

Quality is guessed from WebGL renderer, `deviceMemory`, `hardwareConcurrency`, and coarse pointer, then adapted if frame time stays above budget for several seconds. Manual override is stored in `localStorage`.

## Orbital work

- Web Worker runs SGP4 on a schedule (250–1000 ms, slower at 1×, faster at high time-scale).
- Main thread interpolates ECEF between ticks. Selected-object inspector uses a fresh propagate, not the interpolant.
- Transferable `Float32Array` position buffers.
- Starlink catalogue (~2 MB) loads only when Starlink mode is first opened.
- Search is over the in-memory index, debounced, off the hot path.

## Loading

1. Paint the SEO / fallback document immediately.
2. Boot WebGL + procedural Earth.
3. Swap NASA textures when ready.
4. Load featured GP snapshot (ISS and visual objects).
5. Load Starlink on demand.

## What we will measure

Initial meaningful globe, time to first featured satellites, frame time while orbiting, frame time with Starlink density cap, memory after 10 minutes, worker propagate throughput. Record results in `PROGRESS.md`. Do not claim real-device iPhone numbers from desktop emulation.
