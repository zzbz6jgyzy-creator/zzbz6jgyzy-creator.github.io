#!/usr/bin/env python3
"""The Astro packaging layer keeps the invariants that stop it changing URLs or leaking repo files."""
import json
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASTRO = ROOT / "astro"


class Scaffold(unittest.TestCase):
    def test_config_keeps_html_urls(self):
        cfg = (ASTRO / "astro.config.mjs").read_text(encoding="utf-8")
        self.assertIn("format: 'file'", cfg)
        self.assertIn("publicDir: './.legacy'", cfg)
        wr = (ASTRO / "wrangler.jsonc").read_text(encoding="utf-8")
        self.assertRegex(wr, r'"html_handling":\s*"none"')
        self.assertRegex(wr, r'"not_found_handling":\s*"404-page"')
        self.assertNotRegex(wr, r'"routes"|custom_domain', "no route or domain until the approved cutover")

    def test_astro_pinned(self):
        pkg = json.loads((ASTRO / "package.json").read_text(encoding="utf-8"))
        self.assertRegex(pkg["dependencies"]["astro"], r"^\d+\.\d+\.\d+$", "pin Astro exactly")

    def test_gitignore(self):
        ig = (ROOT / ".gitignore").read_text(encoding="utf-8")
        for p in ("astro/.legacy/", "astro/dist/", "astro/node_modules/"):
            self.assertIn(p, ig)

    def test_ported_files_exist_as_pages(self):
        ported = json.loads((ASTRO / "ported.json").read_text(encoding="utf-8"))["files"]
        for f in ported:
            self.assertTrue(list((ASTRO / "src" / "pages").rglob(Path(f).stem + ".*")), f"{f} is listed as ported but has no Astro page")


class Packaging(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out = tempfile.mkdtemp(prefix="sd-legacy-")
        cls.proc = subprocess.run(["node", str(ASTRO / "scripts" / "prepare-legacy.mjs"), "--out", cls.out],
                                 capture_output=True, text=True, cwd=ASTRO)

    def test_runs(self):
        self.assertEqual(self.proc.returncode, 0, self.proc.stderr)

    def test_no_repo_only_files(self):
        out = Path(self.out)
        for d in ("scripts", "tests", "docs", "supabase", "workers", "templates", ".github", ".claude", "astro", "dev", "node_modules"):
            self.assertFalse((out / d).exists(), d)
        self.assertEqual([p.name for p in out.glob("*.md")], [])
        self.assertFalse((out / "CNAME").exists())

    def test_site_files_present(self):
        out = Path(self.out)
        for f in ("index.html", "404.html", "robots.txt", "sitemap.xml", ".well-known/security.txt", "_headers", "_redirects"):
            self.assertTrue((out / f).exists(), f)

    def test_headers_and_redirects(self):
        out = Path(self.out)
        h = (out / "_headers").read_text(encoding="utf-8")
        self.assertIn("/assets/js/*\n  Cache-Control: public, max-age=31536000, immutable", h)
        self.assertIn("X-Content-Type-Options: nosniff", h)
        self.assertEqual(len(re.findall(r"^/\*\n", h, re.M)), 1)
        self.assertNotIn("Cache-Control", h.split("\n\n")[0], "the catch-all rule must not set Cache-Control: rules merge")
        r = (out / "_redirects").read_text(encoding="utf-8")
        self.assertIn("/goldcab.html /games.html 301", r)


if __name__ == "__main__":
    unittest.main()
