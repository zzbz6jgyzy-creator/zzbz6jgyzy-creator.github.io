#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  M = require("../buying-studio-model.js"),
  V = require("../buying-studio-view.js"),
  ROOT = fileURLToPath(new URL("..", import.meta.url));
export function buildBuyingStudio(root = ROOT) {
  const read = (f) => fs.readFileSync(path.join(root, f), "utf8"),
    d = M.validate(JSON.parse(read("data/buying-studio.json"))),
    e = M.esc,
    a = V.arrow,
    defaults = M.defaults();
  const input = (id, label, value, min, max, step = "any") =>
    `<label for="bg-${id}">${label}<input type="number" id="bg-${id}" data-budget="${id}" value="${value}" min="${min}" max="${max}" step="${step}" inputmode="decimal"/></label>`;
  const field = (id, label) =>
    input(
      id,
      label,
      defaults[id],
      ...M.limits[id],
      ["years", "months"].includes(id) ? "1" : "any",
    );
  const head = (id, k, title, text) =>
    `<header class="bg-section-head"><div><p class="bg-kicker">${k}</p><h2 id="${id}">${title}</h2></div><p>${text}</p></header>`;
  const guide = (id, title, text) =>
    `<article class="bg-guide-card" id="${id}"><h3>${title}</h3>${text}</article>`;
  let html = read("guides/tesla-buying-guide.html");
  const main = `<main id="main" class="bg-studio"><section class="bg-hero" aria-labelledby="bg-title"><div class="bg-hero-copy"><p class="bg-kicker">Supercharged Daily / The buying studio</p><h1 id="bg-title">Your next Tesla.<br/><span>Chosen with clarity.</span></h1><p>Find the car that fits your life. Understand the trade-offs. Build a budget you can explain—before you place an order.</p><div class="bg-actions"><a class="bg-button" href="#fit">Find your starting point ${a}</a><a class="bg-link" href="#numbers">Build your budget ${a}</a></div><div class="bg-hero-meta"><span>Independent owner’s guide</span><span>Editorial review ${M.date(d.reviewed)}</span></div></div><figure class="bg-hero-media"><picture><source type="image/avif" srcset="/assets/guides/model3-highland-white-480w.avif 480w, /assets/guides/model3-highland-white-960w.avif 960w, /assets/guides/model3-highland-white-1280w.avif 1280w" sizes="(max-width:760px) 100vw, 55vw"/><img src="/assets/guides/model3-highland-white-960w.webp" alt="White Tesla Model 3 Highland photographed from above" width="1280" height="960" fetchpriority="high" decoding="async"/></picture><div class="bg-hero-label"><span>Start with the everyday.</span><strong>The right car fits<br/>more than a spec sheet.</strong></div><figcaption>Model 3 · Damian B Oh / CC BY-SA 4.0 · <a href="#image-credits">Image credits</a></figcaption></figure></section>
 <div class="bg-nav-wrap"><nav class="bg-nav" aria-label="Buying studio sections"><a href="#fit" data-bg-view="fit" aria-current="page">01 <span>Find your fit</span></a><a href="#models" data-bg-view="models">02 <span>Compare models</span></a><a href="#numbers" data-bg-view="numbers">03 <span>Work the numbers</span></a><a href="#confidence" data-bg-view="confidence">04 <span>Buy with confidence</span></a></nav></div><div class="bg-shell"><p id="bg-notice" role="status" aria-live="polite"></p><div class="bg-plan-bar"><p id="bg-storage">Build a shortlist, explore your costs and work through a practical checklist.</p><button class="bg-download bg-interactive" type="button" id="bg-download">Download my buying plan ${a}</button></div>
 <section class="bg-panel" id="fit" aria-labelledby="bg-fit-h">${head("bg-fit-h", "A better way to begin", "Start with your life.<br/>Then choose the car.", "A useful shortlist begins with real journeys, passengers, parking and charging. A headline range or monthly payment is only one part of the decision.")}
 <div class="bg-start-grid"><article><span>01 / Your routine</span><h3>What must it do?</h3><p>Think about passengers, bulky loads, your usual parking spot and the difficult trip you make a few times a year.</p></article><article><span>02 / Your charging</span><h3>Where does it refill?</h3><p>Price the charging routine you can actually use: home, work, public AC or rapid charging. Convenience is part of the cost.</p></article><article><span>03 / Your budget</span><h3>What does ownership cost?</h3><p>Include insurance, tyres, electricity, finance and likely resale. A low payment can hide a long term or a large final bill.</p></article></div>
 <section class="bg-finder" aria-labelledby="bg-finder-h"><div><p class="bg-kicker">A transparent starting point</p><h3 id="bg-finder-h">What matters most?</h3><p>Choose a priority and buying route. The suggestions reflect model-family characteristics—not a verified fit for your budget, seating needs or local market.</p><div class="bg-finder-controls bg-interactive"><label for="bg-priority">Main priority<select id="bg-priority"><option value="commute">Everyday commuting</option><option value="family">Family &amp; flexible cargo</option><option value="utility">Pickup-specific work</option><option value="touring">A larger touring car</option><option value="performance">A focused driving experience</option></select></label><label for="bg-route">Buying route<select id="bg-route"><option value="either">New or used</option><option value="new">New-car references</option><option value="used">Used-market research</option></select></label></div><details><summary>How these suggestions work</summary><p>A matching stated priority gets two points; a used-market alternative gets one additional point when you choose used. Ties follow the catalogue order. This is a simple editorial sorting rule, not an AI recommendation or an assessment of a particular car.</p></details></div><div id="bg-recommendations" class="bg-recommendations">${V.recommendations(d, "commute", "either")}</div></section>
 <div class="bg-decision-route"><p class="bg-kicker">Your route to a confident decision</p><ol><li><b>Shortlist</b><span>Compare the model families.</span></li><li><b>Specify</b><span>Match exact trim, year and wheels.</span></li><li><b>Cost</b><span>Use an itemised local quote.</span></li><li><b>Verify</b><span>Drive, inspect and document.</span></li></ol></div><div class="bg-editorial-note"><strong>Keep assistance separate from autonomy.</strong><p>FSD (Supervised) requires an attentive driver. Do not value a used car on an assumption that a subscription, promotion or future capability transfers with it.</p><a class="bg-link" href="/autonomy.html">Visit the evidence desk ${a}</a></div></section>
 <section class="bg-panel" id="models" aria-labelledby="bg-models-h">${head("bg-models-h", "The right shape / the right configuration", "Compare the car.<br/>Not the headline.", "Look at the body style first. Then compare one exact trim against another, with the same rating standard, model year and market.")}
 <div class="bg-model-tabs bg-interactive" role="group" aria-label="Explore a model family">${d.models.map((m, i) => `<button type="button" data-bg-model="${m.id}" aria-pressed="${i === 0}">${m.name}</button>`).join("")}</div><div class="bg-showroom" id="bg-showroom">${V.showroom(d, "m3")}</div><div class="bg-model-library">${d.models.map((m) => `<a href="${m.review}"><span>${m.body}</span><strong>${m.name}</strong><small>${m.tag} ${a}</small></a>`).join("")}</div>
 <section class="bg-compare-section" aria-labelledby="bg-compare-h"><div class="bg-section-head"><div><p class="bg-kicker">Your shortlist / up to three</p><h3 id="bg-compare-h">Put them side by side.</h3></div><p>Saved locally in this browser. Model S and Model X are used-market research alternatives here; no current new-car availability is implied.</p></div><div class="bg-shortlist-controls bg-interactive" id="bg-shortlist">${V.shortlist(d, ["m3", "my"])}</div><div id="bg-comparison">${V.comparison(d, ["m3", "my"])}</div></section>
 <div class="bg-trim-guide">${guide("trims", "Choose a trim deliberately.", "<p>Start with the features and journey margin you need. Check the actual drive layout, wheels, seating, suspension, cabin equipment, towing approval and battery warranty—not just the badge.</p><p>Performance wheels and tyres can change ride, running costs and range. Buy the equipment you will use, then check its replacement cost.</p>")}${guide("range", "Use the right range number.", '<p>EPA and WLTP use different test procedures. A converted mile figure is still the same rating standard; it does not become another test result.</p><p>For a difficult trip, think about speed, temperature, elevation, loaded weight, charger access and reserve. Rated range is not a door-to-door winter itinerary.</p><a class="bg-link" href="https://www.fueleconomy.gov/feg/Find.do?action=sbsSelect">Check the exact EPA record ' + a + "</a>")}</div></section>
 <section class="bg-panel" id="numbers" aria-labelledby="bg-numbers-h">${head("bg-numbers-h", "The buying budget", "The payment is one number.<br/>Ownership is the whole picture.", "Use your actual quote and realistic running costs. Every figure below starts as an illustrative assumption; none is a current Tesla offer or a currency conversion.")}
 <div class="bg-budget-toolbar bg-interactive"><label for="bg-currency">All money in<select id="bg-currency">${M.currencies.map((c) => `<option value="${c}">${c}</option>`).join("")}</select></label><label for="bg-unit">Distance unit<select id="bg-unit"><option value="mi">Miles</option><option value="km">Kilometres</option></select></label><label for="bg-payment">Purchase method<select id="bg-payment"><option value="finance">Standard amortising loan</option><option value="cash">Cash purchase</option></select></label><button type="button" id="bg-budget-reset">Reset example</button></div>
 <div class="bg-budget-summary bg-interactive" id="bg-budget-summary" role="status">${V.summary(defaults)}</div><div class="bg-budget-layout" id="buy-calc"><div class="bg-budget-fields bg-interactive"><fieldset><legend>01 / Your itemised quote</legend><div class="bg-fields">${field("price", "Vehicle price")}${field("fees", "Fees / delivery")}${field("tax", "Actual tax amount")}${field("incentive", "Confirmed incentive")}${field("charger", "Charger + installation")}</div><p class="bg-fine">Enter actual amounts rather than an assumed tax percentage. Do not include an incentive you have not confirmed.</p></fieldset><fieldset id="bg-finance-fields"><legend>02 / The loan</legend><div class="bg-fields">${field("down", "Down payment")}${field("apr", "Annual interest rate / %")}${field("months", "Loan term / months")}</div><p class="bg-fine">A fixed-rate, fully amortising loan only. Quoted APR can include fees this model does not represent; use the lender’s contract for an exact payment. No lease, PCP/balloon, trade-in debt or early-settlement fees.</p></fieldset><fieldset><legend>03 / Your ownership horizon</legend><div class="bg-fields">${field("years", "Years you plan to own")}${field("resale", "Assumed resale value")}${field("annualDistance", "Annual distance")}<label for="bg-consumption">Vehicle consumption / <span data-consumption-unit>Wh/mi</span><input id="bg-consumption" data-budget="consumption" type="number" min="1" max="5000" step="any" value="270" inputmode="decimal"/></label>${field("efficiency", "Charging efficiency / %")}</div><p class="bg-fine">Consumption here is battery-side energy. Efficiency adds charging losses once. Do not use a wall-energy rating without adjusting this assumption.</p></fieldset><fieldset><legend>04 / Electricity and other costs</legend><div class="bg-fields">${field("homeShare", "Home / work share / %")}${field("homeRate", "Home / work price per kWh")}${field("publicRate", "Public price per kWh")}${field("insurance", "Insurance / year")}${field("roadTax", "Vehicle tax / year")}${field("maintenance", "Tyres + maintenance / year")}${field("subscription", "Optional subscriptions / month")}</div></fieldset></div><aside class="bg-budget-result" id="bg-budget-result" aria-live="polite">${V.budget(defaults)}</aside></div>
 <noscript><p class="bg-fine">The worked example uses USD 40,000 vehicle price, 1,000 fees, 1,200 charger/install, 5,000 down, 5% interest over 60 months, five years owned and 18,000 resale. Annual driving is 10,000 miles at 270 Wh/mi, 90% charging efficiency, 80% at 0.20/kWh and 20% at 0.50/kWh. Annual insurance/tax/maintenance totals 2,000. Enable JavaScript to edit these illustrative assumptions.</p></noscript>
 <div class="bg-price-reference"><div><p class="bg-kicker">Optional / dated US reference</p><h3>Start from a quote.<br/>Use a reference carefully.</h3><p>The old guide’s US price/fee records are retained with their original ${M.date(d.referenceDate)} date. Loading one resets the budget to a USD example. Confirm the exact current local order price before relying on it.</p></div><div class="bg-reference-buttons bg-interactive">${d.models
   .filter((m) => m.reference)
   .map(
     (m) =>
       `<button type="button" data-reference="${m.id}">${m.name}<span>${M.money(m.reference.price)} + ${M.money(m.reference.fees)} fees</span></button>`,
   )
   .join("")}</div></div>
 <section class="bg-charging-planner" id="charging" aria-labelledby="bg-charging-h"><div><p class="bg-kicker">The practical ownership question</p><h3 id="bg-charging-h">Can your charging routine<br/>keep up with your day?</h3><p>Use average power actually available at the wall, not the charger’s advertised maximum. Shared circuits, vehicle limits and your installation can reduce it.</p><div class="bg-charge-inputs bg-fields bg-interactive"><label for="bg-daily">Daily distance / <span data-distance-unit>mi</span><input id="bg-daily" type="number" min="0" max="5000" value="40" step="any" inputmode="decimal"/></label><label for="bg-power">Average wall power / kW<input id="bg-power" type="number" min="0.1" max="50" value="7.4" step="any" inputmode="decimal"/></label><label for="bg-hours">Hours plugged in<input id="bg-hours" type="number" min="0.1" max="24" value="8" step="any" inputmode="decimal"/></label></div><p class="bg-fine">Uses the consumption and efficiency from your budget. Example daily distance is 40 miles, wall power 7.4 kW and plug-in window 8 hours.</p><a class="bg-link" href="https://www.tesla.com/support/charging/home-charging">Compare Tesla’s charging options ${a}</a></div><div id="bg-charge-result">${V.charging({ distance: 40, consumption: 270, efficiency: 90, power: 7.4, hours: 8 })}</div></section></section>
 <section class="bg-panel" id="confidence" aria-labelledby="bg-confidence-h">${head("bg-confidence-h", "From shortlist to handover", "Buy with your eyes open.<br/>Keep the receipts.", "Use the checklist for a test drive, a used-car inspection or delivery day. It records your preparation; it does not certify a car’s condition or replace a professional inspection.")}
 <div class="bg-checklist-header"><p><strong id="bg-check-count">0 of ${d.checklist.length}</strong> preparation tasks checked</p><button type="button" id="bg-check-reset" class="bg-interactive">Clear checklist</button></div><div id="bg-checklist" class="bg-checklist">${V.checklist(d, [])}</div>
 <div class="bg-guide-grid">${guide("new-used", "New, inventory or used?", "<p>A factory order, an inventory car and a used vehicle can have different equipment, timing, history and cover. Compare actual itemised offers rather than a generic starting price.</p><p>A used Model S or X is not simply a larger Model 3/Y. Research the generation, hardware, fitted options and likely repair exposure. A good independent inspection can be more useful than a seller’s confident description.</p>")}${guide("warranty", "Check the actual warranty.", '<p>US reference: basic coverage is four years/50,000 miles. Battery and drive-unit coverage is eight years with mileage limits of 100,000, 120,000 or 150,000 miles depending on the named model/trim, with a stated 70% retention threshold.</p><p>Tesla’s Certified Pre-Owned cover generally adds one year/10,000 miles after basic cover; lease terms can differ. Remaining battery cover is separate. The vehicle’s supplied warranty and local terms control.</p><a class="bg-link" href="https://www.tesla.com/support/vehicle-warranty">Read Tesla’s US warranty ' + a + "</a>")}${guide("fsd", "Verify software entitlements.", '<p>Check the installed software and hardware on the exact vehicle. A badge, a seller’s old screenshot or “capable” in a listing is not a promise that a feature is available in your country.</p><p>Active driver supervision remains required for FSD (Supervised). Subscriptions, promotions and some benefits may not transfer. Confirm the purchase or subscription status with the seller and Tesla.</p><a class="bg-link" href="/fsd-europe.html">Check regional evidence ' + a + "</a>")}${guide("incentives", "Treat incentives as a separate check.", '<p>US federal new, used and qualified-commercial clean-vehicle credits are unavailable for vehicles acquired after 30 September 2025. Earlier qualifying acquisitions have their own conditions.</p><p>Do not extrapolate this to another country or assume a local, state or utility incentive applies to your situation. Verify the current scheme and your eligibility before putting a saving into the budget.</p><a class="bg-link" href="https://www.irs.gov/clean-vehicle-tax-credits">Read the IRS guidance ' + a + "</a>")}${guide("ownership", "Make the account handover part of the deal.", '<p>For a third-party purchase, claim ownership through the Tesla app and follow Tesla’s document process. Confirm the previous owner’s access has been removed and your account has the right permissions.</p><p>Do not assume every charging credit, subscription or paid upgrade stays with a car. Check that separately before purchase.</p><a class="bg-link" href="https://www.tesla.com/support/how-add-or-remove-vehicles-tesla-app">Tesla’s transfer process ' + a + "</a>")}${guide("next", "Your next step after buying.", '<p>Build an exact year/trim/hardware profile, keep your energy and cost records, and follow the updates relevant to the car you actually bought.</p><a class="bg-link" href="/my-tesla.html">Open My Tesla ' + a + '</a><p><a class="bg-link" href="/tesla-clubs.html">Find an owners community ' + a + "</a></p>")}</div>
 <section class="bg-sources" id="sources"><details><summary>Sources, dates and how this guide stays honest</summary><p>Editorial guidance reviewed ${M.date(d.reviewed)}. Comparison figures are dated ${M.date(d.referenceDate)} and are not a fresh price check. Model photos can show different trims. Plans and checklist progress stay in this browser and do not sync with your account.</p><div>${d.sources.map((s) => `<article><h3><a href="${s.url}">${e(s.name)} ${a}</a></h3><p>${e(s.note)}</p><span>Guidance reviewed ${M.date(s.reviewed)}</span></article>`).join("")}</div><p>The budget assumes constant annual usage, tariffs and operating costs, plus your entered resale. It omits opportunity cost, inflation, repairs outside your allowance, leases/balloons and local finance/tax rules. There is no live Tesla pricing or account connection here.</p><section id="image-credits"><h3>Image credits</h3><p>Hero: <a href="https://commons.wikimedia.org/wiki/File:Tesla_Model_3_Highland_Pearl_White_Multi-Coat_(3).jpg">Damian B Oh</a>. Model 3: <a href="https://commons.wikimedia.org/wiki/File:Tesla_Model_3_Highland_Performance_Quicksilver_01.jpg">Ethan Llamas</a>. Model X: <a href="https://commons.wikimedia.org/wiki/File:Tesla_Model_X_Plaid_Shadow_Grey_01.jpg">Ethan Llamas</a>. Model Y: <a href="https://commons.wikimedia.org/wiki/File:Tesla_Model_Y_Dual_Motor_First_Edition_Juniper_Quicksilver_(8).jpg">Damian B Oh</a>. Model S: <a href="https://commons.wikimedia.org/wiki/File:Tesla_Model_S_2024_Blue.jpg">Correlated alembic</a>. Cybertruck: <a href="https://commons.wikimedia.org/wiki/File:Foundation_series_Cybertruck_at_dusk_in_San_Jose_dllu_(cropped).jpg">Dllu</a>. Wikimedia Commons photos, cropped and resized, under <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.</p></section></details></section>
 <aside class="bg-referral"><div><p class="bg-kicker">Optional / referral disclosure</p><h3>If this guide helped.</h3><p>You can use the editor’s Tesla referral link. Benefits depend on Tesla’s current programme and your eligibility; we may earn a reward.</p></div><a class="bg-button" href="https://ts.la/alex474841" target="_blank" rel="sponsored noopener">View the referral offer ${a}</a></aside><p class="bg-fine">Supercharged Daily is independent and is not affiliated with Tesla. The editor is an owner and shareholder. <a href="/about.html">About the editor</a> · <a href="/gear.html">Owner gear and affiliate disclosures</a></p></section></div><script type="application/json" id="bg-data">${JSON.stringify(d).replace(/</g, "\\u003c")}</script></main>`;
  html = html.replace(/<main\b[\s\S]*?<\/main>/, () => main);
  const title = "Tesla Buying Guide — Compare, Plan & Buy | Supercharged Daily",
    description =
      "Find the Tesla that fits your life. Compare exact model references, plan cash or finance costs, test a charging routine and save a practical buying checklist.";
  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${e(title)}</title>`)
    .replace(
      /(<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*/g,
      (_, p) => p + description,
    )
    .replace(
      /(<meta (?:name|property)="(?:og:title|twitter:title)" content=")[^"]*/g,
      (_, p) => p + e(title),
    );
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id":
      "https://superchargeddaily.com/guides/tesla-buying-guide.html#webpage",
    name: title,
    url: "https://superchargeddaily.com/guides/tesla-buying-guide.html",
    description,
    dateModified: d.reviewed,
    author: {
      "@type": "Person",
      name: "Alex R",
      url: "https://superchargeddaily.com/about.html",
    },
    isPartOf: {
      "@type": "WebSite",
      name: "Supercharged Daily",
      url: "https://superchargeddaily.com/",
    },
  };
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    () =>
      `<script type="application/ld+json">${JSON.stringify(schema)}</script>`,
  );
  fs.writeFileSync(path.join(root, "guides/tesla-buying-guide.html"), html);
  const indexPath = path.join(root, "data/pages.json");
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, "utf8")),
      url = "/guides/tesla-buying-guide.html",
      records = [
        {
          url,
          title: "Tesla buying studio",
          tag: "Buying guide",
          summary: description,
        },
        ...Object.entries({
          models: [
            "Compare Tesla models",
            "Model families, exact archived US reference trims and a saved shortlist.",
          ],
          numbers: [
            "Tesla ownership budget & charging planner",
            "Editable cash/loan costs, energy assumptions and a daily charging estimate.",
          ],
          confidence: [
            "Tesla buying and delivery checklist",
            "Saved preparation tasks for research, quotes, used-car inspection and handover.",
          ],
        }).map(([id, [title, summary]]) => ({
          url: url + "#" + id,
          title,
          tag: "Buying guide",
          summary,
        })),
      ],
      isOurs = (p) => records.some((r) => r.url === p.url),
      oldSlot = index.pages.findIndex((p) => p.url === url),
      slot =
        oldSlot < 0
          ? index.pages.findIndex((p) => p.url.startsWith("/explainers/"))
          : index.pages.slice(0, oldSlot).filter((p) => !isOurs(p)).length;
    index.pages = index.pages.filter((p) => !isOurs(p));
    index.pages.splice(slot < 0 ? index.pages.length : slot, 0, ...records);
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");
  }
  return d;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  buildBuyingStudio();
  console.log("Buying studio saved HTML built");
}
