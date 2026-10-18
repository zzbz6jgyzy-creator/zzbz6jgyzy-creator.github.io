#!/usr/bin/env node
/* Build display-sized WebP copies of wallpaper masters.
   - thumbs/            phone-shaped 480w (grid + carousel)
   - thumbs-desktop/    landscape 960w (wide carousel)
   - previews/          1280w desktop + 720w phone (lightbox — not the 4K masters)
   Originals are never modified. Idempotent: skip when the WebP is newer than the source.
   Run: node scripts/build-wallpaper-thumbs.mjs
*/
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
let sharp;
try { sharp = require("sharp"); } catch {
  sharp = require(path.join(process.env.SHARP_DIR || "/workspace/audit", "node_modules/sharp"));
}

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const DIR = path.join(ROOT, "assets", "wallpapers");
const Q = 78;

function slugOf(name) {
  return name.replace(/-desktop\.jpe?g$/i, "").replace(/-phone\.jpe?g$/i, "").replace(/\.jpe?g$/i, "");
}

async function write(src, dest, width) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) return false;
  await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: Q }).toFile(dest);
  return true;
}

const files = fs.readdirSync(DIR).filter((f) => /\.jpe?g$/i.test(f) && !f.startsWith("og-"));
const bySlug = {};
for (const f of files) {
  const slug = slugOf(f);
  const kind = /-phone\.jpe?g$/i.test(f) ? "phone" : /-desktop\.jpe?g$/i.test(f) ? "desktop" : "other";
  if (!bySlug[slug]) bySlug[slug] = {};
  bySlug[slug][kind] = path.join(DIR, f);
}

let n = 0;
for (const [slug, parts] of Object.entries(bySlug)) {
  const phone = parts.phone || parts.desktop;
  const desk = parts.desktop || parts.phone;
  if (phone && await write(phone, path.join(DIR, "thumbs", slug + ".webp"), 480)) n++;
  if (desk && await write(desk, path.join(DIR, "thumbs-desktop", slug + ".webp"), 960)) n++;
  if (desk && await write(desk, path.join(DIR, "previews", slug + ".webp"), 1280)) n++;
  if (phone && await write(phone, path.join(DIR, "previews", slug + "-phone.webp"), 720)) n++;
}
console.log("wallpaper variants written", n, "slugs", Object.keys(bySlug).length);
