# Homepage refinement — batch 2

Approved change: add a discreet “Free Sunday email →” link beneath the homepage introduction, pointing to the existing newsletter signup section.

## Changes

- `index.html`: added one native `#newsletter` anchor beneath the introduction. The decorative arrow is hidden from assistive technology. Updated the homepage stylesheet cache version.
- `home-v2.css`: added four rules for compact spacing, the existing `--red-text` theme color, a 44px touch target, hover underline and a visible keyboard focus outline. Typography inherits the existing Inter family. Light mode uses the existing dark red token.

The existing signup form, publishing promise, logo, article layout and navigation are preserved. The new link works without JavaScript. No JavaScript, dependencies or paid services were added. The homepage build rewrites its existing `hv:*` regions; the masthead sits outside them and retains this link.

## Verification

Local browser checks cover 320, 390, 768 and 1440px widths: first-screen visibility, 44px target size, page containment, keyboard focus, anchor navigation, next-Tab access to the email field, and the existing light-theme accent. A separate run disables JavaScript to verify native anchor navigation. These bounded checks use the local homepage/source snapshot and do not measure live performance or newsletter completion. A read-only source review found no scope or accessibility defects. Diff whitespace checks pass.

No signup was submitted. Actual Beehiiv subscription completion remains a human-controlled test from batch 1. Tracker freshness, duplicated requests, editorial teaser/alt refinements and subsequent page audits remain separate recommendations requiring their own approved batches.
