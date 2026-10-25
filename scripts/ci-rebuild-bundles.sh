#!/bin/sh
# Rebuild hashed JS bundles (build-js.mjs + inject-js-bundles.py) when any bundle source listed
# in scripts/js-bundles.json differs from HEAD, e.g. after newsletter-latest.js edits grow.js.
# Prints "rebuilt" when it did. Never touches templates/starlink-sky.html.
set -e
cd "$(dirname "$0")/.."
SRC=$(python3 -c "import json;c=json.load(open('scripts/js-bundles.json'));print(' '.join(sorted({f for v in c['bundles'].values() for f in v})))")
# shellcheck disable=SC2086
if git diff --quiet HEAD -- $SRC; then
  echo "bundle sources unchanged"
  exit 0
fi
node scripts/build-js.mjs
python3 scripts/inject-js-bundles.py
git checkout -- templates/starlink-sky.html 2>/dev/null || true
echo "rebuilt"
