// Visual Explainers. Every clip is official SpaceX or Tesla footage
// already used on this site, or an official SpaceX recap the flight lab embeds.
window.EXPLAINERS = {
  updated: "2026-10-16",
  updatedLabel: "16 Oct 2026",
  tabs: {
    spacex: {
      kicker: "SpaceX · Starship",
      lede: "Why the ring burns, and how a catch works. Original diagrams you can scrub, then official SpaceX footage. Flight numbers and T+ times from the flight lab.",
    },
    tesla: {
      kicker: "Tesla · FSD",
      lede: "Same brand, three stacks. What HW4 actually got, what HW3 Lite did not, and why Europe is still Assisted Driving on 14.2. Sourced from the trackers — not invented version lore.",
    },
  },
  items: [
    { id: "hot-staging", tab: "spacex", share: "Why Starship lights the Ship inside Super Heavy’s exhaust." },
    { id: "catch", tab: "spacex", share: "How a Super Heavy catch works — boostback, flip, chopsticks." },
    { id: "fsd", tab: "tesla", share: "What actually changed between Tesla FSD stacks — HW4, HW3 Lite, Europe." },
    { id: "evasion", tab: "tesla", share: "Collision Evasion is HW4 in North America. HW3 Lite and Europe 14.2 do not have it." },
  ],
  hot: {
    facts: [
      { k: "Flight 2", v: "18 Nov 2023 · first hot-stage. First water deluge. Both vehicles were then lost." },
      { k: "Flight 14", v: "MECO at T+2:20. Hot-stage at T+2:22. Official SpaceX timeline." },
      { k: "Block 3", v: "First Block 3 hot-stage on Flight 12, ~T+2:30. Same family through Flight 14." },
    ],
    steps: [
      { at: 0.08, title: "Climb", clock: "F14 · before MECO", caption: "Thirty-three Super Heavy Raptors are doing the work. Ship is still a passenger.", callout: "Ascent", text: "Until the ring says otherwise, Ship is mass. Super Heavy is the engine. Staging only pays if this climb is still accelerating when Ship lights." },
      { at: 0.28, title: "The ring dumps", clock: "F14 · MECO T+2:20", caption: "Vents open sideways. Super Heavy’s exhaust has to leave the stack, not punch Ship.", callout: "Vent the plume", text: "A vented hot-stage ring sits between the two vehicles. The moment Ship lights, that plume has nowhere to go except through the ring. Sideways dump is the whole hardware trick." },
      { at: 0.46, title: "Ship lights first", clock: "F14 · T+2:22", caption: "Ship’s Raptors ignite while the clamp is still closed. No coast. No ullage wait.", callout: "Hot-stage", text: "Cold staging would cut Super Heavy, wait, then light Ship. That wait is gravity loss on a heavy stack. Hot staging never drops the thrust. Flight 14 did this at T+2:22." },
      { at: 0.64, title: "Separate under thrust", clock: "Under thrust", caption: "The clamp opens. Ship is already pushing. Super Heavy starts to fall away.", callout: "Sep", text: "Because Ship is already lit, separation is a shove, not a coast. Super Heavy is no longer dragging the stack. That is the payload argument SpaceX publishes: performance, not theatre." },
      { at: 0.86, title: "Booster flips", clock: "Boostback setup", caption: "Super Heavy turns around for boostback. Ship keeps the acceleration it already paid for.", callout: "Boostback setup", text: "The flip is the catch sequence starting, not staging finishing. Staging already worked if Ship is clean and the booster is still a vehicle." },
    ],
    why: [
      { title: "No coast", text: "Cold staging cuts the booster, waits, then lights the upper stage. Hot staging never drops the thrust. For a stack this heavy, that wait is expensive in gravity loss and attitude propellant." },
      { title: "More payload", text: "Continuous acceleration is SpaceX’s published reason. We do not invent a kilogram number. The ring exists because the payload argument won." },
      { title: "The hardware cost", text: "The ring has to survive Ship lighting in the booster’s plume. Flight 2 proved the staging (~T+2:49) and then lost both vehicles. Later flights kept the idea and made the ring live." },
    ],
    timeline: [
      { k: "F2 · 18 Nov 2023", v: "First hot-stage. First deluge. Staging was the test that paid off; both vehicles died afterwards." },
      { k: "F3 · 14 Mar 2024", v: "First Starship to space. Staging held." },
      { k: "F12", v: "First Block 3 hot-stage, ~T+2:30." },
      { k: "F14", v: "Hot-stage on time at T+2:22 after MECO at T+2:20." },
    ],
  },
  catch: {
    facts: [
      { k: "Flight 5", v: "13 Oct 2024 · B12 · first Super Heavy catch, ~T+6:56. No engine failures on the way up." },
      { k: "Divert", v: "If the approach is off, SpaceX sends it to a controlled splashdown. Missing is allowed. Hitting the tower wrong is not." },
      { k: "Flight 15", v: "First serious attempt to catch a Ship. Same chopsticks idea, harder timing. NET 12 Nov (FAA planning, as of 29 Oct 2026)." },
    ],
    steps: [
      { at: 0.1, title: "Leave the tower", clock: "T+0", caption: "The chopsticks that will catch it later have just released the stack.", callout: "Liftoff", text: "Mechazilla is the pad and the landing site. The arms that hold the stack for launch are the arms that have to meet the pins on the way back." },
      { at: 0.3, title: "Boostback", clock: "After staging", caption: "After hot-stage, Super Heavy burns toward home instead of falling downrange.", callout: "Boostback", text: "This is the expensive part of reuse: reverse the downrange velocity so the booster falls at the tower it left, not into the Gulf. Flight 4 flew a virtual-tower profile instead of a catch." },
      { at: 0.52, title: "Flip and landing burn", clock: "Landing burn", caption: "Falling at the tower. Grid fins aim. Landing-burn engines kill the speed.", callout: "Landing burn", text: "Upright, slow, at the right height. The pins are small. The arms are not a net. Timing is the whole trick — same idea as a Falcon landing, except the pad is reaching out." },
      { at: 0.74, title: "Pins on the arms", clock: "F5 · ~T+6:56", caption: "Hard points on the booster have to meet the chopsticks. Flight 5 was the first time it worked.", callout: "Catch window", text: "~T+6:56 on Flight 5. B12 hung. Everything since is the same geometry, faster, on later boosters. A miss still prefers splash to a tower strike." },
      { at: 0.92, title: "Hang", clock: "Hang", caption: "Arms close. No legs. The tower is the landing pad.", callout: "Hang", text: "A Super Heavy that landed on legs would carry that mass on every flight and need a huge pad. The catch puts the mass in a tower you already built to stack the vehicle." },
    ],
    why: [
      { title: "No legs", text: "Landing legs are mass you fly, then a pad you pour. A catch spends that mass once, in Mechazilla, and every booster reuses it." },
      { title: "Catch or splash", text: "Flight 11’s booster did a controlled splash, not a catch. Divert is a success mode when the approach is off. A bad tower hit is not." },
      { title: "Ship is next", text: "Flight 15 is the first serious attempt to catch a Ship (S42 on the Pad 2 tower). Same chopsticks, a different vehicle, tighter timing. SpaceX has not confirmed it as the plan of record." },
    ],
  },
  fsd: {
    sae: "FSD Supervised is SAE Level 2. The driver must supervise. Europe lists the same idea as Tesla Assisted Driving. Not Tesla’s official comparison.",
    facts: [
      { k: "US HW4", v: "v14.3.12 on 2026.38.5 — same notes as 14.3.11, early US wave since 10 Oct. Collision Evasion on." },
      { k: "US HW3", v: "v14.3 Lite. Parking, unparking, start-from-park. Distilled from HW4. No Collision Evasion." },
      { k: "Europe", v: "v14.2.2.6 on 2026.33.100. Assisted Driving Basic, €99 a month. Same week as US 14.3.11, still on 14.2." },
    ],
    stacks: [
      {
        id: "us-hw4",
        label: "US / Canada · HW4",
        short: "HW4",
        version: "v14.3.11 / 14.3.12",
        name: "FSD (Supervised)",
        hardware: "HW4 / AI4",
        features: {
          city: true,
          evasion: true,
          park: true,
          lite: false,
          europeName: false,
          cabin38: true,
        },
        text: "Widest North America HW4 stack. Automatic Collision Evasion is in 14.3.11 and 14.3.12. 14.3.12 is the same notes on the 2026.38 cabin branch. Faster reactions, better rare-scene and low-visibility vision, cleaner parking pins, better emergency-vehicle, school-bus and yellow-light behaviour.",
        src: "https://www.notateslaapp.com/",
      },
      {
        id: "us-hw3",
        label: "US / Canada · HW3",
        short: "HW3",
        version: "v14.3 Lite",
        name: "FSD (Supervised) Lite",
        hardware: "HW3",
        features: {
          city: true,
          evasion: false,
          park: true,
          lite: true,
          europeName: false,
          cabin38: true,
        },
        text: "Distilled from the HW4 model. Parking, unparking, reversing, start-from-park, Arrival Options and Speed Profiles including Sloth. No Collision Evasion. Tesla is not promising HW3 the full HW4 stack.",
        src: "https://www.notateslaapp.com/",
      },
      {
        id: "eu",
        label: "Europe",
        short: "Europe",
        version: "v14.2.2.6",
        name: "Assisted Driving Basic",
        hardware: "HW3 / HW4",
        features: {
          city: true,
          evasion: false,
          park: true,
          lite: false,
          europeName: true,
          cabin38: false,
        },
        text: "Renamed on 9 Oct 2026. Same week as US 14.3.11, still on 14.2. Collision Evasion is North America only. €99 a month in the Tesla app. EU-wide vote: December 2026 at the earliest.",
        src: "https://tad-tracker.eu/en/",
      },
    ],
    flags: [
      { id: "city", label: "Supervised city driving" },
      { id: "park", label: "Park / unpark / start-from-park" },
      { id: "evasion", label: "Automatic Collision Evasion" },
      { id: "lite", label: "HW3 Lite model" },
      { id: "europeName", label: "Listed as Assisted Driving" },
      { id: "cabin38", label: "On the 2026.38 cabin branch" },
    ],
    jumps: [
      { date: "2026-10-09", title: "Europe rename", text: "FSD (Supervised) is called Tesla Assisted Driving in Europe. Autosteer, Summon, Autopark — a name built for regulators.", href: "/dispatch/assisted-driving.html" },
      { date: "2026-10-06", title: "14.3.11 + Lite", text: "HW4 gets Collision Evasion. HW3 gets Lite parking. Europe stays on 14.2 (build 2026.33.100).", href: "/updates.html" },
      { date: "2026-10-10", title: "14.3.12", text: "Same notes as 14.3.11, now on the 2026.38 cabin branch. Early US wave; Mexico and Canada reporting by 13 Oct.", href: "/fsd.html#versions" },
    ],
  },
  evasion: {
    facts: [
      { k: "What it is", v: "HW4 can switch Supervised FSD on to try to avoid an imminent frontal crash, or if FSD looks like it was dropped by mistake." },
      { k: "Where", v: "North America, 14.3.11 and 14.3.12. Not on HW3 Lite. Not on Europe 14.2." },
      { k: "Still L2", v: "The driver still has to supervise. This is not a hands-off crash-avoidance robot." },
    ],
    modes: [
      { id: "hw4", label: "HW4 · North America", outcome: "Can re-engage" },
      { id: "hw3", label: "HW3 Lite", outcome: "No evasion" },
      { id: "eu", label: "Europe 14.2", outcome: "No evasion" },
    ],
    steps: [
      { at: 0.08, title: "Supervised FSD is on", clock: "HW4 NA · 14.3", caption: "City or highway, SAE Level 2. You are still the driver.", callout: "FSD on", text: "Collision Evasion is not a separate Autopilot. It is a way for HW4 to put Supervised FSD back on when a frontal crash is about to happen." },
      { at: 0.3, title: "Attention drops", clock: "Look-away / drop", caption: "You look away, or FSD disengages unintentionally.", callout: "Drop", text: "Tesla’s own notes: if you look away or FSD drops by mistake, the car can re-engage Supervised FSD. That sentence is the whole feature." },
      { at: 0.52, title: "Frontal crash incoming", clock: "Frontal only", caption: "HW4 is watching for an imminent frontal collision.", callout: "Threat", text: "The notes say frontal. They do not claim a full-surround guardian. We do not invent side or rear coverage." },
      { at: 0.74, title: "HW4 can re-engage", clock: "Re-engage or no", caption: "Supervised FSD comes back on and tries to stay out of it, then keeps going.", callout: "Re-engage", text: "On HW4 in North America (14.3.11 / 14.3.12) this step is the feature. On HW3 Lite and Europe 14.2 this step does not exist — FSD stays off." },
      { at: 0.92, title: "You are still driving", clock: "Still SAE L2", caption: "SAE Level 2. Evasion is not unsupervised Robotaxi.", callout: "L2", text: "Austin unsupervised Cybercab is a different product on a different stack. This explainer is the consumer FSD note on HW4 cars in North America." },
    ],
  },
};
