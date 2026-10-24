# Optimus: visual field guide

Reviewed **24 October 2026**. Page: `/optimus.html`.

## What changed and why

The former page was a four-record, JavaScript-rendered demonstration archive with a promises table. It is now a saved, searchable editorial guide with:

- A full-body Tesla portrait and strong introduction, sticky chapter navigation and current-status cards.
- Six interactive systems: perception, hands, actuation, balance, learning and power. Every chapter separates general robotics explanation from Tesla-specific disclosure.
- An original conceptual hand diagram, three official Tesla films loaded only on request, and a five-stage development timeline.
- An explicitly hypothetical reliability calculator. `p^n` assumes independent, identical steps; it is never a measured Optimus score.
- Four attributed images with responsive AVIF/WebP derivatives, accessible descriptions and keyboard-operated enlargement.
- Nine dated demonstration records with search, category filters, original-source links and separate “shown” / “does not establish” fields. Legacy demonstration anchors remain; updated search entries link directly into the guide.
- Eight saved FAQ answers, a 19-reference source ledger, updated search/social metadata and WebPage/FAQPage/VideoObject structured data. No invented Product, Offer, rating or retail price.

Shared branding, navigation, newsletter and account code are retained. The studio deliberately uses a dark presentation within both shared site themes. No new dependencies, subscriptions or tracking services are required.

## Research and design rationale

Reviewed Tesla's AI page and films, Q3 2026 investor update, the earnings-call transcript, historical reporting, Tesla robotics recruitment descriptions and technical material from Northwestern and MIT. Full URLs, checked dates and source limitations live in `data/optimus-studio.json`; they are also visible on the page.

Compared the TeslaNewsWire Optimus tracker and RoboticaGuide's October 2026 overview. Their dated milestones are useful, but a dense tracker alone does not explain the machine. Figure's product and Helix pages demonstrate how large imagery and sectional storytelling can introduce complex robotics. Their proprietary architecture and specifications have not been attributed to Tesla or copied here. This design combines visual explanation with an inspectable evidence record; it makes no objective claim to rank first among websites.

Current-state corrections include Tesla's Q3 report of early production at Fremont, Texas construction, and the separately attributed late-2027 external-customer delivery target. Planned capacity is not actual output. The sources do not establish a final consumer offer, a production-generation specification, full-shift uptime or general-purpose autonomy.

The 2023 sorting and 2024 cell-handling records retain Tesla's task-level autonomy claims. Shirt folding is labelled as disclosed non-autonomous; We Robot interactions have separately reported assistance. Training with human demonstrations is explained separately from runtime teleoperation.

## Source and update ownership

`data/optimus-studio.json` is the reviewed editorial record, not an automated feed. Do not change the review date automatically or substitute news headlines for capability evidence.

For new material:

1. Inspect the original filing, film or disclosure. Record the date, scope, control mode and what is not established; use independent reporting where it adds evidence.
2. Update data and the relevant narrative in `scripts/build-optimus-studio.mjs`. Manufacturing labels and film notes require editorial review; the date alone does not refresh them.
3. Run `node scripts/build-optimus-studio.mjs`, `node scripts/build-js.mjs`, and `python scripts/inject-js-bundles.py`.
4. Run `node --test tests/optimus-studio.test.mjs` and `python tests/optimus-studio-browser.py`. The browser uses installed Chromium/Chrome; `CHROMIUM_PATH` can override it.
5. Inspect desktop and mobile previews. The PR workflow saves screenshots as an artifact.

The source data, saved HTML, source scripts and hashed bundle must be committed together. The generic SEO mapping excludes Optimus so scheduled builds preserve its reviewed WebPage/FAQ/film graph; a regression check covers this ownership. Legacy `data/optimus-demos.json` and `data/promises.json` remain unchanged for existing consumers; this guide does not overwrite their editorial ownership. Broader promises remain linked through the existing promise tracker.

## Media rights and performance

`assets/optimus-studio/provenance.json` lists the source, credit, licensing, transformation, dimensions, byte count and SHA-256 hash of each derivative.

- Tesla portrait: Tesla AI page; the source does not state the hardware revision. It is not labelled as final Gen 3. Attributed editorial use; Tesla retains copyright, and no open licence is claimed.
- Factory slide: Tesla Q2 2024 update, PDF page 21 / printed slide 19. Its battery-handling autonomy caption is a manufacturer claim. The whole slide is retained.
- Showroom front/angle: Sikander Iqbal, 18 November 2025, Wikimedia Commons, **CC BY-SA 4.0**. Resized/compressed image derivatives remain under that licence; credit, source and licence links appear both in gallery captions and the image viewer. The dated files do not independently establish a hardware generation.
- Hand diagram: original conceptual SVG by Supercharged Daily. It is explicitly not Tesla CAD. Decorative flow animation is disabled for reduced-motion preferences.

24 derivatives total approximately 2.29 MB across all formats and resolutions; a browser selects one format/resolution per image. Hero loading has priority; later images load lazily. Original source PDFs/JPEGs are not shipped. The source factory image is 1365 px wide: its largest descriptor is correctly 1365w rather than upscaled 1600w.

Films use click-to-load `youtube-nocookie.com` embeds with visible direct official links. A photograph is clearly labelled as an editorial cover, not a film frame. No YouTube request occurs before interaction. Opening YouTube may use cookies. The event film starts at its Optimus chapter (1189 seconds). Browser tests mock the player response and test blocked-player fallback links; they do not prove YouTube playback, regional availability or third-party consent behaviour.

## Validation and remaining opportunities

Node checks cover references/dates/control modes, URL/HTML safety, illustrative probability arithmetic, media integrity and reproducible saved content. Browser checks cover 320/390/768/1440 px, both site themes, no JavaScript, a blocked enhancement bundle, a blocked player, image rendering, anatomy/keyboard selection, filters, lightbox focus/keyboard, calculator, FAQ and legacy deep links. No horizontal overflow or page JavaScript errors were observed in these local cases.

Later editorial work: replace older imagery when Tesla publishes a clearly identified new generation; add independent endurance/intervention data when a credible method and result become available; review final product specifications and retail availability if announced. A real interactive CAD model or original filmed interview would require asset rights/production decisions. No paid tool is required for the implemented guide. No fake current-generation renders or measurements have been added.
