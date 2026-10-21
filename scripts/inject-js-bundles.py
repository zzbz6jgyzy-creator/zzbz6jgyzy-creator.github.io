#!/usr/bin/env python3
"""Replace first-party <script src> tags with hashed bundle tags.

Idempotent markers: <!--sd:bundles--> ... <!--/sd:bundles-->
Keeps theme-boot.js (head, blocking), workers, type=module scripts,
Cloudflare/Twitter tags, and inline scripts.

Page spec keys:
  bundles       deferred (run in order, before first paint)
  asyncBundles  async hashed bundles (do not block hero paint)
  lateFiles     first-party files injected after first paint (e.g. starlink-gp.js)
  asyncFiles    alias of lateFiles (kept for older specs)

Run after scripts/build-js.mjs:
    python3 scripts/inject-js-bundles.py
"""
from __future__ import annotations

import fnmatch
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
CFG = json.loads((ROOT / "scripts" / "js-bundles.json").read_text(encoding="utf-8"))
MANIFEST = json.loads((ROOT / CFG["outDir"] / "manifest.json").read_text(encoding="utf-8"))
BEGIN, END = "<!--sd:bundles-->", "<!--/sd:bundles-->"
MARKER_RX = re.compile(r"[ \t]*<!--sd:bundles-->.*?<!--/sd:bundles-->\n?", re.S)
SRC_RX = re.compile(
    r"^([ \t]*)<script(?![^>]*\btype=\"application/ld\+json\")(?![^>]*\btype=\"module\")"
    r"([^>]*\bsrc=\"([^\"]+)\"[^>]*)>\s*</script>[ \t]*\n?",
    re.I | re.M,
)
GROW_ATTRS = ("data-band", "data-pop", "data-ref")


def bundled_names() -> set[str]:
    names = set()
    for files in CFG["bundles"].values():
        for f in files:
            names.add(f.split("/")[-1])
            names.add(f)
    return names


BUNDLED = bundled_names()
KEEP = set(CFG.get("keep") or [])
SKIP = set(CFG.get("skipPages") or [])


def page_spec(rel: str) -> dict | None:
    if rel in SKIP:
        return None
    if rel in CFG["pages"]:
        return CFG["pages"][rel]
    for pat, spec in (CFG.get("pageGlobs") or {}).items():
        if fnmatch.fnmatch(rel, pat):
            return spec
    return CFG.get("defaultPage")


def src_name(src: str) -> str:
    path = src.split("?")[0]
    if path.startswith("http://") or path.startswith("https://"):
        return src
    return path.lstrip("/")


def late_files(spec: dict | None) -> list[str]:
    spec = spec or {}
    return list(spec.get("lateFiles") or spec.get("asyncFiles") or [])


def async_file_names(spec: dict | None) -> set[str]:
    names = set()
    for f in late_files(spec):
        names.add(f.lstrip("/"))
        names.add(f.split("/")[-1])
    return names


def should_remove(src: str, spec: dict | None = None) -> bool:
    name = src_name(src)
    if name.startswith("http://") or name.startswith("https://"):
        return False
    if "cloudflareinsights" in name or "platform.twitter.com" in name or name.startswith("cdn-cgi/"):
        return False
    if name in KEEP:
        return False
    base = name.split("/")[-1]
    if name in async_file_names(spec) or base in async_file_names(spec):
        return True
    if name.startswith("vendor/") or name.startswith("assets/vendor/") or name.startswith("workers/"):
        return False
    if name.startswith(CFG["outDir"].rstrip("/") + "/"):
        return True
    return name in BUNDLED or base in BUNDLED


def grow_from_html(html: str, spec: dict) -> list[str]:
    attrs = []
    for tag in re.finditer(r"<script[^>]+>", html, re.I):
        t = tag.group(0)
        if "grow.js" in t or "/assets/js/core.bundle." in t:
            for a in GROW_ATTRS:
                if re.search(r"\b" + a + r"\b", t) and a not in attrs:
                    attrs.append(a)
    if attrs:
        return attrs
    return list(spec.get("grow") or [])


def live_from_html(html: str, spec: dict) -> str:
    m = re.search(r'<script[^>]*\bdata-page="([^"]+)"[^>]*>', html, re.I)
    if m:
        return m.group(1)
    return spec.get("livePage") or ""


def bundle_tag(name: str, extra: str, how: str = "defer") -> str:
    info = MANIFEST["bundles"][name]
    attrs = f' {how} src="' + info["file"] + '"'
    if how == "async":
        attrs += ' fetchpriority="low"'
    if extra:
        attrs += " " + extra
    return f"<script{attrs}></script>"


def late_file_tag(html: str, rel: str) -> str:
    name = rel.lstrip("/")
    m = re.search(
        rf'(?:src="|"src":\s*")(/{re.escape(name)}\?v=\d+)',
        html,
    )
    src = m.group(1) if m else "/" + name
    key = name[:-3] if name.endswith(".js") else name
    payload = json.dumps({"src": src}, separators=(",", ":"))
    return f'<script type="application/json" id="sd-late-{key}">{payload}</script>'


def render_block(spec: dict, grow: list[str], live: str, html: str) -> str:
    lines = ["    " + BEGIN]
    for name in spec["bundles"]:
        extra = []
        if name == "core" and grow:
            extra.extend(grow)
        if live and "live.js" in MANIFEST["bundles"][name]["sources"]:
            extra.append(f'data-page="{live}"')
        lines.append("    " + bundle_tag(name, " ".join(extra)))
    for name in spec.get("asyncBundles") or []:
        extra = []
        if live and "live.js" in MANIFEST["bundles"][name]["sources"]:
            extra.append(f'data-page="{live}"')
        lines.append("    " + bundle_tag(name, " ".join(extra), "async"))
    for rel in late_files(spec):
        lines.append("    " + late_file_tag(html, rel))
    lines.append("    " + END)
    return "\n".join(lines) + "\n"


def strip_bundled_scripts(html: str, spec: dict | None = None) -> str:
    def repl(m: re.Match) -> str:
        return "" if should_remove(m.group(3), spec) else m.group(0)

    html = SRC_RX.sub(repl, html)
    html = re.sub(r"\n{3,}", "\n\n", html)
    return html


def patch(html: str, spec: dict) -> str:
    grow = grow_from_html(html, spec)
    live = live_from_html(html, spec)
    block = render_block(spec, grow, live, html)
    marker = MARKER_RX.search(html)
    if marker:
        before = strip_bundled_scripts(html[: marker.start()], spec)
        after = strip_bundled_scripts(html[marker.end() :], spec)
        return before + block + after
    html = strip_bundled_scripts(html, spec)
    if "</body>" not in html:
        return html.rstrip() + "\n" + block
    return html.replace("</body>", block + "  </body>", 1)


def main() -> None:
    if "bundles" not in MANIFEST:
        raise SystemExit("assets/js/manifest.json missing — run node scripts/build-js.mjs first")
    changed = []
    for path in sorted(ROOT.rglob("*.html")):
        if any(p in path.parts for p in (".git", "node_modules", "vendor", "assets")):
            continue
        rel = str(path.relative_to(ROOT)).replace("\\", "/")
        spec = page_spec(rel)
        if spec is None:
            continue
        old = path.read_text(encoding="utf-8")
        if "<html" not in old.lower():
            continue
        if re.search(r'http-equiv="refresh"', old, re.I):
            if BEGIN in old:
                new = MARKER_RX.sub("", old)
                new = re.sub(r"\n{3,}", "\n\n", new)
                if new != old:
                    path.write_text(new, encoding="utf-8")
                    changed.append(rel + " (stripped redirect)")
            continue
        new = patch(old, spec)
        if new != old:
            path.write_text(new, encoding="utf-8")
            changed.append(rel)
    print(f"updated {len(changed)} html files")
    for rel in changed:
        print(" ", rel)


if __name__ == "__main__":
    main()
