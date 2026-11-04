# SpaceX fact-check audit — Supercharged Daily

Audit date: 2026-11-04 (all sources retrieved 2026-11-04). Read-only; the repo (wt-audit, origin/main) was not modified.
Scope: starship.html + data/starship-studio.json, spacex.html + data/spacex-studio.json, calendar.html + data/calendar-studio.json + data/events.json, data/launches.json, data/launch-viewing.json, see-the-launch.html, starlink.html + data/starlink*.json, starship-replay.html (+ starship-replay-model.js), SpaceX claims on index.html / news.html, SpaceX dispatch articles dated 2026-10-20 to 2026-11-03.

Bottom line: the trackers are in good shape. Flight history, Flight 15 NET (12 Nov, labelled as an FAA planning marker), Starlink counts (match McDowell's table to the digit), launch board times and every weekday/date pair checked out. No flight, count or date is flatly wrong. Confirmed errors are: one wrong time-zone conversion in a dispatch article, three dead source URLs, one mis-stated estimate, and a handful of internal contradictions on Flight 14 timing. Nothing below is stated without a source.

Verdict key: CORRECT / WRONG / STALE / UNVERIFIED / CONTRADICTION.

---

## 1. Claim table

### 1a. Starship flight history (data/starship-studio.json `flights[]`, shown on starship.html)

| File / page | Claim | Verdict | Correct value / note | Source (retrieved 2026-11-04) |
|---|---|---|---|---|
| starship-studio.json flights[0] | Flight 14: 2026-09-28, OLP-2, B21/S41, Block 3 | CORRECT | Launch 12:48:59 UTC (7:48:59 CDT), B21/S41, OLP-2 | https://en.wikipedia.org/wiki/Starship_flight_test_14 |
| same, phases[liftoff] | "07:48 CT from Pad 2" | CORRECT | 7:48 a.m. Central | https://aerospaceamerica.aiaa.org/spacex-shortens-starships-first-orbital-flight-but-achieves-other-objectives/ ; Wikipedia F14 |
| same, summary | Reached orbit, 26 Starlink V3 deployed | CORRECT | 26 deployed; orbit ~262x275 km, 30.5 deg | Wikipedia F14; https://interestingengineering.com/space/worlds-most-powerful-rocket-reaches-orbit-deploys-26-starlink-v3-satellites |
| same, notes | One ship engine shut down during ascent | CORRECT | One Raptor Vacuum engine shut down early | AIAA article above; Wikipedia F14 |
| same, `outcome: "worked"` | Flight 14 label "worked" | UNVERIFIED (judgement) | Wikipedia calls it "partial success" (flight cut short). Our own summary says "shortened mission". Consider "partial" for consistency with the editorial rubric. | Wikipedia F14 |
| same, phases[payload] | "T+1:04:39 all 26 out" | UNVERIFIED | Wikipedia: deploy began ~34 min after liftoff and took ~30 min, so end ~T+1:04 is plausible; exact second not independently confirmed | Wikipedia F14 |
| same, phases[onorbit] | "~T+8 min, First Starship orbit insertion. Official SpaceX timeline." | CONTRADICTION | starship-replay-model.js puts the orbit chapter at t=1517 s (T+25:17). Wikipedia puts deploy start ~T+34 min, so insertion cannot be ~T+8 min (that is ship engine cutoff on a suborbital arc). I could not find an official insertion time. See Error 4. | starship-replay-model.js CHAPTERS; Wikipedia F14 |
| same, phases[boostback] | clock "T+2:27" but note "Boostback shutdown T+3:07" | CONTRADICTION | Clock and note disagree by 40 s; replay model uses T+2:40 (t=160). Likely clock = start, note = shutdown, but it is not labelled. | starship-studio.json; starship-replay-model.js |
| same, phases[ascent] | clock T+2:22 (identical to hot-staging) | UNVERIFIED | Ship ascent is a window, not a point; flagged only for tidiness | n/a |
| same, phases[booster] | Controlled Gulf splashdown, ~T+6:36 to 7:01 | CORRECT (approx.) | Controlled Gulf splashdown ~7 min after liftoff | AIAA article; Wikipedia F14 |
| same, phases[ship] | "A Pacific return followed" | CORRECT | Ship splashed down in the Pacific north of Hawaii ~3h08m after launch (15:58 UTC / 10:58 a.m. CT) | AIAA article; https://www.basenor.com/blogs/news/starship-flight-14-reaches-orbit-then-returns-early-after-1-orbit |
| flights[1] F13 | 2026-07-24, B20/S40, OLP-2 | CORRECT | 22:51:00 UTC (17:51 CDT) 24 Jul 2026 | https://en.wikipedia.org/wiki/Starship_flight_test_13 |
| same | 20 Starlink V3 flew the trajectory | CORRECT | 20 V3 deployed (suborbital) | Wikipedia F13; https://spaceflightnow.com/launch/starship-flight-13/ |
| same | Ship tipped over after splashdown, survived | CORRECT | Yes | Wikipedia F13 |
| same | Booster 20 lost engines on landing burn, hit the Gulf hard | CORRECT | Only 10 of 13 engines relit; destroyed on impact | Wikipedia F13 |
| same | Ship 40 towed to Christmas Island, shipped on Forte, now in a Megabay, first Starship returned to launch site | CORRECT | Christmas Island 18 Aug; Forte reached Brownsville 7 Oct; stood in Megabay 2, announced 13 Oct | Wikipedia F13; https://www.space.com/space-exploration/launches-spacecraft/the-1st-spacex-starship-to-survive-a-launch-to-space-just-came-home-to-its-launch-site ; https://teslanorth.com/2026/10/07/spacex-ship-40-returns-starbase/ |
| flights[2] F12 | 2026-05-22, B19/S39, OLP-2, "17:30 CT" | CORRECT | 22:30:22 UTC = 5:30:22 p.m. CDT | https://en.wikipedia.org/wiki/Starship_flight_test_12 |
| same | First Block 3 + first from Pad 2 | CORRECT | Yes | Wikipedia F12 |
| same | "Deployed 20 simulators plus two modified Starlink V3s" | UNVERIFIED | No source found for the payload split | search 2026-11-04, no primary hit |
| same | "stuck the landing flip" | UNVERIFIED | Wikipedia only says the ship splashed down in the Indian Ocean as planned (one Raptor out early, relight skipped). Not contradicted. | Wikipedia F12 |
| same | "Booster 19 aborted boostback after a mass engine-start failure" | UNVERIFIED | Wikipedia: booster flipped abnormally fast, most engines failed, hit the Gulf at ~1,450 km/h. Same outcome, different cause wording. | Wikipedia F12 |
| flights[3..13] F11 to F1 dates / boosters / ships (13 Oct 2025 B15-2/S38; 26 Aug 2025 B16/S37; 27 May 2025 B14-2/S35; 6 Mar 2025 B15-1/S34; 16 Jan 2025 B14-1/S33; 19 Nov 2024 B13/S31; 13 Oct 2024 B12/S30; 6 Jun 2024 B11/S29; 14 Mar 2024 B10/S28; 18 Nov 2023 B9/S25; 20 Apr 2023 B7/S24) | Dates, pairings and one-line outcomes | CORRECT | Match the public record as I know it; F11, F10, F9, F8, F7 spot-checked against Wikipedia flight-test pages cited by search | https://en.wikipedia.org/wiki/Starship_flight_test_7 (and _9, _11 search hits) |
| starship.html stat tiles | 14 integrated flights; 3 booster catches (Flights 5, 7, 8); 3 vehicle generations; Block 1 = F1-6, Block 2 = F7-11, Block 3 = F12-14 | CORRECT | Catches: F5, F7, F8 only (F6 aborted, F11 splashdown, F12-14 no catch) | Wikipedia flight pages; dispatch starship-flight-15-catch-timeline.html says the same |
| starship.html anatomy | Super Heavy 33 Raptors, 20 outer / 13 inner; ship 3 sea-level + 3 vacuum | CORRECT | Standard published layout | SpaceX Starship page https://www.spacex.com/vehicles/starship (200) |

### 1b. Flight 15 / next-flight claims (starship-studio.json `next`, `schedule`; events.json; starship.html, calendar.html, index.html, see-the-launch.html)

| File / page | Claim | Verdict | Correct value / note | Source |
|---|---|---|---|---|
| starship-studio.json `next.referenceDate` 2026-11-12; events.json starship-flight-15; calendar-studio.json starship-15; index.html "NET 12 Nov"; calendar.html "Thu, 12 Nov 2026" | Flight 15 NET 12 Nov, precision day, not a SpaceX date | CORRECT | FAA target 12 Nov pending approval; Wikipedia lists NET 12 Nov. Nov 12 is a Thursday. No SpaceX-announced date, no FAA licence found as of today. | https://starlust.org/spacex-starship-flight-15-possible-launch-date-revealed/ ; https://en.wikipedia.org/wiki/Starship_flight_15 |
| schedule[2026-10-29] | FAA CADENA deck dated 29 Oct moved F15 from 8 Nov to 12 Nov | UNVERIFIED (primary) | Starlust cites a 29 Oct NSF post that the flight moved "slightly to the right" and gives FAA 12 Nov. Cited X link and the NSF article return 403 to our fetcher; could not open. | Starlust above; NSF https://www.nasaspaceflight.com/2026/10/spacex-flight-15-16-milestones/ (403) |
| `next` B22 + S42, Block 3, OLP-2 | Vehicles | CORRECT | B22/S42 | Wikipedia Starship flight 15 |
| `next` objective | "Fly and recover Super Heavy B22 (catch or controlled splashdown)" | STALE (wording) | SpaceX said 21 Oct it will attempt a simultaneous booster and ship catch; Musk on the 20 Oct call said "catch both". Page's own schedule entries say this. Objective hedges. | Wikipedia Starship flight 15; Motley Fool Q3 transcript (cited in file) |
| schedule[2026-10-27] | 6-engine ~60 s static fire 27 Oct about 5:46pm ET (2:46pm PT) | CORRECT (conversion) | 5:46pm EDT = 2:46pm PDT = 4:46pm CDT (events.json) = 21:46 UTC/Irish time. All consistent. Event itself not independently re-opened (NSF 403). | arithmetic; DST ended 1 Nov 2026 |
| schedule[2026-10-26] | Single-engine fire 26 Oct ~10:17pm ET (7:17pm PT) | CORRECT (conversion) | 3-hour offset right | arithmetic |
| schedule[2026-10-27] | SpaceX confirmed 28 Oct 12:10pm ET / 9:10am PT | CORRECT (conversion) | right offset | arithmetic |
| schedule[2026-10-25] | B22 33-engine full-duration static fire, 8:22am CDT | CORRECT | 25 Oct 2026 was a Sunday; Wikipedia/Starlust also give 25 Oct | https://en.wikipedia.org/wiki/Starship_flight_15 |
| schedule[2026-10-23] | Parsons: F15 expected November; first Florida flight "in coming months" | UNVERIFIED | Cited X post not fetchable | n/a |
| schedule[2026-10-20] | Musk on Q3 call: Flight 15 "next month", will catch booster and ship, "more likely than not" | CORRECT | Quote appears in the cited transcript and in two other sources | https://www.fool.com/earnings/call-transcripts/2026/10/20/spacex-spcx-q3-2026-earnings-call-transcript/ (200) ; newspaceeconomy.ca |
| schedule[2026-10-11] | "Musk said Flight 15 is 4 to 6 weeks away (roughly late November 2026...)", dated 11 Oct | WRONG (date + arithmetic) | Musk said it on **10 Oct 2026** ("hopefully four to six weeks away"); 4-6 weeks from 10 Oct is **7-21 Nov**, not "late November". The dispatch article itself says "Musk on Oct 10". | https://newspaceeconomy.ca/2026/10/11/starship-flight-15-will-attempt-to-recover-its-upper-stage-spacecraft-in-november-launch/ |
| schedule[2026-10-08] | FAA slides moved F15 from 19 Oct to NET 8 Nov | UNVERIFIED | File labels it `unverified`. 8 Nov NET independently reported. | https://www.basenor.com (search 2026-11-04); behindtheblack link below |
| events.json starship-flight-16 | FAA slides (22 Oct) list Flight 16 NET 10 Dec, first from LC-39A | CORRECT | Post dated 22 Oct: F15 8 Nov, F16 10 Dec, first Florida Starship flight | https://behindtheblack.com/behind-the-black/points-of-information/faa-provides-tentative-dates-for-two-starship-launches-and-next-new-glenn-launch/ |
| starship-studio.json schedule[2026-10-29] | "Starship Starlink 30-1 stays on 10 Dec" | UNVERIFIED | The name "Starlink 30-1" is not in the Behind the Black post or Starlust; LL2 names Flight 14 "Starlink Group 31-1". Likely the FAA slide label for Flight 16 but not confirmed. | sources above |
| starship.html JSON-LD Event | startDate 2026-11-12, EventScheduled | CORRECT (with caveat) | A NET planning date marked EventScheduled; fine given text says not a SpaceX T-0 | n/a |
| starship.html header | "Source snapshot 30 Oct 2026"; JSON `updated` 2026-10-30, `reviewed` 2026-10-24 | STALE (5 days) | No newer Flight 15 news found 30 Oct-4 Nov (no FAA licence, no SpaceX date). Refresh/re-review date. | search 2026-11-04 |
| index.html | "Sat 7 Nov · 00:46 UTC" next livestream USSF-432 | CORRECT (advisory) | Nov 7 2026 is a Saturday; 00:46 UTC = Fri 6 Nov 4:46 p.m. PT. Rule 5 asks for day + zone for readers; US readers will see "Sat" for a Friday-evening launch. | https://spacenexus.us/launches/spacex/2026-11 ; https://next2space.com/ |

### 1c. Launch board (data/launches.json, calendar-studio.json, launch-viewing.json, calendar.html, see-the-launch.html, spacex.html board)

| File | Claim | Verdict | Correct value / note | Source |
|---|---|---|---|---|
| launches.json / calendar | USSF-432 Falcon 9, 2026-11-07 00:46Z, window to 04:46Z, SLC-4E, Go | CORRECT | 00:46 UTC 7 Nov (4:46 p.m. PT 6 Nov), 4 h window, Vandenberg. Earlier listings (2-4 Nov) were superseded. | https://spacenexus.us/launches/spacex/2026-11 ; https://next2space.com/ |
| same | USSF-627 2026-11-10 03:03Z; USSF-317 2026-11-13 04:23Z; Cygnus NG-25 2026-11-29 15:49Z (SLC-40) | CORRECT (as of 4 Nov) | Match SpaceNexus table | https://spacenexus.us/launches/spacex/2026-11 |
| same | OneWeb 21, NROL-195, Starlink 15-21: Nov 2026, date TBD | CORRECT | Month only | same; https://www.rocketlaunch.live/launch/starlink-15-21 (month only, cached) |
| launches.json results[*] Flight 15 | LL2 row at 2026-11-30T00:00Z, status TBD | CONTRADICTION (benign) | Raw LL2 snapshot has Flight 15 at 30 Nov (month placeholder); site shows 12 Nov via editorial override in calendar-studio/events.json. Anything reading launches.json directly would show 30 Nov. | data/launches.json vs data/events.json |
| launches.json | No SpaceX launches between 31 Oct and 7 Nov | CORRECT | No launch found 1-3 Nov; next is USSF-432 | search 2026-11-04 |
| calendar / launches Starlink 15-18 | 2026-10-31T04:04:34Z | CORRECT | 9:04 p.m. PT 30 Oct = 04:04 UTC 31 Oct | https://digg.com/science/6lxdqpxi (search summary) |
| calendar | Starlink 15-16 2026-10-27T07:25:51Z | CORRECT | 3:25 a.m. ET / 12:25 a.m. PT 27 Oct | dispatch vandenberg-72-launch-record.html; arithmetic |
| calendar | Starlink 15-15 2026-10-23T22:48:44Z; Starlink 15-25 2026-10-13T00:28:11Z | CORRECT (consistent) | 15-15 = Vandenberg's 71st on 23 Oct per dispatch; 15-25 = SFN tag dated 12 Oct (PT) | spaceflightnow tag pages (search) |
| calendar | USSF-481 start 2026-10-16T00:01:05Z; events.json says 00:02:07Z | CONTRADICTION (1 min) | Spaceflight Now: liftoff 5:01 p.m. PDT 15 Oct (00:01 UTC 16 Oct). events.json "~5:02 p.m. PT / 00:02 UTC" is a minute off. Same fact stated two ways. | https://spaceflightnow.com/2026/10/15/live-coverage-spacex-to-launch-classified-payload-for-u-s-space-force/ |
| calendar | Crew-13 2026-10-01T15:10:06Z | CORRECT | 11:10 a.m. EDT 1 Oct, SLC-40 | https://spaceflightnow.com/2026/10/01/live-coverage-nasa-spacex-to-launch-next-crewed-mission-to-the-international-space-station/ |
| calendar | NROL-97 Falcon Heavy 2026-10-02T03:54Z | CORRECT | Liftoff 11:54 p.m. EDT 1 Oct = 03:54 UTC 2 Oct | https://aiaa.org/2026/10/02/spacex-falcon-heavy-launches-classified-nro-mission-from-kennedy-space-center/ |
| calendar | SDA Tranche 1 Transport Layer A 2026-10-10T07:39:44Z | CORRECT | 12:39 a.m. PDT 10 Oct = 07:39 UTC (first try 5 Oct aborted) | search summary (airandspaceforces / SFN tag) |
| calendar | Transporter 18 2026-10-01T18:32:00Z | UNVERIFIED | Sources: window 11:18 a.m.-12:16 p.m. PT (18:18-19:16 UTC); one source says liftoff 11:18 a.m. PT. LL2 NET 18:32 may be a later NET. Minor. | https://spaceflightnow.com/?p=74457 ; https://keyt.com/vandenberg-space-base/2026/09/30/transporter-18-mission-scheduled-to-launch-from-vandenberg-sfb-thursday-afternoon/ |
| calendar / events | CRS-35 launched 13 Oct 10:33:44Z; docked 15 Oct 10:27 a.m. EDT, Harmony space-facing port, 6,300+ lb, final IROSA pair | CORRECT | NASA: docked 10:27 a.m. EDT 15 Oct | https://www.space.com/space-exploration/launches-spacecraft/spacex-crs-35-iss-cargo-mission-docking ; https://spaceflightnow.com/2026/10/13/live-coverage-nasa-spacex-to-launch-new-solar-arrays-6300-pounds-of-cargo-to-the-space-station/ |
| events.json bandwagon-5 | 20 Oct 11:04Z = 7:04 a.m. ET, SLC-40, 32 payloads, 19th flight | UNVERIFIED (conversion CORRECT) | 11:04Z = 7:04 EDT; payload count/flight number not independently checked | arithmetic |
| events.json spacex-q3-2026-earnings | Tue 20 Oct, webcast 3:30 p.m. CT; revenue $14.58B, net income $4.40B | CORRECT | 10-Q: $14.575B revenue (cited in dispatch) | dispatch spacex-dragon-falcon-nasa-retreat.html citing 10-Q |
| events.json spcx-q3-lockup-release | 22 Oct = second full trading day after Q3 results | UNVERIFIED | 424B4 prospectus not opened (SEC returns 403 to fetcher); Thu 22 Oct weekday is right | n/a |
| calendar.html / see-the-launch.html | Example local times: USSF-432 Fri 6 Nov 16:46 GMT-8; USSF-627 Mon 9 Nov 19:03 GMT-8; USSF-317 Thu 12 Nov 20:23 GMT-8; Cygnus Sun 29 Nov 07:49 GMT-8 | CORRECT | All convert correctly from UTC (PST = UTC-8 after 1 Nov) and weekdays match | arithmetic |
| launch-viewing.json pads | SLC-4E 34.632, -120.611; SLC-40 28.5619, -80.5774; Starbase Pad 2 25.992, -97.147 | CORRECT (approx.) | SLC-4E and SLC-40 correct; Starbase pad within ~1 km (starship.html shows 25.997 N, 97.156 W for the site) | public pad coordinates |
| spacex.html board | "Target opens in 2d 22h 28m" for USSF-432 | CORRECT at build time | 4 Nov 02:17 Irish time + 2d22h28m = 7 Nov 00:46 UTC | arithmetic; JS recomputes live |

### 1d. Starlink (starlink.html, data/starlink*.json, homepage tracker card)

| File | Claim | Verdict | Correct value / note | Source |
|---|---|---|---|---|
| starlink-observatory.json totals / starlink.html | Launched 13,096; in orbit 11,214; working 11,200; operational shells 10,022; failed to orbit 20; early deorbit 181; disposed 1,528; reentry after fail 153; down 1,882; retiring 115; out of constellation 717; reserve 59; drift 202; ascent 85; dead 14 | CORRECT | Identical to McDowell table dated "2026 Nov 2 0045:00" | https://planet4589.org/space/con/star/stats.html |
| starlink.html | "1,862 reentered, excludes 20 failed to orbit" | CORRECT | 1,528 + 153 + 181 = 1,862 (1,882 down minus 20) | derived from McDowell |
| starlink.html | Percent shares 22.8% (V2 Mini) and 43.4% (V2 Optimized) | CORRECT | 2,558/11,214 = 22.8%; 4,869/11,214 = 43.4% | arithmetic on McDowell by-generation rows |
| starlink-observatory.json generations | Sum of launched = 13,096 incl. "other" 62; in-orbit sums to 11,214; V3 launched 46 (20 failed to orbit, 26 in orbit) | CORRECT / consistent | 20 = Flight 13 suborbital V3s, 26 = Flight 14 | Wikipedia F13/F14 |
| starlink-history.json | Six snapshots (13 Oct to 2 Nov): launched 13,015 -> 13,096; +27 per Falcon launch (15-15, 15-16, 15-18) | CORRECT (internally consistent) | 13,015 -> 13,042 -> 13,069 -> 13,096 = three 27-satellite launches | data; dispatch |
| starlink.html | "+24 in orbit 29 Oct -> 2 Nov" | CORRECT | 11,214 - 11,190 = 24 | data |
| index.html | "inOrbit 11,190 -> 11,214; working 11,176 -> 11,200; launched 13,069 -> 13,096" | CORRECT | Matches history snapshots | data |
| starlink.html | Orbital catalogue 11,181 records vs 11,214 in-orbit count | CORRECT (labelled) | Different sources (CelesTrak vs McDowell); the page says so | n/a |
| starlink-missions.json latest | Starlink 15-18: 31 Oct 04:04:34Z, SLC-4E, 27 sats, B1093 flight 18, OCISLY | CORRECT | 9:04 p.m. PT 30 Oct, 27 satellites, B1093 (18th flight) per NSF-attributed summary. Landing ship name not independently confirmed. | https://orbitalradar.com/launch/falcon-9-starlink-15-18 (search summary) |
| starlink.html | Times shown "Irish time" (31 Oct 04:04, 2 Nov 00:45) | CORRECT | Irish DST ended 25 Oct 2026, so Irish time = UTC on those dates | arithmetic |
| starlink.html | "Counts refresh every eight hours" vs sky-finder text "catalog more than 24 hours old" | CORRECT | Different thresholds, different features | n/a |

### 1e. starship-replay.html (Flight 14)

| Claim | Verdict | Correct value / note | Source |
|---|---|---|---|
| Date 28 Sep 2026, B21+S41, Pad 2, launchUTC 12:48:59Z | CORRECT | | Wikipedia F14 |
| Replay ends T+03:08:44.4 at first position on water | CORRECT | Wikipedia ~3h08m; AIAA splashdown 10:58 a.m. CT = T+3:09 | Wikipedia F14; AIAA |
| Deorbit chapter t=7938 s (T+2:12:18), "after about two orbits" | CORRECT (approx.) | McDowell: deorbit burn ~T+2:12 | https://www.basenor.com/blogs/news/starship-flight-14-reaches-orbit-then-returns-early-after-1-orbit |
| Hot-staging t=142 s (T+2:22), booster landing t=402 s, orbit t=1517 s, deploy t=2140 s | UNVERIFIED | Deploy start t=2140 (35:40) matches Wikipedia "~34 min"; others have no public T+ source I could open. Booster landing 6:42 vs studio JSON 6:36 / 7:01. | Wikipedia F14 |
| "Super Heavy returned to the Gulf" | CORRECT | Controlled Gulf splashdown | AIAA; Wikipedia |
| "Ship loss shortly after splashdown" | UNVERIFIED | One source reports a post-splashdown explosion; starship-studio.json says "consult post-flight coverage" and leaves ship outcome `unknown`. The two files take different positions (replay asserts loss, studio withholds). | basenor F14 article |
| Cited source URLs (spacex.com F14 page, spacelaunchnow.app launch, AIAA) | CORRECT (200) | stardash.live and x.com broadcast not checked | curl 2026-11-04 |

### 1f. spacex.html / spacex-studio.json

| Claim | Verdict | Note |
|---|---|---|
| Falcon 9: 9 Merlins, reference height 70 m; Falcon Heavy 27 Merlins; Dragon "up to 4 crew on NASA missions" | CORRECT | SpaceX vehicle pages (200 at www.spacex.com) |
| Milestones: Falcon 1 orbit 2008; Dragon ISS 2012; first land landing Orbcomm 21 Dec 2015; first reflight 30 Mar 2017; Demo-2 30 May 2020 (Behnken, Hurley); Flight 5 catch 13 Oct 2024 | CORRECT | Well-established dates |
| sources[falcon/heavy/starship].url `https://new.spacex.com/vehicles/...` | WRONG (dead URL) | `new.spacex.com` does not resolve (curl exit/000 through the proxy). `https://www.spacex.com/vehicles/falcon-9`, `/falcon-heavy`, `/starship` all return 200. |
| Vandenberg 72nd launch of 2026 beating 2025's 71 (news strip) | CORRECT | See dispatch table below |
| Ars Technica / Berger headline counts on the news strip (Moon landers, Crew Dragon by 2030, Falcon 9 sales after 2028) | UNVERIFIED | Reported claims correctly labelled "reported" in the dispatch; Ars article not opened |

### 1g. Dispatch articles (SpaceX, 20 Oct to 3 Nov) — numbers and times I could check

| Article | Claim | Verdict | Note |
|---|---|---|---|
| ship-42-first-tower-catch.html | Booster 22 static fire "8:22am CDT (9:22am ET, **7:22am PT**)" | WRONG | CDT to PDT is 2 hours: 8:22am CDT = **6:22am PT** (booster-22-static-fire.html and starship-studio.json both correctly say 6:22am PT / 8:22am CDT). |
| booster-22-static-fire.html | 8:22am CDT = 9:22am ET = 6:22am PT; SpaceX post 3:49pm ET = 12:49pm PT; Thanksgiving 26 Nov | CORRECT | Sunday 25 Oct; 4th Thursday of Nov 2026 is the 26th |
| booster-22-static-fire.html | "On 10 Oct Musk said 'a little bit before Thanksgiving'" | CORRECT date | Consistent with newspaceeconomy (10 Oct); contradicts studio JSON's 11 Oct |
| vandenberg-72-launch-record.html | 3:25am ET (12:25am PT) Tue 27 Oct; day 300; 65 days left; 5.1 vs 4.2 days per launch; 23% faster; 87-88 projection; 70th on 15 Oct -> 71st 23 Oct -> 72nd 27 Oct | CORRECT | All arithmetic reproduces. 70th = USSF-481 per defence-industry.eu search hit. |
| vandenberg-72-launch-record.html | "Space.com reports SpaceX ended Starlink launches from Florida earlier this year" | UNVERIFIED | Not found; consistent with our launches.json (no Florida Starlinks since September) but the Space.com claim was not located |
| vandenberg-72-launch-record.html | Booster "B1082 ... 26th trip"; "117 Falcon 9 launches in 2026" | UNVERIFIED | Not independently checked (B1082 also shown as flying Transporter-18 as its 25th flight, 1 Oct, per SFN search hit: 25th on 1 Oct then 26th on 27 Oct is consistent) |
| starship-flight-15-catch-timeline.html | Flights in 2026: 12 on 22 May, 13 on 24 Jul, 14 on 28 Sep; gaps 63 and 66 days; weekly cadence ~9x faster; 52 vs 25 Starbase; 25+44=69; 300 V3 = 12 flights at 26, 5 at 60 | CORRECT | Date arithmetic checked; flight dates verified against Wikipedia |
| starship-flight-15-catch-timeline.html | Booster catches "three times, Flights 5, 7 and 8" | CORRECT | |
| starship-flight-15-catch-timeline.html | FAA scoping meetings Nov 17-19, comments close Nov 30 | UNVERIFIED | regulations.gov returns 403 to fetcher |
| starship-moon-refuel-22-vs-8.html | ASAP meeting Thu 22 Oct; Precourt "around 22"; Musk "6 to 8"; 1,600 t / 22 = ~73 t; 1,600 / 6 = ~267 t; 22 weeks ~5 months; 22 at 2/wk = 11 weeks | CORRECT | Arithmetic checked; Thursday 22 Oct confirmed |
| starship-pushes-orion-to-moon.html | Fri 23 Oct, 2 p.m. ET (11 a.m. PT) | CORRECT | |
| spacex-faa-10000-launches.html | 10,000 / 182 = ~55x; post at 2:07am ET Wed 28 Oct = 11:07pm PT Tue = 06:07 UTC | CORRECT | |
| raptor-engines-explained.html | 300/185 = +62%; /230 = +30%; /280 = +7%; T/W 89/141/184; 33x230 = 7,600 t, 33x300 = 9,900 t; 7.5 Mlbf = ~3,400 t; "nearly 3x Saturn V"; 1:13pm ET = 17:13 UTC | CORRECT | Arithmetic reproduces; Raptor 3 test "350 bar (269 tons)" matches Musk's May 2023 post as cited |
| starlink-passes-att-fiber.html | 13.6M vs 7.2M (+88.9%); AT&T 13.31M vs 10.79M (+23.4%); consumer fiber 12.56M vs 10.12M (+24.1%) | CORRECT (arithmetic) | Source filings not opened (SEC 403) |
| spacex-dragon-falcon-nasa-retreat.html | Ars report 7:00am ET = 11:00 UTC 29 Oct; Berger tweet 9:54am ET = 6:54am PT | CORRECT (conversion) | Claims about SpaceX's retreat correctly labelled "reported" |

### 1h. Source URL health (233 non-X URLs fetched from the SpaceX data files and the 2-week SpaceX dispatch articles)

200: 172. Real failures: `new.spacex.com` x3 (no DNS), `thespacetap.com/...vandenberg-launch-record-72/` 502 (cited in vandenberg-72-launch-record.html), `insideflyer.com/...united-and-virgin/` 521 (cited in an airline-Starlink article), `api.frankfurter.dev/...&amp;symbols=ZAR` 000 (HTML-escaped `&amp;` inside the href), 2 more with connection errors (washingtonpost.com Boost Mobile story, qatarairways.com, canada.ca). 429 (rate limit, not dead): phys.org, aerospacetestinginternational.com, youtube.com. 403/401 (bot walls, not proven dead): SEC, CNBC, NSF, regulations.gov, marketwatch, wsj, nytimes, investing.com, ir.spacex.com, ir.tesla.com, fcc.gov, politico, etc. (about 68). X/Twitter status links (about 107) were not fetched.

---

## 2. Confirmed errors, prioritised

Priority 1 (wrong fact in published prose)

1. **dispatch/ship-42-first-tower-catch.html**, paragraph about the Booster 22 static fire: "8:22am CDT (9:22am ET, 7:22am PT)". Change `7:22am PT` to `6:22am PT`. (8:22am CDT is UTC-5, PDT is UTC-7, so PT is two hours earlier.) Because the article is already published, per editorial rule 6 add a visible correction note and bump `dateModified` (articles.json date entry is a feed date, leave it). Sources: booster-22-static-fire.html and starship-studio.json already state 6:22am PT.

2. **data/starship-studio.json** `schedule[]` entry `date: "2026-10-11"` (outlet "Supercharged Daily dispatch /dispatch/starship-f15-ship-catch.html"): text says Musk said Flight 15 is "4 to 6 weeks away (roughly late November 2026, a little before US Thanksgiving)". Source (https://newspaceeconomy.ca/2026/10/11/starship-flight-15-will-attempt-to-recover-its-upper-stage-spacecraft-in-november-launch/) puts the remark on 10 Oct and notes 4-6 weeks = about 7-21 Nov. Proposed text: "Musk said on 10 Oct 2026 that Flight 15 is 'hopefully four to six weeks away' (about 7 to 21 November). In a separate remark he said 'a little bit before Thanksgiving' (26 Nov). SpaceX has not published a mission page." Also change `date` to `2026-10-10` (if the entry is meant to be the date of the statement; keep 10-11 only if it is the dispatch publication date, and then say so). The studio is rendered into starship.html (timeline around the "11 Oct 2026" row) so rebuild the studio page after the data fix.

Priority 2 (dead source URLs in a data file)

3. **data/spacex-studio.json** `sources[]` ids `falcon`, `heavy`, `starship`: replace `https://new.spacex.com/vehicles/falcon-9`, `/falcon-heavy`, `/starship` with `https://www.spacex.com/vehicles/falcon-9`, `https://www.spacex.com/vehicles/falcon-heavy`, `https://www.spacex.com/vehicles/starship` (all return 200 on 2026-11-04). Rebuild spacex.html.

4. **dispatch/vandenberg-72-launch-record.html** cites `https://thespacetap.com/spacex-starlink-15-16-vandenberg-launch-record-72/` which returned 502 on 2026-11-04 (may be transient; re-check before changing). Other dead or flaky: `https://www.insideflyer.com/posts/starlink-wi-fi-boosts-passenger-satisfaction-on-united-and-virgin/` (521) in the airline-Starlink article, and the `&amp;` in the frankfurter.dev link (double-escaped query string, from the South Africa schools article).

Priority 3 (internal contradictions on Flight 14 timing, data/starship-studio.json flights[0].phases)

5. `phases[onorbit]`: clock `~T+8 min` with note "Official SpaceX timeline" contradicts `starship-replay-model.js` (orbit chapter at T+25:17) and Wikipedia (deploy started ~T+34 min). T+8 min is ship engine cutoff on the ascent, not orbit insertion. I found no official insertion time. Proposed: set clock to "" / `withheld` and note "Orbit insertion burn followed ship engine cutoff; exact time not independently verified here", or cite a primary source for the time.

6. `phases[boostback]`: clock `T+2:27` vs note "Boostback shutdown T+3:07" (40 s apart) and replay model T+2:40. State clearly whether the clock is start or end, or align with one source.

7. `phases[booster]`: clock `T+6:36`, note "Landing burn through T+7:01", replay model T+6:42 (402 s). Same fix.

8. starship-replay-model.js chapter `landing` text asserts "post-flight reporting records a loss shortly after splashdown" while starship-studio.json leaves the ship outcome `unknown` and says "consult the original post-flight coverage". Pick one, and cite the report (the one source I found, basenor.com, is a blog and is itself inconsistent about orbit count).

Priority 4 (minor/low)

9. **data/events.json** `ussf-481.start` `2026-10-16T00:02:07Z` and summary "~5:02 p.m. PT (00:02 UTC)" vs **data/calendar-studio.json** `ussf-481.start` `2026-10-16T00:01:05Z`. Spaceflight Now says liftoff 5:01 p.m. PDT. Unify (00:01 UTC) or cite the SpaceX post for the exact second.

10. **data/starship-studio.json** `flights[0].outcome: "worked"` against Wikipedia "partial success" and the page's own "shortened mission". Editorial call; consider `partial`.

11. **data/starship-studio.json** `next.objectives[1]` "Fly and recover Super Heavy B22 (catch or controlled splashdown)": SpaceX and Musk have said the plan is a simultaneous booster and ship catch (20-21 Oct). Say "attempt a tower catch of B22 (stated plan on SpaceX's 20 Oct call); a controlled splashdown is the fallback".

12. **starship.html / starship-studio.json** `updated: 2026-10-30`, `reviewed: 2026-10-24`: the page is 5 days old and "reviewed" is 11 days old. No new facts found today, but re-review.

13. **index.html** "Sat 7 Nov · 00:46 UTC": add the US-local day (Fri 6 Nov 4:46 p.m. PT) per editorial rule 5 so readers do not read it as a Saturday launch.

14. **data/launches.json** keeps LL2's Flight 15 row at 2026-11-30 TBD while the site shows NET 12 Nov. Not wrong (raw feed), but any consumer that reads launches.json directly shows 30 Nov. Consider noting the override in `_about`.

15. **data/starship-studio.json** `flights[2].summary` Flight 12: "deployed 20 simulators plus two modified Starlink V3s, and stuck the landing flip" and "Booster 19 aborted boostback after a mass engine-start failure": not verifiable (see section 3); Wikipedia describes the booster loss differently (abnormally fast flip, most engines failed, impact at ~1,450 km/h).

---

## 3. Could not verify (and why)

- **All X/Twitter status links** (about 107): bot-blocked; includes the SpaceX posts for the Booster 22 and Ship 42 static fires, the FAA CADENA slide post from @SpaceNotices (29 Oct), Spaceflight Now's coverage of NASA's 23 Oct briefing, Berger/Musk posts. The facts themselves (25 Oct booster fire, 26/27 Oct Ship 42 fires, 28 Oct SpaceX confirmation) were consistent across the site's own files and with Starlust/Wikipedia for the booster and "both vehicles static-fired", but I could not open the primary posts.
- **FAA "29 Oct CADENA deck" moving Flight 15 to 12 Nov**: supported only second-hand (Starlust: FAA target 12 Nov; Wikipedia NET 12 Nov). NSF's milestone article returned 403. The 22 Oct slide (8 Nov / 10 Dec) is confirmed via Behind the Black.
- **FAA licence status for Flight 15**: no source found saying a licence has been issued as of 4 Nov; absence claim is therefore only as good as my searches (4 Nov, web search; regulations.gov and faa.gov pages were not fetchable). The site's phrasing "no FAA licence yet" is dated per entry, which is the right pattern.
- **Flight 14 internal T+ clocks** (staging, boostback, booster landing, ship orbit insertion, "T+1:04:39"): no public per-event timeline available to my fetcher (spacex.com mission page returns only the word "SpaceX" to the fetch tool, i.e. JS-rendered).
- **Flight 12 payload split and booster failure mode**: nothing beyond Wikipedia's summary.
- **Transporter-18 liftoff second, Bandwagon-5 payload count / booster flight number, B1093 flight 18 landing ship**: not independently confirmed beyond the data files.
- **SEC filings, 10-Q, 424B4, AT&T exhibits, regulations.gov dockets, WSJ/WaPo/Ars/Politico/CNBC articles** cited by dispatch pieces: 401/403 or unreachable; I checked only the arithmetic, weekdays and time-zone conversions in the articles, not the quoted source text.
- **Dispatch articles not read in full**: starlink-mobile-80000-towers, space-force-no-bids, starshield-cap-still-on, starlink-ukraine-slowdown-who-ordered, verizon-vs-musk-starlink-mobile, canada-starlink-telesat-fact-check, easyjet-starlink-u-turn, terafab-top-20-gdp-math, spacex-10q-customer-b, spacex-q3 preview/results, spacex-40b-gpu-lease, colossus-2, boost-mobile, shotwell-2m-shares, starlink-dynamic-pricing, fcc-d2d-482mhz, anthropic-spacex-compute, starlink-south-africa-schools, starlink-airlines-scorecard, easyJet. These are business/telecom stories outside the launch-tracker scope; only a date/weekday scan was run (0 mismatches across 88 files).
- **Booster/ship hardware identity for older flights (B13..B7 etc.)** was matched from memory plus Wikipedia spot checks, not each Wikipedia page.

## 4. Method notes

- Weekday/date scan: regex over 88 files (all in-scope pages, data files, and every dispatch article dated 15 Oct or later) for "Weekday D Month [YYYY]" and "Weekday, Month D" patterns: 0 mismatches, 0 impossible dates.
- Time-zone arithmetic assumed US DST ended Sun 1 Nov 2026 and Irish/UK DST ended Sun 25 Oct 2026.
- URL checks used curl with a browser-like UA through the agent proxy; 401/403/429 treated as "blocked, not dead".
