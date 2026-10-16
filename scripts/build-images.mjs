#!/usr/bin/env node
/* Responsive, modern-format images for static pages.
   Run locally (needs sharp: `npm i sharp` anywhere on NODE_PATH):  node scripts/build-images.mjs [--dry]
   For each <img src="/assets/...(jpg|jpeg|png)"> in static HTML it
   - writes AVIF + WebP copies at 480/960/1600w (never upscaled) next to the original
     as <name>-<w>w.avif / .webp. Originals are never modified or removed;
   - wraps the <img> in <picture> with AVIF and WebP <source>s and a sizes hint;
     the <img> keeps the original JPEG/PNG as the fallback src;
   - adds intrinsic width/height if missing and lazy-loads every image after the
     first on the page (unless loading= is already set).
   Skipped: images with data-* attributes or srcset (JS-driven), images already in
   <picture>, the related-stories block, and the files in SKIP below. */
import fs from "fs"; import path from "path"; import { createRequire } from "module";
const require = createRequire(import.meta.url);
let sharp; try { sharp = require("sharp"); } catch { sharp = require(path.join(process.env.SHARP_DIR || "/workspace/audit", "node_modules/sharp")); }
const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const DRY = process.argv.includes("--dry");
const SKIP = [/^index\.html$/, /^wallpapers\.html$/, /^404\.html$/, /^goldcab\.html$/, /roadster/, /^preview\//];
const WIDTHS = [480, 960, 1600];
const SIZES = "(max-width: 760px) 100vw, 1040px";

const files = [];
for (const d of ["", "dispatch", "guides", "reviews"]) {
  const dir = path.join(ROOT, d); if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) if (f.endsWith(".html")) files.push(path.join(d, f));
}
const variants = async (src) => {
  const abs = path.join(ROOT, src); const meta = await sharp(abs).metadata();
  const W = meta.width; let ws = WIDTHS.filter((w) => w < W); ws.push(Math.min(W, 1920)); ws = [...new Set(ws)];
  const base = src.replace(/\.(jpe?g|png)$/i, "");
  const out = { W, H: meta.height, webp: [], avif: [] };
  for (const w of ws) {
    for (const fmt of ["webp", "avif"]) {
      const rel = `${base}-${w}w.${fmt}`; const o = path.join(ROOT, rel);
      if (!DRY && (!fs.existsSync(o) || fs.statSync(o).mtimeMs < fs.statSync(abs).mtimeMs)) {
        const p = sharp(abs).resize({ width: w, withoutEnlargement: true });
        await (fmt === "webp" ? p.webp({ quality: 78 }) : p.avif({ quality: 50, effort: 4 })).toFile(o);
      }
      out[fmt].push(`/${rel} ${w}w`);
    }
  }
  return out;
};
const cache = new Map();
let changed = 0, wrapped = 0;
for (const rel of files) {
  if (SKIP.some((r) => r.test(rel))) continue;
  const p = path.join(ROOT, rel); let s = fs.readFileSync(p, "utf8"); const orig = s;
  const relStart = s.indexOf("<!--related:start-->"), relEnd = s.indexOf("<!--related:end-->");
  let first = true; let out = ""; let last = 0;
  const rx = /<img\b[^>]*>/g; let m;
  while ((m = rx.exec(s))) {
    const tag = m[0]; const at = m.index;
    const src = (tag.match(/\ssrc="(\/assets\/[^"]+\.(?:jpe?g|png))"/i) || [])[1];
    const inRelated = relStart >= 0 && at > relStart && at < relEnd;
    // Already inside a <picture>? (look back to the last <picture> opener; <source> lists can be long)
    const before = s.slice(0, at); const po = before.lastIndexOf("<picture");
    const inPicture = po >= 0 && before.indexOf("</picture>", po) < 0;
    if (!src || inRelated || inPicture || /\sdata-[\w-]+=/.test(tag) || /\ssrcset=/.test(tag) || !fs.existsSync(path.join(ROOT, src))) {
      if (/\ssrc="/.test(tag) && !/\.svg"/.test(tag)) first = false;
      continue;
    }
    if (!cache.has(src)) cache.set(src, await variants(src.slice(1)));
    const v = cache.get(src);
    let t = tag;
    if (!/\swidth=/.test(t) && !/\sheight=/.test(t)) t = t.replace(/<img\b/, `<img width="${v.W}" height="${v.H}"`);
    if (!/\sloading=/.test(t)) t = t.replace(/<img\b/, first ? `<img decoding="async"` : `<img loading="lazy" decoding="async"`);
    first = false;
    const pic = `<picture><source type="image/avif" srcset="${v.avif.join(", ")}" sizes="${SIZES}" /><source type="image/webp" srcset="${v.webp.join(", ")}" sizes="${SIZES}" />${t}</picture>`;
    out += s.slice(last, at) + pic; last = at + tag.length; wrapped++;
  }
  s = out + s.slice(last);
  if (s !== orig) { changed++; if (!DRY) fs.writeFileSync(p, s); }
}
console.log(`pages changed ${changed}, images wrapped ${wrapped}, sources ${cache.size}`);
