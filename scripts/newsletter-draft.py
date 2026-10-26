#!/usr/bin/env python3
"""Draft the Sunday newsletter from the week's Dispatch stories and tracker changes.

    python3 scripts/newsletter-draft.py [--days 7] [--top 5] [--end 2026-11-01] [--write]

Prints Markdown ready to paste into Beehiiv (the Beehiiv API can't create drafts on the
current plan, so this is a paste-in block). With --write it also saves
docs/newsletter-drafts/<end-date>.md. Nothing is ever sent from here.

Stories come from data/articles.json. Pinned stories and ones with a longer read rank first;
tracker lines come from data/intelligence/changes.json and only use rows that carry a source.
The wording is the site's own summaries: edit the intro and add the "why it matters" by hand.
"""
import argparse
import datetime
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://superchargeddaily.com"


def parse(ts):
    d = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))
    return d if d.tzinfo else d.replace(tzinfo=datetime.timezone.utc)


def link(path, campaign):
    sep = "&" if "?" in path else "?"
    return f"{SITE}{path}{sep}utm_source=newsletter&utm_medium=email&utm_campaign={campaign}"


def pick(articles, start, end, top):
    week = [a for a in articles if start <= parse(a["date"]) <= end]
    week.sort(key=lambda a: (bool(a.get("pinned")), a.get("minutes") or 0, a["date"]), reverse=True)
    lead, rest = week[:1], week[1:top]
    rest.sort(key=lambda a: a["date"], reverse=True)
    return lead + rest, len(week)


def tracker_lines(changes, start, end, limit=6):
    seen, out = set(), []
    for c in sorted(changes, key=lambda c: c.get("at", ""), reverse=True):
        if c.get("tracker") == "dispatch" or not c.get("sourceUrl") or not c.get("summary"):
            continue
        when = c.get("at")
        if not when or not (start <= parse(when) <= end):
            continue
        key = (c.get("tracker"), c.get("field"))
        if key in seen:
            continue
        seen.add(key)
        out.append(c)
        if len(out) == limit:
            break
    return out


def render(articles, changes, start, end, top):
    campaign = f"sunday-{end.date().isoformat()}"
    stories, total = pick(articles, start, end, top)
    lines = [
        f"# Supercharged Daily · Sunday {end.day} {end.strftime('%B %Y')}",
        "",
        "<!-- DRAFT: write a 2-3 sentence intro in your own voice, then delete this line -->",
        "",
        "## The stories that mattered",
        "",
    ]
    if not stories:
        lines.append("_No Dispatch stories in this window._\n")
    for i, a in enumerate(stories, 1):
        read = f" ({a['minutes']} min read)" if a.get("minutes") else ""
        lines += [
            f"### {i}. [{a['title']}]({link(a['url'], campaign)})",
            f"*{a['tag']} · {parse(a['date']).day} {parse(a['date']).strftime('%b')}{read}*",
            "",
            a.get("summary", "").strip(),
            "",
            "<!-- DRAFT: one line on why it matters -->",
            "",
        ]
    rows = tracker_lines(changes, start, end)
    if rows:
        lines += ["## What changed on the trackers", ""]
        for c in rows:
            lines.append(f"- {c['summary'].strip()} ([source]({c['sourceUrl']}), {c.get('evidence', '').replace('_', ' ')})")
        lines.append("")
    lines += [
        "## Coming up",
        "",
        "<!-- DRAFT: next week's launches and earnings dates from /calendar.html; only dates that are confirmed -->",
        "",
        "---",
        f"Reply to this email with questions, or follow [@ALJR86](https://x.com/ALJR86). "
        f"Everything is on [superchargeddaily.com]({link('/', campaign)}).",
        "",
        f"<!-- {len(stories)} of {total} stories this week; window {start.date()} to {end.date()} UTC -->",
    ]
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--top", type=int, default=5)
    ap.add_argument("--end", help="end date YYYY-MM-DD (default today, UTC)")
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()
    end = (
        datetime.datetime.fromisoformat(args.end + "T23:59:59+00:00")
        if args.end
        else datetime.datetime.now(datetime.timezone.utc)
    )
    start = end - datetime.timedelta(days=args.days)
    articles = json.loads((ROOT / "data" / "articles.json").read_text(encoding="utf-8"))["articles"]
    changes = json.loads((ROOT / "data" / "intelligence" / "changes.json").read_text(encoding="utf-8")).get("changes", [])
    md = render(articles, changes, start, end, args.top)
    print(md)
    if args.write:
        out = ROOT / "docs" / "newsletter-drafts" / f"{end.date().isoformat()}.md"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(md, encoding="utf-8")
        print(f"saved {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
