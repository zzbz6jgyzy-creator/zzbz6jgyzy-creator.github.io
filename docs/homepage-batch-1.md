# Homepage refinement — batch 1

Approved scope: abandoned-newsletter-signup retry, desktop hero containment, and narrow-screen signup sizing. No paid services or new production dependencies are required.

## Changes and reasons

- `newsletter.js`: removed the local-storage flag written before redirecting to Beehiiv and the form-hiding behavior based on that flag. A redirect is not subscription confirmation. The signup remains available if a reader returns without completing it, including browsers carrying the legacy flag. The Beehiiv destination, topic allowlist, UTM attribution, native email field and honeypot remain in place. Actual subscribers may also see the form: this site has no verified subscriber state and must not pretend otherwise.
- `home-v2.css`: constrained the hero media to its existing desktop grid column above 760px. The photograph no longer extends underneath headline text. The existing desktop split, mobile stacking, colors, font families, logo and section order are retained. Added homepage-scoped minimum-width rules so newsletter controls fit inside their card padding at 320px.
- `index.html`: refreshed the homepage stylesheet cache version.
- `assets/js`: regenerated the content-hashed core bundle and manifest with the existing build script. Other bundles are unchanged. Updated 110 HTML bundle references so the shared signup correction reaches readers. Outside the homepage, this changes asset references rather than page copy or layout. Removed redundant loose `grow.js` script tags on two Dispatch pages because grow is already in the core bundle; this is required by the existing bundle checks.
- `scripts/test-newsletter-retry.mjs`: added dependency-free behavioral regression tests for abandoned signup with clean/legacy storage, topic attribution, empty input and honeypot handling.

## Validation

- Existing JavaScript bundle build completed with esbuild 0.25.12; every unchanged bundle retained its original hash.
- Existing static bundle checks passed, including bundle assets/sources, page references, preload attributes and the sitemap. The existing broad browser crawler was not run; bounded browser checks were used for this approved batch.
- `node scripts/test-newsletter-retry.mjs`: five tests passed.
- Browser validation at 1440×1000, 768×1024, 390×844 and 320×740 checked page containment, hero layout, responsive AVIF selection, high hero fetch priority, newsletter sizing, JavaScript errors and available menu controls. Light-theme switching was also checked.
- Clean and legacy-flag browser sessions could follow the signup redirect and return to an available form. The test intercepted the Beehiiv navigation locally: no subscription request or test email was sent to Beehiiv.
- `node --check newsletter.js` and `git diff --check` passed.

Screenshots and detailed browser results were retained with the session audit artifacts. Browser resources were rendered through HTTPS fetches using the environment's trusted CA; these checks do not establish visitor network performance, Lighthouse scores or field Core Web Vitals.

## Recommendations awaiting a later batch

1. Decide whether email subscriptions or X follows are the main homepage conversion goal, then approve any earlier newsletter CTA or changed copy. The current mobile form is far down the page; the desktop nav and mobile menu already contain Subscribe.
2. Align build-time and runtime tracker data. The inspected homepage HTML showed Cybercab 349 while the rendered card and changes list showed 351. Fix the data pipeline rather than hard-coding a count.
3. Reduce duplicated live/launch-data requests and avoid downloading the entire Dispatch HTML alongside the article data, after preserving pinning and fallback behavior.
4. Consider shorter homepage story teasers and descriptive hero alt text; keep adjacent decorative thumbnail alternatives empty. Editorial wording needs approval.
5. Preserve the existing meta descriptions, canonical URLs, Open Graph, Twitter Cards, responsive images and Organization/WebSite JSON-LD. Optional WebPage schema enrichment is a later, lower-priority refinement.
6. Verify actual Beehiiv subscription completion with a human-controlled address, and review a no-JavaScript signup fallback. Embedded/API signup and any paid-plan features are not assumed available.

This branch implements only batch 1. Other page audits and edits need their own approval. Nothing in these changes purchases a service or publishes a new hosting platform.
