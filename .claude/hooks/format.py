#!/usr/bin/env python3
"""PostToolUse(Edit|Write): format the file Claude just changed. Never blocks.

This repo mixes hand-written source with generated or minified files (one-line CSS and
JS, built HTML, data JSON). Reformatting those would bury real changes in huge diffs, so
only files that look hand-written are formatted: Markdown, and CSS/JS/JSON whose longest
line is short. Generated areas are always skipped.
"""
import json
import os
import shutil
import subprocess
import sys

SKIP_DIRS = ("assets/", "data/", "vendor/", "dispatch/", "reviews/", "explainers/", "guides/", "cybercab-cities/",
             "fsd-europe/", "node_modules/", ".git/", "docs/previews/", "supabase/")
EXTS = (".md", ".css", ".js", ".mjs", ".json")
MAX_LINE = 400


def main():
    try:
        event = json.load(sys.stdin)
        path = event["tool_input"]["file_path"]
    except Exception:
        return 0
    root = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    rel = os.path.relpath(path, root).replace(os.sep, "/")
    if rel.startswith("..") or not rel.endswith(EXTS) or rel.startswith(SKIP_DIRS) or ".bundle." in rel:
        return 0
    if rel.endswith(".json") and not rel.startswith((".claude/", "scripts/")):
        return 0
    try:
        with open(path, encoding="utf-8") as fh:
            if max((len(line) for line in fh), default=0) > MAX_LINE:
                return 0
    except OSError:
        return 0
    prettier = shutil.which("prettier")
    if prettier:
        subprocess.run([prettier, "--write", "--log-level", "silent", path], cwd=root, timeout=60, check=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
