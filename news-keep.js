/* Deterministic keep / dedupe / relevance for the wire.
   A score is not a fact check — it only ranks on-topic headlines.
   Transparent weights live in RANK. Editorial overrides never rewrite titles. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SDNewsKeep = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const FINANCE_RE =
    /\$[\d,.]+\s+invested|could be worth|if you.{0,40}invested|become a millionaire|this one stock to buy|stock to buy now|\bone stock\b|should you buy/i;
  const FINANCE_SOFT =
    /unlock value|growth drivers|shares down \d+%|failed .+ pump|cast[s]? .+ as its next|industry analyst|lowers position|raises position|price target|initiates coverage/i;
  const ACCESSORY_SRC = /basenor|tesla accessories|aftermarket|evbandit|tesmag/i;
  const ACCESSORY_TITLE = /floor mat|mud flap|console organizer|sunshade|cup holder|accessories\b|aftermarket/i;
  const RELEVANT =
    /\b(tesla|spacex|starship|starlink|roadster|optimus|fsd|robotaxi|cybercab|cybertruck|grok|xai|raptor|super heavy|powerwall|megapack|full self.?driving)\b/i;
  const LAUNCH = /\b(falcon|starship|bandwagon|starfall|crs-?\d|ussf-?\d|starlink group)\b/i;
  const LAUNCH_VERB = /\blaunch(?:es|ed|ing)?\b/i;
  const SOFTWARE = /\b(fsd|software|firmware|assisted driving|supervised|2026\.\d+)\b/i;
  const MILESTONE = /\b(roadster|optimus|cybercab|robotaxi|halo)\b/i;
  const REGULATORY = /\b(court|regulator|nhtsa|faa|approval|class action|appeals)\b/i;
  const CLICKBAIT =
    /\bsentient\b|failed .+ pump|you won't believe|forget the tesla|ev sportscars on sale|trillion man|\b380\s*mph\b|autonomous stunts/i;
  const CLUSTER = [
    [/jellyfish/, "jellyfish", 1],
    [/bandwagon-?5|\bstarfall\b/, "bandwagon5", 1],
    [/class action|self-driving claims/, "class-action", 1],
    [/\broadster\b|\bhalo\b/, "roadster", 2],
  ];
  const SPECULATION = /\b(could|might|reportedly|rumou?r|sources say|allegedly|odd new promise|speculation)\b/i;
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
    ["tradingview", 3],
    ["simply wall street", 3],
  ];
  const KIND_SCORE = {
    official: 10,
    launch: 8,
    software: 7,
    milestone: 7,
    regulatory: 6,
    investigation: 5,
    general: 0,
    speculation: -3,
    finance: -6,
    accessory: -10,
  };
  const RANK = {
    note: "Editorial priorities for the homepage wire. Not a fact check. Overrides never rewrite headlines or timestamps.",
    kindScore: KIND_SCORE,
    recency: { h6: 10, h18: 6, h36: 3, h72: 1, staleDays: 7, stalePenalty: 12 },
    boostTitleKeys: [],
    downTitleKeys: [],
  };

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

  const classify = (row) => {
    const title = (row && row.title) || "";
    const source = (row && row.source) || "";
    const blob = `${title} ${source}`;
    if (ACCESSORY_SRC.test(source) && ACCESSORY_TITLE.test(title)) return "accessory";
    if (ACCESSORY_SRC.test(source) && !LAUNCH.test(title) && !SOFTWARE.test(title) && !REGULATORY.test(title) && !MILESTONE.test(title)) {
      return /wait|launch series|production|delivery|recall/.test(title) ? "general" : "accessory";
    }
    if (isFinance(title) || (FINANCE_SOFT.test(title) && /seeking alpha|tradingview|simply wall|motley|benzinga|investorplace|marketbeat/i.test(source))) {
      return "finance";
    }
    if (CLICKBAIT.test(title)) return "speculation";
    if (/tesla,?\s*inc|official tesla|spacex\.com|nasa /i.test(source)) return "official";
    if (LAUNCH.test(title) || (LAUNCH_VERB.test(title) && /spacex|falcon|starship|cape|vandenberg/i.test(blob) && !/launch series/i.test(title))) {
      return "launch";
    }
    if (SOFTWARE.test(title)) return "software";
    if (MILESTONE.test(title) && !FINANCE_SOFT.test(title)) return "milestone";
    if (REGULATORY.test(title)) return "regulatory";
    if (SPECULATION.test(title)) return "speculation";
    return RELEVANT.test(blob) ? "general" : "general";
  };

  const clusterOf = (row) => {
    const title = String((row && row.title) || "").toLowerCase();
    for (let i = 0; i < CLUSTER.length; i++) {
      if (CLUSTER[i][0].test(title)) return { key: CLUSTER[i][1], cap: CLUSTER[i][2] };
    }
    return { key: titleKey(row && row.title), cap: 1 };
  };

  const clusterKey = (row) => clusterOf(row).key;

  const diversify = (rows) => {
    const counts = Object.create(null);
    const out = [];
    rows.forEach((row) => {
      const { key, cap } = clusterOf(row);
      if (!key) {
        out.push(row);
        return;
      }
      counts[key] = counts[key] || 0;
      if (counts[key] >= cap) return;
      counts[key] += 1;
      out.push(row);
    });
    return out;
  };

  const relevanceScore = (row) => {
    const text = `${(row && row.title) || ""} ${(row && row.snippet) || ""} ${(row && row.topic) || ""}`;
    return (RELEVANT.test(text) ? 4 : 0) + trustScore(row && row.source);
  };

  const recencyScore = (row, now) => {
    const t = Date.parse((row && row.published) || "");
    if (!Number.isFinite(t)) return -4;
    const hours = (now - t) / 36e5;
    if (hours < 0) return 0;
    if (hours < 6) return RANK.recency.h6;
    if (hours < 18) return RANK.recency.h18;
    if (hours < 36) return RANK.recency.h36;
    if (hours < 72) return RANK.recency.h72;
    if (hours > RANK.recency.staleDays * 24) return -RANK.recency.stalePenalty;
    return 0;
  };

  const editorialScore = (row) => {
    const key = titleKey(row && row.title);
    if (RANK.boostTitleKeys.includes(key)) return 12;
    if (RANK.downTitleKeys.includes(key)) return -12;
    if (row && row.editorialBoost) return Number(row.editorialBoost) || 0;
    return 0;
  };

  const rankScore = (row, now) => {
    const t = now || Date.now();
    const kind = (row && row.kind) || classify(row);
    let s = relevanceScore(row) + recencyScore(row, t) + (KIND_SCORE[kind] || 0) + editorialScore(row);
    if (CLICKBAIT.test((row && row.title) || "")) s -= 10;
    if (ACCESSORY_SRC.test((row && row.source) || "") && kind !== "accessory") s -= 2;
    return s;
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
      const kind = classify(row);
      const next = { ...row, kind, score: relevanceScore(row) };
      if (SPECULATION.test(next.title || "") || kind === "speculation" || kind === "finance") next.flag = "speculation";
      if (stem) stems.set(stem, next);
      out.push(next);
    });
    return out;
  };

  const forHomepage = (items, hold, now) => {
    const t = now || Date.now();
    return diversify(
      prepare(items, hold)
        .slice()
        .sort((a, b) => rankScore(b, t) - rankScore(a, t) || String(b.published || "").localeCompare(String(a.published || "")))
    );
  };

  return {
    titleKey,
    keepItem,
    isFinance,
    classify,
    relevanceScore,
    recencyScore,
    rankScore,
    prepare,
    forHomepage,
    clusterKey,
    diversify,
    RANK,
  };
});
