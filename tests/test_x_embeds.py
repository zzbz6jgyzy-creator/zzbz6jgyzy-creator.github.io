"""X posts must stay click-to-load: no article pulls platform.twitter.com on page load."""
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class XEmbeds(unittest.TestCase):
    def test_articles_do_not_load_widgets_directly(self):
        bad, missing = [], []
        for path in sorted((ROOT / "dispatch").glob("*.html")):
            text = path.read_text(encoding="utf-8")
            if "twitter-tweet" not in text:
                continue
            if "platform.twitter.com/widgets.js" in text:
                bad.append(path.name)
            if "/x-embed.js" not in text or "/x-embed.css" not in text:
                missing.append(path.name)
        self.assertEqual(bad, [], "these load X's script on page load; use /x-embed.js instead")
        self.assertEqual(missing, [], "embeds without the click-to-load script and stylesheet render unstyled")

    def test_embed_files_exist(self):
        for name in ("x-embed.js", "x-embed.css"):
            self.assertTrue((ROOT / name).exists(), name)


if __name__ == "__main__":
    unittest.main()
