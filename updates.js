(() => {
  const curated = window.TESLA_UPDATES;
  if (!curated) return;

  const LIVE_URL = "/updates-live.json";
  const STALE_MS = 90 * 60 * 1000;

  const statusLabel = {
    early: "Early wave",
    rolling: "Rolling out",
    wide: "On cars now",
    limited: "Limited",
  };

  const kindLabel = {
    cabin: "Cabin",
    fsd: "FSD",
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(/T/.test(iso) ? iso : `${iso}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatStamp = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    });
  };

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const norm = (s) => String(s || "").trim().toLowerCase();

  const countryName = (code) => {
    const row = curated.countries.find((c) => c.code === code);
    return row ? row.name : code;
  };

  const matchCountry = (query) => {
    const q = norm(query);
    if (!q) return null;
    return (
      curated.countries.find((c) => {
        if (norm(c.code) === q || norm(c.name) === q) return true;
        return (c.aliases || []).some((a) => norm(a) === q || norm(a).includes(q) || q.includes(norm(a)));
      }) ||
      curated.countries.find((c) => norm(c.name).includes(q) || q.includes(norm(c.code)))
    );
  };

  const matchVersion = (version, query) => {
    const q = norm(query).replace(/^v/, "");
    if (!q) return true;
    const id = norm(version.id);
    const family = norm(version.family);
    const fsd = norm(version.fsd || "").replace(/^v/, "");
    if (id === q || family === q) return true;
    if (id.startsWith(q) || family.startsWith(q)) return true;
    if (q.length >= 4 && (id.includes(q) || family.includes(q))) return true;
    if (q.length >= 4 && fsd.includes(q)) return true;
    return false;
  };

  const featureText = (item) => {
    if (!item) return "";
    if (typeof item === "string") return item;
    const title = item.title || "";
    const text = item.text || "";
    if (title && text && !text.toLowerCase().startsWith(title.toLowerCase())) {
      return `${title} — ${text}`;
    }
    return text || title;
  };

  const mergeFeatures = (base, live) => {
    const out = [...(base || [])];
    const blob = out.join(" ").toLowerCase();
    (live || []).forEach((item) => {
      const title = typeof item === "string" ? item : item.title || "";
      const line = featureText(item);
      if (!line) return;
      if (title && blob.includes(title.toLowerCase())) return;
      if (out.some((existing) => norm(existing) === norm(line))) return;
      out.push(line);
    });
    return out.slice(0, 8);
  };

  const isFsdRow = (row, features) => {
    if (row.fsd || row.fsdHw3 || row.fsdHw4) return true;
    return (features || []).some((line) => /fsd|full self-driving/i.test(line));
  };

  const fsdLabel = (row) => {
    const parts = [row.fsdHw4, row.fsdHw3, row.fsd].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  };

  const liveStatus = (row) => {
    const percent = Number(row.percent) || 0;
    const countries = row.countries || [];
    const first = Date.parse(row.firstSeen || row.date || "");
    const ageDays = Number.isNaN(first) ? 99 : (Date.now() - first) / 86400000;
    if (countries.length <= 2 && percent < 8) return "limited";
    if (percent < 3 || ageDays <= 2) return "early";
    if (percent < 12) return "rolling";
    return "wide";
  };

  const reachedFromLive = (row) => {
    const names = (row.countries || []).slice(0, 8).map(countryName);
    const extra = (row.countries || []).length - names.length;
    const where = names.length ? names.join(", ") + (extra > 0 ? ` +${extra}` : "") : "a small tracked slice";
    const pending = row.pending ? ` ${row.pending} more waiting to install.` : "";
    return `${row.count} of ${row.fleet} tracked cars (${row.percent}%). Seen in ${where}.${pending}`;
  };

  const fromLive = (row, base) => {
    const liveFeatures = (row.features || []).map(featureText).filter(Boolean);
    const features = mergeFeatures(base?.features, row.features);
    const fsd = base?.fsd || fsdLabel(row);
    const kind = base?.kind || (isFsdRow(row, liveFeatures) ? "fsd" : "cabin");
    return {
      id: row.id,
      family: base?.family || row.id.split(".").slice(0, 2).join("."),
      date: row.date || base?.date || "",
      kind,
      status: row.count != null ? liveStatus(row) : base?.status || "rolling",
      headline: base?.headline || liveFeatures[0]?.split(" — ")[0] || `Build ${row.id}`,
      summary:
        base?.summary ||
        (fsd ? `FSD ${fsd} on ${row.id}.` : `Cabin build ${row.id}, from Tesla’s public notes as cars report in.`),
      features,
      fsd,
      reached: row.count != null ? reachedFromLive(row) : base?.reached || "",
      countries: row.countries?.length ? row.countries : base?.countries || [],
      live: {
        count: row.count,
        percent: row.percent,
        lastSeen: row.lastSeen,
      },
    };
  };

  const mergeData = (live) => {
    const curatedMap = new Map(curated.versions.map((row) => [row.id, row]));
    const liveRows = live?.versions || [];
    const liveMap = new Map(liveRows.map((row) => [row.id, row]));
    const versions = [];
    const seen = new Set();
    liveRows.forEach((row) => {
      versions.push(fromLive(row, curatedMap.get(row.id)));
      seen.add(row.id);
    });
    curated.versions.forEach((row) => {
      if (seen.has(row.id)) return;
      versions.push({ ...row, live: null });
    });
    versions.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)));
    return { live, versions };
  };

  const setStatus = (live) => {
    const line = document.getElementById("updates-updated");
    if (!line) return;
    const stamp = live?.updated ? formatStamp(live.updated) : formatDate(curated.updated);
    const age = live?.updated ? Date.now() - Date.parse(live.updated) : Infinity;
    const fresh = Number.isFinite(age) && age < STALE_MS;
    line.innerHTML = "";
    const dot = document.createElement("span");
    dot.className = `news-dot${fresh ? " is-live" : " is-stale"}`;
    const text = document.createElement("span");
    text.textContent = live
      ? `Teslascope ${fresh ? "live snapshot" : "snapshot"} · ${stamp} · ${live.fleet.toLocaleString("en-GB")} tracked cars`
      : `Desk notes · ${stamp}`;
    line.append(dot, text);
  };

  const fillStats = (bundle) => {
    const versions = bundle.versions;
    const raw = bundle.live?.versions || [];
    const latest = bundle.live?.latest
      ? versions.find((row) => row.id === bundle.live.latest) || versions[0]
      : versions[0];
    const ireland = versions.find((row) => row.countries.includes("IE"));
    const na = raw.find((row) => row.fsdHw4);
    const europeCodes = new Set(["NL", "BE", "DE", "FR", "IE", "GB", "IT", "ES", "PT", "AT", "CH", "DK", "NO", "SE", "FI", "PL", "CZ", "SK", "SI", "LT", "EE", "HR", "HU", "GR"]);
    const europe = raw.find((row) => {
      const feats = (row.features || []).map(featureText);
      const eu = (row.countries || []).some((code) => europeCodes.has(code));
      return isFsdRow(row, feats) && eu && !row.fsdHw4;
    });
    setText("stat-latest", latest?.id || "—");
    setText("stat-ireland", ireland?.id || "—");
    setText("stat-fsd-na", na?.fsdHw4 || "—");
    setText("stat-fsd-eu", europe?.id || "—");

    const fleet = document.getElementById("updates-fleet");
    if (!fleet || !bundle.live?.versions) return;
    fleet.replaceChildren();
    bundle.live.versions
      .slice()
      .sort((a, b) => (b.percent || 0) - (a.percent || 0) || (b.count || 0) - (a.count || 0))
      .filter((row) => row.percent > 0)
      .slice(0, 6)
      .forEach((row) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "updates-fleet-chip";
        btn.dataset.version = row.id;
        btn.innerHTML = `<strong>${escapeHtml(row.id)}</strong><span>${row.percent}%</span>`;
        fleet.append(btn);
      });
  };

  const renderFsdLines = () => {
    const box = document.getElementById("updates-fsd-lines");
    if (!box) return;
    box.replaceChildren();
    curated.fsdNow.lines.forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      box.append(p);
    });
  };

  const boot = async () => {
    let live = null;
    try {
      const res = await fetch(LIVE_URL, { cache: "no-store" });
      if (res.ok) live = await res.json();
    } catch {
      live = null;
    }
    const bundle = mergeData(live);
    setStatus(live);
    setText("updates-note", curated.note);
    renderFsdLines();
    fillStats(bundle);
    renderList(bundle);
  };

  const list = document.getElementById("updates-list");
  const search = document.getElementById("updates-search");
  const versionInput = document.getElementById("updates-version");
  const lookup = document.getElementById("updates-lookup");
  const chips = document.querySelectorAll("[data-updates-country]");
  const kindButtons = document.querySelectorAll("[data-updates-kind]");
  const empty = document.getElementById("updates-empty");

  let countryCode = "IE";
  let kind = "all";
  let versionQuery = "";
  let current = { live: null, versions: curated.versions };

  const setCountry = (code, fillQuery) => {
    countryCode = code || "";
    chips.forEach((chip) => {
      const on = Boolean(countryCode) && chip.dataset.updatesCountry === countryCode;
      chip.setAttribute("aria-pressed", String(on));
    });
    if (fillQuery && search) {
      const row = curated.countries.find((c) => c.code === countryCode);
      search.value = row ? row.name : "";
    }
  };

  const availability = (version, country) => {
    if (!country) return { key: "any", label: "" };
    if (version.countries.includes(country.code)) {
      const count = current.live?.versions.find((row) => row.id === version.id)?.countryCounts?.[country.code];
      return {
        key: "here",
        label: count ? `Seen in ${country.name} · ${count} tracked car${count === 1 ? "" : "s"}` : `Seen in ${country.name}`,
      };
    }
    if (version.countries.length <= 2 && version.countries.every((c) => c === "US" || c === "CA")) {
      return { key: "away", label: `Not in ${country.name} — North America only` };
    }
    return { key: "away", label: `Not seen in ${country.name} yet` };
  };

  const renderList = (bundle) => {
    current = bundle;
    if (!list) return;
    list.replaceChildren();
    const country = countryCode ? curated.countries.find((c) => c.code === countryCode) : null;

    const rows = bundle.versions
      .filter((v) => kind === "all" || v.kind === kind)
      .filter((v) => matchVersion(v, versionQuery))
      .map((v) => ({ version: v, avail: availability(v, country) }))
      .sort((a, b) => {
        if (versionQuery) {
          const aExact = norm(a.version.id) === norm(versionQuery);
          const bExact = norm(b.version.id) === norm(versionQuery);
          if (aExact !== bExact) return aExact ? -1 : 1;
        }
        if (country && a.avail.key !== b.avail.key) return a.avail.key === "here" ? -1 : 1;
        return String(b.version.date).localeCompare(String(a.version.date));
      });

    rows.forEach(({ version, avail }) => {
      const article = document.createElement("article");
      article.className = `starship-flight updates-card${avail.key === "away" ? " is-away" : ""}`;
      article.id = `build-${version.id.replace(/\./g, "-")}`;
      article.dataset.kind = version.kind;
      const features = version.features.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
      const fleet = version.live?.percent != null ? `<span class="updates-fleet-share">${version.live.percent}% of tracked cars</span>` : "";
      article.innerHTML = `
        <div class="starship-flight-head">
          <span class="starship-flight-num">${escapeHtml(version.id)}</span>
          <time datetime="${escapeHtml(version.date)}">${formatDate(version.date)}</time>
          <span class="fsd-status updates-status-${version.status}">${statusLabel[version.status] || version.status}</span>
          <span class="fsd-status updates-kind-${version.kind}">${kindLabel[version.kind] || version.kind}</span>
          ${fleet}
        </div>
        <p class="starship-hw">${escapeHtml(version.family)}${version.fsd ? ` · ${escapeHtml(version.fsd)}` : ""}</p>
        <h3>${escapeHtml(version.headline)}</h3>
        <p>${escapeHtml(version.summary)}</p>
        <ul class="updates-features">${features}</ul>
        <p class="updates-reached">${escapeHtml(version.reached)}</p>
        ${avail.label ? `<p class="updates-avail updates-avail-${avail.key}">${escapeHtml(avail.label)}</p>` : ""}
      `;
      list.append(article);
    });

    const hereCount = country ? rows.filter((r) => r.avail.key === "here").length : rows.length;
    if (versionQuery && rows.length === 1) {
      const only = rows[0];
      const where = only.avail.label || only.version.reached;
      setText("updates-showing", `${only.version.id} — ${where}`);
    } else if (country && versionQuery) {
      setText("updates-showing", `${rows.length} builds matching ${versionQuery} · ${country.name}`);
    } else if (country) {
      setText("updates-showing", `${hereCount} of ${rows.length} listed builds seen in ${country.name}`);
    } else if (versionQuery) {
      setText("updates-showing", `${rows.length} builds matching ${versionQuery}`);
    } else {
      setText("updates-showing", `${rows.length} current builds`);
    }
    if (empty) empty.hidden = rows.length > 0;
  };

  const rerender = () => renderList(current);

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const next = chip.dataset.updatesCountry;
      if (countryCode === next) {
        setCountry("", true);
      } else {
        setCountry(next, true);
      }
      rerender();
    });
  });

  kindButtons.forEach((button) => {
    button.addEventListener("click", () => {
      kind = button.dataset.updatesKind;
      kindButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      rerender();
    });
  });

  if (search) {
    search.addEventListener("input", () => {
      const found = matchCountry(search.value);
      setCountry(found ? found.code : "", false);
      rerender();
    });
  }

  if (versionInput) {
    versionInput.addEventListener("input", () => {
      versionQuery = versionInput.value.trim();
      rerender();
    });
  }

  if (lookup) {
    lookup.addEventListener("submit", (event) => {
      event.preventDefault();
      document.getElementById("builds")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  document.getElementById("updates-fleet")?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-version]");
    if (!chip || !versionInput) return;
    versionQuery = chip.dataset.version;
    versionInput.value = versionQuery;
    document.getElementById("builds")?.scrollIntoView({ behavior: "smooth", block: "start" });
    rerender();
  });

  const hash = decodeURIComponent((location.hash || "").replace(/^#/, ""));
  if (hash && /^\d{4}\.\d+/.test(hash)) {
    versionQuery = hash;
    if (versionInput) versionInput.value = hash;
  }

  setCountry(countryCode, true);
  boot();
})();
