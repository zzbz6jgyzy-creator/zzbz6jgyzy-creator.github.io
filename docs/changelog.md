# Changelog

## 26 Oct 2026 — P1 round

- **Article CLS 0.11 → 0.** Breadcrumb, "Updated" and disclosure styles moved from the async `related.css` to render-blocking `styles.css`; `styles.css` version bumped. Verified on live with throttled Chrome (before) and locally with `related.css` delayed by 1.5 s (after).
- **Investigated and not changed:**
  - Starship LCP: real paint is about 0.2 s after first paint; Lighthouse's 2 s figure is simulation.
  - Merging blocking CSS: measured slower.
  - The "duplicate" stylesheet links are `<noscript>` fallbacks.
  - The news sitemap window: narrowed on `main` by #205.
- **Merged `main`:** kept #205's robotaxi description repair and homepage red, and reapplied the light-theme contrast fixes on top.

## 26 Oct 2026 — P0 fixes from the audit

- **SEO:** repaired the broken description, `og:description` and `twitter:description` tags on `dispatch/robotaxi-938-f1-cota.html`.
- **SEO:** headlines are no longer cut mid-sentence.
  - `<title>` now ends at a whole clause, keeping the " | Supercharged Daily" suffix only when it fits.
  - `og:title`, `twitter:title` and the NewsArticle `headline` carry the full headline.
  - Affects 78 articles. The new `seo_lib.headline_title` and `seo_lib.social_headline` are covered in `tests/test_seo_audit.py`.
- **Theme:** the site now follows the device's light/dark setting until the reader uses the toggle.
  - Only the toggle saves a choice; the page no longer saves `dark` on every load.
  - Readers who already have a saved theme keep it.
- **Accessibility (WCAG 1.4.3 / 2.5.3):** fixed contrast failures in both themes on 30 scanned pages.
  - Light theme: the FSD Europe and Cybercab homepage cards and the launch compass were unreadable.
  - Dark theme: red text, filled red buttons, and muted labels on Starship and FSD Europe.
  - News image links no longer duplicate the headline link for screen readers.
  - Calendar day buttons now include their visible text in the accessible name.
- Rebuilt the hashed JS bundles (core, news, calendar).

Known leftovers:

- **Roadster / Optimus:** label mismatches on the hotspot and film buttons (2.5.3).
- **Decorative `aria-hidden` text** (FSD country codes, Optimus hero type). axe flags it; WCAG exempts it.
- **Pre-existing failure:** `tests/fsd-global.test.mjs` fails the same way on `main` before these changes.
