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
