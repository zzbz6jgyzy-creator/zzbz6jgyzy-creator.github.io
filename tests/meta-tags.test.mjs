import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs"; import path from "node:path";

// Every public page: no "meta-" prefixed names, and the head tags social cards and search rely on.
const pages = [
  ...fs.readdirSync(".").filter((f) => f.endsWith(".html")),
  ...fs.readdirSync("dispatch").filter((f) => f.endsWith(".html")).map((f) => path.join("dispatch", f)),
];

test("no page writes meta tags with a meta- prefix", () => {
  const bad = pages.filter((f) => /<meta\s+(name|property)="meta-|<meta-[a-z]/i.test(fs.readFileSync(f, "utf8")));
  assert.deepEqual(bad, []);
});

test("homepage and an article carry standard title, description, canonical, og:* and twitter:* tags", () => {
  const articles = JSON.parse(fs.readFileSync("data/articles.json", "utf8")).articles;
  const article = articles.find((a) => fs.existsSync(a.url.slice(1))).url.slice(1);
  for (const f of ["index.html", article]) {
    const h = fs.readFileSync(f, "utf8");
    assert.equal((h.match(/<title>[^<]+<\/title>/g) || []).length, 1, f + " title");
    for (const [k, re] of Object.entries({
      description: /<meta\s+name="description"\s+content="[^"]{40,}"/,
      canonical: /<link rel="canonical" href="https:\/\/superchargeddaily\.com\//,
      "og:title": /<meta property="og:title" content="[^"]+"/, "og:description": /<meta property="og:description" content="[^"]+"/,
      "og:url": /<meta property="og:url" content="https:\/\/superchargeddaily\.com\//, "og:image": /<meta property="og:image" content="https:\/\/[^"]+"/,
      "og:type": /<meta property="og:type" content="(website|article)"/, "twitter:card": /<meta name="twitter:card" content="summary_large_image"/,
      "twitter:title": /<meta name="twitter:title" content="[^"]+"/, "twitter:image": /<meta name="twitter:image" content="https:\/\/[^"]+"/,
    })) assert.match(h, re, `${f} ${k}`);
  }
});
