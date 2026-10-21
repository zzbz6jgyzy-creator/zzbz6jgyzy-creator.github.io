#!/usr/bin/env python3
"""Inject newsletter signup blocks into Dispatch articles and tracker pages.

Idempotent markers: <!--nl:start--> ... <!--nl:end-->
Called from scripts/build-articles.py after related_stories(), or standalone:
    python3 scripts/inject_newsletter.py

Reuses the homepage Beehiiv flow in /newsletter.js (no new endpoint).
Do not add issue-count or subscriber social-proof copy to the signup block.
"""
from __future__ import annotations

import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LATEST_JSON = os.path.join(ROOT, "data", "newsletter-latest.json")
GROW_CSS_V = "202610210800"
NEWSLETTER_JS_V = "202610210800"
GROW_JS_V = "202610210800"
NAV_PILL_V = "202610210800"
BEEHIIV = "https://alexs-newsletter-84b17e.beehiiv.com"
NL_RX = re.compile(r"\n?[ \t]*<!--nl:start-->.*?<!--nl:end-->", re.S)

TOPICS = {
    "roadster": (
        "roadster",
        "Roadster on Supercharged Daily",
        "Reveal clocks, thruster notes and the latest Tesla news — one free Sunday email.",
    ),
    "tesla-software": (
        "tesla-software",
        "Tesla software on Supercharged Daily",
        "FSD, software updates and My Tesla notes — free, every Sunday.",
    ),
    "spacex": (
        "spacex",
        "SpaceX on Supercharged Daily",
        "Starship flights, Starlink and Falcon dates — the week in one Sunday email.",
    ),
    "tesla": (
        "tesla",
        "Tesla on Supercharged Daily",
        "Reviews, buying notes and the latest Tesla news — free, every Sunday.",
    ),
    "website": (
        "website",
        "Get Supercharged Daily",
        "The week’s Tesla, SpaceX, xAI and X stories plus $TSLA and $SPCX moves. Free, every Sunday.",
    ),
}

# Compact tracker/tool pages. Heading is the same; blurb is page-specific.
TRACKERS = {
    "starship.html": ("spacex", "Starship flights, catch attempts and the week in SpaceX — one free Sunday email."),
    "fsd-europe.html": ("tesla-software", "FSD Europe approvals and Tesla software — one free Sunday email."),
    "starlink.html": ("spacex", "Starlink constellation notes and the week in SpaceX — one free Sunday email."),
    "robotaxi.html": ("tesla-software", "Robotaxi cities, Cybercab and Tesla software — one free Sunday email."),
    "cybercab.html": ("tesla-software", "Cybercab, Robotaxi and Tesla software — one free Sunday email."),
    "updates.html": ("tesla-software", "Tesla software builds and the week in Tesla — one free Sunday email."),
    "my-tesla.html": ("tesla-software", "Software for your car and the week in Tesla — one free Sunday email."),
    "fsd.html": ("tesla-software", "FSD miles, Europe and Tesla software — one free Sunday email."),
}
TRACKER_HEADING = "Get the weekly tracker digest"


def latest_meta():
    slug = "roadster-just-flew"
    try:
        data = json.load(open(LATEST_JSON, encoding="utf-8"))
        slug = data.get("slug") or slug
    except (OSError, ValueError, TypeError):
        pass
    return slug


def latest_link(slug, medium):
    return (
        f"{BEEHIIV}/p/{slug}?utm_source=website&amp;utm_medium={medium}"
        f"&amp;utm_campaign=latest-issue"
    )


def form_html(field_id):
    return (
        f'<form class="sd-form" data-newsletter-form>'
        f'<label class="visually-hidden" for="{field_id}">Email address</label>'
        f'<input id="{field_id}" name="email" type="email" required autocomplete="email" '
        f'inputmode="email" placeholder="you@example.com" aria-describedby="{field_id}-status" />'
        f'<input type="text" name="website" hidden tabindex="-1" autocomplete="off" aria-hidden="true" />'
        f'<button class="sd-btn" type="submit">Subscribe</button></form>'
    )


def block_html(*, kind, topic, heading, blurb, field_id, slug, extra_class):
    medium = "site-article" if kind == "article" else "site-tracker"
    status_id = f"{field_id}-status"
    return (
        f'<!--nl:start--><section class="sd-band {extra_class}" id="newsletter" '
        f'data-newsletter="{kind}" data-band-topic="{topic}" aria-label="Newsletter signup">'
        f"<div><h2>{heading}</h2><p>{blurb}</p></div>"
        f"<div>{form_html(field_id)}"
        f'<p class="sd-fine">Free. No spam. Unsubscribe anytime. '
        f'<a class="sd-latest" href="{latest_link(slug, medium)}" target="_blank" rel="noopener">'
        f"Read the latest issue →</a></p>"
        f'<p class="newsletter-status" data-newsletter-status id="{status_id}" '
        f'role="status" aria-live="polite"></p></div></section><!--nl:end-->'
    )


def article_topic(html, relpath):
    bits = [relpath]
    for rx in (
        r'<meta property="article:section" content="([^"]+)"',
        r'"articleSection":"([^"]+)"',
        r'<p class="eyebrow">([^<]+)',
        r'class="art-tag[^"]*">([^<]+)',
    ):
        m = re.search(rx, html)
        if m:
            bits.append(m.group(1))
    hay = " ".join(bits).lower()
    if re.search(r"roadster", hay):
        return "roadster"
    if re.search(r"\bfsd\b|software|updates\b|cybercab|robotaxi|headlight|automation", hay):
        return "tesla-software"
    if re.search(r"starship|starlink|spacex|falcon|dragon|super heavy|raptor", hay):
        return "spacex"
    if re.search(r"tesla", hay):
        return "tesla"
    return "website"


def ensure_assets(html, need_newsletter_js):
    if f'href="/grow.css?v={GROW_CSS_V}"' not in html:
        html = re.sub(r'<link rel="stylesheet" href="/grow\.css\?v=\d+"\s*/?>\n?', "", html)
        if "</head>" in html:
            html = html.replace(
                "</head>",
                f'    <link rel="stylesheet" href="/grow.css?v={GROW_CSS_V}" />\n  </head>',
                1,
            )
    if need_newsletter_js and "/newsletter.js" not in html and "/grow.js" not in html:
        html = html.replace(
            "</body>",
            f'    <script src="/newsletter.js?v={NEWSLETTER_JS_V}" defer></script>\n  </body>',
            1,
        )
    html = re.sub(r"grow\.js\?v=\d+", f"grow.js?v={GROW_JS_V}", html)
    html = re.sub(r"newsletter\.js\?v=\d+", f"newsletter.js?v={NEWSLETTER_JS_V}", html)
    return html


def insert_block(html, block, after_article=True):
    html = NL_RX.sub("", html)
    if after_article:
        art = list(re.finditer(r"</article>", html))
        if art:
            i = art[-1].end()
            return html[:i] + "\n        " + block + html[i:]
        rel = re.search(r"\n?[ \t]*<!--related:start-->", html)
        if rel:
            return html[: rel.start()] + "\n        " + block + html[rel.start() :]
    main = re.search(r"(\n[ \t]*)</main>", html)
    if main:
        return html[: main.start()] + "\n        " + block + main.group(1) + "</main>" + html[main.end() :]
    return html


def write_if_changed(path, original, updated):
    if updated == original:
        return False
    open(path, "w", encoding="utf-8").write(updated)
    return True


def inject_articles(slug):
    n = 0
    for path in sorted(glob.glob(os.path.join(ROOT, "dispatch", "*.html"))):
        html = open(path, encoding="utf-8").read()
        if "</main>" not in html:
            continue
        rel = os.path.relpath(path, ROOT)
        topic, heading, blurb = TOPICS[article_topic(html, rel)]
        block = block_html(
            kind="article",
            topic=topic,
            heading=heading,
            blurb=blurb,
            field_id="sd-nl-email",
            slug=slug,
            extra_class="sd-band-article",
        )
        updated = ensure_assets(insert_block(html, block), need_newsletter_js=False)
        if write_if_changed(path, html, updated):
            n += 1
            print("nl article:", rel)
    return n


def inject_trackers(slug):
    n = 0
    for name, (topic, blurb) in TRACKERS.items():
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            continue
        html = open(path, encoding="utf-8").read()
        if "</main>" not in html:
            continue
        block = block_html(
            kind="tracker",
            topic=topic,
            heading=TRACKER_HEADING,
            blurb=blurb,
            field_id="sd-nl-email",
            slug=slug,
            extra_class="sd-band-compact",
        )
        need_js = "/grow.js" not in html
        updated = ensure_assets(insert_block(html, block, after_article=False), need_newsletter_js=need_js)
        if write_if_changed(path, html, updated):
            n += 1
            print("nl tracker:", name)
    return n


def bump_cache_tags():
    n = 0
    for path in glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True):
        if "/node_modules/" in path or "/vendor/" in path:
            continue
        html = open(path, encoding="utf-8").read()
        updated = re.sub(r"grow\.js\?v=\d+", f"grow.js?v={GROW_JS_V}", html)
        updated = re.sub(r"grow\.css\?v=\d+", f"grow.css?v={GROW_CSS_V}", updated)
        updated = re.sub(r"nav-pill\.js\?v=\d+", f"nav-pill.js?v={NAV_PILL_V}", updated)
        if write_if_changed(path, html, updated):
            n += 1
    return n


def run():
    slug = latest_meta()
    a = inject_articles(slug)
    t = inject_trackers(slug)
    g = bump_cache_tags()
    print(f"newsletter inject: {a} articles, {t} trackers, cache bump {g} (slug={slug})")


if __name__ == "__main__":
    run()
