---
description: Screenshot a page at 390, 768 and 1440 px in light and dark, then look at them
argument-hint: "<path or URL, e.g. /dispatch/foo.html> [--full] [--live]"
allowed-tools: Read, Bash(node scripts/audit/screenshot.mjs*)
---
Screenshot: $ARGUMENTS

1. Run `node scripts/audit/screenshot.mjs $ARGUMENTS` (output defaults to a temp folder; pass a directory as the second
   argument to choose one). Local paths are served from the repo with third-party requests blocked, so embeds and the
   comment widget show their offline state; use `--live` for the real page.
2. Open the PNGs with the Read tool: at least 390 dark, 390 light and 1440 dark; all six if anything looks off.
3. Report what is wrong with specifics (clipped text, overflow, low contrast, a layout jump, an empty area) and where in
   the source it likely comes from. If it looks right, say so briefly and name what you checked.
