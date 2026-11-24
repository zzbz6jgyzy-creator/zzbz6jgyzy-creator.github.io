#!/bin/sh
# Regenerate every generated page from the data already in the repo, in pipeline order:
# articles -> trackers and studios -> homepage -> images -> nav, footer, members, bundles -> SEO.
#
# Use it after a merge conflict in a generated page: take main's copy of the page, run this, review
# `git diff`, commit. It follows home-build.yml's order and adds the studio builders that each run in
# their own *-checks.yml workflow, so no builder runs before the data or pages it reads.
#
# It fetches no data: the network refreshers (fetch-launches.py, the robotaxi and Starlink fetchers,
# newsletter-latest.js, the Earth/cosmos asset fetchers) are not run; their committed data files are the
# inputs. One-off builders that no workflow runs (plan book, map/club/viewing assets) are left out too.
# It does need npm: rebuild-js.sh installs the pinned esbuild (bundle hashes must match CI), and step 4
# installs sharp for responsive images (skipped without it, as in home-build).
#
# Needs full git history: article dates, sitemap lastmod and the updates history walk it.
set -eu
cd "$(dirname "$0")/.."

if [ "$(git rev-parse --is-shallow-repository)" != "false" ]; then
  echo "rebuild-all: this clone is shallow. Run 'git fetch --unshallow' first; article and sitemap dates need full history." >&2
  exit 1
fi

step() {
  printf '\n== %s\n' "$*"
  "$@"
}

# A failure part-way leaves earlier steps' output in place; say so instead of exiting quietly.
trap 'echo "rebuild-all: stopped at the step above. The tree is only partly regenerated; fix the error and run it again." >&2' EXIT
# inject-js-bundles.py touches this template and CI never commits that; restore it only if it started clean.
if git diff --quiet -- templates/starlink-sky.html; then restore_sky=1; else restore_sky=0; fi

# 1. Articles: Markdown to pages, reader tools, then the index, related stories and dates.
step python3 scripts/render-article.py
step python3 scripts/build-article-reader.py
step python3 scripts/build-articles.py
step node scripts/sd-intel.js
step python3 scripts/inject_newsletter.py

# 2. Trackers and studios. Calendar first: launch viewing, SpaceX and markets read its JSON.
#    FSD Europe before FSD global, which reads its data.
for builder in build-calendar-studio build-launch-viewing build-spacex-studio build-markets-studio \
  build-news-studio build-tesla-overview build-grok-studio \
  build-fsd-europe build-fsd-global build-fsd-tracker \
  build-starship-studio build-starlink-observatory build-mobility \
  build-production-studio build-promise-studio build-autonomy-evidence build-optimus-studio \
  build-buying-studio build-cybertruck-studio build-model3-studio build-owners-club build-reviews-studio \
  build-gear-studio build-cybercab-guide build-roadster-studio build-roadster-experience build-event-pages; do
  step node "scripts/$builder.mjs"
done
step python3 scripts/build-updates-history.py
step python3 scripts/build-wallpapers-studio.py
step python3 scripts/build-explainers.py

# 3. Homepage, then what is derived from the finished pages. build-noscript.mjs also re-renders the
#    dated tracker snapshots (cybercab.html, updates.html), so it runs after build-mobility.mjs.
step node scripts/build-home.js
step node scripts/build-noscript.mjs
step python3 scripts/build-wayfinding.py
step python3 scripts/build-feed.py

# 4. Responsive images (skipped without sharp, as in home-build), then the SpaceX hub for its new image sets.
npm i --no-save --no-package-lock sharp@0.33 >/dev/null 2>&1 || true
step node scripts/build-images.mjs || echo "image build skipped"
step node scripts/build-wallpaper-thumbs.mjs || echo "wallpaper thumbs skipped"
step node scripts/build-spacex-studio.mjs

# 5. Site-wide furniture on every page, then the hashed bundles and the pages built from the finished home.
step python3 scripts/sync-nav.py
step python3 scripts/sync-footer.py
step python3 scripts/inject-members.py
step sh scripts/rebuild-js.sh
step node scripts/build-personal-home.mjs

# 6. Trust pages, share images, structured data, sitemap and RSS.
step python3 scripts/build-trust-pages.py
if python3 -c "import PIL" 2>/dev/null; then
  step python3 scripts/generate-og.py
else
  echo "share images skipped (pip install pillow)"
fi
step python3 scripts/build-seo.py

if [ "$restore_sky" = 1 ]; then git checkout -- templates/starlink-sky.html; fi
trap - EXIT

printf '\n== Changed files\n'
git status --short
step python3 scripts/check-site-integrity.py
