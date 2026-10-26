---
description: Audit one page for SEO, WCAG 2.2 AA accessibility and Core Web Vitals, then list prioritised fixes
argument-hint: "<path or URL, e.g. /starship.html> [--live] [--quick]"
allowed-tools: Read, Grep, Glob, Bash(scripts/audit/*), Bash(node scripts/audit/*), Bash(python3 scripts/audit/*)
---
Audit: $ARGUMENTS

1. Run `scripts/audit/run.sh $ARGUMENTS`. It checks metadata and structured data, runs axe (WCAG 2.0/2.1/2.2 A and AA)
   at 390 and 1440 px in light and dark, then Lighthouse for mobile and desktop. A path audits the repo locally; add
   `--live` for superchargeddaily.com (real compression and caching). `--quick` skips Lighthouse.
2. Local Lighthouse runs against a plain Python server (no compression, no caching) and under simulated throttling, so
   treat its performance number as a lower bound and confirm important results with `--live`.
3. Do not stop at the scores. For each failure find the cause in the source (read the CSS rule or the generator), and say
   which file would change.
4. Report a short table: issue, WCAG criterion or metric, page evidence, fix, effort (S/M/L), impact (H/M/L), ordered by
   impact over effort. State what automated tools cannot check on this page (focus order, 2.4.11 focus not obscured,
   dragging alternatives) and give a 3-line manual checklist for it.
5. Do not edit anything unless asked; offer to fix the top items.
