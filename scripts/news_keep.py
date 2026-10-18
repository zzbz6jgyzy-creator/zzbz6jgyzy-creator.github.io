"""Deterministic keep / dedupe / relevance helpers for the news snapshot.

This is an editorial filter, not a fact checker. A high score means the
headline looks on-topic and comes from a known desk — it does not establish
that the claim is true.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

FINANCE_RE = re.compile(
    r"\$[\d,.]+\s+invested|"
    r"could be worth|"
    r"if you.{0,40}invested|"
    r"become a millionaire|"
    r"this one stock to buy|"
    r"stock to buy now|"
    r"\bone stock\b|"
    r"should you buy",
    re.I,
)

TRUST_BOOST = {
    "tesla": 8,
    "spacex": 8,
    "nasa": 6,
    "reuters": 5,
    "associated press": 5,
    "ap news": 5,
    "bloomberg": 4,
    "wall street journal": 4,
    "wsj": 4,
    "cnbc": 3,
    "bbc": 3,
    "the verge": 3,
    "arstechnica": 3,
    "ars technica": 3,
    "axios": 3,
    "teslarati": 2,
    "not a tesla app": 2,
}

TRUST_DOWN = {
    "motley fool": 6,
    "seeking alpha": 4,
    "investorplace": 5,
    "benzinga": 3,
}

RELEVANT = re.compile(
    r"\b(tesla|spacex|starship|starlink|roadster|optimus|fsd|robotaxi|cybercab|"
    r"cybertruck|grok|xai|raptor|super heavy|powerwall|megapack|"
    r"full self.?driving)\b",
    re.I,
)

SPECULATION = re.compile(
    r"\b(could|might|reportedly|rumou?r|sources say|allegedly|odd new promise)\b",
    re.I,
)


def title_key(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (title or "").lower())[:80]


def is_electrek(row: dict) -> bool:
    blob = f"{row.get('url', '')} {row.get('source', '')}".lower()
    return "electrek" in blob


def is_finance_speculation(title: str) -> bool:
    return bool(FINANCE_RE.search(title or ""))


def keep_item(row: dict) -> bool:
    if is_electrek(row):
        return False
    if is_finance_speculation(row.get("title") or ""):
        return False
    return True


def trust_score(source: str) -> int:
    text = (source or "").lower()
    score = 0
    for name, pts in TRUST_BOOST.items():
        if name in text:
            score += pts
    for name, pts in TRUST_DOWN.items():
        if name in text:
            score -= pts
    return score


def relevance_score(row: dict) -> int:
    text = f"{row.get('title', '')} {row.get('snippet', '')} {row.get('topic', '')}"
    score = 4 if RELEVANT.search(text) else 0
    score += trust_score(row.get("source") or "")
    return score


def load_hold(path: Path | None) -> dict:
    if not path or not path.exists():
        return {"urls": [], "titleKeys": []}
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError:
        return {"urls": [], "titleKeys": []}
    return {
        "urls": [str(u).rstrip("/") for u in data.get("urls") or []],
        "titleKeys": [str(k) for k in data.get("titleKeys") or []],
    }


def is_held(row: dict, hold: dict | None) -> bool:
    if not hold:
        return False
    url = (row.get("url") or "").rstrip("/")
    if url and url in hold.get("urls", []):
        return True
    key = title_key(row.get("title") or "")
    return bool(key and key in hold.get("titleKeys", []))


def apply_keep(items: list[dict], hold: dict | None = None) -> list[dict]:
    kept = [row for row in items if keep_item(row) and not is_held(row, hold)]
    kept.sort(key=lambda row: row.get("published") or "", reverse=True)
    seen: set[str] = set()
    stems: dict[str, dict] = {}
    out: list[dict] = []
    for row in kept:
        key = title_key(row.get("title") or "")
        if not key or key in seen:
            continue
        seen.add(key)
        stem = key[:40]
        if stem and stem in stems:
            primary = stems[stem]
            related = list(primary.get("related") or [])
            related.append({"source": row.get("source") or "", "url": row.get("url") or ""})
            primary["related"] = related
            continue
        next_row = dict(row)
        if SPECULATION.search(next_row.get("title") or ""):
            next_row["flag"] = "speculation"
        next_row["score"] = relevance_score(next_row)
        if stem:
            stems[stem] = next_row
        out.append(next_row)
    return out
