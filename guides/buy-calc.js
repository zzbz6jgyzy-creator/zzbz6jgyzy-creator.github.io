/* Tesla buying-guide cash sheet.
   Sticker + dest/order fees + charger prices + FSD $99/mo are copied from
   guides/tesla-buying-guide.html (Tesla compare / home charging, 14 Oct 2026).
   Tax %, rebate, install, and FSD months are the reader’s assumptions. */
(() => {
  const root = document.querySelector("[data-buy-calc]");
  if (!root) return;

  const CHECKED = "14 Oct 2026";
  const CARS = {
    m3: { id: "m3", name: "Model 3 RWD", sticker: 36990, fees: 1640 },
    my: { id: "my", name: "Model Y RWD", sticker: 39990, fees: 1640 },
    ct: { id: "ct", name: "Cybertruck AWD", sticker: 74990, fees: 2245 },
  };
  const CHARGERS = {
    none: { price: 0, label: "No home charger" },
    mobile: { price: 300, label: "Mobile Connector" },
    wall: { price: 585, label: "Wall Connector" },
    universal: { price: 660, label: "Universal Wall Connector" },
  };
  const FSD_MO = 99;

  const money = (n) =>
    (n < 0 ? "−" : "") +
    Math.round(Math.abs(n)).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const num = (el, fallback) => {
    const v = parseFloat(String(el.value || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(v) ? v : fallback;
  };

  const qs = (sel) => root.querySelector(sel);
  const carBtns = [...root.querySelectorAll("[data-car]")];
  const feesEl = qs("[name=fees]");
  const taxEl = qs("[name=tax]");
  const rebateEl = qs("[name=rebate]");
  const chargerEl = qs("[name=charger]");
  const installEl = qs("[name=install]");
  const fsdEl = qs("[name=fsd]");
  const monthsEl = qs("[name=months]");
  const installHint = qs("[data-install-hint]");

  let carId = CARS[new URLSearchParams(location.search).get("car")] ? new URLSearchParams(location.search).get("car") : "m3";

  function setCar(id, resetFees) {
    if (!CARS[id]) return;
    carId = id;
    carBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.car === id)));
    if (resetFees) feesEl.value = String(CARS[id].fees);
    const url = new URL(location.href);
    url.searchParams.set("car", id);
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  function sheet(car, fees) {
    const taxPct = Math.max(0, num(taxEl, 0));
    const rebate = Math.max(0, num(rebateEl, 0));
    const charger = CHARGERS[chargerEl.value] || CHARGERS.none;
    const install = Math.max(0, num(installEl, 0));
    const fsdOn = fsdEl.value === "on";
    const months = Math.max(0, Math.min(120, Math.round(num(monthsEl, 12))));
    const taxable = car.sticker + fees;
    const tax = Math.round(taxable * (taxPct / 100));
    const vehicle = Math.max(0, taxable + tax - rebate);
    const extras = charger.price + install;
    const driveAway = vehicle + extras;
    const fsd = fsdOn ? FSD_MO * months : 0;
    return { car, fees, taxPct, tax, rebate, charger, install, fsdOn, months, taxable, vehicle, extras, driveAway, fsd, total: driveAway + fsd };
  }

  function paint() {
    const car = CARS[carId];
    const s = sheet(car, Math.max(0, num(feesEl, car.fees)));
    installHint.hidden = chargerEl.value !== "wall";

    qs("[data-result]").innerHTML =
      `<dl class="sd-calc-out">
        <div class="sd-calc-total"><dt>Cash outlay</dt><dd>${money(s.total)}</dd></div>
      </dl>
      <ul class="sd-calc-rows">
        <li><span>List price (${s.car.name})</span><b>${money(s.car.sticker)}</b></li>
        <li><span>Destination &amp; order fees</span><b>${money(s.fees)}</b></li>
        <li><span>Sales tax (${s.taxPct}%)</span><b>${money(s.tax)}</b></li>
        <li><span>Your rebate</span><b>${money(-s.rebate)}</b></li>
        <li><span>${s.charger.label}</span><b>${money(s.charger.price)}</b></li>
        <li><span>Charger install</span><b>${money(s.install)}</b></li>
        <li><span>Drive-away before registration</span><b>${money(s.driveAway)}</b></li>
        <li><span>FSD Supervised${s.fsdOn ? ` × ${s.months} mo` : ""}</span><b>${money(s.fsd)}</b></li>
      </ul>
      <p class="sd-note sd-calc-src">US list price, destination &amp; order fees, charger prices and FSD at $99/month from Tesla, checked ${CHECKED}. Tax, rebate, install and how many months of FSD are yours. Confirm the car in Tesla’s checkout. Not a quote and not advice. Federal new-car credit ended 30 Sept 2025.</p>`;

    qs("[data-compare]").innerHTML = Object.values(CARS)
      .map((c) => {
        const row = sheet(c, c.fees);
        return `<div class="sd-calc-cmp-card${c.id === carId ? " is-on" : ""}">
          <span>${c.name}</span>
          <strong>${money(row.total)}</strong>
          <small>${money(row.driveAway)} before FSD</small>
        </div>`;
      })
      .join("");
  }

  carBtns.forEach((b) =>
    b.addEventListener("click", () => {
      setCar(b.dataset.car, true);
      paint();
    })
  );
  root.addEventListener("input", paint);
  root.addEventListener("change", paint);
  qs("[data-reset]").addEventListener("click", () => {
    taxEl.value = "0";
    rebateEl.value = "0";
    chargerEl.value = "none";
    installEl.value = "0";
    fsdEl.value = "off";
    monthsEl.value = "12";
    setCar(carId, true);
    paint();
  });

  setCar(carId, true);
  paint();
})();
