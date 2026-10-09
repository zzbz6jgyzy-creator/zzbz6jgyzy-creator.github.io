(() => {
  const data = window.TESLA_UPDATES;
  if (!data) return;

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
    const d = new Date(`${iso}T12:00:00Z`);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const norm = (s) => String(s || "").trim().toLowerCase();

  const matchCountry = (query) => {
    const q = norm(query);
    if (!q) return null;
    return (
      data.countries.find((c) => {
        if (norm(c.code) === q || norm(c.name) === q) return true;
        return (c.aliases || []).some((a) => norm(a) === q || norm(a).includes(q) || q.includes(norm(a)));
      }) ||
      data.countries.find((c) => norm(c.name).includes(q) || q.includes(norm(c.code)))
    );
  };

  setText("updates-updated", `Updated ${formatDate(data.updated)}`);
  setText("updates-note", data.note);

  const fsdBox = document.getElementById("updates-fsd-lines");
  if (fsdBox) {
    data.fsdNow.lines.forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      fsdBox.append(p);
    });
  }

  const list = document.getElementById("updates-list");
  const search = document.getElementById("updates-search");
  const chips = document.querySelectorAll("[data-updates-country]");
  const kindButtons = document.querySelectorAll("[data-updates-kind]");
  const empty = document.getElementById("updates-empty");

  let countryCode = "";
  let kind = "all";

  const setCountry = (code, fillQuery) => {
    countryCode = code || "";
    chips.forEach((chip) => {
      const on = chip.dataset.updatesCountry === countryCode;
      chip.setAttribute("aria-pressed", String(on));
    });
    if (fillQuery && search) {
      const row = data.countries.find((c) => c.code === countryCode);
      search.value = row ? row.name : "";
    }
  };

  const availability = (version, country) => {
    if (!country) return { key: "any", label: "" };
    if (version.countries.includes(country.code)) {
      return { key: "here", label: `Seen in ${country.name}` };
    }
    if (version.countries.length <= 2 && version.countries.every((c) => c === "US" || c === "CA")) {
      return { key: "away", label: `Not in ${country.name} — North America only` };
    }
    return { key: "away", label: `Not seen in ${country.name} yet` };
  };

  const render = () => {
    if (!list) return;
    list.replaceChildren();
    const country = countryCode ? data.countries.find((c) => c.code === countryCode) : null;

    const rows = data.versions
      .filter((v) => kind === "all" || v.kind === kind)
      .map((v) => ({ version: v, avail: availability(v, country) }))
      .sort((a, b) => {
        if (country && a.avail.key !== b.avail.key) return a.avail.key === "here" ? -1 : 1;
        return b.version.date.localeCompare(a.version.date);
      });

    rows.forEach(({ version, avail }, index) => {
      const article = document.createElement("article");
      article.className = `starship-flight updates-card${avail.key === "away" ? " is-away" : ""}`;
      article.dataset.kind = version.kind;
      const features = version.features
        .map((item) => `<li>${item}</li>`)
        .join("");
      article.innerHTML = `
        <div class="starship-flight-head">
          <span class="starship-flight-num">${version.id}</span>
          <time datetime="${version.date}">${formatDate(version.date)}</time>
          <span class="fsd-status updates-status-${version.status}">${statusLabel[version.status]}</span>
          <span class="fsd-status updates-kind-${version.kind}">${kindLabel[version.kind]}</span>
        </div>
        <p class="starship-hw">${version.family}${version.fsd ? ` · ${version.fsd}` : ""}</p>
        <h3>${version.headline}</h3>
        <p>${version.summary}</p>
        <ul class="updates-features">${features}</ul>
        <p class="updates-reached">${version.reached}</p>
        ${avail.label ? `<p class="updates-avail updates-avail-${avail.key}">${avail.label}</p>` : ""}
      `;
      if (index === 0) article.classList.add("reveal");
      list.append(article);
    });

    const hereCount = country ? rows.filter((r) => r.avail.key === "here").length : rows.length;
    if (country) {
      setText(
        "updates-showing",
        `${hereCount} of ${rows.length} listed builds seen in ${country.name}`
      );
    } else {
      setText("updates-showing", `${rows.length} current builds`);
    }
    if (empty) empty.hidden = rows.length > 0;
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const next = chip.dataset.updatesCountry;
      if (countryCode === next) {
        setCountry("", true);
        if (search) search.value = "";
      } else {
        setCountry(next, true);
      }
      render();
    });
  });

  kindButtons.forEach((button) => {
    button.addEventListener("click", () => {
      kind = button.dataset.updatesKind;
      kindButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      render();
    });
  });

  if (search) {
    search.addEventListener("input", () => {
      const found = matchCountry(search.value);
      setCountry(found ? found.code : "", false);
      render();
    });
  }

  render();
})();
