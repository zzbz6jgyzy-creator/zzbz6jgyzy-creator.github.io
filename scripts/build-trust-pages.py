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


# --- Legal drafts (owner review pending). They are noindex and carry a DRAFT banner until the owner
# approves them; then set "draft": False below and re-run this script. Facts come from the code:
# see docs/legal-drafts.md for what each statement is based on and what is still unknown.
DRAFT_NOTE = """
          <p class="legal-draft" role="note" style="border:1px solid var(--red-text);border-radius:10px;padding:12px 14px;font-weight:600">DRAFT – review before publishing. This page was drafted from what the site's code does and has not been checked by a lawyer. Items marked “To confirm” need the owner’s answer.</p>"""

PRIVACY_MAIN = """
        <section class="page-hero">
          <p class="eyebrow">Legal</p>
          <h1>Privacy policy</h1>
          <p>What Supercharged Daily collects, why, and what you can ask us to do with it.</p>
        </section>
        <article class="article">""" + DRAFT_NOTE + """
          <h2>Who we are</h2>
          <p>Supercharged Daily (superchargeddaily.com) is an independent site run by Alex R in Ireland. Contact: <!--email_off--><a href="mailto:superchargeddaily@gmail.com">superchargeddaily@gmail.com</a><!--/email_off-->.</p>
          <h2>What we collect and why</h2>
          <ul>
            <li><strong>Newsletter.</strong> If you sign up, your email address is sent to Beehiiv, which runs our Sunday newsletter, so we can send it to you (your consent). Every issue has an unsubscribe link. Beehiiv’s own privacy policy covers how it stores your address.</li>
            <li><strong>Members accounts (optional).</strong> If you sign in, you do so with Google through Supabase, which hosts our member database. We receive the basic profile Google shares (such as your email address and name) to run your account (contract). To confirm: exactly which member data is stored and for how long.</li>
            <li><strong>Visitor statistics.</strong> We use Cloudflare Web Analytics, which counts page views without cookies and without building a profile of you. We also run our own tiny counter for a few named actions (for example a newsletter signup or a game finish): it stores only a count per day and the page path, with no cookies, no IP address and no user ID (legitimate interests).</li>
            <li><strong>Hosting.</strong> The site is served by GitHub Pages and Cloudflare. Like any web server, they process your IP address to deliver pages and protect the site. To confirm: Cloudflare log and security settings.</li>
            <li><strong>Email.</strong> If you email us, we keep the message to reply and for our records.</li>
          </ul>
          <h2>What stays on your device</h2>
          <p>Some features remember your choices in your browser’s local storage, for example light or dark theme, saved stories, game progress and region settings for the trackers. This stays on your device and is not sent to us. Clearing your site data removes it.</p>
          <h2>Third-party content</h2>
          <p>Some pages show content from other services, which may collect data under their own policies: posts from X (on some articles the X embed script loads with the page), YouTube videos (mostly in privacy-enhanced mode), a TradingView chart on the markets page, and scripts served by jsDelivr on a few pages. See the <a href="/cookies.html">cookie policy</a>.</p>
          <h2>Referral and support links</h2>
          <p>Some links are referral or affiliate links, for example our Tesla referral link. If you use one, the other company knows you came from us and we may receive a reward. Buy Me a Coffee processes support payments; we do not see your card details.</p>
          <h2>Your rights</h2>
          <p>Under the GDPR you can ask to access, correct or delete your data, object to processing, or withdraw consent at any time. Email us to do so. You can also complain to the Irish Data Protection Commission (dataprotection.ie).</p>
          <h2>Retention</h2>
          <p>To confirm: how long newsletter, member and email records are kept.</p>
          <h2>Children</h2>
          <p>The site is not directed at children under 16.</p>
          <h2>Changes</h2>
          <p>We will update this page when our practices change and show the date below.</p>
          <p><em>Draft prepared 9 November 2026.</em> · <a href="/cookies.html">Cookie policy</a> · <a href="/terms.html">Terms of use</a></p>
        </article>
"""

COOKIES_MAIN = """
        <section class="page-hero">
          <p class="eyebrow">Legal</p>
          <h1>Cookie policy</h1>
          <p>Which cookies and similar storage the site uses.</p>
        </section>
        <article class="article">""" + DRAFT_NOTE + """
          <h2>Our own cookies</h2>
          <p>Supercharged Daily’s own code does not set cookies. Our visitor statistics (Cloudflare Web Analytics and our own event counter) work without cookies.</p>
          <h2>Local storage</h2>
          <p>We use your browser’s local storage, not cookies, to remember choices you make: theme, saved stories and reading list, game progress and sound settings, tracker region settings, and, if you sign in, your members session. It stays on your device and you can clear it in your browser settings.</p>
          <h2>Cookies set by other services</h2>
          <ul>
            <li><strong>X (Twitter) embeds.</strong> Some articles load X’s embed script with the page to show posts. X may set or read cookies when it does.</li>
            <li><strong>YouTube.</strong> Most videos use YouTube’s privacy-enhanced mode, which avoids cookies until you press play; a few embeds use the standard player.</li>
            <li><strong>TradingView.</strong> The markets page shows a TradingView chart, which may set cookies.</li>
            <li><strong>Google sign-in.</strong> Only if you choose to sign in as a member.</li>
            <li><strong>Cloudflare.</strong> Cloudflare may set a strictly necessary security cookie to protect the site from bots. To confirm in the Cloudflare dashboard.</li>
          </ul>
          <p>To confirm: whether a consent choice is needed for the third-party embeds above in your situation.</p>
          <p><em>Draft prepared 9 November 2026.</em> · <a href="/privacy.html">Privacy policy</a> · <a href="/terms.html">Terms of use</a></p>
        </article>
"""

TERMS_MAIN = """
        <section class="page-hero">
          <p class="eyebrow">Legal</p>
          <h1>Terms of use</h1>
          <p>The rules for using Supercharged Daily.</p>
        </section>
        <article class="article">""" + DRAFT_NOTE + """
          <h2>About the site</h2>
          <p>Supercharged Daily is an independent fan site covering Tesla, SpaceX and xAI (including Grok). It is not affiliated with, endorsed by or sponsored by any of them. Their names and trademarks belong to them.</p>
          <h2>Not financial or professional advice</h2>
          <p>Everything here is for information. Nothing is financial, investment, legal or safety advice. The editor owns Tesla and SpaceX shares. Do your own research before you make decisions.</p>
          <h2>Accuracy</h2>
          <p>We source stories and label tracker figures with their dates, but information changes and we can make mistakes. Our <a href="/editorial.html">editorial and corrections policy</a> explains how we fix them. Launch times, prices and other figures from companies can change without notice.</p>
          <h2>Our content</h2>
          <p>Text, graphics and tools we made are © Supercharged Daily. You may quote short extracts with a link back. Images from others are credited to their owners and licences.</p>
          <h2>Links, referrals and support</h2>
          <p>We link to other websites we do not control. Some links are referral or affiliate links and we may earn a reward. Support via Buy Me a Coffee is voluntary and buys no special access unless a page says otherwise.</p>
          <h2>Games, tools and members accounts</h2>
          <p>Games and interactive tools are provided as they are and use simulated numbers unless labelled otherwise. If you create a members account, keep your sign-in secure; we may suspend accounts that abuse the site.</p>
          <h2>Liability</h2>
          <p>To the extent the law allows, we are not liable for losses arising from using the site or relying on its content. Nothing here limits rights you have as a consumer under the law.</p>
          <h2>Governing law</h2>
          <p>To confirm: Irish law and the courts of Ireland.</p>
          <h2>Changes and contact</h2>
          <p>We may update these terms and will show the date below. Questions: <!--email_off--><a href="mailto:superchargeddaily@gmail.com">superchargeddaily@gmail.com</a><!--/email_off-->.</p>
          <p><em>Draft prepared 9 November 2026.</em> · <a href="/privacy.html">Privacy policy</a> · <a href="/cookies.html">Cookie policy</a></p>
        </article>
"""

LEGAL = {
    "privacy.html": ("Privacy policy | Supercharged Daily", "How Supercharged Daily handles newsletter signups, member accounts, visitor statistics and third-party content.", PRIVACY_MAIN, "Privacy policy"),
    "cookies.html": ("Cookie policy | Supercharged Daily", "Which cookies and browser storage Supercharged Daily and embedded services use.", COOKIES_MAIN, "Cookie policy"),
    "terms.html": ("Terms of use | Supercharged Daily", "The terms for using Supercharged Daily: independent, not advice, corrections, links and referrals.", TERMS_MAIN, "Terms of use"),
}

for _rel, (_title, _desc, _main, _name) in LEGAL.items():
    PAGES[_rel] = {"title": _title, "description": _desc, "canonical": SITE + "/" + _rel, "main": _main, "draft": True,
                   "ld": {"@context": "https://schema.org", "@type": "WebPage", "name": _name, "url": SITE + "/" + _rel, "publisher": org()}}


def fill(template: str, spec: dict) -> str:
    html = set_title(template, spec["title"])
    html = set_description(html, spec["description"])
    html = re.sub(
        r'(<link rel="canonical" href=")[^"]+(")',
        lambda m, v=spec["canonical"]: m.group(1) + v + m.group(2),
        html,
        count=1,
    )
    html = re.sub(
        r'(<meta property="og:url" content=")[^"]+(")',
        lambda m, v=spec["canonical"]: m.group(1) + v + m.group(2),
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
    if spec.get("draft"):
        # Drafts stay out of search until the owner approves them.
        html = re.sub(r'<meta name="robots" content="[^"]*"', '<meta name="robots" content="noindex, follow"', html, count=1)
    return html


def run():
    src = open(os.path.join(ROOT, "about.html"), encoding="utf-8").read()
    for rel, spec in PAGES.items():
        path = os.path.join(ROOT, rel)
        # Hand-built pages on the ps-page template (the Author profile) are not regenerated from the shared clone
        if os.path.exists(path) and 'class="ps-page' in open(path, encoding="utf-8").read():
            continue
        html = fill(src, spec)
        if not os.path.exists(path) or open(path, encoding="utf-8").read() != html:
            open(path, "w", encoding="utf-8").write(html)
            print("trust page:", rel)


if __name__ == "__main__":
    run()
