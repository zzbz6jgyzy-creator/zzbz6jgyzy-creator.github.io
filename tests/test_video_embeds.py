"""Article videos are tap-to-play: no Dispatch page loads YouTube (or its cookies) before the reader asks.

The shared facade is [data-youtube-embed] in script.js (core bundle): it shows our own image and only then
inserts a youtube-nocookie.com player. Fixed for the last two auto-loading articles on 9 Nov 2026.
"""
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class VideoEmbeds(unittest.TestCase):
    def test_no_article_loads_youtube_on_page_load(self):
        bad = [p.name for p in sorted((ROOT / "dispatch").glob("*.html"))
               if re.search(r'<iframe[^>]+src="https://www\.youtube(-nocookie)?\.com/embed/', p.read_text(encoding="utf-8"))]
        self.assertEqual(bad, [], "use the tap-to-play facade (data-youtube-embed) instead of a YouTube iframe")

    def test_facade_uses_nocookie_and_local_posters(self):
        js = (ROOT / "script.js").read_text(encoding="utf-8")
        self.assertIn("https://www.youtube-nocookie.com/embed/", js)
        self.assertNotIn('"https://www.youtube.com/embed/"', js)
        for p in (ROOT / "dispatch").glob("*.html"):
            for m in re.finditer(r'<div class="review-video-frame" data-youtube-embed="[^"]+"[^>]*>.*?<img src="([^"]+)"', p.read_text(encoding="utf-8"), re.S):
                self.assertTrue(m.group(1).startswith("/assets/"), f"{p.name}: poster must be our own file, not a YouTube thumbnail")
                self.assertTrue((ROOT / m.group(1).lstrip("/")).exists(), f"{p.name}: {m.group(1)} missing")


if __name__ == "__main__":
    unittest.main()
