# Homepage editorial redesign

The previous homepage opened with the publication name and a long lead story. Visitors had to scroll to reach an email field or understand the range of interactive tools. This redesign makes the site's purpose explicit, presents its best experiences visually and places a complete newsletter form in the first screen.

## What changed and why

- A concise headline and clear Tesla/SpaceX/xAI description establish what the site delivers. The existing logo, navigation, Inter/IBM Plex Mono fonts and red brand accents remain.
- A responsive visual composition links directly to the Roadster showcase, Starship flight lab and Starlink Observatory. It uses existing optimized imagery and a lightweight, decorative SVG illustration. No autoplay film, iframe, WebGL or new external font request is introduced.
- Original reporting remains generated from Dispatch, with its source titles and article bodies preserved. Story imagery below the opening screen is lazy-loaded and has reserved dimensions.
- An illustrated toolkit highlights Starlink, software updates, FSD Europe, Cybercab/Robotaxi and explainers. Interest filters are optional enhancements; ordinary links and all five cards remain available without JavaScript. Source qualifiers remain visible on tracker snapshots.
- Two deliberate email forms explain the value and weekly cadence. A lower-page briefing preview shows the content categories, with a link to a real issue. The preview does not pretend to be a published issue or invent testimonials, subscribers or endorsements.
- Both forms retain the established Beehiiv flow and privacy-friendly signup event counts. They also have a native GET fallback without JavaScript. No signup is claimed as confirmed before Beehiiv completes it. Test signups are intercepted locally and never sent to the provider. Homepage Subscribe navigation now reliably focuses the opening email field, including when the shared navigation creates that link after its newsletter helper has run.
- Longer change/headline lists start compactly and can be expanded. Actual source dates, incoming stories, launch precision and saved-data fallbacks continue to use the established refresh workflows.

## Ownership and refresh behavior

`index.html` owns the hero, editorial layout and tool links. `home-studio.css` is loaded only on the homepage; `home-studio.js` contains optional tool filtering, arrow rendering and homepage Subscribe focus behavior. It is included in the existing hashed home bundle. Shared newsletter and navigation source files are unchanged.

`scripts/build-home.js` still owns all `hv:` regions, including the lower newsletter block. Its image preload now belongs to the first-screen Roadster image. The builder keeps the new layout when news and tracker data refresh. The existing latest-newsletter-link task still updates the real-issue link. Newsletter latest-issue metadata is not used to imply readership or social proof.

## Sources, accessibility and validation

Tesla imagery is credited as such. The Starship photograph is by Steve Jurvetson under CC BY 2.0, with source/license links and a crop notice. The monochrome Europe geography derives from the existing public-domain Natural Earth map; it does not encode availability or approval. Orbit/release graphics are labelled illustrations and contain no invented telemetry.

Checks cover phone/tablet/desktop layouts, both themes, reduced motion, no JavaScript, unavailable JSON, first-screen signup visibility, native validation, both provider handoffs, privacy of analytics, keyboard filtering, expandable lists, navigation focus, heading/ID structure and saved-build ownership. Existing editorial date, tracker and navigation journeys remain part of validation. The obsolete test assumptions that the masthead must contain only the site name and that all trackers must appear near the first fold were updated to the new user journeys.

## Measuring newsletter results

The design is intended to improve signups; an uplift is not yet measured. Compare homepage visits, existing `signup_submit` event counts and **confirmed** Beehiiv subscriptions before and after launch over comparable periods. A redirect is not a completed subscription. Both homepage forms retain `utm_source=website`, `utm_medium=site-band` and `utm_content=website`; no new paid analytics service is required. Headlines, traffic sources and publishing volume can affect the comparison.

Later decisions: use real reader testimonials only with permission, add subscriber counts only from verified data, and consider a provider-supported embedded signup if Beehiiv makes a suitable free option available. These are recommendations, not implemented claims. No paid tool or new account is required for this redesign.

The existing Robotaxi negative-change regression test now fixes both observation dates in its fixture. Its former fixed baseline plus live latest date stopped representing an exact seven-day window after the daily registry refresh. No tracker calculation or product behavior was changed.
