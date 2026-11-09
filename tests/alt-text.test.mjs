import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs"; import { execSync } from "node:child_process";

// Audit 9 Nov 2026: every <img> had an alt; empty alts were decorative (logos, card thumbnails beside
// their own headline, inside aria-hidden links); every inline <svg> sat in an aria-hidden parent or was
// labelled. These checks keep it that way.
const pages = execSync("git ls-files '*.html'", { encoding: "utf8" }).split("\n")
  .filter((f) => f && !/^(astro|social|templates|docs|dev|vendor)\//.test(f));

test("every <img> has an alt attribute", () => {
  const bad = [];
  for (const f of pages) for (const m of fs.readFileSync(f, "utf8").matchAll(/<img\b[^>]*>/g)) if (!/\salt=/.test(m[0])) bad.push(`${f}: ${m[0].slice(0, 80)}`);
  assert.deepEqual(bad, []);
});

test("alt text is never a filename or a placeholder word", () => {
  const bad = [];
  for (const f of pages) for (const m of fs.readFileSync(f, "utf8").matchAll(/<img\b[^>]*\salt="([^"]+)"/g))
    if (/^(image|img|photo|picture|icon|untitled|\S+\.(jpe?g|png|webp|avif|svg|gif))$/i.test(m[1].trim())) bad.push(`${f}: ${m[1]}`);
  assert.deepEqual(bad, []);
});

const VOID = new Set(["img", "br", "hr", "input", "meta", "link", "source", "use", "path", "circle", "rect", "line", "ellipse", "polygon", "polyline", "stop", "wbr"]);
// True when the element at `at` sits inside an open ancestor with aria-hidden="true" (looks back 4 KB).
function insideHidden(h, at) {
  const from = Math.max(0, at - 4000), seg = h.slice(from, at);
  const stack = [];
  for (const t of seg.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
    const [, close, name, attrs, self] = t, n = name.toLowerCase();
    if (close) { const i = stack.map((x) => x.n).lastIndexOf(n); if (i >= 0) stack.length = i; }
    else if (!self && !VOID.has(n)) stack.push({ n, hidden: /aria-hidden="true"/.test(attrs) });
  }
  return stack.some((x) => x.hidden);
}

test("inline SVGs are labelled or hidden from screen readers", () => {
  const bad = [];
  for (const f of pages) {
    const h = fs.readFileSync(f, "utf8");
    for (const m of h.matchAll(/<svg\b[^>]*>/g)) {
      if (/aria-hidden="true"|role="img"|aria-label/.test(m[0])) continue;
      if (insideHidden(h, m.index)) continue;
      bad.push(`${f}: ${m[0].slice(0, 60)}`);
    }
  }
  assert.deepEqual(bad, []);
});
