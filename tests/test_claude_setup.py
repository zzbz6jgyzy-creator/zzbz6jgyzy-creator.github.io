#!/usr/bin/env python3
"""The Claude Code setup (.claude/, scripts/audit, helper scripts) stays valid and the hooks do their job."""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLAUDE = ROOT / ".claude"
HOOK = CLAUDE / "hooks" / "pre_commit.py"
# Documented as the thing to create by renaming settings.proposed.json; allowed to be absent until the owner does.
PENDING = {".claude/settings.json"}


def frontmatter(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    assert m, f"{path} has no frontmatter"
    fields = {}
    for line in m.group(1).splitlines():
        if re.match(r"^[A-Za-z][\w-]*:", line):
            k, v = line.split(":", 1)
            fields[k.strip()] = v.strip()
    return fields, text[m.end():]


class Definitions(unittest.TestCase):
    def test_agents(self):
        names = {p.stem for p in (CLAUDE / "agents").glob("*.md")}
        self.assertEqual(names, {"designer", "frontend", "seo", "reviewer", "content-ops"})
        for p in (CLAUDE / "agents").glob("*.md"):
            fm, body = frontmatter(p)
            self.assertEqual(fm["name"], p.stem)
            self.assertGreater(len(fm["description"]), 40, p)
            self.assertGreater(len(body.strip()), 300, p)
        fm, _ = frontmatter(CLAUDE / "agents" / "reviewer.md")
        self.assertIn("Edit", fm["disallowedTools"], "the reviewer must stay read-only")
        self.assertIn("Write", fm["disallowedTools"])

    def test_commands(self):
        names = {p.stem for p in (CLAUDE / "commands").glob("*.md")}
        self.assertEqual(names, {"new-article", "new-review", "audit-page", "screenshot", "newsletter-draft", "ship"})
        for p in (CLAUDE / "commands").glob("*.md"):
            fm, body = frontmatter(p)
            self.assertIn("description", fm, p)
            self.assertIn("$ARGUMENTS", body, p)

    def test_skills(self):
        for name in ("build-tracker", "review-page"):
            fm, body = frontmatter(CLAUDE / "skills" / name / "SKILL.md")
            self.assertEqual(fm["name"], name)
            self.assertGreater(len(fm["description"]), 60)

    def test_every_referenced_path_exists(self):
        """Backticked repo paths in the setup files must exist, or the instructions are lying."""
        files = list(CLAUDE.rglob("*.md")) + [ROOT / "docs" / "claude-code-setup.md"]
        missing = []
        for f in files:
            if not f.exists():
                continue
            for ref in re.findall(r"`((?:scripts|tests|data|docs|\.claude|\.github)/[\w./*-]+?\.(?:py|mjs|js|json|md|yml|sh))`", f.read_text(encoding="utf-8")):
                if "*" in ref or "<" in ref or ref in PENDING:
                    continue
                if not (ROOT / ref).exists():
                    missing.append(f"{f.relative_to(ROOT)} -> {ref}")
        self.assertEqual(missing, [])

    def test_settings_if_present(self):
        p = CLAUDE / "settings.json"
        if not p.exists():
            self.skipTest("no .claude/settings.json yet")
        cfg = json.loads(p.read_text(encoding="utf-8"))
        deny = " ".join(cfg["permissions"]["deny"])
        for needle in ("git push --force", "Read(./.env)", "git push origin main"):
            self.assertIn(needle, deny)
        cmds = json.dumps(cfg["hooks"])
        for hook in ("pre_commit.py", "format.py", "session_start.py"):
            self.assertIn(hook, cmds)
            self.assertTrue((CLAUDE / "hooks" / hook).exists())


class Helpers(unittest.TestCase):
    def test_new_article_dry_run(self):
        r = subprocess.run([sys.executable, str(ROOT / "scripts" / "new-article.py"), "--slug", "zz-unit-test", "--topic", "spacex",
                            "--tag", "Starship", "--title", "A unit test headline", "--summary", "Unit test standfirst.", "--dry-run"],
                           capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("would create /dispatch/zz-unit-test.html", r.stdout)
        self.assertFalse((ROOT / "dispatch" / "zz-unit-test.html").exists())

    def test_new_article_rejects_bad_input(self):
        base = [sys.executable, str(ROOT / "scripts" / "new-article.py"), "--topic", "spacex", "--tag", "T", "--title", "T", "--summary", "S", "--dry-run"]
        self.assertNotEqual(subprocess.run(base + ["--slug", "Bad Slug"], capture_output=True, cwd=ROOT).returncode, 0)
        existing = json.loads((ROOT / "data" / "articles.json").read_text(encoding="utf-8"))["articles"][0]["url"]
        slug = existing.rsplit("/", 1)[1][:-5]
        self.assertNotEqual(subprocess.run(base + ["--slug", slug], capture_output=True, cwd=ROOT).returncode, 0)

    def test_newsletter_draft(self):
        r = subprocess.run([sys.executable, str(ROOT / "scripts" / "newsletter-draft.py"), "--end", "2026-10-26", "--top", "3"],
                           capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("## The stories that mattered", r.stdout)
        self.assertIn("utm_campaign=sunday-2026-10-26", r.stdout)
        self.assertIn("DRAFT", r.stdout, "the draft must stay visibly unfinished until the owner fills it")

    def test_seo_check_flags_broken_head(self):
        sys.path.insert(0, str(ROOT / "scripts" / "audit"))
        import seo_check
        bad = ('<!doctype html><html><head><title>t</title>\n    loose text from a broken meta tag"\n    />\n'
               '<link rel="canonical" href="x"></head><body><h1>a</h1></body></html>')
        problems = seo_check.check(bad, "dispatch/x.html")["problems"]
        self.assertTrue(any("loose in <head>" in p for p in problems), problems)
        self.assertTrue(any("DRAFT" in p for p in seo_check.check("<html><head></head><body><!-- DRAFT: x --></body></html>")["problems"]))


@unittest.skipUnless(shutil.which("git"), "git required")
class PreCommitHook(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="sd-hook-")
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.git("init", "-q", "-b", "claude/test")
        self.git("config", "user.email", "t@example.com")
        self.git("config", "user.name", "t")
        (Path(self.tmp) / "README.md").write_text("hi\n")
        self.git("add", "README.md")
        self.git("commit", "-q", "-m", "init", "--no-verify")

    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.tmp, capture_output=True, text=True)

    def run_hook(self):
        env = dict(os.environ, CLAUDE_PROJECT_DIR=self.tmp)
        return subprocess.run([sys.executable, str(HOOK), "--git"], cwd=self.tmp, env=env, capture_output=True, text=True)

    def stage(self, name, text):
        (Path(self.tmp) / name).parent.mkdir(parents=True, exist_ok=True)
        (Path(self.tmp) / name).write_text(text)
        self.git("add", name)

    def test_clean_commit_passes(self):
        self.stage("notes.md", "nothing secret here\n")
        r = self.run_hook()
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_blocks_secrets(self):
        for name, text in {
            "a.txt": "key = sb_secret_" + "a1b2c3d4e5f6g7h8i9j0\n",
            "b.txt": "token ghp_" + "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8\n",
            "c.txt": "-----BEGIN RSA " + "PRIVATE KEY-----\nabc\n",
            "d.js": 'const password = "' + 'hunter2hunter2hunter2' + '";\n',
        }.items():
            with self.subTest(name):
                self.stage(name, text)
                r = self.run_hook()
                self.assertEqual(r.returncode, 2, name)
                self.assertIn("possible", r.stderr)
                self.git("reset", "-q", name)
                (Path(self.tmp) / name).unlink()

    def test_public_keys_are_not_findings(self):
        self.stage("members-config.json", json.dumps({"publishableKey": "sb_publishable_hNZuO9JjzLBta4PupUgKDw_5A5W6Dp8"}))
        self.assertEqual(self.run_hook().returncode, 0)

    def test_blocks_broken_syntax(self):
        self.stage("bad.json", "{broken")
        r = self.run_hook()
        self.assertEqual(r.returncode, 2)
        self.assertIn("bad.json", r.stderr)

    def test_blocks_broken_head_and_drafts(self):
        self.stage("page.html", '<html><head><title>t</title>\n  stray words"\n  />\n</head><body></body></html>')
        r = self.run_hook()
        self.assertEqual(r.returncode, 2)
        self.assertIn("loose text", r.stderr)
        self.git("reset", "-q", "page.html")
        (Path(self.tmp) / "page.html").unlink()
        self.stage("dispatch/x.html", "<html><head><title>t</title></head><body><!-- DRAFT: body --></body></html>")
        self.assertEqual(self.run_hook().returncode, 2)

    def test_blocks_commit_on_main(self):
        self.git("switch", "-q", "-c", "main")
        self.stage("notes.md", "ok\n")
        r = self.run_hook()
        self.assertEqual(r.returncode, 2)
        self.assertIn("main", r.stderr)


if __name__ == "__main__":
    unittest.main()
