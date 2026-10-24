# Roadster studio

This rebuild turns the Roadster archive into a cinematic, independent editorial showcase. It preserves the shared navigation, logo, newsletter, member controls and brand fonts. The page adds a full-width hero, a 50.4-second editorial film, 15-image filtered gallery, accessible full-screen viewer, annotated cockpit, six engineering studies, an acceleration illustration, configuration comparison and an evidence ledger.

## Editorial accuracy

`data/roadster-studio.json` is the canonical editorial record. The current Tesla product page is the primary source for design and configuration descriptions. Dated October announcement targets are distinguished from Tesla's reported 0.81-second reveal run. The demonstration trim is not established. There are no invented battery, charging, curb-weight or production-price specifications. Reservations are not prices; 2028 remains a stated target. Rocket is not approved for public road use. Review the source ledger when updating these claims; the page does not automatically scrape facts or imply that its review date is live telemetry.

Engineering diagrams explain principles, not Tesla CAD or measured forces. The acceleration plot assumes constant average acceleration and uses 60 mph (96.6 km/h), never relabelled as 100 km/h.

## Media and provenance

`data/roadster-media.json` records original URLs, event time ranges and output checksums. The eleven original studio JPEGs came from Tesla's public product page. Five existing reveal images are reused. All imagery and reveal footage is credited to Tesla; Supercharged Daily is independent. The new film animates stills, includes two short excerpts of actual reveal footage and uses an excerpt of “Legacy” by Scott Buckley (CC BY 4.0), with additional editorial transition effects. It is an editorial montage, not a continuous performance record or native 4K recording. The 2018 Starman livestream is not used. No paid tools or AI vehicle imagery were used. The music is a professionally composed, freely licensed track; Supercharged Daily does not claim authorship of it.

To rebuild imagery, download the eleven source JPEGs under their original filenames into a directory, install Sharp, then run `node scripts/optimise-roadster-media.cjs /path/to/originals`. AVIF and WebP derivatives use 640/1280/1920 widths.

To rebuild the film, place originals in `SOURCE/official/`, the event MP4 at `SOURCE/official-event.mp4`, an Inter TTF at `SOURCE/inter.ttf`, and the official, checksum-pinned `Legacy.mp3` at `SOURCE/Legacy.mp3`. Install NumPy and SciPy for the audio mix. Install FFmpeg with libx264 and drawtext, then run `python scripts/render-roadster-film.py SOURCE`. Remove `SOURCE/render` to regenerate edited scenes. Encoder versions can change binary output; review the result and update provenance hashes. Do not commit the 101 MB full event, intermediates or downloaded original JPEGs. Editorial use remains subject to source rights; confirm permission before adapting this material into advertising or licensed commercial footage.

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

## Replacement cinematic soundtrack

The former static two-note drone has been replaced by **Legacy — Scott Buckley**, available from https://www.scottbuckley.com.au/library/legacy/ under **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/). Composer usage terms: https://www.scottbuckley.com.au/library/using-this-music/ . The music is synchronized with the film and is not distributed separately. Visible attribution, source and license links appear immediately below the film; composer credit is also in captions and MP4 metadata. For a YouTube upload, include the full composer credit, source and license in the video description. Do not submit the music to Content ID or music distribution services. This music license does not license Tesla imagery.

The edit uses a continuous excerpt beginning at 312 seconds, with automated gain building through the engineering, ramp and flight chapters, then the existing musical resolution under the final studio shot. Small stereo transition sweeps and low impacts are original editorial accents, not vehicle recordings. The old drone is fully removed. Music/source checksum, timing and measured mastering values are in `data/roadster-media.json`.

Run `python scripts/score-roadster-film.py --music /path/Legacy.mp3 --input-1080 /path/picture-1080.mp4 --input-720 /path/picture-720.mp4` to update audio without re-encoding the picture. The source must match the pinned composer MP3 checksum. FFmpeg and NumPy/SciPy are required. The mix is normalized in two passes to -17 LUFS with a -2 dBTP target, encoded as stereo 48 kHz AAC at 192 kb/s. Both qualities have the same mix and duration. A media version in the editorial data refreshes cached playback links. Sound remains optional and muted initially.
