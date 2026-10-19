(() => {
  // Tesla hub numbers come from the same tracker files the dedicated pages use.
  // Fallback copy in the HTML stays until this runs. Dates are compiled stamps, not live telemetry.
  // Do not use updates-live.json `latest` — that field can be a zero-count ghost.
  const day = (iso) => {
    const d = new Date(iso);
    if (!Number.isFinite(+d)) return "";
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(d);
  };
  const set = (sel, text) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (text) el.textContent = text;
    });
  };
  const F = window.FSD_EUROPE;
  if (F && F.countries) {
    const n = F.countries.filter((c) => c.status === "approved").length;
    set("[data-tz-eu-n]", n + " of 27 EU countries");
  }
  const stampFrom = (u) => {
    const stamp = [];
    if (F && F.updated) stamp.push("FSD Europe compiled " + day(F.updated));
    if (u && u.updated) stamp.push("software sample " + day(u.updated) + " via Teslascope");
    if (stamp.length) set("#tz-updated", stamp.join(". ") + ".");
  };
  stampFrom(null);
  fetch("/updates-live.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((u) => {
      const vs = ((u && u.versions) || []).filter((x) => x.count > 0);
      const nw = [...vs].sort((a, b) => String(b.firstSeen || "").localeCompare(String(a.firstSeen || "")))[0];
      if (nw && nw.id) {
        set("[data-tz-sw-id]", "Newest reporting: " + nw.id);
        const bits = [];
        if (nw.fsdHw4) bits.push(nw.fsdHw4 + " on HW4");
        if (nw.fsdHw3) bits.push(nw.fsdHw3 + " on HW3");
        set("[data-tz-sw-note]", (bits.length ? "FSD " + bits.join(", ") + ". " : "") + "Teslascope sample.");
      }
      stampFrom(u);
    })
    .catch(() => {});
})();
