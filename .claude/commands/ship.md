---
description: Run the definition-of-done checks, review, merge main, push the branch and open a PR
argument-hint: "[PR title or notes]"
allowed-tools: Read, Grep, Glob, Edit, Bash, Agent
---
Ship the current branch. Notes from the owner: $ARGUMENTS

Work through this in order and stop at the first real failure; fix it or report it, then continue.

1. **Branch**: not on main (`git branch --show-current`). `git status` shows only intended files.
2. **Tests**: `python3 -m unittest tests/test_seo_audit.py tests/test_claude_setup.py`, `node --test tests/*.test.mjs`, and the
   browser test for each area you touched (`CHROMIUM_PATH=... python3 tests/<name>-browser.py`; see `.github/workflows`).
   If a test fails, check whether it also fails on main (`git worktree add <dir> origin/main`) before blaming the change.
3. **Generated output**: for every builder whose inputs you changed, rebuild and confirm `git diff` is empty afterwards
   (builders must be deterministic). Run `sh scripts/rebuild-js.sh` if JS or CSS changed, and bump any pinned `?v=`.
4. **Pages you changed**: `scripts/audit/run.sh <page> --quick` and `/screenshot` at 390/768/1440 in light and dark.
   Look at the images. No console errors, no horizontal scroll, no layout shift.
5. **Content**: `grep -rn "DRAFT" dispatch/ docs/newsletter-drafts/ 2>/dev/null` is empty; no invented numbers, quotes or ratings.
6. **Review**: run the `reviewer` agent on the diff. Fix every BLOCKER and SHOULD-FIX or say why not. Only continue on SHIP.
7. **Docs**: add a dated entry to `docs/changelog.md`; add to `docs/decisions.md` if you made a real choice.
8. **Sync**: `git fetch origin main && git merge origin/main`. Bots commit rebuilt pages to main about every 30 minutes, so
   conflicts in generated pages are normal: take main's version of the file and re-apply your change with the builder or
   the same edit, never hand-merge generated HTML. Re-run steps 2-3 after resolving.
9. **Push and PR**: commit with a clear message, `git push -u origin <branch>`, then open a PR (GitHub MCP tools in cloud
   sessions) following the repo's PR template if it has one. Keep the body to what changed, why, and what to check.
   Never push to main, force-push, or merge it yourself.
10. Tell the owner: what changed, the evidence (test and audit results), anything unverified, and that merging soon avoids
    new conflicts with the bots. Offer to watch the PR for CI and review comments.
