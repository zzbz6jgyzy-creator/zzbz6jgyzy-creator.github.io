# Supercharged Daily — Phase 0 audit

Audited 26 Oct 2026 against `main` at `d926e4c` and the live site at https://superchargeddaily.com.
No code was changed for this audit.

## 1. What the site is today

| Layer | Finding |
|---|---|
| Rendering | Hand-written static HTML. 159 `.html` files (≈100 pages, 83 Dispatch articles, 6 reviews, city/explainer pages). No framework, no `package.json`, no TypeScript. |
| "Build" | ~70 bespoke Python/Node scripts in `scripts/` that rewrite committed HTML in place (homepage slots `<!--hv:*-->`, SEO tags, nav, footer, JS bundle hashes, OG images, noscript, reading minutes). Effectively a home-made static site generator spread across many files. |
| Styling | 65 root CSS files (1.09 MB total). One per page/"studio" plus `styles.css` (94 KB), `theme.css`, `nav-pill.css`, etc. Tokens exist but are not one system. Fonts: Inter, IBM Plex Mono, Michroma (self-hosted woff2). |
| JS | 159 root JS files (3.8 MB incl. a 1.6 MB `starlink-gp.js`), bundled into 39 hashed files in `assets/js/` by `scripts/build-js.mjs`. |
| Hosting | GitHub Pages (custom domain via `CNAME`), **proxied through Cloudflare** (orange cloud — responses carry `server: cloudflare`, `cf-ray`). `workers/wrangler.toml` still says "DNS-only"; that comment is stale. |
| Caching | HTML: `cache-control: max-age=600`, `cf-cache-status: DYNAMIC` (Cloudflare is not caching HTML). Assets: `max-age=14400` (4 h), including content-hashed bundles that could be cached for a year. GitHub Pages cannot set custom headers. |
| Content model | Articles = one HTML file each in `dispatch/`, plus an entry in `data/articles.json` and a card in `dispatch.html`. Trackers read committed JSON/JS (`data/*.json`, `*-data.js`). |
| Data refresh | 43 workflow files. Cron jobs (news and Tesla updates every 30 min, launches, Starlink, robotaxi, EPA, newsletter) commit snapshots straight to `main`, which redeploys Pages each time. |
| Backend | Supabase (Google sign-in, comments, likes, moderation; RPC-only access to a private schema with RLS). Cloudflare Workers + KV: `aljr-boards` (game leaderboards) and `sd-events` (first-party analytics sink). |
| Newsletter | Beehiiv. `newsletter.js` hands the email to the Beehiiv-hosted subscribe page. Sunday issue, Welcome + 5 tag automations. Latest issue pulled into `data/newsletter-latest.json` by a workflow. |
| Analytics | Cloudflare Web Analytics beacon + `track.js` → `sd-events` worker. No Google Analytics. |
| Search | Client-side, custom (`search.js` over `data/pages.json` + `data/articles.json`). |
| Tests | ~80 test files (Node `.mjs` unit tests, Python Playwright browser scripts, a Python SEO audit), each wired to its own `*-checks.yml` workflow. |
| Repo | 377 MB working tree. `assets/dispatch/` alone is 276 MB, mostly **49 MP4 files (257 MB) committed to git**. Even this shallow clone's pack is 356 MB. |

## 2. Performance (Lighthouse 13, lab)

Run locally with Lighthouse 13 + Chromium against the live site (default simulated mobile throttling; desktop preset where noted). The PageSpeed Insights API was rate-limited (HTTP 429) from this environment, so **no CrUX field data was collected** — check Search Console → Core Web Vitals for real-user LCP/INP/CLS. Requests passed through an egress proxy, which adds some TTFB; treat absolute times as slightly pessimistic.

| Page | Device | Perf | A11y | Best Pr. | SEO | LCP | TBT (INP proxy) | CLS | Weight |
|---|---|---|---|---|---|---|---|---|---|
| Homepage `/` | Mobile (run 1 / 2) | 82 / 99 | 97 | 81 | 100 | 2.5 / 2.0 s | **570** / 20 ms | 0 | 505 KB |
| Homepage `/` | Desktop | 99 | 97 | 81 | 100 | 0.8 s | 0 ms | 0.004 | 491 KB |
| Article `/dispatch/spacex-40b-gpu-lease.html` | Mobile (run 1 / 2) | 98 / 92 | 100 | **58** | 100 | 2.0 / 2.1 s | 40 ms | 0 / **0.15** | 695 KB |
| Article | Desktop | 99 | 100 | **58** | 100 | 0.7 s | 0 ms | 0.038 | 692 KB |
| Tracker `/starship.html` | Mobile (run 1 / 2) | 87 / 84 | 97 | 81 | 100 | **3.5 / 3.8 s** | 50 ms | 0 | 308 KB |
| Tracker `/starship.html` | Desktop | 99 | 97 | 77 | 100 | 0.9 s | 0 ms | 0.005 | 358 KB |
| Tracker `/fsd-europe.html` | Mobile | 97 | 100 | 77 | 100 | 2.2 s | 40 ms | 0.001 | 312 KB |

INP cannot be measured in a lab; TBT is the stand-in. Real INP needs field data (CrUX or `web-vitals` RUM).

**Overall:** better than expected. Articles and most trackers are already near the 90+ bar. The problems are specific:

- **Starship tracker LCP 3.5–3.8 s on mobile (fails "good" ≤ 2.5 s).** The LCP element is `img.ss-hero-photo`; it downloads in ~150 ms but has a **~2 s element render delay**, so something (render-blocking CSS chain or a JS/CSS reveal) holds it back.
- **Homepage main-thread spikes.** One run had 570 ms TBT and 3.4 s main-thread work. Run-to-run variance this large usually means heavy hydration JS (`home.bundle`, `intel.bundle`, `core.bundle`) competing with rendering.
- **Article CLS 0.15 in one of two runs** (threshold 0.1). The shifting node is `p.standfirst`, the LCP text block — most likely a web-font swap whose fallback metrics don't match.
- **Render-blocking CSS: 6–11 stylesheets per page.** 26 pages load the same stylesheet twice: once with the `media="print" onload` async trick and again as a normal blocking `<link>`, which cancels the async benefit.
- **Cache lifetimes.** Lighthouse estimates 140–265 KB of repeat-visit savings per page; hashed bundles get only 4 h.
- **Best Practices 58 on articles.** It's caused by the X/Twitter embed (`widgets.js`): third-party cookies, Issues-panel warnings, plus 31 KB and 12+ requests. Every page also loses points to deprecated-API warnings from **Cloudflare's injected bot-challenge script** (`/cdn-cgi/challenge-platform/.../main.js`, ~10 KB on every page). That script comes from Bot Fight Mode / JS detections in the Cloudflare dashboard.
- **Very large HTML documents.** 8 pages exceed 200 KB because tracker data is pre-rendered inline: promise-tracker 520 KB, see-the-launch 356 KB, news 329 KB, fsd-europe 329 KB, fsd 301 KB, tesla-clubs 291 KB, starlink 233 KB, calendar 205 KB.

## 3. SEO

**Strong foundations — better than most indie sites:**

- Every indexable page has a title, meta description, canonical, Open Graph and `summary_large_image` X cards (`twitter:site`/`creator` = @ALJR86). The only gaps are listed below.
- Structured data: `NewsArticle` on 81 articles, `BreadcrumbList` on 91 pages, plus `Dataset`, `CollectionPage`, `FAQPage`, `VideoObject`, `Person`, `Organization` and `WebSite`. All JSON-LD parses.
- `sitemap.xml` (146 URLs) exactly matches the indexable pages; nothing missing, nothing dead.
- `sitemap-news.xml` exists. RSS `feed.xml` has 92 items. IndexNow is wired up (`scripts/indexnow-ping.py`, key file at root). `robots.txt` is fine.
- Trust pages exist: about, author, editorial policy and contact. Bylines and `datePublished` are present.
- http→https and www→apex 301s work. The 404 returns a real 404.

**Issues found:**

| # | Issue | Where |
|---|---|---|
| S1 | **Broken `<meta name="description">`.** The opening of the tag is missing, so the description text sits loose in `<head>` and the page has no description. | `dispatch/robotaxi-938-f1-cota.html` |
| S2 | **Headlines truncated mid-sentence** in `og:title`, `twitter:title` and the JSON-LD `headline`, e.g. "SpaceX's $40 billion GPU deal is four". 11 articles end on a dangling word. This is what X shows on every share. | `scripts/build-seo.py` / `seo_lib.py` truncation |
| S3 | **Reviews have no `Review` schema.** They use `Article` + `Car`, so they can't earn review rich results (rating, pros/cons). | `reviews/*.html` |
| S4 | `dateModified` always equals `datePublished`. 21 articles lack `article:modified_time`. Updates to stories aren't signalled. | Dispatch |
| S5 | The news sitemap holds 10 items, some older than 48 h. Google News only uses articles from the last 2 days, so older entries are ignored (harmless, but the window should be enforced). | `sitemap-news.xml` |
| S6 | Small gaps: 3 duplicate titles; `model3-viewer.html` has no canonical, description, viewport or `h1`; `dispatch/grok-crew.html` has no description, OG image or `h1`. | various |
| S7 | Homepage on mobile shows **no headline above the fold**. It shows tagline → buttons → newsletter → Roadster showcase. Readers arriving from X see marketing, not news. | `index.html` |

## 4. Accessibility (WCAG 2.2 AA)

Tooling: axe-core 4.x with `wcag2a/aa`, `wcag21a/aa`, `wcag22aa` and best-practice rules, at 390 and 1440 px, in emulated light and dark preference, across home, article, two trackers, a review, news and 404. Lighthouse a11y scores were 97–100. No horizontal scroll at 390/768/1440 on any tested page. No console errors (the 404 page logs its own expected 404).

| # | Finding | WCAG | Pages |
|---|---|---|---|
| A1 | **Colour contrast failures**: story tags and read-time labels, newsletter preview kicker, Starship primary button and section nav, FSD Europe rail eyebrow, News topic chips. | 1.4.3 (AA) | home (9 nodes), starship (6), fsd-europe (3), news (2) |
| A2 | **Accessible name doesn't contain visible label.** News card image links use `aria-label="Read …"` that doesn't match the visible text. | 2.5.3 (A) | news (5–7 nodes) |
| A3 | Target size under 24×24 px and unnamed controls inside the X embed iframe. This is third-party code, fixable only by replacing the embed with a static card. | 2.5.8 (AA), 4.1.2 | articles with X embeds (40 articles) |
| A4 | The skip link sits outside any landmark. Duplicate unlabeled `aside` landmarks. | best practice | all / fsd-europe, reviews |
| A5 | **Theme ignores the reader's system preference.** The site is always dark unless the reader has toggled to light (`theme-boot.js` reads only `localStorage`). This isn't a WCAG failure, but it breaks the brief's requirement. | — | site-wide |

**Needs a manual check** (automated tools can't decide these):

- **2.4.11 Focus Not Obscured:** the floating pill nav may cover focused elements while tabbing.
- **2.4.7 / 2.4.13:** focus visibility.
- **1.4.10 / 1.4.12:** reflow and text spacing on tracker tables.
- **2.5.7 Dragging Movements:** globe and map trackers need non-drag alternatives.
- **3.3.8 Accessible Authentication:** Google sign-in is fine.
- **Reduced motion:** honoured in some CSS files but not all; the hero video and globes should be checked.

## 5. Engineering health

| # | Finding | Impact |
|---|---|---|
| E1 | **Deploy churn.** 100 workflow runs on `main` in the 5 hours before this audit (2,500 total). 41 of the last 79 commits are by `github-actions[bot]`. Every 30-minute data snapshot is a commit that rebuilds and redeploys Pages. 10 of 32 Pages deploys in that window were cancelled (superseded). | Noisy history, slower `git clone`. Deploys and data refresh share one point of failure. The 4 h asset cache never settles. |
| E2 | **CI red on main:** "Pre-render homepage + related stories" failed 6 of 14 runs in that window, and JS bundle rebuild failed 2 of 9. | Homepage can lag behind content. |
| E3 | **257 MB of video in git.** GitHub Pages has a 1 GB site limit and a 100 GB/month soft bandwidth limit, and repos are recommended under 1 GB. | This will hit limits. Video belongs on R2 or Cloudflare Stream. |
| E4 | **No single design system.** 65 CSS files, per-page "studio" styles, duplicated stylesheet links. | Every new page re-invents components; brand drift. |
| E5 | **No linter, formatter, type checking or pre-commit hooks.** Many checks run only in CI, one workflow per feature (43 files). | Slow feedback; easy to push broken HTML (see S1). |
| E6 | **Security headers.** HSTS is 30 days, not preloaded. No CSP, Referrer-Policy or Permissions-Policy (GitHub Pages can't set them). The Supabase publishable key is public by design, which is fine with the RPC + RLS design. Google OAuth branding was last noted as "Testing" in `docs/members-setup.md`. | Moderate. |
| E7 | **Publishing friction.** A new article means hand-editing a large HTML file, adding a card to `dispatch.html`, and running or waiting for scripts. There's no phone-friendly path. | Slows the core job. |

## 6. Prioritised fixes

Impact: H/M/L. Effort: S (< 1 h), M (half-day), L (multi-day). Everything in P0/P1 can be done **on the current stack**, whatever the migration decision.

| Pri | Fix | Impact | Effort |
|---|---|---|---|
| P0 | Repair the broken meta description (S1). Fix headline truncation to cut at a sentence/clause boundary or use the full headline (S2), then re-run the SEO build. | H | S |
| P0 | Respect `prefers-color-scheme` as the default, keep the toggle as an override, and add `color-scheme` meta (A5). | H | S |
| P0 | Fix the contrast failures (A1) and the label/name mismatch (A2). | H | S |
| P0 | Turn off Cloudflare Bot Fight Mode / JS detections for the site, or scope them to `/members*`. This removes the injected challenge script from every page. *(Dashboard change — needs your OK.)* | M | S |
| P1 | Starship hero: find and remove the 2 s render delay; preload the hero image with `fetchpriority="high"` (LCP 3.8 s → < 2.5 s). | H | S–M |
| P1 | Remove duplicated stylesheet `<link>`s on 26 pages; merge the always-on CSS (styles + theme + nav-pill + members + wayfinding) into one file. | M | M |
| P1 | Add metric-matched fallback for the standfirst font to stop article CLS. | M | S |
| P1 | Replace live X embeds with a static, pre-rendered post card (text, author, date, link; optional click-to-load). Fixes Best Practices 58 → ~100, A3, and 31 KB + 12 requests per article. | H | M |
| P1 | Put the top story above the fold on mobile homepage (S7). | H | M |
| P1 | Add `Review` schema (rating, pros/cons, author) to the review template (S3). Set real `dateModified` on updates (S4). Enforce the 48 h news-sitemap window (S5). | M | S–M |
| P1 | Fix the failing "Pre-render homepage" job (E2). | M | S–M |
| P2 | Move MP4s out of git to Cloudflare R2/Stream (E3). *(History rewrite to actually shrink the repo needs separate approval.)* | M | M |
| P2 | Stop committing data to `main` every 30 min: write tracker JSON to KV/R2 (or a `data` branch) and rebuild only on content changes (E1). | M | M–L |
| P2 | Long-cache hashed assets (1 year, immutable) — needs a host that allows headers (Cloudflare). | M | S after move |
| P2 | Add lint/format/typecheck + pre-commit hooks; consolidate 43 workflows into PR / nightly / weekly (E5). | M | M |
| P3 | Design system: one token file, type scale, shared components (E4) — naturally part of the migration. | H | L |
| P3 | Phone-first publishing workflow (E7) — depends on the CMS choice in `docs/research.md`. | H | L |

## 7. Keep or migrate?

**Honest read.** The site is fast, well-structured for SEO, and accessible to a high level already. A migration is **not** needed to hit the Lighthouse bar; the P0/P1 list above gets there on the current stack.

What the current stack can't fix cheaply is the **cost of change**:

- ~70 one-off scripts mutate committed HTML.
- There are 65 stylesheets and no shared components or types.
- Articles are hand-built HTML files.
- Data refreshes are tangled with deploys.
- Hosting can't set cache or security headers.
- Video is filling the repo.

Each new feature adds another script, CSS file and workflow, and publishing from a phone isn't realistic.

**Recommendation: incremental migration — not a big-bang rewrite.** Do the P0/P1 fixes first on the current stack (days, not weeks). Then, with your approval:

1. **Astro** as the framework. The existing site drops into `public/` and is served unchanged on day 1.
2. **Cloudflare Workers static assets** as the host, which the site already sits behind. This gives header control, long caching and preview URLs.
3. Port one template at a time behind tests: article → review → hubs → homepage → trackers.

Each step ships independently and old URLs keep working (`.html` paths preserved or 301'd).

**Trade-offs of migrating:**

- **For:**
  - one design system;
  - articles become Markdown/MDX, publishable from a phone;
  - typed content schemas;
  - build-time OG images;
  - header control;
  - data refresh decoupled from deploys;
  - far less custom glue.
- **Against:**
  - weeks of careful porting;
  - risk of regressions in bespoke trackers (globes, maps, games);
  - a new toolchain (Node/npm, TypeScript) to maintain;
  - tests must be re-pointed;
  - Astro is now owned by Cloudflare (still MIT, but a vendor tie).

**Do not migrate without your approval** — this section is a recommendation only. Tool comparisons are in `docs/research.md`.
