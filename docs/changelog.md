# Changelog

## 27 Oct 2026 — Date and freshness fixes

- Tesla 2026 Annual Meeting (3 Dec, 3pm CT / 21:00 Irish) is now on the calendar, TSLA page and homepage major-event countdown, with the 6 Nov in-person drawing deadline. Sources: SEC annual report and votetesla.com.
- Homepage / Tesla overview “newest build” now tie-breaks same-day first-seen dates by numeric version, so 2026.38.5.11 beats 2026.38.5.6.
- Launch calendar keeps the last ~45 days from Launch Library 2’s previous-launches feed (one extra hourly call). Backfilled Crew-13, Transporter-18 and Falcon Heavy NROL-97; Starlink 15-16 shows as launched; CRS-35 / Starlink 15-25 / SDA T1TL-A stored times match LL2.
- Starship Flight 16 is a December 2026 reported target (NASASpaceflight), labelled as reporting rather than a SpaceX date.
- Roadster “Latest stories” card titles are past-tense. Data-push workflows share a `data-push-main` concurrency group and use `scripts/ci-push-retry.sh`.
- Calendar studio tests pick the next upcoming Starlink instead of flown 15-16. Homepage live.js never remounts the prerendered next-stream card unless something is actually live, and LL2 rows that have already reached NET are dropped so they cannot appear as a “Live now” card.
- Rebased onto main after the headlines refresh. Tesla overview and news studio were rebuilt from that snapshot so 2026.38.5.11 and the updated story titles sit on the latest generated pages.
- Homepage live.js never treats an LL2 launch as the top “Live now” card, so a Go / In Flight Falcon cannot remount into `.hv-live-top` and shift the 320px first screen.
- Rebased onto the 27 Oct daily-refresh prerender. Homepage trackers were rebuilt so 2026.38.5.11 stays on the latest snapshot; a next-stream remount into `.hv-live-top` is hidden on phones unless the card is actually live.
- Rebased onto the later calendar-copy and homepage prerender commits. Calendar studio, its hashed bundle, SpaceX, markets and launch-viewing were rebuilt from main’s data so LL2 Success/In Flight stay `done` and the launch-schedule leftover copy is preserved.
- Stopped the merge-conflict race with hourly data jobs: this PR no longer carries bot-generated HTML/JSON/bundles. Studio ownership `git diff` is PR-skipped; `home-build` / `js-bundle` write those files after merge. News/Starlink/newsletter jobs no longer `git add *.html`.

## 27 Oct 2026 — Write articles in Markdown

- New articles can be one file: `content/dispatch/<slug>.md`. `scripts/render-article.py` renders it to the same markup as a hand-written
  page and CI (`home-build.yml`) then runs the usual generators. Refuses DRAFT markers, raw HTML, missing sources or alt text. Guide:
  `docs/writing-articles.md`; tests: `tests/test_render_article.py`. Existing articles are untouched.
- Fixed: `new-article.py` pages inherited the old live X widgets script from the template; it is now stripped.

## 26 Oct 2026 — Migration step 0 and 1 (no live change)

- New `astro/` project: Astro 7 static build that packages the current site for Cloudflare Workers, plus `astro/scripts/parity.mjs`
  (1,868 files byte-identical, 152 sitemap URLs resolve). Headers, 301s for the old stubs and a styled 404 verified with `wrangler dev`.
- GitHub Pages still serves the site. Nothing deleted. See `docs/migration.md`; rollback is deleting `astro/`.

## 26 Oct 2026 — Phone homepage leads with the news

- At 600 px and below the homepage now shows: headline, newsletter sign-up, then the top story (image and headline) in the first
  screen (measured at 390, 430 and 600 px; at 360 and 320 px the headline starts at the fold). Before, the hero copy and the Roadster
  showcase pushed the top story below the second screen. CSS only (`home-studio.css`): visual order changes with `display: contents` and
  `order`, DOM order and the desktop layout are untouched. Lighthouse mobile unchanged (LCP 4.1 s locally, CLS 0).
- Trade-off: the pitch line, the three start links and the Roadster showcase now sit below the stories on phones. To undo, delete the
  `@media (max-width: 600px)` block at the end of `home-studio.css`.

## 26 Oct 2026 — X posts load on request

- All 40 articles with embedded X posts now show the post as readable text (the standard embed blockquote) with a "Load post from X"
  button. `platform.twitter.com` is no longer requested on page load. Adds `x-embed.js` and `x-embed.css`; `tests/x-embed-browser.py`
  and `tests/test_x_embeds.py` guard it. Expected effect on articles: Best Practices up from 58 (third-party cookies, console issues,
  31 KB and 12+ requests gone) and no embed-related layout shift.
- Light-theme contrast sweep over all 82 articles in both themes: captions on dark screenshot panels and inline-dimmed source notes fixed.

## 26 Oct 2026 — Phase 2: Claude Code setup

- Added `CLAUDE.md` (the project brief) and `.claude/`: five subagents, six slash commands, two skills, two rules files, three
  hooks. Details in `docs/claude-code-setup.md`; reasons in `docs/decisions.md`.
- New helpers: `scripts/audit/` (SEO check, axe, Lighthouse, screenshots), `scripts/new-article.py`,
  `scripts/newsletter-draft.py`, `scripts/install-git-hooks.sh`. Tests in `tests/test_claude_setup.py`.
- **Not active yet:** hooks and permission rules are in `.claude/settings.proposed.json` until you rename it to `settings.json`.

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
