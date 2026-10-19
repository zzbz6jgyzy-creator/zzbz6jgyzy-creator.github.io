(() => {
  // SpaceX hub stamp is the Starship desk compile date already in starship-data.js.
  // Do not label Falcon or Starlink as freshly updated from this file.
  const S = window.STARSHIP;
  const el = document.getElementById("sx-updated");
  if (!el || !S || !S.updated) return;
  const d = new Date(S.updated);
  if (!Number.isFinite(+d)) return;
  const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(d);
  el.textContent = "Starship dates updated " + when + ".";
})();
