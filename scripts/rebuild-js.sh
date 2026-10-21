#!/bin/sh
# Rebuild hashed JS bundles and refresh <!--sd:bundles--> tags.
# Safe to re-run; sources at the repo root stay the editable originals.
set -e
cd "$(dirname "$0")/.."
npm i --no-save --no-package-lock esbuild@0.25.12 >/dev/null
node scripts/build-js.mjs
python3 scripts/inject-js-bundles.py
