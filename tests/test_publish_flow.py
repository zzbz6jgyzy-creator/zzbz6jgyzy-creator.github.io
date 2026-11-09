"""The phone publishing path end to end: docs/article-template.md -> content/dispatch/<slug>.md -> page, card, entry.

Runs scripts/render-article.py in a throwaway copy of the site, so the real pages are never touched. Guards the failure
that cut dispatch.html off on 9 Nov 2026: a publish must add exactly one card and leave every file whole.
"""
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
TEMPLATE = (ROOT / "docs" / "article-template.md").read_text(encoding="utf-8")


def filled(template):
    out = []
    for line in template.splitlines():
        if line.startswith("title:"):
            out.append("title: SpaceX tests a thing, and here is what it shows")
        elif line.startswith("summary:"):
            out.append("summary: SpaceX ran a test on Monday; the company has not said what comes next.")
        elif "DRAFT" in line:
            out.append(line.replace("DRAFT ", "").replace("DRAFT", ""))
        else:
            out.append(line)
    out.insert(out.index("---", 1), "date: 2026-11-09T12:00:00Z")
    return "\n".join(out) + "\n"


class PublishFlow(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = pathlib.Path(self.tmp.name)
        for d in ("scripts", "dispatch", "data", "content/dispatch"):
            (self.dir / d).mkdir(parents=True, exist_ok=True)
        for f in ("render-article.py", "new-article.py"):
            shutil.copy(ROOT / "scripts" / f, self.dir / "scripts" / f)
        for f in (ROOT / "dispatch").glob("*.html"):
            shutil.copy(f, self.dir / "dispatch" / f.name)
        shutil.copy(ROOT / "dispatch.html", self.dir / "dispatch.html")
        shutil.copy(ROOT / "data" / "articles.json", self.dir / "data" / "articles.json")

    def tearDown(self):
        self.tmp.cleanup()

    def render(self, slug, text):
        (self.dir / "content" / "dispatch" / f"{slug}.md").write_text(text, encoding="utf-8")
        return subprocess.run([sys.executable, str(self.dir / "scripts" / "render-article.py"), slug],
                              cwd=self.dir, capture_output=True, text=True)

    def test_untouched_template_is_refused_and_changes_nothing(self):
        before = (self.dir / "dispatch.html").read_text(encoding="utf-8")
        r = self.render("zz-phone-test", TEMPLATE)
        self.assertNotEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("DRAFT", r.stdout + r.stderr)
        self.assertFalse((self.dir / "dispatch" / "zz-phone-test.html").exists())
        self.assertEqual((self.dir / "dispatch.html").read_text(encoding="utf-8"), before)

    def test_filled_template_publishes_one_whole_story(self):
        disp = self.dir / "dispatch.html"
        cards = lambda: len(re.findall(r'<a class="story-card[^"]*" href="/dispatch/', disp.read_text(encoding="utf-8")))
        n = cards()
        r = self.render("zz-phone-test", filled(TEMPLATE))
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        page = (self.dir / "dispatch" / "zz-phone-test.html").read_text(encoding="utf-8")
        self.assertTrue(page.rstrip().endswith("</html>"))
        self.assertIn("<h1>SpaceX tests a thing, and here is what it shows</h1>", page)
        self.assertEqual(cards(), n + 1, "exactly one new Dispatch card")
        self.assertTrue(disp.read_text(encoding="utf-8").rstrip().endswith("</html>"), "dispatch.html stays whole")
        data = json.loads((self.dir / "data" / "articles.json").read_text(encoding="utf-8"))
        self.assertEqual(data["articles"][0]["url"], "/dispatch/zz-phone-test.html")
        # Rendering again changes nothing (no duplicate card).
        self.render("zz-phone-test", filled(TEMPLATE))
        self.assertEqual(cards(), n + 1)


class PhoneLink(unittest.TestCase):
    def test_link_opens_the_template_in_content_dispatch(self):
        doc = (ROOT / "docs" / "publish-from-phone.md").read_text(encoding="utf-8")
        m = re.search(r"\]\((https://github\.com/zzbz6jgyzy-creator/zzbz6jgyzy-creator\.github\.io/new/main/content/dispatch\?[^)]+)\)", doc)
        self.assertTrue(m, "one-tap link missing")
        q = urllib.parse.parse_qs(urllib.parse.urlparse(m.group(1)).query)
        self.assertEqual(q["value"][0], TEMPLATE, "the link must carry docs/article-template.md exactly; regenerate it")
        self.assertTrue(q["filename"][0].endswith(".md"))

    def test_render_folder_holds_only_stories(self):
        # Every *.md in content/dispatch is rendered as a story, so a README or template there would fail the build.
        for p in (ROOT / "content" / "dispatch").glob("*.md"):
            self.assertRegex(p.stem, r"^[a-z0-9]+(-[a-z0-9]+)*$", f"{p.name} is not a story slug")

if __name__ == "__main__":
    unittest.main()
