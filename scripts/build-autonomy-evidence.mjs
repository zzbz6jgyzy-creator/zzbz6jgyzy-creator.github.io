#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  M = require("../autonomy-evidence-model.js"),
  V = require("../autonomy-evidence-view.js");
const ROOT = fileURLToPath(new URL("..", import.meta.url));
export function buildAutonomyEvidence(root = ROOT) {
  const read = (f) => fs.readFileSync(path.join(root, f), "utf8"),
    data = M.validate(JSON.parse(read("data/autonomy-evidence.json"))),
    e = M.esc,
    arrow = V.arrow;
  const route = (href, k, title, text) =>
    `<a class="ae-route" href="${href}"><span class="ae-kicker">${k}</span><h3>${title} ${arrow}</h3><p>${text}</p></a>`;
  const heading = (id, k, title, text) =>
    `<header class="ae-section-head"><div><p class="ae-kicker">${k}</p><h2 id="${id}">${title}</h2></div><p>${text}</p></header>`;
  const main = `<main id="main" class="ae-studio">
 <section class="ae-hero" aria-labelledby="ae-title"><div class="ae-hero-copy"><p class="ae-kicker">Supercharged Daily / The evidence desk</p><h1 id="ae-title">Autonomy claims.<br/><span>Evidence first.</span></h1><p>FSD, Robotaxi and the space between a promise and proof. Understand who is driving, what is permitted and what the numbers actually establish.</p><div class="ae-actions"><a class="ae-button" href="#checks">Examine the evidence ${arrow}</a><a class="ae-link" href="#safety">Learn to read the numbers ${arrow}</a></div><div class="ae-hero-meta"><span>Independent analysis</span><span>Sources reviewed ${M.date(data.reviewed)}</span></div></div><div class="ae-hero-instrument"><div class="ae-instrument-head"><span>01 / The control question</span><span class="ae-signal">Illustration</span></div><div id="ae-hero-diagram">${V.diagram("supervised", "ae-hero")}</div><div class="ae-instrument-caption"><strong>A capable system.</strong><span>A separate question of responsibility.</span></div></div></section>
 <div class="ae-nav-wrap"><nav class="ae-nav" aria-label="Evidence desk sections"><a href="#understand" data-view="understand" aria-current="page">01 <span>Understand</span></a><a href="#checks" data-view="checks">02 <span>Claim checks</span></a><a href="#safety" data-view="safety">03 <span>Safety lab</span></a><a href="#sources" data-view="sources">04 <span>Source room</span></a></nav></div>
 <div class="ae-shell"><p id="ae-notice" role="status" aria-live="polite"></p><section class="ae-panel" id="understand" aria-labelledby="ae-understand-h">
 ${heading("ae-understand-h", "Start with the distinction", "One brand.<br/>Different responsibilities.", "The same vocabulary can describe a customer feature, a legal permission or a commercial service. Ask three questions before drawing a conclusion.")}
 <div class="ae-question-grid"><article><span>01</span><h3>Who drives?</h3><p>Is a human supervising the road, or is the system performing the driving task? What human assistance remains?</p></article><article><span>02</span><h3>Where and when?</h3><p>Which roads, operating conditions, jurisdiction and service boundary does the evidence cover?</p></article><article><span>03</span><h3>What establishes it?</h3><p>A manufacturer statement, regulator record, observed trip and statistical result answer different questions.</p></article></div>
 <section class="ae-mode-section" aria-label="Compare operating roles"><div class="ae-mode-controls ae-interactive" role="group" aria-label="Operating role"><button type="button" data-mode="supervised" aria-pressed="true">Customer FSD (Supervised)</button><button type="button" data-mode="driverless" aria-pressed="false">Driverless operation</button></div><div class="ae-mode-layout"><div id="ae-mode-diagram">${V.diagram()}</div><div class="ae-mode-copy" id="ae-mode-copy">${V.mode("supervised")}</div></div><noscript><div class="ae-noscript-mode">${V.mode("driverless")}</div></noscript></section>
 <section class="ae-gates" aria-labelledby="ae-gates-h"><div class="ae-section-head"><div><p class="ae-kicker">Separate records / not automatic steps</p><h3 id="ae-gates-h">Permission. Listing.<br/>Delivery. Service.</h3></div><p>A record in one column is not evidence that all the other columns are satisfied. Rules also differ by jurisdiction and operating model.</p></div><div class="ae-gate-grid"><article><span>Legal permission</span><h4>What is authorised?</h4><p>Read the operator, category, conditions and authority.</p></article><article><span>Market listing</span><h4>What is offered?</h4><p>A manufacturer describes availability in a market.</p></article><article><span>Vehicle delivery</span><h4>What reached a car?</h4><p>Check the actual hardware, software and installation.</p></article><article><span>Commercial service</span><h4>What can a rider book?</h4><p>Check the vehicle, trip boundary and service conditions.</p></article></div></section>
 <section class="ae-purpose"><div><p class="ae-kicker">Why this desk exists</p><h3>The trackers tell you<br/>what changed.<br/><span>This desk helps you judge it.</span></h3></div><p>Keep the detailed maps, market lists and fleet records in their specialist homes. Come here to understand the strength, scope and limitations of the evidence behind a headline.</p></section>
 <div class="ae-routes">${route("/fsd-europe.html", "Permission & availability", "FSD Europe", "Country records, legal sources, Tesla listings and vehicle eligibility.")}${route("/cybercab.html", "Fleet & service", "Cybercab / Robotaxi", "Vehicle types, service areas and sourced fleet records.")}${route("/updates.html", "Customer software", "Software tracker", "Reported builds, release notes and sampled rollouts.")}</div>
 </section>
 <section class="ae-panel" id="checks" aria-labelledby="ae-checks-h">${heading("ae-checks-h", "12 questions worth asking", "Read the claim.<br/>Inspect the limit.", "Each check shows what the source can establish, what it cannot and the next record to inspect. These are editorial interpretations, not regulatory decisions or automated truth scores.")}
 <div class="ae-filter-bar ae-interactive"><label for="ae-search">Find a question<input id="ae-search" type="search" placeholder="Try injuries, permit or registrations" autocomplete="off"/></label><div class="ae-filters" role="group" aria-label="Evidence topic">${Object.entries(
   M.topics,
 )
   .map(
     ([id, label]) =>
       `<button type="button" data-filter="${id}" aria-pressed="${id === "all"}">${label}</button>`,
   )
   .join(
     "",
   )}</div></div><p class="ae-results ae-interactive" id="ae-results" role="status">${data.claims.length} claim checks</p><button type="button" id="ae-clear-source" class="ae-reset ae-interactive" hidden>Clear source filter</button>
 <div class="ae-claims">${data.claims.map((c) => V.claim(data, c)).join("")}</div><p id="ae-no-results" hidden>No matching questions. Try a broader search or choose All evidence.</p>
 <aside class="ae-editor-note"><strong>A source type is not a truth score.</strong><p>A regulator record is strongest for the permission it actually grants. A manufacturer is the primary source for its own stated product conditions. Neither alone answers every real-world performance question.</p><a class="ae-link" href="#sources">Inspect the source room ${arrow}</a></aside></section>
 <section class="ae-panel" id="safety" aria-labelledby="ae-safety-h">${heading("ae-safety-h", "Read the method before the multiplier", "Better questions.<br/>Better comparisons.", "A safety headline is only meaningful alongside its event definition, exposure and operating conditions. This lab explains the arithmetic without ranking real fleets.")}
 <section class="ae-method-feature"><div><p class="ae-kicker">Case study / Tesla’s published methodology</p><h3>The definition<br/>changes the comparison.</h3><p>Tesla’s Robotaxi report covers 22 January–18 October 2026 and excludes onboard-monitor exposure. It includes offboard assistance or takeover.</p><p>Its injury endpoint uses a first-contact condition; its airbag endpoint counts the Robotaxi’s own airbags. The human injury benchmark does not apply the same first-contact restriction.</p><a class="ae-link" href="#source-tesla-safety">Read the original methodology ${arrow}</a></div><div class="ae-method-cards"><article><span>01 / Endpoint</span><h4>What counts?</h4><p>Injury, alleged injury, own-airbag deployment and any collision are different outcomes.</p></article><article><span>02 / Exposure</span><h4>Which miles?</h4><p>Use the same reporting period and operational population as the numerator.</p></article><article><span>03 / Conditions</span><h4>Where did it drive?</h4><p>Road type, weather, time of day and operating constraints matter.</p></article></div></section>
 <div class="ae-lab-grid"><section class="ae-lab-card" aria-labelledby="ae-rate-h"><p class="ae-kicker">Lab 01 / The denominator</p><h3 id="ae-rate-h">A count is not a rate.</h3><p>Change the exposure and see how the arithmetic moves. These are fictional inputs, not Tesla or competitor data.</p><div class="ae-lab-inputs ae-interactive"><label for="ae-events">Qualifying events<input id="ae-events" type="number" min="0" max="1000000000" step="1" value="5" inputmode="numeric"/></label><label for="ae-miles">Miles of exposure<input id="ae-miles" type="number" min="1" max="1000000000000" step="any" value="1000000" inputmode="decimal"/></label></div><div class="ae-rate-output" id="ae-rate-output" role="status">${V.rate(5, 1000000)}</div><p class="ae-fine">An event rate alone is not a risk-adjusted comparison. Definitions and operating conditions must also match.</p></section>
 <section class="ae-lab-card ae-zero-card" aria-labelledby="ae-zero-h"><p class="ae-kicker">Lab 02 / The uncertainty</p><h3 id="ae-zero-h">Zero observed.<br/>Still uncertain.</h3><div id="ae-zero-output" aria-live="polite">${V.uncertainty(3)}</div><label class="ae-range-label ae-interactive" for="ae-exposure">Example exposure<input id="ae-exposure" type="range" min="0.5" max="30" step="0.5" value="3" aria-valuetext="3 million miles"/><span>0.5 million <b>30 million miles</b></span></label><a class="ae-link" href="#statistical-method">Assumptions &amp; derivation ${arrow}</a></section></div>
 <section class="ae-comparison-checklist"><p class="ae-kicker">Before you repeat “safer than”</p><h3>Match the comparison.</h3><div><article><b>01</b><p><strong>Same event?</strong> Read the outcome and severity threshold.</p></article><article><b>02</b><p><strong>Same exposure?</strong> Match miles, dates and supervision mode.</p></article><article><b>03</b><p><strong>Same conditions?</strong> Compare roads, locations and time patterns.</p></article><article><b>04</b><p><strong>Same capture?</strong> Check reporting rules, missing events and revisions.</p></article></div><p class="ae-fine">NHTSA cautions that reporting requirements, telemetry access and exposure vary. Its SGO counts are not an adjusted safety league table.</p><a class="ae-link" href="#source-nhtsa-sgo">Open the regulator’s limitations ${arrow}</a></section>
 <details class="ae-stat-method" id="statistical-method"><summary>Statistical model: what the zero-event result means</summary><div><p>For an illustrative Poisson event count with constant rate λ and exposure E, the chance of zero events is exp(−λE). Setting that probability to 0.05 gives a one-sided 95% upper rate bound of −ln(0.05)/E, approximately 2.996/E. Multiply by 1,000,000 for events per million miles.</p><p>This model assumes independent events, a constant rate over the stated exposure, a fixed event definition, correct mileage and complete ascertainment. Real driving can violate these assumptions. The output is not a posterior probability that the rate lies below the bound and does not establish equivalence to another population.</p><p>The lab only computes this bound for a zero-event sample. It does not calculate general confidence intervals, causal effects or an individual trip’s risk.</p></div></details></section>
 <section class="ae-panel" id="sources" aria-labelledby="ae-sources-h">${heading("ae-sources-h", "The source room", "Open the record.<br/>Keep the context.", "Review dates record when this desk inspected a source. They are not publication dates, legal effective dates or a promise that the page has not changed since.")}
 <div class="ae-source-summary"><span><b>${data.sources.length}</b> source records</span><span><b>${data.claims.length}</b> claim checks</span><span><b>${M.date(data.reviewed)}</b> desk review</span></div><div class="ae-source-list">${V.sources(data)}</div>
 <section class="ae-editorial-method" id="method"><p class="ae-kicker">Our editorial method</p><h3>Traceable, bounded and revisable.</h3><ol><li>Identify the precise claim, vehicle, place and operating mode.</li><li>Read the primary record and retain the distinction between statement, permission and observation.</li><li>Describe the result within that scope. Keep unresolved questions visible.</li><li>Record the review date; update the desk when the underlying evidence changes.</li></ol><p>This desk is curated editorially. It does not poll regulators or vehicles in real time. The specialist trackers contain the changing lists and records. Manufacturer statements remain attributed; our interpretation is not official approval.</p><p>Supercharged Daily is independent and is not affiliated with Tesla. The editor is a Tesla owner and shareholder. <a href="/about.html">About the editor</a> · <a href="mailto:superchargeddaily@gmail.com?subject=Autonomy%20evidence%20correction">Suggest a correction</a></p><div class="ae-actions"><a class="ae-button" href="/cybercab.html">Explore Robotaxi evidence ${arrow}</a><a class="ae-link" href="/promise-tracker.html">Track the promises ${arrow}</a></div></section></section>
 </div><script type="application/json" id="ae-data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script></main>`;
  let html = read("autonomy.html").replace(
    /<main\b[\s\S]*?<\/main>/,
    () => main,
  );
  const title = "FSD & Robotaxi Evidence Desk — Supercharged Daily",
    description =
      "Understand Tesla FSD and Robotaxi claims: supervision, permits, fleet evidence and safety methods. Explore sourced claim checks and an interactive safety lab.";
  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${e(title)}</title>`)
    .replace(
      /(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*/g,
      (_, prefix) => prefix + description,
    )
    .replace(
      /(<meta (?:name|property)="(?:og:title|twitter:title)" content=")[^"]*/g,
      (_, prefix) => prefix + e(title),
    );
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://superchargeddaily.com/autonomy.html#webpage",
    name: title,
    url: "https://superchargeddaily.com/autonomy.html",
    description,
    dateModified: data.reviewed,
    about: [
      { "@type": "Thing", name: "Tesla FSD (Supervised)" },
      { "@type": "Thing", name: "Robotaxi evidence and safety methodology" },
    ],
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
  const indexPath = path.join(root, "data/pages.json");
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    const records = [
      {
        url: "/autonomy.html",
        title: "FSD & Robotaxi evidence desk",
        tag: "Evidence",
        summary: description,
      },
      {
        url: "/autonomy.html#checks",
        title: "FSD & Robotaxi claim checks",
        tag: "Evidence",
        summary:
          "Twelve sourced questions about supervision, permits, eligibility, fleet records and safety claims.",
      },
      {
        url: "/autonomy.html#safety",
        title: "Autonomy safety lab",
        tag: "Evidence",
        summary:
          "Explore event rates, zero-event uncertainty and the definitions behind Robotaxi safety comparisons.",
      },
      {
        url: "/autonomy.html#sources",
        title: "Autonomy evidence source room",
        tag: "Evidence",
        summary:
          "Primary regulator, manufacturer and standards sources with scope, review dates and limitations.",
      },
    ];
    const isOurs = (page) => records.some((record) => record.url === page.url);
    const originalSlot = index.pages.findIndex(
      (page) => page.url === "/autonomy.html",
    );
    const slot =
      originalSlot < 0
        ? index.pages.findIndex((page) => page.url.startsWith("/explainers/"))
        : index.pages.slice(0, originalSlot).filter((page) => !isOurs(page))
            .length;
    index.pages = index.pages.filter((page) => !isOurs(page));
    index.pages.splice(slot < 0 ? index.pages.length : slot, 0, ...records);
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");
  }
  fs.writeFileSync(path.join(root, "autonomy.html"), html);
  return data;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  buildAutonomyEvidence();
  console.log("Autonomy evidence desk saved HTML built");
}
