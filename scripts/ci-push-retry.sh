#!/bin/sh
# Push the current commit, rebasing onto main first. Retries with backoff because several
# scheduled jobs commit to main within seconds of each other. --autostash keeps leftover
# build output that was not committed from blocking the rebase ("You have unstaged changes").
set -u
n=1
while [ "$n" -le 5 ]; do
  if git pull --rebase --autostash && git push; then
    exit 0
  fi
  git rebase --abort 2>/dev/null || true
  echo "push attempt $n failed; retrying in $((n * 10))s"
  sleep $((n * 10))
  n=$((n + 1))
done
echo "push failed after 5 attempts" >&2
exit 1
