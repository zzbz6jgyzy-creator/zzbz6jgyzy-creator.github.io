# Decisions

Why each major choice was made. Newest first. Add an entry whenever a real choice is made.

## 2026-10-30 · Earth explorer: Ground mode removed, orbital zoom floor

- **Decision (owner, 30 Oct 2026):** remove Ground mode and the street map entirely. In the owner's words it "zooms into a flat map, it looks terrible". The camera stops well above the surface. First cut 400 km (ISS-like); the owner then chose **2,500 km** on 30 Oct 2026 after seeing 400, 1,000 and 2,500 km samples, because the imagery is only crisp from there. To be lowered when sharper imagery lands.
- **Why:** the handoff from a photographic globe to a flat vector map broke the experience at exactly the moment of highest attention, and the data on either side of the join (2K to 16K historical imagery vs OpenStreetMap vectors) does not match. It also cost a 1.6 MB engine, three third-party map hosts and an attribution burden for a feature the owner did not want.
- **What we kept:** the place picker, because flying the globe to Manhattan or Starbase still does something useful in space view.
- **How the floor works:** one constant (`MIN_ORBIT_ALTITUDE_KM`), one soft-approach function, one clamp in `setZoom()` plus a per-frame guard. See `docs/earth-cosmos.md`, "Zoom floor".
- **Consequence:** we do not offer anything closer than 2,500 km. If street-level is ever wanted again it needs real photographic data (it would need its own approval and licence review), not a styled map.

## 2026-10-30 · Earth explorer: a clean canvas, one modal panel, auto-hiding controls

- **Choice:** the 3D view carries no text by default. An opening overlay holds the headline; a native modal `<dialog>` (side panel or bottom sheet) holds every control and credit; a four-button HUD fades when idle.
- **Why:** on a phone the old hero, place card, caption and dock covered most of the Earth. A modal dialog gives the focus trap, Esc, inert background and focus return for free, which is safer than a hand-rolled disclosure. The cost is that the canvas is not interactive while the panel is open.
- **Pause stays reachable (WCAG 2.2.2):** the fade is opacity only, the button stays focusable and in the accessibility tree, and any activity brings it back. On touch devices an idle HUD has pointer-events off, so the first tap is not swallowed: it passes through to the canvas (it may select a place) and also wakes the HUD; the next tap reaches the buttons. Invisible buttons are never hit by accident.
- **Labels:** kept as real buttons (keyboard, screen reader, tap-to-travel) but transparent until hover/focus or the "Show labels" switch. The headline and distance are spoken through a live region instead of shown.
- **Credits:** a short credit paragraph is in the panel itself, with the full notes one tap further. Map attribution is MapLibre's compact control plus the panel credits.
- **Camera:** removed the globe's view offset (14% right on desktop), which only existed for the old text column. Rendering and lighting are otherwise untouched; stage 2 and 4 own those.
- **Theme:** this page is dark only by design (`color-scheme: dark`); there is no light variant to test.

## 2026-10-29 · Gear second pass: a need-based list, CSS-only filters, two disclosures, no photographs in the list

- **Choice:** replace the shop-by-shop banners and photo grids with one list of equal cards grouped by what people want (interior, screen and glass, wheels, exterior and performance), with radio-button chips as the filter and a plain sticky three-link nav.
- **Why:** readers shop by need ("floor mats", "screen protection"), not by retailer; the first redesign was image-heavy and repeated the same Cybertruck photos. Icons instead of photos remove the duplicates and about half the page weight, and keep the cards the same size.
- **Filters without JS:** radio inputs plus `:has()` (supported in current Chrome, Safari and Firefox). Older browsers simply show every card. JavaScript only adds a count and deep links.
- **Editorial rule 7 ("a visible note next to" affiliate links):** the note sits immediately beside the first affiliate links (the two shop-all buttons, directly above the model picker) and again directly after the list; every card also carries its source label, an external arrow and a screen-reader "affiliate link" name. Repeating the full sentence on every section was judged noise rather than extra disclosure.
- **Categories:** assigned in `data/gear.json` (a card may belong to more than one, e.g. Sunshades are Screen and glass and Interior). No new products, prices or claims; descriptions are the existing ones.
- **Trade-off:** icons are generic line drawings, not product photos; if photos return they should be product-accurate and credited.

## 2026-10-28 · Gear: a builder and data file, a picker instead of a card wall, no new fonts or libraries

- **Choice:** give `gear.html` its own builder (`scripts/build-gear-studio.mjs`) and data file (`data/gear.json`), restyle it as a dark car-led hero with a "Choose your Tesla" picker, and keep every product, price-free description, partner link and credit as published.
- **Why:** the page was hand-edited HTML (`build-buying-studio.mjs` builds the buying guide, not Gear), so a redesign would have been unreviewable and easy to break. The model picker is the real job of the page (readers arrive knowing their car), so it is the hero, not the fifth section.
- **Partner links:** the picker links only to URLs already on the page. EV Bandit has no per-model collection URL in our content, so the tile's second action jumps to the on-page EV Bandit shelf rather than a guessed link.
- **Header:** dark glass over the stage in both themes, scoped to `.gx-page` by pinning the navigation's `--sdn-*` tokens (the Roadster page does the same by overriding selectors). Worth moving into one shared class later.
- **Motion:** CSS scroll-driven reveal only (off under reduced motion, absent where unsupported); no hero animation so LCP is not delayed. One 20-line script only highlights the quick-nav.
- **Accent:** Tesla red, not the Roadster page's amber; this is a shopping page and red is the brand's single sharp accent.
- **Trade-off:** images are now generated by a local script (needs sharp) and committed, like the existing `build-images.mjs`; the CI check rebuilds markup but not images.

## 2026-10-28 · Roadster: a hidden preview first, new data file, no animation library

- **Choice:** build the rebuilt Roadster page at `/roadster-preview.html` (noindex) from a new data file and builder, and swap it into `/roadster.html` only after the owner approves it.
- **Why:** the Roadster page is one of the busiest. A preview lets the owner judge it on a phone, and a separate builder and data file leave the live page and its tests untouched. Official sources only, as chosen: Tesla's CDN, the official YouTube replay and outlets we opened.
- **Motion:** native CSS scroll-driven animations with an IntersectionObserver fallback rather than GSAP or Lenis. GSAP ScrollTrigger is now free but adds weight we do not need, and Lenis hijacks native scrolling. Firefox lacks scroll-driven animations by default, so it gets the fallback.
- **Trade-off:** until the swap there are two Roadster pages; the preview is hidden, so readers only see the live one.

## 2026-10-28 · Teslascope 689 vs 94 stays all-hardware, not HW3-only

- **Choice:** keep the audit’s 689 vs 94 figures as Teslascope’s all-hardware snapshot of 2026.38.5.11 vs 2026.38.5.10, the two builds that carry v14.3.13 (HW4) and HW3 v14.3 Lite.
- **Why:** those counts mix hardware. Calling them HW3-only would overstate how many HW3 cars are on that build. A separate Teslascope HW3 sample showed 267 vs 16. Calling 2026.38.5.11 the most widespread Lite-carrying build is also false: 2026.38.5.1 had 1,029 cars in the same snapshot.
- **Rejected:** swapping in 267 vs 16, or ranking 2026.38.5.11 as the most widespread Teslascope build that carries HW3 v14.3 Lite.

## 2026-10-28 · Promise ledger: Flight 15 and add-your-car stay In progress

- **Choice:** add the 25 Oct B22 fire and 26–27 Oct Ship 42 fires, plus Elluswamy’s Q3 “Q2 next year” line, as evidence. Leave both statuses In progress.
- **Why:** the 28 Oct audit listed the evidence as required and the status change as an editorial call. Q2 2027 is later than “in 2026”, but reclassifying as Revised is a judgment, not a sourced outcome.
- **Rejected:** rewriting the original 2025 Musk wording, or copying the StockAnalysis transcript onto this record. The audit named TeslaNorth for this quote.

## 2026-10-28 · Launch refresh: cached rows lose ties so a changed NET is kept

- **Choice:** `merge_rows(cached_rows(...), rows, previous_rows)` so a later group wins when ranks tie. Terminal statuses (rank 4) still beat Go.
- **Why:** PR #220 merged cache last. `merge_rows` keeps the last row on a tie, so any NET change that did not also change status was frozen at the 27 Oct 11:21 GMT snapshot (Starlink 15-21 stayed at 05:14 UTC).
- **Rejected:** dropping the cache entirely. It still supplies backfill and done rows when LL2 omits them.

## 2026-10-28 · Rebuild JS bundles: own concurrency group

- **Choice:** `js-bundle-main` instead of sharing `data-push-main`. Still `cancel-in-progress: false`, still `ci-push-retry.sh` for push races.
- **Why:** GitHub keeps one pending run per group, so a newer data-push job cancelled the bundle rebuild after #246–#248.
- **Rejected:** re-dispatch on cancel. A separate group is simpler and does not wait on another workflow.

## 2026-10-28 · FSD tracker: safety claims shown as Tesla's claims, never as our conclusion

- **Choice:** show Tesla's crash-rate comparisons with what each group is, the window, and the caveats; label all of it Reported; draw no safety conclusion.
- **Why:** tesla.com is not reachable by our fetcher, so we cannot call anything Disclosed, and the comparison groups differ. Promises are read from the ledger by id so there is one copy of the wording.
- **Trade-off:** the numbers depend on secondary reports until someone can open Tesla's page; the next refresh should check it.

## 2026-10-27 · FSD tracker: a separate page, charts without a library

- **Choice:** build `/fsd-tracker.html` beside `/fsd.html` instead of rewriting it.
- **Why:** the owner wants to compare the two and delete whichever loses. A separate page, builder and data file make that a one-file removal.
- **Charts:** plain SVG drawn at build time, with a table view and about 1 KB of script for tooltips. It matches the Optimus and Cybercab pages and keeps phones free of a chart library. Revisit if a chart needs dense time-series interaction.
- **Scope:** the independent "miles per critical disengagement" block from the plan is dropped at the owner's request.

## 2026-10-27 · Cybercab guide: draw only what is known

- **Choice:** an original illustration with markers only on features whose position is public; the charge port and battery are listed under "Known, but not placed".
- **Why:** a convincing X-ray would invent internals Tesla has not published. The Optimus guide's X-ray follows Tesla's own 2022 description; there is no equivalent for Cybercab.
- **Rivals:** only figures opened from the company (Waymo's blog, Tesla's deck, Zoox's site). Third-party weekly ride counts conflict, and Baidu's site refused access, so they stay out.
- **Capacity:** shown as arithmetic with a visible "not a forecast", because Tesla has published no output and "installed capacity" is routinely misread as production.

## 2026-10-27 · Cybercab guide: a new page, not a rebuild of the tracker

- **Choice:** a separate guide page with its own data file, builder and workflow; `cybercab.html` stays the live tracker.
- **Why:** bots rewrite `cybercab.html`, `cybercab-cities/` and the mobility snapshot twice a day. A rebuild there would collide with them and risk the live counters. A new page has no overlap.
- **Promises:** referenced by id from `data/promises.json` instead of copied, so the ledger stays the one place wording and status change.
- **No 3D model:** the only free scan was poor and the good one is paid. Part 2 uses an original illustration, labelled as ours.
- **Labels:** Disclosed means Tesla or a regulator said it in a document we opened. Spec numbers from news reports are Reported even when the outlet read an official filing.

## 2026-10-27 · Optimus 3D: a fan model, cut at the joints

- **Choice:** use Michael's CC BY 4.0 Sketchfab model (the most detailed downloadable Optimus) and cut its single fused mesh into 17 parts ourselves, rather than wait for an official model (none exists) or hand-build a low-detail one.
- **Why:** the Cybertruck and Model 3 explorers set the pattern: a licensed exterior plus illustrative internals in code. A fused mesh cannot explode, so the cuts sit where the real robot has joints.
- **Honesty:** the author titles it Gen 3, but it resembles Gen 2, so the page calls it fan-made, not Tesla CAD. Internals follow Tesla's 2022 description; Gen 3's are unpublished.
- **Cost:** 2.1 MB, loaded only on request. The 100 MB source zip stays on the `optimus-model-source` GitHub release and is not served.

## 2026-10-27 · Optimus guide: label every number, never fill gaps

- **Choice:** every figure on `/optimus.html` carries one of three labels (Disclosed by Tesla, Target, Reported) plus a source opened on the review date. The generations table shows "Not published" instead of combining figures from different years into a made-up current spec.
- **Why:** Optimus coverage elsewhere mixes 2021 concept targets, 2022 prototype figures, patents and leaks into one "spec sheet". Our edge is being the page people trust, per the editorial rules.
- **Kept the stack:** the existing data → validator → builder pattern (`data/optimus-studio.json`, `optimus-model.js`, `scripts/build-optimus-studio.mjs`), no framework or new dependency. The page stays readable with JavaScript off.
- **Trade-off:** the page shows fewer numbers than rival sites. Rivals' figures are their makers' own, labelled as such.

## 2026-10-27 · Robotaxi Boss: windows, tokens and a real way to lose
- **Decision:** campaign and daily resolve each day in four windows with a short dispatch pause; interventions cost dispatch tokens; the week can end early on low reputation (under 15) or negative cash. Training stays on the original single-shot day and never fails.
- **Why:** the old game had no lose state, one dominant strategy and a campaign identical on every replay. Windows give timing decisions (rush hours, concert let-out, airport delay), tokens limit them, contracts and the shop add trade-offs, and weeks escalate.
- **Tuning:** a scripted bot with no interventions: doing nothing is suspended by day 3, a fixed sensible plan nearly finishes the daily week and completes campaign week 1, and a plan that buys routing, care and ops completes the week. Real play with surge and rebalance should do better than the bot. All numbers (token count, surge effect, permit floor 15, repair costs) are single constants in `robotaxi.js`.
- **Test safety:** `runDay` stays synchronous under reduced motion (windows resolve in a loop), resume snapshots are unchanged, and week 1 uses the same seed as before.

## 2026-10-27 · Hot Staging gets Max-Q, gusts and Raptor-outs in campaign and daily only
- **Decision:** the new mechanics (seeded gust schedule, one mid-flight engine failure from flight 2 / in daily, Max-Q load with a throttle-down control) apply to campaign and daily. Training keeps its exact timings, no wind and no Max-Q. Gusts and the engine event are generated at reset from the seeded rng, after the existing draws, so daily seeds stay fair and the old determinism test still holds.
- **Why:** the browser tests pin training timings, and the first minute should stay simple. The throttle trade-off (65% steering, 0.6x clock) gives a real decision instead of a button to hold.
- **Tuning:** a crude tap-bot with 150 ms reaction clears 2 to 5 campaign flights and full daily sets, so the ramp is playable. All values (`GUST_AV`, load rates 0.46 and 0.05 per second, Max-Q band 0.34 to 0.62) are single constants in `staging.js`; tune from player feedback.

## 2026-10-27 · Hot Staging stays on Canvas 2D (no PixiJS/WebGL)
- **Decision:** the overhaul keeps Canvas 2D and adds `staging-fx.js` (pure drawing helpers). The planet surface is rendered at half resolution into a cache canvas and blitted; heavy static parts are cached rather than redrawn.
- **Why:** a WebGL engine would add a large dependency to a page that must keep Core Web Vitals green, and WebGL is riskier in the headless CI browser. Measured cost of the new scene is about +4 ms per frame in software rasterisation (much less on a GPU).
- **Rejected:** PixiJS v8 / Phaser 4 for now. Revisit if a later phase needs thousands of particles or shaders.

## 2026-10-27 · PRs do not carry bot-generated studio output
- **Decision:** Feature PRs change source only (builders, models, hand-edited `data/events.json`, article HTML, tests). Saved pages, `data/*-studio.json`, hashed `assets/js` bundles, `index.html` prerender and `data/launches.json` stay as main last wrote them. Studio CI still *runs* the builder on the PR (so browser tests see the new logic) but skips the `git diff` ownership check. That check still runs on push/schedule/`workflow_dispatch`. After merge, `home-build.yml` and `js-bundle.yml` (triggered by `*.js`, `data/events.json`, the tesla/calendar models) commit the rebuilt output. News/Starlink/newsletter jobs no longer `git add *.html`.
- **Why:** news-snapshot (`:12/:42`), updates-snapshot (`:20/:50`) and launches-refresh (`:17`) rewrite the same HTML/JSON every half hour. A PR that committed a snapshot of those files became unmergeable before it could be reviewed. Rebasing just restarted the race.
- **Rejected:** keep committing generated files and hope a rebase lands in a quiet window. The jobs are too frequent. Also rejected: `merge=ours` on generated files — GitHub’s mergeable check does not honour a custom merge driver.

## 2026-10-27 · Newest software build is highest version on the newest first-seen day
- **Decision:** homepage and Tesla overview pick the newest Teslascope build by UTC first-seen *day*, then numeric version. 2026.38.5.11 beats 2026.38.5.6 when both were first seen on 24 Oct, even if `.6` has a later timestamp.
- **Why:** “newest build reporting” means the later point release, not whichever row Teslascope logged a few minutes later. The software tracker already compared versions this way.

## 2026-10-26 · Claude Code project setup (agents, commands, hooks, skills)
- **Decision:** five subagents (`designer`, `frontend`, `seo`, `reviewer`, `content-ops`), six slash commands, three hooks, two skills and
  two rules files live in `.claude/`; helper scripts in `scripts/audit/`, `scripts/new-article.py`, `scripts/newsletter-draft.py`.
  Details in `docs/claude-code-setup.md`.
- **Why:** repeatable work (publishing, auditing, shipping) should be one command from a phone session, and the mistakes this
  week (broken meta tags, builders overwriting each other, a hard-coded launch time in a test) should be caught before commit.
- **Adapted to today's stack.** The research recommended Biome/Prettier, `astro check` and lint hooks for an Astro project. The site
  has none of that yet, so hooks check what exists: secrets, JSON/JS/Python syntax, `<head>` hygiene, DRAFT markers and the unit
  tests. They are written so `astro check` and lint can be added when the migration happens.
- **Auto-format is deliberately narrow.** Much of this repo is generated or minified (one-line CSS and JS, built pages, data JSON).
  Reformatting it would bury real changes in huge diffs, so only Markdown and short-line CSS/JS/JSON are formatted.
- **Plugins don't load in cloud sessions**, so skills are files in `.claude/skills/`, not plugins.

## 2026-10-26 · Keep the static stack for now; migrate to Astro on Cloudflare only with approval
- **Decision:** fix the audit's P0/P1 issues on the current stack first. Astro 7 + Cloudflare Workers is the recommended migration,
  done page by page with the current site served unchanged from `public/` on day one. Not started.
- **Why:** the site already scores well; the problem is the cost of change (generator scripts that overwrite each other, 65
  stylesheets, no shared components, publishing from a phone). See `docs/audit.md` §7 and `docs/research.md`.

## 2026-10-26 · Theme follows the device until the reader chooses
- **Decision:** `theme-boot.js` applies the light theme from `prefers-color-scheme` unless `sd-theme` is saved; only the toggle saves.
- **Why:** the brief requires system-preference support; the old code saved "dark" on every load, so a choice could not be told
  from a default. Returning visitors who already have "dark" saved keep it until they toggle.

## 2026-10-26 · Headlines are never cut mid-sentence
- **Decision:** `<title>` ends at a whole clause (suffix only when it fits); `og:title`, `twitter:title` and the NewsArticle
  `headline` carry the full headline (`seo_lib.headline_title`, `seo_lib.social_headline`).
- **Why:** share cards and search results read "SpaceX's $40 billion GPU deal is four".

## 2026-10-26 · Migration starts as a packaging layer, not a move
- **Decision:** `astro/` builds the existing root into `dist/` for Cloudflare Workers static assets, with a parity test. Pages move into Astro one at a time via `astro/ported.json`.
- **Why:** the root can't be restructured while ~80 builders and 12 bots rewrite it in place. This gives real cache and security headers and a preview URL now, with zero live change and a one-folder rollback. Details in `docs/migration.md`.

## 2026-10-27 · Markdown authoring on the existing pipeline, not an Astro-emitted article
- **Decision:** `content/dispatch/*.md` renders to `dispatch/*.html` in the repo (`scripts/render-article.py`); the seven generators keep running over it.
- **Why:** an Astro-built article would skip related stories, contents, SEO graph, feed and sitemap until all seven generators are rewritten (P6). This gives phone publishing now with no change to existing pages.

## 2026-10-27 · Homepage client refresh kept, but only swaps when stories changed
- **Decision:** `home-v2.js` reads Dispatch card titles from `h2, h3` and compares the fetched lead and supporting stories with what is already rendered. If hrefs and titles match, it leaves the DOM alone.
- **Why:** the pre-render (`scripts/build-home.js`, ~30 min) normally already holds the newest stories, so the refresh is a no-op and cannot shift layout. It only swaps when a story landed since the last build, which is the case the refresh exists for. Removing it would delay new or pinned leads by up to 30 minutes.

## 2026-10-30 · Earth explorer: Neutral tone mapping, analytic atmosphere, stay on three r170
- **Decision:** Khronos PBR Neutral at exposure 1.2 for the explorer renderer (was ACES 1.08). The atmosphere is a per-pixel single-scattering integral with the Chapman function for the Sun path, evaluated in linear light inside the surface and cloud shaders (the shell only draws the limb). Three.js stays at r170.
- **Why Neutral over AgX and ACES:** same scene, same views (day glint, terminator, sunset limb), after the haze was moved into linear light. Deep ocean (sRGB): AgX 1.25 (52,83,114) is a washed grey-blue; Neutral 1.0 (11,48,81) and 1.2 (15,53,89) are deep blue, closer to DSCOVR EPIC. Sahara: AgX (193,178,159) desaturated, Neutral 1.2 (219,187,144) keeps its colour with no channel at 255; clouds reach about (230,233,234), not clipped. City lights stay saturated warm under Neutral and go grey under AgX. ACES clipped clouds and desert to flat white in the first pass. Moon and Solar System views were checked and show no regression.
- **Engine and method:** r170 has Neutral, AgX, `textureGrad` and WebGL2; r186 has nothing we need, so an engine change is risk without a visual gain. Hillaire-style LUTs need extra passes and textures that pay off for ground-level skies, not one planet from space; bloom would need an HDR composer on phones for one highlight. The Starship replay deliberately keeps the legacy shaders and ACES.

## Open: review ratings
Reviews deliberately replaced unexplained numeric scores with recommendations (`docs/reviews-studio.md`). Google's review rich
results require a rating. Adding one is an editorial decision for the owner, not a technical one; until then no `Review` schema.
