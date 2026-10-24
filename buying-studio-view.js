(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(require("./buying-studio-model.js"));
  else root.BuyingStudioView = factory(root.BuyingStudioModel);
})(typeof window !== "undefined" ? window : globalThis, function (M) {
  "use strict";
  const e = M.esc,
    arrow =
      '<svg class="bg-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 16 12-12M4 4h12v12"/></svg>';
  function showroom(d, id) {
    const m = d.models.find((m) => m.id === id) || d.models[0];
    return `<div class="bg-model-photo"><img src="${m.image}" alt="${m.alt}" width="960" height="600" loading="lazy" decoding="async"/><span>${m.body} / ${m.name}</span></div><div class="bg-model-copy"><p class="bg-kicker">${m.tag}</p><h3>${m.name}</h3><dl><dt>Why consider it</dt><dd>${m.best}</dd><dt>The trade-off to test</dt><dd>${m.tradeoff}</dd><dt>At your test drive</dt><dd>${m.test}</dd></dl><div class="bg-actions"><a class="bg-button" href="${m.review}">Read our review ${arrow}</a>${m.explorer ? `<a class="bg-link" href="${m.explorer}">Explore in 3D ${arrow}</a>` : ""}</div><p class="bg-fine">Photography shows the model family, not necessarily the reference trim or the equipment on your quote.</p></div>`;
  }
  function comparison(d, ids) {
    const ms = ids
      .map((id) => d.models.find((m) => m.id === id))
      .filter(Boolean);
    if (!ms.length)
      return '<p class="bg-empty">Add up to three models to build your comparison.</p>';
    const row = (label, fn) =>
      `<tr><th scope="row">${label}</th>${ms.map((m) => `<td>${fn(m)}</td>`).join("")}</tr>`;
    return `<div class="bg-table-scroll"><table class="bg-comparison-table"><caption>Your model families and archived US reference trims</caption><thead><tr><th scope="col">Compare the actual configuration</th>${ms.map((m) => `<th scope="col">${m.name}</th>`).join("")}</tr></thead><tbody>${row("Body style", (m) => m.body)}${row("A useful starting point", (m) => m.best)}${row("Check before choosing", (m) => m.tradeoff)}${row("Reference market / date", (m) => (m.reference ? "US / " + M.date(m.reference.asOf) : "No shared trim reference"))}${row("Exact reference trim", (m) => (m.reference ? e(m.reference.trim) : "Enter the specific year and trim in your own research"))}${row("Vehicle price / USD", (m) => (m.reference ? M.money(m.reference.price) : "Get an individual quote"))}${row("Destination + order fees / USD", (m) => (m.reference ? M.money(m.reference.fees) : "Get an individual quote"))}${row("Price + those fees / USD", (m) => (m.reference ? M.money(m.reference.price + m.reference.fees) : "Not supplied"))}${row("Tesla EPA range estimate / mi", (m) => (m.reference ? m.reference.rangeMiles + " mi" : "Match the exact certified vehicle"))}${row("0–60 mph / seconds", (m) => (m.reference ? m.reference.accel + " s" : "No cross-generation figure"))}${row("Go further", (m) => `<a href="${m.review}">Review ${arrow}</a> · <a href="${m.official}">Tesla ${arrow}</a>`)}</tbody></table></div><p class="bg-fine">Numeric rows are an archived US snapshot from ${M.date(d.referenceDate)} retained from the previous guide. They are not current quotes or currency conversions. EPA figures are not WLTP or a promise of journey range. All numbers in a column belong to its named trim.</p>`;
  }
  function shortlist(d, ids) {
    return d.models
      .map(
        (m) =>
          `<button type="button" class="bg-shortlist-button" data-shortlist="${m.id}" aria-pressed="${ids.includes(m.id)}">${m.name}<span>${ids.includes(m.id) ? "Added" : "Add +"}</span></button>`,
      )
      .join("");
  }
  function recommendations(d, priority, route) {
    return M.recommendations(d, priority, route)
      .map(
        ({ model: m, score }) =>
          `<article class="bg-recommendation"><span class="bg-kicker">A starting point / ${m.body}</span><h3>${m.name}</h3><p>${m.best}</p><a class="bg-link" href="#models" data-open-model="${m.id}">Explore the trade-offs ${arrow}</a></article>`,
      )
      .join("");
  }
  function budget(x) {
    const r = M.budget(x);
    if (r.error)
      return `<div class="bg-budget-error" role="alert"><strong>Check your assumptions</strong><p>${e(r.error)}</p><p>Your last complete estimate is unavailable until the inputs are valid.</p></div>`;
    const money = (n) => M.money(n, r.currency),
      den = Math.max(r.total, 1);
    return `<div class="bg-result-head"><span class="bg-kicker">${r.years}-year ownership scenario</span><strong>${money(r.total)}</strong><p>Estimated ownership cost, after your assumed resale value.</p></div><div class="bg-cost-stack" role="img" aria-label="Cost breakdown: ${r.segments.map(([k, v]) => k + " " + money(v)).join(";")}">${r.segments.map(([k, v], i) => `<span class="bg-cost-segment bg-cost-${i}" style="width:${(v / den) * 100}%"></span>`).join("")}</div><dl class="bg-cost-rows">${r.segments.map(([k, v], i) => `<div><dt><i class="bg-dot bg-cost-${i}"></i>${k}</dt><dd>${money(v)}</dd></div>`).join("")}</dl><div class="bg-result-grid"><div><span>${r.mode === "cash" ? "Cash purchase" : "Loan payment"}</span><strong>${r.mode === "cash" ? money(r.acquisition) : money(r.payment) + "/mo"}</strong></div><div><span>Average ownership cost</span><strong>${money(r.monthly)}/mo</strong></div><div><span>Upfront incl. charger</span><strong>${money(r.upfront)}</strong></div><div><span>Cost per ${r.unit === "mi" ? "mile" : "km"}</span><strong>${new Intl.NumberFormat("en-US", { style: "currency", currency: r.currency, maximumFractionDigits: 2 }).format(r.perDistance)}</strong></div></div><details class="bg-math"><summary>See the energy and finance workings</summary><dl><dt>Annual electricity from the wall</dt><dd>${Math.round(r.wallEnergy).toLocaleString("en-US")} kWh</dd><dt>Blended electricity price / kWh</dt><dd>${new Intl.NumberFormat("en-US", { style: "currency", currency: r.currency, maximumFractionDigits: 3 }).format(r.tariff)}</dd><dt>Estimated annual electricity cost</dt><dd>${money(r.annualEnergyCost)}</dd><dt>Interest paid while owned</dt><dd>${money(r.interest)}</dd><dt>Estimated loan balance at sale</dt><dd>${money(r.balance)}</dd><dt>Resale less that loan balance</dt><dd>${money(r.exitEquity)}</dd></dl><p>Ownership cost = acquisition − resale + charger/install + interest paid during ownership + running costs during ownership. A deposit changes borrowing; it is not a discount. Average ownership cost is not a monthly bill. A negative resale-minus-balance figure means additional cash would be needed to settle that balance, before any fees.</p></details>`;
  }
  function charging(x) {
    const r = M.charging(x);
    if (!r)
      return '<p class="bg-input-error">Enter valid daily distance, consumption, efficiency, average wall power and plug-in hours.</p>';
    return `<div class="bg-charge-result"><span class="bg-kicker">Your illustrative daily refill</span><strong>${r.required.toFixed(1)}<em> hours</em></strong><p>${r.wall.toFixed(1)} kWh from the wall for ${r.vehicle.toFixed(1)} kWh to the battery.</p><b class="${r.covered ? "bg-covered" : "bg-tight"}">${r.covered ? "Fits the entered plug-in window" : "Needs more time or another charging plan"}</b><div class="bg-charge-track" role="img" aria-label="Required ${r.required.toFixed(1)} hours versus ${x.hours} hours available"><span style="width:${Math.min(100, (r.required / Number(x.hours)) * 100)}%"></span></div><p class="bg-fine">Based on your average wall power and efficiency. This energy-balance model is not an installation specification or a charging curve.</p></div>`;
  }
  function checklist(d, checked) {
    return [
      ["needs", "01 / Your life"],
      ["quote", "02 / The quote"],
      ["used", "03 / A used car"],
      ["delivery", "04 / Handover"],
    ]
      .map(
        ([stage, title]) =>
          `<section class="bg-check-group"><h3>${title}</h3>${d.checklist
            .filter((c) => c.stage === stage)
            .map(
              (c) =>
                `<label class="bg-check-item"><input class="bg-interactive" type="checkbox" data-check="${c.id}" ${checked.includes(c.id) ? "checked" : ""}/><span><strong>${e(c.title)}</strong><small>${e(c.text)}</small></span></label>`,
            )
            .join("")}</section>`,
      )
      .join("");
  }
  function report(d, prefs) {
    const r = M.budget(prefs.budget),
      b = prefs.budget;
    return [
      "SUPERCHARGED DAILY — MY TESLA BUYING PLAN",
      "https://superchargeddaily.com/guides/tesla-buying-guide.html",
      "",
      "This is a browser-local plan with user-entered assumptions, not a quote.",
      "Shortlist: " +
        prefs.shortlist
          .map((id) => d.models.find((m) => m.id === id).name)
          .join(", "),
      "Priority: " + prefs.priority,
      "Purchase route: " + prefs.route,
      "",
      r.error
        ? "Budget incomplete: " + r.error
        : [
            `${r.years}-year estimated ownership cost: ${M.money(r.total, r.currency)}`,
            `Loan payment: ${M.money(r.payment, r.currency)} / month`,
            `Loan balance at sale: ${M.money(r.balance, r.currency)}`,
            `Ownership average: ${M.money(r.monthly, r.currency)} / month`,
          ].join("\n"),
      "",
      "BUDGET ASSUMPTIONS",
      ...Object.entries(b).map(([k, v]) => k + ": " + v),
      "",
      "CHECKLIST",
      ...d.checklist.map(
        (c) =>
          `[${prefs.checked.includes(c.id) ? "x" : " "}] ${c.title}\n    ${c.text}`,
      ),
      "",
      "Numeric vehicle comparison references are archived US figures dated " +
        d.referenceDate +
        ". Confirm the actual configuration and current local price.",
      "Sources: " + d.sources.map((s) => s.url).join("\n"),
    ].join("\n");
  }
  function summary(x) { const r=M.budget(x); return r.error ? `<span>Check your assumptions</span><b>${e(r.error)}</b>` : `<span>${r.years}-year estimate / ${r.currency}</span><strong>${M.money(r.total,r.currency)}</strong><small>${M.money(r.monthly,r.currency)} / month average</small>`; }
  return {
    summary,
    arrow,
    showroom,
    comparison,
    shortlist,
    recommendations,
    budget,
    charging,
    checklist,
    report,
  };
});
