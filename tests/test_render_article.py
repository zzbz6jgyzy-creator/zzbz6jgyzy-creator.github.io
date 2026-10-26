#!/usr/bin/env python3
"""scripts/render-article.py turns Markdown into the site's article markup and refuses unfinished or unsafe input."""
import importlib.util
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("render_article", ROOT / "scripts" / "render-article.py")
ra = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ra)

HEAD = "---\ntitle: A headline that states the news\nsummary: Standfirst with plain words only.\ntopic: spacex\ntag: Dragon\ndate: 2026-10-27T09:30:00Z\n---\n"
BODY = ("SpaceX did a thing, per [SpaceX](https://x.com/SpaceX/status/2109956064774918286).\n\nSecond paragraph.\n\nThird paragraph.\n\n")


def page(extra="", head=HEAD):
    return ra.render("zz-test", head + BODY + extra)[1]


def squash(s):
    return re.sub(r"\s+", " ", s).strip()


class Render(unittest.TestCase):
    def test_basic_page(self):
        p = page("## A section\n\n- one [a](https://example.com/a)\n- two\n")
        self.assertIn("<h1>A headline that states the news</h1>", p)
        self.assertIn('<h2>A section</h2>', p)
        self.assertIn("<ul><li>one", p)
        self.assertIn('<link rel="canonical" href="https://superchargeddaily.com/dispatch/zz-test.html"', p)
        self.assertRegex(p, r"<!-- md:[0-9a-f]{12} -->")
        self.assertIn("<!-- seo:about -->", p, "generator markers must survive")
        self.assertNotIn("twitter.com/widgets.js", p)

    def test_pull_matches_existing_markup(self):
        self.assertIn('<p class="pull">I hadn\'t realised that.</p>'.replace("'", "&#x27;"), page("::pull I hadn't realised that.\n").replace("'", "&#x27;"))

    def test_video_matches_an_existing_article(self):
        orig = squash((ROOT / "dispatch" / "crs35-final-solar-arrays.html").read_text(encoding="utf-8"))
        fig = re.search(r'<figure class="figure-video">.*?</figure>', orig).group(0)
        md = ("::video\nsrc: /assets/dispatch/crs35-final-solar-arrays.mp4\nposter: /assets/dispatch/crs35-final-solar-arrays-poster.jpg\n"
              "caption: Video: @SpaceX (CRS-35)\n")
        self.assertIn(squash(fig), squash(page(md)))

    def test_x_post_is_click_to_load(self):
        p = page("::x\nurl: https://x.com/NASA/status/2110717473372749989\nauthor: NASA (@NASA)\ntext: LIVE: docking.\ncaption: Video: NASA.\n")
        self.assertIn('<figure class="figure-embed">', p)
        self.assertIn('class="twitter-tweet"', p)
        self.assertIn("/x-embed.css", p)
        self.assertIn("/x-embed.js", p)
        self.assertNotIn("platform.twitter.com", p)

    def test_no_x_assets_without_a_post(self):
        self.assertNotIn("x-embed.js", page())

    def test_table(self):
        p = page("## Numbers\n\n| A | B |\n|---|---|\n| 1 | 2 |\n")
        self.assertIn('class="sd-table-wrap" tabindex="0" role="region" aria-label="Numbers"', p)
        self.assertIn("<td>1</td><td>2</td>", p)

    def test_escapes_text(self):
        p = page("A paragraph with <script> and AT&T.\n")
        self.assertNotIn("<script>and", p)
        self.assertIn("&lt;script&gt;", p)
        self.assertIn("AT&amp;T", p)


class Refuses(unittest.TestCase):
    def bad(self, text, needle):
        with self.assertRaises(ra.ArticleError) as c:
            ra.render("zz-test", text)
        self.assertIn(needle, str(c.exception))

    def test_draft_markers(self):
        self.bad(HEAD + BODY + "DRAFT: write this\n", "DRAFT")

    def test_raw_html(self):
        self.bad(HEAD + BODY + "<div>hi</div>\n", "raw HTML")

    def test_markdown_in_summary(self):
        self.bad(HEAD.replace("plain words only.", "a [link](https://example.com/s).") + BODY, "plain text")

    def test_missing_front_matter(self):
        self.bad("No front matter\n", "front matter")
        self.bad(HEAD.replace("tag: Dragon\n", "") + BODY, "'tag:'")

    def test_unfinished(self):
        self.bad(HEAD + "One paragraph [src](https://example.com).\n", "three paragraphs")

    def test_needs_sources(self):
        self.bad(HEAD + "One.\n\nTwo.\n\nThree.\n", "source links")

    def test_image_needs_alt(self):
        self.bad(HEAD.replace("---\n", "---\nimage: /assets/og-v2.jpg\n", 1) + BODY, "imageAlt")
        self.bad(HEAD + BODY + "::image\nsrc: /assets/og-v2.jpg\ncaption: c\n", "'alt:'")

    def test_missing_media_file(self):
        self.bad(HEAD + BODY + "::image\nsrc: /assets/dispatch/nope.jpg\nalt: a\ncaption: c\n", "does not exist")

    def test_bad_x_url(self):
        self.bad(HEAD + BODY + "::x\nurl: https://example.com/x\nauthor: a\ntext: t\ncaption: c\n", "x.com")

    def test_title_belongs_in_front_matter(self):
        self.bad(HEAD + BODY + "# Another title\n", "front matter")


class Repo(unittest.TestCase):
    def test_every_source_file_validates(self):
        for f in sorted((ROOT / "content" / "dispatch").glob("*.md")):
            with self.subTest(f.name):
                ra.render(f.stem, f.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
