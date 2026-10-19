(() => {
  "use strict";
  const D = window.FSD_EUROPE;
  if (!D) return;
  const T = window.TCMV_MEETINGS || {};
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EU = D.thresholds.euPopulationM, NEED_S = D.thresholds.statesNeeded, NEED_P = D.thresholds.populationNeeded;
  const C = D.countries.slice().sort((a, b) => a.name.localeCompare(b.name));
  const by = new Map(C.map((c) => [c.code, c]));
  const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const tzShort = (() => { try { return new Intl.DateTimeFormat("en-GB", { timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName").value; } catch (e) { return ""; } })();
  // Date-only facts: show the calendar day as published (no zone shift).
  const fmt = (iso, opt) => iso ? new Date(iso + "T12:00:00").toLocaleDateString(undefined, opt || { day: "numeric", month: "short", year: "numeric" }) : "";
  const STAGES = [
    ["none", "No action"], ["testing", "Testing"], ["review", "Under review"],
    ["announced", "Announced"], ["recognised", "Recognised"], ["live", "Rollout live"],
  ];
  const stageName = Object.fromEntries(STAGES);
  const stageOf = (c) => c.stage || (c.status === "approved" ? "recognised" : c.status === "review" ? "review" : "none");
  const cls = (c) => ({ live: "s-live", recognised: "s-rec", announced: "s-rev", review: "s-rev", testing: "s-test", none: "s-none" }[stageOf(c)] || "s-none");
  const approved = C.filter((c) => c.status === "approved");
  const sum = (arr) => arr.reduce((a, c) => a + (c.pop || 0), 0);
  const pct = (arr) => (sum(arr) / EU) * 100;

  $("fsd-updated").textContent = "Data checked " + fmt(D.updated);
  $("fsd-note").textContent = D.note;
  $("f2-eupop").textContent = EU;
  $("f2-tz").textContent = (TZ + (tzShort ? ", " + tzShort : "")) || "local";

  /* ---------- 1. Double-majority meter + what-if ---------- */
  const what = new Set();
  const countUp = (el, to, dec, suf) => {
    if (RM) { el.textContent = to.toFixed(dec) + suf; return; }
    const t0 = performance.now(), from = parseFloat(el.textContent) || 0;
    const step = (t) => { const k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3); el.textContent = (from + (to - from) * e).toFixed(dec) + suf; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const meters = { states: document.querySelector('.f2-meter[data-k="states"]'), pop: document.querySelector('.f2-meter[data-k="pop"]') };
  const renderMeter = () => {
    const extra = C.filter((c) => what.has(c.code));
    const s0 = approved.length, s1 = s0 + extra.length, p0 = pct(approved), p1 = p0 + pct(extra);
    meters.states.querySelector(".f2-fill").style.width = (s0 / 27) * 100 + "%";
    meters.states.querySelector(".f2-what").style.cssText = `left:${(s0 / 27) * 100}%;width:${(extra.length / 27) * 100}%`;
    meters.pop.querySelector(".f2-fill").style.width = Math.min(100, p0) + "%";
    meters.pop.querySelector(".f2-what").style.cssText = `left:${p0}%;width:${Math.min(100 - p0, pct(extra))}%`;
    $("f2-st-l").textContent = (extra.length ? `${s0} + ${extra.length} = ${s1}` : s0) + " / 15 needed";
    $("f2-pp-l").textContent = (extra.length ? `${p0.toFixed(1)}% → ${p1.toFixed(1)}%` : p0.toFixed(1) + "%") + " / 65% needed";
    const okS = s1 >= NEED_S, okP = p1 >= NEED_P;
    const v = $("f2-verdict");
    v.className = "f2-verdict " + (okS && okP ? "is-pass" : "is-fail");
    v.textContent = okS && okP
      ? (extra.length ? "With these countries, both majorities are met. The vote would pass." : "Both majorities met.")
      : `${extra.length ? "With these countries: " : "Today: "}${okS ? "states ✓" : `${NEED_S - s1} more state${NEED_S - s1 === 1 ? "" : "s"}`}, ${okP ? "population ✓" : `${(NEED_P - p1).toFixed(1)} points of population short`}.`;
    document.querySelectorAll("#f2-chips button").forEach((b) => b.setAttribute("aria-pressed", String(what.has(b.dataset.code))));
  };
  $("f2-count").textContent = "0";
  countUp($("f2-count"), approved.length, 0, "");
  $("f2-popline").textContent = `${pct(approved).toFixed(1)}% of the EU population · ${C.filter((c) => c.rolloutLive).length} with rollout live`;
  const open = C.filter((c) => c.status !== "approved").sort((a, b) => b.pop - a.pop);
  $("f2-chips").innerHTML = open.map((c) => `<button type="button" data-code="${c.code}" aria-pressed="false" class="${cls(c)}">${esc(c.name)} <small>${((c.pop / EU) * 100).toFixed(1)}%</small></button>`).join("");
  $("f2-chips").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    what.has(b.dataset.code) ? what.delete(b.dataset.code) : what.add(b.dataset.code);
    document.querySelectorAll("[data-scen]").forEach((x) => x.setAttribute("aria-pressed", "false"));
    renderMeter();
  });
  const SUPPORT = /support|positive|fast-track|announced recognition/i;
  document.querySelector(".f2-scen").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    what.clear();
    if (b.dataset.scen === "support") open.filter((c) => SUPPORT.test(c.position || "")).forEach((c) => what.add(c.code));
    if (b.dataset.scen === "review") open.filter((c) => ["review", "announced"].includes(stageOf(c)) || SUPPORT.test(c.position || "")).forEach((c) => what.add(c.code));
    document.querySelectorAll("[data-scen]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    renderMeter();
  });
  renderMeter();

  /* ---------- 6. TCMV countdown ---------- */
  const next = (T.meetings || []).filter((m) => m.outcome === "upcoming" && m.date).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (next) {
    const [y, mo, d] = next.date.split("-").map(Number);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.round((new Date(y, mo - 1, d) - today) / 864e5);
    const exact = !next.dateLabel || /\d/.test(next.dateLabel.replace(/\d{4}/, ""));
    countUp($("f2-days"), Math.max(0, days), 0, "");
    $("f2-days-l").textContent = exact ? "days" : `days to ${fmt(next.date, { day: "numeric", month: "short" })}`;
    $("f2-tcmv-l").textContent = exact ? `${fmt(next.date)} · ${next.fsdItem || ""}` : `${next.dateLabel} at the earliest. Exact date and agenda not yet published, and a vote is not confirmed.`;
  } else $("f2-tcmv-l").textContent = "No upcoming meeting listed yet.";

  /* ---------- 3. Your country ---------- */
  const TZMAP = { Vienna: "AT", Brussels: "BE", Sofia: "BG", Nicosia: "CY", Famagusta: "CY", Prague: "CZ", Berlin: "DE", Busingen: "DE", Copenhagen: "DK", Tallinn: "EE", Madrid: "ES", Ceuta: "ES", Canary: "ES", Helsinki: "FI", Paris: "FR", Athens: "GR", Zagreb: "HR", Budapest: "HU", Dublin: "IE", Rome: "IT", Vilnius: "LT", Luxembourg: "LU", Riga: "LV", Malta: "MT", Amsterdam: "NL", Warsaw: "PL", Lisbon: "PT", Madeira: "PT", Azores: "PT", Bucharest: "RO", Stockholm: "SE", Ljubljana: "SI", Bratislava: "SK" };
  const LANG = { de: "DE", fr: "FR", it: "IT", es: "ES", pl: "PL", nl: "NL", pt: "PT", ro: "RO", el: "GR", cs: "CZ", sk: "SK", sl: "SI", hr: "HR", hu: "HU", sv: "SE", fi: "FI", da: "DK", et: "EE", lv: "LV", lt: "LT", bg: "BG", mt: "MT", ga: "IE" };
  const detect = () => {
    try { const s = localStorage.getItem("f2-country"); if (s && by.has(s)) return [s, "saved"]; } catch (e) {}
    const city = TZ.split("/").pop();
    if (TZ.startsWith("Europe/") || TZ.startsWith("Atlantic/")) { const c = TZMAP[city] || TZMAP[TZ.split("/")[1]]; if (c) return [c, "time zone"]; }
    for (const l of navigator.languages || [navigator.language || ""]) {
      const reg = (l.split("-")[1] || "").toUpperCase();
      if (by.has(reg)) return [reg, "browser language"];
    }
    for (const l of navigator.languages || []) { const c = LANG[l.split("-")[0]]; if (c) return [c, "browser language"]; }
    return ["", ""];
  };
  const [guess, how] = detect();
  const pick = $("f2-pick");
  pick.innerHTML = (guess ? "" : '<option value="">Choose a country…</option>') + C.map((c) => `<option value="${c.code}">${esc(c.name)}</option>`).join("");
  const srcList = (c, sep = " · ") => (c.sources || []).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(sep);
  const lastChange = (code) => (D.changelog || []).find((e) => e.code === code);
  const card = (code, via) => {
    const c = by.get(code), el = $("f2-card");
    if (!c) { el.innerHTML = `<p class="f2-fine">We couldn’t tell where you are. Choose an EU country above to see where it stands.</p>`; return; }
    const st = stageOf(c), lc = lastChange(code), idx = STAGES.findIndex((s) => s[0] === st);
    el.className = "f2-card " + cls(c);
    el.innerHTML = `
      <div class="f2-card-top"><span class="f2-flag" aria-hidden="true">${code}</span><div><h3>${esc(c.name)}</h3>
      <p class="f2-badge">${esc(stageName[st])}${c.date ? " · since " + fmt(c.date) : ""}</p></div>${via ? `<span class="f2-via">Detected from your ${esc(via)}</span>` : ""}</div>
      ${!c.rolloutLive && (c.status === "approved" || st === "recognised") ? '<p class="f2-honest">Recognised is not live. A ministry yes is not the same as owners receiving the software.</p>' : ""}
      <ol class="f2-steps" aria-label="Stage ${idx + 1} of ${STAGES.length}">${STAGES.map((s, i) => `<li class="${i < idx ? "done" : i === idx ? "now" : ""}"><span>${s[1]}</span></li>`).join("")}</ol>
      <dl class="f2-dl">
        <div><dt>Regulator</dt><dd>${esc(c.regulator) || '<i class="unc">Unconfirmed</i>'}</dd></div>
        <div><dt>Stated position</dt><dd>${esc(c.position) || '<i class="unc">No public statement found</i>'}</dd></div>
        <div><dt>Next step</dt><dd>${esc(c.nextStep) || '<i class="unc">Unconfirmed</i>'}</dd></div>
        <div><dt>Latest</dt><dd>${lc ? `${fmt(lc.date)}: ${esc(lc.text)}` : esc(c.note)}</dd></div>
      </dl>
      <p class="f2-src">Sources: ${srcList(c) || '<i class="unc">none yet</i>'}</p>`;
  };
  const setCountry = (code, via, save) => {
    pick.value = code; card(code, via);
    if (save) { try { localStorage.setItem("f2-country", code); } catch (e) {} }
    document.querySelectorAll("#f2-land .is-eu, #f2-pins circle").forEach((p) => p.classList.toggle("is-sel", p.dataset.code === code));
  };
  pick.addEventListener("change", () => setCountry(pick.value, "", true));

  /* ---------- 2. Animated map + scrubber ---------- */
  const land = $("f2-land"), pins = $("f2-pins"), tip = $("f2-tip");
  const start = new Date("2026-04-01T12:00:00"), end = new Date(D.updated + "T12:00:00");
  const span = Math.round((end - start) / 864e5);
  const scrub = $("f2-scrub"); scrub.max = span; scrub.value = span;
  const dayIso = (n) => { const d = new Date(start.getTime() + n * 864e5); return d.toISOString().slice(0, 10); };
  const paint = (n) => {
    const iso = dayIso(n), full = n >= span;
    let k = 0;
    C.forEach((c) => {
      const on = c.date && c.date <= iso;
      if (on) k++;
      const s = full ? cls(c) : on ? "s-rec" : "s-none";
      document.querySelectorAll(`[data-code="${c.code}"].m-node`).forEach((p) => { p.classList.remove("s-live", "s-rec", "s-rev", "s-test", "s-none"); p.classList.add(s); p.classList.toggle("is-new", on && !full && c.date > dayIso(n - 12)); });
    });
    $("f2-stamp-d").textContent = fmt(full ? D.updated : iso);
    $("f2-stamp-n").textContent = `${k} of 27 approved`;
    $("f2-scrub-l").textContent = full ? "Today" : fmt(iso, { day: "numeric", month: "short" });
    scrub.setAttribute("aria-valuetext", `${fmt(iso)}: ${k} approved`);
  };
  const tipAt = (c, x, y) => { tip.hidden = false; tip.innerHTML = `<b>${esc(c.name)}</b><span>${esc(stageName[stageOf(c)])}${c.date ? " · " + fmt(c.date) : ""}</span>`; tip.style.left = x + "px"; tip.style.top = y + "px"; };
  const bind = (el, c) => {
    el.classList.add("m-node"); el.dataset.code = c.code; el.setAttribute("tabindex", "0"); el.setAttribute("role", "button");
    el.setAttribute("aria-label", `${c.name}: ${stageName[stageOf(c)]}`);
    el.addEventListener("pointermove", (e) => { const r = $("f2-map").parentNode.getBoundingClientRect(); tipAt(c, e.clientX - r.left, e.clientY - r.top); });
    el.addEventListener("pointerleave", () => { tip.hidden = true; });
    const go = () => { setCountry(c.code, "", true); $("your-country").scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" }); };
    el.addEventListener("click", go);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  };
  let timer = null;
  const play = $("f2-play");
  const stop = () => { clearInterval(timer); timer = null; play.textContent = "▶"; play.setAttribute("aria-label", "Play"); };
  play.addEventListener("click", () => {
    if (timer) return stop();
    let n = +scrub.value >= span ? 0 : +scrub.value;
    play.textContent = "❚❚"; play.setAttribute("aria-label", "Pause");
    // Reduced motion: jump approval to approval instead of animating day by day.
    const marks = [...new Set(C.filter((c) => c.date).map((c) => Math.round((new Date(c.date + "T12:00:00") - start) / 864e5)))].sort((a, b) => a - b).concat(span);
    timer = setInterval(() => {
      n = RM ? (marks.find((m) => m > n) ?? span) : Math.min(span, n + 2);
      scrub.value = n; paint(n);
      if (n >= span) stop();
    }, RM ? 900 : 60);
  });
  scrub.addEventListener("input", () => { stop(); paint(+scrub.value); });
  fetch("/assets/europe-fsd-v2.svg?v=202610142030").then((r) => r.text()).then((txt) => {
    const doc = new DOMParser().parseFromString(txt, "image/svg+xml");
    doc.querySelectorAll("path").forEach((p) => {
      const n = document.createElementNS("http://www.w3.org/2000/svg", "path");
      n.setAttribute("d", p.getAttribute("d"));
      const code = p.getAttribute("data-code");
      n.setAttribute("class", p.getAttribute("class"));
      land.append(n);
      const c = by.get(code);
      if (c && p.classList.contains("is-eu")) {
        bind(n, c);
        if (["MT", "LU", "CY"].includes(code)) {
          const ci = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          ci.setAttribute("cx", p.getAttribute("data-cx")); ci.setAttribute("cy", p.getAttribute("data-cy")); ci.setAttribute("r", "7");
          ci.setAttribute("class", "m-pin"); pins.append(ci); bind(ci, c);
        }
      }
    });
    if (!pins.querySelector('[data-code="MT"]')) { // Malta can drop out at this scale
      const ci = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      ci.setAttribute("cx", "548"); ci.setAttribute("cy", "748"); ci.setAttribute("r", "7"); ci.setAttribute("class", "m-pin"); pins.append(ci); bind(ci, by.get("MT"));
    }
    paint(span);
    setCountry(guess, how, false);
  }).catch(() => { $("f2-stamp-n").textContent = "Map failed to load"; });

  /* ---------- 4. Pipeline ---------- */
  $("f2-pipe").innerHTML = STAGES.map(([k, label]) => {
    const list = C.filter((c) => stageOf(c) === k).sort((a, b) => b.pop - a.pop);
    return `<div class="f2-col f2-col-${k}"><h3>${label}<span>${list.length}</span></h3><ul>${list.map((c) => `<li><button type="button" data-code="${c.code}" class="${cls(c)}">${esc(c.name)}</button></li>`).join("") || '<li class="f2-empty">—</li>'}</ul></div>`;
  }).join("");
  $("f2-pipe").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; setCountry(b.dataset.code, "", true); $("your-country").scrollIntoView({ behavior: RM ? "auto" : "smooth" }); });

  /* ---------- 5. Change log ---------- */
  const LOG = (D.changelog || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const TYPES = { all: "All", approval: "Approvals", statement: "Statements", tcmv: "TCMV", testing: "Testing", rename: "Rename" };
  let lf = "all", lmax = 6;
  $("f2-log-f").innerHTML = Object.entries(TYPES).filter(([k]) => k === "all" || LOG.some((e) => e.type === k)).map(([k, v]) => `<button type="button" data-t="${k}" aria-pressed="${k === "all"}">${v}</button>`).join("");
  const logHonesty = (e) => {
    if (e.honesty) return e.honesty;
    const c = by.get(e.code);
    if (e.type === "approval" && c && !c.rolloutLive) return "Recognition is not a customer rollout. Owners have not been shown receiving the software.";
    if (e.type === "statement" && /Tesla Europe|Tesla says/i.test(e.text) && c && !c.rolloutLive) return "Company claim. “Soon” is not a date.";
    return "";
  };
  const renderLog = () => {
    const rows = LOG.filter((e) => lf === "all" || e.type === lf);
    $("f2-log").innerHTML = rows.slice(0, lmax).map((e) => {
      const c = by.get(e.code);
      const note = logHonesty(e);
      const claim = e.evidence === "company_claim" || /Tesla Europe/i.test(e.text);
      return `<li class="t-${e.type}"><time datetime="${e.date}">${fmt(e.date)}</time><div><span class="f2-tag">${esc(TYPES[e.type] || e.type)}${c ? " · " + esc(c.name) : ""}${claim ? " · company claim" : ""}</span><p>${esc(e.text)}</p>${note ? `<p class="f2-honest">${esc(note)}</p>` : ""}${e.source ? `<a href="${esc(e.source)}" target="_blank" rel="noopener">Source</a>` : ""}</div></li>`;
    }).join("");
    $("f2-log-more").hidden = rows.length <= lmax;
  };
  $("f2-log-f").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; lf = b.dataset.t; lmax = 6; document.querySelectorAll("#f2-log-f button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); renderLog(); });
  $("f2-log-more").addEventListener("click", () => { lmax += 10; renderLog(); });
  renderLog();

  /* ---------- Table ---------- */
  const order = { live: 0, recognised: 1, announced: 2, review: 3, testing: 4, none: 5 };
  document.querySelector("#f2-table tbody").innerHTML = C.slice().sort((a, b) => order[stageOf(a)] - order[stageOf(b)] || (a.date || "z").localeCompare(b.date || "z") || b.pop - a.pop).map((c) => `
    <tr><th scope="row"><span class="f2-dot ${cls(c)}"></span>${esc(c.name)}</th><td data-l="Status">${esc(stageName[stageOf(c)])}</td><td data-l="Since">${c.date ? fmt(c.date) : "—"}</td>
    <td data-l="Regulator">${esc(c.regulator) || '<i class="unc">Unconfirmed</i>'}</td><td data-l="Position">${esc(c.position) || '<i class="unc">No statement found</i>'}</td><td data-l="Next step">${esc(c.nextStep) || '<i class="unc">Unconfirmed</i>'}</td><td data-l="Sources" class="f2-srcs">${srcList(c, "") || "—"}</td></tr>`).join("");

  /* Keep the newsletter block (added by newsletter-cta.js) beside the change log. */
  const moveNl = () => { const nl = document.getElementById("newsletter"); if (nl && !nl.dataset.f2) { nl.dataset.f2 = "1"; document.querySelector(".f2-logwrap").parentNode.after(nl); return true; } return false; };
  if (!moveNl()) { const mo = new MutationObserver(() => { if (moveNl()) mo.disconnect(); }); mo.observe(document.querySelector("main"), { childList: true }); setTimeout(() => mo.disconnect(), 8000); }
})();
