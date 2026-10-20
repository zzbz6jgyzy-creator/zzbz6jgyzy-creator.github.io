(() => {
  const I = window.SDIntel;
  if (!I) return;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  const load = fetch("/data/intelligence/bundle.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  const paintFollow = (root, topics) => {
    if (!root) return;
    $$("[data-follow]", root).forEach((btn) => {
      const on = topics.indexOf(btn.getAttribute("data-follow")) >= 0;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  };

  const bindFollow = (root, onChange) => {
    if (!root) return;
    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-follow]");
      if (!btn) return;
      const id = btn.getAttribute("data-follow");
      const cur = I.followRead(localStorage);
      const next = cur.indexOf(id) >= 0 ? cur.filter((x) => x !== id) : cur.concat(id);
      I.followWrite(localStorage, next);
      paintFollow(root, next);
      onChange(next);
    });
  };

  const paintChanges = (box, bundle, topics) => {
    if (!box || !bundle) return;
    const since = topics.length ? I.followRead && null : null;
    const visit = (() => {
      try { return localStorage.getItem(I.VISIT_KEY); } catch (e) { return ""; }
    })();
    const filtered = I.filterChanges(bundle.changes, {
      topics: topics.length ? topics : null,
      since: topics.length && visit ? visit : null,
      limit: 8,
    });
    const rows = filtered.length ? filtered : I.filterChanges(bundle.changes, { topics: topics.length ? topics : null, limit: 8 });
    box.innerHTML = I.changesHtml(rows);
  };

  const cabBox = $("[data-cc-changes]");
  if (cabBox) {
    fetch("/data/robotaxi-tx.json", { cache: "no-cache" }).then((r) => r.json()).then((tx) => {
      cabBox.innerHTML = I.cybercabChangesHtml(tx.history);
    }).catch(() => {
      cabBox.innerHTML = '<p class="intel-empty">Texas Cybercab history could not load.</p>';
    });
  }

  const slBox = $("[data-sl-changes]");
  if (slBox) {
    fetch("/data/starlink-history.json", { cache: "no-cache" }).then((r) => r.json()).then((h) => {
      slBox.innerHTML = I.starlinkChangesHtml(h);
    }).catch(() => {
      slBox.innerHTML = '<p class="intel-empty">Starlink history could not load.</p>';
    });
  }

  load.then((bundle) => {
    if (!bundle) return;
    const topics = I.followRead(localStorage);
    const followRoot = $("[data-intel-follow]");
    if (followRoot && !followRoot.querySelector("[data-follow]")) {
      followRoot.innerHTML = I.TOPICS.map((t) =>
        `<button type="button" class="intel-chip" data-follow="${I.esc(t.id)}" aria-pressed="false">${I.esc(t.label)}</button>`
      ).join("");
    }
    paintFollow(followRoot, topics);
    bindFollow(followRoot, (next) => paintChanges($("[data-intel-changed]"), bundle, next));
    paintChanges($("[data-intel-changed]"), bundle, topics);

    $$("[data-intel]").forEach((el) => {
      const id = el.getAttribute("data-intel");
      const row = (bundle.freshness || []).find((x) => x.tracker === id);
      if (!row) return;
      el.innerHTML = I.freshnessHtml(row) +
        `<button type="button" class="intel-chip" data-follow="${I.esc(row.tracker === "launches" ? "spacex-launches" : row.tracker === "software" || row.tracker === "mytesla" ? "tesla-software" : (I.TRACKERS[id] && I.TRACKERS[id].topic) || id)}" aria-pressed="false">Follow</button>`;
      const t = I.followRead(localStorage);
      paintFollow(el, t);
      bindFollow(el, () => paintFollow(el, I.followRead(localStorage)));
    });

    const health = $("[data-intel-health]");
    if (health && bundle.health) {
      const h = bundle.health;
      health.innerHTML = `<div class="intel-grid">
        <div class="intel-card"><strong>${h.ok ? "OK" : "Issues"}</strong><span>Engine status</span></div>
        <div class="intel-card"><strong>${h.factCount}</strong><span>Sourced facts</span></div>
        <div class="intel-card"><strong>${h.changeCount}</strong><span>Sourced change rows</span></div>
        <div class="intel-card"><strong>${h.conflictCount}</strong><span>Conflicts kept, not overwritten</span></div>
      </div>
      <p class="intel-note">Generated ${I.esc(h.generatedAt)}. Notifications are not sent from this page.</p>
      <ul class="intel-list">${(h.issues || []).map((i) => `<li class="intel-item"><strong>${I.esc(i.level)}</strong><span class="intel-s">${I.esc(i.text)}</span></li>`).join("") || '<li class="intel-empty">No open engine errors.</li>'}</ul>
      <h2>Kept launch clocks</h2>
      ${I.conflictsHtml(bundle.conflicts)}
      <h2>Per-tracker freshness</h2>
      ${I.freshnessTableHtml(bundle.freshness)}`;
    }


    const promisesBox = $("[data-intel-promises]");
    if (promisesBox) {
      const topic = promisesBox.getAttribute("data-intel-promises");
      const asTable = promisesBox.hasAttribute("data-intel-table");
      fetch("/data/promises.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => {
        const rows = (d.promises || []).filter((p) => p.topic === topic);
        if (asTable) {
          promisesBox.innerHTML = `<p class="intel-note">Sourced promises only. No invented progress percentage.</p>
            <div class="intel-compare"><table>
            <thead><tr><th>Promise</th><th>Said</th><th>Deadline</th><th>Status</th><th>Evidence</th></tr></thead>
            <tbody>${rows.map((p) => {
              const ev = (p.evidence && p.evidence[0]) || {};
              return `<tr id="${I.esc(p.id)}"><td><b>${I.esc(p.title)}</b></td><td>${I.esc(p.said_on || "")}</td><td>${I.esc(p.deadline || "—")}</td><td>${I.esc(p.status)}</td><td>${I.esc(ev.text || "")}${p.source && p.source.url ? ` <a href="${I.esc(p.source.url)}" rel="noopener">${I.esc(p.source.outlet || "Source")}</a>` : ""}</td></tr>`;
            }).join("")}</tbody></table></div>`;
          return;
        }
        promisesBox.innerHTML = I.changesHtml(rows.map((p) => ({
          topic: topic === "Roadster" ? "roadster" : topic === "Optimus" ? "optimus" : "promises",
          tracker: "promises",
          title: p.title,
          summary: p.status + (p.deadline ? " · deadline " + p.deadline : "") + (p.quote ? " — " + p.quote : ""),
          evidence: p.status === "Delivered" || p.status === "Delivered late" ? "independently_corroborated" : p.status === "Missed" ? "historical" : "company_claim",
          at: p.last_verified || p.said_on,
          href: "/promise-tracker.html#" + p.id,
          source: p.source && p.source.outlet,
        })));
      }).catch(() => {});
    }

    const wavesBox = $("[data-intel-waves]");
    const waveSelect = $("[data-intel-wave-country]");
    const paintWaves = (history, cc) => {
      if (!wavesBox) return;
      if (!cc) {
        wavesBox.innerHTML = I.wavesHtml(bundle.changes);
        return;
      }
      wavesBox.innerHTML = I.countryWavesHtml(I.softwareWavesForCountry(history, cc), cc);
    };
    if (wavesBox) wavesBox.innerHTML = I.wavesHtml(bundle.changes);
    if (waveSelect) {
      fetch("/data/updates-history.json", { cache: "no-cache" }).then((r) => r.json()).then((history) => {
        const last = ((history && history.snapshots) || []).slice().sort((a, b) => String(a.t).localeCompare(String(b.t))).pop();
        const counts = {};
        Object.keys((last && last.v) || {}).forEach((id) => {
          const row = last.v[id];
          if (!row || !Array.isArray(row) || !row[1]) return;
          Object.keys(row[1]).forEach((cc) => { counts[cc] = (counts[cc] || 0) + (Number(row[1][cc]) || 0); });
        });
        const codes = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
        const cur = waveSelect.value;
        waveSelect.innerHTML = '<option value="">All countries in the sample</option>' + codes.map((cc) =>
          `<option value="${I.esc(cc)}">${I.esc((I.COUNTRY_NAMES && I.COUNTRY_NAMES[cc]) || cc)} (${counts[cc]})</option>`
        ).join("");
        if (cur) waveSelect.value = cur;
        paintWaves(history, waveSelect.value);
        waveSelect.addEventListener("change", () => paintWaves(history, waveSelect.value));
      }).catch(() => {});
    }

    const dailyBox = $("[data-intel-daily]");
    if (dailyBox) {
      const visit = (() => { try { return localStorage.getItem(I.VISIT_KEY); } catch (e) { return ""; } })();
      const followed = I.followRead(localStorage);
      const sinceRows = I.filterChanges(bundle.changes, { since: visit || null, limit: 8 });
      const followRows = I.filterChanges(bundle.changes, { topics: followed.length ? followed : null, limit: 8 });
      dailyBox.innerHTML =
        `<h2>Since your last visit</h2>${I.changesHtml(sinceRows)}` +
        `<h2>Followed topics</h2>${followed.length ? I.changesHtml(followRows) : '<p class="intel-empty">Follow topics above. Anonymous browsing still works.</p>'}`;
    }

    try { localStorage.setItem(I.VISIT_KEY, bundle.generatedAt); } catch (e) {}
  });
})();
