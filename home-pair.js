/* Pair an off-site headline with an existing Dispatch story or on-site tracker.
   Does not invent coverage: weak matches fall back to the topic hub. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SDHomePair = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const STOP = new Set(
    "tesla spacex their with from that this will just made more over than into after about have been were they what when your also only says just than than just a the and for are was you not but all can her was one our out day get has him his how its may new now old see two way who been did down each from have here into like many more most only other some such take than them then these through under upon very well were what when where which while will with would about after again".split(
      /\s+/
    )
  );
  const SPECIFIC = new Set([
    "roadster",
    "starlink",
    "starshield",
    "starship",
    "robotaxi",
    "cybercab",
    "merger",
    "grok",
    "falcon",
    "dragon",
    "fsd",
    "powerwall",
    "optimus",
    "halo",
    "shotwell",
    "barclays",
    "starfall",
    "bandwagon",
    "slovakia",
    "assisted",
    "halloween",
    "earnings",
    "unlock",
    "starmind",
    "southwest",
    "reliance",
    "cybertruck",
    "starfall",
    "boca",
    "chica",
  ]);
  const RULES = [
    { re: /\broadster\b|\bhalo\b/, href: "/roadster.html", label: "Roadster hub" },
    { re: /\bmerg(e|er|ing)\b/, href: "/dispatch/tesla-spacex-merger-barclays.html", label: "Merger desk" },
    { re: /\bstarshield\b|\bstarlink\b/, href: "/starlink.html", label: "Starlink tracker" },
    { re: /\bclass action\b|self-driving claims/, href: "/fsd.html", label: "FSD tracker" },
    { re: /\bfsd\b|assisted driving|supervised/, href: "/fsd-europe.html", label: "FSD Europe tracker" },
    { re: /\bjellyfish\b|carolina skies/, href: "/see-the-launch.html", label: "Can I see it?" },
    { re: /\brobotaxi\b|\bcybercab\b/, href: "/cybercab.html", label: "Robotaxi map" },
    { re: /\bstarship\b|\bship catch\b|\braptor\b/, href: "/starship.html", label: "Starship flights" },
    { re: /\bsoftware update|\bfirmware\b|2026\.\d+/, href: "/updates.html", label: "Software updates" },
    { re: /\bpowerwall\b|\bmegapack\b/, href: "/dispatch/powerwall-745mw-record.html", label: "Powerwall desk" },
    { re: /\bearnings\b|\bunlock\b|\b1\.3\s*b(?:illion)?\b/, href: "/dispatch/musk-earnings-week-q3-2026.html", label: "Earnings week" },
    { re: /\bgrok\b|\bai agents?\b/, href: "/grok.html", label: "Grok tutorial" },
    { re: /\boptimus\b/, href: "/promise-tracker.html", label: "Promise tracker" },
    { re: /\bfalcon\b|\bdragon\b|\bbandwagon\b|\bstarfall\b/, href: "/calendar.html", label: "Launch calendar" },
    { re: /\bboca chica\b|\bstarbase\b/, href: "/dispatch/boca-chica-state-park-spacex.html", label: "Boca Chica desk" },
  ];
  const HUB = {
    tesla: { href: "/tesla.html", label: "Tesla desk" },
    spacex: { href: "/spacex.html", label: "SpaceX desk" },
    grok: { href: "/grok.html", label: "Grok tutorial" },
    xai: { href: "/grok.html", label: "Grok tutorial" },
    x: { href: "/dispatch.html", label: "Dispatch" },
  };

  const tokens = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9+.]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w));

  const clipTitle = (s) => {
    const t = String(s || "").replace(/\s+-\s+[^-]+$/, "").trim();
    return t.length > 48 ? t.slice(0, 45).replace(/\s+\S*$/, "") + "…" : t;
  };

  const pairItem = (it, articles, used) => {
    const title = String((it && it.title) || "");
    const hay = title.toLowerCase();
    for (let i = 0; i < RULES.length; i++) {
      if (RULES[i].re.test(hay)) {
        const hit = { href: RULES[i].href, label: RULES[i].label };
        if (used) used.add(hit.href);
        return hit;
      }
    }
    const want = new Set(tokens(title));
    let best = null;
    (articles || []).forEach((a) => {
      if (!a || !a.url || !a.title) return;
      if (used && used.has(a.url)) return;
      const have = tokens(a.title + " " + (a.tag || ""));
      let score = 0;
      let specific = 0;
      have.forEach((w) => {
        if (!want.has(w)) return;
        score += 1;
        if (SPECIFIC.has(w)) specific += 1;
      });
      if (score < 2 && specific < 1) return;
      const rank = specific * 10 + score;
      const date = a.date || "";
      if (!best || rank > best.rank || (rank === best.rank && date > best.date)) {
        best = { href: a.url, label: clipTitle(a.title), rank, date };
      }
    });
    if (best) {
      if (used) used.add(best.href);
      return { href: best.href, label: best.label };
    }
    return HUB[it && it.topic] || HUB.tesla;
  };

  const pairFeed = (items, articles) => {
    const used = new Set();
    return (items || []).map((it) => ({ it, pair: pairItem(it, articles, used) }));
  };

  const itemHtml = (it, pair, esc, meta) => {
    const lab = { tesla: "Tesla", spacex: "SpaceX", grok: "xAI", xai: "xAI", x: "X" };
    const off = String((it && it.title) || "").replace(/\s+-\s+[^-]+$/, "");
    const on = pair
      ? `<a class="hv-f-on" href="${esc(pair.href)}">On this site · ${esc(pair.label)}</a>`
      : "";
    return `<li><a class="hv-f-off" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer"><span class="hv-f-t">${esc(lab[it.topic] || "News")}</span><span class="hv-f-h">${esc(off)}<span class="hv-f-ext" aria-hidden="true"> ↗</span></span><span class="hv-f-m">${esc(meta || "")}</span></a>${on}</li>`;
  };

  return { pairItem, pairFeed, itemHtml, clipTitle };
});
