(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(require("./autonomy-evidence-model.js"));
  else root.AutonomyEvidenceView = factory(root.AutonomyEvidenceModel);
})(typeof window !== "undefined" ? window : globalThis, function (M) {
  "use strict";
  const e = M.esc;
  const arrow =
    '<svg class="ae-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 16 16 4M4 4h12v12"/></svg>';
  function reference(data, id) {
    const source = data.sources.find((s) => s.id === id);
    return `<a class="ae-reference" href="#source-${id}">${e(source.kind)} · ${e(source.name)} ${arrow}</a>`;
  }
  function claim(data, c) {
    return `<article class="ae-claim" id="claim-${c.id}" data-topic="${c.topic}" data-claim="${c.id}">
      <div class="ae-claim-top"><span class="ae-kicker">${e(M.topics[c.topic])}</span><span class="ae-verdict">${e(c.status)}</span></div>
      <h3>${e(c.title)}</h3><p class="ae-answer">${e(c.answer)}</p>
      <dl><dt>The evidence establishes</dt><dd>${e(c.establishes)}</dd><dt>The limit</dt><dd>${e(c.limits)}</dd></dl>
      <details><summary>Sources &amp; next check</summary><p>${e(c.next)}</p><div class="ae-references">${c.sources.map((id) => reference(data, id)).join("")}</div><p class="ae-fine">Editorial review: ${M.date(c.reviewed)}. <a href="#claim-${c.id}">Link to this check</a></p></details>
    </article>`;
  }
  function sources(data) {
    return data.sources
      .map(
        (s) =>
          `<article class="ae-source" id="source-${s.id}"><div><span class="ae-source-kind">${e(s.kind)}</span><h3><a href="${e(s.url)}">${e(s.name)} ${arrow}</a></h3><p>${e(s.scope)}</p></div><div><p class="ae-fine">Reviewed ${M.date(s.reviewed)}${s.date ? " · Published " + M.date(s.date) : " · Publication date not supplied"}</p><p><b>Read with this limit:</b> ${e(s.limit)}</p><a class="ae-source-checks" href="#checks" data-source-filter="${s.id}">Show linked claim checks ${arrow}</a></div></article>`,
      )
      .join("");
  }
  function diagram(mode = "supervised", prefix = "ae-mode") {
    const driverless = mode === "driverless";
    return `<svg class="ae-road-diagram" viewBox="0 0 640 520" role="img" aria-label="${driverless ? "Conceptual driverless operation within a defined operating boundary, with an offboard support link." : "Conceptual customer FSD with an actively supervising driver. Both driving and steering assistance remain supervised."}">
      <defs><linearGradient id="ae-road-light" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#ee365c" stop-opacity=".5"/><stop offset="1" stop-color="#ee365c" stop-opacity="0"/></linearGradient><pattern id="ae-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0v32" fill="none" stroke="#7a829d" stroke-opacity=".12"/></pattern><linearGradient id="ae-body" x2="1" y2="1"><stop stop-color="#8c94a8"/><stop offset=".5" stop-color="#222b3a"/><stop offset="1" stop-color="#536078"/></linearGradient></defs>
      <rect width="640" height="520" fill="#0d121c"/><rect width="640" height="520" fill="url(#ae-grid)"/>
      <g fill="none"><path d="M170 540V-20M470 540V-20" stroke="#434b60" stroke-width="2"/><path d="M230 540V-20M410 540V-20" stroke="#646d83" stroke-dasharray="18 22" stroke-opacity=".5"/><path d="M320 530V-30" stroke="#ef5270" stroke-dasharray="5 11" opacity=".6"/><path d="M300 230Q320 40 380 0H260Q320 40 340 230" fill="url(#ae-road-light)" stroke="none"/></g>
      ${driverless ? '<rect class="ae-domain" x="115" y="60" width="410" height="410" rx="28" fill="none" stroke="#73c3d2" stroke-dasharray="5 7"/><text x="135" y="85" fill="#94d7df" font-family="monospace" font-size="10" letter-spacing="2">DEFINED OPERATING DOMAIN</text>' : '<g fill="none" stroke="#e73c60" stroke-opacity=".25"><circle class="ae-scan" cx="320" cy="280" r="145"/><circle cx="320" cy="280" r="105"/></g>'}
      <g transform="translate(273 195)"><rect x="-7" y="24" width="9" height="30" rx="3" fill="#020409"/><rect x="92" y="24" width="9" height="30" rx="3" fill="#020409"/><rect x="-7" y="119" width="9" height="30" rx="3" fill="#020409"/><rect x="92" y="119" width="9" height="30" rx="3" fill="#020409"/><path d="M20 0Q47-7 74 0Q94 6 94 44v85q-2 38-18 44H18Q0 165 0 129V44Q0 6 20 0Z" fill="url(#ae-body)" stroke="#bec5d3" stroke-width="1"/><path d="M17 42Q47 34 77 42L83 75H11Z" fill="#050a12" stroke="#5e6d83"/><path d="M17 127h60l4 24H13Z" fill="#080d17" stroke="#5e6d83"/><rect x="14" y="81" width="66" height="40" rx="6" fill="#1a2331"/><path d="M7 15h18m44 0h18" stroke="#eff7ff" stroke-width="3"/><path d="M12 162h70" stroke="#ec365c" stroke-width="3"/>${driverless ? '<circle cx="47" cy="101" r="10" fill="none" stroke="#73c3d2"/><path d="m42 101 4 4 7-9" fill="none" stroke="#73c3d2"/>' : '<circle cx="30" cy="69" r="8" fill="none" stroke="#ff849c" stroke-width="2"/><path d="M23 69h14m-7 0v7" stroke="#ff849c"/><circle cx="30" cy="93" r="7" fill="#ff849c"/><path d="M20 110q10-18 20 0" fill="none" stroke="#ff849c" stroke-width="3"/>'}</g>
      <g fill="none" stroke="${driverless ? "#73c3d2" : "#ef718c"}"><path d="M270 282H96v-48"/><circle cx="270" cy="282" r="3" fill="currentColor"/><path d="M373 306h180v80" stroke-dasharray="3 5"/></g>
      <g font-family="monospace" font-size="10" letter-spacing="1.3"><text x="35" y="210" fill="${driverless ? "#94d7df" : "#ff8ca2"}">${driverless ? "SYSTEM DRIVING" : "DRIVER SUPERVISING"}</text><text x="410" y="410" fill="#9da8bd">${driverless ? "OFFBOARD SUPPORT" : "ASSISTED CONTROL"}</text><text x="35" y="490" fill="#77839a" font-size="8">CONCEPTUAL ILLUSTRATION / NOT LIVE VEHICLE DATA</text></g>
    </svg>`
      .replaceAll("ae-road-light", prefix + "-road-light")
      .replaceAll("ae-grid", prefix + "-grid")
      .replaceAll("ae-body", prefix + "-body");
  }
  function mode(mode) {
    return mode === "driverless"
      ? `<p class="ae-kicker">Concept / driverless operation</p><h3>The system drives.<br/>The boundary matters.</h3><p>In a driverless operating model, the system handles the driving task within defined conditions. Check the specific service’s limitations, fallback arrangements and human-support roles.</p><ul><li>No onboard driver in this illustration</li><li>Geography, roads and conditions can be restricted</li><li>Offboard assistance is a separate evidence question</li></ul><p class="ae-fine">A role illustration, not a certification of a Tesla product or every Robotaxi trip.</p>`
      : `<p class="ae-kicker">Customer feature / supervised</p><h3>The car assists.<br/>The driver supervises.</h3><p>Tesla’s FSD (Supervised) guidance keeps an attentive human responsible for driving. Product naming, steering capability and a smooth demo do not change that responsibility.</p><ul><li>Driver continuously supervises</li><li>Driver must intervene when needed</li><li>Feature eligibility depends on the actual car</li></ul><p class="ae-fine">Read your owner’s manual and local Tesla guidance for the vehicle’s actual features.</p>`;
  }
  function rate(events, miles) {
    const result = M.eventRate(events, miles);
    return result === null
      ? '<p class="ae-input-error">Enter a whole event count from 0 to 1 billion and mileage from 1 to 1 trillion.</p>'
      : `<strong>${result.toLocaleString("en-US", { maximumFractionDigits: 3 })}</strong><span>qualifying events / million miles</span><p>${Number(events).toLocaleString("en-US")} events ÷ ${Number(miles).toLocaleString("en-US")} miles × 1,000,000</p>`;
  }
  function uncertainty(millions = 3) {
    const bound = M.zeroBound(Number(millions) * 1e6);
    return `<span class="ae-kicker">Illustrative zero-event sample</span><strong>${Number(millions).toLocaleString("en-US")}<em> million miles</em></strong><div class="ae-bound"><span>One-sided 95% upper rate bound</span><b>${bound.toLocaleString("en-US", { maximumFractionDigits: 3 })}<small> events / million miles</small></b></div><p>With zero qualifying events in this example, the Poisson model still permits a positive underlying rate. More exposure tightens the bound; it does not establish zero risk.</p>`;
  }
  return { arrow, claim, sources, reference, diagram, mode, rate, uncertainty };
});
