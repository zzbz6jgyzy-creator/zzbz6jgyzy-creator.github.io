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

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")

def is_group(it):
    return isinstance(it, dict) and "items" in it

def link_html(it, indent="                "):
    name, href, sub, badge = (list(it) + ["", ""])[:4]
    b = f'<span class="pn-badge">{badge}</span>' if badge else ""
    s = f"<small>{sub}</small>" if sub else ""
    return f'{indent}<a href="{href}">{name}{b}{s}</a>'

def nest_html(parent_id, group):
    gid = f'{parent_id}-{slug(group["label"])}'
    kids = "\n".join(link_html(it, indent="                  ") for it in group["items"])
    return (
        f'                <div class="pn-nest">\n'
        f'                  <button type="button" class="pn-nest-t" aria-expanded="false" aria-haspopup="true" aria-controls="{gid}">{group["label"]}{CH}</button>\n'
        f'                  <div class="pn-nest-panel" id="{gid}" hidden>\n'
        f'{kids}\n'
        f'                  </div>\n'
        f'                </div>'
    )

def dd(d):
    rows = []
    for it in d["items"]:
        rows.append(nest_html(d["id"], it) if is_group(it) else link_html(it))
    wide = " pn-wide" if d.get("wide") else ""
    return (f'            <div class="pn-dd"><button type="button" aria-expanded="false" aria-haspopup="true" aria-controls="{d["id"]}">{d["label"]}{CH}</button>\n'
            f'              <div class="pn-panel{wide}" id="{d["id"]}">\n' + "\n".join(rows) + "\n              </div></div>")

def links(lst, cls=""):
    c = f' class="{cls}"' if cls else ""
    return [f'            <a{c} href="{h}">{n}</a>' for n, h in lst]

def sheet_bits(d):
    bits = [f'<h3>{d["label"]}</h3>']
    for it in d["items"]:
        if is_group(it):
            bits.append(f'<h4>{it["label"]}</h4>')
            bits.append("".join(f'<a href="{h}">{n}</a>' for n, h, *_ in it["items"]))
        else:
            bits.append(f'<a href="{it[1]}">{it[0]}</a>')
    return bits

def block(navtag):
    t, m, ds = cfg.get("top", []), cfg.get("mid", []), cfg["dropdowns"]
    items = links(t, "pn-link") + [dd(d) for d in ds] + links(m, "pn-link") + [f'            <a class="pn-cta" href="{cfg["cta"][1]}">{cfg["cta"][0]}</a>']
    a = lambda lst: "".join(f'<a href="{h}">{n}</a>' for n, h in lst)
    top_has_home = any((n or "").lower() == "home" or h in ("/", "/index.html") for n, h in t)
    sheet = [a((t if top_has_home else [("Home", "/")] + t) + m)]
    for d in ds:
        sheet += sheet_bits(d)
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
      <aside class="pn-sheet" id="pn-sheet" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden="true" inert>
        <div class="pn-sheet-head"><img src="/assets/brand/wordmark.svg" alt="Supercharged Daily" width="140" height="22" /><button class="pn-close" type="button" aria-label="Close menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
''' + "\n".join("        " + s for s in sheet) + f'''
        <a class="pn-cta" href="{cfg["cta"][1]}">{cfg["cta"][0]}</a>
        <!-- Menu inspired by 21st.dev -->
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
