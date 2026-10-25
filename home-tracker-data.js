// Shared by homepage pre-rendering and its browser refresh.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SDHomeTrackers = api;
})(typeof window !== "undefined" ? window : this, function () {
  function validDay(day) {
    if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    const time = Date.parse(day + "T00:00:00Z");
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === day;
  }
  function dayLabel(day) {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(day + "T00:00:00Z"));
  }
  // "25 Oct 2026, 14:11 Irish time" for a full timestamp; "25 Oct 2026" for a day.
  function irishTime(stamp) {
    if (typeof stamp !== "string" || !Number.isFinite(Date.parse(stamp))) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(stamp)) return validDay(stamp) ? dayLabel(stamp) : "";
    const d = new Date(stamp);
    const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Dublin" }).format(d);
    const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Dublin" }).format(d);
    return day + ", " + time + " Irish time";
  }
  function software(live) {
    const vs = ((live && live.versions) || []).filter((x) => x && x.count > 0);
    const top = [...vs].sort((a, b) => b.count - a.count)[0];
    const newest = [...vs].sort((a, b) => (b.firstSeen || "").localeCompare(a.firstSeen || ""))[0];
    if (!newest) return null;
    const fleet = Number(live.fleet || (top && top.fleet));
    const when = irishTime(live.updated);
    return {
      value: newest.id,
      label: "newest build reporting · most common: " + (top ? top.id + " (" + top.percent + "% of " + (Number.isFinite(fleet) && fleet > 0 ? fleet.toLocaleString("en-US") + " cars" : "tracked cars") + ")" : "—") + " · Teslascope" + (when ? " · as of " + when : "")
    };
  }
  function cybercab(snapshot, fallback) {
    const checked = snapshot && snapshot.checked;
    const checkedDay = typeof checked === "string" ? checked.slice(0, 10) : "";
    const src = snapshot && snapshot.source && snapshot.source.url;
    if (!snapshot || !Array.isArray(snapshot.history) || !validDay(checkedDay) || !Number.isFinite(Date.parse(checked)) || !/^https:\/\//.test(src || "")) return fallback || null;
    const last = snapshot.history.filter((point) => point && validDay(point.date) && point.date <= checkedDay && Number.isSafeInteger(point.cybercab) && point.cybercab >= 0)
      .reduce((latest, point) => !latest || point.date >= latest.date ? point : latest, null);
    if (!last) return fallback || null;
    return {
      value: last.cybercab.toLocaleString("en-US"),
      label: "Cybercabs registered in Texas · as of " + (last.date === checkedDay ? irishTime(checked) : dayLabel(last.date)) + ". Registrations are not cars in service.",
      src,
      asOf: last.date,
      checked
    };
  }
  return { cybercab, software, irishTime };
});
