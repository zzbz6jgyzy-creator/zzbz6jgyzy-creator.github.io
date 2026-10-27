#!/bin/sh
# Studio jobs rebuild generated HTML/JSON/bundles, then check the tree matches.
# On pull_request that comparison is skipped: those files are written by scheduled
# jobs on main (and by home-build.yml / js-bundle.yml after merge). A PR that
# only changes a builder would otherwise have to commit a snapshot that goes
# stale the next time news-snapshot or launches-refresh runs.
# On push / schedule / workflow_dispatch the check still runs, so main cannot
# drift from its builders.
set -e
if [ "${1:-}" = "--" ]; then shift; fi
if [ "${GITHUB_EVENT_NAME:-}" = "pull_request" ]; then
  echo "PR: skipping generated-file ownership ($(printf '%s ' "$@"))"
  exit 0
fi
git diff --exit-code -- "$@"
