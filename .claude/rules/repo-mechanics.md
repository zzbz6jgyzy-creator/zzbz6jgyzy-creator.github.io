# How this repo behaves (read before editing generated pages)

- **Static site, no server.** GitHub Pages behind Cloudflare. HTML, CSS and vanilla JS at the repo root. No package.json, no
  framework. Preview with `python3 -m http.server 4173`. Migration to Astro on Cloudflare is recommended in
  `docs/audit.md` and `docs/research.md` but is NOT approved; don't start it.
- **Many pages are generated.** `scripts/build-*.mjs|py` write them (studios, articles index, SEO, feeds, bundles). Change the
  generator and its data, rebuild, commit both. Never hand-edit generated HTML to fix something a builder would undo.
- **Two builders must not write the same tag.** build-seo.py, build-articles.py and each studio builder all rewrite parts of a
  page. Studios that own their own schema/title are listed in `scripts/build-seo.py` (`PAGE_TYPES` comment). If a CI
  "determinism" check fails, a second builder is overwriting the first.
- **Bots commit to main about every 30 minutes** (news, software, launches, rebuilt pages). So: `git fetch origin main &&
  git merge origin/main` before you push and before a PR; conflicts land in generated pages (`calendar.html`, `news.html`,
  `index.html`, `starlink.html`). Resolve by taking main's file and re-applying your change, then rebuild. Merge PRs soon after
  CI is green.
- **JS bundles are hashed.** After changing any JS or CSS that a bundle includes run `sh scripts/rebuild-js.sh`; pages reference
  `assets/js/<name>.bundle.<hash>.js`. Pages also pin `?v=` on some stylesheets; bump it when the file changes.
- **Tests live in two places.** `tests/*.test.mjs` (node:test), `tests/test_*.py` (unittest), `tests/*-browser.py` (Playwright;
  set `CHROMIUM_PATH` to a Chrome/Chromium; cloud sessions have one under `/opt/pw-browsers`), plus `scripts/test-*.mjs`.
  Each area has a `.github/workflows/*-checks.yml` that rebuilds and runs `git diff --exit-code`.
- **Shallow clones break date logic.** `scripts/editorial-dates.py` walks git history; run `git fetch --unshallow` before
  running `scripts/build-seo.py` or `build-articles.py`, and don't run them on everything locally unless you mean to commit the
  result (CI does it on push to main).
- **Never commit** secrets, `.env`, or anything under `node_modules`. The Supabase publishable key in `members-config.json`
  is public by design; the service-role key and Google client secret are not and never belong here.
- **Dark is the brand default**, light is supported; the site follows the device setting until the reader toggles
  (`theme-boot.js`, `theme.js`, key `sd-theme`). Test both.
