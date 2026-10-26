#!/usr/bin/env python3
"""Footer rule: every page's <footer class="site-footer"> ends its link row with
"Contact me" (mailto:superchargeddaily@gmail.com), in the existing link style.
Idempotent. Run directly or via scripts/build-articles.py (which calls it)."""
import glob, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HREF = "mailto:superchargeddaily@gmail.com"
LINK = f'<a href="{HREF}">Contact me</a>'
FOOT = re.compile(r'<footer class="site-footer">[\s\S]*?</footer>')
def fix(foot):
    if HREF in foot: return foot
    for m in re.finditer(r'<p>([\s\S]*?)</p>', foot):
        body = m.group(1)
        if "<a " not in body: continue
        if "\n" in body:
            ind = re.search(r'\n([ \t]*)<a ', body).group(1)
            close = re.search(r'\n([ \t]*)$', body)
            nb = body.rstrip() + f"\n{ind}·\n{ind}{LINK}" + ("\n" + close.group(1) if close else "")
        else:
            nb = body + " · " + LINK
        return foot[:m.start(1)] + nb + foot[m.end(1):]
    # no link row: add one after the copyright line, same plain <p> style
    m = re.search(r'(\n([ \t]*)<p>©[\s\S]*?</p>)', foot)
    if m: return foot[:m.end()] + f"\n{m.group(2)}<p>{LINK}</p>" + foot[m.end():]
    return foot
def run():
    n = 0
    for path in glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True):
        if "/node_modules/" in path or "/vendor/" in path: continue
        s = open(path, encoding="utf-8").read()
        t = FOOT.sub(lambda m: fix(m.group(0)), s)
        if t != s: open(path, "w", encoding="utf-8").write(t); n += 1
    print(f"footer contact: {n} pages updated")
if __name__ == "__main__": run()
