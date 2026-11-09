#!/bin/sh
# Push the current commit, rebasing onto main first, after scripts/check-site-integrity.py passes. Retries with backoff because several
# scheduled jobs commit to main within seconds of each other. --autostash keeps leftover
# build output that was not committed from blocking the rebase ("You have unstaged changes").
set -u
n=1
while [ "$n" -le 5 ]; do
  if git pull --rebase --autostash; then
    # Never push a commit that leaves pages cut off, bundles missing or Dispatch emptied.
    # Problems already on main do not block (see the script); new ones stop the job, visibly.
    if ! python3 scripts/check-site-integrity.py --ref HEAD --base '@{u}'; then
      echo "not pushing: the site integrity check failed (see above)" >&2
      exit 1
    fi
    if git push; then
      exit 0
    fi
  fi
  git rebase --abort 2>/dev/null || true
  echo "push attempt $n failed; retrying in $((n * 10))s"
  sleep $((n * 10))
  n=$((n + 1))
done
echo "push failed after 5 attempts" >&2
exit 1
