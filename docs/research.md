# Supercharged Daily — Phase 1 tool research

Researched 26 Oct 2026. Seven research passes ran in parallel, one per tool category; their full write-ups are in sections 1–7 below. Every version, release date, licence and download count was pulled live from the npm registry or official pages on that day. GitHub stars and open-issue counts come from github.com pages or GitHub search, and **issue counts there usually include open PRs**. Anything that couldn't be confirmed is marked "unverified". Read this together with [`audit.md`](./audit.md).

> **Correction applied across this document.** Some passes describe the apex domain as "DNS-only to GitHub Pages", repeating a stale comment in `workers/wrangler.toml`. Live checks show it is **already proxied by Cloudflare**: Cloudflare IPs, `server: cloudflare`, `cf-ray`, and `cf-cache-status: DYNAMIC` on HTML. Worker routes and cache rules can therefore be used today, with no DNS change.

## Summary: picks per category

| Category | Pick | Runner-up | Rejected (main reason) |
|---|---|---|---|
| Framework | **Astro 7** (7.4.2, MIT). Static-first, content collections, islands. The legacy site goes into `public/` on day 1 | Eleventy 3 ("Build Awesome") | Next.js 16 (JS weight, 2025–26 security incidents); SvelteKit 3 (just went stable); Nuxt; Hugo |
| Hosting / CDN | **Cloudflare Workers + static assets** (already the CDN; free static requests; `_headers`/`_redirects`; preview URLs) | Stay on GitHub Pages behind Cloudflare | Vercel Hobby (no commercial use); Netlify (credit-metered deploys); Cloudflare Pages (Cloudflare steers new projects to Workers) |
| Images | Build-time sharp via `astro:assets` (`imageService: 'compile'`); video to **R2 / Stream** | Cloudflare Images for remote images | Runtime-billed transforms for local images |
| CMS | **Markdown/MDX content collections + Sveltia CMS** (static admin, phone UI, $0, content stays in git) | Keystatic (best typed schema; needs a server route); Pages CMS | TinaCMS (drafts paywalled, cloud dependency); Sanity/Contentful (content leaves repo, paid features) |
| Search | **Pagefind** (`astro-pagefind`; measured ~170–200 KB lazy on first search at 5k pages) | Supabase Postgres FTS as a typo-tolerant fallback | Fuse/MiniSearch/Orama (whole-index download); Algolia (quota); hosted Typesense/Meilisearch (cost) |
| CSS | **Tailwind CSS v4** (`@theme` tokens as CSS variables) + hand-written article prose layer | Vanilla CSS + cascade layers | Open Props (v2 stalled); Panda; UnoCSS |
| Components | **Own ~12 Astro components** on native `<dialog>`, Popover API, `<details>`; borrow from Starwind UI / Basecoat | Ark UI if an island framework is ever added | shadcn/ui (needs React); daisyUI (a11y left to us; generic look) |
| Icons | **Lucide** via `astro-icon` (build-time SVG, no JS) | Tabler | Phosphor (stale) |
| Type | **Inter variable** (text + display) + **Geist Mono** for data; Astro Fonts API with metric-matched fallbacks | Mona Sans (wide) for hero headlines only | Satoshi/General Sans (licence forbids public self-hosting); D-DIN (reads as copying SpaceX) |
| Motion | **Native CSS**: cross-document View Transitions, scroll-driven animations, `@starting-style`, all behind `prefers-reduced-motion`. **Motion** mini (3.2 KB) only if needed | — | GSAP (non-OSS licence, 27 KB); Lenis (hurts phone readers/a11y) |
| Tracker data | **Cloudflare Worker Cron → R2 (`latest.json` + daily snapshots + `status.json`) → edge-cached `/data/*.json`**. Last good snapshot baked in at build. D1 for time series | Keep GitHub Actions for low-frequency editorial data | Committing JSON to `main` every 30 min; r/SpaceX API (archived Jun 2026) |
| Database / auth | **Keep Supabase** for Google sign-in, comments, moderation (the site already uses an `sb_publishable_` key) | Supabase Pro ($25) if comments become core | Supabase for trackers (free-tier pausing, egress caps) |
| Newsletter | **Keep Beehiiv**. Replace the redirect-to-Beehiiv sign-up with a native form → Worker → Beehiiv API (double opt-in). Build archive pages on our domain from the posts API | Kit (if Beehiiv revenue stays low); Ghost (if memberships become core) | Substack (10% fee, no API) |
| Analytics | **Plausible Cloud** proxied first-party through a Worker (1.3 KB, cookie-less) + keep Cloudflare Web Analytics | Umami Cloud | PostHog (106 KB); Fathom (no proxy); Vercel Analytics (Vercel-only) |
| Monetisation | 1) direct newsletter + site sponsors, 2) affiliates (already good on `/gear.html`), 3) Beehiiv Ad Network/Boosts, 4) Tesla referral, 5) Stripe + Supabase membership later | Ko-fi link | Display ads (last; strict CLS guardrails if ever) |
| Testing & quality | **Playwright Test** (6 projects: 390/768/1440 × light/dark) with `toHaveScreenshot` + `@axe-core/playwright` (`wcag22aa` tag on); **Lighthouse 13** direct (not LHCI); lychee; html-validate; ESLint 10 + eslint-plugin-astro + Prettier; `astro check`; gitleaks; **lefthook** | Argos (free visual-review UI); Unlighthouse nightly | Lost Pixel (archived); BackstopJS (stale); `@lhci/cli` (stuck on Lighthouse 12) |
| Claude Code | Docs MCPs (Astro, Cloudflare, Context7) + Chrome DevTools MCP in `.mcp.json`. Supabase (read-only, project-scoped) and Cloudflare as claude.ai connectors. Skills vendored into `.claude/skills/` (plugins don't load in cloud sessions) | Playwright MCP (the Playwright CLI + skill is now preferred for agents) | GitHub MCP (built into cloud sessions); Vercel/Netlify MCPs |

## Recommended stack

One stack, each choice tied to this site's constraints: one person, phone-first readers and publishing, green Core Web Vitals, live trackers.

1. **Astro 7 + TypeScript (strict)**
   - It ships zero JS by default, which keeps the mobile CWV bar easy.
   - Content collections give typed Markdown articles and reviews.
   - The incremental `public/` passthrough means nothing breaks on day 1.
   - It has first-party RSS, sitemap, image and font tooling.
2. **Cloudflare Workers static assets**
   - The site is already on Cloudflare, so there's no DNS move.
   - Real cache headers: immutable hashed assets, edge-cached HTML.
   - Preview URLs for every PR.
   - Same platform as the existing Workers/KV and the new tracker cron.
   - Deploy from GitHub Actions with `wrangler-action`. The GitHub Pages `CNAME` stays as a rollback.
3. **Trackers: Worker Cron → R2 → `/data/*.json`**
   - Data refresh is decoupled from deploys and git.
   - Pages show the build-time snapshot instantly, refresh from the edge, and show "updated X ago" or "source delayed" instead of blanks.
4. **Content: Markdown/MDX in git, edited with Sveltia CMS on a phone**
   - $0 and no lock-in; structured review fields.
   - `astro-embed` renders X posts as static cards. This fixes the article Best Practices score of 58 in the audit.
   - Test the phone UX before committing. Fallback: the GitHub mobile app editing Markdown directly.
5. **Tailwind v4 tokens + own Astro components + Lucide + Inter / Geist Mono**
   - One design system, documented in `docs/design-system.md`.
   - Dark is the default per the brand, with system preference respected and a toggle that persists.
6. **Pagefind** for search: static, lazy-loaded, with topic filters.
7. **Supabase stays** for members and comments. **Beehiiv stays** for the newsletter, with a native sign-up form and an on-site archive.
8. **Plausible**, proxied first-party, for analytics with custom events: sign-ups, referral clicks, affiliate clicks.
9. **Quality gate**
   - Playwright + axe + visual snapshots.
   - Lighthouse 13 budgets.
   - lychee, html-validate, ESLint 10, Prettier, `astro check`, gitleaks.
   - Run locally via lefthook and in 3 consolidated workflows (PR / nightly / weekly).

### Setup commands (run only after migration is approved)

```bash
# 1. Project (in a new branch; legacy site served from public/ on day 1)
npm create astro@latest . -- --template minimal --typescript strict --no-git
npx astro add cloudflare mdx sitemap
npm i @astrojs/rss astro-og-canvas astro-embed astro-icon @iconify-json/lucide
npm i -D tailwindcss @tailwindcss/vite pagefind astro-pagefind wrangler @astrojs/check typescript
#   astro.config.mjs → adapter: cloudflare({ imageService: 'compile' }), output: 'static'
#   package.json      → "build": "astro build && pagefind --site dist"

# 2. Quality toolchain
npm i -D @playwright/test @axe-core/playwright lighthouse html-validate \
        eslint typescript-eslint eslint-plugin-astro eslint-plugin-jsx-a11y-x \
        prettier prettier-plugin-astro lefthook
npx playwright install --with-deps chromium   # CI only; the cloud image already ships Chromium
npx lefthook install

# 3. Hosting
npx wrangler login
npx wrangler deploy                     # production (after wrangler.jsonc + public/_headers)
npx wrangler versions upload --preview-alias pr-<n>

# 4. Tracker worker (separate Worker, Workers Paid $5/mo when crons outgrow free limits)
npx wrangler r2 bucket create sd-trackers

# 5. Claude Code (vendored so cloud/phone sessions get them)
DISABLE_TELEMETRY=1 npx skills add cloudflare/skills --skill wrangler --skill web-perf -a claude-code
DISABLE_TELEMETRY=1 npx skills add supabase/agent-skills -a claude-code
DISABLE_TELEMETRY=1 npx skills add vercel-labs/agent-skills --skill web-design-guidelines -a claude-code
```

Dashboard-only steps (owner):

- Cloudflare: attach the custom domain to the Worker; turn off Bot Fight Mode / JS detections on public pages.
- Beehiiv: confirm the plan before the 1 Nov 2026 renewal re-pricing.
- Plausible: create the site.
- Supabase: confirm no code path still uses the legacy `anon` key.
- claude.ai: add the Supabase (read-only) and Cloudflare connectors.

### Open questions for the owner

- **Monthly budget for tools.** Likely: Workers Paid $5, Plausible about $19, and possibly a Beehiiv plan change.
- **Is the dark-first brand fixed?** The recommendation is a system-preference default, with dark styling as the hero look.
- **Which tracker data sources may we call server-side?** Launch Library 2 is limited to 15 requests per hour unauthenticated. Teslascope terms need checking.
- **Sveltia vs plain GitHub-app Markdown for phone publishing.** Decide after a 10-minute test on your phone.

---


## 1. Framework and hosting research for superchargeddaily.com

Researched 2026-10-26. npm data was pulled live from `registry.npmjs.org` and `api.npmjs.org` (downloads for the week of 2026-10-16 to 10-22). GitHub numbers are what the github.com repo pages showed that day. "k" values are as GitHub rounds them. Discord counts come from the public invite API (`discord.com/api/v10/invites/<code>?with_counts=true`).

### 0. Live observation that changes the picture

The brief says the apex is "DNS-only, no Cloudflare proxy". **Today's live checks say it is proxied.**
- `superchargeddaily.com` resolves to Cloudflare anycast IPs `104.21.26.84` and `172.67.135.184`. The NS records are `jimmy`/`galilea.ns.cloudflare.com`.
- The response headers include `server: cloudflare`, `cf-ray`, `cf-cache-status: DYNAMIC`, then GitHub/Fastly `x-github-request-id` and `cache-control: max-age=600`.
- So Cloudflare already sits in front of GitHub Pages, but it **does not cache the HTML** (DYNAMIC). This means a Cloudflare move needs no DNS change, and Cache Rules could be used as a stop-gap today.

The repo itself: a public GitHub repo, a 377 MB working tree, 159 `.html` files (6 are over 250 KB), 83 files in `dispatch/`, and 43 workflow files.

---

### 1. Framework and rendering

#### 1a. Project health (verified 2026-10-26)

| Candidate | Latest (npm) | Released | npm dl/week | GitHub stars | Open issues / PRs | Discord | Licence |
|---|---|---|---|---|---|---|---|
| **Astro** | 7.4.2 | 2026-10-21 | 5,139,637 | 63.5k | 17 / 103 ¹ | 35,660 (Astro Lounge) | MIT |
| **Next.js** | 16.4.3 | 2026-10-23 | 44,586,009 | 143.3k | ~1.1k / ~2.6k | 110,769 | MIT |
| **Eleventy → "Build Awesome"** | `@11ty/eleventy` 3.1.7 (canary 4.0.0-alpha.10) | 2026-10-15 | 144,089 (+819 for `@awesome.me/buildawesome`) | 20.0k (repo now `11ty/buildawesome`) | 154 / 14 | 3,214 | MIT |
| **SvelteKit** | `@sveltejs/kit` 3.1.0 | 2026-10-14 | 2,198,560 | 20.9k | 770 / 145 | 64,415 (Svelte) | MIT |
| **Nuxt** | 4.6.2 | 2026-10-16 | 1,513,244 | 61.0k | 305 / 171 | 30,400 | MIT |
| **Hugo** | v0.168.0 (GitHub release) | 2026-10-13 | n/a (Go binary; `hugo-extended` npm wrapper 0.168.0) | 90.2k | 189 / 24 | Discourse forum, size unverified | Apache-2.0 |
| **Keep hand-written HTML + light build** | — | — | — | — | — | — | — |

¹ The repo page showed 17 open issues for Astro. That is unusually low, so treat the number as "as displayed" (it likely reflects aggressive triage).

Sources: [npm astro](https://www.npmjs.com/package/astro), [github.com/withastro/astro](https://github.com/withastro/astro), [github.com/vercel/next.js](https://github.com/vercel/next.js), [github.com/11ty/eleventy](https://github.com/11ty/eleventy) (redirects to buildawesome), [github.com/sveltejs/kit](https://github.com/sveltejs/kit), [github.com/nuxt/nuxt](https://github.com/nuxt/nuxt), [github.com/gohugoio/hugo/releases](https://github.com/gohugoio/hugo/releases).

#### 1b. Fit for this site

| | Astro 7 | Next.js 16 | Eleventy 3 / BA 4 | SvelteKit 3 | Nuxt 4 | Hugo | Keep HTML + build |
|---|---|---|---|---|---|---|---|
| Ships 0 KB JS by default | Yes | No (React runtime) | Yes | No (hydrates) | No (Vue runtime) | Yes | Yes |
| Typed content collections | Yes (build-time + **live** collections, stable in v6) | DIY / CMS | Data cascade, untyped | DIY (mdsvex) | Nuxt Content module | Sections/front matter | No |
| MDX | `@astrojs/mdx` 8.1.1 | Yes | Plugin | mdsvex | MDC | No (shortcodes) | No |
| Islands / partial hydration | Yes (`client:*`) | RSC (different model) | `<is-land>` web component | No | Nuxt islands (exp.) | No | Manual |
| Server islands / on-demand per route | `server:defer`, per-route `prerender=false` | ISR/PPR/Cache Components | No (needs separate functions) | Per-route SSR | Hybrid `routeRules` | No | No |
| Incremental builds | No true incremental; content-layer caching; route cache (v7) for SSR | ISR (needs server) | `--incremental` (mainly dev) | No | ISR via routeRules | Fast full builds | n/a |
| Build-time images | `astro:assets` + sharp | `next/image` is runtime (host-billed) | `@11ty/eleventy-img` 7.1.1 | enhanced-img | `@nuxt/image` | Built-in (Go) | Scripts |
| View transitions | Built-in `<ClientRouter/>` + native CSS VT | Experimental | Native CSS VT only | Native CSS VT | Native CSS VT | Native CSS VT | Native CSS VT |
| OG images | `astro-og-canvas` 0.13.2 or satori 0.63.2 | `@vercel/og` (MPL-2.0) | satori in a script | satori | `nuxt-og-image` | Built-in text-on-image filters | satori script |
| Keep old HTML as-is during migration | **Yes** (`public/` copied verbatim) | Yes (`public/`) | **Yes** (passthrough copy, or `.html` as templates) | Yes (`static/`) | Yes (`public/`) | Yes (`static/`) | Already true |
| Build at ~1,000+ articles | Astro's own benchmarks: 6,313 pages in 73.5 s, 8,431 pages in 262 s | Fine, but static export loses ISR | Fast | Fine | Fine | Fastest (sub-second to seconds) | Fastest |

#### 1c. Pros and cons per candidate

**Astro 7** (7.0 shipped 2026-06-22; 7.1 to 7.4 since)
- Pros:
  - A content-site-first design: Markdown/MDX collections with schema validation, zero-JS pages, and opt-in islands for the trackers.
  - `server:defer` server islands and per-route on-demand rendering, so a tracker can be live while the article shell stays static.
  - Astro 7 builds are 15–61% faster: a Rust compiler, Vite 8/Rolldown, and the new Sätteri Markdown processor.
  - Stable route caching with `cache.invalidate()` by tag/path. CSP, a Fonts API and live content collections have all been stable since v6.
  - First-class adapters for Cloudflare, Netlify, Vercel and Node.
  - Official `@astrojs/rss` 4.0.19, `@astrojs/sitemap` 3.7.4 (no Google News sitemap, so that needs a small custom endpoint), and Pagefind 1.5.2 for search.
- Cons:
  - The v7 compiler **no longer silently fixes invalid HTML**: unclosed tags now error. Hand-written pages ported into `.astro` must be valid.
  - JSX-style whitespace collapsing between inline elements is a v7 breaking change.
  - remark/rehype plugins now need `@astrojs/markdown-remark`.
  - Astro 6 requires Node 22+.
  - Two majors in 2026 (6.0 on 03-10, 7.0 on 06-22), so expect churn.
- Governance: **Cloudflare acquired The Astro Technology Company on 2026-01-16.** The project stays MIT, and the team says it remains host-agnostic ([BusinessWire](https://secure.businesswire.com/news/home/20260116386991/en/Cloudflare-Acquires-Astro-to-Accelerate-the-Future-of-High-Performance-Web-Development), [gigazine](https://gigazine.net/gsc_news/en/20260119-cloudflare-acquires-astro)). The risk is gradual Cloudflare-first tilt (for example, `@astrojs/cloudflare` now defaults `imageService` to the paid Cloudflare Images binding).
- Sources: [Astro 7 blog](https://astro.build/blog/astro-7/), [Astro 6 blog](https://astro.build/blog/astro-6/), [Cloudflare adapter docs](https://docs.astro.build/en/guides/integrations-guide/cloudflare/).

**Next.js 16**
- Pros:
  - The biggest ecosystem.
  - ISR, PPR and Cache Components.
  - A stable Adapter API since 16.2 (built with Netlify, Cloudflare and others) ([nextjs.org](https://nextjs.org/blog/nextjs-across-platforms)).
  - `@opennextjs/cloudflare` 1.20.13.
- Cons:
  - A React runtime on every page hurts mobile INP/TBT for a mostly-text site.
  - Best features assume a server (Vercel).
  - The heaviest security surface of the group (below).
- Incidents:
  - **React2Shell, CVE-2025-55182 / CVE-2025-66478**: unauthenticated RCE in RSC, disclosed 2025-12-03 and exploited in the wild from 12-04 ([Wiz](https://www.wiz.io/fr-fr/blog/critical-vulnerability-in-react-cve-2025-55182), [Invicti](https://invicti.com/blog/web-security/react2shell-critical-rce-in-react-rsc-next-js-cve-2025-55182-cve-2025-66478)).
  - 2026 RSC DoS bugs, CVE-2026-23869 and -23870 (7.5).
  - May 2026 cache-poisoning bugs, CVE-2026-44576 and -44582, fixed in 15.5.16 / 16.2.5 ([NVD](https://nvd.nist.gov/vuln/detail/CVE-2026-44576)).
- Licence: MIT, unchanged.

**Eleventy, now "Build Awesome"**
- Pros:
  - The closest mental model to the current site: HTML in, HTML out.
  - Can treat existing `.html` files as templates.
  - Tiny output and very fast builds.
- Cons and status:
  - It became Font Awesome-backed (2024) and was **renamed "Build Awesome" in March 2026**. The repo moved to `11ty/buildawesome`, and the new npm package is `@awesome.me/buildawesome` (latest 0.0.3, alpha 4.0.0-alpha.10).
  - v4 is still pre-release.
  - The first Kickstarter was paused after community backlash. A second "Build Awesome Pro" campaign reports 838 backers ([11ty blog](https://www.11ty.dev/blog/), [disassociated.com](https://disassociated.com/font-awesome-cans-eleventy-renaming/)).
  - Small community (3.2k Discord).
  - No built-in islands or server rendering, so the trackers stay hand-rolled.

**SvelteKit 3**
- Pros: excellent DX and small hydrated bundles.
- Cons:
  - 3.0 went GA around 2026-10-01 with breaking config moves (config into `vite.config.ts`, TS 6, Node 22), and remote functions are not finished ([InfoQ](https://infoq.com/news/2026/09/sveltekit-3-vite)).
  - An app framework, not a content one.
  - Too fresh to bet on.

**Nuxt 4**
- Pros: a mature hybrid `routeRules`, Nuxt Content, and nuxt-og-image.
- Cons:
  - Vue runtime on every page.
  - **NuxtLabs was acquired by Vercel in July 2025.** Nuxt stays MIT with open governance ([RedMonk](https://redmonk.com/blog/2025/07/10/rmc-daniel-roe-vercels-nuxtlabs-acquisition/)).
  - No advantage over Astro for a content site.

**Hugo**
- Pros: the fastest builds by far, a single binary, and built-in image processing.
- Cons:
  - Go templates are a poor fit for the existing JS/Node data scripts and the many per-page JS tracker apps.
  - No islands and no on-demand rendering.

**Keep hand-written static HTML + a light build step**
- Pros: zero migration and no new dependency.
- Cons:
  - It does not fix the root problems: duplicated chrome across 159 pages, 300–500 KB pre-rendered pages, no content schema, and DIY OG/RSS/sitemaps.
  - Phone publishing stays "edit raw HTML".

#### 1d. Recommendation: Astro 7, static-first, with an adapter only where it is needed

Why Astro fits this site specifically:
1. **Incremental migration with no big bang.** Copy the whole current site into `public/` on day 1, and Astro serves it byte-for-byte. Then move pages one by one into `src/pages`, removing each from `public/` as it moves.
2. **Phone publishing.** Dispatch articles become a `src/content/dispatch/*.md(x)` collection with a zod schema. A new article is one Markdown file, which can be committed from the GitHub mobile app or a git-based CMS.
3. **Trackers.** Keep them as static shells. Either hydrate them with `client:visible` islands that read the JSON snapshots, or use `server:defer` / `prerender = false` for routes that should render fresh data at the edge. This removes the 300–500 KB inline-data pages.
4. **CWV.** Zero JS by default, `astro:assets` for responsive AVIF/WebP at build time, and the Fonts API for self-hosted fonts with fallbacks.
5. **Feeds and SEO.**
   - `@astrojs/rss` for RSS.
   - `@astrojs/sitemap` for the main sitemap.
   - A ~30-line `src/pages/sitemap-news.xml.ts` endpoint that filters to articles from the last 48 h, because Google News sitemaps are not covered by the integration.
   - `astro-og-canvas` or satori to generate one OG PNG per article at build time.
   - Pagefind to index `dist/` after the build.
6. The scale (~1,000 articles) is far below Astro's own benchmark sites (6–8k pages in 1–4 minutes).

Caveats:
- Pin the major version.
- Valid HTML is required when porting pages into `.astro`; run each old page through `html-validate` first.
- Set `imageService: 'compile'` so images are optimised at build time with sharp rather than billed through Cloudflare Images.

Runner-up: Eleventy 3.x, if the owner wants to stay closer to raw HTML. Avoid starting on the BA 4 alpha.

Setup:
```bash
npm create astro@latest sd-astro -- --template minimal --typescript strict
cd sd-astro
npx astro add cloudflare mdx sitemap     # adapter only matters once a route opts out of prerender
npm i @astrojs/rss astro-og-canvas
npm i -D pagefind wrangler
# day-1 migration: serve the legacy site verbatim
rsync -a --exclude .git --exclude .github ../zzbz6jgyzy-creator.github.io/ public/
```
`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
export default defineConfig({
  site: 'https://superchargeddaily.com',
  output: 'static',                       // pages prerender unless they export prerender = false
  adapter: cloudflare({ imageService: 'compile' }),   // sharp at build time, no per-transform fees
  integrations: [mdx(), sitemap()],
});
```
`package.json` build script: `"build": "astro build && pagefind --site dist"`.

---

### 2. Hosting, CDN and images

#### 2a. Tooling health

| Platform CLI | Latest | Released | npm dl/week | GitHub stars | Open issues / PRs | Licence |
|---|---|---|---|---|---|---|
| Cloudflare `wrangler` (cloudflare/workers-sdk) | 4.153.0 | 2026-10-26 | 19,127,316 | 4.7k | 381 / 212 | MIT OR Apache-2.0 |
| `vercel` CLI (vercel/vercel) | 65.2.0 | 2026-10-22 | 2,807,596 | 16.4k | 383 / 496 | Apache-2.0 |
| `netlify-cli` (netlify/cli) | 27.14.2 | 2026-10-22 | 244,561 | 1.9k | 78 / 69 | MIT |
| GitHub Pages | service (no CLI) | — | — | — | — | proprietary |

#### 2b. Free-tier comparison (from official docs, 2026-10-26)

| | **Cloudflare Workers + static assets** | Cloudflare Pages | Vercel Hobby | Netlify Free | GitHub Pages |
|---|---|---|---|---|---|
| Cloudflare's stance | **"Start new projects with Workers"**; Workers is "Cloudflare's primary platform" ([Pages docs](https://developers.cloudflare.com/pages/)) | Still supported, no new focus | — | — | — |
| Static bandwidth / requests | **Static asset requests "free and unlimited"** | Unlimited | 100 GB Fast Data Transfer, 1M CDN requests | Credits: 20 credits/GB, 2 credits/10k requests | 100 GB/mo soft |
| Dynamic compute | 100k Worker requests/day, 10 ms CPU | Pages Functions (Workers limits) | 1M invocations, 4 CPU-h | 10 credits/GB-h | None |
| Build allowance | Workers Builds: 3,000 min/mo, 1 concurrent, 20 min timeout | 500 builds/mo, 20 min | 100 deployments/day | **15 credits per production deploy** (out of 300 a month, so about 20 deploys) | 10 builds/h soft (not for custom Actions deploys), 10 min timeout |
| Files / size | 20,000 files/version, 25 MiB/file | 20,000 files, 25 MiB | — | — | 1 GB site |
| Cron | 5 Cron Triggers/account (250 on $5 paid) | None | 100 per project but **once per day**, ±59 min | Scheduled functions (use credits) | Via Actions only |
| Custom headers | `_headers` file | `_headers` (100 rules) | `vercel.json` | `_headers` / toml | **No** (fixed `max-age=600`, confirmed live) |
| Redirects | `_redirects` | 2,000 static + 100 dynamic | `vercel.json` | `_redirects` | No (meta-refresh only) |
| Preview deploys | Yes (needs `preview_urls` config + Workers Builds) | Automatic per branch | Automatic | Automatic | No |
| Commercial use on free tier | Allowed | Allowed | **Not allowed** ("personal, non-commercial") | Not addressed on pricing page | Not for "online business / e-commerce" |
| Paid step | $5/mo Workers Paid | same | Pro $20/mo (1 TB, 10M requests, $20 credit) | Personal $9 (1,000 credits) / Pro $20 (3,000) | — |

Sources:
- Cloudflare: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [static asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [Workers Builds limits](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Pages → Workers migration](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/).
- Vercel: [Hobby](https://vercel.com/docs/plans/hobby), [pricing](https://vercel.com/pricing), [cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
- Netlify: [pricing](https://www.netlify.com/pricing/).
- GitHub: [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

#### 2c. Image optimisation

| Option | Free | Overage | Notes |
|---|---|---|---|
| **Astro `astro:assets` + sharp at build time** (sharp 0.35.5, Apache-2.0, 76M dl/wk) | Unlimited (build CPU only) | — | Best for the site's own photos and OG images; output is plain static files |
| Cloudflare Images (transformations) | 5,000 unique transformations/mo | $0.50 per 1,000 unique; delivery $1/100k for stored images | When over the free limit, new variants return error 9422 and cached ones keep working. Note that the Astro Cloudflare adapter **defaults** to the `cloudflare-binding` image service ([pricing](https://developers.cloudflare.com/images/pricing/)) |
| Vercel Image Optimization | 5k transformations, 300k cache reads, 100k cache writes | $0.05–0.0812/1k transforms, $4–6.40/1M writes | Over the Hobby limit, new images return 402 ([docs](https://vercel.com/docs/image-optimization/limits-and-pricing)) |
| Netlify Image CDN | Billed through credits (exact credit rate unverified) | — | — |
| GitHub Pages | None | — | Pre-optimise in the build |

#### 2d. Pros, cons and incidents

**Cloudflare Workers + static assets**
- Pros:
  - The zone is already on Cloudflare and proxied, so no DNS work is needed.
  - Workers + KV (leaderboard, analytics sink) already live there, so it can be one platform.
  - Unlimited free static traffic, plus full `_headers`/`_redirects` control: immutable caching for hashed assets and short TTLs for JSON.
  - Cron Triggers can replace some GitHub Actions refreshers, writing to KV/R2.
  - The Astro team is now in-house at Cloudflare, so the adapter is first-class.
- Cons:
  - Wrangler config is steeper than Pages' git-click setup.
  - Free tier is limited to 5 crons.
  - Free tier has 10 ms CPU per request, which matters for SSR routes.
  - Workers Builds' 3,000 min/mo would be eaten by 48 rebuilds a day. **So build in GitHub Actions (free for this public repo) and `wrangler deploy`, or better, stop rebuilding for data.**
  - Lock-in is low for static assets and moderate once KV/D1/R2 bindings are used.
- Incidents: the global outage on 2025-11-18, a BYOIP prefix withdrawal on 2026-02-20 (~6 h), a dashboard/API outage on 2026-03-11, and a Pages upload problem in late May 2026 lasting ~29 h ([sesamedisk](https://sesamedisk.com/cloudflare-outage-february-2026-2/), [isdown](https://isdown.app/status/cloudflare/outage-history?page=3)).

**Vercel**
- Pros: the best Next.js DX, automatic previews, and image optimisation.
- Cons:
  - **Hobby forbids commercial use.** A news site with a newsletter, a gear shop and ads needs Pro at $20/mo.
  - Hobby cron is daily only.
  - Runtime image transforms are metered.
- Incidents: the **April 2026 security incident**. A compromised third-party AI tool's Google Workspace OAuth app gave access to internal systems, and non-"sensitive" env vars of a subset of customers may have been exposed ([Vercel bulletin](https://vercel.com/kb/bulletin/vercel-april-2026-security-incident), [BleepingComputer](https://bleepingcomputer.com/news/security/vercel-confirms-breach-as-hackers-claim-to-be-selling-stolen-data)).

**Netlify**
- Pros: a simple git-based workflow, `_headers`/`_redirects`, and an official Astro partner.
- Cons:
  - Credit pricing makes frequent publishing expensive: 15 credits per production deploy against 300 a month is about 20 deploys/month free.
  - Jul–Sep 2026 forum threads report free-plan production deploys "paused" despite credits remaining, and one whole site taken offline ([answers.netlify.com](https://answers.netlify.com/t/free-plan-production-deploys-paused-despite-29-4-30-credits-remaining/166927)).

**Stay on GitHub Pages**
- Pros: free and zero change.
- Cons:
  - No custom headers or redirects (confirmed live: `cache-control: max-age=600` on HTML, with no way to set immutable caching for assets).
  - No previews and no server code.
  - A 1 GB site cap (the working tree is 377 MB and growing with the JSON snapshots).
  - A 10-min deploy timeout.
  - The ToS discourages "online business" use.
  - Single point of failure with Actions: outages on 2026-08-06 (~10 h, Actions + Pages) and 2026-10-05 (3 h 42 m) took out both data refresh and deploys ([GitHub availability report](https://github.blog/news-insights/company-news/github-availability-report-july-2026/), [incidenthub](https://blog.incidenthub.cloud/github-actions-pages-outage-aug-6-2026)).
- Stop-gap: because Cloudflare already proxies the site, Cache Rules and Response Header Transform Rules can set cache headers today without moving.

#### 2e. Recommendation: Cloudflare Workers with static assets (free plan, $5 Paid when crons or CPU need it)

Reasoning specific to this site:
1. **It is already the CDN.** DNS, proxy, Workers and KV are all on Cloudflare, so moving the origin removes GitHub Pages and Fastly from the request path and enables real edge caching of HTML.
2. **Frequent publishing costs nothing.** Static requests are unlimited and free, and deploys from GitHub Actions are unlimited for a public repo.
3. **Decouple data from deploys.**
   - Move the 30-minute news, launch and Starlink refreshers from "commit JSON to main, then rebuild" to a Worker Cron (or keep Actions) that writes JSON to KV/R2 behind `/data/*`.
   - Pages read it client-side or through `server:defer` islands.
   - Result: no git churn, no rebuilds every 30 minutes, and resilience to GitHub Actions outages.
   - Only article publishes trigger a build.
4. **Headers and redirects.** `_headers` gives `immutable` on `/_astro/*` and a short `s-maxage` on HTML/JSON. `_redirects` preserves old `*.html` URLs during migration.
5. **Images.** Use build-time sharp (`imageService: 'compile'`). Use Cloudflare Images only for remote images, within 5k free transforms a month.
6. Do not use Pages for a new project (Cloudflare's own docs say so). Vercel and Netlify each fail on a site-specific constraint: Vercel on commercial use and daily-only cron, Netlify on deploy credits.

Setup (after the Astro project above builds):
```bash
npx wrangler login
cat > wrangler.jsonc <<'EOF'
{
  "name": "superchargeddaily",
  "main": "@astrojs/cloudflare/entrypoints/server",
  "compatibility_date": "2026-10-01",
  "assets": { "directory": "./dist", "binding": "ASSETS" },
  "routes": [{ "pattern": "superchargeddaily.com", "custom_domain": true }],
  "preview_urls": true,
  "kv_namespaces": [{ "binding": "DATA", "id": "<existing-or-new-id>" }],
  "triggers": { "crons": ["*/30 * * * *"] }
}
EOF
cat > public/_headers <<'EOF'
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
/*
  Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=600
EOF
npm run build && npx wrangler deploy                      # production
npx wrangler versions upload --preview-alias pr-123       # preview URL
```
GitHub Actions deploy step: use `cloudflare/wrangler-action@v3` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets, running `deploy`. Cut-over: attach the custom domain to the Worker; the GitHub Pages `CNAME` stays as a rollback path. Verify the `custom_domain` route and preview-alias flags against the current Wrangler 4.153 docs before running them (not tested here).

---

### Unverified or not checked
- Hugo forum size, Netlify Image CDN credit rate, and the exact Vercel Hobby image-transform behaviour beyond the docs.
- Whether Cloudflare's 100k/day Worker request limit counts static-asset hits. The docs only say asset requests are "free and unlimited".
- Astro's open-issue count (17) as displayed.


## 2. CMS / content workflow and on-site search (superchargeddaily.com rebuild)

Researched 2026-10-26 with live sources. npm figures come from `registry.npmjs.org` and `api.npmjs.org` (downloads for the week of 16–22 Oct 2026). GitHub stars and open issues come from the GitHub search API through the GitHub MCP, read 2026-10-26. **Note:** GitHub's `open_issues_count` **counts open PRs as well as issues**. Where a repo page split the two, both are given. "unverified" means I could not confirm the figure from a primary source.

**Site context that shapes the choices** (read from the repo, nothing modified):
- 81 Dispatch entries in `data/articles.json`, each with fields `url, title, date, topic (tesla|spacex|xai|x), tag, image, imageAlt, summary, author, minutes, pinned`.
- About 5.6 KB of visible text per article on average.
- Reviews live as hand-written pages in `/reviews/` (cybertruck, model-3/S/X/Y).
- The site already uses Cloudflare Workers (`workers/wrangler.toml`) and Cloudflare Insights, has 40+ GitHub Actions workflows and a `search.html` page, and Supabase holds auth and comments.
- Astro is at **7.4.2** (21 Oct 2026). Every Astro integration below declares `astro` 7 in its peerDependencies.

---

### 1. CMS / content

#### 1a. Health and adoption

| Candidate | Type | GitHub stars | Open issues (+PRs) | Latest release | npm dl/wk | Licence |
|---|---|---|---|---|---|---|
| **Sveltia CMS** `@sveltia/cms` | Git-based, static SPA | 2,997 | 27 (API) | 0.252.0, 2026-10-24 (0.x; 1.0 "late 2026") | 19,584 | MIT |
| **Decap CMS** `decap-cms-app` | Git-based, static SPA | 19,448 | 402 (API) | 3.17.3, 2026-10-26 | 8,877 (+5,537 `decap-cms`) | MIT |
| **Keystatic** `@keystatic/core` / `@keystatic/astro` | Git-based, needs server routes | 2,478 | 169 issues + 33 PRs | core 0.6.9 (2026-08-26); astro 6.0.0 (2026-08-18) | 112,383 / 26,785 | MIT |
| **TinaCMS** `tinacms` | Git-backed + TinaCloud GraphQL | 13,848 | 509 (API) | 3.15.0, 2026-10-19; `@tinacms/astro` 0.8.0 | 31,866 (`@tinacms/astro` 3,240) | Apache-2.0 |
| **Pages CMS** (hunvreus/pagescms) | Git-based, hosted app (Next.js) | 4,145 | 55 issues + 33 PRs | 2.1.8, 2026-06-08 (commit tag; no GitHub Releases) | n/a (not on npm) | MIT |
| **Sanity** `sanity` / `@sanity/astro` | Hosted headless (Content Lake) | 6,376 (monorepo) | 308 (API) | 6.20.0 (2026-10-19); astro 3.6.0 (2026-10-23) | 667,519 / 47,982 | MIT (Studio); SaaS backend |
| **Payload** `payload` | Self-hosted headless (Next.js + DB) | 45,513 | 1,404 (API) | 3.92.0, 2026-10-22 | 687,054 | MIT |
| **Directus** `@directus/sdk` | Self-hosted headless (DB-first) | 38,637 | 349 (API) | SDK 27.0.0, 2026-10-07 | 91,643 | BSL 1.1 (free under $5M revenue) |
| **Storyblok** `@storyblok/astro` | Hosted headless | 69 (storyblok/monoblok; old storyblok-astro repo archived) | 74 (API) | 10.4.0, 2026-10-26 | 8,918 | MIT (SDK); SaaS |
| **Contentful** `contentful` | Hosted headless | 1,296 (contentful.js) | 28 (API) | 11.12.10, 2026-09-09 | 677,867 | MIT (SDK); SaaS |
| **Supabase as CMS** `@supabase/supabase-js` | Postgres + Studio table editor | 113,982 (supabase/supabase) | 1,174 (API) | 2.118.0, 2026-10-15 | 21.5M | Apache-2.0 |
| **Plain MD/MDX + GitHub Mobile / Working Copy** | Phone Git client | n/a | n/a | n/a | n/a | GitHub Mobile free; Working Copy Pro US$35.99 IAP (apppricinglab, Mar 2026) |

Sources:
- Repos: github.com/sveltia/sveltia-cms, /decaporg/decap-cms, /Thinkmill/keystatic, /tinacms/tinacms, /hunvreus/pagescms, /sanity-io/sanity, /payloadcms/payload, /directus/directus, /storyblok/monoblok, /contentful/contentful.js, /supabase/supabase.
- npm pages: npmjs.com/package/<name>.

#### 1b. Fit for a one-person, phone-first news site

| | Phone admin UX | Images | Structured review fields | Preview | Scheduling | Drafts | Cost (1 user) | Lock-in | Astro fit |
|---|---|---|---|---|---|---|---|---|---|
| **Sveltia** | "Mobile support" listed as a feature (sveltiacms.app). The 2025 README said "not yet optimized for small screens", newer copy claims mobile and tablet UI. **Test on your phone.** | Uploads to repo. Built-in **WebP conversion and resize** (`media_libraries.default.config.transformations`). Also Cloudinary, Uploadcare and stock-photo pickers. | Yes: object, list, number, select, relation, plus a Decap-compatible widget set | Live preview pane | No native scheduling | Editorial Workflow (branch/PR) documented as working | $0 | Very low: files stay MD/JSON in your repo, Decap-compatible config | No integration needed. `public/admin/index.html` plus `config.yml` pointing at the content collection folders. |
| **Decap** | Poor historically. Long-standing mobile request; markdown widget broken on mobile (Netlify forum). New Plate rich-text widget (Apr 2026) is untested on phones. | Repo or external media library | Yes (same widget model) | Yes | No | Editorial workflow (GitHub) | $0 (Decap Turbo is paid SaaS, GA 3.17.0, Oct 2026) | Low | Same static admin as Sveltia |
| **Keystatic** | Fixed "Mobile doesn't scale" (#1044, Apr 2024) and a mobile keyboard bug (#1458, closed Jun 2026). Branch-picker UX bugs still open. | Repo image field, or Cloud Images (Pro, $10/mo) | Best typed schema: `fields.object`, `array`, `conditional`, `relationship`. Markdoc/MDX components. | Via branches; no live preview | No | Branch-based | $0 (Cloud free ≤3 users) | Low (files in repo) | First-party `@keystatic/astro`, **but GitHub mode needs Node API routes**. GitHub Pages cannot run them, so `/keystatic` must be hosted on Vercel, Netlify or Cloudflare with an adapter. |
| **TinaCMS** | Admin at `/admin`. Sidebar visual editor is desktop-oriented; phone usability unverified. | TinaCloud media; 100 MB asset cap on every plan | Yes (GraphQL schema) | Visual editing in Astro, but every page needs `<TinaIsland>` wiring plus an SSR adapter | No | Editorial Workflow **paid only** (Team, $24/mo) | Free: 2 users | **Medium-high**: TinaCloud (or a self-hosted DB + auth backend) sits in the read path | `@tinacms/astro` 0.8.0, ~3k dl/wk, young |
| **Pages CMS** | "Full responsive design, optimized for mobile" (pagescms.org). The simplest UI here. | Drag-and-drop media manager to repo; S3/R2 "soon" | Fields: string, text, rich-text, image, file, date, number, boolean, select, object, block, reference, code, uuid | No live preview | "Soon" | None | $0 (hosted app.pagescms.org, or self-host) | Low (`.pages.yml` + files in repo); trusts a third-party GitHub App | Framework-agnostic; config file only |
| **Sanity** | Studio is responsive; phone editing works but is heavy. No official mobile docs found. | Excellent asset pipeline and CDN transforms | Excellent (arbitrary schemas) | Presentation tool | **Paid plans only** (Scheduled Drafts) | Yes, native | Free: 20 seats, 10k documents | High: content lives in Sanity's Content Lake | `@sanity/astro` official |
| **Payload** | Responsive admin | Upload collections, sharp | Excellent | Live preview | Yes (scheduled publish jobs) | Versions and drafts | Self-host: Node + DB host costs. Payload Cloud reportedly closed to new sign-ups after the Figma deal (Jun 2025); not verified from a Payload source. | Medium | Built for Next.js; Astro only as an API consumer |
| **Directus** | Responsive Data Studio | Good | Good | Limited | Via flows | Yes | Self-host or Cloud | Medium | REST/SDK only |
| **Storyblok / Contentful** | Visual editor (Storyblok), web app (Contentful) | Good | Good | Good | Paid | Yes | Contentful Free is "test and learn only, not commercial" (usage-limits page, Aug 2026). Storyblok free tier unverified. | High | Official SDKs |
| **Supabase as CMS** | Supabase Studio table editor; awkward for long text on a phone | Supabase Storage | You build it | You build it | pg_cron | You build it | Free tier (pauses after 1 week inactive) | Medium | Fetch at build time |
| **MD + GitHub Mobile / Working Copy** | GitHub Mobile edits text and Markdown and commits from Browse Code (GitHub blog 2022–23). No front-matter form, no image insert. Working Copy (iOS) is a full Git client. | Manual upload via github.com mobile web | Hand-typed YAML front matter, so validation errors happen | None (Astro build fails on bad schema) | Same cron trick | Branches | $0 | None | Native content collections |

#### 1c. Known problems and red flags
- **Sveltia**:
  - The bus factor is one: "a personal project maintained by a single developer" (sveltiacms.app/en/docs/intro).
  - Still 0.x, with roughly daily releases (0.250.0 to 0.252.0 between 21 and 24 Oct). Pin the version.
  - PKCE is unimplemented because it waits on GitHub. Sign in with either a fine-grained PAT stored in browser localStorage, which is fine for one user, or the Cloudflare Worker authenticator.
- **Decap**:
  - Active again: 3.16.3 to 3.17.3 shipped in September–October 2026, including a security fix in 3.17.2 ("never evaluate JS front matter").
  - Development energy now goes toward the paid "Decap Turbo" backend.
  - The mobile UX has been a weak point for years.
- **Keystatic**:
  - Almost all recent commits come from one Thinkmill engineer (emmatown).
  - No GitHub Releases are published, only changesets. The README still says "Things are experimental at the moment."
  - Activity is healthy but thin.
  - The server-route requirement conflicts with plain GitHub Pages hosting.
- **TinaCMS**:
  - Active, with weekly releases.
  - The core value (GraphQL, search, editorial workflow) sits behind TinaCloud, which is a paid tier for drafts.
  - Self-hosting needs a database, an auth provider and a serverless host.
  - The Astro visual-editing wiring is per-page work.
- **Pages CMS**:
  - Maintained by one person (hunvreus).
  - Release cadence: 2.1.4 to 2.1.8 between April and June 2026, then quiet into October apart from repo updates.
  - The hosted app needs OAuth access to your repo through its GitHub App. You can self-host on Vercel instead.
- **Hosted headless options (Sanity, Contentful, Storyblok)**:
  - Content leaves the repo, which breaks the existing JSON-in-git tracker pattern.
  - Scheduling and drafts sit behind paid tiers.
  - Overkill for one author.
- **Scheduling**:
  - No Git CMS here does native scheduled publishing.
  - Standard fix: a `publishAt` field, an Astro filter `data.publishAt <= new Date()`, and a GitHub Actions `schedule` cron rebuild (for example every 15 min).
  - GitHub documents that cron can be delayed under load, so an exact minute is not guaranteed.

#### 1d. Recommendation: CMS
**Use Sveltia CMS over Astro content collections, with GitHub Mobile or Working Copy as the zero-UI fallback. Keep Decap as the drop-in escape hatch.**

Why:
1. **It runs on GitHub Pages.** It is a static `admin/index.html` with no server and no database. The content stays as Markdown or MDX plus JSON in the repo, so the trackers, workflows and git history keep working.
2. **It is fastest from a phone.** It is a single SPA, signs in with a PAT, and converts uploads to WebP on the client. That fits a quick news post written after seeing something on X.
3. **It handles structured reviews.** Model a `reviews` collection with `rating` (number), `pros` and `cons` (lists), `specs` (an object or a list of key/value pairs), `verdict` and `updatedAt` (datetime). Astro's Zod schema validates the same shape at build time.
4. **It is safe against lock-in and abandonment.** The config is Decap-compatible, so if Sveltia stalls you swap the script tag for `decap-cms`. The content is untouched either way.
5. **Embedded X posts:** add a `tweet` editor component that emits `<Tweet id="…"/>` in MDX, rendered by `astro-embed` (0.14.0, 2026-08-27) or `@astro-community/astro-embed-twitter` (0.5.11, 2026-01-02). No X widgets.js is needed at runtime.

Runner-up: **Keystatic**, if the site moves to Vercel or Cloudflare (SSR adapter). It has the best typed schema and the first-party Astro integration. Avoid Tina, Sanity, Contentful and Storyblok for this site: they add cost and lock-in for one user. Pages CMS is worth a 10-minute phone test if Sveltia's mobile UI disappoints.

#### 1e. Setup (Astro + Sveltia on GitHub Pages)
```bash
npm create astro@latest supercharged -- --template minimal && cd supercharged
npx astro add mdx sitemap
npm i astro-embed                        # <Tweet>, <YouTube> components
mkdir -p public/admin src/content/dispatch src/content/reviews public/assets/dispatch
cat > public/admin/index.html <<'EOF'
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin</title></head><body>
<script src="https://unpkg.com/@sveltia/cms@0.252.0/dist/sveltia-cms.js"></script></body></html>
EOF
cat > public/admin/config.yml <<'EOF'
backend: { name: github, repo: zzbz6jgyzy-creator/zzbz6jgyzy-creator.github.io, branch: main }
# optional OAuth instead of PAT: deploy github.com/sveltia/sveltia-cms-auth to Cloudflare Workers, then base_url: https://<worker>.workers.dev
media_folder: public/assets/dispatch
public_folder: /assets/dispatch
media_libraries: { default: { config: { transformations: { raster_image: { format: webp, quality: 85, width: 1600 } } } } }
collections:
  - name: dispatch
    label: Dispatch
    folder: src/content/dispatch
    create: true
    format: frontmatter
    extension: mdx
    slug: "{{slug}}"
    fields:
      - { name: title, widget: string }
      - { name: date, widget: datetime }
      - { name: updatedAt, widget: datetime, required: false }
      - { name: topic, widget: select, options: [tesla, spacex, xai, x] }
      - { name: tag, widget: string }
      - { name: summary, widget: text }
      - { name: image, widget: image }
      - { name: imageAlt, widget: string }
      - { name: draft, widget: boolean, default: true }
      - { name: body, widget: markdown }
  - name: reviews
    label: Reviews
    folder: src/content/reviews
    create: true
    fields:
      - { name: title, widget: string }
      - { name: rating, widget: number, value_type: float, min: 0, max: 10 }
      - { name: pros, widget: list }
      - { name: cons, widget: list }
      - { name: specs, widget: list, fields: [{ name: label, widget: string }, { name: value, widget: string }] }
      - { name: updatedAt, widget: datetime }
      - { name: body, widget: markdown }
EOF
```
- **Sign-in:** create a GitHub fine-grained PAT (Contents: read/write on this repo only), open `/admin/` on the phone and choose "Sign In with Token".
- **Migration:** a one-off script converts the existing `dispatch/*.html` files and `data/articles.json` into `src/content/dispatch/*.mdx` front matter. `scripts/build-articles.py` already knows the field set.

---

### 2. On-site search

#### 2a. Health and adoption

| Candidate | Model | GitHub stars | Open issues (+PRs) | Latest release | npm dl/wk | Licence |
|---|---|---|---|---|---|---|
| **Pagefind** `pagefind` | Static, build-time index, chunked, WASM | 5,531 (Pagefind/pagefind) | 142 (API) | 1.5.2, 2026-04-12 (1.5.0 on 2026-04-06: ~45% smaller chunks, Web Worker search, metadata weighting) | 1,552,769 | MIT |
| `astro-pagefind` | Astro integration | 567 | 7 | 2.0.1, 2026-07-03 | 30,660 | MIT |
| **Orama** `@orama/orama` | Client-side in-memory | 10,587 | 18 issues + 17 PRs | 3.1.18, **2025-12-19** (no release in 10 months) | 1,044,238 | Apache-2.0 |
| `@orama/plugin-astro` | Astro integration | (same repo) | — | 3.1.18, 2025-12-19 | **17** | Apache-2.0 |
| **Fuse.js** | Client-side fuzzy | 20,510 | 21 | 7.5.0, 2026-07-13 | 8,719,811 | Apache-2.0 |
| **MiniSearch** | Client-side inverted index | 6,179 | 15 | 7.2.0, 2025-09-16 | 2,421,089 | MIT |
| FlexSearch (extra) | Client-side | 13,811 | 39 | 0.8.212, 2025-09-06 | 740,344 | Apache-2.0 |
| **Algolia** `algoliasearch` / `@docsearch/js` | Hosted SaaS | 1,384 (JS client) / 4,386 (docsearch) | 24 / 85 | 5.60.0 (2026-10-12) / 5.1.2 (2026-10-05) | 4.9M / 912k | MIT (clients); SaaS |
| **Typesense** `typesense` | Self-host or Cloud server | 27,050 | 923 (API) | Server v30.2 (GitHub "Latest", 19 Apr; year not shown); JS client 3.2.0, 2026-10-19 | 601,369 | GPL-3.0 (server), Apache-2.0 (client) |
| **Meilisearch** `meilisearch` | Self-host or Cloud server | 59,676 | 320 (API) | Server v1.56.0, 26 Oct (2026); JS client 0.62.0, 2026-09-09 | 455,709 | MIT Community Edition; Enterprise (sharding) under BUSL since v1.19 |
| **Supabase Postgres FTS** | Your existing DB | 113,982 | 1,174 | supabase-js 2.118.0, 2026-10-15 | 21.5M | Apache-2.0 / PostgreSQL |

#### 2b. Fit (sized for 1,000–5,000 articles at about 5.6 KB of text each)

**Measured, not guessed.**
- I ran Pagefind 1.5.2 on a scratch copy of the 83 `dispatch/*.html` pages, then on a synthetic 4,980-page set made by duplicating them with unique tokens.
- At 4,980 pages it indexed in 15.3 s and produced 397 index chunks (avg 12 KB, max 30 KB), 4,980 fragments (avg 3.5 KB) and a 37.6 KB meta file.
- First-search payload: `pagefind.js` 12.8 KB gz + worker 11.9 KB gz + WASM 72 KB + meta 38 KB + 1–3 chunks + about 5 fragments, roughly **170–200 KB in total**. The Modular UI adds about 4 KB gz; the Default UI adds about 30 KB gz plus 2.6 KB of CSS.
- This is consistent with pagefind.app's claim of "under 300kB for 10,000 pages". Synthetic duplicates under-represent real vocabulary growth, so treat these as lower-bound estimates.

**Library weights.** Measured min+gzip from jsDelivr (Orama and DocSearch figures are the bundled `+esm` builds):
- Fuse 9.1 KB (basic build 7.3 KB)
- MiniSearch 6.2 KB
- FlexSearch light 4.5 KB
- Orama 26 KB (the README's "<2kb" does not match the bundle)
- DocSearch about 168 KB

**Client-side libraries also download their whole index.**
- Metadata only (title, summary, tag, topic) at about 454 B per entry: 5,000 articles is about 2.3 MB raw, **about 640 KB gz**.
- Full text: 5,000 × 5.6 KB is about 28 MB raw. Not viable on a phone.

| | Static-host fit | Index at 5k articles | Mobile JS weight | Relevance | Topic facets | Cost |
|---|---|---|---|---|---|---|
| **Pagefind** | Ideal: a post-build step writes `/pagefind/` into `dist` | Full text, chunked; ~170–200 KB per first search | ~25 KB JS + 72 KB WASM, lazy-loaded on focus | BM25-style; metadata/title weighting and diacritics (1.5); stemming; no typo tolerance (prefix matching only) | **Yes**: `data-pagefind-filter="topic"`, `filters()` returns counts per value; `data-pagefind-sort="date"` | $0 |
| **Orama** | Good (build JSON then hydrate) | Full download, ~MBs | 26 KB + index | Good; typo tolerance; facets | Yes | $0; **stalled releases, Astro plugin effectively unused** |
| **Fuse.js** | Good | Metadata only (~640 KB gz) | 9 KB + index | Fuzzy, but O(n) scan and weak ranking for prose | Manual filtering in JS | $0 |
| **MiniSearch** | Good | Metadata only (~640 KB gz), or serialize the index | 6 KB + index | Good BM25, prefix and fuzzy | Manual (filter callback) | $0 |
| **Algolia** | Good (push records from CI) | Hosted | Small client; InstantSearch adds weight; DocSearch ~168 KB | Excellent, typo-tolerant | Yes, native | Free Build plan: 10K searches/mo, 50K records, 1 GB. Overage $0.50 per 1K searches. **DocSearch is not available**: it is for "developer documentation and technical blogs" and "usually turn[s] down" non-technical sites. |
| **Typesense** | Needs a server or Cloud | Hosted | Small client | Excellent, typo-tolerant | Yes | Cloud: 720 h free trial, then from about $7–22/mo (third-party figures; official calculator unrendered, so unverified) |
| **Meilisearch** | Needs a server or Cloud | Hosted | Small client | Excellent | Yes | Cloud Build plan: 50K searches/mo, 100K docs; base fee unverified (third parties say $20–30/mo). Self-host on a VPS. |
| **Supabase FTS** | Already connected; query via `supabase-js` `.textSearch()` / RPC | Server-side, tiny client payload | ~0 extra (supabase-js already loaded for comments) | tsvector + `websearch_to_tsquery` + `ts_rank` with A–D weights; typo tolerance only via `pg_trgm` (DIY); no highlighting in the docs page | Yes (`where topic = …`) | Free tier: 500 MB DB; pauses after 1 week inactive (comments traffic keeps it awake) |

#### 2c. Known problems
- **Pagefind**:
  - No typo tolerance: "Grok 4" works, "Grook" does not.
  - Results reflect the last deploy, which is fine because the site deploys on every publish.
  - The index adds about 34 MB and about 5,400 files at 5k pages. That is fine for GitHub Pages (1 GB site soft limit) but makes the Pages artifact bigger.
  - Add `data-pagefind-body` to the article element so nav and footer chrome is not indexed. My test run warned that none was set.
- **Orama**: last npm release 2025-12-19; `@orama/plugin-astro` gets 17 downloads a week.
- **Fuse.js and MiniSearch**: cannot do full text at this scale on mobile.
- **Algolia, Typesense, Meilisearch**: an extra service and API key, a sync step in CI, and recurring cost or quota risk if a post goes viral on X.
- **Supabase FTS**:
  - An extra round trip on every keystroke.
  - Article bodies must be duplicated into Postgres on publish (CI step).
  - Free projects can pause.

#### 2d. Recommendation: search
**Use Pagefind (via `astro-pagefind`) with the Modular UI or Component UI.**
- It is the only option that does full-text, faceted (Tesla / SpaceX / xAI with counts) and date-sortable search for 5,000 articles.
- It costs about 200 KB of lazy-loaded data per first search, $0, and runs no server on GitHub Pages.
- It is also what Astro Starlight ships with, so it is the best-trodden path on Astro.

Add-ons, only if needed later:
- If typo tolerance becomes a real complaint, add a **Supabase FTS + `pg_trgm`** "did you mean" fallback. The DB, auth and client are already on the page.
- Move to Meilisearch or Typesense Cloud only if the site needs instant-as-you-type relevance across tens of thousands of documents.

#### 2e. Setup
```bash
npx astro add astro-pagefind          # or: npm i -D pagefind astro-pagefind
# astro.config.mjs: import pagefind from "astro-pagefind"; integrations: [pagefind()]
```
Markup in the article layout:
```html
<article data-pagefind-body>
  <h1 data-pagefind-meta="title">{title}</h1>
  <span data-pagefind-filter="topic">{topic}</span>
  <time data-pagefind-sort="date" datetime={date}>{date}</time>
  <img data-pagefind-meta="image[src], image_alt[alt]" src={image} alt={imageAlt}>
</article>
```
Mark nav and footer with `data-pagefind-ignore`. Run `npx pagefind --site dist` in a plain-HTML or non-Astro build such as Eleventy. For Next.js static export, run the same command against `out/`.

If you add the Supabase fallback later:
```sql
alter table articles add column fts tsvector generated always as
  (setweight(to_tsvector('english', title),'A') || setweight(to_tsvector('english', coalesce(summary,'')),'B') || setweight(to_tsvector('english', body),'C')) stored;
create index articles_fts on articles using gin (fts);
create extension if not exists pg_trgm;
```

---

#### Key sources
- Sveltia docs: sveltiacms.app/en/docs/intro, /backends/github, /media/internal, /workflows/editorial. Releases: github.com/sveltia/sveltia-cms/releases
- Decap: decapcms.org/about, decapcms.org/blog (Turbo GA 16 Oct 2026; Richtext widget Apr 2026), github.com/decaporg/decap-cms/releases. Mobile thread: answers.netlify.com/t/responsive-mobile-view-for-netlify-cms/13408
- Keystatic: keystatic.com/docs/github-mode ("host can run Node.js for Keystatic's API routes"), keystatic.com/docs/cloud, github.com/Thinkmill/keystatic/commits/main, Keystatic issues #1044 and #1458
- Tina: tina.io/pricing, tina.io/docs/self-hosted/overview, tina.io/docs/frameworks/astro
- Pages CMS: pagescms.org, pagescms.org/docs/, github.com/hunvreus/pagescms/commits/main
- Sanity: sanity.io/pricing; sanity.io/docs/studio/scheduled-drafts/changelog (paid plans)
- Contentful: contentful.com/help/usage-limits-january-2026/
- Directus: directus.io/docs/self-hosting/overview (BSL 1.1, $5M threshold)
- Payload/Figma: cmswire.com/digital-experience/when-cms-meets-ux-design-what-figmas-payload-deal-really-means; the Payload Cloud sign-up closure comes only from techsy.io (unverified)
- GitHub Mobile file editing: github.blog/news-insights/product-news/file-editing-on-github-mobile-keeps-leveling-up/
- Working Copy prices: apppricinglab.com/iap/apple/896694807
- Pagefind: pagefind.app, pagefind.app/docs/js-api-filtering/, github.com/Pagefind/pagefind/releases
- Algolia: algolia.com/pricing, docsearch.algolia.com/docs/who-can-apply
- Typesense: cloud.typesense.org/pricing (calculator), github.com/typesense/typesense/releases
- Meilisearch: meilisearch.com/docs/capabilities/platform/billing/pricing_model, meilisearch.com/blog/enterprise-license, github.com/meilisearch/meilisearch/releases
- Supabase: supabase.com/docs/guides/database/full-text-search, supabase.com/pricing


## 3. Styling, components, icons, type & motion (research as of 2026-10-26)

Scope: tooling for the superchargeddaily.com rebuild on Astro (latest `astro` 7.4.2, 2026-10-21). The goal is premium, technical, Tesla/SpaceX-spirited design, dark mode first, mobile first, zero CLS, green CWV, and a design system in code.

**Method.** Versions, dates, licences and weekly downloads come live from `registry.npmjs.org` / `api.npmjs.org` (week ending 2026-10-25). Stars and open-issue counts come from the GitHub search API via the GitHub MCP tool on 2026-10-26. GitHub's `open_issues_count` **includes open PRs**. Browser support comes from MDN browser-compat-data and Fyrd/caniuse raw JSON (`github.com/mdn/browser-compat-data`, `github.com/Fyrd/caniuse`). Font file sizes are measured from the Fontsource CDN (`cdn.jsdelivr.net/fontsource/fonts/...`, latin subset, woff2). Anything not checked is marked *unverified*.

**Current site context** (read only): 65 root `*.css` files, `styles.css` 94 KB, `theme.css` 25 KB. Light theme is applied via `html[data-theme="light"]` overrides, with dark as the default. The site uses ad-hoc tokens (`--bg --ink --line --tesla --font --font-mono`), 11 `@font-face` rules and 13 `!important` in `styles.css`. Fonts are Inter + IBM Plex Mono + Michroma, with "Inter Fallback" metric fallbacks already present. The rebuild should consolidate all of this into one token file plus utilities.

---

### 1. CSS approach

| Option | Latest (date) | Stars / open issues+PRs | npm weekly | Licence | Astro story |
|---|---|---|---|---|---|
| **Tailwind CSS v4** | `tailwindcss` 4.3.3 (2026-07-16); v4.3.0 2026-05-08 | 98,125 / 102 | 88.7 M (`@tailwindcss/vite` 31.6 M) | MIT | `@tailwindcss/vite` plugin; `@import "tailwindcss"` in global CSS |
| **Vanilla modern CSS + Open Props** | `open-props` 1.7.23 (2026-01-31); v2 stuck at `2.0.0-beta.5` (2024-01-28) | 5,553 / 77 | 26 K | MIT | Native: global CSS + Astro scoped `<style>` |
| **UnoCSS** | `unocss` 66.12.0 (2026-10-26) | 18,988 / 112 | 341 K (`@unocss/astro` 94 K) | MIT (npm) | First-party `@unocss/astro` integration |
| **Panda CSS** | `@pandacss/dev` 2.4.0 (2026-10-22). v2 = Rust/Oxc compiler rewrite, ESM-only, Node ≥ 22 | 6,236 / 7 | 311 K | MIT | PostCSS / codegen. Type-safe `css()`/recipes; best with JSX, workable in `.astro` |
| **CSS Modules / Astro scoped styles** | built into Astro/Vite | (withastro/astro 63,484 / 120) | n/a | MIT | Zero-config `<style>` scoping; `*.module.css` via Vite |

Sources: https://github.com/tailwindlabs/tailwindcss · https://tailwindcss.com/blog/tailwindcss-v4-3 · https://github.com/argyleink/open-props · https://github.com/unocss/unocss · https://github.com/chakra-ui/panda · https://v2.panda-css.com/docs/get-started/upgrading-to-v2 · https://docs.astro.build/en/guides/styling/

**Tailwind v4 (CSS-first config).** There is no `tailwind.config.js`. Tokens live in CSS under `@theme { --color-accent: #E31937; --font-display: ...; --spacing: 0.25rem; }`, and each token becomes both a utility (`bg-accent`) and a real CSS custom property usable in hand-written CSS. Dark mode uses `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`, with an inline head script for system preference plus toggle (https://tailwindcss.com/docs/dark-mode). It has Oxide/Lightning CSS, container-query variants (`@container`, `@sm:`), `@starting-style` (`starting:`) variants, and cascade layers out of the box. 4.3 added scrollbar, `zoom-*`, `@container-size` and related utilities.
- Pros: by far the largest community. AI coding agents write it most fluently. Output contains only the classes actually used (typically 10–30 KB gzip for a content site; *estimate*, not measured). Tokens are plain CSS variables, so leaving later is cheap.
- Cons: class-soup markup, and long-form article prose still needs hand-written CSS (or `@tailwindcss/typography`).
- **Known risk:** Tailwind Labs laid off 3 of its 4 engineers in Jan 2026, citing an ~80% revenue drop blamed on AI (https://www.devclass.com/2026/01/08/tailwind-labs-lays-off-75-percent-of-its-engineers-thanks-to-brutal-impact-of-ai/). Releases have continued (4.3.0 May, 4.3.3 July 2026), but cadence risk is real. Because the tokens are standard CSS, this is a moderate lock-in, not a hard one.

**Vanilla + Open Props.** The platform now covers most of what a framework used to. Cascade layers have 96.9% global support; container queries 95.8% (Chrome 106 / Safari 16 / Firefox 110); native nesting 92.9%; `light-dark()` works in Chrome 123 / Safari 17.5 / Firefox 120. Pros: zero dependency and maximum longevity. Cons: Open Props itself is effectively in maintenance (v1 only, and the v2 beta has been idle since Jan 2024). A one-person team has to police naming and dead CSS, and that is exactly how today's 100 files happened.

**UnoCSS.** Tailwind-compatible presets (presetWind4), faster and more flexible, with attributify mode and icons-as-CSS. Its community is ~1/250th of Tailwind's, and AI agents sometimes emit Tailwind-only syntax. Worth it only if you want its icon or attributify features.

**Panda CSS.** The best *typed* token story (semantic tokens, recipes, conditions such as `_dark`), with zero runtime. However it is codegen-heavy, the v2 migration happened only weeks ago, and it fits `.astro` templates less naturally than React/JSX. That is overkill for a mostly static site.

**Scoped Astro styles / CSS Modules.** Great for component-local one-offs, but this approach is not a design system by itself; tokens still have to come from somewhere.

**Recommendation — Tailwind CSS v4.3 + one `tokens.css` + Astro scoped styles for exceptions.**
- Put every design decision in `@theme` (colours as OKLCH, type scale, spacing, radii, motion durations/easings). Put semantic dark/light aliases in `@layer base` with `[data-theme]` + `prefers-color-scheme`.
- Hand-write `prose.css` (article body) in `@layer components`, using the same variables.
- Ban per-page CSS files: everything is either utilities, a component's scoped `<style>`, or tokens.
- Pick vanilla + layers instead only if you want zero build-tool dependency. Both options share the same token file, so the choice is reversible.

```bash
npm create astro@latest supercharged -- --template minimal
npx astro add tailwind            # installs tailwindcss + @tailwindcss/vite, creates src/styles/global.css
# global.css:  @import "tailwindcss";  @custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));  @theme { ... }
```

---

### 2. Component libraries (Astro, mostly static)

| Library | Latest (date) | Stars / open | npm weekly | Licence | Astro-native? | A11y notes |
|---|---|---|---|---|---|---|
| **shadcn/ui** (CLI `shadcn`) | 4.22.1 (2026-10-18) | 126,587 / 1,775 | 8.0 M | MIT | **No.** Components are React (Radix or Base UI) → islands (`client:*`), so React ships for interactive parts | Inherits Radix/Base UI a11y (good) |
| **Starwind UI** | CLI `starwind` 3.4.1 (2026-10-23); `@starwind-ui/runtime` 1.4.0 | 758 / 3 | 383 (CLI) / 3.3 K (runtime) | MIT | **Yes.** Pure `.astro` + vanilla JS, shadcn-style copy-in, Tailwind v4. v3.0 adds React/Vue/Svelte | Claims accessible primitives; *no independent audit found* |
| **daisyUI v5** | 5.7.50 (2026-10-13) | 42,679 / 49 | 696 K | MIT | Yes (pure CSS Tailwind plugin, zero JS) | CSS-only: ARIA, focus and Esc handling are **your** job; vendor WCAG claims unaudited |
| **Basecoat UI** | `basecoat-css` 1.1.0 (2026-10-23) | 4,412 / 6 | 16.7 K | MIT | Yes (HTML + Tailwind v4 classes + small per-component JS, `initAll()`) | "Semantic HTML and documented attributes"; *no audit found* |
| **Radix Primitives** | e.g. `@radix-ui/react-dialog` 1.3.1 (2026-10-12) | 19,434 / 252 | 48.3 M | MIT | React only → islands | Excellent (WAI-ARIA patterns) |
| **Base UI** (shadcn's alt base) | `@base-ui/react` 1.9.0 (2026-10-09) | unverified | 11.9 M | MIT | React only | Good (Radix/MUI authors) |
| **Ark UI** (Zag.js) | 5.39.3 (2026-10-05) | 5,439 / 9 | 618 K (react) / 44 K (solid) | MIT | React/Solid/Vue/Svelte, **no `.astro`**. Zag state machines (`@zag-js/*` 1.46.0) are framework-agnostic and can be wired in vanilla JS | Excellent |
| **Bits UI** | 2.20.2 (2026-10-23) | 3,631 / 36 | 820 K | MIT | Svelte 5 only | Good |
| **Melt UI** | `@melt-ui/svelte` 0.86.6 (2025-03-28, legacy); next-gen `melt` 0.44.0 (2026-01-04) | 4,200 / 121 | 106 K / 6 K | MIT | Svelte only; slowing | Good |
| **Build our own** | n/a | n/a | n/a | yours | Yes | Use native `<dialog>`, Popover API (Chrome 114 / Safari 17 / Firefox 125), `<details>`; see incluud/accessible-astro-components (573★) for patterns |

Sources: https://ui.shadcn.com/docs/installation/astro · https://starwind.dev/docs/getting-started/installation/ · https://daisyui.com/astro-component-library/ · https://basecoatui.com/installation/ · https://github.com/radix-ui/primitives · https://github.com/chakra-ui/ark · https://github.com/huntabyte/bits-ui · https://github.com/melt-ui/melt-ui · https://github.com/incluud/accessible-astro-components

Known problems:
- **shadcn in Astro** means adding React plus hydration for every menu or dialog. That is the wrong default for a CWV-first news site. Its *visual language* and *registry format* are still useful as a reference.
- **daisyUI** has a recognisable "daisy" look (themes, rounded chips) that fights a bespoke Tesla-like aesthetic, and its CSS-only dropdowns and modals need manual ARIA.
- **Starwind** has a tiny community (758★, a few hundred CLI downloads a week). The bus-factor risk is acceptable *only because it is copy-in code you own*.

**Recommendation — build our own small set (~12 components)**, seeded by copy-paste from **Starwind UI** (Astro-native, vanilla JS, Tailwind v4) and **Basecoat**'s markup patterns:
- Components: Button, Link, Tag/Badge, Card/StoryCard, Header + mobile nav (Popover API), ThemeToggle, Dialog (`<dialog>`), Tabs, Accordion (`<details name>`), Tooltip, Toast, Prose wrapper.
- No React. Interactive behaviour goes in `<script>` tags (Astro bundles and dedupes them) or small Web Components.
- If an interactive island (a tracker or calculator) ever needs a framework, use Preact or Svelte plus **Ark UI** / **Bits UI** for that island only.
- Check every component with axe and by keyboard.

```bash
npx starwind@latest init --defaults     # optional: then `npx starwind@latest add dialog tabs` and adapt
npm i basecoat-css                      # optional reference only; do not ship whole library
```

---

### 3. Icons

| Set | Latest (date) | Icons (Iconify count) | Stars / open | npm weekly | Licence | Astro, zero-JS path |
|---|---|---|---|---|---|---|
| **Lucide** | `lucide` / `@lucide/astro` 1.61.0 (2026-10-21) | 1,903 | 25,309 / 435 | 1.06 M (core), 78 K (`@lucide/astro`), 701 K (`@iconify-json/lucide`) | **ISC** (Feather-derived icons MIT) | `@lucide/astro` `.astro` components render inline SVG at build; no JS |
| **Phosphor** | `@phosphor-icons/core` 2.1.1 (2024-03-29); `@iconify-json/ph` 1.2.2 (2024-12-16) | 9,072 (≈1.5 K × 6 weights) | 7,720 / 523 (homepage repo) | 1.14 M (core) | MIT | Via astro-icon / unplugin-icons. **Releases stalled since 2024.** |
| **Tabler** | `@tabler/icons` 3.49.0 (2026-10-05) | 6,238 | 22,463 / 96 | 2.68 M | MIT | Via astro-icon (`@iconify-json/tabler` 1.2.42) |
| **Heroicons** | `heroicons` 2.2.0 (2024-11-18) | 1,288 (≈320 × 4 styles) | 23,882 / 4 | 90 K | MIT | Via astro-icon; small set, slow cadence |
| **astro-icon** (loader) | 1.2.0 (2026-08-18) | any Iconify set | 1,448 / 18 | 164 K | MIT (npm) | Build-time inline SVG, svgo for local icons; repeats deduped via `<symbol>`/`<use>` (verified in `Icon.astro` source); zero JS |
| **unplugin-icons** (loader) | 24.0.0 (2026-09-11) | any Iconify set | 4,959 / 88 | 475 K | MIT | Vite plugin with `compiler: 'astro'`; import icons as components; zero JS |
| Iconify data | `@iconify/json` 2.2.548 (2026-10-26) | 200+ sets | iconify/iconify 6,372 / 17 | 210 K | MIT (sets vary) | Install per-set `@iconify-json/<set>` instead (smaller) |

Sources: https://lucide.dev/guide/packages/lucide-astro · https://github.com/lucide-icons/lucide/blob/main/LICENSE · https://github.com/tabler/tabler-icons · https://github.com/phosphor-icons/homepage · https://github.com/tailwindlabs/heroicons · https://github.com/natemoo-re/astro-icon · https://github.com/unplugin/unplugin-icons · https://api.iconify.design/collections

**Recommendation — Lucide via `astro-icon` + `@iconify-json/lucide`.**
- One loader handles Lucide plus local brand SVGs (X, Tesla "T", SpaceX, xAI marks in `src/icons/`), with `<symbol>` dedupe so repeated icons in story lists cost almost nothing.
- Lucide's 1.5 px-ish geometric stroke suits the technical look and is the set AI agents know best.
- Use Tabler as the fallback set for missing glyphs, since it is the same stroke style and MIT. Avoid Phosphor for new work (no release in ~19 months).

```bash
npx astro add astro-icon && npm i -D @iconify-json/lucide @iconify-json/tabler
# <Icon name="lucide:zap" class="size-5" aria-hidden="true" />  /  <Icon name="spacex" />  (src/icons/spacex.svg)
```

---

### 4. Typography

| Font | Licence | Variable axes (Fontsource) | latin woff2 (variable wght) | Source repo stars / last upstream release | Fontsource pkg weekly | Character |
|---|---|---|---|---|---|---|
| **Inter** (4.x incl. Display via opsz) | OFL-1.1 | wght, **opsz** (opsz+wght file 72.9 KB) | 48.3 KB | rsms/inter 20,000 / 148; v4.1 (16 Nov 2024) | 4.20 M | Neutral, superb UI/body; opsz gives tight "Display" cut at large sizes |
| **Geist / Geist Mono** | OFL-1.1 | wght | 29.4 KB / 23.1 KB | vercel/geist-font 3,675 / 51; v1.8.2 (2026-10-21) | 2.34 M / 1.54 M | Swiss-engineered, crisp; mono is excellent for data |
| **IBM Plex Sans / Mono** | OFL-1.1 | wght (Sans) | 45.7 KB | IBM/plex 11,730 / 84 | 279 K (var) / 873 K (static) | Industrial, corporate; slightly dated |
| **Space Grotesk** | OFL-1.1 | wght | 22.3 KB | floriankarsten/space-grotesk 1,839 / 15; last push 2023-03 | 385 K | Quirky techno; tiring as body |
| **Manrope** | OFL-1.1 | wght | 24.8 KB | unverified | 622 K | Geometric, friendly; softer than desired |
| **Archivo** | OFL-1.1 | wght, **wdth** (62–125; wdth+wght file 90.1 KB) | 34.9 KB | Omnibus-Type/Archivo 159 / 8 | 344 K | Grotesque with expanded widths, very "spec sheet" |
| **Barlow** | OFL-1.1 | **static only** (no variable on Fontsource) | 22.2 KB per weight | jpt/barlow 833 / 51 | 235 K | DIN-like, closest free cousin of D-DIN |
| **Mona Sans / Hubot Sans** | OFL-1.1 | wght, **wdth** (wdth+wght file 98.1 KB) | 39.8 KB / 48.3 KB | github/mona-sans 4,177 / 27; hubot-sans 1,963 / 18 | 50 K / 14 K | Mona: strong grotesk with expanded widths; Hubot: techy/robotic |
| **D-DIN** (Datto) | OFL-1.1 (RFN "D-DIN") | static only; not on Fontsource/Google | n/a | amcchord/datto-d-din mirror 64★ | n/a | **SpaceX's actual face.** Legal to use, but reads as imitation; avoid as primary |
| **Satoshi / General Sans** (Fontshare) | **ITF Free Font License (proprietary EULA)** | wght (Satoshi-Variable.woff2 42.6 KB) | n/a | n/a | n/a | Trendy geometric; see licence trap below |

Sources: https://fontsource.org · https://github.com/rsms/inter/releases/latest · https://github.com/vercel/geist-font/releases/latest · https://github.com/github/mona-sans · https://github.com/amcchord/datto-d-din · FFL text read from the official Satoshi download zip (`api.fontshare.com/v2/fonts/download/satoshi`, `License/FFL.txt`).

**Fontshare FFL trap (verified from the licence text).** Self-hosting for your own site is explicitly allowed. However, you may **not modify the fonts, "including … subsetting, format conversion"**, and you may not make them available on "publicly accessible servers". That clashes with subsetting pipelines and with a public GitHub Pages repo holding the font files. **Avoid Satoshi and General Sans.**

**Astro Fonts API — stable.** `fonts` is a top-level config option `<Since v="6.0.0">` in the Astro config reference (Astro 6 released 2026-03-10), no longer under `experimental`.
- Providers: local, Fontsource, Google, Bunny, Fontshare, Adobe, NPM.
- It downloads and self-hosts the font files.
- `<Font cssVariable preload />` emits preload links.
- It generates metric-adjusted fallbacks (`optimizedFallbacks`, on by default when the last fallback is a generic family).
- Weights default to `400` only, so list `["100 900"]` for variable fonts.

Sources: https://docs.astro.build/en/guides/fonts/ · https://docs.astro.build/en/reference/configuration-reference/#fonts · https://astro.build/blog/astro-6/

**CLS tooling.** `fontaine` 1.0.3 (2026-10-22, MIT, unjs/fontaine 2,003★ / 13, 691 K/wk) and `@capsizecss/metrics` 4.4.0 (2026-10-15, MIT, seek-oss/capsize 1,735★ / 9, 233 K/wk) generate `size-adjust`/`ascent-override` fallback `@font-face` rules. `size-adjust` support: Chrome 92 / Safari 17 / Firefox 92. With the Astro Fonts API you don't need them directly; keep capsize only if you want "trimmed" leading (or use `text-box-trim` where supported).

**Recommended pairing — Inter (variable, wght+opsz) for headlines/UI/body + Geist Mono for data.**
- **Inter** is already the site's font, so readers keep the familiarity and the fallback metrics are proven. The opsz axis automatically gives the tighter Inter Display drawing at headline sizes, which supplies the "confident, engineered, lots of air" Tesla feel without imitating Gotham or Universal Sans.
- **Geist Mono** handles numbers, specs, timestamps, tracker tables and uppercase tracked kickers ("LAUNCH · T-00:12:04"). This is the SpaceX telemetry vibe without copying D-DIN, and it replaces IBM Plex Mono and Michroma.
- Budget: ~73 KB (Inter opsz+wght latin) + 23 KB (Geist Mono) ≈ **96 KB**. Preload only Inter.
- Optional accent: **Mona Sans** at `wdth 112–125`, weight 700–800, for hero/section headlines only (+98 KB, not preloaded, `font-display: swap` + fallback).
- Leaner alternative: **Geist + Geist Mono** (≈52 KB total) for a more distinctive but more "Vercel-ish" look.

```js
// astro.config.mjs
import { defineConfig, fontProviders } from "astro/config";
export default defineConfig({ fonts: [
  { provider: fontProviders.fontsource(), name: "Inter", cssVariable: "--font-inter",
    weights: ["100 900"], styles: ["normal"], subsets: ["latin"], fallbacks: ["system-ui", "sans-serif"] },
  { provider: fontProviders.fontsource(), name: "Geist Mono", cssVariable: "--font-geist-mono",
    weights: ["100 900"], subsets: ["latin"], fallbacks: ["ui-monospace", "monospace"] },
]});
// Layout head: <Font cssVariable="--font-inter" preload /> <Font cssVariable="--font-geist-mono" />
// Tailwind: @theme inline { --font-sans: var(--font-inter); --font-mono: var(--font-geist-mono); }  (distinct names avoid self-reference)
```
Caveat: confirm the Fontsource provider serves Inter's opsz axis through the Fonts API. If it only serves wght, use `fontProviders.local()` with `@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2`.

---

### 5. Animation & motion

**Native platform (verified support).**

| Feature | Chrome | Safari | Firefox | Global | Use for |
|---|---|---|---|---|---|
| Same-document View Transitions | 111 | 18.0 | 144 | 92.9% | in-page state changes (filters, theme toggle) |
| **Cross-document VT** (`@view-transition { navigation: auto }`) | 126 | 18.2 (iOS 18.2) | **No.** Firefox 144+ has Level 1 only | 86.8% full | page-to-page morphs (story card → article hero) |
| Scroll-driven animations (`animation-timeline`) | 115 | 26 | **159** (ships 2026-10-27; current 158) | ~Baseline imminent | progress bar, subtle reveal |
| `@starting-style` | 117 | 17.5 | 129 | 93.1% | enter animations for popovers/dialogs/toasts |
| `interpolate-size` | 129 | no | no | — | `height:auto` accordions (progressive) |

Sources: https://caniuse.com/cross-document-view-transitions · https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline · https://caniuse.com/mdn-css_at-rules_starting-style · BCD `css/at-rules/view-transition.json`, `css/properties/animation-timeline.json`, `browsers/firefox.json`.

**Astro.** Native cross-document VT needs no JS. Astro's own docs say `<ClientRouter />` "will increasingly become unnecessary" (https://docs.astro.build/en/guides/view-transitions/). Use native `@view-transition` plus `view-transition-name` on hero images. Unsupported browsers get normal navigation (ideal progressive enhancement). Use `<ClientRouter />` only if persistent state across pages is required (e.g. an audio player); it adds a JS router and the gotchas of re-running scripts.

**JS libraries.**

| Library | Latest (date) | Stars / open | npm weekly | Licence | Size (min+gz) | Verdict |
|---|---|---|---|---|---|---|
| **Motion** (`motion`, ex-Framer Motion) | 14.6.0 (2026-10-22) | motiondivision/motion 34,555 / 10 | 16.9 M | MIT (Motion+ paid extras) | `animate` mini 3.2 KB; hybrid 22 KB (motion.dev docs) | Best JS option when CSS can't do it (springs, `inView`, `scroll`) |
| **GSAP** | 3.15.0 (2026-04-13) | greensock/GSAP 29,760 / 7 | 3.9 M | **"Standard no-charge" proprietary licence**, not OSI | core 27.4 KB gz (bundlephobia) | Free for commercial use incl. SplitText/MorphSVG. Prohibited in tools competing with Webflow's visual animation builder. Overkill here |
| **AutoAnimate** | `@formkit/auto-animate` 0.10.0 (2026-07-10) | 13,942 / 49 | 1.09 M | MIT | 3.2 KB gz | Good for live lists (trackers, counters) re-ordering |
| **Lenis** | 1.3.27 (2026-10-15) | darkroomengineering/lenis 16,894 / 34 | 1.19 M | MIT | 5.5 KB gz | **Do not use.** Scroll smoothing on a news site hurts phone readers and assistive tech. ≥1.3.26 respects `prefers-reduced-motion` by default |

Sources: https://motion.dev/docs/animate · https://gsap.com/community/standard-license/ · https://webflow.com/updates/gsap-becomes-free · https://bundlephobia.com/package/gsap@3.15.0 · https://github.com/formkit/auto-animate · https://github.com/darkroomengineering/lenis · https://motion.dev/docs/lenis

**Recommendation — CSS-native first, Motion (mini) as the only JS library, if any.**
- Motion tokens in `@theme`: `--ease-out-expo: cubic-bezier(.16,1,.3,1)`, `--duration-fast: 150ms`, `--duration-base: 240ms`. Animate only `opacity`/`transform`, never layout properties, so there is no CLS.
- Global guard, plus wrap all scroll-driven and VT rules in `@media (prefers-reduced-motion: no-preference)`:
  `@media (prefers-reduced-motion: reduce){ *,::before,::after{ animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; scroll-behavior:auto!important } ::view-transition-group(*){ animation:none!important } }`
- Use `@supports (animation-timeline: view())` around scroll reveals. Content must be visible without them; never start content at `opacity:0` without the feature query.
- Tailwind v4 already exposes `motion-safe:` / `motion-reduce:` and `starting:` variants.

```bash
npm i motion                    # only when needed:  import { animate, inView } from "motion"
npm i @formkit/auto-animate     # optional, for live-updating tracker lists
```

---

### Summary of picks
1. **CSS:** Tailwind v4.3 (`@theme` tokens as the design system) + `[data-theme]` dark variant + hand-written prose layer. Keep tokens portable as CSS variables, to hedge Tailwind Labs' staffing risk.
2. **Components:** our own ~12 Astro components, using native `<dialog>`/popover/`<details>`, seeded from Starwind/Basecoat. No React. Use Ark/Bits only inside any future island.
3. **Icons:** Lucide (ISC) via astro-icon + `@iconify-json/lucide`, with Tabler as fallback. Inline SVG at build time, zero JS.
4. **Type:** Inter variable (wght+opsz) + Geist Mono via Astro's stable Fonts API with optimized fallbacks. Optionally Mona Sans Expanded for hero headlines. Avoid Fontshare (FFL forbids subsetting) and D-DIN (imitative).
5. **Motion:** native cross-document View Transitions, `@starting-style` and scroll-driven animations as progressive enhancement; Motion mini only if needed. No Lenis, no GSAP. Strict `prefers-reduced-motion`.


## 4. Data/backend and analytics for the superchargeddaily.com rebuild

Researched 2026-10-26 from live sources. npm versions come from `registry.npmjs.org` via curl. GitHub numbers come from github.com pages via WebFetch on the same day. Where GitHub hid the year on a release date, it is the current year (2026); those are marked "(2026, inferred)". Anything I could not confirm is marked **unverified**.

### 0. What the repo does today (read-only inspection)

- There are 43 workflow files in `.github/workflows/`. Most are `*-checks.yml` (CI). The data crons are: `news-snapshot` (`12,42 * * * *`), `updates-snapshot` (`20,50 * * * *`), `launches-refresh` (hourly at :17), `starlink-refresh` (3×/day), `robotaxi-refresh` (2×/day), `my-tesla-epa-refresh` (weekly), `newsletter-latest` and `home-build`.
- Of the 79 commits in the local (shallow) clone, 41 are by `github-actions[bot]`, and all 41 were made since 19 Oct. History is mostly bot commits.
- `.git` is **357 MB even as a shallow clone**. The biggest blobs are MP4s in `assets/dispatch/` (10–21 MB each). The 313 JSON blob versions add up to about 14 MB. Video is the real bloat, and bot JSON commits add steady growth on top of it.
- Upstreams used: `ll.thespacedevs.com` (a mix of **2.2.0** and **2.3.0** URLs), `planet4589.org` (McDowell stats and GCAT), `celestrak.org/NORAD/elements/gp.php?GROUP=starlink`, `teslascope.com/software`, `fsddb.com/robotaxi`, and `news.google.com/rss/search`.
- Supabase: `sd_private` schema plus bounded RPCs (`supabase/migrations/202610220001_members.sql`). Workers: `aljr-boards` (KV) and `sd-events`. `track.js` (36 lines) sends allow-listed events via `sendBeacon` to `sd-events.superchargeddaily.workers.dev/e`.

### 1. Platform candidates — facts

| Candidate | Stars / issues (GitHub) | Latest release (npm or GitHub) | Licence | Source |
|---|---|---|---|---|
| Supabase (platform) | 114k stars, 297 open issues, 876 PRs, 16.3k forks | GitHub "Developer Update – Aug 2026" (v1.26.08, 7 Aug 2026); CLI `supabase@2.122.0` (2026-10-23) | Apache-2.0 | github.com/supabase/supabase |
| supabase-js | 4.6k stars, 32 issues | `@supabase/supabase-js@2.118.0` (2026-10-15) | MIT | github.com/supabase/supabase-js |
| Cloudflare workers-sdk (wrangler) | 4.7k stars, 381 issues, 212 PRs | `wrangler@4.153.0` (2026-10-26) | Apache-2.0 / MIT | github.com/cloudflare/workers-sdk |
| Neon | 23.3k stars, 312 issues | `@neondatabase/serverless@1.2.0` (2026-10-01) | Apache-2.0 | github.com/neondatabase/neon |
| Turso (Rust SQLite rewrite, successor to libSQL) | 25.1k stars, ~1.1k issues | `@libsql/client@0.18.0` (2026-09-02) | MIT | github.com/tursodatabase/turso |
| Astro (for context; Cloudflare acquired the Astro team on 16 Jan 2026, and it stays MIT) | 63.5k stars, 17 issues | `astro@7.4.2` and `@astrojs/cloudflare@14.4.2` (2026-10-21) | MIT | github.com/withastro/astro, nasdaq.com press release 2026-01 |

#### Supabase (supabase.com/pricing, docs, changelog)

| | Free | Pro ($25/mo) |
|---|---|---|
| DB | 500 MB | 8 GB, then $0.125/GB |
| Egress (uncached / cached) | 5 GB / 5 GB | 250 GB / 250 GB, then $0.09 / $0.03 per GB |
| Auth MAU | 50,000 | 100,000 |
| Edge Function invocations | 500k | 2M, then $2/M |
| Realtime | 200 concurrent, 2M messages | 500 concurrent, 5M messages |
| Storage | 1 GB | 100 GB |
| **Pausing** | **"Free projects are paused after 1 week of inactivity"**; limit of 2 active free projects | not paused; spend cap on by default |

- **Edge Functions** (docs/guides/functions/limits): 150 s wall clock on Free and 400 s on paid, **2 s CPU per request** (async I/O wait not counted), 256 MB memory, 100 functions on Free. That is fine for fetch-and-parse jobs, but parsing the full CelesTrak Starlink GP JSON is close to the CPU budget. Benchmark it before moving that job.
- **pg_cron + pg_net**: officially supported for scheduling Edge Functions, with secrets kept in Vault. Supports `'30 seconds'` sub-minute syntax (pg_cron ≥1.5). Supabase Cron is still labelled **Beta**. Caveat from the docs: `pg_net` writes the decrypted key into `net.http_request_queue` until the request is sent.
- **API keys**: the `anon` and `service_role` JWT keys are being **deprecated by end of 2026**. Replacements are `sb_publishable_…` and `sb_secret_…` (docs/guides/api/api-keys). Action for the rebuild: ship the publishable key, and keep the secret key only in Workers or Edge secrets.
- **Breaking change in 4 days**: from **2026-10-30**, new tables in `public` are no longer exposed to the Data API automatically on existing projects, and need explicit `GRANT`s (changelog #45329). This project is mostly unaffected because data lives in `sd_private` behind RPCs. Still, any new `public` table or view needs `grant select on … to anon`.
- **2025–26 incidents** (from third-party trackers isdown.app and pingoru.io; check against status.supabase.com):
  - 7–9 May 2026: us-east-1-az4 connectivity.
  - 31 Aug 2026: project creation failing for 2.7 h.
  - 10 Sep 2026: Nano (free-size) projects went unresponsive after long uptime, and a manual restart was needed.
  - 24 Sep 2026: eu-west-1 hardware failure for about 2 h.
- No pricing change in 2026 was found; third-party guides from May to Sep 2026 match the current page.

#### Cloudflare (developers.cloudflare.com/workers/platform/pricing, /limits, /kv/platform/limits, /r2/pricing)

| | Free | Workers Paid ($5/mo minimum) |
|---|---|---|
| Requests | 100k/day | 10M/mo, then $0.30/M |
| CPU | **10 ms/invocation** | 30M CPU-ms/mo; cron jobs get 30 s (interval <1 h) or 15 min (≥1 h) |
| **Cron Triggers** | **5 per account** | 250 per account |
| Subrequests | 50/invocation | 10,000 |
| KV | 100k reads/day, 1k writes/day, 1 GB | 10M reads, 1M writes, 1 GB; **1 write/s per key**, 25 MiB values, cacheTtl ≥30 s |
| D1 | 5M rows read/day, 100k written/day, 5 GB | 25B read, 50M written per month, 5 GB |
| R2 | 10 GB-mo, 1M Class A, 10M Class B, **no egress fees** | same, then standard rates |
| Durable Objects | SQLite-backed only; 100k req/day | 1M req, then $0.15/M |

The free plan's 10 ms CPU and 5 cron triggers are too tight for about 8 fetch jobs that parse HTML/RSS. **Workers Paid at $5/mo is the realistic floor.** KV is eventually consistent; this is widely documented, but the propagation time is not stated on the limits page (**unverified** figure). That is fine for tracker JSON, but do not use it for counters (use D1 or Durable Objects for those).

#### Neon / Turso (brief)
- **Neon Free** (neon.com/pricing): 100 projects, **1 GB per project, 20 GB per account**, 100 CU-hours. It **scales to zero after 5 min, and this cannot be turned off**, so the first query pays a cold start. Paid plans are pay-as-you-go from $0.106/CU-h. It adds nothing that Supabase or D1 lacks for this site.
- **Turso Free** (turso.tech/pricing): 100 DBs, 5 GB, 500M rows read and 10M written per month; Developer plan $4.99/mo. Whether idle databases get archived is **unverified** (the page says only "idle databases cost only storage"). It is a good SQLite-at-edge option, but it overlaps with D1, which is already in the Cloudflare account.

#### GitHub Actions cron + committed JSON (the current approach)
GitHub's docs (docs.github.com, events-that-trigger-workflows) say:
- 5 minutes is the shortest schedule.
- Runs **"can be delayed"** at high load, and **"some queued jobs may be dropped"**, especially at the top of the hour. The repo already avoids :00.
- **Scheduled workflows are auto-disabled after 60 days without repo activity** on public repos.

Pros:
- Free.
- Git history doubles as an audit log.
- Build-time data is easy to use.

Cons:
- Every refresh is a commit, so about 100 or more bot commits per day at the current cadence. That noise drowns out editorial history and rebuilds Pages each time.
- Repo growth: JSON churn on top of 357 MB of MP4s.
- Merge races between bot pushes and human pushes.
- Freshness is only as good as the GitHub queue.
- Data cannot be refreshed without a deploy.

### 2. Upstream data APIs — status and terms

| Source | Status (2026-10-26) | Limits / terms | Implication |
|---|---|---|---|
| **Launch Library 2** (thespacedevs.com/llapi) | Live; **v2.3.0** is current. A 2.2.0 URL still answered 200 today. One request got a transient 502, and the retry succeeded. | **15 unauthenticated requests/hour**; higher rates through Patreon (tier prices **unverified**; a third-party doc says a key "bypasses the rate limit"). | Move every browser call (`see-the-launch`, calendar) to one server fetcher with edge caching. Standardise on 2.3.0. |
| **r/SpaceX API** (github.com/r-spacex/SpaceX-API) | **Archived and read-only since 6 Jun 2026**. `api.spacexdata.com/v4` and `/v5` returned **HTTP 522** on three attempts today. | Apache-2.0, 10.9k stars, 48 open issues (frozen). | **Do not use.** LL2 is the replacement. |
| **CelesTrak GP** (celestrak.org/NORAD/documentation/gp-data-formats.php) | Live. | Data is checked every 2 h. **Download each dataset only once per update, or get a 403.** More than 50 errors in 2 h puts the IP on the firewall, and removal needs manual review. Use `.org` (`.com` gives a 301). Do not fetch overlapping groups. | The current 3×/day schedule is safe. Never fetch from the browser, and stop retrying on any non-200. Shared GitHub runner IPs carry block risk; a fixed Worker egress is no better. Cache the last good file. |
| **McDowell planet4589** | Live (used today). | No formal API. Cite McDowell. | Keep the 8 h polite poll. |
| **Teslascope** | `/software` is public. robots.txt does not disallow it, but sends `Content-Signal: ai-train=no, search=yes, ai-input=no`. `teslascope.com/api` returns 404. The developer API is per-vehicle (Fleet-API auth). | No public fleet-stats API or reuse terms found (**unverified**). | Treat as a polite scrape (≥30 min, with a UA and contact). Cite Teslascope, and consider asking for permission. |
| **Tesla IR** | HTML press releases; there is no API. | Public. | It is event-driven, so fetch on demand or by hand (already the practice). |
| **TSLA quote: Alpha Vantage** (alphavantage.co/support) | Live. | **25 requests/day** free. **Real-time and 15-min-delayed US data are premium-only.** | Free tier gives end-of-day data only. |
| **Finnhub** | Live. | Official numbers not readable (JS page). Secondary sources say **60 calls/min, real-time US quotes, non-commercial only** (**unverified**). | Usable for a personal or small site. Check the terms, because the site carries affiliate links, which may count as commercial use. |
| **Polygon → Massive** (massive.com/pricing) | Renamed Polygon → Massive (reported as 30 Oct 2025; old endpoints keep working). | Basic $0: **5 calls/min, end-of-day only**, 2 years of history. Starter $29/mo: 15-min delayed, "individual use / non-pro". | End-of-day only on the free tier. |
| **Yahoo Finance** | No official API since 2017. The unofficial `query1/query2` endpoints are used by yfinance. | Undocumented limits; frequent 429s (yfinance issues #2128, #2297). No usage licence. | Avoid for production. |
| **X API** (docs.x.com/x-api/getting-started/pricing) | Pay-per-use is the default since 6 Feb 2026. The free tier is closed to new developers; Basic was migrated from 1 Jun 2026. | **$0.005 per post read**, $0.010 per user read, $0.015 per post create ($0.20 if it contains a URL). Cap of 3M reads/month. | Do not use the API for embeds. Use X's copy-paste embed, `widgets.js` or a static screenshot. Whether keyless oEmbed still works is **unverified**; test `publish.twitter.com/oembed` before relying on it. |

**TSLA recommendation:** one Worker cron every 5–15 min during market hours. It calls Finnhub `/quote` (60/min budget) and falls back to Massive or Alpha Vantage end-of-day data, then writes `tsla.json` with a `delayed`/`asOf` label. Never call these APIs from the browser, because that exposes the key.

### 3. Recommended tracker architecture

**Fetching runs in Cloudflare Workers Cron. Snapshots go to R2 (or KV). Pages read edge-cached JSON. Astro bakes the last good snapshot in at build time. Supabase stays for users (auth, comments, members), not for trackers.**

Why not Supabase for trackers?
- The free tier pauses after 7 days idle. The site is not idle, but cron alone may not count as activity, so this is **unverified**.
- Free egress is 5 GB/mo, which client fetches at 500k pageviews would exhaust.
- The Sep 2026 Nano-hang incident shows a small Postgres is a single point of failure.
- Cloudflare R2 has no egress fees, and the site will be hosted on Cloudflare anyway.

```
        ┌──────── Cloudflare Worker "sd-fetch" (Workers Paid, 1 Worker, N cron exprs) ────────┐
 cron → │ switch(event.cron): news(*/15) updates(*/30) launches(*/20) tsla(*/10 mkt hrs)     │
        │ starlink(25 */8) robotaxi(35 5,17) epa(weekly)                                     │
        │  fetch upstream ─► validate (schema + sanity: count>0, Δ<50%) ─► normalise          │
        │      ok  ─► R2 put  trackers/<name>/latest.json  + trackers/<name>/YYYY-MM-DD.json  │
        │      bad ─► keep previous latest; write trackers/<name>/status.json {ok:false,err}  │
        └──────────────────────────────────────┬───────────────────────────────────────────────┘
                                               │  (optional) POST deploy hook 1×/day or on
                                               │  "material change" → Astro rebuild
 Browser ──► superchargeddaily.com/data/<name>.json  (Worker route, reads R2)
             Cache-Control: public, max-age=60, stale-while-revalidate=600, stale-if-error=86400
             + ETag; payload {data, fetchedAt, source, ok}
 Astro build ─► fetch latest.json at build → inline into HTML (instant first paint, SEO)
 Client island ─► fetch /data/<name>.json after load; if newer, hydrate; if fail, keep baked
```

- **How pages get data:** hybrid. (1) **Build-time**: numbers are baked into HTML, which is good for SEO, gives no layout shift, and works with JS off. (2) **Edge JSON**: a small island refreshes the numbers. Pure client fetch from the origin API should not be used.
- **Caching:**
  - Serve R2 objects through a Worker using the Cache API, or put a custom domain on the R2 bucket.
  - Set `s-maxage` to match each tracker's cadence (news 300 s, Starlink 3600 s).
  - Use `stale-while-revalidate` so users never wait. Cloudflare's edge honours SWR on cached responses; how far behind it lags is **unverified**, so also set the browser-side max-age short.
- **Graceful failure:**
  - Each payload carries `fetchedAt` and `ok`.
  - The UI shows "Updated 3 h ago" and switches to an amber "source delayed" state past 3× the cadence. It never shows blanks or zeros.
  - The Worker never overwrites good data with an empty result.
  - It stops CelesTrak retries on any non-200, as CelesTrak's policy requires.
  - A daily `status.json` drives a `/status` page. That page replaces `intel-health.html` checks.
- **History:** keep append-only daily snapshots in R2, or rows in **D1** for charts (Starlink count, software waves, robotaxi registrations). That replaces committing `data/*-history.json` to git.
- **What stays in GitHub Actions:** CI checks, the weekly EPA job and quarterly IR copies. These are editorial and low-frequency, so committing them as reviewed data is fine. Move all jobs that run every 30 minutes or so off Actions. Also move the MP4s to R2 or Cloudflare Stream, and consider `git filter-repo` to purge them.
- **Cost:** Workers Paid $5/mo covers about 8 crons and roughly 3k invocations/day, so it is far below the quotas. R2 and KV fit comfortably in the included tiers. Supabase stays Free, but **upgrade to Pro ($25) only if comments become core**, to avoid pausing and the Nano limits.

Setup sketch:
```bash
npm create cloudflare@latest sd-fetch -- --type=hello-world --ts   # wrangler 4.153.0
npx wrangler r2 bucket create sd-trackers
npx wrangler d1 create sd-history            # optional, for time series
npx wrangler secret put FINNHUB_KEY ; npx wrangler secret put LL2_KEY   # if Patreon key
# wrangler.toml
#   [triggers] crons = ["*/15 * * * *","*/20 * * * *","25 */8 * * *","35 5,17 * * *"]
#   [[r2_buckets]] binding="TRACKERS" bucket_name="sd-trackers"
#   routes = [{ pattern="superchargeddaily.com/data/*", zone_name="superchargeddaily.com" }]
npx wrangler deploy && npx wrangler tail sd-fetch
```
Prerequisite: Worker routes need the zone proxied (orange cloud). *Editor's note: live checks on 2026-10-26 show the apex is already proxied; the "DNS-only" comment in `workers/wrangler.toml` is stale.*

### 4. Analytics — comparison

Script sizes were measured today with curl and `gzip -9`, using each vendor's default script.

| Tool | Stars / open issues | Latest release | Licence | Script (raw / gz) | Cookieless, no consent banner* | Price ~100k / 200k / 500k PV per month | Custom events / outbound links | First-party proxy |
|---|---|---|---|---|---|---|---|---|
| **Plausible Cloud** | 29.7k / 27 (plausible/analytics) | v3.2.1, 15 May (2026, inferred) | AGPL-3.0 (tracker MIT) | 2.8 KB / 1.3 KB (`script.js`); outbound variant 1.5 KB gz; new per-site `pa-*.js` | Yes, no persistent IDs, EU-hosted | Starter $19 / $29 / $49; Growth $29 / $44 / $74; Business $39 / $59 / $99. Yearly = 10× monthly. Custom events count toward the quota. | Yes; outbound links via codeless goals; custom properties need Business | Yes. Official docs for Cloudflare Worker and others; managed proxy only on Enterprise |
| **Plausible CE** (self-host) | 2.9k / 39 (plausible/community-edition) | v3.2.1 | AGPL (app); CE repo MIT | same | same | Hosting cost only. Needs about 2 GB RAM, ClickHouse and an SSE4.2 CPU. | Same features; releases are LTS twice a year | Yes |
| **Umami Cloud** | 39.7k / 68 | v3.4.1, 23 Oct (2026, inferred) | MIT | 4.8 KB / 2.3 KB | Yes | Hobby $0 for 100k **events**, 1 site, 6-month retention. Pro $20 for 1M events, then $0.00003/event (about $20 up to 500k PV, plus events). | Yes on all plans; outbound links via `data-umami-event` | Yes. Self-host: rename script and collect path (`TRACKER_SCRIPT_NAME`, `COLLECT_API_ENDPOINT`; names unconfirmed in official docs) |
| **Umami self-host** | same | v3.x is **PostgreSQL-only** (MySQL dropped) | MIT | same | Yes | Hosting only. It could use a Postgres such as Neon. Do not put it on the Supabase free DB, because of the 500 MB cap. | Yes | Yes (fully first-party) |
| **Fathom** | closed source | n/a (`fathom-client` npm 3.7.2, 2024-07-10, community wrapper) | proprietary | 7.0 KB / 2.1 KB | Yes | $15 / $25 / $45; 7-day trial with card required | Yes, and events count as pageviews | **Custom domains discontinued in 2023** (changelog mar2023-firewall-settings) |
| **Simple Analytics** | closed source | n/a | proprietary | 7.5 KB / 3.8 KB | Yes | Free (30-day history, badge required). Self-serve from $20/mo at 100k. Tier data parsed from the page: about $30 at 250k and $40 at 500k (**verify**). | Yes, billed as datapoints | Proxy help only on Enterprise |
| **Cloudflare Web Analytics** (already installed) | closed source | n/a | proprietary | 31.9 KB / 10.3 KB | Says it collects no personal data (cookie use not stated in docs) | **Free** | **No custom events** (FAQ). Dashboard queries are sampled; 6 months of access. | No. Ad blockers block it. Edge analytics need a proxied zone. |
| **PostHog** | 40.5k / ~3.9k (PostHog/posthog) | `posthog-js@1.438.23` (2026-10-26) | MIT (`ee/` dir excluded) | `array.js` 336 KB / 106 KB | Cookieless mode exists | 1M events/mo free; per-event pricing beyond that "as low as $0.0000090" at volume (exact first-tier rate **unverified**); anonymous events cost 10× less | Yes (autocapture) | **Free managed reverse proxy**, or a Cloudflare Worker |
| **Pirsch** | 1.0k / 3 (pirsch-analytics/pirsch) | GitHub release **unverified**; `pirsch-sdk@2.10.1` (2026-08-02) | AGPL-3.0 (core library) | 11.8 KB / 3.5 KB (`pa.js`) | Yes (hashes IP+UA) | Standard $12 / $18 / $36; Plus $27 / $45 / $99 (from page data) | Yes, events count as PV | Yes ("Script Proxies", server-side API) |
| **GoatCounter** | 6.1k / 44 (arp242/goatcounter) | v2.7.0, 2025-12-15 | EUPL-1.2 (modified) | 9.2 KB / 3.3 KB | Yes | Free for "reasonable public usage"; high-volume sites should self-host or donate | Events are basic (no properties); outbound links possible via `goatcounter.count` | Self-host only |
| **Vercel Analytics** | closed source | `@vercel/analytics@2.0.1` (2026-03-12) | proprietary (SDK MIT, **unverified**) | 4.5 KB / 2.0 KB | Yes | Hobby 50k events, no custom events. Pro **$0.03 per 1k events** (about $3 / $6 / $15) on top of Vercel Pro $20 | Custom events Pro only (2 properties; 8 with Plus at +$10) | Only on Vercel hosting (`/_vercel/insights`), so **a poor fit for Cloudflare** |

\* No cookies or local storage of identifiers usually means no ePrivacy consent banner under EU and Irish guidance. The site's owner is in Dublin. Get legal confirmation; this is not legal advice.

#### Analytics recommendation
1. **Primary: Plausible Cloud Starter.** About $19/mo at 100k pageviews or $190/yr; $49/mo at 500k. It is proxied first-party through a 20-line Cloudflare Worker at `superchargeddaily.com/sa/*` (forwarding `X-Forwarded-For`). Why Plausible:
   - It has the smallest script measured (1.3 KB gzipped).
   - It is EU-hosted, which suits an Irish operator.
   - Outbound links and form goals can be tracked without code.
   - Its open-source CE is an exit route.
   - Custom events count toward the quota, so keep the event list tight. The current `track.js` allow-list (8 events) maps one-to-one to Plausible goals.
2. **Budget alternative: Umami Cloud Hobby (free)** up to 100k events/mo. Above that, use Umami Pro at $20 for 1M events, which is the cheapest at 500k pageviews if events stay below about 500k. Self-hosted Umami on a $5 VPS with Postgres is the fully first-party option.
3. **Keep Cloudflare Web Analytics** as a free, independent baseline (and for Core Web Vitals). It cannot do custom events.
4. **Retire or keep `sd-events`?** Keep it only for counts Plausible cannot hold, such as per-referral-code revenue attribution. Otherwise send `sdTrack(n)` to `plausible(n, {props:{path}})` and delete the Worker. That removes one KV write per event. `sd-events.js` line 18 does `kv.get` then `kv.put` (read-modify-write) for each event. That loses counts under concurrency (1 write/s per key, eventually consistent) and hits the free tier's 1k writes/day at around 1k events. If the sink is kept, move the counters to D1 (`UPDATE … SET n=n+1`) or a Durable Object.
5. Avoid PostHog for this site (106 KB gzipped). Vercel Analytics is tied to Vercel hosting, and Fathom has no proxy.

Setup (Plausible plus a Worker proxy):
```js
// workers/sa-proxy.js  — route: superchargeddaily.com/sa/*
export default { async fetch(req) {
  const u = new URL(req.url);
  if (u.pathname === "/sa/js/script.js") return fetch("https://plausible.io/js/script.outbound-links.js", { cf: { cacheTtl: 86400 } });
  if (u.pathname === "/sa/api/event") { const r = new Request("https://plausible.io/api/event", req);
    r.headers.delete("cookie"); return fetch(r); }  // CF adds X-Forwarded-For
  return new Response("", { status: 404 }); } };
// <script defer data-domain="superchargeddaily.com" data-api="/sa/api/event" src="/sa/js/script.js"></script>
```
Note: Plausible's 2025+ snippet is a per-site `pa-XXXX.js` (seen on plausible.io itself). Copy the exact snippet from the dashboard and proxy that path instead. Script-option names may differ from the legacy `data-api` attribute.

### 5. Known problems and risks (summary)
- **Supabase:**
  - Free projects pause after 7 days of inactivity.
  - Legacy keys are deprecated by end of 2026, so migrate to `sb_publishable_`.
  - Table-grant enforcement starts 30 Oct 2026.
  - Supabase Cron is still Beta.
  - Edge Functions are limited to 2 s CPU.
  - The Nano-hang incident in Sep 2026.
- **Cloudflare:**
  - The free plan's 10 ms CPU and 5 crons are too small for these jobs.
  - KV allows 1 write/s per key and is eventually consistent.
  - The apex must be proxied for Worker routes (it already is — see the correction at the top).
- **GitHub Actions:** cron runs are delayed or dropped at load, auto-disabled after 60 days idle, cause commit bloat and race with human pushes.
- **Upstreams:**
  - The r/SpaceX API is dead.
  - LL2 allows 15 requests/hour per IP, and today returned an intermittent 502.
  - CelesTrak's 403 and firewall rules are strict.
  - The Teslascope terms are unclear.
  - Yahoo Finance is unofficial.
  - Free stock tiers are end-of-day or non-commercial.
  - The X API charges per read.


## 5. Newsletter platform and monetisation (superchargeddaily.com)

All pricing pages checked **2026-10-26**. "unverified" = could not be confirmed against a primary source today.
Third-party figures are labelled as such. GitHub stars apply only to open-source tools; for SaaS the company status is given instead.

### 0. What the repo does today (read-only check)

- `newsletter.js`: the form does **not** POST. On submit it redirects (`location.href`) to
  `https://alexs-newsletter-84b17e.beehiiv.com/?email=…&utm_source=website&utm_medium=site-*&utm_content=<topic>`.
  Beehiiv's hosted page finishes the signup. Topic (roadster / tesla-software / spacex / tesla / website) is sent in `utm_content` and drives the 5 tag automations.
  Cost to page speed: zero (no iframe, no third-party JS). Cost to conversion: the reader leaves the site and has to confirm on a second page.
- `newsletter-cta.js`: wires the nav "Subscribe" link to the inline block. No third-party code.
- `.github/workflows/newsletter-latest.yml` + `scripts/newsletter-latest.js`: reads the **public Beehiiv sitemap** (no API key) on Sundays at 13:30 UTC plus a daily safety-net run, then writes `data/newsletter-latest.json`. Current value: slug `supercharged-daily-musk-s-big-earnings-week`, **issueCount 3**. So the list is small and still early.
- Publication runs on the `*.beehiiv.com` subdomain, so there is no custom web domain yet.
- `gear.html`: 22 links marked `rel="sponsored noopener"`, going to TESMAG (teslaacessories.com, `referral_code=…`, a Shopify-style affiliate plugin) and EV Bandit. There is a disclosure line next to each block and in the footer. The Tesla referral link `ts.la/alex474841` is labelled "Referral link: we may earn a reward". This is already well done.

### 1. Newsletter platforms

#### 1.1 Beehiiv: plan rename of 1 Oct 2026 (important for timing)
On 1 Oct 2026 Beehiiv renamed its plans: Launch→**Free**, Scale→**Lite**, Max→**Pro**; Enterprise kept its name. New prices apply to new customers now. **Existing customers move to them at their first renewal on or after 1 Nov 2026**, with at least 30 days' notice for monthly billing (ppc.land, pricingsaas.com). This customer has a Welcome automation plus 5 tag automations, and automations are a Lite-and-up feature, so they may already be on a paid plan. **Check Settings → Billing before 1 Nov.** The current plan is unverified.

| Beehiiv plan (pricing page, 2026-10-26) | Free | Lite | Pro | Enterprise |
|---|---|---|---|---|
| Price, up to 1k subs (monthly / annual) | $0 | $59 / $49 | $109 / $95 | custom |
| Subscriber cap | 2,500 | 100,000 | 250,000 | custom |
| API (read posts, create subscriptions) | yes (no Send API) | yes | yes | yes |
| **Create Post API (drafts)** | no | no | **yes** (help article updated 6 Aug 2026; calls default to `draft` since 6 Aug 2026) | yes |
| RSS-to-Send | no | no | yes | yes |
| Automations | no | 10 live | unlimited | unlimited |
| Ad Network | no | yes (not on trial; not every region) | yes | yes |
| Paid subscriptions | no | yes (0% take rate) | yes | yes |
| Custom HTML blocks | no | yes | yes | yes |
| Remove branding / webhooks | no | no | yes | yes |
| Custom web domain | **conflicting** (feature list says yes; comparison table says no) | yes | yes | yes |
| Hosted web archive | yes | yes | yes | yes |
- Price at 10k subs: The Verge reports Lite $139/mo and Pro $239/mo; the pricing page with yearly billing shows Lite $119 and Pro $199 (ppc.land). Pricing URL: https://www.beehiiv.com/pricing
- Ad Network: CPM (unique opens) or CPC; payouts on the 20th for the previous month; email sends only (support article, updated 1 Oct 2026). Boosts (paid recommendations) pay per acquired subscriber; third-party sources quote about $1.50–3.00 (unverified).
- Company: private and VC-backed. The latest confirmed round is a $33M Series B led by NEA (2024). No 2026 round found. Revenue estimates are around $30M ARR in 2025 (Sacra/Latka, third-party).

#### 1.2 Alternatives

| Platform | Price at ~1k / 10k subs | API draft creation | Archive on own domain | Monetisation built in | Status / licence |
|---|---|---|---|---|---|
| **Beehiiv** | Free ≤2.5k; Lite $49–59 | Pro+ only | Beehiiv web on custom domain (paid), or our own build from the API | Ad Network, Boosts, paid subs | SaaS, VC-backed |
| **Kit** (ex-ConvertKit) | Free ≤10k (1 automation, 1 sequence, no integrations); Creator $39/mo at 1k, $139 at 10k; Pro $79 / $189 (emailvendorselection.com, 9 Aug 2026; kit.com/pricing returned 403 today) | **yes**: `POST /v4/broadcasts` with `send_at: null` saves a draft (developers.kit.com). Plan gating is unverified; integrations are paid-only per the third-party source | Kit landing pages; our own build from the API | Creator Network recommendations, paid newsletters, sponsor network (plans unverified) | SaaS, private |
| **Buttondown** | Free ≤100 subs. Base price above that unverified (third party: about $9 at 1k, about $89 at 10k, PriceWorld Feb 2026). Add-ons: automations +$29, RSS-to-email +$9, custom-domain archive +$29, paid subs +$9, sponsorships +$29 (buttondown.com/pricing) | REST API exists (docs.buttondown.com). Draft status and plan gating are unverified | +$29/mo add-on | Paid subs and sponsorship add-ons | SaaS, small independent company |
| **Ghost (Pro)** | Starter $18/mo (1k members, no custom integrations or paid subs); **Publisher $29/mo** (1k members, Admin API, paid subs, 0% Ghost fee, 3 newsletters); Business $199 (10k) (ghost.org/pricing, yearly billing) | **yes**: the Admin API creates draft posts and sends them as newsletters (Publisher+) | Native: Ghost *is* the site, or run it headless behind Astro | Memberships and paid tiers (Stripe, 0% fee), ActivityPub "social web" on every plan | OSS, **MIT**, 55.6k stars, 42 open issues, latest **v6.72.0 (20 Oct 2026)**; the Ghost Foundation is a non-profit |
| **Substack** | Free; **10% of paid revenue** plus Stripe fees; custom domain $50 one-time; sending address stays on substack.com | No public publishing API (only "Developer API Terms"; unverified) | Weak (one $50 custom domain per publication) | Paid subs; network growth | SaaS, VC-backed (2026 status unverified) |
| **MailerLite** | Plans are now **Free / Comfort (from $12) / Power (from $25)**. Free = 250 subs, 2,500 emails/mo, 3 automations; API on Free "limited, doesn't include sending" (mailerlite.com/pricing) | Campaign API on paid plans (gating unverified) | Its own site builder | Paid newsletters on paid plans | SaaS, private |
| **Loops** | Free: first 1,000 contacts, 4,000 sends per rolling 30 days, Loops branding; Growth $49/mo ≤5k (loops.so/pricing) | Campaigns API unverified | none | none | SaaS, VC-backed (unverified) |
| **Resend** | Marketing Free 1,000 contacts; Pro $40 (5k), $80 (10k) (resend.com/pricing) | `/broadcasts` API (create and schedule specifics unverified) | none (we build it) | none | SaaS (YC-backed; unverified) |

**Ghost 6 / ActivityPub:** Ghost 6.0 shipped in Aug 2025 with ActivityPub (Notes, Inbox, follow from the fediverse; Bluesky only through a bridge). On Ghost(Pro) it is on every plan. Self-hosters either use ap.ghost.org (usage-limited) or run the AP service themselves; reports say that path was still in "preview" and has 2–4 GB RAM needs. No source says it has left preview (status unverified). This audience lives on X, not the fediverse, so ActivityPub is a minor plus here.

#### 1.3 Sign-up form options vs Core Web Vitals

| Option | Page-speed cost | UX | Double opt-in | Verdict |
|---|---|---|---|---|
| A. Redirect to Beehiiv page (today) | none | Reader leaves the site and confirms off-site; some drop-off | Beehiiv's default | OK, but leaks conversions |
| B. Beehiiv iframe embed (`embeds.beehiiv.com`) | iframe + third-party JS and fonts on every page; CLS risk unless the height is fixed | in-page | yes | **Avoid** on article pages |
| C. Native `<form method="POST">` → **Cloudflare Pages Function / Worker** → Beehiiv `POST /v2/publications/{id}/subscriptions` | none (same-origin POST, ~0 KB JS; progressive enhancement with `fetch`) | in-page "Check your inbox" | `double_opt_override: "on"`, `send_welcome_email`, `utm_*`, `custom_fields`, **`automation_ids`** (needs an "Add by API" trigger), `newsletter_list_ids` | **Recommended** |
- Option C notes: keep the API key in a Worker secret. Keep the honeypot (`input[name=website]`) and add per-IP rate limiting (Cloudflare WAF rate-limit rule or a KV counter). Load Turnstile only after the email field gets focus, never on page load. The Beehiiv docs list no plan requirement for the subscriptions endpoint ("API access: yes" on Free), but they don't publish rate-limit values. Map the topic to a custom field or automation so the 5 tag automations keep working (switch their triggers to "Add by API" or a custom-field condition, then test each).
- The form still works without JS: POST to `/api/subscribe`, which returns a 303 to `/subscribed/`.

#### 1.4 Public archive on our own domain (SEO)
- At Astro build time, fetch `GET /v2/publications/{id}/posts?status=confirmed&expand=free_web_content` (Beehiiv API, Free plan) or Kit/Ghost equivalents. Render `/newsletter/<slug>/` pages with our own layout, `Article` JSON-LD and a canonical URL on superchargeddaily.com. Fall back to the public sitemap the current workflow already uses if the API fails.
- Avoid duplicate content: either publish Beehiiv posts as **email-only** (no Beehiiv web copy), or keep the Beehiiv web copy and accept that it competes. Whether Beehiiv lets you set a cross-domain canonical is unverified, so check it in post settings.
- Rebuild trigger: the existing Sunday 13:30 UTC cron, or a Beehiiv webhook (webhooks are **Pro-only**). The cron is enough.

#### 1.5 Sunday send workflow
1. **Sat 18:00 UTC GitHub Action** (no paid plan needed): build "This week's top stories" from the site's own data (`feed.xml`, or a ranking by Cloudflare Web Analytics or Supabase comment counts). Render an email-safe HTML block: 5–7 items, each with a 1-line summary, UTM-tagged links and one image. Commit it to `data/newsletter-draft.html` and email or Slack the owner a preview link.
2. **Sun morning:** the owner pastes the block into the Beehiiv editor (a Custom HTML block needs **Lite**; on Free, paste rich text), writes the intro and the sponsor slot, and schedules the send.
3. **Fully automated draft** (the Action calls Create Post with `status:"draft"`) needs Beehiiv **Pro ($95–109/mo)**. Not worth it at about 3 issues and a small list. If API-created drafts become a must-have, **Kit Creator ($39/mo)** or **Ghost Publisher ($29/mo)** do it for much less (Kit `send_at:null`; Ghost Admin API draft).
4. **Sun 13:30 UTC:** the existing workflow updates "Read the latest issue" and, after the change in 1.4, rebuilds the archive page.

#### 1.6 Recommendation: **keep Beehiiv**, with conditions
- **Keep:** Ad Network + Boosts are the only built-in networks that pay a small list without touching the site's speed. Paid subs carry a 0% take rate on Lite. The 6 automations and the UTM-to-topic tagging are already built. A migration would force subscribers to re-confirm and risk deliverability.
- **Change now:** (a) move signup to option C (Worker → API, double opt-in), (b) build archive pages on our domain at build time, (c) attach `newsletter.superchargeddaily.com` or `mail.` as Beehiiv's sending and link domain for deliverability, if the plan allows it.
- **Switch trigger:** if the 1 Nov renewal pushes you to Lite and the Ad Network or Boosts haven't earned at least about $50/mo after ~3 months, **move to Kit** (free to 10k, with $39 Creator for API drafts) or **Ghost Publisher** (if paid memberships become the main revenue line, since Ghost replaces both Beehiiv and a DIY Stripe build). Don't pick Substack: 10% fee, weak own-domain SEO, no API.

### 2. Monetisation (ranked by revenue potential ÷ page-speed cost)

| # | Stream | Speed cost | Revenue potential (small, phone-first X audience) | Thresholds / facts (checked 2026-10-26) |
|---|---|---|---|---|
| 1 | **Direct sponsorships**: 1 newsletter slot + 1 static site slot (a server-rendered image or text card, fixed `aspect-ratio`) | **none** (first-party HTML) | Highest per reader; you set the price. A rule of thumb for niche tech newsletters is about $25–50 per 1,000 opens (unverified industry norm). Sell weekly or monthly site + email bundles to Tesla accessory, charging and EV insurance brands | No network needed. Use a simple media-kit page and an invoice through Stripe Payment Links. Label every slot "Sponsored" |
| 2 | **Affiliate links** (already live) | none (plain `<a rel="sponsored">`) | Steady and long-tail on gear and buying guides | TESMAG/EV Bandit are already linked. **Yeslak** runs a Tesla-accessory influencer programme (up to 12% in promotions). Tesery/Jowua/EV Bandit terms unverified, so ask each brand or check Impact/Awin/ShareASale. **Amazon Associates**: automotive rate reported at 3–4.5% (sources conflict), 24-hour cookie (90 days once in cart), 3 qualifying sales in 180 days to stay approved (single source, unverified) |
| 3 | **Beehiiv Ad Network + Boosts** | none on the site (email only) | Small but passive; scales with opens | Paid Beehiiv plan required (Lite+); CPM/CPC; payout on the 20th. Boosts about $1.50–3 per subscriber (third party, unverified) |
| 4 | **Tesla referral** | none | Low cash value. Buyers of Model 3/Y (and Model Y L from Aug 2026) get **3 months FSD (Supervised)**. Referrer reportedly gets **$250 in Tesla Credits** (some sources: no cash reward); **cap 10 referrals per year**; **Model S/X removed March 2026**; varies by market (EU: 2,000 km Supercharging). All third-party, so check in the Tesla app (tesla.com support returned 403) | Keep the existing link and "Referral link" label |
| 5 | **Memberships / paid tier** | low if done right | Medium at scale. Superfans of Tesla, SpaceX and xAI will pay for perks: ad-free, an early Sunday issue, a comments badge | **DIY Stripe + Supabase** (already has Google sign-in): Stripe Checkout/Payment Links redirect, webhook → Supabase `members.tier`. No Stripe.js on article pages. Stripe processing fees only. **Beehiiv paid subs** (Lite, 0% take). **Ghost** (Publisher, 0%). **Memberful** $49/mo + 4.9%. **Patreon** 10% for creators who published after 4 Aug 2025 (support.patreon.com) |
| 6 | **Tips** | none if it's a plain link (never the floating widget script) | Low | **Ko-fi**: 0% on donations on the free plan; Gold price conflicting ($6–12/mo). **Buy Me a Coffee**: 5% on everything. Plus processor fees |
| 7 | **X Original Content Rewards** (off-site) | none | Possibly meaningful given @ALJR86's reach | Creator Revenue Sharing **closed to new enrolments 7 Aug 2026, retired 7 Sep 2026**. Replaced by **Original Content Rewards** (launched 8 Aug 2026): Premium, 500 verified followers, about 500k verified Home-Timeline impressions in 90 days (third party; check Creator Studio). X Subscriptions for paid followers: current terms unverified |
| 8 | **Display ads** | **high** (100s of KB of JS, auctions on the main thread, INP and CLS risk) | Low until traffic is large; mobile news RPMs are thin | **AdSense**: no published traffic minimum; needs original content and a privacy policy. **Mediavine Journey**: 1,000 sessions/mo (Tier-1 traffic) since 15 Jan 2026, 70% share, **requires the Grow script for 30 days** (third party; the official page was 404). Main Mediavine network: about $5k/yr ad revenue (third party). **Raptive**: 25,000 PV/mo since Oct 2025 (raptive.com blog), 50% Tier-1 traffic below 100k. **Ezoic**: 250,000 users for new sites since 19 Feb 2026 (support.ezoic.com), so out of reach. **EthicalAds**: developer audiences, 50k+ PV, one ad per page above the fold, so **not a fit**. Carbon Ads: current terms unverified |

#### 2.1 If display ads are ever added: guardrails for CWV
- **No ads above the fold** on article pages, and none in the first ~2 paragraphs. At most 1 in-content slot per ~600 words, plus 1 at the end.
- **Reserve space in CSS**: `min-height` per breakpoint, set in CSS rather than JS. Don't shrink the slot to fit the creative. Use fluid sizes only below the fold. Start likely-to-fill slots expanded, since `collapseDiv` causes shifts. Target p75 CLS < 0.1 (Google Publisher Tag guide, updated 2025-07-31).
- **Lazy-load**: inject the ad script only on the first scroll or interaction, or through `requestIdleCallback`. Request slots with an IntersectionObserver about 1 viewport ahead. Turn off AdSense **Auto ads** (they insert anchors and vignettes and reflow content).
- **INP**: keep ad JS off the critical path. Cap refresh rates. Never on the homepage or tracker pages that readers land on from X.
- **Partytown**: the package **moved to `@qwik.dev/partytown`, v1.0.2, published 2026-10-22, MIT** (npm). `@builder.io/partytown` 0.10.3 (Dec 2024) is **deprecated** ("Use @qwik.dev/partytown instead"). Weekly downloads: 134k old, 84k new. Repo QwikDev/partytown has 13.8k stars (open-issue count not shown). `@astrojs/partytown` 2.1.9 (2026-10-21) depends on `@qwik.dev/partytown ^1.0.1`. So it is maintained again, but the README still says it "is not guaranteed to work in every scenario". **Use it for analytics/pixels only. Don't put ad auctions (AdSense/GPT) in a worker**; that compatibility is unverified and it's generally not recommended.
- Measure with RUM (Cloudflare Web Analytics or the `web-vitals` library sending to Supabase) on phones, and A/B the ad pages against control pages.

#### 2.2 Disclosure requirements
- **FTC (US)**: affiliate commissions, referral credits, gifted products and paid sponsorships are "material connections". Disclose them **clearly and conspicuously, right next to the link or recommendation and before the click**. A footer or separate page alone is not enough. Applies in email too (FTC Endorsement Guides, revised 2023; primary text not re-fetched today). Use plain words: "Affiliate link: I earn a commission", "Sponsored by X". Avoid vague "partner links".
- **UK (ASA/CAP + CMA)**: affiliate links, discount codes and self-promotion must be **obviously identifiable as ads**. Prefer "Ad" / "Advert" / "Affiliate link: ad"; "aff", "sponsored" or "#spon" on their own have been ruled insufficient. **Since 6 Apr 2025, the CMA can fine directly under the DMCC Act**: up to 10% of global turnover or £300k, whichever is higher (RPC note Jan 2026; ASA influencer guide 2023 ed.).
- **Practical:** the site already labels links. Add an "Ad"/"Sponsored" label on every sponsor slot in email and on the web, put "(affiliate)" inline in newsletter gear mentions, and use `rel="sponsored"` on every paid link (SEO).

### 3. Setup steps (in order)

1. **Before 1 Nov 2026:** confirm the current Beehiiv plan and renewal date, and decide Free vs Lite under the new pricing.
2. Cloudflare Worker `/api/subscribe`: secret `BEEHIIV_API_KEY` and `PUB_ID`; body `{email, double_opt_override:"on", send_welcome_email:true, utm_source:"website", utm_medium, utm_campaign:path, utm_content:topic, custom_fields:[{name:"topic",value}], automation_ids:[…]}`. Return 303 to `/subscribed/` and JSON for `fetch`. Add a rate-limit rule and keep the honeypot.
3. Switch `newsletter.js` from redirect to a `fetch` POST, keeping the plain form POST as the no-JS fallback. Re-test all 5 tag automations plus Welcome, end to end.
4. Astro build: a `newsletter` content loader (Beehiiv posts API, with a sitemap fallback) → `/newsletter/` index and `/newsletter/[slug]/`, plus RSS. Add it to the sitemap. Publish Beehiiv posts email-only, or verify canonical settings.
5. Saturday "top stories" Action → `data/newsletter-draft.html` + a preview notification. The owner pastes it on Sunday. Reconsider the Pro or Kit API draft once the list is past about 2.5k.
6. Sponsorship: a `/sponsor/` media-kit page (audience, opens, CTR, X reach, pricing), one fixed-size first-party sponsor card component (`aspect-ratio`, `loading="lazy"` below the fold), and a "Sponsored" label.
7. Affiliate: apply to Amazon Associates (US/UK) and Yeslak, and ask Tesery/Jowua/EV Bandit about Impact/Awin programmes. Keep the disclosure next to each link and add it inline in emails.
8. Memberships (phase 2): Stripe Payment Links → webhook (Supabase Edge Function) → `profiles.tier`. Perks: ad-free (once ads exist), an early or bonus Sunday section, a badge in comments.
9. Tips: a plain Ko-fi link in the footer and the newsletter footer (no widget JS).
10. Display ads: only after about 25k PV/mo (Raptive) or a clear AdSense test on 2–3 evergreen pages, with the guardrails in 2.1 and no Partytown for ads.

### Sources (fetched/searched 2026-10-26)
beehiiv.com/pricing · beehiiv support 36759164012439 (Create Post, updated 6 Aug 2026) · beehiiv support 17525818225431 (Ad Network, updated 1 Oct 2026) · developers.beehiiv.com/api-reference/subscriptions/create · ppc.land (beehiiv price rise) · pricingsaas.com/companies/beehiiv · emailvendorselection.com/kit-pricing (9 Aug 2026) · developers.kit.com/api-reference/broadcasts/create-a-broadcast · buttondown.com/pricing · ghost.org/pricing · github.com/TryGhost/Ghost (+/releases) · blog.matthewbrunelle.com (Ghost 6 AP) · mailerlite.com/pricing · loops.so/pricing · resend.com/pricing · registry.npmjs.org (@qwik.dev/partytown, @builder.io/partytown, @astrojs/partytown) · github.com/QwikDev/partytown · developers.google.com/publisher-tag/guides/minimize-layout-shift · raptive.com blog + ppc.land (25k PV) · support.ezoic.com (250k) · jupiter.co / productiveblogging.com (Mediavine Journey) · ethicalads.io publisher guide/policy · notateslaapp.com/news/3746, teslarati.com, driveteslacanada.ca (Tesla referral) · getlasso.co (Amazon rates) · yeslak.com influencer programme · help.x.com creator-revenue-sharing + aiweekly.co (Original Content Rewards) · support.patreon.com 36426991446797 · builtbyfoundry.io (Memberful) · schoolmaker.com (Ko-fi/BMAC) · rpclegal.com (ASA/CMA 2026) · asa.org.uk influencers guide.


## 6. Testing & quality tooling (superchargeddaily.com)

Researched 2026-10-26. All versions, dates and download counts were pulled live on that date:
- npm data: `registry.npmjs.org/<pkg>` (latest dist-tag + publish time + licence) and `api.npmjs.org/downloads/point/last-week/<pkg>`.
- GitHub data: GitHub repo-search API via the GitHub MCP tool (stars, `open_issues_count`, licence, archived flag). Note that GitHub's `open_issues_count` **includes open PRs**.
- Non-npm versions: proxy.golang.org (Go tools), crates.io (lychee), pypi.org (pre-commit).
- "unverified" means I could not confirm the figure from a live source.

### 0. Starting point (read from the repo, nothing modified)
- 77 files in `tests/`: about 30 `*-browser.py` Playwright-Python journeys, about 30 `*.test.mjs` Node unit tests, and about 12 `test_*.py` (including `test_seo_audit.py`).
- 43 workflow files in `.github/workflows/`. Most are per-feature `*-checks.yml` files gated by path filters. They use `actions/checkout@v4`, `setup-python@v5` and `setup-node@v4`, and install Playwright with `pip install playwright==1.62.0`.
- `site-quality.yml` already runs **Lighthouse 13.0.1 directly** (no LHCI): 3 mobile runs per page against the deployed site, with `continue-on-error: true`. That choice holds up (see §4).
- There is no shared harness, viewport/theme matrix, a11y engine, link checker, linter or formatter.

### 1. End-to-end testing

| Tool | Latest (date) | npm/wk | Stars | Open issues+PRs | Licence |
|---|---|---|---|---|---|
| @playwright/test | 1.64.1 (2026-10-14) | 49.8M | 98,564 (microsoft/playwright) | 194 | Apache-2.0 |
| Playwright for Python (PyPI) | 1.64.1 (2026-10-22) | n/a | (same repo family) | — | Apache-2.0 |
| Cypress | 16.2.0 (2026-10-14) | 3.53M | 51,016 | 1,154 | MIT (app); Cloud is paid |
| WebdriverIO (`webdriverio`) | 10.1.0 (2026-10-18) | 1.47M | 9,860 | 226 | MIT |

- **Playwright Test.** One runner covers Chromium, Firefox and WebKit. It has built-in `toHaveScreenshot`, sharding, and per-project viewports and `colorScheme` (so 390/768/1440 × light/dark is just 6 projects). Recent releases add `reducedMotion`, `forcedColors` and `contrast` options (1.63), lossless WebP baselines (1.62), and a bundled MCP server and `playwright-cli` (`npx playwright mcp`, 1.62). Playwright 1.56 added test agents (planner, generator, healer). For a Claude Code workflow, the MCP and agents tie-in is the main advantage. The Python scripts already use the same engine, so porting them is mechanical.
- **Cypress.** Good developer experience, but it runs inside the browser and has no WebKit/Safari parity. Parallel runs and dashboards need Cypress Cloud: Starter is free with 500 test results/month, Team is $799/yr (cypress.io/pricing). It also has 6× the open issues of Playwright. Little benefit for this site.
- **WebdriverIO.** It is built on WebDriver BiDi and suits real-device or cloud-grid testing (BrowserStack, Sauce). That is overkill for a static news site.
- **Verdict:** use **@playwright/test** in TypeScript. Keep the Python scripts until each one is ported, or keep `pytest-playwright` 0.10.0 (2026-10-08) for the Python data tests.

### 2. Visual regression

| Tool | Latest (date) | npm/wk | Stars | Issues+PRs | Licence | Cost for 1 person |
|---|---|---|---|---|---|---|
| Playwright `toHaveScreenshot` | ships in 1.64.1 | — | — | — | Apache-2.0 | free, baselines live in git |
| Argos CI (`@argos-ci/playwright`) | 7.8.0 (2026-10-21) | 148k | 649 (argos-ci/argos) | 0 | MIT | **Hobby free: 5,000 shots/mo**, private repos and commercial use allowed. Pro $100/mo for 35k |
| Chromatic (`chromatic`) | 18.13.3 (2026-10-22) | 4.97M | 341 (chromatic-cli) | 51 | MIT (CLI) | Free 5,000 snapshots/mo, Chrome only. Starter $179/mo |
| Percy (`@percy/cli`) | 1.32.12 (2026-10-21) | 299k | 87 (percy/cli) | 62 | MIT (npm) | Free 5,000/mo per BrowserStack docs. Paid ≈$599/mo per Argos's July 2026 blog (vendor-competitor source, unverified) |
| BackstopJS | 6.3.25 (**2024-09-07**) | 55.5k | 7,190 | 576 | MIT | free, but no release in 2+ years |
| reg-suit | 0.14.5 (2025-08-26) | 75.7k | 1,303 | 72 | MIT | free (S3/GCS + GitHub app) |
| Lost Pixel | 3.22.0 (2024-11-14) | 21.1k | 1,678 | 67 | MIT | **Repo archived 2026-04-22.** "Lost Pixel is joining Figma… sunsetting the product". Do not adopt. |

- 6 shots per template (3 widths × 2 themes) × about 10 templates = 60 shots per run. Argos/Chromatic/Percy free tiers (5k) allow about 80 full runs a month, which fits PR-only visual runs.
- **`toHaveScreenshot` gotcha.** Baselines are OS/browser specific, named like `name-chromium-linux.png`. The docs warn that rendering varies with OS, hardware and headless mode, and say to generate baselines in the same environment that compares them. In practice, pin the `mcr.microsoft.com/playwright:v1.64.1-noble` container for both local `--update-snapshots` and CI. Docker is my inference; the docs do not name it. Use `stylePath` to hide volatile content (timestamps, live tickers), plus `maxDiffPixels`.
- **Verdict:** start with **built-in `toHaveScreenshot`** (zero cost, zero vendor). Add **Argos Hobby** only if reviewing PNG diffs in GitHub artifacts gets painful. Argos's Playwright integration reuses the same tests.

### 3. Accessibility (target: WCAG 2.2 AA)

| Tool | Latest (date) | npm/wk | Stars | Issues+PRs | Licence | Engine / layer |
|---|---|---|---|---|---|---|
| axe-core | 4.14.0 (2026-10-05) | 52.8M | 7,710 | 448 | MPL-2.0 | Runtime DOM rules |
| @axe-core/playwright | 4.14.0 (2026-10-15) | 10.0M | 728 (axe-core-npm) | 105 | MPL-2.0 | axe inside Playwright |
| pa11y | 10.0.0 (2026-08-28) | 147k | 4,585 | 59 | LGPL-3.0 | HTML_CodeSniffer (default) and/or axe 4.13 via Puppeteer 25 |
| pa11y-ci | 5.0.0 (2026-10-05) | 70.4k | 645 | 59 | LGPL-3.0 | Sitemap/URL-list runner for pa11y |
| Lighthouse a11y category | lighthouse 13.5.0 (2026-09-18) | 3.39M | 30,950 | 437 | Apache-2.0 | Subset of axe rules, as a 0–100 score |
| eslint-plugin-astro (a11y rules) | 3.2.1 (2026-09-17) | 688k | 434 | 23 | MIT | Static, 36 `astro/jsx-a11y/*` rules |
| eslint-plugin-jsx-a11y | 6.10.2 (**2024-10-26**) | 33.2M | 3,631 | 145 | MIT | **peer `eslint ≤ ^9`, so it will not install cleanly on ESLint 10** |
| eslint-plugin-jsx-a11y-x (fork) | 0.2.0 (2026-05-10) | 145k | unverified | unverified | MIT | peer `eslint ^9 \|\| ^10`. eslint-plugin-astro accepts either |
| IBM Equal Access `accessibility-checker` | 4.0.34 (2026-09-08) | 16.4k | 786 (IBMa/equal-access) | 144 | Apache-2.0 | IBM's own engine; tagged wcag22; Playwright/Puppeteer/Selenium/Cypress |

**What each covers against WCAG 2.2 AA:**
- **axe-core.** The only WCAG 2.2-specific rule is `target-size` (SC 2.5.8, tag `wcag22aa`), and it is **disabled by default**. You must pass `.withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'])`. axe covers contrast (1.4.3), names/roles/values (4.1.2), alt text (1.1.1), labels, lang, landmarks and similar checks. Deque's own (vendor) 2021 study claims automated axe finds about 57% of issues by volume, not 57% of success criteria.
- **pa11y with htmlcs.** This is a second, independent rule set with a different false-negative profile; its default standard is `WCAG2AA`. Its README does not mention WCAG 2.2, so treat it as 2.1-level coverage.
- **Lighthouse a11y.** It runs a subset of axe and gives a score. Use it as the "100" gate the brief asks for, not as the primary engine. A score of 100 does not mean WCAG conformance.
- **ESLint astro/jsx-a11y.** Catches template mistakes before render: alt text, `anchor-is-valid`, `no-autofocus`, `tabindex-no-positive`, `label-has-associated-control`. It cannot see computed styles, so it cannot check contrast.
- **IBM checker.** A third engine with explicit WCAG 2.2 tagging, but small community (16k/wk). Worth a weekly or nightly run, not a PR gate.
- **Not automatable, so keep a manual checklist:** 2.4.11 Focus Not Obscured, 2.5.7 Dragging Movements, 3.2.6 Consistent Help, 3.3.7 Redundant Entry, 3.3.8 Accessible Authentication (members pages), and keyboard order. Playwright can partly cover 2.4.7/2.4.11 by tabbing and asserting that the focused element's bounding box is in the viewport and not under the sticky header.
- **Verdict:** use **@axe-core/playwright** (with wcag22aa tags) on every template × viewport × theme in PRs, **eslint-plugin-astro + jsx-a11y-x** statically, the **Lighthouse a11y score** as the gate, and **pa11y-ci (htmlcs)** over the sitemap nightly.

### 4. Performance budgets & Core Web Vitals

| Tool | Latest (date) | npm/wk | Stars | Issues+PRs | Licence | Notes |
|---|---|---|---|---|---|---|
| lighthouse (raw CLI/node) | 13.5.0 (2026-09-18) | 3.39M | 30,950 | 437 | Apache-2.0 | What the repo already uses (13.0.1 pinned) |
| @lhci/cli (Lighthouse CI) | 0.15.1 (**2025-06-25**) | 1.21M | 7,117 | 164 | Apache-2.0 | **Pins `lighthouse: 12.6.1`.** No release in 16 months; repo not archived, still pushed 2026-10-23 |
| unlighthouse / @unlighthouse/cli | 0.19.1 (2026-10-03) | 21.7k / 47k | 4,916 | 33 | MIT | Depends on `lighthouse ^13.5.0`; crawls sitemap, `--budget`, static HTML report |
| web-vitals (RUM) | 6.2.3 (2026-10-05) | 33.6M | 8,660 | 14 | Apache-2.0 | LCP/INP/CLS/FCP/TTFB with attribution |
| PageSpeed Insights API v5 | n/a | — | — | — | Google API | Key optional (recommended); returns lab data plus CrUX field data, but Google says CrUX in PSI will be discontinued, so use the CrUX API instead |
| Cloudflare Observatory | n/a | — | — | — | Cloudflare | Synthetic Lighthouse + network tests + RUM (RUM is on by default for Free plans, EEA/UK/CH excluded). Docs page shows no CI API (unverified) |

- **LHCI maintenance status.** LHCI is effectively stalled on Lighthouse 12. Lighthouse 13 (announced 2025-10-10) removed or renamed audits into "insight" audits and needs Node 22.19+, so LHCI assertions written against 12-era audit IDs drift from what PSI shows. The repo's choice of running raw Lighthouse 13 is correct; keep it.
- **Unlighthouse** is the easiest whole-site sweep on Lighthouse 13 (`unlighthouse-ci --site … --budget 90`, or per-category `ci.budget` in `unlighthouse.config.ts`). Good for nightly runs; too slow for PRs.
- **PR gate.** Run raw Lighthouse (mobile preset, 3 runs, take the median) on 3–5 templates served from the built `dist/`. Fail on perf <90 or a11y/BP/SEO <100. Use median-of-3 because single runs are noisy on shared runners; the existing `performance-baseline.mjs` already does this.
- **Field data.** Add `web-vitals` (about 2 KB) and beacon to a Cloudflare Worker or Analytics Engine, or rely on Cloudflare Web Analytics/Observatory RUM once on Cloudflare. Query the CrUX API weekly for the 28-day p75. Note that INP is only measurable in the field.

### 5. Link checking

| Tool | Latest (date) | Dist. size | Stars | Issues+PRs | Licence | Notes |
|---|---|---|---|---|---|---|
| lychee (Rust) | lychee-v0.24.2 (2026-05-01; nightly 2026-10-26) | crates.io 80.8k recent dl | 4,050 | 75 | Apache-2.0 OR MIT | `--offline` for local `dist/`, `--root-dir`, `--include-fragments` (anchors), `.lycheecache` + `--max-cache-age`, per-host rate limits, Markdown/JSON/JUnit output, `lychee.toml` |
| lychee-action | v2.9.0 (09 Jul; bundles lychee 0.24.2) | — | 522 | 11 | Apache-2.0 | Official GitHub Action; can open an issue with a Markdown report |
| linkinator (Node) | 8.1.0 (2026-08-29) | npm 135.8k/wk | 1,277 | 13 | MIT | Crawls a local dir or URL; simple; JS config |
| muffet (Go) | v2.11.7 (2026-10-24) | Go module | 2,616 | 27 | MIT | Live-site crawler, very fast; no offline file mode |
| hyperlink | 5.0.4 (**2022-01-09**) | npm 1.5k/wk | 228 | 10 | none on GitHub (npm says MIT) | Unmaintained. Skip. |

- **Verdict: lychee.** Use `--offline` on `dist/` in PRs (internal links + anchors, seconds, no flakiness). Run a full external check nightly with cache + `GITHUB_TOKEN`, and have it open or update an issue instead of failing a PR. News articles link out heavily (x.com, tesla.com and others rate-limit), so external failures must not block publishing.

### 6. Lint / format / typecheck / secrets / HTML / structured data

| Tool | Latest (date) | npm/wk | Stars | Issues+PRs | Licence |
|---|---|---|---|---|---|
| ESLint | **10.13.0** (2026-10-16) | 102.2M | 27,595 | 124 | MIT |
| typescript-eslint | 8.72.0 (2026-10-19) | 58.9M | unverified | unverified | MIT |
| Biome (`@biomejs/biome`) | **2.6.3** (2026-10-24) | 11.9M | 26,000 | 556 | MIT OR Apache-2.0 (npm); GitHub lists Apache-2.0 |
| Oxlint | 1.89.0 (2026-10-19) | 18.0M | 23,232 (oxc monorepo) | 1,075 | MIT |
| oxfmt | 0.74.0 (2026-10-19) — pre-1.0 | 11.4M | (oxc monorepo) | — | MIT |
| Prettier | 3.9.10 (2026-10-10) | 87.5M | 52,379 | 1,461 | MIT |
| prettier-plugin-astro | 1.1.2 (2026-10-23) | 822k | 613 | 5 | MIT (npm) |
| @astrojs/check (`astro check`) | 0.9.12 (2026-10-21) | 2.75M | withastro/language-tools archived (moved into astro monorepo, 63,484★) | — | MIT |
| Stylelint | 17.16.0 (2026-10-01) | 6.16M | 11,539 | 111 | MIT |
| gitleaks | v8.30.1 (2026-02-21) | Go/binary | 30,351 | 516 | MIT |
| TruffleHog | v3.99.7 (2026-10-24) | Go/binary | 28,708 | 587 | **AGPL-3.0** (fine for CLI use) |
| html-validate | 11.17.0 (2026-10-20) | 320k | 19 (GitHub mirror; main repo is on GitLab, stars unverified) | 1 | MIT |
| Nu Html Checker (`vnu-jar`) | 26.10.12 (2026-10-12) | 83.6k | 1,992 | 0 | MIT |
| schema-dts (typed JSON-LD) | 2.1.0 (2026-10-02) | 1.88M | 1,252 | 15 | Apache-2.0 |
| @adobe/structured-data-validator | 1.7.0 (2026-02-25) | 9.5k | 17 | 14 | Apache-2.0 |

**Linting choice for an Astro + TypeScript codebase:**
- **ESLint 10.** Flat config only (eslintrc removed), needs Node ≥20.19/22.13/24, and looks up config from each file's directory. **ESLint 9 reached end-of-life on 2026-08-06**, so the brief's "ESLint 9 flat config" should be read as ESLint 10. `eslint-plugin-astro` 3.x requires `eslint >=10`. It is the most complete Astro linter (frontmatter + template + a11y), but the slowest.
- **Biome 2.6.** Astro, Vue and Svelte support (since v2.3) is still labelled **experimental** for parsing, formatting and linting. It needs `html.experimentalFullSupportEnabled`, and the docs warn of false positives and advise disabling `noUnusedVariables`, `noUnusedImports`, `useConst` and `useImportType` for `.astro` files when full support is off. CSS support is full. Very fast, one binary, lint + format in one config.
- **Oxlint 1.89.** 871 rules including jsx-a11y ports, type-aware linting via tsgo, and alpha JS plugins. For `.astro` it lints the `<script>` blocks only ("No template linting yet"). **oxfmt 0.74** (pre-1.0) can format `.astro` if `@astrojs/compiler-rs` is installed.
- **Verdict:** **ESLint 10 + typescript-eslint + eslint-plugin-astro + eslint-plugin-jsx-a11y-x** for linting, and **Prettier + prettier-plugin-astro** for formatting. This is the only stack where `.astro` templates are first-class today. Re-evaluate Biome when its Astro support loses the experimental label; it would replace both tools in one step. Stylelint (+ `stylelint-config-standard` 40.0.0, `stylelint-config-html` 2.0.0 for `<style>` in `.astro`) is optional; Biome-CSS or ESLint-CSS could cover the basics. `astro check` (with `typescript`) is the type-check gate.

**Secrets:**
- GitHub **user-level push protection is on by default** and blocks secrets pushed to public repos. Repo-level push protection needs GitHub Secret Protection.
- Add **gitleaks** in the pre-commit hook and a PR job (fast, staged/diff only).
- Run **TruffleHog** weekly over full history with `--results=verified` (it live-verifies credentials, so near-zero noise).

**HTML validation:**
- **html-validate** in PRs on `dist/**/*.html`: pure Node, configurable, includes a11y-ish rules.
- **Nu validator** nightly: the W3C reference, needs Java 17+ or the `ghcr.io/validator/validator` Docker image; use the "latest" tag (the project no longer cuts numbered majors).

**Structured data:**
- There is **no official Rich Results Test API**; it is a manual web tool.
- Automatable layers:
  1. **schema-dts** types the JSON-LD at build time (NewsArticle, BreadcrumbList, Organization).
  2. Extend the existing `test_seo_audit.py`, or write a Playwright test that parses every `<script type="application/ld+json">` and asserts Google's required/recommended NewsArticle fields (headline, image, datePublished, dateModified, author.url).
  3. Optionally use `@adobe/structured-data-validator`. It is small (17★), so treat it as advisory.
  4. Weekly, call the **Search Console URL Inspection API**. Its `UrlInspectionResult.richResultsResult` returns `detectedItems` + `verdict` for indexed URLs, which is the only Google-side programmatic signal.

### 7. Git hook managers

| Tool | Latest (date) | Downloads/wk | Stars | Issues+PRs | Licence | Notes |
|---|---|---|---|---|---|---|
| lefthook | 2.2.2 (2026-10-13) | 4.15M (npm) | 8,951 | 102 | MIT | Go single binary, `lefthook.yml`, `parallel: true`, `glob` + `{staged_files}`, `stage_fixed: true`; installs via npm/brew/go/pip and others |
| husky | 9.1.7 (**2024-11-18**) | 22.8M | 35,363 | 109 | MIT | Tiny, but only hook wiring; needs lint-staged; Node-only; no release in ~2 years |
| lint-staged | 17.6.0 (2026-09-26) | 18.6M | 14,743 | 2 | MIT | Pairs with husky |
| pre-commit (Python) | 4.7.0 (2026-10-12, PyPI) | unverified | 15,664 | 25 | MIT | Huge hook catalogue, manages isolated envs per hook; slower first run; Python dependency |

- **Verdict: lefthook.** It replaces husky + lint-staged with one YAML file, runs jobs in parallel, and handles staged-file globbing and re-staging fixes. Because it is a binary rather than Node-only, it also covers the repo's Python checks. Remember that hooks are a convenience: CI is the real gate, especially when Claude Code commits from cloud sessions where hooks may not be installed.

### 8. Recommended toolchain

| Concern | Tool | Gate |
|---|---|---|
| Format | Prettier 3.9 + prettier-plugin-astro | PR (check) + pre-commit (write) |
| Lint | ESLint 10 + typescript-eslint + eslint-plugin-astro + jsx-a11y-x | PR + pre-commit |
| Types | `astro check` (+ `tsc --noEmit` for scripts) | PR |
| Unit | `node --test` (keep existing .mjs) → Vitest later if needed | PR |
| E2E + visual + a11y | @playwright/test 1.64 (6 projects: 390/768/1440 × light/dark) + `toHaveScreenshot` + @axe-core/playwright (wcag22aa tags) | PR |
| HTML | html-validate on `dist/` (PR); Nu validator (nightly) | PR / nightly |
| Links | lychee `--offline` on `dist/` (PR); lychee-action full external with cache (nightly → issue) | PR / nightly |
| Perf | raw Lighthouse 13 median-of-3 on key templates (PR); Unlighthouse crawl of prod (nightly); CrUX API + web-vitals RUM (weekly) | PR / nightly |
| A11y second opinion | pa11y-ci (htmlcs runner) over sitemap; IBM checker optional | nightly / weekly |
| Structured data | schema-dts types + JSON-LD assertions in Playwright; Search Console URL Inspection API | PR / weekly |
| Secrets | GitHub push protection (default) + gitleaks (hook + PR) + TruffleHog verified (weekly) | all |
| Hooks | lefthook | local |

#### Sample CI outline (consolidates the ~43 per-feature workflows into 3)
```
.github/workflows/
  pr.yml        on: pull_request            (target < 10 min)
    job static   : npm ci → prettier --check . → eslint . → astro check → gitleaks git --log-opts=origin/main..HEAD
    job build    : astro build → upload dist/ artifact
    job verify   : (needs build) html-validate "dist/**/*.html" ; lychee --offline --root-dir dist --include-fragments dist
    job browser  : (needs build) container mcr.microsoft.com/playwright:v1.64.1-noble
                   serve dist → npx playwright test --shard=${{matrix.shard}}/2
                   (journeys + axe per template×viewport×theme + toHaveScreenshot + JSON-LD asserts)
                   upload playwright-report/ on failure
    job perf     : (needs build) lighthouse@13.5 mobile ×3 on home/article/hub/updates → median → assert ≥90/100/100/100
  nightly.yml   on: schedule (e.g. CRON_TZ=Europe/London 17 3 * * *)  +  workflow_dispatch
    lychee-action (external links, .lycheecache via actions/cache, GITHUB_TOKEN) → create/refresh issue
    unlighthouse-ci --site https://superchargeddaily.com --build-static (upload report)
    pa11y-ci --sitemap https://superchargeddaily.com/sitemap.xml (runner htmlcs)
    docker run ghcr.io/validator/validator vnu --skip-non-html dist
  weekly.yml    on: schedule (Mon)
    trufflehog git file://. --results=verified ; CrUX API p75 snapshot ; Search Console URL Inspection on top 20 URLs
```
Keep the existing data-refresh workflows (`*-refresh.yml`, `*-snapshot.yml`) as they are. Only the `*-checks.yml` files fold into `pr.yml`. Use `paths-filter` or Playwright `--grep` tags if PR time grows.

#### Setup commands (once the Astro project has a package.json)
```bash
npm i -D @playwright/test@1.64.1 @axe-core/playwright@4.14.0 && npx playwright install --with-deps chromium
npm i -D eslint@10 typescript-eslint eslint-plugin-astro eslint-plugin-jsx-a11y-x @typescript-eslint/parser
npm i -D prettier prettier-plugin-astro @astrojs/check typescript
npm i -D html-validate lefthook && npx lefthook install
npm i -D schema-dts                         # types only
npm i -D @unlighthouse/cli pa11y-ci         # or run via npx in nightly only
npm i web-vitals                            # runtime RUM
# non-npm: lychee via lycheeverse/lychee-action@v2 (CI) or `brew install lychee`; gitleaks via `brew install gitleaks`
# update visual baselines in the same container CI uses:
docker run --rm -v "$PWD":/w -w /w mcr.microsoft.com/playwright:v1.64.1-noble npx playwright test --update-snapshots
```
Minimal `playwright.config.ts` projects: `{name:'m-light', use:{viewport:{width:390,height:844}, colorScheme:'light'}}`, and the same for `m-dark`, `t-*` (768×1024) and `d-*` (1440×900). axe call: `new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze()`, then expect `violations` to equal `[]`.

`lefthook.yml` sketch: `pre-commit: parallel: true; jobs: [{glob:"*.{ts,astro,js,mjs,css,json,md}", run:"npx prettier --write {staged_files}", stage_fixed:true}, {glob:"*.{ts,astro,js,mjs}", run:"npx eslint --fix {staged_files}", stage_fixed:true}, {run:"gitleaks git --staged --no-banner"}]`.

### 9. Risks / caveats
- Pin the Playwright version in three places in lockstep: npm, the Docker image tag, and the Python pip pin (currently 1.62.0 in workflows vs 1.64.1 latest). Baselines break on browser bumps, so re-baseline in a dedicated PR.
- Dark-mode screenshots depend on the site honouring `prefers-color-scheme` and/or a `data-theme` toggle. Test both paths if the toggle exists.
- Lighthouse scores on GitHub runners vary ±5 on perf. Gate on the median, and keep the PR perf job as a warning until it has a week of stable numbers.
- Lost Pixel (archived), BackstopJS (last release 2024-09), hyperlink (2022) and LHCI (stuck on LH 12.6.1) are the stale options to avoid.

### Sources
- npm registry / downloads API (queried 2026-10-26): https://registry.npmjs.org/ , https://api.npmjs.org/downloads/point/last-week/
- GitHub repo pages (stars/issues via GitHub search API): https://github.com/microsoft/playwright , https://github.com/cypress-io/cypress , https://github.com/webdriverio/webdriverio , https://github.com/lost-pixel/lost-pixel , https://github.com/garris/BackstopJS , https://github.com/argos-ci/argos , https://github.com/reg-viz/reg-suit , https://github.com/dequelabs/axe-core , https://github.com/pa11y/pa11y , https://github.com/GoogleChrome/lighthouse , https://github.com/GoogleChrome/lighthouse-ci , https://github.com/harlan-zw/unlighthouse , https://github.com/GoogleChrome/web-vitals , https://github.com/lycheeverse/lychee , https://github.com/lycheeverse/lychee-action , https://github.com/raviqqe/muffet , https://github.com/JustinBeckwith/linkinator , https://github.com/biomejs/biome , https://github.com/oxc-project/oxc , https://github.com/gitleaks/gitleaks , https://github.com/trufflesecurity/trufflehog , https://github.com/validator/validator , https://github.com/evilmartians/lefthook , https://github.com/IBMa/equal-access
- Go module proxy (muffet, gitleaks, trufflehog): https://proxy.golang.org/ ; crates.io lychee: https://crates.io/crates/lychee ; PyPI pre-commit: https://pypi.org/project/pre-commit/
- Playwright release notes: https://playwright.dev/docs/release-notes ; snapshots: https://playwright.dev/docs/test-snapshots
- Argos pricing: https://argos-ci.com/pricing ; Chromatic pricing: https://www.chromatic.com/pricing ; Percy plans: https://www.browserstack.com/docs/percy/overview/plans-and-billing ; https://argos-ci.com/blog/visual-testing-pricing ; Cypress pricing: https://www.cypress.io/pricing
- axe rule list (wcag22aa disabled by default): https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md ; Deque 57% study: https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues
- eslint-plugin-astro rules: https://ota-meshi.github.io/eslint-plugin-astro/rules/ ; ESLint 10 migration: https://eslint.org/docs/latest/use/migrate-to-10.0.0 ; ESLint blog (v9 EOL 2026-08-06): https://eslint.org/blog/
- Biome language support: https://biomejs.dev/internals/language-support/ ; Oxc: https://oxc.rs/docs/guide/usage/linter.html , https://oxc.rs/docs/guide/usage/formatter.html , https://oxc.rs/compatibility.html
- LHCI / Lighthouse 13: https://unlighthouse.dev/learn-lighthouse/lighthouse-ci , https://developer.chrome.com/blog/lighthouse-13-0 ; Unlighthouse CI: https://unlighthouse.dev/integrations/ci
- PSI API: https://developers.google.com/speed/docs/insights/v5/get-started ; Cloudflare Observatory: https://developers.cloudflare.com/speed/observatory/
- Push protection: https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection
- Rich Results Test (manual only): https://support.google.com/webmasters/answer/7445569 ; URL Inspection API: https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult
- lefthook: https://lefthook.dev/ ; Nu validator: https://github.com/validator/validator


## 7. Claude Code ecosystem for superchargeddaily.com (verified 2026-10-26)

Scope: MCP servers, skills/plugins, subagents, hooks, commands, settings, CI. Target stack: Astro + TS on Cloudflare,
Supabase (auth/comments), Beehiiv (newsletter), Claude Code mostly in **cloud sessions from a phone**.
Sources: code.claude.com/docs (mcp, sub-agents, skills, hooks, hooks-guide, plugins, cloud-environments,
claude-code-on-the-web, permissions, memory, output-styles, github-actions), GitHub repo pages, npm registry (curl).
Stars/issues are as rendered on GitHub today (rounded); "unverified" = not confirmable from a live source.
Claude Code CLI itself: `@anthropic-ai/claude-code` 2.1.310 (npm, 2026-10-23).

### 0. Cloud-session facts that shape everything (code.claude.com/docs/en/cloud-environments)

| Repo artefact | Loaded in cloud session? |
|---|---|
| `CLAUDE.md`, `.claude/rules/`, `.claude/skills/`, `.claude/agents/`, `.claude/commands/` | Yes (part of clone) |
| `.claude/settings.json` hooks + permissions | Yes (single-repo session) |
| `.mcp.json` | Yes (single-repo session) |
| Plugins in `enabledPlugins` / `extraKnownMarketplaces` | **No**: cloud sessions don't install plugins |
| `~/.claude/*`, `claude mcp add` at local/user scope | No (lives on your laptop) |
| claude.ai connectors (claude.ai/customize/connectors) | Yes, routed through Anthropic and **not** subject to the network allowlist |

Consequences: (1) **vendor skills into `.claude/skills/`** (e.g. `npx skills add ... -a claude-code` writes `.claude/skills/`)
and don't rely on plugins for phone work. (2) Add OAuth SaaS servers (Supabase, Cloudflare, Beehiiv, Figma, Sentry) as
**claude.ai connectors**. OAuth `/mcp` login in `.mcp.json` doesn't fit headless cloud VMs, and remote hosts need
"Custom" network access. (3) The cloud VM already provides GitHub tools (`mcp__github__*`) through the GitHub proxy, so
don't add a GitHub MCP for cloud work. (4) The VM is Ubuntu 24.04 with Node 20/21/22 (22 on PATH), npm/pnpm/yarn, prettier,
eslint and chromedriver. Bun has proxy issues. The Trusted network level allowlists `registry.npmjs.org` and github.
(5) Setup script = VM provisioning, cached if under ~5 min and rebuilt about every 7 days. SessionStart hook = per-session
project setup such as `npm ci`. Gate it on `CLAUDE_CODE_REMOTE=true`.
Existing repo note: `.cursor/mcp.json` only has `mailerlite` (`https://mcp.mailerlite.com/mcp`), which may be stale if the newsletter is now on Beehiiv.

### 1. MCP servers

| Server | Maintainer / repo | Stars | Latest release (date) | Open issues | Licence | Transport / auth |
|---|---|---|---|---|---|---|
| Playwright MCP | microsoft/playwright-mcp | 38.7k | @playwright/mcp 0.0.83 (2026-09-28) | 1 | Apache-2.0 | stdio (npx) |
| Playwright CLI + skills (alt.) | microsoft/playwright-cli | 14.6k | `@playwright/cli` (ver. unverified) | unverified | Apache-2.0 | CLI + SKILL |
| Chrome DevTools MCP | ChromeDevTools/chrome-devtools-mcp (Google) | 54.2k | v1.12.0 (2026-10-22) | 81 | Apache-2.0 | stdio; also a plugin |
| Context7 | upstash/context7 | 63.7k | @upstash/context7-mcp 4.4.4 (2026-10-19) | 20 | MIT | remote HTTP (API key) or stdio |
| Astro Docs MCP | withastro/docs-mcp (official) | 67 | no releases (hosted) | 6 | unverified | remote HTTP, no auth (kapa.ai index) |
| Cloudflare API MCP (Code Mode) | cloudflare/mcp | ~1.0k | hosted, continuous | unverified | Apache-2.0 | remote HTTP, OAuth or API token |
| Cloudflare domain servers | cloudflare/mcp-server-cloudflare | 4.4k | no GH releases (hosted) | 40 | Apache-2.0 | remote HTTP, OAuth |
| GitHub MCP | github/github-mcp-server | 34.0k | v2.0.3 (21 Oct 2026) | 209 | MIT | remote `api.githubcopilot.com/mcp/` (OAuth/PAT) or Docker stdio |
| Supabase MCP | supabase/mcp (was supabase-community) | 3.0k | @supabase/mcp-server-supabase 0.14.0 (2026-10-14) | 71 | Apache-2.0 | remote `mcp.supabase.com/mcp` (OAuth) |
| Figma MCP (official) | Figma | n/a (closed) | hosted | n/a | proprietary | remote `mcp.figma.com/mcp` (OAuth) or desktop app server |
| Framelink Figma MCP | GLips/Figma-Context-MCP | 16.1k | figma-developer-mcp 0.13.2 (2026-06-18) | 8 | MIT | stdio, Figma PAT |
| Beehiiv MCP (official) | beehiiv | n/a | hosted, unversioned (launched 2026-03-24) | n/a | proprietary | remote `mcp.beehiiv.com/mcp` (OAuth) |
| GSC MCP (community) | AminForou/mcp-gsc | 2.0k | 0.4.1 (Sep 2026) | unverified | MIT | stdio Python, OAuth or service account |
| Lighthouse MCP (community) | priyankark/lighthouse-mcp | unverified | 0.1.17 (2026-09-13) | unverified | MIT | stdio |
| Sentry MCP | getsentry/sentry-mcp (page renders as getsentry/toolkit) | 947 | @sentry/mcp-server 0.42.0 (2026-09-25) | 125 | FSL-1.1-ALv2 (npm) | remote `mcp.sentry.dev/mcp` (OAuth) + plugin |
| Vercel MCP (comparison) | Vercel | n/a | hosted (docs updated 2026-09-15) | n/a | proprietary | remote `mcp.vercel.com` (OAuth, approved clients only) |
| Netlify MCP (comparison) | netlify/netlify-mcp | 68 | @netlify/mcp 1.21.0 (2026-10-26) | 9 | ISC (npm) | remote `netlify-mcp.netlify.app/mcp` (OAuth) or npx |

Notes per server
- **Playwright MCP**: `claude mcp add playwright npx @playwright/mcp@latest`. Flags: `--headless`, `--isolated`
  (in-memory profile), `--caps vision,pdf,devtools`, `--allowed-origins`/`--blocked-origins`. The README says these
  "do not serve as a security boundary". The README now recommends **Playwright CLI + skills for coding agents** because
  it uses far fewer tokens than MCP schemas and accessibility trees: `npm i -g @playwright/cli@latest && playwright-cli install --skills`.
- **Chrome DevTools MCP** (the strongest perf tool): tools include `performance_start_trace` / `performance_stop_trace` /
  `performance_analyze_insight`, **`lighthouse_audit`** (v1.11 returns failing audits inline), `emulate`,
  `list_network_requests`, `list_console_messages` and `take_screenshot`, plus memory and PWA tools. Install with
  `claude mcp add chrome-devtools --scope user npx chrome-devtools-mcp@latest`, or use the plugin
  `/plugin marketplace add ChromeDevTools/chrome-devtools-mcp` then `/plugin install chrome-devtools-mcp@chrome-devtools-plugins`,
  which adds skills such as `debug-optimize-lcp`. Privacy: usage stats are on by default (`--no-usage-statistics`, or they're
  off automatically when `CI` is set), and trace URLs go to the CrUX API (`--no-performance-crux`). `--slim` gives a small toolset.
- **Context7**: remote `https://mcp.context7.com/mcp` with header `Authorization: Bearer <key>`. Tools: `resolve-library-id`,
  `query-docs`. `npx ctx7 setup --claude` installs a skill via OAuth. Also in claude-plugins-official as `context7`.
- **Astro Docs MCP**: `claude mcp add --transport http astro-docs https://mcp.docs.astro.build/mcp`. It's free and has one
  tool, `search_astro_docs`. Astro also notes that `astro dev` auto-backgrounds when it detects an agent
  (`ASTRO_DEV_BACKGROUND=0` to opt out) and exposes a `/_astro/status` health endpoint.
- **Cloudflare**: the recommended server is now **`https://mcp.cloudflare.com/mcp`**. It's "Code Mode", which covers about
  2,500 API endpoints through `search`/`execute`/`docs`/`whoami` in about 1k tokens. Results are capped at ~6k tokens
  (`?truncateToolResult=false` lifts the cap). **Workers Bindings, Builds, Observability, Radar, Logpush, AI Gateway, GraphQL
  and DNS Analytics servers are now DEPRECATED** in favour of it. Still active: Docs (`docs.mcp.cloudflare.com/mcp`),
  Browser Run (`browser.mcp.cloudflare.com/mcp`) and Containers. `/sse` endpoints return 410. Prefer OAuth with minimal
  scopes; use an API token only for CI.
- **GitHub MCP**: toolsets default to context, repos, issues, pull_requests and users. The `--read-only` flag drops write
  tools. Local: Docker `ghcr.io/github/github-mcp-server` with `GITHUB_PERSONAL_ACCESS_TOKEN`. In cloud sessions it's built in.
- **Supabase MCP**: `claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<ref>&read_only=true&features=database,docs,debugging"`.
  `project_ref` scopes to one project and disables account tools. `read_only=true` runs SQL as a read-only Postgres role.
  Feature groups: database, debugging, development, functions, account, docs, branching (paid), storage (off by default).
  Supabase's own guidance: watch for prompt injection via row data (e.g. comment text), keep manual approval on, don't
  point it at prod unless needed, never expose it to end users, and test on a dev branch before `merge_branch`.
- **Figma**: the official remote server is `claude mcp add --transport http figma https://mcp.figma.com/mcp`, or use the
  plugin `claude plugin install figma@claude-plugins-official`. It offers design context, Code Connect and write-to-canvas
  (beta). Desktop-server access needs a Dev or Full seat on a paid plan, and rate limits are on Figma's "Rate limits & access"
  page (unverified here). Framelink is the PAT-based stdio alternative
  (`npx -y figma-developer-mcp --figma-api-key=$FIGMA_API_KEY --stdio`) and works on any plan.
- **Beehiiv**: enable it under Settings → MCP in Beehiiv. Free plan is read-only; paid plans can create and edit drafts,
  segments and automations. It **cannot publish, schedule or send**, and can't edit page bodies (metadata only). It's
  unversioned, so Beehiiv recommends the REST API for stable integrations. Add it as a claude.ai connector.
- **GSC**: no official Google server exists. mcp-gsc (Python ≥3.11) has 15–20 tools (search analytics, URL inspection,
  sitemaps). Destructive tools are gated by `GSC_ALLOW_DESTRUCTIVE`. Use a read-only service account.
  **PageSpeed/CrUX**: there are only community servers (teles/web-performance-mcp, google-psi-mcp, crux-mcp), all unverified
  for quality. For lab runs, Chrome DevTools MCP `lighthouse_audit` plus a CI Lighthouse job beat these.
- **Sentry**: `claude plugin marketplace add getsentry/sentry-mcp && claude plugin install sentry-mcp@sentry-mcp`, or use
  the remote URL as a connector. Only worth it once there are Workers or client errors to triage.
- **Vercel / Netlify**: both are hosted OAuth servers (`claude mcp add --transport http vercel https://mcp.vercel.com`;
  `claude mcp add --transport http netlify https://netlify-mcp.netlify.app/mcp`). They're listed only for comparison
  because hosting is Cloudflare.

#### Recommended set
| Tier | Server | Where to configure |
|---|---|---|
| Core | Astro Docs MCP, Cloudflare Docs MCP, Context7 | `.mcp.json` (no OAuth). Docs hosts need Custom network access in the cloud env |
| Core | Chrome DevTools MCP (`--headless --isolated`) | `.mcp.json` stdio, plus a setup script that installs Chrome. Use Playwright CLI for E2E |
| Core | Supabase (scoped, read_only) | claude.ai connector for cloud; `.mcp.json` locally |
| Core | Cloudflare API (Code Mode) | claude.ai connector. Grant only Workers/Pages/DNS read and Workers deploy scopes |
| Optional | Beehiiv (read for stats; paid for drafts) | claude.ai connector |
| Optional | Figma official (only if designs live in Figma) | connector or plugin |
| Later | GSC (mcp-gsc, service account), Sentry | local stdio / connector |
| Skip | GitHub MCP (built into cloud sessions; `gh` locally), Vercel, Netlify | — |

`.mcp.json` (committed; ${VAR} expansion is supported in command/args/env/url/headers, and `${VAR:-default}` works):
```json
{
  "mcpServers": {
    "astro-docs":      { "type": "http", "url": "https://mcp.docs.astro.build/mcp" },
    "cloudflare-docs": { "type": "http", "url": "https://docs.mcp.cloudflare.com/mcp" },
    "context7":        { "type": "http", "url": "https://mcp.context7.com/mcp",
                         "headers": { "Authorization": "Bearer ${CONTEXT7_API_KEY:-}" } },
    "chrome-devtools": { "type": "stdio", "command": "npx",
                         "args": ["-y", "chrome-devtools-mcp@1.12.0", "--headless", "--isolated", "--no-usage-statistics"] }
  }
}
```
Local-only (not committed): `claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=$SUPABASE_REF&read_only=true&features=database,docs,debugging"`
then authenticate via `/mcp`. Also `claude mcp add --transport http cloudflare https://mcp.cloudflare.com/mcp`.
Pin versions (`@1.12.0`) instead of `@latest` so a compromised release can't auto-run. Project `.mcp.json` servers prompt
for approval interactively, but **in cloud/`-p` sessions they load without a prompt**. Use `disabledMcpjsonServers` to block one.
Limits: `MAX_MCP_OUTPUT_TOKENS` (default 25k), `MCP_TIMEOUT`, per-server `"timeout"`.

### 2. Skills and plugins

Mechanics (verified): a skill is `.claude/skills/<name>/SKILL.md`, or `~/.claude/skills/`, or `<plugin>/skills/`.
**Custom slash commands have been merged into skills.** `.claude/commands/x.md` and `.claude/skills/x/SKILL.md` both create
`/x`, existing commands keep working, the skill wins on a name clash, and skills are recommended for new work. Plugins are
installed with `/plugin marketplace add <owner/repo>` then `/plugin install <name>@<marketplace>`, or with
`claude plugin install ...` from the shell. Anthropic's official marketplace `claude-plugins-official` is auto-added.
Plugins don't load in cloud sessions.

| Source | Stars | Licence | Install | Pick for this site |
|---|---|---|---|---|
| anthropics/skills | 183.9k | Apache-2.0 for most; doc skills source-available | `/plugin marketplace add anthropics/skills` → `example-skills@anthropic-agent-skills` | **frontend-design**, **webapp-testing** (Playwright scripts), skill-creator, brand-guidelines, theme-factory |
| anthropics/claude-plugins-official | 44.7k | Apache-2.0 (per-plugin) | `/plugin install <p>@claude-plugins-official` | frontend-design, code-review, pr-review-toolkit, security-guidance, commit-commands, feature-dev, hookify, typescript-lsp, claude-md-management, code-simplifier. External: context7, playwright, github |
| supabase/agent-skills | 2.9k | MIT | `npx skills add supabase/agent-skills` or `claude plugin marketplace add supabase/agent-skills` → `supabase@supabase-agent-skills` | `supabase` (RLS, auth, migrations, security audit), `supabase-postgres-best-practices` |
| cloudflare/skills | 3.2k | Apache-2.0 | `/plugin marketplace add cloudflare/skills` → `cloudflare@cloudflare`; or `npx skills add cloudflare/skills --skill wrangler -a claude-code` | `wrangler`, `workers-best-practices`, **`web-perf`** (CWV audit), `turnstile-spin` (comment spam), `cloudflare` |
| vercel-labs/skills (CLI) | 36.7k | MIT | `npx skills add <repo> [--skill x] -a claude-code [-g]` writes `.claude/skills/` (`-g` → `~/.claude/skills/`) | Installer. Set `DISABLE_TELEMETRY=1` (telemetry on by default) |
| vercel-labs/agent-skills | 33.0k | MIT | `npx skills add vercel-labs/agent-skills --skill web-design-guidelines -a claude-code` | **web-design-guidelines** (100+ a11y/perf/UI rules), writing-guidelines. Skip React/Next-specific ones |
| ChromeDevTools plugin | (see §1) | Apache-2.0 | see §1 | `debug-optimize-lcp` and other perf skills |
| Astro | — | — | No official Astro skill or plugin exists (docs page lists only the MCP) | Write a local `astro` skill |

Cloud-friendly install, which vendors the files into the repo so phone sessions get them:
```bash
DISABLE_TELEMETRY=1 npx skills add supabase/agent-skills -a claude-code
DISABLE_TELEMETRY=1 npx skills add cloudflare/skills --skill wrangler --skill web-perf --skill workers-best-practices -a claude-code
DISABLE_TELEMETRY=1 npx skills add vercel-labs/agent-skills --skill web-design-guidelines -a claude-code
# anthropics/skills frontend-design + webapp-testing: copy the folders into .claude/skills/ and keep LICENSE.txt
```
Review every vendored SKILL.md before committing, since skills are executable instructions. Tools like NVIDIA SkillSpector
can scan them.

Verified SKILL.md frontmatter fields: `name`, `description`, `when_to_use`, `argument-hint`, `arguments`,
`disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context: fork`,
`agent`, `background`, `hooks`, `paths`, `shell`, `metadata`, `license`, `compatibility`.
Substitutions: `$ARGUMENTS`, `$0`/`$ARGUMENTS[0]`, `$name` (from `arguments`), `${CLAUDE_SKILL_DIR}` and `${CLAUDE_PROJECT_DIR}`.
`` !`cmd` `` injects shell output before the prompt, and a non-zero exit aborts the skill.

Example `.claude/skills/new-article/SKILL.md` (works as both `/new-article` and auto-invoked):
```markdown
---
name: new-article
description: Scaffold a news article (Tesla/SpaceX/xAI) as an Astro content-collection entry with SEO frontmatter.
argument-hint: "<slug> <topic: tesla|spacex|xai>"
arguments: [slug, topic]
disable-model-invocation: true
allowed-tools: Read Write Edit Glob Bash(npm run check) Bash(npx astro check)
---
Create `src/content/news/$slug.md` for topic `$topic` following `src/content.config.ts`.
Recent entries for style: !`ls -t src/content/news | head -5`
Required: title ≤ 60 chars, description 120–160 chars, pubDate (ISO), updatedDate, heroImage + alt, tags, sources[] (URLs).
Then run `npx astro check` and fix errors. Never invent quotes or figures; mark unverified claims with TODO(source).
```

### 3. Subagents (`.claude/agents/*.md`)

Verified frontmatter (camelCase; only `name` and `description` are required; unknown keys are ignored): `name`,
`description`, `tools`, `disallowedTools`, `model` (sonnet|opus|haiku|fable|full ID|inherit), `permissionMode`, `maxTurns`,
`autoCompactWindow`, `skills` (preloaded), `mcpServers`, `hooks`, `memory` (user|project|local), `background`,
`omitClaudeMd`, `effort`, `isolation: worktree`, `color`, `initialPrompt`. Precedence: managed > `--agents` >
`.claude/agents/` > `~/.claude/agents/` > plugin. Invoke via description match ("use proactively"),
`@"name (agent)"`, or `claude --agent name`. Nesting is allowed up to 3 levels by default (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`).
Cloud sessions load the repo's `.claude/agents/`.

| Collection | Stars | Licence | Size | Verdict |
|---|---|---|---|---|
| wshobson/agents | 41.8k | MIT | 94 plugins / 202 agents / 185 skills / 105 commands | Best maintained, multi-harness, model tiering by alias. Install single plugins rather than all (context cost). Borrow structure, not wholesale |
| VoltAgent/awesome-claude-code-subagents | 26.1k | MIT | 100–161+ agents in 10 categories | Good prompts to crib: frontend-developer, ui-designer, **seo-specialist** (Haiku-routed), code-reviewer / surgeon-reviewer (severity tiers and ship/no-ship verdict), accessibility-tester, performance-engineer, content-marketer, typescript-pro |
| 0xfurai/claude-code-subagents | 1.0k | MIT | ~138 agents | 7 commits, early stage. Its `astro-expert` and `tailwind-expert` are worth reading. The README clone path is wrong |
| hesreallyhim/awesome-claude-code | 56.6k | unverified | curated list | Relevant here: Design & UI/UX (UI Craft, StyleSeed, Web Assets Generator for favicons/OG), Security (Claude Code Safety Net, Parry-guard prompt-injection hook, SkillSpector), status lines (ccstatusline), OneRedOak/claude-code-workflows (PR / design-review loops) |

Patterns to borrow: a read-only reviewer (no Edit/Write) with severity tiers and a verdict, a cheap model for
SEO/metadata checks, preloaded `skills:` so each agent carries its playbook, `isolation: worktree` for risky refactors,
and a `memory: project` scope for content-ops style learning.

Ready-to-adapt agents:
```markdown
---
name: reviewer
description: Use proactively after any code change and before commit/PR. Read-only review for correctness, security, a11y, perf, SEO regressions.
tools: Read, Grep, Glob, Bash   # tools takes tool names; scope Bash via permissions/hooks
disallowedTools: Edit, Write, Agent
model: opus
effort: high
color: red
---
Review the diff (`git diff origin/main...HEAD`). Report findings as BLOCKER / SHOULD-FIX / NIT with file:line and a
concrete fix. Check: Supabase RLS on any new table, no service-role key in client code, no secrets, Astro islands only
where needed (no unnecessary client:load), images sized with width/height, canonical/OG tags intact. End with SHIP or NO-SHIP.
```
```markdown
---
name: seo
description: SEO/structured-data auditor for article and section pages. Use for metadata, JSON-LD NewsArticle, sitemaps, internal links.
tools: Read, Grep, Glob, Edit, Bash, mcp__astro-docs__search_astro_docs
model: haiku
skills: [web-perf]
---
Verify each page has a unique title (≤60), meta description (120–160), canonical, OG/Twitter tags, NewsArticle JSON-LD
(headline, datePublished, dateModified, author, publisher, image), and breadcrumb. It must be in the sitemap and RSS feed.
Never change article facts.
```
Also: **designer** (`skills: [frontend-design, web-design-guidelines]`, Chrome DevTools screenshots, model opus),
**frontend** (Astro + TS implementer, `skills: [astro, wrangler]`, `isolation: worktree`), and **content-ops**
(`tools: Read, Write, Edit, Glob, mcp__beehiiv__*`, `memory: project`; drafts only, never publishes; cross-checks sources).

### 4. Hooks (`.claude/settings.json` → `hooks`)

Verified events: SessionStart, Setup, UserPromptSubmit, UserPromptExpansion, PreToolUse, PermissionRequest,
PermissionDenied, PostToolUse, PostToolUseFailure, PostToolBatch, Notification, MessageDisplay, SubagentStart,
SubagentStop, TaskCreated, TaskCompleted, Stop, StopFailure, TeammateIdle, InstructionsLoaded, ConfigChange, CwdChanged,
DirectoryAdded, FileChanged, WorktreeCreate, WorktreeRemove, PreCompact, PostCompact, PreModelSwitch, PostModelSwitch,
Elicitation, ElicitationResult, SessionEnd.
Handler types: `command`, `http`, `mcp_tool`, `prompt`, `agent` (experimental). Common fields: `type`, `if`
(a single permission-rule, e.g. `Bash(git commit*)`, checked on each subcommand), `timeout` (seconds, default 600),
`statusMessage`, `once`, `async`.
Matchers: `Edit|Write` is an exact list, anything with other characters is a regex, and SessionStart matches on source
(startup|resume|clear|compact|fork).
**Exit codes**: 0 = success (stdout parsed if it's a single JSON object). **2 = block** (stderr goes to Claude) on
blockable events, even if JSON was printed. Any other code is a non-blocking error, so **exit 1 does not block**.
JSON: `continue`, `stopReason`, `systemMessage`, `decision: "block"` + `reason` (PostToolUse/Stop/UserPromptSubmit), and
`hookSpecificOutput.{permissionDecision: allow|deny|ask|defer, permissionDecisionReason, updatedInput, additionalContext}`.
Stdin: `tool_name`, `tool_input.command`, `tool_input.file_path` (absolute). Env: `$CLAUDE_PROJECT_DIR`,
`$CLAUDE_CODE_REMOTE` and `$CLAUDE_ENV_FILE` (SessionStart only; append `export` lines). Guard Stop hooks with
`stop_hook_active`; the block cap is 8.

```json
{
  "hooks": {
    "SessionStart": [{ "matcher": "startup|resume",
      "hooks": [{ "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/session-start.sh", "timeout": 300 }] }],
    "PostToolUse": [{ "matcher": "Edit|Write",
      "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/format.sh" }] }],
    "PreToolUse": [{ "matcher": "Bash", "hooks": [
      { "type": "command", "if": "Bash(git commit*)", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/pre-commit.sh", "timeout": 180 }
    ] }]
  }
}
```
`.claude/hooks/format.sh` (Biome 2.6.3 or Prettier 3.9.10; Prettier needs `prettier-plugin-astro` for .astro files):
```bash
#!/usr/bin/env bash
f=$(jq -r '.tool_input.file_path // empty'); [ -z "$f" ] && exit 0
case "$f" in *.ts|*.tsx|*.js|*.mjs|*.json|*.css|*.astro|*.md)
  cd "$CLAUDE_PROJECT_DIR" && npx --no-install biome check --write "$f" >/dev/null 2>&1 \
    || npx --no-install prettier --write "$f" >/dev/null 2>&1 ;; esac
exit 0   # never block on formatting
```
`.claude/hooks/pre-commit.sh` (typecheck, lint and secrets scan; exit 2 blocks the commit and feeds stderr back to Claude):
```bash
#!/usr/bin/env bash
cd "$CLAUDE_PROJECT_DIR" || exit 0
# astro check needs the @astrojs/check devDependency
out=$( { npx --no-install astro check && npm run -s lint; } 2>&1 ) || { echo "typecheck/lint failed:" >&2; echo "$out" | tail -40 >&2; exit 2; }
if command -v gitleaks >/dev/null; then   # gitleaks v8.30.1 (2026-03-21), MIT, 30.4k stars
  gitleaks git --pre-commit --redact --staged --no-banner >&2 || { echo "gitleaks: secret in staged changes — remove it, don't bypass" >&2; exit 2; }
fi
exit 0
```
(`gitleaks git --pre-commit --redact --staged` is the command in gitleaks' own `.pre-commit-hooks.yaml`. `protect`/`detect`
were deprecated in v8.19.) Mirror this as a real git pre-commit hook or a CI job so non-Claude commits are covered too.

`.claude/hooks/session-start.sh` (cloud only, idempotent; install gitleaks/Chrome in the **setup script** so it's cached):
```bash
#!/usr/bin/env bash
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 1
h=node_modules/.deps.sha256
sha256sum --check --status "$h" 2>/dev/null || { rm -f "$h"; npm ci --no-audit --no-fund && sha256sum package.json package-lock.json > "$h"; }
[ -n "$CLAUDE_ENV_FILE" ] && echo 'export PATH="$PATH:'"$CLAUDE_PROJECT_DIR"'/node_modules/.bin"' >> "$CLAUDE_ENV_FILE"
echo "Branch: $(git branch --show-current). Run 'npm run check' before committing."   # stdout → Claude context
exit 0
```
The `session-start-hook` skill available in this environment can scaffold this file.

### 5. Settings, permissions, CLAUDE.md, output styles

Permissions (`.claude/settings.json`): `allow` / `ask` / `deny` plus `defaultMode`. **deny > ask > allow**, and allow can't
carve exceptions out of deny. `Bash(npm run *)` (trailing ` *` also matches the bare command); compound commands are
split and each part must match. `Read(./.env)`, `WebFetch(domain:docs.astro.build)`, `mcp__supabase__*`
(MCP rules with parentheses are skipped). `npx`/`docker exec` aren't stripped as wrappers, so allow them per inner command.
```json
{
  "permissions": {
    "allow": ["Bash(npm run *)", "Bash(npx astro *)", "Bash(npx wrangler deploy --dry-run*)", "Bash(git status)",
              "Bash(git diff *)", "Bash(git log *)", "Bash(git add *)", "Bash(git commit *)",
              "mcp__astro-docs__*", "mcp__cloudflare-docs__*", "mcp__context7__*",
              "WebFetch(domain:docs.astro.build)", "WebFetch(domain:developers.cloudflare.com)", "WebFetch(domain:supabase.com)"],
    "ask":   ["Bash(git push *)", "Bash(npx wrangler deploy*)", "Bash(npx supabase db push*)", "mcp__supabase__apply_migration"],
    "deny":  ["Read(./.env)", "Read(./.env.*)", "Read(./.dev.vars)", "Bash(rm -rf *)", "Bash(git push --force*)",
              "mcp__supabase__execute_sql", "mcp__supabase__delete_branch"]
  },
  "disabledMcpjsonServers": []
}
```
Modes: default/manual, acceptEdits, plan, auto (classifier), dontAsk, bypassPermissions. In cloud sessions you set the
mode from a dropdown.
CLAUDE.md: keep it **under 200 lines**. Use `@path` imports (they don't reduce context cost) and `.claude/rules/*.md` with
`paths:` globs for scoped rules (e.g. `src/content/**` editorial rules, `supabase/**` RLS rules). `AGENTS.md` is read too.
`CLAUDE.local.md` is personal and gitignored. Use hooks, not CLAUDE.md, for anything that must always happen.
`/doctor prompt-audit` audits instruction files. Auto memory loads its first 200 lines / 25KB.
Suggested CLAUDE.md sections: stack and commands (`npm run dev|build|check|lint`), content model, editorial rules
(sources required, no fabricated quotes, UTC dates), Supabase rules (RLS always, anon key only client-side), deploy flow
(PR → CF preview → main), and a "never" list.
Output styles: built-ins are Default, Proactive, Concise, Explanatory and Learning. Custom styles go in
`.claude/output-styles/*.md` (`name`, `description`, `keep-coding-instructions`) and are set with `"outputStyle": "Concise"`
(case-sensitive). Concise suits phone use. Remote/mobile can select built-in styles only.

### 6. GitHub Actions / review

anthropics/claude-code-action: 9.7k stars, MIT, latest tag v1.0.262 (24 Oct; GitHub "Latest" badge on v1, 26 Aug), ~485
issues. Set up with `/install-github-app` (needs `gh`; creates secret `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`
from `claude setup-token`). Inputs: `prompt`, `claude_args`, `plugin_marketplaces`, `plugins`, `settings`,
`trigger_phrase`. Official auto-review workflow:
```yaml
name: Code Review
on: { pull_request: { types: [opened, synchronize, ready_for_review, reopened] } }
jobs:
  review:
    runs-on: ubuntu-latest
    permissions: { contents: read, pull-requests: read, issues: read, id-token: write }
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 1 }
      - uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          plugin_marketplaces: "https://github.com/anthropics/claude-code.git"
          plugins: "code-review@claude-code-plugins"
          prompt: "/code-review:code-review --comment ${{ github.repository }}/pull/${{ github.event.pull_request.number }}"
          claude_args: '--allowedTools "mcp__github_inline_comment__create_inline_comment" --max-turns 15'
```
Alternatives that need no workflow: the managed **Code Review** product, and **Auto-fix** in cloud sessions (watches
PR CI and comments, which is ideal from a phone). Also consider anthropics/claude-code-security-review (an official
security-review Action). For astro-docs in CI, add it to `mcp_config` and set
`allowed_tools: mcp__astro-docs__search_astro_docs`. The repo already has ~40 workflows, so add review alongside
`site-quality.yml` and don't replace it.

### 7. Security notes

- **Prompt injection is the main risk.** Fetched pages (news sources, X posts), Supabase rows (user comments) and Beehiiv
  content can all carry instructions. Keep read-only + project-scoped Supabase, keep manual approval for writes, and never
  combine an untrusted-content reader with a write-capable deploy tool in one unattended run. Parry-guard and Safety Net
  are hook-based mitigations worth evaluating.
- **Least privilege**: Cloudflare OAuth with only the needed scopes, GitHub read-only toolsets, Beehiiv read-only unless
  drafting, GSC service account with Restricted access, and `GSC_ALLOW_DESTRUCTIVE` unset.
- **Secrets**: in cloud envs, use **network secrets** (the proxy attaches them; the VM never sees them). Environment
  variables and the setup script are readable by anyone using the environment. Deny `Read(.env*)`. Run gitleaks in the
  hook **and** in CI.
- **Supply chain**: pin MCP versions, review vendored SKILL.md files and plugins (they run as you), and avoid `@latest` in
  committed config. Note that project `.mcp.json` servers auto-load without prompting in cloud and `-p` runs.
- **Browser MCPs aren't sandboxes**: `--allowed-origins` isn't a security boundary. Use `--isolated` and never log into
  real accounts in the agent's browser.
- **Bypass mode**: avoid `bypassPermissions` outside isolated VMs. Cloud VMs are isolated but can still reach connectors
  and the Anthropic API.
