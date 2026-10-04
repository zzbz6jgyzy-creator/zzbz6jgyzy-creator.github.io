/* =====================================================================
   IRISH EV TARIFF WATCH — TARIFF DATA  (edit this file weekly)
   ---------------------------------------------------------------------
   * All prices are c/kWh INCLUDING 9% VAT and annual standing charges
     are € INCLUDING VAT, URBAN, unless a note says otherwise.
   * "now"  = price on the as-of date.  "next" = an announced future price
     (set next:null when no change is announced).
   * verified: "supplier"  -> read directly from the supplier's own page/PDF
               "derived"   -> calculated by us from a supplier figure
                              (e.g. ex-VAT x 1.09, or discount applied)
               "secondary" -> from a news/comparison site, not the supplier
               "unverified"-> could not confirm; shown with a warning
   * NEVER type in a number you have not seen on a source. Leave null.
   ===================================================================== */
window.TARIFF_DATA = {
  meta: {
    built: "2026-10-04",
    asOf: "2026-10-04",
    vatRate: 0.09,
    region: "Republic of Ireland, urban standing charges",
    notes: "Headline rates are the supplier's advertised new-customer rate (including any standard sign-up discount noted per plan).",
    siteUpdated: "2026-10-05",     // last time the website itself (not prices) was changed
    linksChecked: "2026-10-05"     // switch links below last opened and returned HTTP 200
  },

  /* ---------------- Suppliers: switching / sign-up links ----------------
     One entry per supplier name used in `plans`. Re-check every link when you
     update prices (curl with a browser User-Agent should return 200).
     `current: true` marks the supplier you are with now (shows a label instead
     of a "Switch to" call to action). */
  suppliers: {
    "Yuno Energy": {
      switchUrl: "https://yunoenergy.ie/pricing-page",
      note: "Yuno has no direct EV sign-up page; this is its pricing page, where sign-up starts." },
    "SSE Airtricity": {
      switchUrl: "https://www.sseairtricity.com/ie/home/products/switch-to-sse-airtricity?jump=true&filter=elec&meter=smart" },
    "Bord Gáis Energy": {
      switchUrl: "https://www.bordgaisenergy.ie/home/ev-plan-comparison", current: true,
      note: "Your current supplier. Link goes to Bord Gáis's EV plan comparison page." },
    "Energia": {
      switchUrl: "https://switchto.energia.ie/ChooseMyPlan?Type=Smart&Fuel=E&apptype=cos",
      guideUrl: "https://www.energia.ie/energy-plans/switching-guide" },
    "Electric Ireland": {
      switchUrl: "https://www.electricireland.ie/switch/new-customer/price-plans?priceType=E" },
    "Pinergy": {
      switchUrl: "https://pinergy.ie/home-electricity/switch-supplier/",
      note: "Pinergy's EV Night Time plan is closed to new customers; this is Pinergy's general switching page." },
    "Flogas": {
      switchUrl: "https://www.flogas.ie/sign-up/" }
  },

  /* ---------------- EV / night-boost plans ---------------- */
  plans: [
    {
      id: "yuno-ev-variable-smart",
      supplier: "Yuno Energy",
      plan: "EV Variable Smart (Day/Night/Peak + EV)",
      evWindow: "02:00–06:00", evHours: 4,
      ev:   { now: 8.59,  next: null, verified: "supplier" },
      standardEv: 9.42, standardEvLabel: "EV Standard Smart plan",
      day: 40.47, night: 21.46, peak: 45.38,
      standing: { now: 358.07, next: null },
      status: "open",
      notes: "New customers only. App-only, paperless, advance payment, 12-month contract (€50 early exit fee per T&Cs). Variable rate.",
      sources: [
        { label: "Yuno pricing page", url: "https://yunoenergy.ie/pricing-page" },
        { label: "Yuno EV plan T&Cs (EV hours)", url: "https://yunoenergy.ie/sites/default/files/2026-06/YE%20EV%2024hr%20Product%20TsCs%20190626%20-%20EE4VN02.pdf" }
      ],
      checked: "2026-10-04"
    },
    {
      id: "sse-smart-ev-charge",
      supplier: "SSE Airtricity",
      plan: "1 Year Smart EV Charge (15% DD & eBill)",
      evWindow: "02:00–05:00", evHours: 3,
      ev:   { now: 9.05, next: 9.50, nextDate: "2026-10-05", verified: "supplier" },
      standardEv: 11.18, standardEvLabel: "no discount, from 5 Oct",
      day: 46.34, night: 24.60, peak: 55.19, ratesNote: "Day/night/peak shown are the 15%-discount rates from 5 Oct 2026",
      standing: { now: 334.74, next: 355.25 },
      status: "open",
      notes: "12-month contract. 15% discount needs Direct Debit + eBill. New rates valid from 5 Oct 2026.",
      sources: [
        { label: "SSE tariff PDF (from 5 Oct 2026)", url: "https://www.sseairtricity.com/assets/Tariffs/ROI/Future/1YR-ELEC-15-EVCharge.pdf" },
        { label: "SSE tariff PDF (current)", url: "https://www.sseairtricity.com/assets/Tariffs/ROI/Current/1YR-ELEC-15-EVCharge.pdf" }
      ],
      checked: "2026-10-04"
    },
    {
      id: "bge-smart-ev",
      supplier: "Bord Gáis Energy",
      plan: "Smart EV (Urban EV Smart, 15% new-customer discount)",
      evWindow: "02:00–05:00", evHours: 3,
      ev:   { now: 8.98, next: 9.79, nextDate: "2026-10-09", verified: "supplier", nextVerified: "derived",
              nextNote: "Derived: BGE's published 9 Oct standard EV rate (11.52c) less the 15% new-customer discount. Confirm the discount is still offered." },
      standardEv: 10.57, standardEvNext: 11.52, standardEvLabel: "no discount (11.52c from 9 Oct)",
      day: 35.23, night: 26.57, peak: 49.14, ratesNote: "Day/night/peak with 15% discount until 8 Oct. Standard rates from 9 Oct: 45.22 / 34.11 / 63.08",
      standing: { now: 364.58, next: 390.85 },
      status: "open",
      notes: "EV window 2am–5am every day (BGE T&Cs, Aug 2026). Highest standing charge of the plans listed.",
      sources: [
        { label: "BGE tariffs & prices (current + 9 Oct)", url: "https://www.bordgaisenergy.ie/home/our-tariffs" },
        { label: "BGE EV plan comparison (8.98c, 15% discount)", url: "https://www.bordgaisenergy.ie/home/ev-plan-comparison" },
        { label: "BGE Smart EV tariff T&Cs (hours)", url: "https://assets-us-01.kc-usercontent.com/7dd6b71d-d672-0004-6a4d-7043e1d0db33/27aed1d1-38a4-43b1-a9dc-2c5735c7900e/Smart%20EV%20Tariff%20-%20August%202026.pdf" }
      ],
      checked: "2026-10-04"
    },
    {
      id: "energia-ev-smart-drive",
      supplier: "Energia",
      plan: "EV Smart Drive (10% discount)",
      evWindow: "02:00–06:00", evHours: 4,
      ev:   { now: 9.42, next: 12.25, nextDate: "2026-10-12", verified: "supplier", nextVerified: "derived",
              nextNote: "Energia publishes the new rate ex-VAT: 12.49c (was 9.61c, +30%). We add 9% VAT (13.61c) and the 10% discount Energia says existing discounts keep (12.25c)." },
      standardEv: 10.47, standardEvNext: 13.61, standardEvLabel: "no discount (13.61c from 12 Oct, derived)",
      day: 40.16, night: null, peak: null, ratesNote: "Day ('non-charge') rate with 10% discount (44.62c standard); unchanged on 12 Oct",
      standing: { now: 265.01, next: 339.22, nextVerified: "derived" },
      status: "open",
      notes: "Charge-time rate rises 30% and standing charge 28% on 12 Oct 2026. 12-month contract.",
      sources: [
        { label: "Energia tariffs (current + 12 Oct ex-VAT)", url: "https://www.energia.ie/about-energia/our-tariffs" },
        { label: "Energia price change notice", url: "https://www.energia.ie/about-energia/price" },
        { label: "Energia Smart EV plans (2am–6am)", url: "https://www.energia.ie/guide-to-smart-meters/smart-ev" }
      ],
      checked: "2026-10-04"
    },
    {
      id: "ei-night-boost",
      supplier: "Electric Ireland",
      plan: "Home Electric+ Night Boost (5.5% discount)",
      evWindow: "02:00–04:00", evHours: 2,
      ev:   { now: 10.88, next: null, verified: "supplier" },
      standardEv: 11.51, standardEvLabel: "no discount (derived from 10.56c ex VAT)",
      day: 37.60, night: 18.54, peak: null,
      standing: { now: 328.58, next: null, verified: "derived",
                  note: "From Electric Ireland's illustrative First Year Cost example (€0.8259/day ex VAT). EI says the example may not reflect current prices." },
      status: "open",
      notes: "Shortest cheap window (2 hours ≈ 14.8 kWh on a 7.4 kW charger). Cheap 18.54c night rate 11pm–8am outside the boost.",
      sources: [
        { label: "Electric Ireland Night Boost page", url: "https://www.electricireland.ie/residential/electricity-and-gas/ev-night-boost" },
        { label: "EI First Year Cost example (standing charge)", url: "https://www.electricireland.ie/residential/help/detail/first-year-cost" }
      ],
      checked: "2026-10-04"
    },
    {
      id: "energia-ev-smart-drive-plus",
      supplier: "Energia",
      plan: "EV Smart Drive Plus (10% discount)",
      evWindow: "4-hour window (exact hours unverified)", evHours: 4, hoursUnverified: true,
      ev:   { now: 11.03, next: 13.24, nextDate: "2026-10-12", verified: "supplier", nextVerified: "derived",
              nextNote: "Energia publishes 13.50c ex-VAT from 12 Oct (was 11.25c, +20%). +9% VAT = 14.72c; less 10% discount = 13.24c." },
      standardEv: 12.26, standardEvNext: 14.72, standardEvLabel: "no discount (14.72c from 12 Oct, derived)",
      day: 38.93, night: 23.99, peak: 51.08, ratesNote: "Day/night/peak shown with 10% discount; unchanged on 12 Oct",
      standing: { now: 265.01, next: 339.22, nextVerified: "derived" },
      status: "open",
      notes: "Cheaper general night rate than EV Smart Drive, but a dearer EV window.",
      sources: [
        { label: "Energia tariffs (current + 12 Oct ex-VAT)", url: "https://www.energia.ie/about-energia/our-tariffs" }
      ],
      checked: "2026-10-04"
    },
    {
      id: "sse-smart-ev-max",
      supplier: "SSE Airtricity",
      plan: "1 Year Smart EV Max (30% DD & eBill)",
      evWindow: "23:00–05:00", evHours: 6,
      ev:   { now: 12.13, next: 12.74, nextDate: "2026-10-05", verified: "supplier" },
      standardEv: 18.20, standardEvLabel: "no discount, from 5 Oct",
      day: 37.33, night: null, peak: null, ratesNote: "Two-rate plan: '18h' rate 5am–11pm (37.33c from 5 Oct, 30% discount)",
      standing: { now: 357.23, next: 379.09 },
      status: "open",
      notes: "Longest cheap window (6 h ≈ 44 kWh on 7.4 kW) — suits very high mileage or two EVs.",
      sources: [
        { label: "SSE tariff PDF (from 5 Oct 2026)", url: "https://www.sseairtricity.com/assets/Tariffs/ROI/Future/1YR-ELEC-30-EVMax.pdf" },
        { label: "SSE tariff PDF (current)", url: "https://www.sseairtricity.com/assets/Tariffs/ROI/Current/1YR-ELEC-30-EVMax.pdf" }
      ],
      checked: "2026-10-04"
    },
    {
      id: "flogas-ev-night-sv",
      supplier: "Flogas",
      plan: "Smart EV Night Charge — Standard Variable",
      evWindow: "Unverified", evHours: null, hoursUnverified: true,
      ev:   { now: 14.03, next: null, verified: "supplier" },
      standardEv: 14.03, standardEvLabel: "standard variable (no discount)",
      day: 44.73, night: 34.73, peak: 57.68,
      standing: { now: 387.16, next: null },
      status: "open",
      notes: "Discounted Flogas EV plans (20%/29%/30%) exist but their rates could not be read from Flogas's site. EV charge hours not confirmed.",
      sources: [
        { label: "Flogas plan page", url: "https://www.flogas.ie/price-change/smart-ev-night-charge-standard-variable-electricity/" }
      ],
      checked: "2026-10-04"
    },
    {
      id: "pinergy-ev-night-time",
      supplier: "Pinergy",
      plan: "Lifestyle 'EV Night Time'",
      evWindow: "02:00–05:00", evHours: 3,
      ev:   { now: 11.94, next: null, verified: "supplier" },
      standardEv: 11.94, standardEvLabel: "single rate",
      day: 45.80, night: null, peak: null, ratesNote: "'All other times' rate",
      standing: { now: 283.47, next: null },
      status: "closed",
      notes: "Closed to new customers since 21 May 2026. Was 5.99c until 1 Aug 2026. Prices 'correct as at 14 Sep 2026'.",
      sources: [
        { label: "Pinergy tariffs page", url: "https://pinergy.ie/customer-information/lifestyle-smart-tariffs/" }
      ],
      checked: "2026-10-04"
    }
  ],

  /* ---------------- Dynamic (half-hourly) tariffs ---------------- */
  /* All-in price = base unit rate (time band) + day-ahead wholesale price for that
     half hour + 9% VAT. BGE T&Cs confirm the dynamic part is the Day-Ahead Market
     price, capped at 50c/kWh by the CRU. */
  dynamic: [
    { supplier: "Electric Ireland", plan: "Dynamic tariff",
      base: { night: 8.52, day: 19.81, peak: 22.55 }, standing: 328.58, effective: "2026-05-19",
      url: "https://www.electricireland.ie/residential/electricity-and-gas/dynamic-price-plans" },
    { supplier: "Energia", plan: "Dynamic tariff",
      base: { night: 12.51, day: 21.97, peak: 22.92 }, standing: 299.75, effective: "2026-06-02",
      url: "https://www.energia.ie/about-energia/our-tariffs" },
    { supplier: "Bord Gáis Energy", plan: "Smart Dynamic (from 9 Oct 2026)",
      base: { night: 19.02, day: 19.02, peak: 19.02 }, standing: 347.56, effective: "2026-10-09",
      note: "Single base rate all day; was 16.73c before 9 Oct (+13.7%).",
      url: "https://www.bordgaisenergy.ie/home/our-tariffs" }
  ],

  /* Real SEMOpx day-ahead prices (ROI zone), averaged by Irish local hour,
     4 Sep – 3 Oct 2026 (30 auctions). c/kWh EXCLUDING VAT. Source: SEMO reports API (EA-001). */
  wholesale: {
    period: "4 Sep – 3 Oct 2026",
    source: "https://reports.sem-o.com/",
    sourceLabel: "SEMOpx day-ahead results via SEMO reports (EA-001)",
    avgAll: 18.36,
    avg2to5: 16.38,
    hourly: [17.35,16.61,16.63,16.24,16.28,17.24,19.88,21.99,22.14,20.24,16.84,14.01,13.17,12.59,12.52,13.92,17.32,22.08,24.47,24.67,24.14,22.25,19.74,18.43]
  },

  /* Reference 24-hour rate for "charging at a normal rate" comparison */
  reference24h: { label: "Electric Ireland Home Electric+ Saver 16% (24-hour)", rate: 31.30,
    url: "https://www.electricireland.ie/switch/new-customer/price-plans?priceType=E" },

  /* ---------------- Rate-change alerts (newest first) ---------------- */
  alerts: [
    { date: "2026-11-01", supplier: "Community Power", level: "info", upcoming: true,
      title: "Community Power price increase announced",
      body: "Banner on Community Power's site: 'Price Increase effective 1st Nov 2026'. Details not captured; no dedicated EV plan found.",
      url: "https://communitypower.ie/" },
    { date: "2026-10-12", supplier: "Energia", level: "major", upcoming: true,
      title: "Energia EV Smart Drive charge rate +30%, standing charge +28%",
      body: "Charge-time rate 9.61c → 12.49c ex VAT (≈10.47c → 13.61c incl VAT; 9.42c → ≈12.25c with 10% discount). EV Smart Drive Plus +20% (11.25c → 13.50c ex VAT). EV standing charge €243.13 → €311.21 ex VAT. Average electricity bill +4.73%.",
      url: "https://www.energia.ie/about-energia/our-tariffs",
      extra: [{ label: "Irish Independent, 12 Sep 2026", url: "https://www.independent.ie/irish-news/supplier-energia-increasing-some-of-its-electricity-tariffs-by-up-to-30pc/a/161320823.html" }] },
    { date: "2026-10-09", supplier: "Bord Gáis Energy", level: "high", upcoming: true,
      title: "Bord Gáis: EV rate 10.57c → 11.52c (+9%), standing charge +7.2%",
      body: "Electricity unit rates +9.1%, standing charges +7.2%, typical bill +8.8%. Urban EV Smart standing charge €364.58 → €390.85. Smart Dynamic base rate +13.7% (16.73c → 19.02c).",
      url: "https://www.bordgaisenergy.ie/home/price-change-info" },
    { date: "2026-10-05", supplier: "SSE Airtricity", level: "high", upcoming: true,
      title: "SSE Airtricity: Smart EV Charge 9.05c → 9.50c, EV Max 12.13c → 12.74c",
      body: "Typical electricity bill +8.9%; standing charge +6.1%. Smart EV Charge urban standing charge €334.74 → €355.25.",
      url: "https://www.sseairtricity.com/assets/Tariffs/ROI/Future/1YR-ELEC-15-EVCharge.pdf",
      extra: [{ label: "RTÉ, 5 Sep 2026", url: "https://www.rte.ie/news/business/2026/0904/1590377-sse-price-rise/" }] },
    { date: "2026-10-01", supplier: "All suppliers", level: "good", upcoming: false,
      title: "PSO levy cut to €6.67 a year (incl VAT)",
      body: "Down from €19.08 a year. Applies to every domestic electricity customer.",
      url: "https://www.bordgaisenergy.ie/home/our-tariffs" },
    { date: "2026-09-14", supplier: "Pinergy", level: "high", upcoming: false,
      title: "Pinergy +7.6%",
      body: "EV Night Time (closed to new customers) now 11.94c incl VAT per Pinergy's tariff page.",
      url: "https://pinergy.ie/customer-information/lifestyle-smart-tariffs/" },
    { date: "2026-08-01", supplier: "Pinergy", level: "major", upcoming: false,
      title: "Pinergy EV Night Time 5.99c → 10.89c (+82%)",
      body: "Affected about 1,800 existing customers; plan had been withdrawn from sale on 21 May 2026.",
      url: "https://www.newstalk.com/news/energy-2272436" },
    { date: "2026-07-20", supplier: "Flogas", level: "high", upcoming: false,
      title: "Flogas electricity +10.9%",
      body: "Increase on the standard variable estimated annual bill (secondary source).",
      url: "https://app.usecara.ie/energy/price-rises" },
    { date: "2026-07-01", supplier: "Electric Ireland & Yuno", level: "high", upcoming: false,
      title: "Electric Ireland +8%, Yuno Energy +9.5%",
      body: "Electricity increases announced in May 2026 (secondary source; RTÉ confirms both announced in May).",
      url: "https://app.usecara.ie/energy/price-rises" },
    { date: "2026-06-01", supplier: "CRU", level: "info", upcoming: false,
      title: "Dynamic (half-hourly) tariffs go live",
      body: "The five largest suppliers (Electric Ireland, Bord Gáis, SSE Airtricity, Energia, PrePay Power/Yuno) must offer a standard dynamic price contract (CRU202517).",
      url: "https://www.cru.ie/publications/28339/" }
  ]
};
