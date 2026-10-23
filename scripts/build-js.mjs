#!/usr/bin/env node
// Concatenate + minify first-party IIFE scripts into hashed bundles.
// Sources stay at the repo root; GitHub Pages serves assets/js/*.bundle.[hash].js.
// Uses esbuild as a minifier (no ESM rewrite) so UMD files keep window + module.exports.
import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CFG = JSON.parse(readFileSync(join(ROOT, "scripts/js-bundles.json"), "utf8"));
const OUT = join(ROOT, CFG.outDir);
const require = createRequire(import.meta.url);

function loadEsbuild() {
  try {
    return require("esbuild");
  } catch {
    execFileSync("npm", ["i", "--no-save", "--no-package-lock", "esbuild@0.25.12"], {
      cwd: ROOT,
      stdio: "inherit",
    });
    return require(join(ROOT, "node_modules/esbuild"));
  }
}

function concat(files) {
  return files
    .map((rel) => {
      const path = join(ROOT, rel);
      if (!existsSync(path)) throw new Error("missing bundle source: " + rel);
      return "/* " + rel + " */\n" + readFileSync(path, "utf8");
    })
    .join("\n;\n");
}

const esbuild = loadEsbuild();
mkdirSync(OUT, { recursive: true });

const stale = readdirSync(OUT).filter((f) => /\.bundle\.[a-f0-9]+\.js$/.test(f) || f === "manifest.json");
for (const f of stale) unlinkSync(join(OUT, f));

// The manifest describes content. A wall-clock timestamp makes identical builds
// disagree when the homepage and bundle workflows rebase onto each other.
const manifest = { bundles: {} };

for (const [name, files] of Object.entries(CFG.bundles)) {
  const source = concat(files);
  const tmp = join(OUT, name + ".tmp.js");
  writeFileSync(tmp, source);
  const result = await esbuild.build({
    entryPoints: [tmp],
    outfile: join(OUT, name + ".min.js"),
    minify: true,
    bundle: false,
    legalComments: "none",
    target: ["es2018"],
    write: true,
  });
  if (result.errors?.length) throw new Error(name + " esbuild: " + JSON.stringify(result.errors));
  const min = readFileSync(join(OUT, name + ".min.js"));
  const hash = createHash("sha256").update(min).digest("hex").slice(0, 10);
  const file = `${name}.bundle.${hash}.js`;
  writeFileSync(join(OUT, file), min);
  unlinkSync(tmp);
  unlinkSync(join(OUT, name + ".min.js"));
  manifest.bundles[name] = {
    file: `/${CFG.outDir}/${file}`,
    bytes: min.length,
    sources: files,
  };
  console.log(name, file, min.length + "B", files.length + " sources");
}

writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("wrote", join(CFG.outDir, "manifest.json"));
