#!/usr/bin/env bash
# Pull MotionSites example prompts and contact sheets into the local skill folder.
# Those files are © MotionSites and are gitignored so this public repo does not redistribute them.
set -euo pipefail

PINNED=faa30d512e3973e58675c72101a7ef42ed37ae83
DEST="$(cd "$(dirname "$0")/.." && pwd)/.claude/skills/motionsites-web-builder"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone --depth 1 https://github.com/Motionsites-AI/claude-skill.git "$TMP/repo"
git -C "$TMP/repo" fetch --depth 1 origin "$PINNED"
git -C "$TMP/repo" checkout --detach "$PINNED"

SRC="$TMP/repo/plugins/motionsites-web-builder/skills/motionsites-web-builder"
rm -rf "$DEST/examples" "$DEST/media"
cp -a "$SRC/examples" "$DEST/examples"
cp -a "$SRC/media" "$DEST/media"
echo "Fetched examples/ and media/ at $PINNED into $DEST"
echo "These folders are gitignored. Do not commit them."
