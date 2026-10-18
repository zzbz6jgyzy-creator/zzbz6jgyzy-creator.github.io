#!/usr/bin/env python3
"""Add minutes to data/articles.json from article HTML word counts.
Never overwrite dates, topics, titles, or existing minutes."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "articles.json"
WPM = 220
TAG = re.compile(r"<[^>]+>")
WS = re.compile(r"\s+")


def words_in(path: Path) -> int:
    html = path.read_text(encoding="utf-8")
    m = re.search(r"<main\b[^>]*>([\s\S]*?)</main>", html, re.I)
    body = m.group(1) if m else html
    body = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", " ", body, flags=re.I)
    body = re.sub(r"<style\b[^>]*>[\s\S]*?</style>", " ", body, flags=re.I)
    text = WS.sub(" ", TAG.sub(" ", body)).strip()
    return len([w for w in text.split(" ") if w])


def main() -> None:
    data = json.loads(OUT.read_text(encoding="utf-8"))
    changed = 0
    for art in data.get("articles") or []:
        if art.get("minutes"):
            continue
        path = ROOT / str(art.get("url") or "").lstrip("/")
        if not path.exists():
            continue
        n = words_in(path)
        art["minutes"] = max(1, round(n / WPM))
        changed += 1
    if not changed:
        print("minutes unchanged")
        return
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"added minutes to {changed} articles")


if __name__ == "__main__":
    main()
