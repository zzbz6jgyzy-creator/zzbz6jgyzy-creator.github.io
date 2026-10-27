# Decisions

Why each major choice was made. Newest first. Add an entry whenever a real choice is made.

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

## Open: review ratings
Reviews deliberately replaced unexplained numeric scores with recommendations (`docs/reviews-studio.md`). Google's review rich
results require a rating. Adding one is an editorial decision for the owner, not a technical one; until then no `Review` schema.
