#!/usr/bin/env python3
"""Representative keep / dedupe checks for the wire filter."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from news_keep import apply_keep, keep_item, title_key

CASES = [
    {
        "title": "Here's What $5,000 Invested in SpaceX Could Be Worth in 2030",
        "source": "The Motley Fool",
        "url": "https://example.com/fool",
        "keep": False,
    },
    {
        "title": "This one stock to buy before Tesla earnings",
        "source": "InvestorPlace",
        "url": "https://example.com/ip",
        "keep": False,
    },
    {
        "title": "SpaceX throttled Starlink in Ukraine",
        "source": "Electrek",
        "url": "https://electrek.co/starlink",
        "keep": False,
    },
    {
        "title": "Zelensky says Musk-owned satellite system still restricted in Ukraine",
        "source": "Axios",
        "url": "https://example.com/axios",
        "keep": True,
    },
    {
        "title": "Elon Musk makes an odd new promise about the Tesla Roadster",
        "source": "Yahoo Finance",
        "url": "https://example.com/roadster",
        "keep": True,
        "flag": "speculation",
    },
]


def main() -> int:
    failed = 0
    for case in CASES:
        got = keep_item(case)
        if got != case["keep"]:
            print(f"FAIL keep {case['title']!r}: got {got} want {case['keep']}")
            failed += 1
    rows = [
        {"title": "Tesla’s Flying Roadster and the SpaceX Halo", "source": "Barron's", "url": "https://a", "published": "2026-10-18T20:23:00Z", "topic": "tesla"},
        {"title": "Tesla’s Flying Roadster and the SpaceX Halo", "source": "Barron's", "url": "https://b", "published": "2026-10-18T20:23:00Z", "topic": "spacex"},
        {"title": "Here's What $5,000 Invested in SpaceX Could Be Worth in 2030", "source": "The Motley Fool", "url": "https://c", "published": "2026-10-18T23:13:57Z", "topic": "spacex"},
        {"title": "Zelensky says Musk-owned satellite system still restricted in Ukraine", "source": "Axios", "url": "https://d", "published": "2026-10-18T21:02:21Z", "topic": "spacex"},
    ]
    out = apply_keep(rows)
    titles = [r["title"] for r in out]
    if any("Invested" in t for t in titles):
        print("FAIL finance title survived apply_keep")
        failed += 1
    if titles.count("Tesla’s Flying Roadster and the SpaceX Halo") != 1:
        print("FAIL exact title_key did not collapse Roadster pair", titles)
        failed += 1
    flagged = [r for r in apply_keep([CASES[4]]) if r.get("flag") == "speculation"]
    if not flagged:
        print("FAIL speculation flag missing")
        failed += 1
    if title_key("Hello, World!") != "helloworld":
        print("FAIL title_key")
        failed += 1
    if failed:
        print(f"{failed} failed")
        return 1
    print("news_keep ALL_PASS", len(out), "kept from fixture")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
