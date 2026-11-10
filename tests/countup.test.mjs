import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function load() {
  const ctx = { window: {}, document: { readyState: "complete", querySelectorAll: () => [] }, Date, Math, Number, String, isFinite, RegExp };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync("countup.js", "utf8"), ctx);
  return ctx.SDCountUp;
}

test("only plain whole numbers (commas, optional %) are eligible, so years, units and labels are never touched", () => {
  const { parse } = load();
  assert.deepEqual({ ...parse("11,204") }, { n: 11204, suffix: "", commas: true });
  assert.deepEqual({ ...parse("573") }, { n: 573, suffix: "", commas: false });
  assert.deepEqual({ ...parse("35%") }, { n: 35, suffix: "%", commas: false });
  for (const bad of ["$1.2B", "3.5", "12k", "4d 22:56", "2021 to 2026", "", "—", "10 EU countries recognised", "1,2,3x"]) assert.equal(parse(bad), null, bad);
});

test("formatting matches the saved text at the end, in the same style", () => {
  const { parse, fmt } = load();
  for (const t of ["11,204", "13,096", "573", "35%", "1,872"]) { const p = parse(t); assert.equal(fmt(p.n, p), t); }
  const p = parse("11,204");
  assert.equal(fmt(0, p), "0");
  assert.equal(fmt(5602.4, p), "5,602");
});

test("opt-in only: the script never uses data-count (script.js rewrites those) and pages mark exactly their headline figures", () => {
  const js = fs.readFileSync("countup.js", "utf8");
  assert.doesNotMatch(js, /\[data-count\]/);
  assert.match(js, /\[data-countup\]/);
  const sl = fs.readFileSync("starlink.html", "utf8");
  assert.match(sl, /<span data-countup>[\d,]+<\/span><div>satellites in orbit/);
  assert.ok((sl.match(/<strong data-countup>[\d,]+<\/strong>/g) || []).length >= 4, "key figures");
  for (const f of ["starlink.html", "index.html"]) for (const m of fs.readFileSync(f, "utf8").matchAll(/<(span|strong)[^>]* data-countup[^>]*>([^<]*)</g)) assert.match(m[2], /^\d[\d,]*%?$/, `${f}: ${m[2]}`);
});

test("the script ships in the Starlink bundle; the homepage re-renders its tiles twice on load, so it stays out of there", () => {
  const cfg = JSON.parse(fs.readFileSync("scripts/js-bundles.json", "utf8")).bundles;
  assert.ok(cfg.starlink.includes("countup.js"));
  assert.ok(!cfg.home.includes("countup.js"));
  assert.doesNotMatch(fs.readFileSync("index.html", "utf8"), /data-countup/);
});
