# Cinematic Earth preview

`/mission-control.html` is a standalone visual prototype for Supercharged Daily. It uses the existing brand assets and local Three.js r170; it is kept out of global navigation and marked `noindex,follow` while the owner reviews it. It contains no checkout, paid-membership claims or invented live telemetry.

The renderer combines a NASA Blue Marble surface, NASA Black Marble city lights, a separate Solar System Scope cloud layer, ocean reflections and an atmospheric scattering shell. Three light presets are artistic studies. The map composites are historical imagery; cloud movement is illustrative and is not live weather. Credits and changes are documented in `/assets/earth/SOURCES.md` and accessible from the viewer.

Auto begins with 2K maps, then upgrades desktop surface detail to 4K. High requests 4K; Ultra requests a genuine 8192×4096 surface when GPU and memory limits permit it, with a higher desktop framebuffer budget for 4K displays. Actual loaded resolution is shown in the caption. Textures are loaded from this website, without runtime third-party requests. Reduced motion starts paused; hidden/offscreen rendering is suspended. A static Earth poster and retry control remain available when WebGL, a module or required imagery cannot load.

Controls support mouse drag, touch drag/pinch, wheel, keyboard arrows and zoom, pause/resume, reset and fullscreen where supported. The page has an About dialog with source and lighting disclosures. It intentionally keeps the scene in a dark space environment in either device colour scheme.

Run `python3 scripts/build-earth-assets.py` with Pillow 11.3.0 to prepare missing texture tiers. All delivered textures must be committed before merge. The asset manifest records dimensions and SHA-256 hashes. CI can export exact derivative bytes for review; final builds with all tiers present require no image downloads.

Validation: syntax checks plus `tests/earth-browser.py` in Chromium/SwiftShader. The dedicated workflow checks actual GPU frames and texture uploads, portrait/landscape layouts, interaction, high detail, reduced motion and failure states, and captures screenshots and a clean ten-second film. Viewport tests do not establish performance on every physical phone or tablet.
