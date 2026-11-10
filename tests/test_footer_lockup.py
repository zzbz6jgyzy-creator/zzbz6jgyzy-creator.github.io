"""The footer lockup must stay readable in light mode: its wordmark is white, so light theme swaps in the ink version."""
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class FooterLockup(unittest.TestCase):
    def test_light_theme_swaps_to_the_ink_lockup(self):
        css = (ROOT / "theme.css").read_text(encoding="utf-8")
        self.assertIn("html[data-theme=light] .footer-lockup img{content:url(/assets/brand/lockup-1b-trim-ink.svg)}", css)
        ink = (ROOT / "assets/brand/lockup-1b-trim-ink.svg").read_text(encoding="utf-8")
        white = (ROOT / "assets/brand/lockup-1b-trim.svg").read_text(encoding="utf-8")
        self.assertEqual(ink.replace('<g fill="#16171b"', '<g fill="#fff"'), white, "same artwork, only the wordmark colour differs")
        self.assertIn('fill="#fff"', ink, "the bolt stays white on the red tile")


if __name__ == "__main__":
    unittest.main()
