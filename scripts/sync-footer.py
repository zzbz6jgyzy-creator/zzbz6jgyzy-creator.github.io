#!/usr/bin/env python3
"""Single source for the site footer. Edit scripts/footer.json, then run:
    python3 scripts/sync-footer.py
Rewrites every <footer class="site-footer"> ... </footer> block. Use --check to fail
(exit 1) if any page is out of sync. Ends the link row with About · Contact me
(the footer_contact.py rule)."""
import glob, html, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "scripts/footer.json"), encoding="utf-8"))
FOOT = re.compile(r'([ \t]*)<footer class="site-footer">[\s\S]*?</footer>')
SKIP = ("node_modules/", "vendor/", "templates/")

def link(item):
    name, href = item[0], item[1]
    kind = item[2] if len(item) > 2 else ""
    if kind == "referral":
        return (f'<a href="{href}" target="_blank" rel="noopener noreferrer">{html.escape(name)}</a> '
                '<span class="ref-note">Referral link: we may earn a reward</span>')
    tag = f'<a href="{href}">{html.escape(name)}</a>'
    # Cloudflare Email Obfuscation rewrites mailto links, then its decoder
    # iterates every <a>. SVG map links expose SVGAnimatedString hrefs, so
    # o.href.indexOf throws. Leave the public contact address in the source.
    if href.startswith("mailto:"):
        return f"<!--email_off-->{tag}<!--/email_off-->"
    return tag

def footer(rel, ind):
    na = CFG["notAffiliatedOverrides"].get(rel, CFG["notAffiliated"])
    i2 = ind + "  "
    main = [x for x in CFG["links"] if (x[2] if len(x) > 2 else "") != "referral"]
    refs = [x for x in CFG["links"] if (x[2] if len(x) > 2 else "") == "referral"]
    row = f"\n{i2}  " + f"\n{i2}  ·\n{i2}  ".join(link(x) for x in main) + f"\n{i2}"
    ref = "".join(f'{i2}<p class="footer-ref">{link(x)}</p>\n' for x in refs)
    return (f'{ind}<footer class="site-footer">\n'
            f'{i2}<a class="footer-lockup" href="/"><img src="/assets/brand/lockup-1b-trim.svg" alt="Supercharged Daily" width="220" height="45" /></a>\n'
            f'{i2}<p>© <span data-year>2026</span> {CFG["identity"]} {na}</p>\n'
            f'{i2}<p class="footer-links">{row}</p>\n'
            + ref +
            f'{i2}<p class="footer-support"><a class="support-button" href="https://buymeacoffee.com/Superchargeddaily" target="_blank" rel="noopener">Support Supercharged Daily ☕</a></p>\n'
            f'{i2}<p class="footer-disclosure">Some links are affiliate links; I may earn a commission at no extra cost to you.</p>\n'
            f'{ind}</footer>')

def run(check=False):
    bad = []
    for path in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(path, ROOT)
        if rel.startswith(SKIP): continue
        s = open(path, encoding="utf-8").read()
        t = FOOT.sub(lambda m: footer(rel, m.group(1)), s)
        if t != s:
            bad.append(rel)
            if not check: open(path, "w", encoding="utf-8").write(t)
    print(("out of sync: " if check else "footer synced: ") + str(len(bad)))
    if check and bad:
        print("\n".join(bad[:20])); sys.exit(1)

if __name__ == "__main__":
    run("--check" in sys.argv)
