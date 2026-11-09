# Migration: GitHub Pages to Astro on Cloudflare Workers

Status: **PAUSED by the owner on 9 Nov 2026** ("the site is fine"). Done so far: scaffold and parity proof, phone publishing,
the Dispatch collection and Markdown renderer, and a manual Cloudflare preview. Nothing below is scheduled. The live site is unchanged. GitHub Pages still serves the repo root.
Nothing is deleted, no DNS changes. Approved by the owner on 26 Oct 2026; later phases each need their own plan and approval.

## How it works today (this branch)
- `astro/` is a separate project next to the site. The repo root stays the source of truth because ~80 generator scripts and the
  bot workflows edit root HTML in place.
- `npm run build` (in `astro/`) runs `scripts/prepare-legacy.mjs`, which hardlinks the publishable files into `astro/.legacy/`
  (Astro's `publicDir`), writes `_headers` and `_redirects`, then `astro build` writes `astro/dist/`. Pages listed in
  `astro/ported.json` are skipped by the copy and come from `astro/src/pages/` instead (none yet).
- `npm run parity` compares `dist/` with the root: every publish file byte for byte, every sitemap URL resolves, no repo-only
  file leaks, Workers limits (under 20,000 files, none over 25 MiB), `html_handling` stays `none`.
- `npm run preview` serves `dist/` with `wrangler dev`. Config is `astro/wrangler.jsonc`.

Needs Node 22.23.4 or newer (Astro 7). `engines` enforces it.

## Decisions that are easy to get wrong
- `build.format: 'file'` and `html_handling: "none"` keep `/tesla.html` as `/tesla.html`. The Cloudflare default redirects it to `/tesla`.
- `html_handling: "none"` also stops `/` mapping to `index.html`, so `worker/index.js` handles `/` only (`run_worker_first: ["/"]`).
- Publish list is an allowlist in `prepare-legacy.mjs`. Repo-only folders (`scripts tests docs supabase workers templates .github .claude astro dev`) and `*.md` outside `assets/` and `data/` never publish.
- Four meta-refresh stubs and two directory URLs become real 301s. `/grok-bot.html` and `/dispatch/grok-crew.html` point at `/grok.html#tutorial`; a fragment can't go in a Cloudflare redirect rule here, so those two stay as the stub pages.
- Cache rules are in `_headers`: hashed bundles and fonts immutable for a year, HTML `s-maxage=300` with stale-while-revalidate, data 60 s. No CSP yet, because inline scripts exist.

## Rollback
Delete `astro/`, `.github/workflows/astro-checks.yml` and `tests/test_astro_scaffold.py`. Nothing else was touched.

## P2 progress (approved by the owner on 9 Nov 2026)
- **A, done:** Markdown is the publishing path today, without Astro. `docs/publish-from-phone.md` has a one-tap link that opens
  GitHub's editor on a pre-filled `content/dispatch/<slug>.md` (template: `docs/article-template.md`); `home-build.yml` renders it
  with `scripts/render-article.py`. `tests/test_publish_flow.py` runs the whole path in a throwaway copy.
- **B1, done:** `astro/src/content.config.ts` defines the `dispatch` collection over the same files with the renderer's front-matter
  rules. `astro/scripts/check-content-schema.mjs` (in `astro-checks.yml`) proves Astro and the renderer accept and refuse the same
  fixtures; writing it found that the renderer let a DRAFT headline through, now fixed. No page is built from the collection yet.
- **B2a, done:** `astro/src/lib/dispatch-md.mjs` renders the Markdown dialect for Astro; `astro/scripts/check-md-parity.mjs`
  (in `astro-checks.yml`) proves it returns the same HTML and the same errors as `render-article.py` on every syntax. Writing it
  found that an unknown `::directive` line hung the renderer (and CI) forever; both now refuse it.
- **B2b, next:** an Astro article layout for collection entries (head, nav, reader tools, related stories, NewsArticle data, footer)
  that matches the live article template, compared section by section with what `render-article.py` + the CI generators produce.
  Pages switch to Astro only through `ported.json`, one at a time.
- **C, after B2:** convert the 121 hand-written HTML articles to Markdown (scripted, checked page by page).

## Later phases (each needs its own plan and approval)
1. **P2** Dispatch articles as an Astro content collection; new articles in Markdown, publishable from a phone.
2. **P3** reviews, hubs, homepage. **P4** trackers on Worker crons and R2 instead of bot commits to `main`.
3. **P5** video to R2 or Stream, repo history slimming. **P6** retire the per-page generator scripts.
4. **Cutover:** attach `superchargeddaily.com` to the Worker (your DNS action), keep Pages for instant rollback, watch Search Console and CrUX for 24 h.

## Preview on Cloudflare (set up 9 Nov 2026)
The owner added the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets. `.github/workflows/astro-preview.yml`
(by hand only: Actions > astro-preview > Run workflow) builds, runs parity and uploads a separate Worker, `superchargeddaily-preview`,
from `astro/wrangler.preview.jsonc`. It lives on a `*.workers.dev` address, has no routes or custom domain, and its Worker adds
`X-Robots-Tag: noindex, nofollow` to every response, so it cannot compete with the real site in search. The run's summary shows
the address: https://superchargeddaily-preview.superchargeddaily.workers.dev (first upload 9 Nov 2026: 2,287 files, 90 s).
The production config (`astro/wrangler.jsonc`) is unchanged and still not deployed anywhere.

## Order of work (revised 9 Nov 2026)
Porting article pages to Astro has no payoff yet: the live article is the renderer's output plus six CI generators (related
stories, wayfinding, reader tools, SEO/JSON-LD, share image, feed), so an Astro-built article would be worse until all of those
are ported. The hosting move does not depend on it, because the Cloudflare copy is the repo root byte for byte. So:
1. **Hosting cutover first** (owner's DNS action, Pages kept for rollback): gains real 301s, cache rules and Workers crons.
2. **P4 trackers** on Workers crons/R2: ends the bot commits to main and the merge conflicts.
3. **Then** port generators and pages into Astro, one at a time, behind `ported.json`.

## Paused (9 Nov 2026)
The owner decided the site is fine as it is. The site integrity check (`scripts/check-site-integrity.py`) now stops the
failures that motivated the move. The preview workflow is manual only and the preview Worker can be deleted in the Cloudflare
dashboard (Workers & Pages > superchargeddaily-preview) at any time. To resume, start from "Order of work" above.
