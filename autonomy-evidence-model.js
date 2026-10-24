/* Shared source validation, claim filtering and statistical arithmetic. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AutonomyEvidenceModel = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const topics = {
    all: "All evidence",
    supervision: "Supervision",
    permission: "Permission",
    availability: "Availability",
    fleet: "Fleet & service",
    safety: "Safety",
  };
  const esc = (value) =>
    String(value ?? "").replace(
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
  const validDate = (value) =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  const safeURL = (value) =>
    typeof value === "string" &&
    !/[\s<>"'\\]/.test(value) &&
    (/^https:\/\/[a-z0-9.-]+(?:[/:?#][^]*)?$/i.test(value) ||
      (/^\/(?!\/)[a-z0-9/_#.?=&%-]+$/i.test(value) && !value.includes("..")) ||
      /^#[a-z0-9-]+$/.test(value));
  const date = (value) =>
    validDate(value)
      ? new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(value))
      : "Not supplied";
  function validate(data) {
    if (
      !data ||
      data.version !== 1 ||
      !validDate(data.reviewed) ||
      !Array.isArray(data.claims) ||
      !data.claims.length ||
      !Array.isArray(data.sources) ||
      !data.sources.length
    )
      throw Error("Invalid evidence file");
    const ids = new Set(),
      refs = new Set();
    for (const s of data.sources) {
      if (
        !s ||
        !/^[a-z0-9-]+$/.test(s.id) ||
        refs.has(s.id) ||
        !safeURL(s.url) ||
        !validDate(s.reviewed) ||
        !["name", "kind", "scope", "limit"].every(
          (k) => typeof s[k] === "string" && s[k].trim(),
        )
      )
        throw Error("Invalid source");
      refs.add(s.id);
    }
    for (const c of data.claims) {
      if (
        !c ||
        !/^[a-z0-9-]+$/.test(c.id) ||
        ids.has(c.id) ||
        !(c.topic in topics) ||
        c.topic === "all" ||
        !validDate(c.reviewed) ||
        !["title", "answer", "status", "establishes", "limits", "next"].every(
          (k) => typeof c[k] === "string" && c[k].trim(),
        ) ||
        !Array.isArray(c.sources) ||
        !c.sources.length ||
        !c.sources.every((id) => refs.has(id))
      )
        throw Error("Invalid claim");
      ids.add(c.id);
    }
    return data;
  }
  function filterClaims(claims, topic, query) {
    const q = String(query || "")
      .trim()
      .toLocaleLowerCase();
    return claims.filter(
      (c) =>
        (topic === "all" || c.topic === topic) &&
        `${c.title} ${c.answer} ${c.establishes} ${c.limits}`
          .toLocaleLowerCase()
          .includes(q),
    );
  }
  function number(value, min, max, integer = false) {
    if (String(value).trim() === "") return null;
    const n = Number(value);
    return Number.isFinite(n) &&
      n >= min &&
      n <= max &&
      (!integer || Number.isInteger(n))
      ? n
      : null;
  }
  function eventRate(events, miles) {
    const n = number(events, 0, 1e9, true),
      exposure = number(miles, 1, 1e12);
    return n === null || exposure === null ? null : (n / exposure) * 1e6;
  }
  function zeroBound(miles, confidence = 0.95) {
    const exposure = number(miles, 1, 1e12);
    return exposure === null || !(confidence > 0 && confidence < 1)
      ? null
      : (-Math.log(1 - confidence) / exposure) * 1e6;
  }
  function preferences(value) {
    const v = value && typeof value === "object" ? value : {};
    return { topic: Object.hasOwn(topics, v.topic) ? v.topic : "all" };
  }
  return {
    topics,
    esc,
    validDate,
    safeURL,
    date,
    validate,
    filterClaims,
    eventRate,
    zeroBound,
    preferences,
  };
});
