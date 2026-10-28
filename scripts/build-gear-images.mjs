#!/usr/bin/env node
/* Responsive AVIF + WebP copies of the Gear page's category photos (the originals are single WebP files).
   Run locally when a source photo changes (needs sharp: SHARP_DIR=/path/with/node_modules node scripts/build-gear-images.mjs).
   Output: assets/gear/<name>-<w>w.avif|webp. Sources are never modified. Widths never exceed the source. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require(path.join(process.env.SHARP_DIR || "/home/user/tools/js", "node_modules/sharp"));
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = {
  cabin: "assets/ctx-media/cabin.webp",
  display: "assets/ctx-media/display.webp",
  vault: "assets/ctx-media/vault.webp",
  interior: "assets/m3x-media/interior.webp",
  body: "assets/m3x-media/body.webp",
  wheels: "assets/m3x-media/wheels.webp",
};
fs.mkdirSync(path.join(ROOT, "assets/gear"), { recursive: true });
for (const [name, rel] of Object.entries(SRC)) {
  const meta = await sharp(path.join(ROOT, rel)).metadata();
  const widths = [...new Set([480, 960, meta.width].filter((w) => w <= meta.width))];
  for (const w of widths) for (const fmt of ["avif", "webp"]) {
    const out = path.join(ROOT, `assets/gear/${name}-${w}w.${fmt}`);
    const p = sharp(path.join(ROOT, rel)).resize({ width: w, withoutEnlargement: true });
    await (fmt === "avif" ? p.avif({ quality: 52, effort: 4 }) : p.webp({ quality: 78 })).toFile(out);
  }
  console.log(name, meta.width + "x" + meta.height, widths.join(","));
}
