(() => {
  "use strict";
  const root = document.querySelector(".ae-studio");
  if (!root) return;
  const M = window.AutonomyEvidenceModel,
    V = window.AutonomyEvidenceView;
  let data;
  try {
    data = M.validate(
      JSON.parse(document.getElementById("ae-data").textContent),
    );
  } catch {
    return;
  }
  const $ = (s) => root.querySelector(s),
    all = (s) => [...root.querySelectorAll(s)],
    KEY = "sd-autonomy-evidence-v1";
  let topic = "all",
    sourceFilter = null;
  try {
    topic = M.preferences(
      JSON.parse(localStorage.getItem(KEY) || "null"),
    ).topic;
  } catch {}
  function filter() {
    const matches = new Set(
      M.filterClaims(data.claims, topic, $("#ae-search").value)
        .filter((c) => !sourceFilter || c.sources.includes(sourceFilter))
        .map((c) => c.id),
    );
    all("[data-claim]").forEach(
      (el) => (el.hidden = !matches.has(el.dataset.claim)),
    );
    all("[data-filter]").forEach((el) =>
      el.setAttribute("aria-pressed", el.dataset.filter === topic),
    );
    const source = data.sources.find((s) => s.id === sourceFilter);
    $("#ae-results").textContent =
      matches.size +
      " claim " +
      (matches.size === 1 ? "check" : "checks") +
      (source ? " · linked to " + source.name : "");
    $("#ae-no-results").hidden = matches.size > 0;
    $("#ae-clear-source").hidden = !source;
  }
  function navigate() {
    let hash = location.hash.slice(1);
    try {
      hash = decodeURIComponent(hash);
    } catch {}
    const views = ["understand", "checks", "safety", "sources"];
    let view = views.includes(hash)
      ? hash
      : hash.startsWith("claim-")
        ? "checks"
        : hash.startsWith("source-") || hash === "method"
          ? "sources"
          : hash === "statistical-method"
            ? "safety"
            : "understand";
    if (
      hash.startsWith("claim-") &&
      data.claims.some((c) => "claim-" + c.id === hash)
    ) {
      topic = "all";
      sourceFilter = null;
      $("#ae-search").value = "";
      filter();
      document.getElementById(hash).querySelector("details").open = true;
    }
    all(".ae-panel").forEach((el) => (el.hidden = el.id !== view));
    all(".ae-nav a").forEach((el) => {
      if (el.dataset.view === view) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    if (hash)
      requestAnimationFrame(() => {
        const target = document.getElementById(hash);
        if (target) {
          if (target.tagName === "DETAILS") target.open = true;
          target.scrollIntoView({ block: "start" });
        }
      });
  }
  function chooseMode(mode) {
    $("#ae-mode-diagram").innerHTML = V.diagram(mode);
    $("#ae-mode-copy").innerHTML = V.mode(mode);
    all("[data-mode]").forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.mode === mode),
    );
  }
  root.addEventListener("click", (ev) => {
    const button = ev.target.closest("button");
    if (button?.dataset.mode) chooseMode(button.dataset.mode);
    if (button?.dataset.filter) {
      topic = button.dataset.filter;
      sourceFilter = null;
      filter();
      try {
        localStorage.setItem(KEY, JSON.stringify({ topic }));
      } catch {}
    }
    if (button?.id === "ae-clear-source") {
      sourceFilter = null;
      filter();
    }
    const link = ev.target.closest("[data-source-filter]");
    if (link) {
      topic = "all";
      $("#ae-search").value = "";
      sourceFilter = link.dataset.sourceFilter;
      filter();
      if (location.hash === "#checks") navigate();
    }
  });
  $("#ae-search").addEventListener("input", filter);
  const updateRate = () => {
    $("#ae-rate-output").innerHTML = V.rate(
      $("#ae-events").value,
      $("#ae-miles").value,
    );
  };
  $("#ae-events").addEventListener("input", updateRate);
  $("#ae-miles").addEventListener("input", updateRate);
  $("#ae-exposure").addEventListener("input", (ev) => {
    const value = Number(ev.target.value);
    $("#ae-zero-output").innerHTML = V.uncertainty(value);
    ev.target.setAttribute("aria-valuetext", value + " million miles");
  });
  window.addEventListener("hashchange", navigate);
  root.classList.add("ae-enhanced");
  filter();
  navigate();
})();
