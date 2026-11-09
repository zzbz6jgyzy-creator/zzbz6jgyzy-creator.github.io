"""scripts/check-site-integrity.py blocks the breakages of 9 Nov 2026 and nothing that was already there."""
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "check-site-integrity.py"


def page(body="", tail="</body>\n</html>\n"):
    return "<!doctype html>\n<html lang=\"en\"><head><title>t</title></head><body>" + body + tail


def cards(n):
    return "".join('<a class="story-card" href="/dispatch/s%d.html"><h2>S%d</h2></a>' % (i, i) for i in range(n))


HOME = page('<!--hv:lead--><a href="/dispatch/s0.html">Lead</a><!--/hv:lead--><script src="/assets/js/core.bundle.abc.js"></script>')


class Integrity(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = pathlib.Path(self.tmp.name)
        self.git("init", "-q", "-b", "main")
        self.git("config", "user.email", "t@example.com")
        self.git("config", "user.name", "t")
        self.write({"index.html": HOME, "dispatch.html": page(cards(20)), "assets/js/core.bundle.abc.js": "1",
                    "data/x.json": '{"a": 1}', "style.css": "a{}"})
        self.commit("base")

    def tearDown(self):
        self.tmp.cleanup()

    def git(self, *args):
        subprocess.run(["git", *args], cwd=self.dir, check=True, capture_output=True)

    def write(self, files):
        for name, text in files.items():
            p = self.dir / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text)

    def commit(self, msg):
        self.git("add", "-A")
        self.git("commit", "-q", "-m", msg)

    def check(self, *args):
        env = dict(os.environ, SITE_INTEGRITY_ROOT=str(self.dir))
        return subprocess.run([sys.executable, str(SCRIPT), *args], cwd=self.dir, env=env, capture_output=True, text=True)

    def test_clean_site_passes(self):
        r = self.check("--ref", "HEAD", "--base", "HEAD")
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_truncated_dispatch_is_blocked(self):
        # What the 08:36 publish did: one card left, file cut off mid-tag.
        self.write({"dispatch.html": page(cards(1), tail="\n            <")})
        self.commit("publish")
        r = self.check("--ref", "HEAD", "--base", "HEAD~1")
        self.assertEqual(r.returncode, 1)
        self.assertIn("cut off", r.stderr)
        self.assertIn("fell from 20 to 1", r.stderr)

    def test_unstaged_bundle_is_blocked(self):
        # What the 08:10 Starlink refresh did: page points at a bundle that was never committed.
        self.write({"starlink.html": page('<script defer src="/assets/js/starlink.bundle.new.js"></script>')})
        self.git("add", "starlink.html")
        self.git("commit", "-q", "-m", "refresh")
        (self.dir / "assets/js/starlink.bundle.new.js").write_text("1")  # on disk, but not committed
        self.assertEqual(self.check().returncode, 0, "the working tree has the file")
        r = self.check("--ref", "HEAD", "--base", "HEAD~1")
        self.assertEqual(r.returncode, 1)
        self.assertIn("/assets/js/starlink.bundle.new.js, which does not exist", r.stderr)

    def test_index_mode_sees_what_is_staged(self):
        self.write({"index.html": HOME.replace("core.bundle.abc", "core.bundle.zzz")})
        self.git("add", "index.html")
        self.assertEqual(self.check("--ref", ":", "--base", "HEAD").returncode, 1)

    def test_broken_json_and_empty_lead_are_blocked(self):
        self.write({"data/x.json": '{"a": ', "index.html": HOME.replace('<a href="/dispatch/s0.html">Lead</a>', "")})
        self.commit("bad")
        r = self.check("--ref", "HEAD", "--base", "HEAD~1")
        self.assertIn("data/x.json: not valid JSON", r.stderr)
        self.assertIn("lead slot has no story link", r.stderr)

    def test_problem_already_on_base_does_not_block(self):
        self.write({"old.html": page('<link rel="stylesheet" href="/gone.css?v=1">')})
        self.commit("pre-existing problem")
        self.write({"style.css": "b{}"})
        self.commit("unrelated bot change")
        r = self.check("--ref", "HEAD", "--base", "HEAD~1")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("already on the base", r.stdout)
        self.assertEqual(self.check("--ref", "HEAD").returncode, 1, "without a base it is still reported")

    def test_query_strings_and_skipped_folders(self):
        self.write({"a.html": page('<link rel="stylesheet" href="/style.css?v=20261109">'),
                    "templates/t.html": page('<script src="/nope.js"></script>'),
                    "frag.html": "<div>fragment without html tag</div>"})
        self.commit("ok")
        r = self.check("--ref", "HEAD", "--base", "HEAD~1")
        self.assertEqual(r.returncode, 0, r.stderr)


class Wiring(unittest.TestCase):
    def test_bots_check_before_push(self):
        text = (ROOT / "scripts" / "ci-push-retry.sh").read_text()
        self.assertLess(text.index("check-site-integrity.py"), text.index("git push"))

    def test_workflow_and_hook(self):
        self.assertIn("check-site-integrity.py", (ROOT / ".github/workflows/site-integrity.yml").read_text())
        self.assertIn("check-site-integrity.py", (ROOT / ".claude/hooks/pre_commit.py").read_text())


if __name__ == "__main__":
    unittest.main()
