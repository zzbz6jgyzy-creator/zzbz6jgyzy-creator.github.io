# Three X posts — 31 Oct 2026 (Europe/Dublin)

Drafts for [@ALJR86](https://x.com/ALJR86). X's connector cannot publish posts from this session. Paste the copy, attach the matching vertical MP4, then send. These run long for a free account (~300–400 characters); they need X Premium, or trim the last sentence.

Each clip is a **motion-graphic illustration** (HyperFrames HTML → MP4, finished with `melt`). No live launch or street footage. Label it if a reply asks.

Editor holds Tesla and SpaceX shares — already in the bio.

---

## 1. Falcon 9's 700th flight

**Video:** `falcon700.mp4` (9:16, 16s)

**Hook:** `700.`

```
700 Falcon 9 flights.

Friday night at Vandenberg, SpaceX lofted 27 Starlink satellites at 9:04 p.m. PT. Booster B1093 — its 18th flight — landed on Of Course I Still Love You.

Spaceflight Now counts it as the 700th Falcon 9. Elon called it “over 700.”

Rockets used to be rare. This one closed out October.

spacex.com/launches/sl-15-18
```

**Sources opened:** [SpaceX mission page](https://www.spacex.com/launches/sl-15-18), [Spaceflight Now](https://spaceflightnow.com/2026/10/30/live-coverage-spacex-to-close-out-october-with-halloween-eve-falcon-9-launch/), [Elon](https://x.com/elonmusk/status/2116523818449805452), [SpaceX](https://x.com/SpaceX/status/2116401549828391177).

---

## 2. Tesla's Texas robotaxi register

**Video:** `robotaxi.mp4` (9:16, 16s)

**Hook:** `1,204.`

```
Tesla added 124 Model Y robotaxis to the Texas register in a day.

As of 31 Oct the public TxDMV list has 1,204 Teslas under Tesla Robotaxi, LLC: 631 Model Y, 573 Cybercab.

Waymo still leads the same register, 1,259 to 1,204.

Registered is not in service. No city split. The gap is 55 cars.

superchargeddaily.com/cybercab.html
```

**Sources opened:** [FSD Database / Tesla](https://fsddb.com/robotaxi?operator=tesla-robotaxi-llc), [FSD Database / Waymo](https://fsddb.com/robotaxi?operator=waymo-llc), site snapshot in `data/robotaxi-tx.json` and `docs/changelog.md` (31 Oct).

---

## 3. Starship Flight 15 — catch both

**Video:** `flight15.mp4` (9:16, 16s)

**Hook:** `Catch both.`

```
No one has ever caught an orbital rocket’s upper stage.

SpaceX says Ship 42’s static fires are done — six engines, plus a single-engine deorbit burn — ahead of Starship Flight 15.

On SpaceX's 20 Oct earnings call Elon said they will try to catch both stages in November. No official date. Gwynne Shotwell said she expects the FAA licence to cover a return-to-launch-site catch of both stages.

Musk says that if it works, it would be the first fully recovered orbital launch vehicle.

x.com/SpaceX/status/2115476295169814978
```

**Sources opened:** [SpaceX, 28 Oct](https://x.com/SpaceX/status/2115476295169814978), [Space.com](https://www.space.com/space-exploration/launches-spacecraft/spacex-fires-up-starship-upper-stage-ahead-of-landmark-flight-15-test-launch-video), [The Space Road](https://thespaceroad.com/articles/when-is-starship-flight-15/). Timing is “November”, not a calendar day.

---

## What was used

| Tool | What happened |
|---|---|
| X search / news | Latest Tesla and SpaceX stories, official posts |
| Scrapling 0.5 | Opened SpaceX, Spaceflight Now, FSD Database, Space.com, The Space Road |
| Firecrawl | Blocked: no API key, no Docker for self-host |
| HyperFrames 0.8 | Three portrait compositions, `check` clean, rendered to MP4 |
| Remotion 4.0 | Same three films as a second renderer |
| brag | Share-copy pattern (hook → facts → punch). Not a site-launch video |
| Kdenlive / melt 7.22 | Final H.264 wrap for X |
| graphify | Scratch graph of Cybercab JS (78 nodes). Count lives in `cybercab-count.js` |
| OpenShorts / MoneyPrinterTurbo | Need Gemini / LLM + Pexels keys — not in the environment |
| Voicebox / VoiceStudio | No model weights downloaded (CPU-only, multi-GB) |
| Rescript | Non-commercial licence — skipped for these posts |
| pxpipe | Proxy mode forbidden; not needed for exact figures |
