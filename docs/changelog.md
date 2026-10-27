# Changelog

## 27 Oct 2026 — Optimus guide: interactive showpieces (Optimus PR 2 of 3)

- **Body diagram:** the cropped portrait in "Inside the machine" is replaced by an original kinematic sketch; choosing a system lights up its parts (cameras, computer, battery, joints, hands, feet and balance).
- **Hand lab:** switch between Gen 2 (11 DoF, published) and Gen 3 (22 DoF, reported) to see which motions are driven and how tendons run to forearm actuators; a grip slider shows why touch sensing matters (slip, hold, crack).
- **Ramp explorer:** an illustrative S-curve toward 20,000 a week, with a slider, pointer cursor, two paces, weekly/yearly/cumulative readouts, a delivery-target band and a table view. Labelled as illustration; Tesla has published no volumes.
- **Promise strip:** each commitment drawn from when it was said to when it was due, with its outcome and a Today line.
- New tests for the ramp model and every new control; illustrations live in `scripts/optimus-art.mjs`.

## 27 Oct 2026 — Optimus guide: research backbone (Optimus PR 1 of 3)

- **State of play:** eight sourced numbers (production started, 1M/yr Fremont design, 10M/yr Texas design, 20,000/week goal, late-2027 deliveries, AI5 in April 2027, 22-DoF Gen 3 hand, the 1M-robot pay milestone), each labelled Disclosed, Target or Reported, with an as-of date.
- **Generations compared:** concept, AI Day prototype, Gen 2, Version 2.5 and Gen 3 side by side; blank cells say "Not published" rather than guessing. On phones, a switcher shows one generation beside the labels.
- **Timeline:** 19 dated moments from 2021 to the 2027 targets, filterable by kind.
- **Promises vs reality:** seven dated commitments checked: 2 kept, 1 missed, 1 not shown, 3 open.
- **The field:** Atlas, Figure 03, Digit, NEO and Unitree G1 in their makers' own words, next to Optimus.
- Three more evidence records (Tesla Diner, kung fu, running), 14 FAQs, 38 sources (22 new or rechecked on 27 Oct 2026), BreadcrumbList, and a fix for the literal `${reviewDate}` in the sources header.

## 27 Oct 2026 — Robotaxi Boss: sound, phone and results (PR 3 of 3)

- **Sound:** on after you start (a muted choice is remembered, same as the other games), through a compressor with city hum, a rain bed when it rains, traffic during the day replay, a rising cash tick on fares, a sting and haptic when a cab breaks, an arpeggio and haptic for contract wins, and a toast over the map for events and status. Haptics respect mute and reduced motion.
- **Phone:** Play enters focus view, the action bar ("Run the day", "Sleep ·" and the rest) is fixed to the bottom of the screen, the fleet is a swipeable tray, dispatch opens as a bottom sheet, the header and mode bar are compact, and landscape gives the map the full height. The map scrolls into view after each night instead of jumping to the forecast.
- **Results screen:** animated medal, points counting up, rows (cash, cabs, rides, missed, reputation, contracts won), personal-best delta, and a Share result button that sends a generated 1200x630 card through the share sheet (text and link fallback, then clipboard). Failed weeks ("Permits suspended", "Chapter 11") get their own card.
- Shared helpers `SDArcade.share` and `SDArcade.medalSvg` added to `arcade.js` for new games to reuse.
- Cleanup: removed the dead leaderboard, callsign and hero-button code from `robotaxi.js` and 23 dead CSS rules from `robotaxi.css`; the manual and intro describe windows, tokens, contracts and the new ways to lose.
- Tests: Robotaxi sound default and remembered mute, phone focus view with the fixed action bar at 390 px, results card after the week.

## 27 Oct 2026 — Robotaxi Boss: decisions that matter (PR 2 of 3)

- Campaign and daily days now run in **four dispatch windows** (morning rush, midday, evening rush, night out). Between windows the day pauses for about 7 seconds: spend **dispatch tokens** (2 a day, 3 with the Ops centre) to **surge** a zone (+25% fare, -20% demand), **rebalance the fleet** toward the zones that are short, or pay for a **roadside fix** after a breakdown. Under reduced motion and in tests the windows run straight through with no interventions, so `Run the day` is still synchronous. Training keeps the single-shot day.
- **Two contracts a day:** pick the safe one or the bold one (35% more rides for 70% more bonus).
- **Six upgrades:** Ops centre (+1 token), Surge AI (surge +40% fares, only 15% demand lost) and Brand campaign (+10 reputation, +5% demand) join the original three.
- **Stakes:** reputation under 15, or cash below zero, at the end of a day ends the week early ("Permits suspended" / "Chapter 11", recorded as an incomplete run). Reputation rules are gentler than before for ordinary coverage gaps and harsher for total neglect.
- **Campaign progression:** "Run another week" starts week 2, 3 and so on (more rain, +6% demand per week, more breakdowns). Week 1 is unchanged and deterministic; Restart goes back to week 1.
- Anonymous counters for Robotaxi starts, retries, completions and `game_fail_bankrupt` (Worker allowlist extended, redeploy needed).
- Map and run improvements: the map scrolls into view when you run the day; playback keeps running when the map is off screen.

## 27 Oct 2026 — Robotaxi Boss: the living city (PR 1 of 3)

- The static SVG diagram is replaced by a live Canvas 2D city (`robotaxi-fx.js`): a seeded procedural map with downtown towers, an airport with a runway and passing planes, a stadium with floodlights and a concert glow, hills with houses and contours, a river, arterial roads and a depot with charging bays.
- Time of day runs from 6:00 to 22:00 (ambient light, dusk glow, lit windows, road lamps, headlight cones); rain adds streaks, ripples and wet roads.
- Cabs drive their routes to their zones; demand shows as pulsing passenger dots and a coverage ring around each zone; rides produce floating fares and a cash ticker; missed demand and breakdowns (with smoke) are shown on the map; the contract has a progress ring. The day now plays as a 10-second replay of the existing deterministic result (skippable; instant under reduced motion). Rules, scores and saved weeks are unchanged.
- Zone hit areas stay real buttons ("Assign selected cabs to ..."); the cards, steppers and fleet grid are untouched. The canvas reserves its space (layout shift 0.0035 on desktop, 0 on phone) and costs about 3.6 ms per frame in a software-rendered browser.

## 27 Oct 2026 — Hot Staging phone layout, results screen and cleanup (PR 3 of 3)

- Phone: compact header and mode bar, Play enters focus view automatically (exit is remembered for the session), bigger thumb pad with safe-area padding and a Throttle button in campaign and daily, and a landscape layout where the stage fills the screen and the pad floats over the lower corners.
- Fixed for both Hot Staging and Catch: starting focus view now scrolls to the top (landscape phones used to show the stage cut off), and the instrument panel is hidden in landscape focus view.
- Results screen: animated medal, points counting up, timing/attitude/bonus rows, personal-best delta, and a Share result button that sends a generated 1200x630 card through the share sheet (text and link fallback, then clipboard). Failures show a matching card with the reason and run score.
- The instrument panel no longer says "Stage now" after the flight has ended.
- Page copy and the mission manual describe Max-Q, gusts, Raptor-outs and the streak bonus. 19 rules of dead legacy CSS removed from `staging.css` (about 200 lines).
- Tests: Hot Staging focus view at 390 and 1440 px, results card after a stage.

## 27 Oct 2026 — Hot Staging interaction and feel (PR 2 of 3)

- Campaign and daily flights now have telegraphed **gusts** (arrows and tint about 1.25 s ahead, callout says which way to steer), a mid-flight **Raptor-out** (engine goes dark, pulls the stack to one side), and **Max-Q load management**: hold Throttle (S / Down, or the new pad button) through the Max-Q band to keep the structural load bar down. Throttling costs steering authority (65%) and slows the clock to the window (0.6x). Unattended load past 1.0 is a new "Max-Q breakup" failure. Training is unchanged: no gusts, no Max-Q, same timings.
- Scoring: streak bonus for consecutive clean stages, +150 Max-Q managed, +120 Raptor-out saved; shown in the debrief.
- Feel (from Catch): sound on after Play with a remembered mute, compressor, proximity ping that rises as the needle nears the sweet spot, warning beeps, haptics on window/stage/fail/engine-out, slow motion (0.62x) while the window is open and a 110 ms hit-stop on stage and fail (both off for reduced motion and demo), `R` to retry, tips on every failure, first-run coaching callouts, mission briefing callout.
- Anonymous counters for Hot Staging starts, retries, completions and each failure kind (`game_fail_walk|early|late|rud|maxq`); Worker allowlist extended (deploy needed).
- Tests: Play now unmutes Staging like Catch; new checks for gust schedule determinism, remembered mute, training staying simple, and an unattended campaign flight failing.

## 27 Oct 2026 — Games: Catch upgrade and Hot Staging visual overhaul

- Catch: anonymous play counters (`game_start`, `game_retry`, `game_complete`, `game_fail_*`, `game_return_d1`; page path only, no IDs), phone-first layout (compact header, focus view on Play, landscape pad), sound on after Play with a remembered mute, callouts, plume glow, final-approach slow motion, haptics, `R` to retry.
- Hot Staging (PR 1 of 3): new renderer in `staging-fx.js` + `staging.js`. Perspective planet with parallax surface, cloud deck, city lights, limb glow and aurora; speed streaks and exhaust trail; Max-Q vapour collar; cinematic stage (starburst, booster flip and fall, Ship acceleration, camera tracking); four breakup cinematics (debris, fireball, shards; the debrief now appears after 1.2 s); canvas instruments (altitude tape, attitude gauge with safe/fail zones, staging-window meter). Simulation, scoring and test timings are unchanged. Frame time in a software-rendered headless browser went from about 11.8 ms to 15.8 ms at 1440 px (planet surface cached at half resolution).

## 27 Oct 2026 — Live leftover titles and launch Record line

- Roadster story-list titles now match the renamed previews (`Roadster day preview: Musk promised a “BANGER”`, `Roadster reveal set for 15 Oct (preview)`). The banger `<title>` keeps ` | Supercharged Daily`; og/twitter stay unsuffixed.
- A stale Launch Library 2 “In Flight” label becomes Success once NET has passed, so flown launches no longer show `Editorial calendar · Launch in Flight` on the Record line.
- News studio’s rebuild check keeps pictures, newsletter and a deterministic second pass, and no longer requires the committed `news.html` snapshot. Source-only title updates can land without a generated-page commit.

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
- Homepage 320px CLS: phone hero stays in document order so `.hv-start` cannot jump from the hero. `.hv-event` keeps a 151px box while live.js drops `data-prebuilt` after hydration. Threshold stays `< 0.1`.

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
