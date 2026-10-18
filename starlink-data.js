// Starlink Tracker. Edit this file to refresh the page.
// Counts come from starlink-live.js (scripts/build-starlink-stats.py, refreshed daily).
// {launched}, {inOrbit}, {working}, {down}, {drift}, {ascent}, {operational}, {failedToOrbit}
// in a generation's text use that generation's figure; {t.xxx} uses the constellation total.
window.STARLINK = {
  // Fallback only. The hero stamp prefers STARLINK_LIVE.orbitsUpdated (CelesTrak
  // epoch written by build-starlink-gp.py), then McDowell live.updated.
  updated: "2026-10-13T09:30:20Z",
  source: {
    label: "Jonathan McDowell, Starlink launch statistics",
    url: "https://planet4589.org/space/con/star/stats.html",
  },
  totals: {
    launched: 13015,
    failedToOrbit: 20,
    down: 1859,
    inOrbit: 11156,
    working: 11142,
    operational: 9726,
    retiring: 128,
    ascent: 235,
    drift: 157,
  },
  generations: [
    {
      id: "v10",
      name: "V1.0",
      aka: "Gen 1 original",
      color: "#8b909c",
      launched: 1665,
      inOrbit: 583,
      working: 577,
      blurb: "The first production Starlinks. Flat-panel, laser-linked after the early batches, and now the generation SpaceX is retiring fastest.",
      facts: [
        "{launched} launched · {inOrbit} still in orbit · {working} working",
        "Early Group 1 flights plus the visor-sat batches (launches 2–17 and 19+)",
        "Most of the {t.down} re-entries so far are this generation and V1.5",
      ],
    },
    {
      id: "v15",
      name: "V1.5",
      aka: "Gen 1.5",
      color: "#b7bcc6",
      launched: 2987,
      inOrbit: 2559,
      working: 2553,
      blurb: "Same skateboard as V1.0 with more throughput. Groups 2–5, including the polar and 43° shells that filled in coverage.",
      facts: [
        "{launched} launched · {inOrbit} in orbit · {working} working",
        "Group 2, 3, 4 and 5 launches in McDowell’s Gen 1 table",
        "Still a large slice of the working constellation",
      ],
    },
    {
      id: "v2m",
      name: "V2 Mini",
      aka: "Gen 2 Mini",
      color: "#e2a06a",
      launched: 2767,
      inOrbit: 2562,
      working: 2561,
      blurb: "The first Falcon 9-sized Gen 2 bird. Bigger phased array than V1, flown into the 53°, 43° and a handful of 70° planes.",
      facts: [
        "{launched} launched · {inOrbit} in orbit · {working} working",
        "Shells 1–3 in McDowell’s Gen 2 table (not the later “optimized” buses)",
        "Almost all of this generation is still working",
      ],
    },
    {
      id: "v2opt",
      name: "V2 Mini Optimized",
      aka: "Gen 2 Mini / Opt",
      color: "#e31937",
      launched: 4814,
      inOrbit: 4789,
      working: 4788,
      blurb: "The current workhorse. Same Mini class, later bus. This is now the largest slice of Starlink in orbit — and the one Falcon 9 is still stacking.",
      facts: [
        "{launched} launched · {inOrbit} in orbit · {working} working",
        "Shells at 53°, 43°, 70° and 97° (Groups 6, 10–13, 15, 17)",
        "Only {down} of this generation have come down so far",
      ],
    },
    {
      id: "v2dtc",
      name: "V2 Mini Direct-to-Cell",
      aka: "DTC / to-phone",
      color: "#5ad0ff",
      launched: 674,
      inOrbit: 637,
      working: 637,
      blurb: "V2 Minis with a cellular payload so ordinary phones can reach Starlink. SpaceX’s licensed direct-to-cell envelope is much larger than the birds already flying.",
      facts: [
        "{launched} launched · {inOrbit} in orbit · {working} working",
        "Two shells in McDowell’s table: 53° and 43°",
        "The 15,000 figure on the homepage is the licensed envelope, not sats in orbit",
      ],
    },
    {
      id: "v3",
      name: "V3",
      aka: "Starship-class",
      color: "#f4f4f0",
      launched: 46,
      inOrbit: 26,
      working: 26,
      failedToOrbit: 20,
      blurb: "The full-size Gen 2/3 satellite, flown on Super Heavy / Starship. Some were lost on flights that did not reach orbit; the rest are still raising or drifting towards their shells.",
      facts: [
        "{launched} launched · {failedToOrbit} failed to reach orbit · {inOrbit} in orbit · {working} working",
        "{drift} drifting · {ascent} still climbing · {operational} in an operational shell",
        "McDowell assigns V3 to the Starship-launched Starlinks",
      ],
    },
  ],
  retired: [
    {
      name: "Tintin prototypes",
      launched: 2,
      inOrbit: 0,
      note: "Launch 0, 2018. Both re-entered.",
    },
    {
      name: "V0.9",
      launched: 60,
      inOrbit: 0,
      note: "The 2019 test swarm. All 60 are down.",
    },
  ],
  notes: [
    "“Working” is McDowell’s total in orbit minus screened or dead/decaying birds — {t.working} of {t.inOrbit} right now.",
    "“Operational orbit” ({t.operational}) means the satellite is in a finished shell. Birds still climbing, drifting or pulled out of the shell can still carry traffic.",
    "Starshield, SpaceX’s national-security constellation, is not in this table. Those sats are not published as Starlink.",
    "Dummy V3 simulator articles in square brackets on McDowell’s page are not counted in the {t.launched} launched total.",
  ],
  watch: [
    {
      text: "First V3 satellites marked in an operational shell ({v3.operational} so far).",
      src: "https://planet4589.org/space/con/star/stats.html",
    },
    {
      text: "Starship cadence. V3 only rides Super Heavy; the {v3.inOrbit} in orbit came from the flights that reached space.",
      src: "https://planet4589.org/space/con/star/stats.html",
    },
    {
      text: "V1.0 retirement. Hundreds are already in disposal or out of the constellation.",
      src: "https://planet4589.org/space/con/star/stats.html",
    },
  ],
};
