(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BuyingStudioModel = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const MI = 1.609344,
    currencies = [
      "USD",
      "EUR",
      "GBP",
      "CAD",
      "AUD",
      "NZD",
      "CHF",
      "NOK",
      "SEK",
    ],
    esc = (s) =>
      String(s ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  const num = (v, min = 0, max = 1e9) => {
    if (v === null || v === undefined || String(v).trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };
  const date = (v) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(v + "T12:00:00Z"));
  const money = (v, currency = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencies.includes(currency) ? currency : "USD",
      maximumFractionDigits: 0,
    }).format(v);
  function defaults() {
    return {
      currency: "USD",
      unit: "mi",
      mode: "finance",
      price: 40000,
      fees: 1000,
      tax: 0,
      incentive: 0,
      charger: 1200,
      down: 5000,
      apr: 5,
      months: 60,
      years: 5,
      resale: 18000,
      annualDistance: 10000,
      consumption: 270,
      efficiency: 90,
      homeShare: 80,
      homeRate: 0.2,
      publicRate: 0.5,
      insurance: 1200,
      roadTax: 200,
      maintenance: 600,
      subscription: 0,
    };
  }
  const limits = {
    price: [0, 1e7],
    fees: [0, 1e6],
    tax: [0, 1e7],
    incentive: [0, 1e7],
    charger: [0, 1e6],
    down: [0, 1e7],
    apr: [0, 50],
    months: [1, 120],
    years: [1, 10],
    resale: [0, 1e7],
    annualDistance: [1, 1e6],
    consumption: [1, 5000],
    efficiency: [50, 100],
    homeShare: [0, 100],
    homeRate: [0, 100],
    publicRate: [0, 100],
    insurance: [0, 1e6],
    roadTax: [0, 1e6],
    maintenance: [0, 1e6],
    subscription: [0, 1e5],
  };
  function budget(input) {
    const x = { ...input };
    if(x.mode === "cash") { x.down = 0; x.apr = 0; x.months = 60; }
    for (const [key, [min, max]] of Object.entries(limits)) {
      x[key] = num(x[key], min, max);
      if (x[key] === null)
        return {
          error:
            "Enter a valid " +
            key.replace(/([A-Z])/g, " $1").toLowerCase() +
            ".",
        };
    }
    if (!Number.isInteger(x.months) || !Number.isInteger(x.years))
      return {
        error: "Loan months and ownership years must be whole numbers.",
      };
    const acquisition = x.price + x.fees + x.tax - x.incentive;
    if (acquisition < 0)
      return {
        error:
          "Incentives cannot exceed the vehicle price, fees and tax in this model.",
      };
    if (x.resale > acquisition)
      return {
        error:
          "Resale must not exceed acquisition cost in this depreciation model.",
      };
    if (x.mode !== "cash" && x.down > acquisition)
      return { error: "The down payment cannot exceed acquisition cost." };
    const principal = x.mode === "cash" ? 0 : acquisition - x.down,
      rate = x.apr / 1200,
      payment =
        principal === 0
          ? 0
          : rate === 0
            ? principal / x.months
            : (principal * rate) / -Math.expm1(-x.months * Math.log1p(rate)),
      paidMonths = Math.min(x.years * 12, x.months);
    const balance =
        principal === 0 || paidMonths === x.months
          ? 0
          : Math.max(
              0,
              rate === 0
                ? principal - payment * paidMonths
                : principal * Math.exp(paidMonths * Math.log1p(rate)) -
                    (payment * Math.expm1(paidMonths * Math.log1p(rate))) /
                      rate,
            ),
      interest = Math.max(0, payment * paidMonths - (principal - balance));
    const vehicleEnergy = (x.annualDistance * x.consumption) / 1000,
      wallEnergy = vehicleEnergy / (x.efficiency / 100),
      tariff =
        (x.homeRate * x.homeShare) / 100 +
        x.publicRate * (1 - x.homeShare / 100),
      annualEnergyCost = wallEnergy * tariff,
      annualOther =
        x.insurance + x.roadTax + x.maintenance + x.subscription * 12,
      depreciation = acquisition - x.resale,
      total =
        depreciation +
        x.charger +
        interest +
        (annualEnergyCost + annualOther) * x.years;
    return {
      ...x,
      acquisition,
      principal,
      payment,
      balance,
      interest,
      vehicleEnergy,
      wallEnergy,
      tariff,
      annualEnergyCost,
      annualOther,
      depreciation,
      total,
      monthly: total / (x.years * 12),
      perDistance: total / (x.years * x.annualDistance),
      upfront: (x.mode === "cash" ? acquisition : x.down) + x.charger,
      exitEquity: x.resale - balance,
      segments: [
        ["Depreciation", depreciation],
        ["Charger & install", x.charger],
        ["Interest while owned", interest],
        ["Electricity", annualEnergyCost * x.years],
        ["Other running costs", annualOther * x.years],
      ],
    };
  }
  function charging({ distance, consumption, efficiency, power, hours }) {
    distance = num(distance, 0, 5000);
    consumption = num(consumption, 1, 5000);
    efficiency = num(efficiency, 50, 100);
    power = num(power, 0.1, 50);
    hours = num(hours, 0.1, 24);
    if ([distance, consumption, efficiency, power, hours].includes(null))
      return null;
    const vehicle = (distance * consumption) / 1000,
      wall = vehicle / (efficiency / 100),
      required = wall / power;
    return {
      vehicle,
      wall,
      required,
      available: power * hours,
      covered: required <= hours,
    };
  }
  function convert(x, unit) {
    if (x.unit === unit) return { ...x };
    return {
      ...x,
      unit,
      annualDistance: +(
        x.annualDistance * (unit === "km" ? MI : 1 / MI)
      ).toFixed(2),
      consumption: +(x.consumption * (unit === "km" ? 1 / MI : MI)).toFixed(2),
    };
  }
  function preference(value, data) {
    const v = value && typeof value === "object" ? value : {},
      base = defaults();
    const saved = v.budget && typeof v.budget === "object" ? v.budget : {};
    for (const [k, range] of Object.entries(limits)) {
      if(saved[k] === "") base[k] = "";
      else if(typeof saved[k] !== "object" && saved[k] !== null && Number.isFinite(Number(saved[k])) && Math.abs(Number(saved[k])) <= 1e12) base[k] = Number(saved[k]);
    }
    base.currency = currencies.includes(saved.currency)
      ? saved.currency
      : "USD";
    base.unit = saved.unit === "km" ? "km" : "mi";
    base.mode = saved.mode === "cash" ? "cash" : "finance";
    return {
      model: data.models.some((m) => m.id === v.model) ? v.model : "m3",
      shortlist: [
        ...new Set(
          (Array.isArray(v.shortlist) ? v.shortlist : ["m3", "my"]).filter(
            (id) => data.models.some((m) => m.id === id),
          ),
        ),
      ].slice(0, 3),
      priority: [
        "commute",
        "family",
        "utility",
        "touring",
        "performance",
      ].includes(v.priority)
        ? v.priority
        : "commute",
      route: ["new", "used", "either"].includes(v.route) ? v.route : "either",
      checked: [
        ...new Set(
          (Array.isArray(v.checked) ? v.checked : []).filter((id) =>
            data.checklist.some((c) => c.id === id),
          ),
        ),
      ],
      budget: base,
    };
  }
  function recommendations(data, priority, route) {
    let models = data.models.filter((m) => route !== "new" || m.reference);
    return models
      .map((m) => ({
        model: m,
        score:
          (m.priorities.includes(priority) ? 2 : 0) +
          (route === "used" && !m.reference ? 1 : 0),
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          data.models.indexOf(a.model) - data.models.indexOf(b.model),
      )
      .slice(0, 2);
  }
  function validate(d) {
    if (
      !d ||
      d.version !== 1 ||
      !Array.isArray(d.models) ||
      d.models.length !== 5 ||
      !Array.isArray(d.checklist) ||
      !Array.isArray(d.sources)
    )
      throw Error("Invalid buying guide");
    const ids = new Set();
    for (const m of d.models) {
      if (
        !/^[a-z0-9]+$/.test(m.id) ||
        ids.has(m.id) ||
        !m.image.startsWith("/assets/") ||
        !m.review.startsWith("/reviews/") ||
        !m.official.startsWith("https://www.tesla.com/")
      )
        throw Error("Invalid vehicle");
      ids.add(m.id);
      if (
        m.reference &&
        (!/US/.test(m.reference.market) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(m.reference.asOf) ||
          ![
            m.reference.price,
            m.reference.fees,
            m.reference.rangeMiles,
            m.reference.accel,
          ].every((x) => Number.isFinite(x) && x >= 0))
      )
        throw Error("Invalid reference");
    }
    const checklistIds = d.checklist.map((c) => c.id);
    if (new Set(checklistIds).size !== checklistIds.length)
      throw Error("Duplicate checklist");
    return d;
  }
  return {
    MI,
    currencies,
    esc,
    num,
    date,
    money,
    defaults,
    limits,
    budget,
    charging,
    convert,
    preference,
    recommendations,
    validate,
  };
});
