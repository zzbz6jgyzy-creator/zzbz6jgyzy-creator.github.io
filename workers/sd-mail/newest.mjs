/** Teslascope newest-per-country + Beehiiv match helpers. No I/O. */

export const cmpVer = (a, b) => {
  const x = String(a || "").split(".").map(Number);
  const y = String(b || "").split(".").map(Number);
  for (let i = 0; i < 4; i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d;
  }
  return 0;
};

export const fieldMap = (customFields) => {
  const m = {};
  for (const f of customFields || []) {
    if (f && f.name) m[f.name] = f.value;
  }
  return m;
};

export const truthy = (v) => v === true || v === "true" || v === 1 || v === "1";

/**
 * Newest reporting build per country. Skips versions with count 0, including
 * the ghost `latest` row Teslascope sometimes lists at 0 cars.
 */
export const newestByCountry = (snapshot) => {
  const out = {};
  for (const v of snapshot?.versions || []) {
    if (!v?.id || !(v.count > 0)) continue;
    const counts = v.countryCounts || {};
    for (const [cc, n] of Object.entries(counts)) {
      if (!(n > 0) || !/^[A-Za-z]{2}$/.test(cc)) continue;
      const code = cc.toUpperCase();
      const cur = out[code];
      if (!cur || cmpVer(v.id, cur.id) > 0) {
        out[code] = { id: v.id, n, firstSeen: v.firstSeen || v.date || "", date: v.date || "" };
      }
    }
  }
  return out;
};

export const deltas = (current, seen) => {
  const changed = [];
  for (const [cc, now] of Object.entries(current || {})) {
    const was = (seen || {})[cc];
    if (!was || was.id !== now.id) changed.push({ cc, ...now, previous: was?.id || null });
  }
  return changed;
};

/** Software-notify subscriber whose saved country matches and who is behind the sample. */
export const matchSoftware = (sub, country, newestId) => {
  if (!sub || (sub.status && sub.status !== "active")) return false;
  const f = fieldMap(sub.custom_fields);
  if (!truthy(f.tesla_notify_software)) return false;
  if (String(f.tesla_country || "").toUpperCase() !== String(country || "").toUpperCase()) return false;
  const you = f.tesla_software;
  if (you && newestId && cmpVer(you, newestId) >= 0) return false;
  return true;
};
