#!/usr/bin/env python3
"""Single source for the pill menu. Edit scripts/nav.json, then run:
    python3 scripts/sync-nav.py
Rewrites the <div class="pn-wrap"> ... </aside> block in every HTML page that has it.
Use --check to fail (exit 1) if any page is out of sync."""
import json, pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
cfg = json.loads((root / "scripts/nav.json").read_text())
CH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'
BURGER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'
def dd(d):
    rows = []
    for name, href, sub, badge in d["items"]:
        b = f'<span class="pn-badge">{badge}</span>' if badge else ""
        s = f"<small>{sub}</small>" if sub else ""
        rows.append(f'                <a href="{href}">{name}{b}{s}</a>')
    return (f'            <div class="pn-dd"><button type="button" aria-expanded="false" aria-haspopup="true" aria-controls="{d["id"]}">{d["label"]}{CH}</button>\n'
            f'              <div class="pn-panel" id="{d["id"]}">\n' + "\n".join(rows) + "\n              </div></div>")
def links(lst, cls=""):
    c = f' class="{cls}"' if cls else ""
    return [f'            <a{c} href="{h}">{n}</a>' for n, h in lst]
def block(navtag):
    t, m, (d1, d2, d3) = cfg["top"], cfg["mid"], cfg["dropdowns"]
    items = links(t, "pn-link") + [dd(d1)] + links(m, "pn-link") + [dd(d2), dd(d3)] + [f'            <a class="pn-cta" href="{cfg["cta"][1]}">{cfg["cta"][0]}</a>']
    a = lambda lst: "".join(f'<a href="{h}">{n}</a>' for n, h in lst)
    sheet = [a(t + m)]
    for d in (d1, d2, d3):
        sheet += [f'<h3>{d["label"]}</h3>', a([(i[0], i[1]) for i in d["items"]])]
    return f'''<div class="pn-wrap">
        {navtag}
          <a class="pn-logo" href="/" aria-label="Supercharged Daily home"><img src="/assets/brand/icon-1b-mark.svg" alt="" width="26" height="26" /><img class="pn-word" src="/assets/brand/wordmark.svg" alt="" width="114" height="18" /></a>
          <div class="pn-items">
{chr(10).join(items)}
          </div>
          <button class="pn-menu" type="button" aria-expanded="false" aria-controls="pn-sheet" aria-label="Open menu">{BURGER}</button>
          <span class="pn-icon" aria-hidden="true">{BURGER}</span>
        </nav>
      </div>
      <div class="pn-overlay" aria-hidden="true"></div>
      <aside class="pn-sheet" id="pn-sheet" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden="true">
        <div class="pn-sheet-head"><img src="/assets/brand/wordmark.svg" alt="Supercharged Daily" /><button class="pn-close" type="button" aria-label="Close menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
''' + "\n".join("        " + s for s in sheet) + f'''
        <a class="pn-cta" href="{cfg["cta"][1]}">{cfg["cta"][0]}</a>
        <p class="pn-credit">Menu inspired by 21st.dev</p>
      </aside>'''
RX = re.compile(r'<div class="pn-wrap">\s*(<nav class="pn"[^>]*>).*?</aside>', re.S)
check = "--check" in sys.argv; bad = []
for p in sorted(root.rglob("*.html")):
    if ".git" in p.parts: continue
    s = p.read_text()
    n = RX.sub(lambda mo: block(mo.group(1)), s, count=1)
    if n != s:
        bad.append(str(p.relative_to(root)))
        if not check: p.write_text(n)
print(("out of sync: " if check else "updated: ") + str(len(bad)), *bad, sep="\n  ")
sys.exit(1 if check and bad else 0)
