/* Supercharged Intelligence Engine — deterministic core.
   Validates facts, detects changes, never invents citations.
   Evidence is a labelled state, not a numeric confidence score. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SDIntel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const EVIDENCE = [
    "officially_confirmed",
    "independently_corroborated",
    "company_claim",
    "reported_unconfirmed",
    "estimated",
    "historical",
    "superseded",
    "disputed",
  ];

  const EVIDENCE_LABEL = {
    officially_confirmed: "Officially confirmed",
    independently_corroborated: "Independently corroborated",
    company_claim: "Company claim",
    reported_unconfirmed: "Reported, unconfirmed",
    estimated: "Estimated",
    historical: "Historical",
    superseded: "Superseded",
    disputed: "Disputed",
  };

  const TOPICS = [
    { id: "starship", label: "Starship", href: "/starship.html" },
    { id: "spacex-launches", label: "SpaceX launches", href: "/calendar.html" },
    { id: "tesla-software", label: "Tesla software", href: "/updates.html" },
    { id: "fsd", label: "FSD", href: "/fsd-europe.html" },
    { id: "robotaxi", label: "Robotaxi", href: "/cybercab.html" },
    { id: "roadster", label: "Roadster", href: "/roadster.html" },
    { id: "optimus", label: "Optimus", href: "/optimus.html" },
    { id: "starlink", label: "Starlink", href: "/starlink.html" },
    { id: "promises", label: "Promises", href: "/promise-tracker.html" },
    { id: "production", label: "Production", href: "/production.html" },
  ];

  const TRACKERS = {
    starship: { id: "starship", label: "Starship Mission Control", href: "/starship.html", topic: "starship" },
    launches: { id: "launches", label: "Launch calendar", href: "/calendar.html", topic: "spacex-launches" },
    software: { id: "software", label: "Software Update Tracker", href: "/updates.html", topic: "tesla-software" },
    fsd: { id: "fsd", label: "FSD Europe", href: "/fsd-europe.html", topic: "fsd" },
    robotaxi: { id: "robotaxi", label: "Cybercab tracker", href: "/cybercab.html", topic: "robotaxi" },
    roadster: { id: "roadster", label: "Roadster hub", href: "/roadster.html", topic: "roadster" },
    optimus: { id: "optimus", label: "Optimus Evolution Lab", href: "/optimus.html", topic: "optimus" },
    starlink: { id: "starlink", label: "Starlink tracker", href: "/starlink.html", topic: "starlink" },
    promises: { id: "promises", label: "Promise Tracker", href: "/promise-tracker.html", topic: "promises" },
    production: { id: "production", label: "Production & deliveries", href: "/production.html", topic: "production" },
    mytesla: { id: "mytesla", label: "My Tesla", href: "/my-tesla.html", topic: "tesla-software" },
    autonomy: { id: "autonomy", label: "FSD & Robotaxi evidence", href: "/autonomy.html", topic: "fsd" },
    daily: { id: "daily", label: "Your Supercharged Daily", href: "/daily.html", topic: "promises" },
  };

  const FOLLOW_KEY = "sd-follow-v1";
  const VISIT_KEY = "sd-intel-visit-v1";
  const ALERT_KEY = "sd-alerts-v1";

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function iso(value) {
    if (!value) return "";
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : "";
    const t = Date.parse(value);
    return Number.isFinite(t) ? new Date(t).toISOString() : "";
  }

  function dayStamp(value) {
    const s = iso(value);
    return s ? s.slice(0, 10) : "";
  }

  function evidenceOk(state) {
    return EVIDENCE.indexOf(state) >= 0;
  }

  function factId(topic, field) {
    return topic + ":" + field;
  }

  function changeId(c) {
    return [c.type || "changed", c.factId || "", c.at || "", c.next != null ? String(c.next) : ""].join("|");
  }

  function makeFact(partial) {
    const f = {
      id: partial.id || factId(partial.topic, partial.field),
      topic: partial.topic,
      tracker: partial.tracker,
      field: partial.field,
      value: partial.value == null ? "" : String(partial.value),
      label: partial.label || partial.field,
      at: iso(partial.at) || "",
      evidence: partial.evidence,
      source: partial.source || "",
      sourceUrl: partial.sourceUrl || "",
      href: partial.href || (TRACKERS[partial.tracker] && TRACKERS[partial.tracker].href) || "",
      summary: partial.summary || "",
    };
    return f;
  }

  function validateFact(f) {
    const errors = [];
    if (!f || typeof f !== "object") return ["fact is not an object"];
    if (!f.id) errors.push("missing id");
    if (!f.topic) errors.push("missing topic");
    if (!f.field) errors.push("missing field");
    if (f.value == null || f.value === "") errors.push("missing value");
    if (!evidenceOk(f.evidence)) errors.push("invalid evidence");
    if (!f.source) errors.push("missing source");
    if (f.at && !iso(f.at)) errors.push("invalid at");
    return errors;
  }

  function validateChange(c) {
    const errors = [];
    if (!c || typeof c !== "object") return ["change is not an object"];
    if (!c.id) errors.push("missing id");
    if (!c.factId) errors.push("missing factId");
    if (!c.topic) errors.push("missing topic");
    if (!c.summary) errors.push("missing summary");
    if (!evidenceOk(c.evidence)) errors.push("invalid evidence");
    if (!c.source) errors.push("missing source");
    if (c.at && !iso(c.at)) errors.push("invalid at");
    if (c.previous === c.next && c.type === "changed") errors.push("previous equals next");
    return errors;
  }

  function newestSoftware(updates) {
    const vs = ((updates && updates.versions) || []).filter((x) => x && x.count > 0);
    if (!vs.length) return null;
    return [...vs].sort((a, b) => String(b.firstSeen || "").localeCompare(String(a.firstSeen || "")))[0];
  }

  function commonSoftware(updates) {
    const vs = ((updates && updates.versions) || []).filter((x) => x && x.count > 0);
    if (!vs.length) return null;
    return [...vs].sort((a, b) => (b.count || 0) - (a.count || 0))[0];
  }

  function eventStart(e) {
    if (!e) return "";
    if (e.start) return iso(e.start);
    if (e.date) return iso(e.date + "T" + (e.time || "00:00") + ":00" + (e.tz || "Z"));
    return "";
  }

  function collectFacts(src) {
    const facts = [];
    const events = (src.events && src.events.events) || {};
    Object.keys(events).forEach((id) => {
      const e = events[id];
      const start = eventStart(e);
      if (start) {
        facts.push(makeFact({
          topic: /starship/i.test(id) ? "starship" : /tesla|roadster|earnings/i.test(id) ? "production" : "spacex-launches",
          tracker: /starship/i.test(id) ? "starship" : "launches",
          field: "event:" + id,
          value: start + "|" + (e.status || ""),
          label: e.title || id,
          at: src.events.updated || start,
          evidence: /official|ir\.|sec\.gov|spacex\.com|tesla\.com/i.test(JSON.stringify(e.source || e.sources || ""))
            ? "officially_confirmed"
            : e.status === "net"
              ? "estimated"
              : "independently_corroborated",
          source: e.source || (Array.isArray(e.sources) ? e.sources[0] : "") || "data/events.json",
          sourceUrl: typeof e.source === "string" && /^https:\/\//.test(e.source) ? e.source : "",
          href: e.href || "/calendar.html",
          summary: e.summary || "",
        }));
      }
    });

    const sw = newestSoftware(src.updates);
    if (sw) {
      facts.push(makeFact({
        topic: "tesla-software",
        tracker: "software",
        field: "newest-reporting",
        value: sw.id,
        label: "Newest reporting build",
        at: src.updates.updated || sw.firstSeen,
        evidence: "reported_unconfirmed",
        source: "Teslascope sample (" + (src.updates.fleet || sw.fleet || "?") + " cars)",
        sourceUrl: src.updates.sourceUrl || "https://teslascope.com/software",
        href: "/updates.html",
        summary: "A version appearing in a public sample is not the same as Tesla offering it to a given car.",
      }));
    }
    const common = commonSoftware(src.updates);
    if (common) {
      facts.push(makeFact({
        topic: "tesla-software",
        tracker: "software",
        field: "most-common",
        value: common.id + "@" + common.percent,
        label: "Most common sample build",
        at: src.updates.updated,
        evidence: "reported_unconfirmed",
        source: "Teslascope sample",
        sourceUrl: src.updates.sourceUrl || "https://teslascope.com/software",
        href: "/updates.html",
      }));
    }

    const fsd = src.fsdEurope;
    if (fsd && Array.isArray(fsd.countries)) {
      const ok = fsd.countries.filter((c) => c.status === "approved");
      facts.push(makeFact({
        topic: "fsd",
        tracker: "fsd",
        field: "eu-approved",
        value: String(ok.length),
        label: "EU states recognising RDW approval",
        at: fsd.updated,
        evidence: "independently_corroborated",
        source: "FSD Europe tracker (national ministry / RDW sources)",
        href: "/fsd-europe.html",
      }));
    }

    const sl = src.starlinkLive;
    if (sl && sl.totals && sl.totals.inOrbit) {
      facts.push(makeFact({
        topic: "starlink",
        tracker: "starlink",
        field: "in-orbit",
        value: String(sl.totals.inOrbit),
        label: "Starlink in orbit",
        at: sl.updated,
        evidence: "independently_corroborated",
        source: "Jonathan McDowell Starlink statistics",
        sourceUrl: sl.source || "https://planet4589.org/space/con/star/stats.html",
        href: "/starlink.html",
      }));
    }

    const hist = (src.robotaxiTx && src.robotaxiTx.history) || [];
    if (hist.length) {
      const last = hist[hist.length - 1];
      facts.push(makeFact({
        topic: "robotaxi",
        tracker: "robotaxi",
        field: "tx-cybercab",
        value: String(last.cybercab),
        label: "Texas Cybercab registrations",
        at: last.date,
        evidence: "independently_corroborated",
        source: "Texas DMV list via fsddb.com",
        sourceUrl: last.src || "https://fsddb.com/robotaxi?operator=tesla-robotaxi-llc",
        href: "/cybercab.html",
        summary: "Registered in Texas is not the same as serving rides.",
      }));
    }

    const ship = src.starship;
    if (ship && ship.next) {
      const ev = events["starship-flight-" + ship.next.flight];
      const start = (ev && ev.date) ? ev.date : String(ship.next.start || "").slice(0, 10);
      facts.push(makeFact({
        topic: "starship",
        tracker: "starship",
        field: "next-flight",
        value: ship.next.flight + "|" + start + "|" + (ship.next.precision || ""),
        label: "Next Starship flight",
        at: ev && ev.date ? src.events.updated : ship.updated,
        evidence: ev ? "estimated" : "reported_unconfirmed",
        source: ev ? "data/events.json (FAA planning / desk overlay)" : "starship-data.js",
        href: "/starship.html",
        summary: "NET windows are not SpaceX T-0.",
      }));
    }

    const prod = (src.production && src.production.quarters) || [];
    if (prod.length) {
      const q = prod[prod.length - 1];
      facts.push(makeFact({
        topic: "production",
        tracker: "production",
        field: "latest-quarter",
        value: q.id + "|" + q.deliveries + "|" + q.production,
        label: q.id + " deliveries",
        at: q.published,
        evidence: "officially_confirmed",
        source: "Tesla Investor Relations",
        sourceUrl: q.sourceUrl,
        href: "/production.html",
      }));
    }

    const promises = (src.promises && src.promises.promises) || [];
    if (promises.length) {
      const counts = {};
      promises.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });
      facts.push(makeFact({
        topic: "promises",
        tracker: "promises",
        field: "status-counts",
        value: Object.keys(counts).sort().map((k) => k + ":" + counts[k]).join(","),
        label: "Promise status mix",
        at: src.promises.updated,
        evidence: "historical",
        source: "data/promises.json",
        href: "/promise-tracker.html",
      }));
    }

    return facts.filter((f) => !validateFact(f).length);
  }

  function snapCount(row) {
    if (row == null) return 0;
    if (Array.isArray(row)) return Number(row[0]) || 0;
    if (typeof row === "number") return row;
    if (typeof row === "object" && row.count != null) return Number(row.count) || 0;
    return 0;
  }

  function firstSeenVersion(history, versionId) {
    const snaps = ((history && history.snapshots) || []).slice().sort((a, b) => String(a.t).localeCompare(String(b.t)));
    for (let i = 0; i < snaps.length; i++) {
      const n = snapCount(snaps[i].v && snaps[i].v[versionId]);
      if (n > 0) return snaps[i].t;
    }
    return "";
  }

  function softwareWaves(history) {
    const snaps = ((history && history.snapshots) || []).slice().sort((a, b) => String(a.t).localeCompare(String(b.t)));
    if (snaps.length < 2) return [];
    const firstSeen = {};
    const lastCount = {};
    const out = [];
    snaps.forEach((s) => {
      Object.keys(s.v || {}).forEach((id) => {
        const n = snapCount(s.v[id]);
        if (n <= 0) return;
        if (!firstSeen[id]) {
          firstSeen[id] = { t: s.t, n };
          lastCount[id] = n;
          out.push({
            type: "appeared",
            version: id,
            at: s.t,
            previous: "0",
            next: String(n),
            summary: id + " first appeared in the Teslascope sample with " + n + (n === 1 ? " car" : " cars") + ". A sample sighting is not a rollout and not an offer to a particular car.",
          });
          return;
        }
        const prev = lastCount[id] || 0;
        if (n - prev >= 40) {
          out.push({
            type: "changed",
            version: id,
            at: s.t,
            previous: String(prev),
            next: String(n),
            summary: id + " moved from " + prev + " to " + n + " cars in the Teslascope sample. That is a sample-count change, not Tesla confirming a regional rollout or an offer to a VIN.",
          });
        }
        lastCount[id] = n;
      });
    });
    return out.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 20);
  }

  function snapCountryCount(row, cc) {
    if (!row || !Array.isArray(row) || !row[1] || typeof row[1] !== "object") return 0;
    return Number(row[1][cc]) || 0;
  }

  const COUNTRY_NAMES = {
    AE: "United Arab Emirates", AT: "Austria", AU: "Australia", BE: "Belgium", BG: "Bulgaria",
    CA: "Canada", CH: "Switzerland", CO: "Colombia", CZ: "Czechia", DE: "Germany", DK: "Denmark",
    EE: "Estonia", ES: "Spain", FR: "France", GB: "United Kingdom", GR: "Greece", HK: "Hong Kong",
    HU: "Hungary", IE: "Ireland", IL: "Israel", IS: "Iceland", IT: "Italy", JP: "Japan", KR: "South Korea",
    LT: "Lithuania", MA: "Morocco", MX: "Mexico", MY: "Malaysia", NL: "Netherlands", NO: "Norway",
    NZ: "New Zealand", PH: "Philippines", PL: "Poland", PR: "Puerto Rico", PT: "Portugal", QA: "Qatar",
    RO: "Romania", SE: "Sweden", SG: "Singapore", SI: "Slovenia", SK: "Slovakia", TH: "Thailand",
    TR: "Turkey", TW: "Taiwan", UA: "Ukraine", US: "United States",
  };

  function softwareWavesForCountry(history, countryCode) {
    const cc = String(countryCode || "").toUpperCase();
    if (!cc) return [];
    const snaps = ((history && history.snapshots) || []).slice().sort((a, b) => String(a.t).localeCompare(String(b.t)));
    if (!snaps.length) return [];
    const firstSeen = {};
    const lastCount = {};
    const out = [];
    snaps.forEach((s) => {
      Object.keys(s.v || {}).forEach((id) => {
        const n = snapCountryCount(s.v[id], cc);
        if (n <= 0) return;
        if (!firstSeen[id]) {
          firstSeen[id] = { t: s.t, n };
          lastCount[id] = n;
          out.push({
            type: "appeared",
            version: id,
            country: cc,
            at: s.t,
            previous: "0",
            next: String(n),
            summary: id + " first appeared in the Teslascope sample for " + cc + " with " + n + (n === 1 ? " car" : " cars") + ". A sample sighting is not a rollout and not an offer to a particular VIN.",
          });
          return;
        }
        const prev = lastCount[id] || 0;
        if (n - prev >= 10) {
          out.push({
            type: "changed",
            version: id,
            country: cc,
            at: s.t,
            previous: String(prev),
            next: String(n),
            summary: id + " moved from " + prev + " to " + n + " cars in the Teslascope sample for " + cc + ". That is a sample-count change, not Tesla confirming this car is eligible.",
          });
        }
        lastCount[id] = n;
      });
    });
    out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const seenJump = {};
    const deduped = [];
    out.forEach((w) => {
      if (w.type === "appeared") {
        deduped.push(w);
        return;
      }
      if (seenJump[w.version]) return;
      seenJump[w.version] = true;
      deduped.push(w);
    });
    return deduped.slice(0, 12);
  }

  function cybercabJumps(history) {
    const hist = (history || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const jumps = [];
    for (let i = 1; i < hist.length; i++) {
      if (hist[i].cybercab === hist[i - 1].cybercab) continue;
      jumps.push({
        date: hist[i].date,
        previous: hist[i - 1].cybercab,
        next: hist[i].cybercab,
        src: hist[i].src || "",
        summary: "Texas Cybercab registrations moved from " + hist[i - 1].cybercab + " to " + hist[i].cybercab + ". A registration is not a car in service.",
      });
    }
    const last = hist[hist.length - 1] || null;
    const lastJump = jumps.length ? jumps[jumps.length - 1] : null;
    let unchanged = null;
    if (last && lastJump && last.date !== lastJump.date && last.cybercab === lastJump.next) {
      unchanged = {
        date: last.date,
        count: last.cybercab,
        since: lastJump.date,
        src: last.src || "",
        summary: "Still " + last.cybercab + " registered on " + last.date + ". Unchanged days are not a new jump. A registration is not a car in service.",
      };
    }
    return { jumps, unchanged, last };
  }

  function starlinkDiffs(history) {
    const rows = ((history && history.snapshots) || []).slice().sort((a, b) => String(a.updated || a.at || "").localeCompare(String(b.updated || b.at || "")));
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1];
      const b = rows[i];
      const fields = ["inOrbit", "working", "operational", "launched"];
      const parts = [];
      fields.forEach((f) => {
        if (a[f] !== b[f]) parts.push(f + " " + Number(a[f]).toLocaleString("en-US") + " → " + Number(b[f]).toLocaleString("en-US"));
      });
      if (!parts.length) continue;
      out.push({
        at: b.updated || b.at,
        previous: String(a.inOrbit),
        next: String(b.inOrbit),
        summary: "McDowell snapshot: " + parts.join("; ") + ". This is a published table snapshot, not a live operator feed.",
        source: b.source || (history && history.source) || "https://planet4589.org/space/con/star/stats.html",
      });
    }
    return out;
  }

  function autonomyLayer(kind, flags) {
    const f = flags || {};
    if (kind === "fsd-supervised") {
      return {
        layer: "supervised_assistance",
        label: "Driver-supervised assistance",
        note: "SAE Level 2. The driver must supervise. This is not unsupervised autonomy.",
      };
    }
    if (kind === "eu") {
      if (f.rolloutLive) {
        return {
          layer: "customer_live",
          label: "Customer live (supervised)",
          note: "National recognition plus reported customer use. Still driver-supervised.",
        };
      }
      if (f.recognised || f.approved) {
        return {
          layer: "permit_not_rollout",
          label: "Recognised, rollout not confirmed",
          note: "A ministry yes is not the same as owners receiving the software.",
        };
      }
      if (f.testing) {
        return {
          layer: "testing",
          label: "Testing only",
          note: "Road tests are not commercial service or customer availability.",
        };
      }
      if (f.review) {
        return {
          layer: "review",
          label: "Under review",
          note: "Review is not approval and not a live customer rollout.",
        };
      }
      return { layer: "unconfirmed", label: "No national recognition reported", note: "" };
    }
    if (kind === "robotaxi") {
      if (f.commercial) {
        return {
          layer: "commercial_service",
          label: "Commercial paid rides (sourced)",
          note: "Paid public rides. Not the same as a registration count.",
        };
      }
      if (f.namedNext) {
        return {
          layer: "company_claim",
          label: "Named next, no date",
          note: "A company statement is not commercial operation.",
        };
      }
      if (f.staging) {
        return {
          layer: "reported_unconfirmed",
          label: "Staging reported, no public service",
          note: "Vehicles parked is not service.",
        };
      }
      if (f.permit) {
        return {
          layer: "permit",
          label: "Authorisation / permit",
          note: "A permit is not commercial operation.",
        };
      }
      return { layer: "unconfirmed", label: "Unconfirmed", note: "" };
    }
    return { layer: "unconfirmed", label: "Unconfirmed", note: "" };
  }

  function collectHistorical(src) {
    const out = [];
    const fsd = src.fsdEurope;
    ((fsd && fsd.changelog) || []).forEach((row) => {
      const c = {
        type: "logged",
        factId: factId("fsd", row.code ? "country:" + row.code : row.type),
        topic: "fsd",
        tracker: "fsd",
        field: row.type,
        previous: "",
        next: row.text,
        at: iso(row.date) || row.date,
        evidence: row.evidence || (row.type === "approval" ? "officially_confirmed" : "independently_corroborated"),
        source: row.source,
        sourceUrl: row.source,
        href: "/fsd-europe.html",
        summary: row.text + (row.honesty ? " " + row.honesty : ""),
        title: row.code ? (row.code + " · " + row.type) : row.type,
      };
      c.id = changeId(c);
      if (!validateChange(c).length) out.push(c);
    });

    ((src.starship && src.starship.schedule) || []).forEach((row) => {
      const c = {
        type: "logged",
        factId: factId("starship", "schedule"),
        topic: "starship",
        tracker: "starship",
        field: "schedule",
        previous: "",
        next: row.change,
        at: iso(row.date) || row.date,
        evidence: row.confirmed ? "independently_corroborated" : "reported_unconfirmed",
        source: "starship-data.js schedule",
        href: "/starship.html",
        summary: row.change,
        title: "Starship schedule note",
      };
      c.id = changeId(c);
      if (!validateChange(c).length) out.push(c);
    });

    const hist = ((src.robotaxiTx && src.robotaxiTx.history) || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    for (let i = 1; i < hist.length; i++) {
      if (hist[i].cybercab === hist[i - 1].cybercab) continue;
      const c = {
        type: "changed",
        factId: factId("robotaxi", "tx-cybercab"),
        topic: "robotaxi",
        tracker: "robotaxi",
        field: "tx-cybercab",
        previous: String(hist[i - 1].cybercab),
        next: String(hist[i].cybercab),
        at: iso(hist[i].date) || hist[i].date,
        evidence: "independently_corroborated",
        source: "Texas DMV list via fsddb.com",
        sourceUrl: hist[i].src || "",
        href: "/cybercab.html#cc-changes",
        summary: "Texas Cybercab registrations moved from " + hist[i - 1].cybercab + " to " + hist[i].cybercab + ". A registration is not a car in service.",
        title: "Texas Cybercab count",
      };
      c.id = changeId(c);
      if (!validateChange(c).length) out.push(c);
    }

    starlinkDiffs(src.starlinkHistory).forEach((w) => {
      const c = {
        type: "changed",
        factId: factId("starlink", "in-orbit"),
        topic: "starlink",
        tracker: "starlink",
        field: "in-orbit",
        previous: w.previous,
        next: w.next,
        at: iso(w.at) || w.at,
        evidence: "independently_corroborated",
        source: "Jonathan McDowell Starlink statistics",
        sourceUrl: w.source || "https://planet4589.org/space/con/star/stats.html",
        href: "/starlink.html#counts-changed",
        summary: w.summary,
        title: "Starlink McDowell snapshot",
      };
      c.id = changeId(c);
      if (!validateChange(c).length) out.push(c);
    });

    softwareWaves(src.updatesHistory).forEach((w) => {
      const c = {
        type: w.type,
        factId: factId("tesla-software", "wave:" + w.version),
        topic: "tesla-software",
        tracker: "software",
        field: "wave:" + w.version,
        previous: w.previous,
        next: w.next,
        at: iso(w.at) || w.at,
        evidence: "reported_unconfirmed",
        source: "Teslascope sample",
        sourceUrl: (src.updates && src.updates.sourceUrl) || (src.updatesHistory && src.updatesHistory.sourceUrl) || "https://teslascope.com/software",
        href: "/updates.html#sample-waves",
        summary: w.summary,
        title: w.version,
      };
      c.id = changeId(c);
      if (!validateChange(c).length) out.push(c);
    });

    ((src.promises && src.promises.promises) || []).forEach((p) => {
      ((p.revisions) || []).forEach((r) => {
        const c = {
          type: "logged",
          factId: factId("promises", p.id),
          topic: /optimus/i.test(p.topic) ? "optimus" : /roadster/i.test(p.topic) ? "roadster" : /fsd|autonomy|robotaxi|cybercab/i.test(p.topic) ? "fsd" : "promises",
          tracker: "promises",
          field: "revision",
          previous: "",
          next: r.text,
          at: iso(r.date) || r.date,
          evidence: "company_claim",
          source: (r.source && (r.source.outlet || r.source.url)) || p.source.outlet,
          sourceUrl: (r.source && r.source.url) || (p.source && p.source.url) || "",
          href: "/promise-tracker.html#" + p.id,
          summary: r.text,
          title: p.title,
        };
        c.id = changeId(c);
        if (!validateChange(c).length) out.push(c);
      });
    });

    ((src.articles && src.articles.articles) || []).slice(0, 12).forEach((a) => {
      const c = {
        type: "logged",
        factId: factId("dispatch", a.url),
        topic: a.topic === "spacex" ? "spacex-launches" : /roadster/i.test(a.tag || a.title || "") ? "roadster" : /optimus/i.test(a.title || "") ? "optimus" : a.topic === "tesla" ? "fsd" : "promises",
        tracker: "promises",
        field: "dispatch",
        previous: "",
        next: a.title,
        at: iso(a.date) || a.date,
        evidence: "independently_corroborated",
        source: "Supercharged Daily Dispatch",
        sourceUrl: a.url,
        href: a.url,
        summary: a.summary || a.title,
        title: a.title,
      };
      if (/roadster/i.test(a.tag || a.title || "")) c.topic = "roadster";
      if (/optimus/i.test(a.title || a.tag || "")) c.topic = "optimus";
      if (/starship|starlink|falcon|bandwagon/i.test(a.title || "")) c.topic = /starship/i.test(a.title || "") ? "starship" : "spacex-launches";
      if (/software|firmware|2026\.\d+/i.test(a.title || "")) c.topic = "tesla-software";
      if (/cybercab|robotaxi/i.test(a.title || a.tag || "")) c.topic = "robotaxi";
      if (/fsd|assisted driving/i.test(a.title || a.tag || "")) c.topic = "fsd";
      c.id = changeId(c);
      if (!validateChange(c).length) out.push(c);
    });

    return out;
  }

  function detectChanges(prevFacts, nextFacts) {
    if (!prevFacts || !prevFacts.length) return [];
    const prev = {};
    (prevFacts || []).forEach((f) => { prev[f.id] = f; });
    const out = [];
    (nextFacts || []).forEach((f) => {
      const old = prev[f.id];
      if (!old) {
        const c = {
          type: "appeared",
          factId: f.id,
          topic: f.topic,
          tracker: f.tracker,
          field: f.field,
          previous: "",
          next: f.value,
          at: f.at,
          evidence: f.evidence,
          source: f.source,
          sourceUrl: f.sourceUrl,
          href: f.href,
          summary: f.summary || (f.label + " is now on the board."),
          title: f.label,
        };
        c.id = changeId(c);
        if (!validateChange(c).length) out.push(c);
        return;
      }
      if (old.value === f.value) return;
      const c = {
        type: "changed",
        factId: f.id,
        topic: f.topic,
        tracker: f.tracker,
        field: f.field,
        previous: old.value,
        next: f.value,
        at: f.at || iso(new Date()),
        evidence: f.evidence,
        source: f.source,
        sourceUrl: f.sourceUrl,
        href: f.href,
        summary: f.label + " changed from " + old.value + " to " + f.value + ".",
        title: f.label,
      };
      c.id = changeId(c);
      if (!validateChange(c).length) out.push(c);
    });
    return out;
  }

  function mergeChanges(lists) {
    const seen = new Set();
    const out = [];
    lists.forEach((list) => {
      (list || []).forEach((c) => {
        if (!c || seen.has(c.id)) return;
        if (validateChange(c).length) return;
        seen.add(c.id);
        out.push(c);
      });
    });
    return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }

  function detectConflicts(src, mergeApi) {
    const conflicts = [];
    const events = (src.events && src.events.events) || {};
    const live = (src.live && src.live.events) || [];
    live.forEach((row) => {
      Object.keys(events).forEach((id) => {
        const ev = events[id];
        const a = { id, title: ev.title, start: eventStart(ev) || ev.start };
        const b = { id: row.id, title: row.title, start: row.start };
        const same = mergeApi ? mergeApi.sameLaunch(a, b) : String(a.id) === String(b.id);
        if (!same) return;
        const as = Date.parse(a.start);
        const bs = Date.parse(b.start);
        if (!Number.isFinite(as) || !Number.isFinite(bs)) return;
        if (Math.abs(as - bs) < 60 * 1000) return;
        const flown = /done|ended|flown|success/i.test(String(ev.status || row.status || ""));
        conflicts.push({
          id: "conflict:" + id + ":" + row.id,
          entity: id,
          field: "start",
          values: [
            { source: "data/events.json", value: a.start },
            { source: "live-data.json", value: iso(row.start) },
          ],
          resolution: flown ? "keep_completed" : "keep_canonical_events_json",
          kept: a.start,
          note: "Canonical start stays in data/events.json. Live overlay must not silently rewind a later official slip.",
        });
      });
    });
    return conflicts;
  }

  function freshness(src, generatedAt) {
    const rows = [];
    const add = (tracker, lastChecked, lastVerified, note) => {
      rows.push({
        tracker,
        href: TRACKERS[tracker] && TRACKERS[tracker].href,
        lastChecked: iso(lastChecked) || "",
        lastVerified: iso(lastVerified) || dayStamp(lastVerified),
        note: note || "",
      });
    };
    add("starship", generatedAt, src.starship && src.starship.updated, "Compiled desk file. FAA NET is not a SpaceX clock.");
    add("launches", generatedAt, src.events && src.events.updated, "Canonical dates in data/events.json. Launch Library 2 is a live overlay.");
    add("software", src.updates && src.updates.updated, src.updates && src.updates.updated, "Teslascope sample. A build existing ≠ your car being offered it.");
    add("fsd", generatedAt, src.fsdEurope && src.fsdEurope.updated, "Manual editorial file with ministry sources.");
    add("robotaxi", generatedAt, src.robotaxiTx && src.robotaxiTx.checked, "Texas DMV count via fsddb.com.");
    add("starlink", src.starlinkLive && src.starlinkLive.orbitsUpdated, src.starlinkLive && src.starlinkLive.updated, "Counts: Jonathan McDowell. Orbits: CelesTrak snapshot, not a live operator feed.");
    add("promises", generatedAt, src.promises && src.promises.updated, "Every quote needs a source that was opened.");
    add("production", generatedAt, src.production && src.production.updated, "Tesla IR production and delivery tables only.");
    add("roadster", generatedAt, src.promises && src.promises.updated, "Reveal is past. Production target remains a company claim.");
    add("optimus", generatedAt, src.promises && src.promises.updated, "Demonstration ≠ autonomy. Production targets are company claims.");
    add("mytesla", generatedAt, src.updates && src.updates.updated, "Vehicle prefs stay in this browser.");
    return rows;
  }

  function health(bundle) {
    const issues = [];
    (bundle.freshness || []).forEach((row) => {
      if (!row.lastVerified) issues.push({ level: "warn", code: "no_verified", tracker: row.tracker, text: row.tracker + " has no last-verified stamp." });
    });
    if (!(bundle.facts || []).length) issues.push({ level: "error", code: "empty_facts", text: "Fact snapshot is empty." });
    if ((bundle.conflicts || []).length) issues.push({ level: "warn", code: "conflicts", text: bundle.conflicts.length + " conflicting launch clocks kept, not overwritten." });
    (bundle.jobs || []).forEach((j) => {
      if (j.status === "failed") issues.push({ level: "error", code: "job_failed", text: j.name + " failed: " + (j.error || "") });
    });
    return {
      ok: !issues.some((i) => i.level === "error"),
      generatedAt: bundle.generatedAt,
      factCount: (bundle.facts || []).length,
      changeCount: (bundle.changes || []).length,
      conflictCount: (bundle.conflicts || []).length,
      issues,
    };
  }

  function filterChanges(changes, opts) {
    const o = opts || {};
    const topics = o.topics && o.topics.length ? new Set(o.topics) : null;
    const since = o.since ? Date.parse(o.since) : NaN;
    const limit = o.limit || 12;
    return (changes || []).filter((c) => {
      if (topics && !topics.has(c.topic)) return false;
      if (Number.isFinite(since)) {
        const t = Date.parse(c.at);
        if (!Number.isFinite(t) || t < since) return false;
      }
      return true;
    }).slice(0, limit);
  }

  function fmtWhen(at) {
    const t = Date.parse(at);
    if (!Number.isFinite(t)) return at || "";
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(t));
  }

  function changeItemHtml(c) {
    return `<li class="intel-item" data-topic="${esc(c.topic)}"><a href="${esc(c.href || "#")}">` +
      `<span class="intel-k">${esc((TRACKERS[c.tracker] && TRACKERS[c.tracker].label) || c.topic)}</span>` +
      `<strong>${esc(c.title || c.field)}</strong>` +
      `<span class="intel-s">${esc(c.summary)}</span>` +
      `<span class="intel-m"><span class="intel-ev intel-ev-${esc(c.evidence)}">${esc(EVIDENCE_LABEL[c.evidence] || c.evidence)}</span>` +
      `<time datetime="${esc(iso(c.at) || c.at)}">${esc(fmtWhen(c.at))}</time></span></a></li>`;
  }

  function changesHtml(changes) {
    if (!changes || !changes.length) {
      return '<p class="intel-empty">No sourced tracker changes in this window. Last verified stamps stay on each tracker.</p>';
    }
    return `<ol class="intel-list">${changes.map(changeItemHtml).join("")}</ol>`;
  }

  function freshnessHtml(row) {
    if (!row) return "";
    const checked = row.lastChecked ? fmtWhen(row.lastChecked) : "—";
    const verified = row.lastVerified ? fmtWhen(row.lastVerified) : "—";
    return `<p class="intel-fresh" data-intel-fresh="${esc(row.tracker)}">` +
      `<span>Last checked <time datetime="${esc(row.lastChecked)}">${esc(checked)}</time></span>` +
      `<span>Last verified update <time datetime="${esc(row.lastVerified)}">${esc(verified)}</time></span>` +
      (row.note ? `<span class="intel-fresh-note">${esc(row.note)}</span>` : "") +
      `</p>`;
  }

  function followRead(store) {
    try {
      const raw = store && store.getItem(FOLLOW_KEY);
      const j = raw ? JSON.parse(raw) : null;
      return Array.isArray(j && j.topics) ? j.topics.filter((t) => TOPICS.some((x) => x.id === t)) : [];
    } catch (e) {
      return [];
    }
  }

  function followWrite(store, topics) {
    if (!store) return;
    store.setItem(FOLLOW_KEY, JSON.stringify({ topics: topics || [], updated: new Date().toISOString() }));
  }

  function homeSection(bundle) {
    const recent = filterChanges(bundle.changes, { limit: 8 });
    const follow = TOPICS.map((t) =>
      `<button type="button" class="intel-chip" data-follow="${esc(t.id)}" aria-pressed="false">${esc(t.label)}</button>`
    ).join("");
    return `<section class="hv-changed" aria-labelledby="hv-ch-h">
          <div class="hv-head"><h2 id="hv-ch-h">What changed</h2><span><a href="/daily.html">Your Supercharged Daily</a> · <a href="/data/intelligence/bundle.json">Machine-readable log</a></span></div>
          <p class="hv-feed-sub">Sourced tracker moves, not the wire. Follow topics in this browser to filter. Last checked is not the same as last verified update.</p>
          <div class="intel-follow" data-intel-follow role="group" aria-label="Follow topics">${follow}</div>
          <div data-intel-changed>${changesHtml(recent)}</div>
        </section>`;
  }

  function alertRead(store) {
    try {
      const raw = store && store.getItem(ALERT_KEY);
      const j = raw ? JSON.parse(raw) : null;
      return {
        ids: Array.isArray(j && j.ids) ? j.ids : [],
        items: Array.isArray(j && j.items) ? j.items : [],
        enabled: !!(j && j.enabled),
        updated: (j && j.updated) || "",
      };
    } catch (e) {
      return { ids: [], items: [], enabled: false, updated: "" };
    }
  }

  function alertWrite(store, state) {
    if (!store) return;
    store.setItem(ALERT_KEY, JSON.stringify({
      ids: (state.ids || []).slice(-80),
      items: (state.items || []).slice(0, 40),
      enabled: !!state.enabled,
      updated: new Date().toISOString(),
    }));
  }

  function alertEnqueue(store, changes, topics) {
    const state = alertRead(store);
    if (!state.enabled) return { queued: 0, skipped: (changes || []).length, sent: 0, mode: "preview" };
    const want = topics && topics.length ? new Set(topics) : null;
    let queued = 0;
    (changes || []).forEach((c) => {
      if (!c || !c.id) return;
      if (want && !want.has(c.topic)) return;
      if (state.ids.indexOf(c.id) >= 0) return;
      state.ids.push(c.id);
      state.items.unshift({
        id: c.id,
        topic: c.topic,
        title: c.title,
        summary: c.summary,
        href: c.href,
        at: c.at,
        evidence: c.evidence,
      });
      queued += 1;
    });
    alertWrite(store, state);
    return { queued, skipped: 0, sent: 0, mode: "preview" };
  }

  function digestPreview(changes, topics, generatedAt) {
    const rows = filterChanges(changes, { topics: topics && topics.length ? topics : null, limit: 12 });
    return {
      mode: "preview",
      sent: false,
      subject: "Supercharged Daily — preview digest (not sent)",
      generatedAt: iso(generatedAt) || "",
      topics: topics || [],
      items: rows.map((c) => ({
        title: c.title,
        summary: c.summary,
        href: c.href,
        evidence: EVIDENCE_LABEL[c.evidence] || c.evidence,
        at: c.at,
      })),
      disclaimer: "This is a local preview. No email or push was sent. Production sending needs approval.",
    };
  }

  function digestHtml(preview) {
    const p = preview || digestPreview([], []);
    const rows = (p.items || []).map((c) =>
      `<li class="intel-item"><strong>${esc(c.title || "")}</strong><span class="intel-s">${esc(c.summary || "")}</span>` +
      `<span class="intel-m"><span class="intel-ev">${esc(c.evidence || "")}</span><time>${esc(fmtWhen(c.at))}</time></span></li>`
    ).join("");
    return `<div class="intel-digest" data-sent="${p.sent ? "true" : "false"}">` +
      `<p class="intel-k">${esc(p.mode || "preview")}</p>` +
      `<strong>${esc(p.subject)}</strong>` +
      `<p class="intel-note">${esc(p.disclaimer)}</p>` +
      (rows ? `<ol class="intel-list">${rows}</ol>` : '<p class="intel-empty">No sourced rows in this preview window.</p>') +
      `</div>`;
  }

  function wavesHtml(changes) {
    const rows = (changes || []).filter((c) => c.topic === "tesla-software" && String(c.field || "").indexOf("wave:") === 0);
    if (!rows.length) return '<p class="intel-empty">No Teslascope sample first-seen rows in this window.</p>';
    return changesHtml(rows.slice(0, 12));
  }

  function countryWavesHtml(rows, cc) {
    const code = String(cc || "").toUpperCase();
    const name = (COUNTRY_NAMES[code] || code);
    if (!rows || !rows.length) {
      return '<p class="intel-empty">No Teslascope sample first-seen rows for ' + esc(name) + " in this window. A missing country in the sample is not Tesla saying the build is unavailable.</p>";
    }
    return '<p class="intel-note">Teslascope sample for ' + esc(name) + " (" + esc(code) + ") only. A sample sighting is not a rollout and not an offer to a particular VIN.</p>" +
      changesHtml(rows.map((w) => ({
        topic: "tesla-software",
        tracker: "software",
        title: w.version,
        summary: w.summary,
        evidence: "reported_unconfirmed",
        at: w.at,
        href: "/updates.html#sample-waves",
        field: "wave:" + w.version,
      })));
  }

  function fmtClock(isoStr) {
    const t = Date.parse(isoStr);
    if (!Number.isFinite(t)) return isoStr || "—";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      hourCycle: "h23",
    }).format(new Date(t)) + " UTC";
  }

  function conflictsHtml(conflicts) {
    const rows = conflicts || [];
    if (!rows.length) {
      return '<p class="intel-empty">No kept-clock disagreements in the last bundle.</p>';
    }
    const cell = (row, source) => {
      const hit = (row.values || []).find((v) => v.source === source);
      return fmtClock((hit && hit.value) || (source === "data/events.json" ? row.kept : ""));
    };
    return `<div class="intel-conflicts"><p class="intel-note">Canonical start stays in data/events.json. Live overlay times are shown, not used to rewind a flown or later official clock.</p>
      <div class="intel-compare"><table>
        <thead><tr><th>Entity</th><th>Kept (events.json)</th><th>Live overlay</th><th>Resolution</th></tr></thead>
        <tbody>${rows.map((c) => `<tr>
          <td><b>${esc(c.entity)}</b></td>
          <td>${esc(cell(c, "data/events.json"))}</td>
          <td>${esc(cell(c, "live-data.json"))}</td>
          <td>${esc(c.resolution || "keep_canonical_events_json")}. ${esc(c.note || "")}</td>
        </tr>`).join("")}</tbody>
      </table></div></div>`;
  }

  function fmtDayLabel(d) {
    const raw = String(d || "");
    const t = Date.parse(/T/.test(raw) ? raw : raw.length === 10 ? raw + "T12:00:00Z" : raw);
    if (!Number.isFinite(t)) return raw;
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(t));
  }

  function sourcedChangeHtml(row) {
    const src = row.src
      ? `<p class="sourced-change-src">Source: <a href="${esc(row.src)}" rel="noopener">${esc(row.srcLabel || "Opened source")}</a>. ${esc(row.note || "")}</p>`
      : (row.note ? `<p class="sourced-change-src">${esc(row.note)}</p>` : "");
    return `<article class="sourced-change">
      <div class="sourced-change-head">
        <time datetime="${esc(row.datetime || row.date || "")}">${esc(row.dateLabel || fmtDayLabel(row.date) || "")}</time>
        <span class="fsd-status ${esc(row.statusClass || "fsd-status-watch")}">${esc(row.status || "")}</span>
      </div>
      <p>${esc(row.summary)}</p>
      ${src}
    </article>`;
  }

  function cybercabChangesHtml(history) {
    const { jumps, unchanged } = cybercabJumps(history);
    if (!jumps.length && !unchanged) {
      return '<p class="intel-empty">No sourced Cybercab registration jumps in the stored Texas history.</p>';
    }
    const rows = [];
    if (unchanged) {
      rows.push(sourcedChangeHtml({
        date: unchanged.date,
        status: "Unchanged",
        statusClass: "fsd-status-watch",
        summary: unchanged.summary,
        src: unchanged.src,
        srcLabel: "Texas DMV list",
        note: "Not live fleet telemetry.",
      }));
    }
    jumps.slice().reverse().forEach((j) => {
      rows.push(sourcedChangeHtml({
        date: j.date,
        status: "Count jump",
        statusClass: "fsd-status-done",
        summary: j.summary,
        src: j.src,
        srcLabel: "Texas DMV list",
        note: "Not live fleet telemetry.",
      }));
    });
    return `<div class="sourced-changes">${rows.join("")}</div>`;
  }

  function starlinkChangesHtml(history) {
    const snaps = ((history && history.snapshots) || []).slice().sort((a, b) => String(a.updated || "").localeCompare(String(b.updated || "")));
    const diffs = starlinkDiffs(history);
    if (!snaps.length) {
      return '<p class="intel-empty">No committed McDowell snapshots on this site yet. Current as-of counts stay on the tracker; we do not invent the days between.</p>';
    }
    const rows = [];
    const last = snaps[snaps.length - 1];
    const src = (history && history.source) || last.source || "https://planet4589.org/space/con/star/stats.html";
    rows.push(sourcedChangeHtml({
      date: last.updated,
      datetime: last.updated,
      dateLabel: fmtClock(last.updated),
      status: diffs.length ? "Latest snapshot" : "As-of only",
      statusClass: "fsd-status-watch",
      summary: diffs.length
        ? ("Latest McDowell snapshot: " + Number(last.inOrbit).toLocaleString("en-US") + " in orbit, " + Number(last.working).toLocaleString("en-US") + " working. Only committed snapshots are listed. Days between them are not interpolated.")
        : ("As of " + fmtClock(last.updated) + ": " + Number(last.inOrbit).toLocaleString("en-US") + " in orbit. No earlier committed McDowell snapshot on this site to diff against."),
      src,
      srcLabel: "Jonathan McDowell",
      note: "Published table snapshot, not a live operator feed.",
    }));
    diffs.slice().reverse().forEach((d) => {
      rows.push(sourcedChangeHtml({
        date: d.at,
        datetime: d.at,
        dateLabel: fmtClock(d.at),
        status: "Count change",
        statusClass: "fsd-status-done",
        summary: d.summary,
        src: d.source || src,
        srcLabel: "Jonathan McDowell",
        note: "Not live telemetry.",
      }));
    });
    return `<div class="sourced-changes">${rows.join("")}</div>`;
  }

  function build(src, prevSnapshot, now) {
    const generatedAt = iso(now || new Date());
    const facts = collectFacts(src);
    const historical = collectHistorical(src);
    const detected = detectChanges(prevSnapshot && prevSnapshot.facts, facts);
    const changes = mergeChanges([detected, historical]);
    const conflicts = detectConflicts(src, src.merge);
    const fresh = freshness(src, generatedAt);
    const bundle = {
      schema: 1,
      engine: "Supercharged Intelligence Engine",
      generatedAt,
      facts,
      changes,
      conflicts,
      freshness: fresh,
      jobs: src.jobs || [],
    };
    bundle.health = health(bundle);
    return bundle;
  }

  return {
    EVIDENCE,
    EVIDENCE_LABEL,
    TOPICS,
    TRACKERS,
    FOLLOW_KEY,
    VISIT_KEY,
    ALERT_KEY,
    esc,
    iso,
    dayStamp,
    evidenceOk,
    factId,
    changeId,
    makeFact,
    validateFact,
    validateChange,
    newestSoftware,
    snapCount,
    firstSeenVersion,
    softwareWaves,
    snapCountryCount,
    COUNTRY_NAMES,
    softwareWavesForCountry,
    cybercabJumps,
    starlinkDiffs,
    autonomyLayer,
    collectFacts,
    collectHistorical,
    detectChanges,
    mergeChanges,
    detectConflicts,
    freshness,
    health,
    filterChanges,
    changesHtml,
    freshnessHtml,
    followRead,
    followWrite,
    alertRead,
    alertWrite,
    alertEnqueue,
    digestPreview,
    digestHtml,
    wavesHtml,
    countryWavesHtml,
    fmtClock,
    conflictsHtml,
    sourcedChangeHtml,
    cybercabChangesHtml,
    starlinkChangesHtml,
    homeSection,
    build,
  };
});
