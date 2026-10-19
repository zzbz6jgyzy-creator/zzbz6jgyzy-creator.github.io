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
        <div class="intel-card"><strong>${h.factCount}</strong><span>Canonical facts</span></div>
        <div class="intel-card"><strong>${h.changeCount}</strong><span>Sourced change rows</span></div>
        <div class="intel-card"><strong>${h.conflictCount}</strong><span>Conflicts kept, not overwritten</span></div>
      </div>
      <p class="intel-note">Generated ${I.esc(h.generatedAt)}. Notifications are not sent from this page.</p>
      <ul class="intel-list">${(h.issues || []).map((i) => `<li class="intel-item"><strong>${I.esc(i.level)}</strong><span class="intel-s">${I.esc(i.text)}</span></li>`).join("") || '<li class="intel-empty">No open engine errors.</li>'}</ul>`;
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
    if (wavesBox) wavesBox.innerHTML = I.wavesHtml(bundle.changes);

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

    const digestBox = $("[data-intel-digest]");
    const enable = $("[data-intel-alerts-enable]");
    const previewBtn = $("[data-intel-alerts-preview]");
    const testBtn = $("[data-intel-alerts-test]");
    const paintDigest = (preview) => {
      if (digestBox) digestBox.innerHTML = I.digestHtml(preview);
    };
    if (enable) {
      enable.checked = I.alertRead(localStorage).enabled;
      enable.addEventListener("change", () => {
        const cur = I.alertRead(localStorage);
        I.alertWrite(localStorage, { ...cur, enabled: enable.checked });
      });
    }
    if (previewBtn) {
      previewBtn.addEventListener("click", () => {
        paintDigest(I.digestPreview(bundle.changes, I.followRead(localStorage), bundle.generatedAt));
      });
    }
    if (testBtn) {
      testBtn.addEventListener("click", () => {
        const cur = I.alertRead(localStorage);
        I.alertWrite(localStorage, { ...cur, enabled: true });
        if (enable) enable.checked = true;
        const result = I.alertEnqueue(localStorage, bundle.changes, I.followRead(localStorage));
        const queued = I.alertRead(localStorage).items;
        paintDigest({
          mode: "preview",
          sent: result.sent === 0 ? false : true,
          subject: "Test queue — " + result.queued + " new rows, " + result.sent + " sent",
          items: queued.slice(0, 12).map((c) => ({
            title: c.title,
            summary: c.summary,
            evidence: (I.EVIDENCE_LABEL && I.EVIDENCE_LABEL[c.evidence]) || c.evidence,
            at: c.at,
          })),
          disclaimer: "Queued in this browser only. sent=" + result.sent + ". No email or push left this machine.",
        });
      });
    }
    if (digestBox && !digestBox.innerHTML) {
      paintDigest(I.digestPreview(bundle.changes, I.followRead(localStorage), bundle.generatedAt));
    }

    try { localStorage.setItem(I.VISIT_KEY, bundle.generatedAt); } catch (e) {}
  });
})();
