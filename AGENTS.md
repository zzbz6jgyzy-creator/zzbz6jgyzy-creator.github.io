# Supercharged Daily — agent notes

This is the Tesla, SpaceX and Grok/xAI news site at [superchargeddaily.com](https://superchargeddaily.com). The project brief, editorial bar and Claude Code setup live in `CLAUDE.md`. Cursor reads both files.

**Elephant/goldfish workflow** is described in `CLAUDE.md` under "Working with Claude Code (elephant/goldfish commands)". Cursor skills are in `.cursor/skills/eg-*/` (`/eg-brainstorm`, `/eg-prd`, `/eg-fix-bug`, `/eg-new-feature`, `/eg-precommit-review`). Claude Code has the same five as slash commands in `.claude/commands/eg-*.md`.

**MotionSites** cinematic landing-page skill: `.claude/skills/motionsites-web-builder` (Cursor reads this folder too). Example prompts and media are gitignored; run `sh scripts/fetch-motionsites-shelf.sh` when you need the shelf.

Preview: `python3 -m http.server 4173` → http://localhost:4173.
