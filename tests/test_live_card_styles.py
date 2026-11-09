"""A page that carries a prerendered livestream card must load live.css, or the card renders as raw text.

tesla.html showed the Tesla annual meeting card as unstyled underlined text over the hero until 9 Nov 2026.
"""
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SKIP = ("astro", "social", "templates", "scripts", "tests", "node_modules", "dist")


class LiveCardStyles(unittest.TestCase):
    def test_prerendered_cards_have_their_stylesheet(self):
        bad = []
        for path in sorted(ROOT.rglob("*.html")):
            rel = path.relative_to(ROOT)
            if rel.parts[0] in SKIP:
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            if re.search(r'<section class="lv[ "]', text) and not re.search(r'href="/live\.css', text):
                bad.append(str(rel))
        self.assertEqual(bad, [], "add /live.css to these pages (via their builder)")


if __name__ == "__main__":
    unittest.main()
