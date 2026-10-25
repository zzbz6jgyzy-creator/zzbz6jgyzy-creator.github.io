(() => {
  "use strict";
  const root = document.querySelector(".bg-studio");
  if (!root) return;
  const M = window.BuyingStudioModel,
    V = window.BuyingStudioView;
  let d;
  try {
    d = M.validate(JSON.parse(document.getElementById("bg-data").textContent));
  } catch {
    return;
  }
  const KEY = "sd-buying-studio-v1",
    $ = (s) => root.querySelector(s),
    all = (s) => [...root.querySelectorAll(s)];
  let prefs = M.preference(null, d),
    storage = true,
    timer;
  try {
    prefs = M.preference(JSON.parse(localStorage.getItem(KEY) || "null"), d);
  } catch {
    storage = false;
  }
  const car = new URLSearchParams(location.search).get("car");
  if (d.models.some((m) => m.id === car)) prefs.model = car;
  function notify(text) {
    clearTimeout(timer);
    $("#bg-notice").textContent = text;
    timer = setTimeout(() => ($("#bg-notice").textContent = ""), 7000);
  }
  function persist() {
    if (storage)
      try {
        localStorage.setItem(KEY, JSON.stringify(prefs));
      } catch {
        storage = false;
      }
    $("#bg-storage").textContent = storage
      ? "Your shortlist, budget and checklist are saved in this browser. No account sync."
      : "Browser storage is unavailable. Your plan works for this visit only.";
  }
  function routes() {
    let hash = location.hash.slice(1);
    try {
      hash = decodeURIComponent(hash);
    } catch {}
    const map = {
        "buy-calc": "numbers",
        charging: "numbers",
        trims: "models",
        range: "models",
        "new-used": "confidence",
        warranty: "confidence",
        fsd: "confidence",
        incentives: "confidence",
        ownership: "confidence",
        next: "confidence",
        sources: "confidence",
        "image-credits": "confidence",
      },
      view = ["fit", "models", "numbers", "confidence"].includes(hash)
        ? hash
        : map[hash] || "fit";
    all(".bg-panel").forEach((el) => (el.hidden = el.id !== view));
    all("[data-bg-view]").forEach((el) => {
      if (el.dataset.bgView === view) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    if (hash)
      requestAnimationFrame(() => {
        const target = document.getElementById(hash);
        if (target) {
          const details = target.closest("details");
          if (details) details.open = true;
          if (target.tagName === "DETAILS") target.open = true;
          target.scrollIntoView({ block: "start" });
        }
      });
  }
  function model(id) {
    prefs.model = id;
    $("#bg-showroom").innerHTML = V.showroom(d, id);
    all("[data-bg-model]").forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.bgModel === id),
    );
  }
  function shortlist() {
    const focused = document.activeElement?.dataset.shortlist;
    $("#bg-shortlist").innerHTML = V.shortlist(d, prefs.shortlist);
    $("#bg-comparison").innerHTML = V.comparison(d, prefs.shortlist);
    if (focused)
      $('#bg-shortlist [data-shortlist="' + focused + '"]').focus({
        preventScroll: true,
      });
  }
  function renderBudget() {
    const x = prefs.budget;
    $("#bg-budget-result").innerHTML = V.budget(x);
    $("#bg-budget-summary").innerHTML = V.summary(x);
    $("#bg-finance-fields").hidden = x.mode === "cash";
    all("[data-consumption-unit]").forEach(
      (el) => (el.textContent = "Wh/" + x.unit),
    );
    all("[data-distance-unit]").forEach((el) => (el.textContent = x.unit));
    charge();
  }
  function syncBudget() {
    for (const el of all("[data-budget]"))
      el.value = prefs.budget[el.dataset.budget];
    $("#bg-currency").value = prefs.budget.currency;
    $("#bg-unit").value = prefs.budget.unit;
    $("#bg-payment").value = prefs.budget.mode;
    renderBudget();
  }
  function readBudget() {
    for (const el of all("[data-budget]"))
      prefs.budget[el.dataset.budget] = el.value;
    renderBudget();
    persist();
  }
  function charge() {
    const x = prefs.budget;
    $("#bg-charge-result").innerHTML = V.charging({
      distance: $("#bg-daily").value,
      consumption: x.consumption,
      efficiency: x.efficiency,
      power: $("#bg-power").value,
      hours: $("#bg-hours").value,
    });
  }
  function checkCount() {
    const n = prefs.checked.length;
    $("#bg-check-count").textContent = n + " of " + d.checklist.length;
  }
  root.addEventListener("click", (ev) => {
    const b = ev.target.closest("button"),
      open = ev.target.closest("[data-open-model]");
    if (open) {
      model(open.dataset.openModel);
      persist();
      if (location.hash === "#models") routes();
    }
    if (!b) return;
    if (b.dataset.bgModel) {
      model(b.dataset.bgModel);
      persist();
    }
    if (b.dataset.shortlist) {
      const id = b.dataset.shortlist;
      if (prefs.shortlist.includes(id))
        prefs.shortlist = prefs.shortlist.filter((x) => x !== id);
      else if (prefs.shortlist.length < 3) prefs.shortlist.push(id);
      else {
        return notify(
          "Your shortlist has three models. Remove one to add another.",
        );
      }
      shortlist();
      persist();
      notify("Shortlist updated.");
    }
    if (b.dataset.reference) {
      const m = d.models.find((m) => m.id === b.dataset.reference);
      prefs.budget = {
        ...M.defaults(),
        price: m.reference.price,
        fees: m.reference.fees,
      };
      $("#bg-daily").value = 40;
      syncBudget();
      persist();
      notify(
        "Loaded the archived US reference from " +
          M.date(m.reference.asOf) +
          ". Budget reset to USD assumptions. Check your current quote.",
      );
    }
    if (b.id === "bg-budget-reset") {
      const currency = prefs.budget.currency,
        unit = prefs.budget.unit;
      prefs.budget = M.convert({ ...M.defaults(), currency }, unit);
      $("#bg-daily").value = unit === "mi" ? 40 : (40 * M.MI).toFixed(2);
      syncBudget();
      persist();
      notify("Budget reset to an illustrative example.");
    }
    if (b.id === "bg-check-reset") {
      prefs.checked = [];
      all("[data-check]").forEach((el) => (el.checked = false));
      checkCount();
      persist();
      notify("Checklist cleared.");
    }
    if (b.id === "bg-download") {
      const url = URL.createObjectURL(
          new Blob([V.report(d, prefs)], { type: "text/plain;charset=utf-8" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "my-tesla-buying-plan.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify(
        "Buying plan downloaded. It contains your local budget assumptions.",
      );
    }
  });
  all("[data-budget]").forEach((el) =>
    el.addEventListener("input", readBudget),
  );
  ["bg-daily", "bg-power", "bg-hours"].forEach((id) =>
    $("#" + id).addEventListener("input", charge),
  );
  $("#bg-currency").addEventListener("change", (ev) => {
    const unit = prefs.budget.unit;
    prefs.budget = M.convert(
      { ...M.defaults(), currency: ev.target.value },
      unit,
    );
    syncBudget();
    persist();
    notify(
      "Currency changed. Budget amounts reset to an illustrative example; no currency conversion was made.",
    );
  });
  $("#bg-unit").addEventListener("change", (ev) => {
    const next = ev.target.value,
      previous = prefs.budget.unit;
    if (next !== previous) {
      prefs.budget = M.convert(prefs.budget, next);
      const daily = M.num($("#bg-daily").value, 0, 5000);
      if (daily !== null)
        $("#bg-daily").value = (
          daily * (next === "km" ? M.MI : 1 / M.MI)
        ).toFixed(2);
    }
    syncBudget();
    persist();
  });
  $("#bg-payment").addEventListener("change", (ev) => {
    prefs.budget.mode = ev.target.value;
    renderBudget();
    persist();
  });
  ["bg-priority", "bg-route"].forEach((id) =>
    $("#" + id).addEventListener("change", () => {
      prefs.priority = $("#bg-priority").value;
      prefs.route = $("#bg-route").value;
      $("#bg-recommendations").innerHTML = V.recommendations(
        d,
        prefs.priority,
        prefs.route,
      );
      persist();
    }),
  );
  root.addEventListener("change", (ev) => {
    if (ev.target.dataset.check) {
      const id = ev.target.dataset.check;
      prefs.checked = ev.target.checked
        ? [...new Set([...prefs.checked, id])]
        : prefs.checked.filter((x) => x !== id);
      checkCount();
      persist();
    }
  });
  window.addEventListener("hashchange", routes);
  root.classList.add("bg-enhanced");
  model(prefs.model);
  shortlist();
  syncBudget();
  $("#bg-priority").value = prefs.priority;
  $("#bg-route").value = prefs.route;
  $("#bg-recommendations").innerHTML = V.recommendations(
    d,
    prefs.priority,
    prefs.route,
  );
  $("#bg-checklist").innerHTML = V.checklist(d, prefs.checked);
  checkCount();
  persist();
  routes();
})();
