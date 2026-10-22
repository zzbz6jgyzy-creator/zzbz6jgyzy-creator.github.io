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
      label: "Cybercabs registered in Texas · as of " + dayLabel(last.date) + " · checked " + dayLabel(checkedDay) + ". Registrations are not cars in service.",
      src,
      asOf: last.date,
      checked
    };
  }
  return { cybercab };
});
