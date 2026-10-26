#!/usr/bin/env bash
# One-shot page audit: SEO metadata, axe accessibility, Lighthouse.
# usage: scripts/audit/run.sh <path|url> [--live] [--quick]     (--quick skips Lighthouse)
set -u
cd "$(dirname "$0")/../.."
target="${1:?usage: run.sh <path|url> [--live] [--quick]}"; shift
live=""; quick=""
for a in "$@"; do [ "$a" = "--live" ] && live="--live"; [ "$a" = "--quick" ] && quick=1; done
rc=0
echo "### SEO / metadata"
case "$target" in
  http*) python3 scripts/audit/seo_check.py "$target" || rc=1 ;;
  *) if [ -n "$live" ]; then python3 scripts/audit/seo_check.py "https://superchargeddaily.com/${target#/}" || rc=1
     else python3 scripts/audit/seo_check.py "$target" || rc=1; fi ;;
esac
echo; echo "### Accessibility (axe, WCAG 2.2 AA)"
node scripts/audit/axe.mjs "$target" $live || rc=1
if [ -z "$quick" ]; then echo; echo "### Lighthouse"; node scripts/audit/lighthouse.mjs "$target" $live || rc=1; fi
echo; [ $rc -eq 0 ] && echo "AUDIT PASS" || echo "AUDIT FOUND ISSUES"
exit $rc
