import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { buildAutonomyEvidence } from "../scripts/build-autonomy-evidence.mjs";
const require = createRequire(import.meta.url),
  M = require("../autonomy-evidence-model.js"),
  V = require("../autonomy-evidence-view.js"),
  data = JSON.parse(fs.readFileSync("data/autonomy-evidence.json"));
test("every claim resolves real source records and dates remain precise", () => {
  assert.equal(M.validate(data), data);
  assert.equal(data.claims.length, 12);
  for (const source of data.sources.filter(s => s.url.startsWith("/"))) {
    const [file, anchor] = source.url.slice(1).split("#");
    assert.ok(fs.existsSync(file));
    if(anchor) assert.ok(fs.readFileSync(file,"utf8").includes('id="'+anchor+'"'),source.url);
  }
  assert.equal(M.validDate("2026-02-30"), false);
  assert.equal(M.validDate("2024-02-29"), true);
  for (const mutation of [
    (d) => (d.claims[0].sources = ["missing"]),
    (d) => (d.sources[0].url = "javascript:alert(1)"),
    (d) => (d.claims[1].id = d.claims[0].id),
    (d) => (d.sources[0].reviewed = "2026-02-30"),
  ]) {
    const d = structuredClone(data);
    mutation(d);
    assert.throws(() => M.validate(d));
  }
});
test("filtering uses source text and categories without changing the record", () => {
  assert.equal(M.filterClaims(data.claims, "safety", "").length, 3);
  assert.equal(
    M.filterClaims(data.claims, "permission", "California").length,
    1,
  );
  assert.equal(M.filterClaims(data.claims, "all", "qwertyuiop").length, 0);
  assert.equal(M.preferences({ topic: "bogus" }).topic, "all");
});
test("event rates validate exposure and never turn blank or invalid data into zero", () => {
  assert.equal(M.eventRate(5, 1000000), 5);
  assert.equal(M.eventRate(20, 10000000), 2);
  assert.equal(M.eventRate(0, 1000000), 0);
  for (const [n, m] of [
    ["", 1],
    [1, ""],
    [-1, 5],
    [1, 0],
    [0.5, 5],
    [Infinity, 5],
    [5, NaN],
  ])
    assert.equal(M.eventRate(n, m), null);
});
test("zero-event model is the exact one-sided Poisson upper bound and tightens with exposure", () => {
  assert.ok(Math.abs(M.zeroBound(1000000) - 2.99573227355399) < 1e-10);
  assert.ok(M.zeroBound(30000000) < M.zeroBound(3000000));
  assert.equal(M.zeroBound(0), null);
  assert.equal(M.zeroBound(1000, 1), null);
  assert.match(V.uncertainty(3), /Illustrative zero-event sample/);
});
test("source text is escaped and the independent SVG diagrams have unique definitions", () => {
  const d = structuredClone(data);
  d.claims[0].title = "<img src=x onerror=alert(1)>";
  assert.ok(V.claim(d, d.claims[0]).includes("&lt;img"));
  assert.ok(!V.claim(d, d.claims[0]).includes("<img src=x"));
  assert.equal(M.safeURL("//evil.test"), false);
  assert.equal(M.safeURL('https://good.test/"bad'), false);
  assert.ok(V.diagram("supervised", "hero").includes('id="hero-road-light"'));
  assert.ok(V.diagram("driverless", "mode").includes('id="mode-road-light"'));
});
test("saved HTML is deterministic, complete without JS and preserves the site shell", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "autonomy-evidence-"));
  try {
    fs.mkdirSync(path.join(dir, "data"));
    fs.copyFileSync("autonomy.html", path.join(dir, "autonomy.html"));
    fs.copyFileSync(
      "data/autonomy-evidence.json",
      path.join(dir, "data/autonomy-evidence.json"),
    );
    fs.writeFileSync(
      path.join(dir, "data/pages.json"),
      JSON.stringify({
        updated: "2026-10-24",
        pages: [
          { url: "/first.html" },
          { url: "/autonomy.html" },
          { url: "/last.html" },
          { url: "/explainers/example.html" },
        ],
      }),
    );
    const before = fs.readFileSync(path.join(dir, "autonomy.html"), "utf8");
    buildAutonomyEvidence(dir);
    const a = fs.readFileSync(path.join(dir, "autonomy.html"), "utf8");
    buildAutonomyEvidence(dir);
    assert.equal(fs.readFileSync(path.join(dir, "autonomy.html"), "utf8"), a);
    assert.equal(
      a.slice(a.indexOf("</main>")),
      before.slice(before.indexOf("</main>")),
    );
    assert.equal((a.match(/<h1\b/g) || []).length, 1);
    const index = JSON.parse(
      fs.readFileSync(path.join(dir, "data/pages.json")),
    );
    assert.equal(index.pages[0].url, "/first.html");
    assert.equal(index.pages.at(-1).url, "/explainers/example.html");
    assert.equal(
      index.pages.filter((page) => page.url.startsWith("/autonomy.html"))
        .length,
      4,
    );
    const indexOnce = fs.readFileSync(
      path.join(dir, "data/pages.json"),
      "utf8",
    );
    buildAutonomyEvidence(dir);
    assert.equal(
      fs.readFileSync(path.join(dir, "data/pages.json"), "utf8"),
      indexOnce,
    );
    for (const c of data.claims)
      assert.ok(a.includes('id="claim-' + c.id + '"'));
    for (const s of data.sources)
      assert.ok(a.includes('id="source-' + s.id + '"'));
    assert.match(a, /not a risk-adjusted comparison/);
    assert.match(a, /complete ascertainment/);
    assert.match(a, /CollectionPage/);
    assert.ok(!a.includes("data-intel-autonomy"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
