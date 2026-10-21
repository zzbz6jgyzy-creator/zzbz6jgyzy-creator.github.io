#!/usr/bin/env python3
"""Idempotency and markup checks for scripts/inject_newsletter.py."""
from __future__ import annotations

import importlib.util
import os
import re
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("inject_newsletter", ROOT / "scripts" / "inject_newsletter.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

ARTICLE = """<!doctype html>
<html lang="en"><head><title>t</title>
<meta property="article:section" content="SpaceX" />
</head>
<body>
<main id="main">
  <article class="article">
    <p class="eyebrow">Starlink · 7 Oct 2026</p>
    <h1>A story</h1>
    <p>Body.</p>
  </article>
  <!--related:start--><section class="related-stories">x</section><!--related:end-->
</main>
<footer class="site-footer"></footer>
<script src="/grow.js?v=202610201920" data-band data-pop defer></script>
</body></html>
"""

TRACKER = """<!doctype html>
<html lang="en"><head><title>Starship</title></head>
<body>
<main id="main">
  <section class="section"><h1>Starship</h1></section>
</main>
<footer class="site-footer"></footer>
</body></html>
"""


class InjectNewsletter(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp)
        (self.tmp / "dispatch").mkdir()
        (self.tmp / "data").mkdir()
        (self.tmp / "data" / "newsletter-latest.json").write_text(
            '{"slug":"roadster-just-flew","issueCount":2}\n', encoding="utf-8"
        )
        self._root = mod.ROOT
        self._latest = mod.LATEST_JSON
        mod.ROOT = str(self.tmp)
        mod.LATEST_JSON = str(self.tmp / "data" / "newsletter-latest.json")

    def tearDown(self):
        mod.ROOT = self._root
        mod.LATEST_JSON = self._latest

    def test_article_insert_is_idempotent_and_reuses_beehiiv(self):
        path = self.tmp / "dispatch" / "starlink-direct.html"
        path.write_text(ARTICLE, encoding="utf-8")
        slug, count = mod.latest_meta()
        self.assertEqual(slug, "roadster-just-flew")
        self.assertEqual(count, 2)
        n1 = mod.inject_articles(slug, count)
        first = path.read_text(encoding="utf-8")
        n2 = mod.inject_articles(slug, count)
        second = path.read_text(encoding="utf-8")
        self.assertEqual(n1, 1)
        self.assertEqual(n2, 0)
        self.assertEqual(first, second)
        self.assertEqual(first.count("<!--nl:start-->"), 1)
        self.assertEqual(first.count('data-newsletter="article"'), 1)
        self.assertIn("data-newsletter-form", first)
        self.assertIn('name="website"', first)
        self.assertIn('autocomplete="email"', first)
        self.assertIn("SpaceX on Supercharged Daily", first)
        self.assertIn("2 Sunday issues so far.", first)
        self.assertIn("utm_medium=site-article", first)
        self.assertIn("alexs-newsletter-84b17e.beehiiv.com/p/roadster-just-flew", first)
        self.assertLess(first.index("<!--nl:start-->"), first.index("<!--related:start-->"))
        self.assertIn(f"/grow.css?v={mod.GROW_CSS_V}", first)
        self.assertNotIn('class="newsletter sd-nl"', first)

    def test_tracker_copy_and_script(self):
        path = self.tmp / "starship.html"
        path.write_text(TRACKER, encoding="utf-8")
        n1 = mod.inject_trackers("roadster-just-flew", 2)
        html = path.read_text(encoding="utf-8")
        n2 = mod.inject_trackers("roadster-just-flew", 2)
        self.assertEqual(n1, 1)
        self.assertEqual(n2, 0)
        self.assertIn("Get the weekly tracker digest", html)
        self.assertIn("Starship flights, catch attempts", html)
        self.assertIn('data-newsletter="tracker"', html)
        self.assertIn("utm_medium=site-tracker", html)
        self.assertIn("/newsletter.js?", html)
        self.assertIn("/grow.css?", html)
        self.assertEqual(html.count("<!--nl:start-->"), 1)
        self.assertLess(html.index("<!--nl:start-->"), html.index("</main>"))
        self.assertRegex(html, r"<!--nl:end-->\s*</main>")

    def test_updated_byline_is_not_tesla_software(self):
        html = '<meta property="article:section" content="SpaceX" /><p class="eyebrow">SpaceX · Updated 14 Oct 2026</p>'
        self.assertEqual(mod.article_topic(html, "dispatch/ship-40.html"), "spacex")

    def test_no_proof_when_count_missing(self):
        self.assertEqual(mod.proof_html(0), "")
        self.assertEqual(mod.proof_html(1), "")
        self.assertIn("2 Sunday", mod.proof_html(2))

    def test_newsletter_js_uses_same_endpoint(self):
        src = (ROOT / "newsletter.js").read_text(encoding="utf-8")
        self.assertIn('SUBSCRIBE_URL = "https://alexs-newsletter-84b17e.beehiiv.com/"', src)
        self.assertIn('site-article', src)
        self.assertIn('site-tracker', src)
        self.assertIn('site-band', src)
        home = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("data-newsletter-form", home)
        self.assertIn("alexs-newsletter-84b17e.beehiiv.com", home)


if __name__ == "__main__":
    unittest.main()
