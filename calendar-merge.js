/* Shared launch identity + merge for calendar, see-the-launch, and homepage countdowns.
   Stable IDs win. launchKey strips vehicle noise. Fallback is start±3h + pad + tokens.
   Distinct missions that share a pad or a similar name stay separate. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SDCalendarMerge = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const WINDOW_MS = 3 * 36e5;

  function parseStart(iso) {
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : NaN;
  }

  function launchKey(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/\([^)]*\)/g, "")
      .replace(/falcon\s*(9|heavy)(\s+block\s*5)?/g, "")
      .replace(/\b(rideshare|mission|launch|demo)\b/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  function isDocking(title) {
    return /\bdock(ed|ing)?\b/i.test(String(title || ""));
  }

  function starlinkGroup(title) {
    const m = String(title || "").match(/starlink(?:\s+group)?\s*(\d+)\s*[-–]\s*(\d+)/i);
    return m ? `${m[1]}-${m[2]}` : "";
  }

  function starshipFlight(title) {
    const m = String(title || "").match(/(?:starship(?:\s+flight)?|flight)\s*(\d+)/i);
    return m ? m[1] : "";
  }

  function crsNum(title) {
    const m = String(title || "").match(/crs(?:-2)?(?:\s*spx)?[-\s]*(\d+)/i);
    return m ? m[1] : "";
  }

  function bandwagonNum(title) {
    const m = String(title || "").match(/bandwagon[-\s]*(\d+)/i);
    return m ? m[1] : "";
  }

  function ussfNum(title) {
    const m = String(title || "").match(/ussf[-\s]*(\d+)/i);
    return m ? m[1] : "";
  }

  function missionConflict(a, b) {
    const checks = [starlinkGroup, starshipFlight, crsNum, bandwagonNum, ussfNum];
    for (let i = 0; i < checks.length; i++) {
      const x = checks[i](a.title);
      const y = checks[i](b.title);
      if (x && y && x !== y) return true;
    }
    return isDocking(a.title) !== isDocking(b.title);
  }

  function idsOf(e) {
    return [e.id, e.ll2Id, e.providerId].filter(Boolean).map(String);
  }

  function aliasesOf(e) {
    const out = new Set(idsOf(e));
    const bw = bandwagonNum(e && e.title);
    if (bw) {
      out.add(`bandwagon-${bw}`);
      out.add(`f9-bandwagon${bw}`);
      out.add(`ll-bandwagon-${bw}`);
    }
    const sf = starshipFlight(e && e.title);
    if (sf) {
      out.add(`starship-f${sf}`);
      out.add(`starship-flight-${sf}`);
    }
    const us = ussfNum(e && e.title);
    if (us) {
      out.add(`ussf-${us}`);
      out.add(`f9-ussf${us}`);
      out.add(`ll-ussf-${us}`);
    }
    return [...out];
  }

  function isFlown(status) {
    return /success|failure|partial|in.?flight|^live$/.test(String(status || "").toLowerCase());
  }

  function pickStart(curated, live) {
    const liveStart = parseStart(live && live.start);
    const curStart = parseStart(curated && curated.start);
    if (isFlown(live && live.status) && Number.isFinite(liveStart)) return live.start;
    if (!Number.isFinite(liveStart)) return (curated && curated.start) || (live && live.start);
    if (!Number.isFinite(curStart)) return live.start;
    if (Math.abs(liveStart - curStart) <= WINDOW_MS) {
      return curated.source === "fallback" ? live.start || curated.start : curated.start || live.start;
    }
    return liveStart > curStart ? live.start : curated.start;
  }

  function padNorm(e) {
    const s = `${e.where || ""} ${e.pad || ""} ${e.location || ""}`.toLowerCase();
    if (/slc-?40|cape canaveral/.test(s)) return "slc40";
    if (/39a|kennedy/.test(s)) return "lc39a";
    if (/slc-?4e|vandenberg/.test(s)) return "slc4e";
    if (/starbase|pad 2|boca chica/.test(s)) return "starbase";
    return s.replace(/[^a-z0-9]+/g, "").slice(0, 24);
  }

  function tokens(title) {
    return new Set(
      String(title || "")
        .toLowerCase()
        .replace(/falcon\s*(9|heavy)(\s+block\s*5)?/g, "")
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 3 && !/^(rideshare|mission|launch|demo|block|the|and|with)$/.test(w))
    );
  }

  function tokenOverlap(a, b) {
    const A = tokens(a.title);
    const B = tokens(b.title);
    let n = 0;
    A.forEach((w) => {
      if (B.has(w)) n += 1;
    });
    return n;
  }

  function sameLaunch(a, b) {
    if (!a || !b) return false;
    if (missionConflict(a, b)) return false;

    const idsA = aliasesOf(a);
    const idsB = aliasesOf(b);
    if (idsA.some((id) => idsB.includes(id))) return true;

    const ka = launchKey(a.title);
    const kb = launchKey(b.title);
    if (ka && kb && ka === kb) return true;

    const ta = parseStart(a.start);
    const tb = parseStart(b.start);
    if (!Number.isFinite(ta) || !Number.isFinite(tb)) return false;
    if (Math.abs(ta - tb) > WINDOW_MS) return false;

    const pa = padNorm(a);
    const pb = padNorm(b);
    if (pa && pb && pa !== pb) return false;

    return tokenOverlap(a, b) >= 1;
  }

  function blend(curated, live) {
    const liveStatus = String(live.status || "").toLowerCase();
    const preferLiveStatus = /tbd|hold|in.?flight|live/.test(liveStatus);
    const start = pickStart(curated, live);
    return {
      ...live,
      id: curated.id || live.id,
      ll2Id: live.ll2Id || curated.ll2Id,
      title: curated.title || live.title,
      start,
      end: curated.end || live.end,
      href: curated.href != null && curated.href !== "" ? curated.href : live.href,
      note: curated.note || live.note,
      where: curated.where || live.where,
      status: preferLiveStatus ? live.status : curated.status || live.status,
      precision: curated.precision || live.precision,
      featured: curated.featured != null ? curated.featured : live.featured,
      image: curated.image || live.image,
      imageCredit: curated.imageCredit || live.imageCredit,
      source: curated.source === "fallback" ? live.source || "ll2" : "curated",
    };
  }

  function mergeEvents(curated, liveMapped) {
    const live = liveMapped || [];
    const used = new Set();
    const all = curated || [];
    const prefer = all.filter((e) => e.source !== "fallback");

    const mergedLive = live.map((l) => {
      const c =
        prefer.find((e) => !used.has(e.id) && sameLaunch(e, l)) ||
        all.find((e) => !used.has(e.id) && sameLaunch(e, l));
      if (!c) return l;
      used.add(c.id);
      return blend(c, l);
    });

    const extra = all.filter((e) => {
      if (used.has(e.id)) return false;
      if (live.some((l) => sameLaunch(e, l))) return false;
      if (e.id === "starship-f15" && live.some((l) => /starship.*(?:flight\s*)?15|\bflight 15\b/i.test(l.title))) {
        return false;
      }
      return true;
    });

    return extra.concat(mergedLive).sort((a, b) => {
      const da = parseStart(a.start) - parseStart(b.start);
      if (Number.isFinite(da) && da) return da;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }

  function uniqueByLaunch(rows) {
    const out = [];
    (rows || []).forEach((row) => {
      if (!row) return;
      if (out.some((keep) => sameLaunch(keep, row))) return;
      out.push(row);
    });
    return out;
  }

  return {
    WINDOW_MS,
    parseStart,
    launchKey,
    sameLaunch,
    aliasesOf,
    pickStart,
    mergeEvents,
    uniqueByLaunch,
    starlinkGroup,
    starshipFlight,
    crsNum,
    bandwagonNum,
    isDocking,
  };
});
