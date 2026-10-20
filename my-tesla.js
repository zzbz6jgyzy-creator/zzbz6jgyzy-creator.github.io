(() => {
  "use strict";
  const DATA = window.MY_TESLA;
  const UPD = window.TESLA_UPDATES;
  const FSD = window.FSD_GLOBAL;
  const EU = window.FSD_EUROPE;
  if (!DATA) return;

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const KEY = "sd-my-tesla-v1";
  const NA = ["US", "CA", "MX", "PR"];
  const EUC = (EU?.countries || []).map((c) => c.code);
  const AP = ["AU", "NZ", "JP", "KR", "TW", "HK", "SG", "MY", "TH", "PH", "CN"];
  const regionOf = (cc) => (NA.includes(cc) ? "NA" : EUC.includes(cc) ? "EU" : AP.includes(cc) ? "AP" : cc ? "OT" : "");
  const RNAME = { NA: "North America", EU: "Europe", AP: "Asia-Pacific", OT: "this market" };

  const cmpVer = (a, b) => {
    const x = String(a || "").split(".").map(Number);
    const y = String(b || "").split(".").map(Number);
    for (let i = 0; i < 4; i++) {
      const d = (x[i] || 0) - (y[i] || 0);
      if (d) return d;
    }
    return 0;
  };

  const pickRange = (ranges, year) => {
    if (!year || !ranges) return null;
    return (
      ranges.find((r) => (r.from == null || year >= r.from) && (r.to == null || year <= r.to)) || null
    );
  };

  const countries = () => {
    const map = new Map();
    (FSD?.countries || []).forEach((c) => map.set(c.code, { code: c.code, name: c.name }));
    (UPD?.countries || []).forEach((c) => {
      if (!map.has(c.code)) map.set(c.code, { code: c.code, name: c.name });
    });
    (DATA.extraCountries || []).forEach((c) => {
      if (!map.has(c.code)) map.set(c.code, c);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  };

  const state = { model: "", year: "", hw: "", sw: "", cc: "" };
  let live = null;
  let deskStories = [];
  let hwSource = ""; // "user" | "guess" — year→computer is an estimate until the owner confirms

  const readStore = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null");
    } catch {
      return null;
    }
  };

  const writeStore = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  };

  const fromQuery = () => {
    const q = new URLSearchParams(location.search);
    const next = {};
    ["model", "year", "hw", "sw", "cc"].forEach((k) => {
      if (q.get(k)) next[k] = k === "year" ? Number(q.get(k)) : q.get(k);
    });
    return next;
  };

  const writeQuery = () => {
    const q = new URLSearchParams();
    if (state.model) q.set("model", state.model);
    if (state.year) q.set("year", String(state.year));
    if (state.hw) q.set("hw", state.hw);
    if (state.sw) q.set("sw", state.sw);
    if (state.cc) q.set("cc", state.cc);
    const qs = q.toString();
    const next = location.pathname + (qs ? "?" + qs : "") + location.hash;
    if (location.search !== (qs ? "?" + qs : "")) history.replaceState(null, "", next);
  };

  const modelOf = () => DATA.models.find((m) => m.id === state.model);
  const countryName = () => countries().find((c) => c.code === state.cc)?.name || state.cc;
  const hwName = () => DATA.hardware.find((h) => h.id === state.hw)?.name || "unknown computer";

  const fsdRow = () => (FSD?.countries || []).find((c) => c.code === state.cc);
  const euRow = () => (EU?.countries || []).find((c) => c.code === state.cc);

  const fillYears = () => {
    const sel = $("mt-year");
    const m = modelOf();
    sel.replaceChildren();
    sel.append(new Option("Year", ""));
    if (!m) return;
    for (let y = m.years[1]; y >= m.years[0]; y--) sel.append(new Option(String(y), String(y)));
    if (state.year) sel.value = String(state.year);
  };

  const fillHw = () => {
    const sel = $("mt-hw");
    sel.replaceChildren();
    sel.append(new Option("Hardware", ""));
    DATA.hardware.forEach((h) => sel.append(new Option(h.name, h.id)));
    if (state.hw) sel.value = state.hw;
  };

  const fillSw = () => {
    const sel = $("mt-sw");
    const ids = new Set();
    (live?.versions || []).forEach((v) => {
      if (v.id && (v.count > 0 || v.percent > 0)) ids.add(v.id);
    });
    (UPD?.versions || []).forEach((v) => ids.add(v.id));
    const list = [...ids].sort(cmpVer).reverse();
    sel.replaceChildren();
    sel.append(new Option("Not sure / skip", ""));
    list.forEach((id) => sel.append(new Option(id, id)));
    if (state.sw) sel.value = state.sw;
  };

  const fillCountries = () => {
    const sel = $("mt-cc");
    sel.replaceChildren();
    sel.append(new Option("Country", ""));
    countries().forEach((c) => sel.append(new Option(c.name, c.code)));
    if (state.cc) sel.value = state.cc;
  };

  const hintHw = () => {
    const m = modelOf();
    const hint = $("mt-hint");
    if (!m || !state.year) {
      hint.textContent = "";
      return;
    }
    const row = pickRange(m.hw, state.year);
    const gen = pickRange(m.gen, state.year);
    const bits = [];
    if (gen) bits.push(gen.label);
    if (row) bits.push(row.label);
    hint.innerHTML = bits.length
      ? `For a ${esc(state.year)} ${esc(m.name)} we <em>estimate</em> <b>${esc(bits.join(" · "))}</b>. Override hardware if the computer was swapped later.`
      : "";
    if (row && !state.hw) {
      state.hw = row.id;
      hwSource = "guess";
      if ($("mt-hw")) $("mt-hw").value = row.id;
    }
  };

  const liveForCountry = () => {
    const rows = (live?.versions || []).map((v) => {
      const n = (v.countryCounts || {})[state.cc] || 0;
      return { v, n };
    }).filter((x) => x.n > 0);
    const total = rows.reduce((s, x) => s + x.n, 0);
    const newest = [...rows].sort((a, b) => cmpVer(b.v.id, a.v.id))[0];
    const common = [...rows].sort((a, b) => b.n - a.n)[0];
    return { rows, total, newest, common };
  };

  const fsdOnBuild = (v) => {
    if (!v) return null;
    if (state.hw === "hw3") return v.fsdHw3 || null;
    if (state.hw === "hw4") return v.fsdHw4 || v.fsd || null;
    return v.fsdHw4 || v.fsdHw3 || v.fsd || null;
  };

  const featureState = (feat) => {
    if (feat.models && state.model && !feat.models.includes(state.model)) {
      return { key: "no", label: "Not this model", detail: "This car never got it.", trust: "desk", trustLabel: "Desk read" };
    }
    if (feat.except && state.model && state.year) {
      const hit = feat.except.find((e) => e.model === state.model && state.year <= (e.to || 9999) && state.year >= (e.from || 0));
      if (hit) return { key: "no", label: "Not this body", detail: "The refresh cabin is what this refers to.", trust: "desk", trustLabel: "Desk read" };
    }
    if (feat.yearFrom && state.year && state.year < feat.yearFrom) {
      return { key: "no", label: "Older body", detail: `Starts on ${feat.yearFrom}+ cars.`, trust: "desk", trustLabel: "Desk read" };
    }
    if (feat.hw && state.hw && !feat.hw.includes(state.hw)) {
      return { key: "no", label: "Wrong computer", detail: feat.whyNoHw || `Needs ${feat.hw.map((h) => DATA.hardware.find((x) => x.id === h)?.short || h).join(" or ")}.`, trust: "desk", trustLabel: "Desk read" };
    }
    if (feat.kind === "fsd") {
      const row = fsdRow();
      if (!row) return { key: "locked", label: "Unlisted", detail: "Tesla has not listed Supervised FSD for this country in our tracker.", trust: "tracker", trustLabel: "From our FSD tracker" };
      if (row.status === "live") {
        const name = state.cc && EUC.includes(state.cc) ? "Assisted Driving Basic" : "FSD (Supervised)";
        return { key: "yes", label: "Live", detail: `${name} is listed here${row.version ? ` · ${row.version}` : ""}. Driver still supervises.`, trust: "tracker", trustLabel: "From our FSD tracker" };
      }
      if (row.status === "limited") return { key: "soon", label: "Limited", detail: row.note, trust: "tracker", trustLabel: "From our FSD tracker" };
      if (row.status === "review" || row.status === "watch") return { key: "locked", label: row.status === "review" ? "In review" : "Watching", detail: row.note, trust: "tracker", trustLabel: "From our FSD tracker" };
      return { key: "locked", label: "Not approved", detail: row.note || "No national yes yet.", trust: "tracker", trustLabel: "From our FSD tracker" };
    }
    const rg = regionOf(state.cc);
    if (feat.regions && rg && !feat.regions.includes(rg) && !(feat.countries || []).includes(state.cc)) {
      return { key: "locked", label: "Region lock", detail: feat.whyNoRegion || `Listed for ${feat.regions.map((r) => RNAME[r] || r).join(", ")}, not ${countryName()}.`, trust: "desk", trustLabel: "Desk read of Tesla listings" };
    }
    if (feat.minSw && state.sw && cmpVer(state.sw, feat.minSw) < 0) {
      return { key: "soon", label: "Needs a newer build", detail: `On your car after ${feat.minSw}. You are on ${state.sw}.`, trust: "desk", trustLabel: "From the notes we track" };
    }
    if (feat.minSw && !state.sw) {
      return { key: "soon", label: "Build-dependent", detail: `In the notes from ${feat.minSw}. Add your software version to be sure.`, trust: "estimate", trustLabel: "Estimate — add your software" };
    }
    if (feat.minSw || feat.regions) {
      return { key: "yes", label: "Listed here", detail: feat.summary, trust: "desk", trustLabel: "Desk read of Tesla listings" };
    }
    return { key: "yes", label: "This body", detail: feat.summary, trust: "desk", trustLabel: "Desk read of the product" };
  };

  const relevantNotes = () => {
    const notes = UPD?.versions || [];
    return notes
      .filter((v) => {
        if (state.model && v.models && v.models.length) {
          const aliases = { CT: "Cybertruck", "3": "3", Y: "Y", S: "S", X: "X" };
          const want = aliases[state.model] || state.model;
          if (!v.models.includes(want) && !v.models.includes(state.model)) return false;
        }
        if (state.hw) {
          const want = state.hw === "hw4" ? "HW4" : state.hw === "hw3" ? "HW3" : "HW2";
          if (v.hardware && !v.hardware.some((h) => h.startsWith(want))) return false;
        }
        if (state.cc && v.countries && v.countries.length && !v.countries.includes(state.cc)) return false;
        return true;
      })
      .slice(0, 3);
  };

  const liveFeatureNotes = () => {
    if (!state.cc || !live?.versions?.length) return [];
    const local = liveForCountry();
    const v = local.newest?.v;
    if (!v || !(v.features || []).length) return [];
    return v.features
      .filter((f) => {
        const t = `${f.title} ${f.text}`.toLowerCase();
        if (state.hw === "hw3" && /collision evasion/.test(t)) return false;
        if (state.hw === "hw3" && /v14\.3\.12/.test(t) && !/lite|hw3/.test(t)) return false;
        if (state.hw === "hw4" && /v14\.3 lite/.test(t)) return false;
        if (state.model && state.model !== "CT" && /powershare/.test(t)) return false;
        return true;
      })
      .slice(0, 3)
      .map((f) => ({ v, f }));
  };

  const guides = () => {
    const rg = regionOf(state.cc);
    return (DATA.guides || []).filter((g) => {
      if (g.models && state.model && !g.models.includes(state.model)) return false;
      if (g.yearFrom && state.year && state.year < g.yearFrom) return false;
      if (g.regions && rg && !g.regions.includes(rg)) return false;
      return true;
    });
  };

  const renderTiles = () => {
    const box = $("mt-now");
    if (!state.model && !state.cc) {
      box.innerHTML = "";
      $("mt-dash").hidden = true;
      $("mt-empty").hidden = false;
      return;
    }
    $("mt-dash").hidden = false;
    $("mt-empty").hidden = true;

    const m = modelOf();
    const rg = regionOf(state.cc);
    const fsd = fsdRow();
    const local = state.cc ? liveForCountry() : { newest: null, common: null, total: 0 };
    const newest = local.newest?.v;
    const you = state.sw;
    let swKey = "soon";
    let swBig = "Pick a build";
    let swSmall = "Add the version from Controls → Software.";
    if (you && newest) {
      const d = cmpVer(you, newest.id);
      if (d >= 0) {
        swKey = "ok";
        swBig = you;
        swSmall = d === 0 ? `You match the newest reporting in ${countryName()}.` : `Newer than the sample’s newest in ${countryName()} (${newest.id}).`;
      } else {
        swKey = "soon";
        swBig = you;
        swSmall = `Newest seen in ${countryName()} is ${newest.id}. You are in the queue, not forgotten.`;
      }
    } else if (newest) {
      swKey = "ok";
      swBig = newest.id;
      swSmall = `Newest reporting Teslascope has seen in ${countryName()} (${local.newest.n} cars).`;
    }

    const fsdKey = !fsd ? "lock" : fsd.status === "live" ? "ok" : fsd.status === "limited" ? "soon" : "lock";
    const fsdBig = !state.cc ? "Pick a country" : fsd?.status === "live" ? (EUC.includes(state.cc) ? "Assisted Driving" : "FSD live") : fsd?.status === "review" ? "In review" : fsd?.status === "watch" ? "Watching" : fsd?.status === "limited" ? "Limited" : "Not live";
    const fsdSmall = fsd?.note || (state.cc ? "No FSD listing for this country in the tracker." : "Country decides whether Supervised FSD is even legal.");

    const gen = pickRange(m?.gen, state.year)?.label || "";
    const hwSmall = state.hw
      ? hwSource === "guess"
        ? `Estimate from a ${state.year || ""} ${m?.name || "Tesla"} — we guessed ${hwName()}. Override if it was swapped.`
        : `${hwName()} on a ${state.year || ""} ${m?.name || "Tesla"} (you set this). ${gen}`.trim()
      : "Hardware decides Collision Evasion, Lite parking and camera features.";

    const lockCount = (DATA.features || [])
      .map(featureState)
      .filter((s) => s.key === "locked" || (s.key === "no" && s.label !== "Not this model")).length;

    box.innerHTML = `
      <div class="mt-tile mt-tile-${swKey}"><span>Your software</span><b>${esc(swBig)}</b><small>${esc(swSmall)}</small></div>
      <div class="mt-tile mt-tile-${fsdKey}"><span>Driver assistance</span><b>${esc(fsdBig)}</b><small>${esc(fsdSmall)}</small></div>
      <div class="mt-tile"><span>This car</span><b>${esc(m ? `${state.year || ""} ${m.name}`.trim() : "Pick a model")}</b><small>${esc(hwSmall)}</small></div>
      <div class="mt-tile ${lockCount ? "mt-tile-lock" : ""}"><span>Limits on this profile</span><b>${lockCount || "—"}</b><small>${lockCount ? "Features locked by hardware, body or country — listed below." : "Add model and country to count locks."}</small></div>`;
  };

  const renderUpdates = () => {
    const ul = $("mt-updates");
    const notes = relevantNotes();
    const local = state.cc ? liveForCountry() : null;
    if (!notes.length && !local?.newest) {
      ul.innerHTML = `<li><b>No matching builds yet</b><p>The software tracker still has the fleet-wide view.</p></li>`;
      return;
    }
    const items = [];
    if (local?.newest) {
      const fsd = fsdOnBuild(local.newest.v);
      items.push(`<li><b>${esc(local.newest.v.id)} is the newest sample in ${esc(countryName())}</b>
        <p>${fsd ? `FSD on that build for ${esc(hwName())}: v${esc(fsd)}.` : "No FSD version listed on that build in the snapshot."}
        ${local.common && local.common.v.id !== local.newest.v.id ? ` Most cars here are still on ${esc(local.common.v.id)}.` : ""}</p>
        <span class="mt-meta">${local.newest.n} of ${local.total} tracked cars in ${esc(state.cc)}</span></li>`);
    }
    notes.forEach((v) => {
      items.push(`<li><b>${esc(v.id)} — ${esc(v.headline)}</b><p>${esc(v.reached || v.summary)}</p>
        <span class="mt-meta">Desk notes · ${esc(v.date)} · ${esc((v.countries || []).join(", ") || "countries vary")}</span></li>`);
    });
    const blob = notes.map((v) => `${v.headline} ${v.summary}`.toLowerCase()).join(" ");
    liveFeatureNotes()
      .filter(({ f }) => !blob.includes((f.title || "").toLowerCase()))
      .forEach(({ v, f }) => {
        items.push(`<li><b>${esc(f.title)} — ${esc(v.id)}</b><p>${esc(f.text)}</p>
          <span class="mt-meta">Teslascope sample · ${live.sourceUrl ? `<a href="${esc(live.sourceUrl)}" target="_blank" rel="noopener noreferrer">Teslascope</a> · ` : ""}${esc(v.date)} · not Tesla’s official owner notes</span></li>`);
      });
    ul.innerHTML = items.slice(0, 5).join("");
  };

  const renderFeatures = () => {
    const box = $("mt-feats");
    if (!state.model) {
      box.innerHTML = `<p class="mt-empty">Pick a model to filter features.</p>`;
      return;
    }
    box.innerHTML = DATA.features
      .map((feat) => ({ feat, s: featureState(feat) }))
      .filter(({ s }) => !(s.key === "no" && s.label === "Not this model"))
      .map(
        ({ feat, s }) => `<article class="mt-feat"><span class="mt-pill ${s.key}">${esc(s.label)}</span>
          <div><h3>${esc(feat.name)}</h3><p>${esc(s.detail)}</p>
          <span class="mt-trust mt-trust-${esc(s.trust)}">${esc(s.trustLabel)}</span></div></article>`
      )
      .join("");
  };

  const renderLimits = () => {
    const ul = $("mt-limits");
    const bits = [];
    if (!state.cc) {
      ul.innerHTML = `<li><b>Country first</b><p>Regional locks are the whole point of this page. Pick a country so we only show what applies there.</p></li>`;
      return;
    }
    const fsd = fsdRow();
    const eu = euRow();
    if (fsd) {
      bits.push(`<li><b>FSD in ${esc(countryName())}: ${esc(fsd.status)}</b><p>${esc(fsd.note)}</p>
        <span class="mt-meta">${fsd.source?.url ? `<a href="${esc(fsd.source.url)}">${esc(fsd.source.label || "Source")}</a>` : ""}</span></li>`);
    } else {
      bits.push(`<li><b>No FSD listing for ${esc(countryName())}</b><p>Treat Supervised FSD as unavailable until Tesla or a regulator says otherwise.</p></li>`);
    }
    if (eu) {
      bits.push(`<li><b>EU file: ${esc(eu.stage || eu.status)}</b><p>${esc(eu.note)} ${eu.regulator ? `Regulator: ${esc(eu.regulator)}.` : ""}</p></li>`);
    }
    if (regionOf(state.cc) === "EU") {
      bits.push(`<li><b>Europe is not the US stack</b><p>US cars can be on FSD 14.3.x with Collision Evasion. EU cars that are live are on Assisted Driving Basic (14.2.x). Same brand, different permission.</p></li>`);
      bits.push(`<li><b>Lighting and speed rules still apply</b><p>Intelligent Speed Assistance and automatic headlight leveling are EU car rules, not Tesla extras. Grey imports get caught on this.</p></li>`);
    }
    if (state.hw === "hw25") {
      bits.push(`<li><b>HW2.5 is a dead end for modern FSD</b><p>Tesla stopped selling FSD for HW2.5. Autopilot still works. Do not expect 14.x city driving.</p></li>`);
    }
    if (state.hw === "hw3" && regionOf(state.cc) === "NA") {
      bits.push(`<li><b>HW3 is on FSD Lite</b><p>Parking and start-from-park, not Collision Evasion. Tesla is not promising HW3 the full HW4 stack.</p></li>`);
    }
    ul.innerHTML = bits.join("");
  };

  const renderWhatsNew = () => {
    const ul = $("mt-whats-new");
    if (!ul) return;
    if (!state.model && !state.cc) {
      ul.innerHTML = "";
      return;
    }
    const items = [];
    const local = state.cc ? liveForCountry() : null;
    if (local?.newest) {
      items.push(`<li><span class="mt-pill yes">For this car</span><b>${esc(local.newest.v.id)} is the newest sample in ${esc(countryName())}</b>
        <p>${state.sw && cmpVer(state.sw, local.newest.v.id) < 0 ? `You are on ${esc(state.sw)}. This is a fleet sample, not Tesla’s owner email.` : "From the Teslascope sample for this country — not Tesla’s official owner notes."}</p>
        <span class="mt-meta">Vehicle-specific · Software Update Tracker</span></li>`);
    }
    const fsd = fsdRow();
    if (state.cc) {
      items.push(`<li><span class="mt-pill ${fsd && fsd.status === "live" ? "yes" : "locked"}">For this car</span><b>Driver assistance in ${esc(countryName())}</b>
        <p>${esc(fsd?.note || "No FSD listing for this country in the tracker. Treat Supervised FSD as unavailable until Tesla or a regulator says otherwise.")}</p>
        <span class="mt-meta">Vehicle-specific · FSD tracker</span></li>`);
    }
    items.push(`<li><span class="mt-pill no">Official lookup</span><b>Recalls for this VIN</b>
      <p>We do not invent recall lists from model and year. Tesla’s VIN recall search and NHTSA’s VIN lookup are official; this site is not.</p>
      <p><a href="https://www.tesla.com/vin-recall-search" rel="noopener">Tesla VIN recall search</a> · <a href="https://www.nhtsa.gov/recalls" rel="noopener">NHTSA recall lookup</a></p>
      <span class="mt-meta">Not a notice for this VIN · official sites</span></li>`);
    const modelName = (modelOf()?.name || "").toLowerCase();
    const general = deskStories.filter((a) => {
      const hay = `${a.title} ${a.summary} ${a.tag} ${a.topic}`.toLowerCase();
      if (!/tesla|fsd|software|recall|optimus|roadster|cyber/.test(hay)) return false;
      if (state.model === "CT") return /cybertruck|tesla/.test(hay);
      if (modelName && hay.includes(modelName.replace("model ", ""))) return true;
      return /tesla|fsd|software|owner/.test(hay);
    }).slice(0, 3);
    general.forEach((a) => {
      items.push(`<li><span class="mt-pill soon">General Tesla news</span><b><a href="${esc(a.url)}">${esc(a.title)}</a></b>
        <p>${esc(a.summary || "")}</p>
        <span class="mt-meta">Not specific to this car · Dispatch</span></li>`);
    });
    ul.innerHTML = items.join("");
    fetch("/data/intelligence/bundle.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).then((b) => {
      if (!b || !window.SDIntel) return;
      const topics = ["tesla-software", "fsd"];
      if (state.model === "RD") topics.push("roadster");
      const extra = window.SDIntel.filterChanges(b.changes, { topics, limit: 3 });
      if (!extra.length) return;
      ul.insertAdjacentHTML("beforeend", extra.map((c) =>
        `<li><span class="mt-pill soon">Tracker change</span><b><a href="${esc(c.href)}">${esc(c.title || c.field)}</a></b>
        <p>${esc(c.summary)}</p>
        <span class="mt-meta">${esc((window.SDIntel.EVIDENCE_LABEL && window.SDIntel.EVIDENCE_LABEL[c.evidence]) || c.evidence)} · not a notice for this VIN</span></li>`
      ).join(""));
    }).catch(() => {});
  };

  let swHistory = null;

  const renderWaves = () => {
    const ul = $("mt-waves");
    if (!ul) return;
    if (!state.cc) {
      ul.innerHTML = `<li><b>Pick a country</b><p>Waves are filtered to the Teslascope sample for that country. They are not a notice that this VIN is eligible.</p></li>`;
      return;
    }
    const fn = window.SDIntel && window.SDIntel.softwareWavesForCountry;
    if (!swHistory || !fn) {
      ul.innerHTML = `<li><b>Loading sample history</b><p>Teslascope snapshots for ${esc(countryName())} will appear here. A first-seen row is not an offer to this car.</p></li>`;
      return;
    }
    const waves = fn(swHistory, state.cc);
    if (!waves.length) {
      ul.innerHTML = `<li><b>No sample waves for ${esc(countryName())} yet</b><p>The saved Teslascope history has no first-seen or count-jump row for this country. That is not a statement about this VIN.</p></li>`;
      return;
    }
    ul.innerHTML = waves.slice(0, 6).map((w) =>
      `<li><span class="mt-pill soon">Sample only</span><b>${esc(w.version)} — ${w.type === "appeared" ? "first seen in this country sample" : "sample count jump"}</b>
        <p>${esc(w.summary)}</p>
        <span class="mt-meta">Teslascope sample · ${esc((w.at || "").slice(0, 10))} · not Tesla offering this build to this VIN</span></li>`
    ).join("");
  };

  const renderGuides = () => {
    const box = $("mt-guides");
    box.innerHTML = guides()
      .slice(0, 8)
      .map((g) => `<a class="mt-guide" href="${esc(g.href)}"><strong>${esc(g.title)}</strong><span>${esc(g.why)}</span></a>`)
      .join("");
  };

  const render = () => {
    hintHw();
    renderTiles();
    renderWhatsNew();
    renderUpdates();
    renderWaves();
    renderFeatures();
    renderLimits();
    renderGuides();
    writeStore();
    writeQuery();
    const stamp = $("mt-live");
    if (stamp) {
      const when = live?.updated || DATA.updated;
      stamp.textContent = `Saved on this device · never uploaded · fleet sample ${when}`;
    }
  };

  const bind = () => {
    $("mt-model").addEventListener("change", () => {
      state.model = $("mt-model").value;
      state.year = "";
      state.hw = "";
      hwSource = "";
      fillYears();
      fillHw();
      hintHw();
      render();
    });
    $("mt-year").addEventListener("change", () => {
      state.year = Number($("mt-year").value) || "";
      state.hw = "";
      hwSource = "";
      hintHw();
      render();
    });
    $("mt-hw").addEventListener("change", () => {
      state.hw = $("mt-hw").value;
      hwSource = state.hw ? "user" : "";
      render();
    });
    $("mt-sw").addEventListener("change", () => {
      state.sw = $("mt-sw").value;
      render();
    });
    $("mt-cc").addEventListener("change", () => {
      state.cc = $("mt-cc").value;
      render();
    });
    $("mt-clear").addEventListener("click", () => {
      state.model = state.year = state.hw = state.sw = state.cc = "";
      hwSource = "";
      $("mt-model").value = "";
      fillYears();
      fillHw();
      fillSw();
      fillCountries();
      render();
    });
  };

  const boot = () => {
    const saved = readStore() || {};
    const q = fromQuery();
    Object.assign(state, saved, q);
    if (state.hw) hwSource = "user";
    DATA.models.forEach((m) => $("mt-model").append(new Option(m.name, m.id)));
    $("mt-model").value = state.model;
    fillYears();
    fillHw();
    fillCountries();
    fillSw();
    const note = $("mt-note");
    if (note && DATA.note) note.textContent = DATA.note;
    bind();
    render();
    fetch("/updates-live.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        live = j;
        fillSw();
        render();
      })
      .catch(() => {});
    fetch("/data/updates-history.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        swHistory = j;
        renderWaves();
      })
      .catch(() => {});
    fetch("/data/articles.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        deskStories = (j && j.articles) || [];
        renderWhatsNew();
      })
      .catch(() => {});
  };

  boot();
})();
