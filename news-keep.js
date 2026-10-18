/* Deterministic keep / dedupe / relevance for the wire.
   A score is not a fact check — it only ranks on-topic headlines. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SDNewsKeep = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const FINANCE_RE =
    /\$[\d,.]+\s+invested|could be worth|if you.{0,40}invested|become a millionaire|this one stock to buy|stock to buy now|\bone stock\b|should you buy/i;
  const RELEVANT =
    /\b(tesla|spacex|starship|starlink|roadster|optimus|fsd|robotaxi|cybercab|cybertruck|grok|xai|raptor|super heavy|powerwall|megapack|full self.?driving)\b/i;
  const SPECULATION = /\b(could|might|reportedly|rumou?r|sources say|allegedly|odd new promise)\b/i;
  const TRUST_BOOST = [
    ["tesla", 8],
    ["spacex", 8],
    ["nasa", 6],
    ["reuters", 5],
    ["associated press", 5],
    ["ap news", 5],
    ["bloomberg", 4],
    ["wall street journal", 4],
    ["wsj", 4],
    ["cnbc", 3],
    ["bbc", 3],
    ["the verge", 3],
    ["arstechnica", 3],
    ["ars technica", 3],
    ["axios", 3],
    ["teslarati", 2],
    ["not a tesla app", 2],
  ];
  const TRUST_DOWN = [
    ["motley fool", 6],
    ["seeking alpha", 4],
    ["investorplace", 5],
    ["benzinga", 3],
  ];

  const titleKey = (title) => String(title || "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 80);
  const isElectrek = (row) => /electrek/i.test(`${row && row.url ? row.url : ""} ${row && row.source ? row.source : ""}`);
  const isFinance = (title) => FINANCE_RE.test(String(title || ""));
  const keepItem = (row) => !!(row && !isElectrek(row) && !isFinance(row.title));

  const trustScore = (source) => {
    const text = String(source || "").toLowerCase();
    let score = 0;
    TRUST_BOOST.forEach(([name, pts]) => { if (text.includes(name)) score += pts; });
    TRUST_DOWN.forEach(([name, pts]) => { if (text.includes(name)) score -= pts; });
    return score;
  };

  const relevanceScore = (row) => {
    const text = `${(row && row.title) || ""} ${(row && row.snippet) || ""} ${(row && row.topic) || ""}`;
    return (RELEVANT.test(text) ? 4 : 0) + trustScore(row && row.source);
  };

  const rankScore = (row, now) => {
    const t = Date.parse((row && row.published) || "");
    const hours = Number.isFinite(t) ? (now - t) / 36e5 : 99;
    const recency = hours < 6 ? 8 : hours < 18 ? 4 : 0;
    return (row && row.score != null ? row.score : relevanceScore(row)) + recency;
  };

  const prepare = (items, hold) => {
    const holdUrls = new Set(((hold && hold.urls) || []).map((u) => String(u).replace(/\/$/, "")));
    const holdKeys = new Set((hold && hold.titleKeys) || []);
    const kept = (items || []).filter((row) => {
      if (!keepItem(row)) return false;
      const url = String((row && row.url) || "").replace(/\/$/, "");
      if (url && holdUrls.has(url)) return false;
      const key = titleKey(row && row.title);
      return !(key && holdKeys.has(key));
    });
    kept.sort((a, b) => String((b && b.published) || "").localeCompare(String((a && a.published) || "")));
    const seen = new Set();
    const stems = new Map();
    const out = [];
    kept.forEach((row) => {
      const key = titleKey(row && row.title);
      if (!key || seen.has(key)) return;
      seen.add(key);
      const stem = key.slice(0, 40);
      if (stem && stems.has(stem)) {
        const primary = stems.get(stem);
        primary.related = (primary.related || []).concat([{ source: row.source || "", url: row.url || "" }]);
        return;
      }
      const next = { ...row, score: relevanceScore(row) };
      if (SPECULATION.test(next.title || "")) next.flag = "speculation";
      if (stem) stems.set(stem, next);
      out.push(next);
    });
    return out;
  };

  const forHomepage = (items, hold, now) => {
    const t = now || Date.now();
    return prepare(items, hold)
      .slice()
      .sort((a, b) => rankScore(b, t) - rankScore(a, t) || String(b.published || "").localeCompare(String(a.published || "")));
  };

  return { titleKey, keepItem, isFinance, relevanceScore, prepare, forHomepage, rankScore };
});
