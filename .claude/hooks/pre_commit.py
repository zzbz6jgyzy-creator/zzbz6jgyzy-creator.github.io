#!/usr/bin/env python3
"""Blocks a commit when it would add something that must not land.

Runs as a Claude Code PreToolUse hook on `git commit*` (reads the tool call from stdin), or
as a plain git pre-commit hook with `--git` (see scripts/install-git-hooks.sh). A failure
exits 2 and prints why on stderr, which is what Claude Code feeds back to the model.

Checks, all on the staged files (plus tracked changes when the command uses -a):
  1. never commit on main/master
  2. no secrets in added lines (gitleaks when installed, built-in patterns otherwise)
  3. JSON, Python and JS files parse
  4. HTML <head> has no loose text (a half-broken meta tag) and no DRAFT marker in articles
  5. the fast unit tests pass (Python + Node)
"""
import json
import os
import re
import shutil
import subprocess
import sys
from html.parser import HTMLParser

ROOT = os.environ.get("CLAUDE_PROJECT_DIR") or subprocess.run(
    ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True).stdout.strip() or os.getcwd()
GIT_MODE = "--git" in sys.argv

# Public by design, so never a finding: Supabase publishable key, Cloudflare Web Analytics token.
ALLOW = re.compile(r"sb_publishable_[\w-]+|data-cf-beacon|cloudflareinsights|1927a50f248444ec9bdcf9f5607e7d7b")
SECRETS = [
    ("Supabase secret key", re.compile(r"sb_secret_[A-Za-z0-9_-]{16,}")),
    ("JWT (service_role or user token)", re.compile(r"eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}")),
    ("GitHub token", re.compile(r"\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}")),
    ("AWS access key", re.compile(r"\b(AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("Anthropic/OpenAI key", re.compile(r"\bsk-(ant-)?[A-Za-z0-9_-]{32,}")),
    ("Slack token", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{20,}")),
    ("Stripe key", re.compile(r"\b[sr]k_live_[A-Za-z0-9]{20,}")),
    ("Cloudflare API token", re.compile(r"\bCLOUDFLARE_API_TOKEN\s*[=:]\s*['\"]?[A-Za-z0-9_-]{30,}")),
    ("private key", re.compile(r"-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----")),
    ("password / secret assignment", re.compile(r"(?i)\b(password|passwd|secret|api[_-]?key|service[_-]?role[_-]?key)\b\s*[:=]\s*['\"][^'\"\s]{12,}['\"]")),
]


def git(*args, check=False):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True).stdout


def command_text():
    if GIT_MODE:
        return ""
    try:
        return json.load(sys.stdin).get("tool_input", {}).get("command", "")
    except Exception:
        return ""


def changed_files(cmd):
    names = git("diff", "--cached", "--name-only", "--diff-filter=ACMR").splitlines()
    if re.search(r"(^|\s)(-[a-zA-Z]*a[a-zA-Z]*|--all)(\s|$)", cmd or ""):
        names += git("diff", "--name-only", "--diff-filter=ACMR").splitlines()
    return sorted(set(names))


def added_lines(files, cmd):
    out = git("diff", "--cached", "-U0", "--no-color", "--", *files)
    if re.search(r"(^|\s)(-[a-zA-Z]*a[a-zA-Z]*|--all)(\s|$)", cmd or ""):
        out += git("diff", "-U0", "--no-color", "--", *files)
    cur, found = None, []
    for line in out.splitlines():
        if line.startswith("+++ b/"):
            cur = line[6:]
        elif line.startswith("+") and not line.startswith("+++"):
            found.append((cur, line[1:]))
    return found


class Head(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.stray = [], []

    def handle_starttag(self, tag, attrs):
        if tag not in ("meta", "link", "br", "img", "input", "hr"):
            self.stack.append(tag)

    def handle_endtag(self, tag):
        while self.stack and self.stack.pop() != tag:
            pass

    def handle_data(self, data):
        if self.stack and self.stack[-1] == "head" and data.strip():
            self.stray.append(data.strip()[:70])


def main():
    cmd = command_text()
    problems = []

    branch = git("branch", "--show-current").strip()
    if branch in ("main", "master"):
        problems.append(f"You are on {branch}. Create a branch (git switch -c claude/<topic>) and commit there.")

    files = changed_files(cmd)
    if not files:
        return finish(problems)

    # 2. secrets
    if shutil.which("gitleaks"):
        r = subprocess.run(["gitleaks", "git", "--pre-commit", "--redact", "--staged", "--no-banner"],
                           cwd=ROOT, capture_output=True, text=True)
        if r.returncode:
            problems.append("gitleaks found a secret in the staged changes:\n" + (r.stdout + r.stderr).strip()[-800:])
    for path, line in added_lines(files, cmd):
        scrubbed = ALLOW.sub("", line)
        for name, rx in SECRETS:
            if rx.search(scrubbed):
                problems.append(f"possible {name} in {path}: remove it (never commit keys; use environment secrets).")
                break

    # 3 + 4. syntax and head hygiene
    for f in files:
        full = os.path.join(ROOT, f)
        if not os.path.isfile(full):
            continue
        try:
            if f.endswith(".json"):
                json.load(open(full, encoding="utf-8"))
            elif f.endswith(".py"):
                compile(open(full, encoding="utf-8").read(), f, "exec")
            elif f.endswith((".js", ".mjs")) and not f.startswith(("assets/js/", "vendor/")):
                r = subprocess.run(["node", "--check", full], capture_output=True, text=True)
                if r.returncode:
                    problems.append(f"{f}: JavaScript syntax error: {r.stderr.strip().splitlines()[0] if r.stderr else ''}")
            elif f.endswith(".html"):
                text = open(full, encoding="utf-8").read()
                head = Head()
                head.feed(text.split("</head>")[0] + "</head>")
                if head.stray:
                    problems.append(f"{f}: loose text in <head> (a broken meta tag?): {head.stray[0]!r}")
                if f.startswith("dispatch/") and re.search(r"<!-- DRAFT|DRAFT:", text):
                    problems.append(f"{f}: still has DRAFT markers. Finish the article or keep it out of this commit.")
        except (ValueError, SyntaxError) as e:
            problems.append(f"{f}: does not parse ({str(e)[:100]})")

    # 5. fast tests
    if not problems:
        py_tests = [t for t in ("tests/test_seo_audit.py", "tests/test_claude_setup.py") if os.path.exists(os.path.join(ROOT, t))]
        if py_tests:
            t = subprocess.run([sys.executable, "-m", "unittest", *py_tests], cwd=ROOT, capture_output=True, text=True)
            if t.returncode:
                problems.append("Python tests failed:\n" + t.stderr.strip()[-900:])
        tests_dir = os.path.join(ROOT, "tests")
        node_tests = sorted(f for f in os.listdir(tests_dir) if f.endswith(".test.mjs")) if os.path.isdir(tests_dir) else []
        if node_tests and shutil.which("node"):
            t = subprocess.run(["node", "--test", *[os.path.join("tests", f) for f in node_tests]],
                               cwd=ROOT, capture_output=True, text=True)
            if t.returncode:
                bad = [l for l in t.stdout.splitlines() if l.startswith("not ok")]
                problems.append("Node tests failed: " + "; ".join(bad[:4]) + " (run node --test tests/*.test.mjs)")
    return finish(problems)


def finish(problems):
    if problems:
        sys.stderr.write("Commit blocked by .claude/hooks/pre_commit.py:\n- " + "\n- ".join(problems) + "\n")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
