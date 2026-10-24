# Roadster studio

This rebuild turns the Roadster archive into a cinematic, independent editorial showcase. It preserves the shared navigation, logo, newsletter, member controls and brand fonts. The page adds a full-width hero, a 50.4-second editorial film, 15-image filtered gallery, accessible full-screen viewer, annotated cockpit, six engineering studies, an acceleration illustration, configuration comparison and an evidence ledger.

## Editorial accuracy

`data/roadster-studio.json` is the canonical editorial record. The current Tesla product page is the primary source for design and configuration descriptions. Dated October announcement targets are distinguished from Tesla's reported 0.81-second reveal run. The demonstration trim is not established. There are no invented battery, charging, curb-weight or production-price specifications. Reservations are not prices; 2028 remains a stated target. Rocket is not approved for public road use. Review the source ledger when updating these claims; the page does not automatically scrape facts or imply that its review date is live telemetry.

Engineering diagrams explain principles, not Tesla CAD or measured forces. The acceleration plot assumes constant average acceleration and uses 60 mph (96.6 km/h), never relabelled as 100 km/h.

## Media and provenance

`data/roadster-media.json` records original URLs, event time ranges and output checksums. The eleven original studio JPEGs came from Tesla's public product page. Five existing reveal images are reused. All imagery and reveal footage is credited to Tesla; Supercharged Daily is independent. The new film animates stills, includes two short excerpts of actual reveal footage and adds an original synthesized ambient score. It is an editorial montage, not a continuous performance record or native 4K recording. The 2018 Starman livestream is not used. No paid tools, stock music or AI vehicle imagery were used.

To rebuild imagery, download the eleven source JPEGs under their original filenames into a directory, install Sharp, then run `node scripts/optimise-roadster-media.cjs /path/to/originals`. AVIF and WebP derivatives use 640/1280/1920 widths.

To rebuild the film, place originals in `SOURCE/official/`, the event MP4 at `SOURCE/official-event.mp4`, and an Inter TTF at `SOURCE/inter.ttf`. Install FFmpeg with libx264 and drawtext, then run `python scripts/render-roadster-film.py SOURCE`. Remove `SOURCE/render` to regenerate edited scenes. Encoder versions can change binary output; review the result and update provenance hashes. Do not commit the 101 MB full event, intermediates or downloaded original JPEGs. Editorial use remains subject to source rights; confirm permission before adapting this material into advertising or licensed commercial footage.

## Build and verification

After editing data or saved markup, run:

```
node scripts/build-roadster-studio.mjs
node scripts/build-js.mjs
python scripts/inject-js-bundles.py
node --test tests/roadster-studio.test.mjs
python tests/roadster-studio-browser.py
```

The browser suite covers 320/390/768/1440 widths, dark/light themes, JavaScript disabled, video failure, gallery filters and keyboard dismissal, cockpit annotations, engineering keyboard selection, physics, comparison, units, actual video playback, chapter seeking, quality switching and sound controls. It checks that no film downloads before playback. Its local media server emulation supports HTTP byte ranges for seeking. CI runs the same checks and retains screenshots.

Film playback starts only after a click, is muted initially, offers 720p/1080p, descriptive captions, chapters, a direct fallback link and pauses offscreen. Images are responsive and lazy-loaded except the hero. Motion respects reduced-motion settings. Core content remains in semantic saved HTML without JavaScript. The page includes social metadata and VideoObject structured data without a fabricated vehicle offer.

Future work: refresh facts when Tesla changes specifications, add independently instrumented results when available, and replace media if Tesla publishes higher-resolution driving/cockpit footage. No paid service is required. Legal policy changes and final production claims require human/editorial review.
