#!/usr/bin/env python3
"""Regression checks for the SEO audit generators (clip, feed, prerender, JSON-LD)."""
from __future__ import annotations

import json
import os
import pathlib
import re
import runpy
import sys
import unittest
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import seo_lib  # noqa: E402


class Clip(unittest.TestCase):
    def test_word_boundary(self):
        long = "Tesla just put a SpaceX merger committee in an SEC filing. Its $2 billion SpaceX stake is already up $863 million"
        clipped = seo_lib.clip(long, 110)
        self.assertLessEqual(len(clipped), 110)
        self.assertFalse(clipped.endswith("mill"))
        self.assertNotIn(clipped[-1], "abcdefghijklmnopqrstuvwxyz") if clipped[-1].isalpha() else True
        self.assertTrue(clipped.endswith("million") or "stake" in clipped)

    def test_branded_suffix(self):
        t = seo_lib.branded("FSD in Europe: country approvals", 60)
        self.assertTrue(t.endswith(" | Supercharged Daily"))
        self.assertLessEqual(len(t), 60)
        self.assertNotIn("— Supercharged Daily", t)

    def test_hygiene_strips_google_fonts_and_cls_reserve(self):
        src = (
            "<html><head><title>t</title>\n"
            '<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet" />\n'
            "<style>@media(max-width:760px){.standfirst{min-height:380px}}</style>\n"
            "</head><body></body></html>"
        )
        out = seo_lib.hygiene(src)
        self.assertNotIn("fonts.googleapis.com", out)
        self.assertNotIn("min-height:380px", out)
        self.assertIn("max-image-preview:large", out)
        self.assertIn("feed.xml", out)

    def test_hygiene_keeps_page_css_next_to_members(self):
        src = (
            "<html><head><title>t</title>\n"
            "    <!-- seo:ld -->\n    <script></script>\n    <!-- /seo:ld -->\n"
            '    <link rel="stylesheet" href="/personal-home.css?v=1" />\n'
            "    <!--sd:members-->\n    <!--/sd:members-->\n"
            "</head><body></body></html>"
        )
        out = seo_lib.hygiene(src)
        css_at = out.find("personal-home.css")
        members_at = out.find("<!--sd:members-->")
        robots_at = out.find('name="robots"')
        self.assertGreater(members_at, css_at)
        self.assertLess(robots_at, css_at)
        rebuilt = out.replace(
            '    <link rel="stylesheet" href="/personal-home.css?v=1" />\n', ""
        ).replace(
            "    <!--sd:members-->",
            '    <link rel="stylesheet" href="/personal-home.css?v=1" />\n    <!--sd:members-->',
            1,
        )
        self.assertEqual(rebuilt, out)

    def test_hygiene_keeps_multiline_description(self):
        src = (
            "<html><head><title>t</title>\n"
            "    <meta\n"
            '      name="description"\n'
            '      content="Join Supercharged Daily to comment, reply and give a thumbs-up."\n'
            "    />\n"
            "</head><body></body></html>"
        )
        out = seo_lib.hygiene(src)
        self.assertIn('content="Join Supercharged Daily to comment, reply and give a thumbs-up."', out)
        self.assertIn('name="description"', out)
        self.assertRegex(out, r"<meta[\s\S]*?/>")

    def test_hygiene_drops_broken_modified_time_fallout(self):
        src = (
            "<html><head><title>t</title>\n"
            '    <meta property="article:modified_time" content="2026-10-20T01:40:00Z" />\n'
            '    P26-10-20T01:40:00Z" />\n'
            "</head><body></body></html>"
        )
        out = seo_lib.hygiene(src)
        self.assertNotIn("P26-10-", out)
        self.assertIn('article:modified_time" content="2026-10-20T01:40:00Z"', out)

    def test_set_attr_digit_title_does_not_eat_tag(self):
        src = (
            "<html><head><title>t</title>\n"
            '    <meta property="og:title" content="old" />\n'
            "</head></html>"
        )
        out = seo_lib.set_attr(src, "property", "og:title", "319 Cybercabs, six weeks")
        self.assertIn('property="og:title" content="319 Cybercabs, six weeks"', out)
        self.assertNotIn("Y9 Cybercabs", out)

    def test_set_title_rebuilds_destroyed_og_and_description(self):
        src = (
            "<html><head>\n"
            "<title>319 Cybercabs, six weeks: what the | Supercharged Daily</title>\n"
            '    Y9 Cybercabs, six weeks: what the | Supercharged Daily" />\n'
            '    <meta property="og:description" content="ok" />\n'
            '    Y9 Cybercabs, six weeks: what the | Supercharged Daily" />\n'
            "</head><body></body></html>"
        )
        out = seo_lib.set_title(src, "319 Cybercabs, six weeks: what the | Supercharged Daily")
        self.assertNotIn("Y9 Cybercabs", out)
        self.assertIn('property="og:title" content="319 Cybercabs, six weeks: what the | Supercharged Daily"', out)
        self.assertIn('name="twitter:title"', out)

    def test_set_description_rebuilds_leaked_robotaxi_lines(self):
        src = (
            "<html><head>\n"
            "<title>Tesla’s Texas Robotaxi fleet hits 938 | Supercharged Daily</title>\n"
            '    K5 robotaxis added to the Texas registry in eight days, Cybercabs back to leading the additions, and Austin&#x27;s map stretched to Circuit of the Americas for"\n'
            "    />\n"
            '    <meta property="og:title" content="Tesla’s Texas Robotaxi fleet hits 938 | Supercharged Daily" />\n'
            '    K5 robotaxis added to the Texas registry in eight days, Cybercabs back to leading the additions, and Austin&#x27;s map stretched to Circuit of the Americas for" />\n'
            "</head><body></body></html>"
        )
        desc = "135 robotaxis added to the Texas registry in eight days."
        out = seo_lib.set_description(src, desc)
        self.assertNotIn("K5 robotaxis", out)
        self.assertIn('name="description" content="%s"' % desc, out)
        self.assertIn('property="og:description"', out)
        self.assertIn('name="twitter:description"', out)

    def test_close_unclosed_h1_before_lede(self):
        src = (
            "<main><h1 id=\"so-title\">How many Starlink satellites are in orbit? "
            "A network<br>above <em>everything.</em>"
            "<p class=\"so-lede\">Explore Starlink’s constellation.</p></main>"
        )
        out = seo_lib.close_unclosed_h1(src)
        self.assertIn("</h1><p class=\"so-lede\">", out)
        self.assertEqual(out.count("<h1"), 1)
        self.assertEqual(out.count("</h1>"), 1)


class Feed(unittest.TestCase):
    def test_tracker_guids_unique_and_deduped(self):
        feed = runpy.run_path(str(ROOT / "scripts" / "build-feed.py"))
        rows = feed["load_tracker_changes"]()
        keys = [(r["url"], r["title"]) for r in rows]
        self.assertEqual(len(keys), len(set(keys)))
        guids = [r["guid"] for r in rows]
        self.assertEqual(len(guids), len(set(guids)))
        self.assertTrue(all(g.startswith("/") and "#" in g for g in guids))
        self.assertTrue(rows, "expected tracker rows from changes.json")
        item = feed["rss_item"](rows[0])
        self.assertIn('isPermaLink="false"', item)
        self.assertIn("<guid", item)

    def test_news_sitemap_48_hours(self):
        feed = runpy.run_path(str(ROOT / "scripts" / "build-feed.py"))
        now = __import__("datetime").datetime(2026, 10, 26, 15, 23, tzinfo=__import__("datetime").timezone.utc)
        articles = [
            {"url": "/dispatch/new.html", "title": "New", "date": "2026-10-26T14:50:00Z"},
            {"url": "/dispatch/old.html", "title": "Old", "date": "2026-10-24T13:30:13Z"},
        ]
        dest = pathlib.Path(__import__("tempfile").mkstemp(suffix=".xml")[1])
        n = feed["write_news_sitemap"](articles, now=now, dest=str(dest))
        self.assertEqual(n, 1)
        xml = dest.read_text(encoding="utf-8")
        dest.unlink()
        self.assertIn("/dispatch/new.html", xml)
        self.assertNotIn("/dispatch/old.html", xml)


class Site(unittest.TestCase):
    def test_prerender_promise_and_news(self):
        promise = (ROOT / "promise-tracker.html").read_text(encoding="utf-8")
        news = (ROOT / "news.html").read_text(encoding="utf-8")
        self.assertIn("pr-record-grid", promise)
        self.assertGreater(promise.count('class="pr-record'), 5)
        self.assertIn("ns-card", news)
        self.assertGreater(news.count('class="ns-card"'), 5)

    def test_json_ld_parses(self):
        bad = []
        for path in list((ROOT).glob("*.html")) + list((ROOT / "dispatch").glob("*.html")):
            text = path.read_text(encoding="utf-8")
            for i, m in enumerate(re.finditer(r'<script type="application/ld\+json">(.*?)</script>', text, re.S)):
                raw = m.group(1).replace("<\\/", "</")
                try:
                    json.loads(raw)
                except json.JSONDecodeError as e:
                    bad.append("%s#%d %s" % (path.name, i, e))
        self.assertEqual(bad[:8], [], msg="JSON-LD parse failures: " + "; ".join(bad[:8]))

    def test_feed_and_sitemaps_xml(self):
        for name in ("feed.xml", "sitemap.xml", "sitemap-news.xml"):
            path = ROOT / name
            self.assertTrue(path.exists(), name)
            ET.parse(path)

    def test_robots_lists_news_sitemap(self):
        robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
        self.assertIn("sitemap-news.xml", robots)
        self.assertIn("feed.xml", (ROOT / "index.html").read_text(encoding="utf-8"))

    def test_promise_tracker_keeps_newsletter_marker(self):
        html = (ROOT / "promise-tracker.html").read_text(encoding="utf-8")
        self.assertIn("<!--nl:start-->", html)
        self.assertIn("data-newsletter", html)

    def test_dispatch_cards_parser_reads_h2(self):
        api = runpy.run_path(str(ROOT / "scripts" / "build-articles.py"))
        sample = (
            '<a class="story-card" href="/dispatch/demo.html">'
            '<div class="story-copy"><h2>A heading</h2><p>Summary</p></div></a>'
        )
        parser = api["Cards"]()
        parser.feed(sample)
        self.assertEqual(parser.cards[0]["title"].strip(), "A heading")


if __name__ == "__main__":
    unittest.main()
