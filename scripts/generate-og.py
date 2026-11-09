#!/usr/bin/env python3
"""Branded Open Graph images (1200×630) for trackers that reused a generic poster.

Idempotent: skips a file that already exists unless --force. Uses the Inter font
already on the builder image. Do not invent photography — these are type-only cards.
"""
from __future__ import annotations

import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "og")
W, H = 1200, 630
BG = (12, 13, 16)
RED = (242, 58, 82)
INK = (236, 236, 232)
MUTE = (154, 158, 166)
FONT_DIR = "/usr/share/fonts/truetype/macos"

# (filename without .jpg, kicker, title lines)
CARDS = [
    ("starship-flight-15", "STARSHIP · FLIGHT 15", "Starship Flight 15:\nthe double catch"),
    ("updates", "TESLA SOFTWARE", "Software update\ntracker"),
    ("see-the-launch", "SPACEX", "Can I see\nthe launch?"),
    ("calendar", "LAUNCHES & DATES", "SpaceX & Tesla\ncalendar"),
    ("games", "PLAY", "Tesla & SpaceX\ngames"),
    ("fsd-netherlands", "FSD EUROPE", "FSD in the\nNetherlands"),
    ("fsd-belgium", "FSD EUROPE", "FSD in\nBelgium"),
    ("fsd-croatia", "FSD EUROPE", "FSD in\nCroatia"),
    ("fsd-czechia", "FSD EUROPE", "FSD in\nCzechia"),
    ("fsd-denmark", "FSD EUROPE", "FSD in\nDenmark"),
    ("fsd-estonia", "FSD EUROPE", "FSD in\nEstonia"),
    ("fsd-lithuania", "FSD EUROPE", "FSD in\nLithuania"),
    ("fsd-slovakia", "FSD EUROPE", "FSD in\nSlovakia"),
    ("fsd-slovenia", "FSD EUROPE", "FSD in\nSlovenia"),
]


def font(name, size):
    from PIL import ImageFont

    path = os.path.join(FONT_DIR, name)
    if os.path.exists(path):
        return ImageFont.truetype(path, size)
    # The site's own Inter (variable WOFF2) works on any machine with Pillow, CI included.
    web = os.path.join(ROOT, "assets", "fonts", "inter-latin.woff2")
    if os.path.exists(web):
        try:
            f = ImageFont.truetype(web, size)
            f.set_variation_by_name(name.replace("Inter-", "").replace(".ttf", ""))
            return f
        except (OSError, ValueError):
            pass
    alt = os.path.join("/usr/share/fonts/opentype/inter", name.replace(".ttf", ".otf"))
    if os.path.exists(alt):
        return ImageFont.truetype(alt, size)
    return ImageFont.load_default()


def draw_card(kicker, title, big_size=72, step=86):
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 12, H), fill=RED)
    d.rectangle((0, H - 8, W, H), fill=RED)
    kick = font("Inter-SemiBold.ttf", 22)
    big = font("Inter-Bold.ttf", big_size)
    small = font("Inter-Medium.ttf", 22)
    # Red bolt mark (assets/brand/icon-1b.png) beside the wordmark
    mark_path = os.path.join(ROOT, "assets", "brand", "icon-1b.png")
    if os.path.exists(mark_path):
        from PIL import Image as _I
        mark = _I.open(mark_path).convert("RGBA").resize((40, 40))
        img.paste(mark, (64, 64), mark)
        d.text((118, 72), "SUPERCHARGED DAILY", font=kick, fill=RED)
    else:
        d.text((64, 72), "SUPERCHARGED DAILY", font=kick, fill=RED)
    d.text((64, 118), kicker, font=small, fill=MUTE)
    y = 200
    for line in title.split("\n"):
        d.text((64, y), line, font=big, fill=INK)
        y += step
    d.text((64, H - 72), "Independent · sourced", font=small, fill=MUTE)
    return img


def wrap(text, fnt, width, max_lines=4):
    words, lines, cur = text.split(), [], ""
    for w in words:
        nxt = (cur + " " + w).strip()
        if fnt.getlength(nxt) <= width or not cur:
            cur = nxt
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        while lines[-1] and fnt.getlength(lines[-1] + "…") > width:
            lines[-1] = lines[-1].rsplit(" ", 1)[0]
        lines[-1] += "…"
    return lines


def article_cards():
    """Dispatch stories with no image of their own get a title card: assets/og/dispatch-<slug>.jpg.
    build-seo.py points the story's og:image / twitter:image at it."""
    import json
    try:
        arts = json.load(open(os.path.join(ROOT, "data", "articles.json"), encoding="utf-8"))["articles"]
    except (OSError, ValueError, KeyError):
        return []
    out = []
    for a in arts:
        img = a.get("image") or ""
        if img and not img.endswith("/assets/og-v2.jpg"):
            continue
        slug = os.path.splitext(os.path.basename(a["url"]))[0]
        out.append(("dispatch-" + slug, (a.get("tag") or a.get("topic") or "Dispatch").upper(), a["title"]))
    return out


def draw_article(kicker, title):
    from PIL import ImageDraw
    # Wrap at the size we draw at: try 72px first and fall back to 60px only for titles that need 3+ lines.
    lines = wrap(title, font("Inter-Bold.ttf", 72), W - 128)
    if len(lines) <= 2:
        return draw_card(kicker, "\n".join(lines), big_size=72, step=86)
    lines = wrap(title, font("Inter-Bold.ttf", 60), W - 128)
    return draw_card(kicker, "\n".join(lines), big_size=60, step=74)


def run(force=False):
    try:
        import PIL  # noqa: F401
    except ImportError:
        # Images are committed; GitHub-hosted runners do not ship Pillow.
        print("og images: skipped (Pillow not installed)")
        return
    os.makedirs(OUT, exist_ok=True)
    n = 0
    for slug, kicker, title in CARDS:
        dest = os.path.join(OUT, slug + ".jpg")
        if os.path.exists(dest) and not force:
            continue
        draw_card(kicker, title).save(dest, "JPEG", quality=88, optimize=True)
        n += 1
        print("og:", dest)
    for slug, kicker, title in article_cards():
        dest = os.path.join(OUT, slug + ".jpg")
        if os.path.exists(dest) and not force:
            continue
        draw_article(kicker, title).save(dest, "JPEG", quality=88, optimize=True)
        n += 1
        print("og:", dest)
    print("og images: %d written" % n)


if __name__ == "__main__":
    run(force="--force" in sys.argv)
