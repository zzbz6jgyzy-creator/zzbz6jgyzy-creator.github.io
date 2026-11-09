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
    # Debian/Ubuntu ship Inter as OpenType (fonts-inter); same family, same metrics.
    alt = os.path.join("/usr/share/fonts/opentype/inter", name.replace(".ttf", ".otf"))
    if os.path.exists(alt):
        return ImageFont.truetype(alt, size)
    return ImageFont.load_default()


def draw_card(kicker, title):
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 12, H), fill=RED)
    d.rectangle((0, H - 8, W, H), fill=RED)
    kick = font("Inter-SemiBold.ttf", 22)
    big = font("Inter-Bold.ttf", 72)
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
        y += 86
    d.text((64, H - 72), "Independent · sourced", font=small, fill=MUTE)
    return img


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
    print("og images: %d written" % n)


if __name__ == "__main__":
    run(force="--force" in sys.argv)
