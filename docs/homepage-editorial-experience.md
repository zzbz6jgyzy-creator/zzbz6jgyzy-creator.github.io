# Homepage: beyond the headline

The homepage now opens with a benefit: “Go beyond the headline.” The visible introduction still names Tesla, SpaceX and xAI, and the search title and description retain those subjects.

## Design and navigation

- A single dominant Roadster photograph replaces the overlapping, rotated collage. Starship and Starlink remain aligned, clearly labelled secondary links. Existing Tesla imagery and the licensed Starship photograph are retained, with credits.
- The hero has two deliberate shortcuts and a native Sunday newsletter form. A three-route wayfinder introduces reporting, interactive tools and the personal Daily.
- Original reporting receives a larger, readable lead and supporting stories. Labels, summaries, tool descriptions and supporting links have larger type.
- The toolkit uses an illustrated feature, restrained cards, ordinary links and optional interest filtering. Source-qualified tracker snapshots remain fully readable.
- A new personal section makes Your Daily, My Tesla and Can I See the Launch easy to discover. It describes existing capabilities; it adds no account requirement or new data collection.
- The lower Sunday edition has a clearer explanation, three concrete benefits and a link to an actual issue. It does not invent readership, testimonials or confirmed subscriptions.

## Ownership and performance

`index.html` owns the static structure. `scripts/build-home.js` owns the marked reporting, tracker, preload and lower-newsletter regions. `scripts/build-wayfinding.py` owns the two hero shortcuts. `scripts/seo-titles.json` preserves the new H1 during SEO builds. The homepage stylesheet cache tag is updated.

The CSS is rewritten coherently instead of layering more competing overrides. This change adds no library, external font, video download or JavaScript. The dominant image keeps AVIF/WebP sources and a matching responsive preload. Below-screen story imagery stays lazy-loaded.

Both email forms keep the existing Beehiiv GET handoff and attribution. A handoff is not a completed subscription; any conversion uplift must be measured against confirmed subscriptions in Beehiiv.

## Validation

Static checks cover heading/ID structure, native links and forms, image dimensions, generated markers and build ownership. Browser checks cover 320px, 390px, 768px and 1440px, dark/light themes, no JavaScript, unavailable JSON, keyboard tool filtering, navigation focus, mocked provider handoffs, section overlap and 200% text enlargement. Before screenshots come from the actual PR base checkout. No test email is sent.

Browser checks and exact-head GitHub results are recorded in the PR. Field Core Web Vitals and signup improvements cannot be inferred from a preview; compare them after deployment.

