# Decisions

Why each major choice was made. Newest first. Add an entry whenever a real choice is made.

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
