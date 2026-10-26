#!/usr/bin/env python3
"""SessionStart: orient the session. Prints context for Claude; changes nothing.

Cloud sessions only do the git fetch (fast); everything else is local reads.
"""
import os
import subprocess

root = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()


def git(*args):
    try:
        return subprocess.run(["git", *args], cwd=root, capture_output=True, text=True, timeout=60).stdout.strip()
    except Exception:
        return ""


branch = git("branch", "--show-current") or "(detached)"
if os.environ.get("CLAUDE_CODE_REMOTE") == "true":
    git("fetch", "--quiet", "origin", "main")
behind = git("rev-list", "--count", "HEAD..origin/main") or "?"
ahead = git("rev-list", "--count", "origin/main..HEAD") or "?"
dirty = len(git("status", "--short").splitlines())
print(f"Branch {branch}: {ahead} ahead / {behind} behind origin/main, {dirty} uncommitted file(s).")
if branch in ("main", "master"):
    print("You are on main. Create a branch before editing; commits on main are blocked by the pre-commit hook.")
if behind not in ("0", "?"):
    print("origin/main has new commits. Bots commit data and rebuilt pages to it about every 30 minutes, so merge it "
          "(git merge origin/main) before pushing and again before opening a PR; see .claude/rules/repo-mechanics.md.")
print("Before calling work done: python3 -m unittest tests/test_seo_audit.py, node --test tests/*.test.mjs, "
      "scripts/audit/run.sh <page> --quick for changed pages. Full checklist: /ship.")
