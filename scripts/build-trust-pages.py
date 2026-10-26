#!/usr/bin/env python3
"""author.html, editorial.html and contact.html, cloned from about.html so they
keep the live nav/footer. Facts only: existing public email and X handle.
"""
from __future__ import annotations

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seo_lib import SITE, EMAIL, X_URL, dumps, person, org, set_title, set_description  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

AUTHOR_MAIN = """
        <section class="page-hero about-me">
          <picture><source type="image/avif" srcset="/assets/about/alex-r-359w.avif 359w" sizes="(max-width: 760px) 100vw, 1040px" /><source type="image/webp" srcset="/assets/about/alex-r-359w.webp 359w" sizes="(max-width: 760px) 100vw, 1040px" /><img decoding="async" src="/assets/about/alex-r.jpg" alt="Alex R, profile photo" width="400" height="400" /></picture>
          <p class="eyebrow reveal">Author</p>
          <h1 class="reveal delay-1">Alex R</h1>
          <p class="reveal delay-2">Writes Supercharged Daily from Ireland. Tesla and SpaceX shareholder. Independent, not affiliated.</p>
        </section>
        <article class="article">
          <p>I started Supercharged Daily because I enjoy creating content and sharing it. Tesla and SpaceX are what I follow, so that is what this site covers.</p>
          <p>I drive a white 2024 Tesla Model 3. A lot of the owner notes come from using the car.</p>
          <p>I own shares in Tesla and SpaceX. Nothing on this site is financial advice. Supercharged Daily is independent and not affiliated with Tesla, SpaceX or xAI.</p>
          <p>Follow on X at <a href="https://x.com/ALJR86">@ALJR86</a>, or email <a href="mailto:superchargeddaily@gmail.com">superchargeddaily@gmail.com</a>.</p>
          <p><a href="/about.html">About this site</a> · <a href="/editorial.html">Editorial policy</a> · <a href="/contact.html">Contact</a></p>
        </article>
"""

EDITORIAL_MAIN = """
        <section class="page-hero">
          <p class="eyebrow">Editorial</p>
          <h1>How we source, date and correct this site</h1>
          <p>Supercharged Daily is original reporting and sourced trackers. It is not a wire rewrite desk, and it is not affiliated with Tesla, SpaceX or xAI.</p>
        </section>
        <article class="article">
          <h2>Sourcing</h2>
          <p>Dispatch stories cite the original filing, transcript, regulator page, manufacturer page or named report they rely on. Tracker figures keep the source next to the number. Secondary reports are labelled as such.</p>
          <h2>Dates</h2>
          <p>A publication date is when the story went up. <code>dateModified</code> and sitemap <code>lastmod</code> move only when the story or tracker data itself changes — not when a headline snapshot or template pass retouches the HTML.</p>
          <h2>Corrections</h2>
          <p>If a fact is wrong, email <a href="mailto:superchargeddaily@gmail.com">superchargeddaily@gmail.com</a> or write to <a href="https://x.com/ALJR86">@ALJR86</a>. Material corrections are noted on the story or tracker. We do not silently rewrite a dated record to look as if it was always right.</p>
          <h2 id="data">Tracker data licence</h2>
          <p>The compiled tracker tables (FSD Europe, Starlink counts, Cybercab registry notes, software samples, Starship flight log, calendar, promise ledger) are published so they can be cited. Credit Supercharged Daily and keep the source dates. Underlying manufacturer, regulator and registry pages remain under their own terms.</p>
          <h2>Independence and holdings</h2>
          <p>Alex R holds Tesla and SpaceX shares. Coverage is independent. Nothing here is an offer to buy or sell securities, or personalised financial advice.</p>
          <p><a href="/author.html">About the author</a> · <a href="/contact.html">Contact</a></p>
        </article>
"""

CONTACT_MAIN = """
        <section class="page-hero">
          <p class="eyebrow">Contact</p>
          <h1>Contact Supercharged Daily</h1>
          <p>Corrections, club listings, story tips and tracker questions.</p>
        </section>
        <article class="article">
          <p>Email <a href="mailto:superchargeddaily@gmail.com">superchargeddaily@gmail.com</a>.</p>
          <p>On X: <a href="https://x.com/ALJR86">@ALJR86</a>.</p>
          <p>For Tesla owners-club updates, include the club name, country or region, and a public page we can check. This directory is a publication audit, not a live membership feed.</p>
          <p>We do not take advertising requests through this page.</p>
          <p><a href="/editorial.html">Editorial and corrections policy</a> · <a href="/author.html">Author</a></p>
        </article>
"""

PAGES = {
    "author.html": {
        "title": "Alex R, author | Supercharged Daily",
        "description": "Alex R writes Supercharged Daily. Tesla and SpaceX shareholder. Independent, not affiliated, not financial advice.",
        "canonical": SITE + "/author.html",
        "main": AUTHOR_MAIN,
        "ld": {
            **person(),
            "@context": "https://schema.org",
            "jobTitle": "Editor",
            "worksFor": org(),
            "email": EMAIL,
            "description": "Alex R writes Supercharged Daily from Ireland. Independent Tesla and SpaceX coverage.",
        },
    },
    "editorial.html": {
        "title": "Editorial & corrections | Supercharged Daily",
        "description": "How Supercharged Daily sources stories, dates tracker figures, and corrects mistakes.",
        "canonical": SITE + "/editorial.html",
        "main": EDITORIAL_MAIN,
        "ld": {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Editorial and corrections policy",
            "url": SITE + "/editorial.html",
            "publisher": org(),
        },
    },
    "contact.html": {
        "title": "Contact | Supercharged Daily",
        "description": "Contact Supercharged Daily by email or on X. Club listings, corrections and story tips.",
        "canonical": SITE + "/contact.html",
        "main": CONTACT_MAIN,
        "ld": {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            "name": "Contact Supercharged Daily",
            "url": SITE + "/contact.html",
            "publisher": org(),
            "email": EMAIL,
            "sameAs": [X_URL],
        },
    },
}


def fill(template: str, spec: dict) -> str:
    html = set_title(template, spec["title"])
    html = set_description(html, spec["description"])
    html = re.sub(
        r'(<link rel="canonical" href=")[^"]+(")',
        r"\1%s\2" % spec["canonical"],
        html,
        count=1,
    )
    html = re.sub(
        r'(<meta property="og:url" content=")[^"]+(")',
        r"\1%s\2" % spec["canonical"],
        html,
        count=1,
    )
    html = re.sub(r"<main\b[^>]*>[\s\S]*?</main>", '<main id="main">%s      </main>' % spec["main"], html, count=1)
    block = (
        "\n    <!-- seo:ld -->\n"
        '    <script type="application/ld+json">' + dumps(spec["ld"]) + "</script>\n"
        "    <!-- /seo:ld -->"
    )
    html = re.sub(r"\n?\s*<!-- seo:ld -->.*?<!-- /seo:ld -->", block, html, count=1, flags=re.S)
    return html


def run():
    src = open(os.path.join(ROOT, "about.html"), encoding="utf-8").read()
    for rel, spec in PAGES.items():
        path = os.path.join(ROOT, rel)
        html = fill(src, spec)
        if not os.path.exists(path) or open(path, encoding="utf-8").read() != html:
            open(path, "w", encoding="utf-8").write(html)
            print("trust page:", rel)


if __name__ == "__main__":
    run()
