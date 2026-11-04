# Autonomy fact-check: FSD, Robotaxi, Cybercab, Promise tracker

Audited: 2026-11-04. Repo at origin/main 22e1a5ee (scratchpad/wt-audit). Read-only; nothing modified.
Sources were retrieved 2026-11-04 unless noted. Tesla's own pages (tesla.com/*, assets-ir.tesla.com via WebFetch) return 403; I downloaded the Tesla Q1/Q2/Q3 2026 shareholder decks and the 8-K PDF directly (HTTP 200) and read them as text.

Scope note: robotaxi.html is the "Robotaxi Boss" arcade game (fan fiction, no factual claims); goldcab.html is a redirect stub. The real Robotaxi/Cybercab content is cybercab.html plus data/robotaxi-*.json, data/mobility-snapshot.json and cybercab-guide.html/json.

## 1. Confirmed errors / contradictions (priority order)

| # | Sev | File and path | Problem | Proposed fix | Source |
|---|---|---|---|---|---|
| 1 | High | data/robotaxi-areas-history.json: cities.dallas / houston / miami / orlando / tampa `.status` = "testing", `.statusLabel` = "Testing", `.statusSrc` robotracker.app | Rendered as the status chip/popup by cybercab-cities.js (row class is-testing) and robotaxi-map.js. Tesla's own Q2 2026 deck (22 Jul) lists Dallas, Houston, Miami, Orlando, Tampa as "Ramping Unsupervised". Tesla's 21 Oct Robotaxi Safety Report counts no-monitor miles in all five (Dallas 608,130; Houston 225,964; Orlando 61,053; Tampa 53,117; Miami 46,262, through 18 Oct). On the Q3 call (21 Oct) Elluswamy said "We do six cities now". Our own robotaxi-evidence.json lists all five as "listed", no onboard monitor. | Set status "active" and statusLabel "Public rides" (match Austin), statusSrc to the Q2 deck or Safety Report. Keep Bay Area as "Safety driver" (Q2 deck: "SF Bay Area, Safety Driver"). | Tesla Q2 2026 deck p.~9 (assets-ir.tesla.com/.../TSLA-Q2-2026-Update.pdf); TeslaNorth 2026-10-21 teslanorth.com/2026/10/21/tesla-robotaxi-safety-report-four-new-cities/; stockanalysis.com/stocks/tsla/transcripts/712902-q3-2026/ |
| 2 | Med | data/robotaxi-areas-history.json: cities.orlando.log[0].date and cities.tampa.log[0].date = "2026-07-27" "launched" | Contradicted: Fox13 (22 Jul 2026, 8:54 AM EDT) says Tampa driverless service "is now active"; Tesla's Q2 deck dated 22 Jul says Florida launched "in July" with Miami, Orlando, Tampa "Ramping Unsupervised". A 27 Jul "launch" is after Tesla already said they were live. Likely robotracker's first-seen date. | Change to dateApprox true and "on or before 2026-07-22", or relabel the kind "first seen". Same page claim in robotaxi-evidence.json event `florida-launch` (22 Jul, "publication date of local reporting") is correctly hedged. | fox13news.com/news/tesla-robotaxi-launches-driverless-ride-service-tampa.amp (2026-07-22); Tesla Q2 deck |
| 3 | Med | data/fsd-tracker.json: software.releases[id "2026.33.100"].fsd = "v14.2.2.6 · Europe" (also countries list incl. LT, EE, SK, SI) | Unsupported and contradicts data/fsd-global.json (versions[eu-firmware] "FSD version not established", countries NL BE DK CZ). Teslascope's 2026.33.100 page lists no v14.x label; install countries are NL 47.6%, BE 19.0%, DK 11.9%, CZ 9.5%, other 11.9% (42 installs). | Change fsd to "FSD version not established · Europe" and countries to NL, BE, DK, CZ (+ "other"). | teslascope.com/software/2026.33.100, retrieved 2026-11-04 |
| 4 | Low-Med | data/robotaxi-fleet.json: states.Florida (count 18, asOf 2026-07-22, note "ahead of service launches") | Stale framing: by the same date Tesla and Fox13 said the Florida service was live (see #2). Count is an 18-car sighting, not fleet size; it is surfaced on cybercab.html as "Florida 18 estimate". | Reword note to "observed 22 Jul, around launch"; consider dropping the "ahead of service launches" phrase. | Fox13, Tesla Q2 deck |
| 5 | Med | data/promises.json: all FSD entries whose `evidence` still ends with "On the Q1 2026 call Musk guessed ... Fourth quarter of 2026": fsd-90-percent-2013, summon-across-country-2018, la-to-nyc-demo-2017, fsd-feature-complete-2019, level-five-basic-2020, better-than-human-2021, full-autonomy-2023, unsupervised-fsd-tx-ca-2025, sleep-in-car-2025, unsupervised-personal-2025, 25k-car-3-years (11 entries; last_verified 2026-10-15) | STALE: the Q4 2026 guess was superseded on the Q3 call (21 Oct): first customer vehicles "somewhere around Q2 next year" (Elluswamy). These entries still tell readers customer unsupervised FSD is due Q4 2026. The 25k-car-3-years entry also carries an irrelevant unsupervised-FSD evidence line. | Replace the evidence line with the 21 Oct statement (Q2 2027, V15, per TeslaNorth/CNBC) and bump last_verified. Fix 25k-car-3-years evidence to something about the affordable car. | stockanalysis.com transcript; teslanorth.com/2026/10/21/tesla-q3-2026-call-takeaways/ |
| 6 | Med | data/promises.json: unsupervised-fsd-customers-q4-2026 `.status` = "In progress" | Internally contradictory: its own 21 Oct revision says the target "points to about Q2 2027, after this promise's Q4 2026 deadline". | Set status "Revised" (the ledger's own term) and keep the Q4 2026 deadline visible. | Same transcript; ledger's own revision text |
| 7 | Low-Med | data/promises.json: fsd-eu-approval-q1-2027 title "EU-wide FSD (Supervised) approval no later than Q1 2027" | Stronger than the quote. Musk: "It is hard to predict, but maybe within a few months, but I would be surprised if it takes longer than Q1" and "not a timeframe we control". "Q1" is not explicitly 2027 in the quote. Violates editorial rule 3 (do not paraphrase stronger). | Retitle e.g. "EU-wide FSD approval: Musk 'would be surprised' if it takes longer than Q1 (2027)". | stockanalysis.com transcript, 21 Oct 2026 |
| 8 | Low | data/fsd-europe.json: countries LT, BE, SK `.permission.status` = "recorded" vs data/fsd-tracker.json europe.recognitions kind "media" for LT, BE, SK | Cross-page contradiction (fsd-tracker.html says "5 of 10 from an authority, 5 press"; fsd-europe.html shows 8 "recorded"). SK is verifiable as authority (mindop.sk, dated 16.10.2026), so fsd-tracker is the stale one for SK. For BE the only permission evidence (s-809d6f317968) is the Vlaams Parlement committee report of 15 Oct, which does not itself date the recognition to 10 Jun, so "recorded" is too strong. | Make one rule: SK -> authority in fsd-tracker.json; BE -> "reported" (EVXL 10 Jun) in both until a primary notice for 10 Jun is found; LT depends on sumin.lrv.lt (403 to us, see section 3). Keep the "5/5" sentence generated from the data. | mindop.sk press release 16.10.2026 (fetched OK); vlaamsparlement.be (403) |
| 9 | Low | cybercab.html / data/robotaxi-evidence.json cities[fort_worth].cybercab.note | Self-contradictory wording: "tesla.com/robotaxi now lists Fort Worth as a hail city for the Model Y and Cybercab fleet ..., without saying Cybercabs serve that city." Reads as if Tesla listed Cybercab for FW. | "... lists Fort Worth as a hail city; it does not say which vehicle serves it." (mirror in mobility-snapshot.json editorial copy and cybercab-cities/fort-worth.html.) | internal |
| 10 | Low | data/robotaxi-evidence.json events[tx-model-y-124] (dated 2026-10-30) vs data/robotaxi-tx.json / registry table | Journal entry is dated 30 Oct, but our own registry series shows 507 on 30 Oct and 631 on 31 Oct; two journal entries (30 Oct and "31 Oct +124") record one change. The entry text explains it, but the date should be the first observation (31 Oct) or the entry merged. | Date it 2026-10-31 or merge with the 31 Oct observation row. | fsddb.com series (live page shows 631 + 573 + 40) |
| 11 | Low | data/robotaxi-tx.json history/observations: modelY 671 from 2 Nov | fsddb.com currently shows 631 "Model Y" + 573 Cybercab + 40 under the label "Modey Y" = 1,244. We fold the 40 into Model Y (671; "+38" on 2 Nov, "+2" on 1 Nov). Plausible (typo label) but it is our inference and cybercab.html states "Model Y 671" without saying so. | Add a note: "671 includes 40 listed by the mirror as 'Modey Y'." | fsddb.com/robotaxi?operator=tesla-robotaxi-llc, 4 Nov |
| 12 | Low | fsd-europe.html header "9 EU markets listed by Tesla - As of 29 Oct 2026"; fsd.html "Market list checked 28 Oct 2026" | The checks in the data are dated 26 Oct (fsd-global.json sources[].checked, event world-review 2026-10-26; fsd-europe availability reviewedAt 2026-10-26; Tesla page 403 on 3 Nov). The pages claim a later check date than the data supports. | Show "checked 26 Oct" (and 23 Oct for the NL page success) or re-check by an allowed route. | data/fsd-global.json, data/fsd-europe-source-checks.json |
| 13 | Low | data/fsd-europe.json countries NO (permission "unknown") | Understated. Statens vegvesen page (updated 29 Oct 2026) says Tesla's system is not approved in Norway, the authority "does not plan to introduce" it while it does not meet UN R171, and customer demos are on hold. | Set NO context to "Not approved; authority does not plan to introduce it (29 Oct 2026)" with the vegvesen source. | vegvesen.no page, retrieved 2026-11-04 |
| 14 | Low | data/robotaxi-areas-history.json bay_area log[0] date 2025-08-31 "launched" | UNVERIFIED and possibly off by a month (see section 3). Listed here only because Austin/Bay Area dates come entirely from robotracker.app, which I could not open. | Verify against Tesla's Bay Area launch post; label approximate. | n/a |

Not wrong but worth noting: cybercab-guide.json rivals row says Tesla "nearly 2 million cumulative unsupervised Robotaxi miles, end of Q3 2026". That is exactly the Q3 deck. Tesla's later Safety Report (through 18 Oct) lists per-city miles that sum to 3,112,541 (my arithmetic on TeslaNorth's list). Different dates, not a conflict, but a reader comparing to Waymo's 270M would benefit from the newer number.

## 2. Claim-by-claim table

Verdicts: CORRECT, WRONG, STALE, UNVERIFIED, CONTRADICTION.

### 2a. FSD global / tracker / Europe

| File / page | Claim | Verdict | Correct value / note | Source (retrieved 2026-11-04) |
|---|---|---|---|---|
| fsd-tracker.json kpis.subs | 1.74M active FSD subscriptions, Q3 2026, +67% y/y (1.04M Q3 2025); count includes upfront payments and monthly subs, excludes free trials | CORRECT | Deck columns 1.04/1.10/1.28/1.48/1.74, +67%, footnote (3) | Tesla Q3 2026 deck (PDF, downloaded) |
| fsd-tracker.json adoption.points | Subs 0.85 (Q1 25), 0.95 (Q2 25), 1.04, 1.10, 1.28, 1.48, 1.74; cumulative deliveries 7.6, 8.0, 8.5, 8.9, 9.2, 9.7, 10.2 | CORRECT | Q1 2026 deck shows 0.85/0.95/1.04/1.10/1.28 and 7.6/8.0/8.5/8.9/9.2 | Tesla Q1, Q3 2026 decks |
| fsd-tracker.json kpis.attach, adoption.attach | >75% of new NA deliveries include FSD (Q3); >55% (Q2); "nearly twenty percentage point" rise | CORRECT | Q3 deck: "over 75% ... nearly twenty percentage point sequential increase"; Q2 deck: "over 55%". Call: "over 75% of deliveries in North America included a sign-up for paid FSD subscription" | Tesla Q2/Q3 decks; transcript |
| fsd-tracker.json kpis.europe | >100,000 customers, >160 million km since approval, nine EU countries (21 Oct) | CORRECT | Q3 deck text | Tesla Q3 deck |
| fsd-tracker.json miles | Cumulative FSD miles about 15B at end Q3 (chart read, approx) | UNVERIFIED | Deck has no data labels; chart axis to 16B; site discloses +/-0.5B | Tesla Q3 deck |
| Q3 call (not on site) | "Over 1.7 million paid customers, 50% on subscriptions for the first time" | n/a | Site's "1.74M active subscriptions" is the deck metric; call phrase is "paid customers". Keep deck wording. | transcript |
| fsd-global.json listed / fsd.html | 16 Tesla-listed markets (US CA MX PR AU NZ KR + NL LT EE DK BE SI CZ HR SK); China "scope unresolved" | UNVERIFIED | Tesla's page is 403. EU nine = Q3 deck (CORRECT). Non-EU seven and China exclusion cannot be confirmed; secondary sources conflict on China (one says Tesla removed China from the list on 22 Aug; other reports count China live; Latvia is called "18th country worldwide" by one outlet, which implies China is counted) | web search; basenor.com, news18a.com |
| fsd-global.json versions | 2026.38.5.11 = v14.3.13 (AI4) / v14.3 Lite (HW3), released 24 Oct | CORRECT | Teslascope page: "v14.3 Lite for HW3 and v14.3.13 for AI4", 24 Oct; 987 installs now (689 in the 28 Oct note, 642 in fsd-tracker 28 Oct 00:17Z snapshot; these differ only by snapshot time) | teslascope.com/software/2026.38.5.11 |
| fsd-global.json versions | 2026.38.5.5 / .6 = v14.3.12 AI4, AU and NZ; .6 "FSD model not independently mapped" | STALE (global) / CORRECT (tracker) | Teslascope .6: "AI4 V14.3.12", released 24 Oct, AU 94.6% / NZ 5.4%. fsd-tracker.json already labels it v14.3.12; fsd-global says unmapped. | teslascope.com/software/2026.38.5.6 |
| fsd-tracker.json software 2026.33.100 | "v14.2.2.6 - Europe" | WRONG/UNSUPPORTED | See error 3 | teslascope.com/software/2026.33.100 |
| fsd-tracker.json software | Release dates 2026.38.5.11 24 Oct; .5 20 Oct; 33.100 6 Oct | CORRECT (.11, .6, 33.100); .5 not re-checked | Teslascope | Teslascope |
| fsd-europe.json NL | RDW provisional EU type approval, 10 Apr 2026 (Art. 39, Reg. 2018/858) | CORRECT | RDW page published 10 April 2026; Q1 deck: "Received approval for FSD (Supervised) in Netherlands in April" | rdw.nl/en/news/2026/... ; Tesla Q1 deck |
| LT | Recognised 20 May 2026 (first state) | CORRECT (date) / UNVERIFIED (authority page) | Date corroborated by eleport and the Reuters URL slug; sumin.lrv.lt is 403, Reuters 401 | eleport.com/tesla-fsd-europe/ |
| EE | Recognised 29 May 2026, Transpordiamet | CORRECT (date, secondary) | eleport lists 29 May; estonianworld.com resets connection for us | eleport.com |
| DK | Færdselsstyrelsen provisional approval, 9 Jun 2026 after its own review | CORRECT | Press release dated 9 June 2026 | fstyr.dk (fetched) |
| BE | Recognised 10 Jun 2026 (Flemish mobility minister / FOD) | CORRECT (date) / UNVERIFIED (primary) | eleport 10 June; site's authority source is a parliament report of 15 Oct (see error 8) | eleport.com |
| SI | AVP recognises, 7 Sep 2026 (ministry notice 8 Sep) | CORRECT with caveat | Authority page dated 8.9.2026, does not state 7 Sep; Not a Tesla App article dated 7 Sep. 7 Sep is the first-report date, 8 Sep the authority date | gov.si/novice/2026-09-08-...; notateslaapp.com/news/4660 |
| CZ | Ministry of Transport recognises, 21 Sep 2026 | UNVERIFIED | md.gov.cz returns a CAPTCHA page; "seventh European country" per DriveTeslaCanada; Q3 deck confirms Czech Republic approved by 21 Oct | Tesla Q3 deck |
| HR | DZM recognises, 29 Sep 2026 (reported, N1/HINA) | UNVERIFIED (date) / CORRECT (approved by 21 Oct) | Q3 deck names Croatia | Tesla Q3 deck |
| SK | Ministry of Transport recognises, 16 Oct 2026; Tesla Europe post same day; ninth country | CORRECT | mindop.sk release dated 16.10.2026; tweet id timestamp 2026-10-16 14:04 UTC; Q3 deck names Slovakia | mindop.sk; Tesla Q3 deck |
| LV | CSDD recognises, 26 Oct 2026; tenth EU country; Tesla Europe "Now approved in Latvia. Rollout begins soon."; not on Tesla list | CORRECT | sam.gov.lv notice dated 26 Oct 2026; tweet id timestamp 2026-10-26 10:36 UTC; NATA: "10th" | sam.gov.lv (fetched); notateslaapp.com/news/4902 |
| fsd-europe.json | Tesla lists nine European markets (23 Oct) | CORRECT | Matches Q3 deck "nine EU countries" | Tesla Q3 deck |
| IT | Salvini says Italy supports swift EU approval, 29 Oct; not a recognition | CORRECT | Multiple reports date it 29 Oct; tweet id timestamp 2026-10-29 08:21 UTC; application under MIT review | teslanorth.com/2026/10/29/italy-salvini-tesla-assisted-driving-eu/ |
| DE | Ministry backs EU-wide approval with 10% speed tolerance cap (6 Oct) | CORRECT (substance) | NATA: Germany conditional support, rename and no more than 10% over limit | notateslaapp.com/news/4902 |
| FR | Road tests with two vehicles from 3 Sep | UNVERIFIED | Reuters 401 | n/a |
| FR | Opposes in current form (Speed Offset) | CORRECT | NATA and search | notateslaapp.com/news/4902 |
| SE | Trafikverket recommends rejection (18 Jun) | UNVERIFIED | Reuters 401 | n/a |
| ES | No unilateral approval; waits for EU | CORRECT | Spain says it will wait for TCMV | web search |
| NO | permission "unknown" | STALE | See error 13 | vegvesen.no |
| EU process | 119th TCMV 6 Oct: no vote; next in December, not confirmed vote; thresholds 15 states and 65% | CORRECT | Vegvesen: TCMV 6 Oct held no vote; December next, undecided whether vote; electrive 28 Sep "not before December" | vegvesen.no; electrive.com/2026/09/28/... |
| fsd-europe.json thresholds / fsd-tracker europe | EU population total 450.6M (fsd-tracker) vs 448.9M (fsd-europe thresholds.euPopulationM, "legacy rounded") | CONTRADICTION (minor) | Two different EU totals on two pages; fsd-europe labels its figure legacy and unused for votes. | internal |
| fsd-europe.json | Q3 call: Musk "surprised if EU approval takes longer than Q1" | CORRECT as quote | See error 7 for the promise paraphrase | transcript |
| fsd-tracker.json claims.eu | Tesla EU dashboard: 12 collisions in 102.1M km vs 627 in 1,295.7M km, 4.1x, 10 Apr to 24 Aug 2026 (EVwire) | UNVERIFIED | Site itself flags the date dispute and that it did not open Tesla's dashboard | evwire.com (not opened by me) |
| fsd-tracker.json claims.us | 5.30M miles per major collision FSD vs 660k US avg, 19 Feb 2026 | UNVERIFIED | NATA article not opened | n/a |
| Pricing (EUR 99/month etc.) | Not stated on the audited pages | n/a | Outside page scope; eleport says EUR 99/month, EUR 49 for former EAP buyers (secondary) | eleport.com |

### 2b. Robotaxi / Cybercab

| File / page | Claim | Verdict | Correct value / note | Source |
|---|---|---|---|---|
| robotaxi-evidence.json events | Cybercab rides in Austin began 3 Sep 2026 | CORRECT | Q3 deck: "We started providing Robotaxi rides using Cybercabs on September 3 in Austin." NHTSA resume also says commercial deployment began 3 Sep. NATA: public booking opened 4 Sep, 5 p.m. local | Tesla Q3 deck; NHTSA INOA-AQ26002-17078.pdf; notateslaapp.com/news/4651 |
| cybercab-guide.json metrics.capacity | Installed Cybercab capacity at Giga Texas >125,000/yr; "installed capacity is not the current rate" | CORRECT | Deck table: Texas, Cybercab, ">125,000", Production; footnote quoted | Tesla Q3 deck |
| cybercab-guide.json timeline | Q1 deck: "Pilot Production"; Q2 deck (22 Jul): production started, employee rides at Giga Texas in July | CORRECT | Q1 deck capacity row "Pilot Production"; Q2 deck "Began production of Cybercab" | Tesla Q1, Q2 decks |
| promises.json cybercab-production-april-2026 | "Delivered", outcome 24 Apr 2026, based on CNET report | UNVERIFIED | Cannot open CNET. Tesla's own Q1 deck (22 Apr) still says "Pilot Production"; its first statement of "started production" is the Q2 deck (22 Jul). The ledger uses a secondary report for the date while the guide uses decks. Disclose the basis or mark "reported". | Tesla Q1/Q2 decks |
| cybercab-guide.json | Q3 call: "next month we'll be launching in Dallas" (Elluswamy); other cities before year-end (Taneja); customers by end 2026 (Moravy) | CORRECT | Transcript and TeslaNorth | stockanalysis transcript |
| cybercab.html / evidence | Dallas Cybercab rides "Announced target, November"; none yet | CORRECT as of 4 Nov | No report found of Dallas Cybercab rides starting. | web search; TeslaNorth |
| robotaxi-evidence.json companyClaims | 300+ Cybercabs serving Austin, Tesla X post 10 Oct ("8x in 30 days") | CORRECT | Tweet id timestamp 2026-10-10 18:03 UTC; Teslarati 11 Oct "8x in a month". On the call Musk said fleet up tenfold since 3 Sep (TeslaNorth). | x.com/robotaxi/status/2108981691436224816 (id-derived date); TeslaNorth |
| cybercab.html | Texas registry 3 Nov: Cybercab 573, Model Y 671, total 1,244; +29 Cybercab over 7 observed days; 46.1% share | CORRECT (with note 11) | fsddb live 4 Nov: 631 + 40 "Modey Y" + 573 = 1,244. 573/1244 = 46.06%. 544 -> 573 = +29. | fsddb.com |
| cybercab.html table | Daily Cybercab/Model Y series 26 Sep to 3 Nov | UNVERIFIED | History not reproducible from the live page | n/a |
| robotaxi-evidence.json fort_worth | Tesla Robotaxi X post 2 Nov 05:36 GMT (11:36pm CT 1 Nov): available in Fort Worth from 6am | UNVERIFIED (content) / CORRECT (timestamp) | x.com not readable; tweet id decodes to 2026-11-02 05:36:33 UTC, matching the claimed time. No independent news item found for the FW launch. Nov 2 is a Monday. | id-derived |
| cybercab.html / promises.json | tesla.com/robotaxi now lists Fort Worth among seven hail cities (checked 4 Nov) | UNVERIFIED | Page returns 403 to us; robotaxi-source-checks.json shows s-ff84ae0cf870 "unavailable" on 3 Nov with no lastSuccessAt ever. The 4 Nov "checked" claim and four promise-ledger evidence lines rely on it. | robotaxi-source-checks.json |
| Q3 call | Six cities as of 21 Oct | CORRECT, consistent | Austin, Dallas, Houston, Miami, Orlando, Tampa; FW makes 7 only if the 4 Nov listing is real | transcript |
| robotaxi-evidence.json coming soon | Las Vegas, Jacksonville, Phoenix, San Antonio "coming soon" on 21 Oct Safety Report | CORRECT | TeslaNorth | TeslaNorth 21 Oct |
| robotaxi-evidence.json hours | Austin 6am-midnight (Q3 deck) and 6am-2am per 30 Oct X post | CORRECT, hedged | Deck: "Operating hours in Austin are now 6am to midnight". Tweet id decodes to 2026-10-30 04:49 UTC. Post does not name cities (site says so) | Tesla Q3 deck |
| robotaxi-evidence.json | Q3 report: nearly two million cumulative unsupervised miles at quarter end | CORRECT | Deck text | Tesla Q3 deck |
| robotaxi-areas-history.json | Austin 264 sq mi (31 Aug 2026), earlier steps | CORRECT (latest) / UNVERIFIED (history) | NATA 4 Sep: geofence "about 264 square miles" | notateslaapp.com/news/4651 |
| robotaxi-areas-history.json | Dallas/Houston launched 18 Apr 2026 | CORRECT | Tesla post id timestamp 2026-04-18 18:06 UTC; TeslaNorth 19 Apr; Dallas ~30 sq mi, Houston 12-25 | teslanorth.com/2026/04/19/... |
| robotaxi-areas-history.json | Statuses "Testing" (5 cities) | WRONG | Error 1 | Tesla Q2 deck |
| robotaxi-areas-history.json | Miami launched 3 Jul 2026 | UNVERIFIED | Q2 deck: Florida launched "in July" | Tesla Q2 deck |
| robotaxi-areas-history.json | Bay Area: safety driver; 1,094 sq mi since 20 Apr 2026 | CORRECT (status) | Q1 and Q2 decks: "SF Bay Area, Safety Driver"; geojson shows 1,095.9 (rounding difference) | Tesla Q1/Q2 decks |
| robotaxi-fleet.json California | 164 estimate, 26 Aug | UNVERIFIED | Third-party tesorb page not opened; labelled "older record" on page | n/a |
| robotaxi-fleet.json Texas | 671 registered 3 Nov | CORRECT | See note 11 | fsddb.com |

### 2c. NHTSA (copy updated 4 Nov, #288)

| File / page | Claim | Verdict | Correct value / note | Source |
|---|---|---|---|---|
| cybercab-guide.json, cybercab.html | NHTSA Audit Query AQ26002 opened 3 Sep 2026 re Cybercab FMVSS certification; lacks permanently attached conventional manual controls (brake pedal, gas pedal, steering wheel, mirrors) | CORRECT | OVSC resume: Date Opened 09/03/2026; population 1,000 (est.) | static.nhtsa.gov/odi/inv/2026/INOA-AQ26002-17078.pdf (read) |
| cybercab-guide.json | Special Order issued 10 Sep; Tesla asked 18 Sep for 8 more weeks (to 20 Nov); NHTSA granted 30 days on 22 Sep -> new deadline 30 Oct (memo 29 Sep) | CORRECT | Memo text matches exactly | static.nhtsa.gov/odi/inv/2026/IRSPO-AQ26002-19155.pdf (read) |
| cybercab-guide.json | "Answers to 21 requests" | CORRECT (secondary) | NATA 8 Oct: 21 certification questions. NHTSA memo does not state a count. | notateslaapp.com/news/4793 |
| cybercab-guide.json (4 Nov edit) | TeslaNorth reported 3 Nov that Tesla answered by 30 Oct; remaining Question 8 documents carry a confidential-business-information request covering each document in its entirety; not on the open docket | CORRECT | TeslaNorth text matches; it does not state the count of 21. | teslanorth.com/2026/11/03/tesla-cybercab-nhtsa-question-8-secret/ |
| cybercab-guide.json | "NHTSA lists the audit as open, with no finding or recall (dot.report, last updated 4 Nov)" | UNVERIFIED | dot.report returns 403 to us; web search shows no finding. Absence claim is dated and scoped, so editorial-rule compliant, but the "last updated 4 Nov" cannot be reproduced | n/a |
| cybercab-guide.json rivals | Zoox petitioned NHTSA for an exemption; Tesla did not (self-certified) | CORRECT | NATA 8 Oct: Zoox sought exemption (up to 2,500 vehicles/yr); Tesla did not | notateslaapp.com/news/4793 |
| cybercab-guide.json faqs | "Is the Cybercab legal on US roads?" | CORRECT as hedged | Audit is fact-finding; no finding. | NHTSA resume |
| FMVSS exemption status | No Part 555 exemption petition by Tesla | CORRECT (reported) | Per NATA; NHTSA documents do not mention a petition | as above |

### 2d. Cybercab guide (specs, rivals)

| Claim | Verdict | Note / source |
|---|---|---|
| Public booking opened 4 Sep, 5 p.m. local; two-seater; $7.77 Cybercab vs $12.10 Model Y one-route quote by @DavidMoss | CORRECT | notateslaapp.com/news/4651 (4 Sep) |
| No AC charging; hidden NACS port; Tesla plans wireless charging for the fleet | CORRECT | notateslaapp.com/news/4653 (5 Sep) |
| Car and Driver 15 Jun: 219 hp, 3,113 lb, ~50 kWh, <280 mi (EPA filing) | UNVERIFIED | caranddriver.com blocked for fetcher |
| 2024 reveal: cost below $30,000; production "before 2027" | CORRECT (per ledger quote, from The Drive) | not re-opened |
| Waymo: over 270M fully autonomous miles through end of June 2026 (post 24 Sep) | CORRECT | waymo.com/blog/shorts/safetydata-september26/ |
| Waymo: fifteenth U.S. city "last month" (post 8 Oct, $5B debt) | CORRECT | waymo.com/blog/2026/10/waymo-closes-5-billion-debt-financing |
| Waymo: scaling in five cities (LA, Nashville, Orlando, San Diego, Bay Area), post 27 Oct | CORRECT | waymo.com/blog/shorts/more-places/ |
| Zoox site lists Las Vegas, SF, Austin, Miami, Atlanta, LA (a listing, not status) | CORRECT | zoox.com/where-to-ride |
| Munro Live video 26 Oct | CORRECT (date) | tweet id decodes to 2026-10-26 15:24 UTC |

### 2e. Promise tracker (Oct/Nov 2026 entries)

| ID | Claim / status | Verdict | Note |
|---|---|---|---|
| tesla-5m-vehicles-2030 | Musk 21 Oct: "aiming for 5 million vehicles a year by approximately 2030"; deadline 2030-12-31 | CORRECT | Quote verified in transcript. Note the "464,391 vehicles built in Q3" figure is outside my scope and was not re-checked. |
| fsd-eu-approval-q1-2027 | quote and 21 Oct date | CORRECT quote; title STALE-strong | Error 7 |
| tesla-network-add-your-car-2026 | Elluswamy quote "somewhere around Q2 next year ... first customer vehicles to be part of the robotaxi fleet" | CORRECT | Verbatim in transcript. Status "In progress" with a 2026-12-31 deadline while Tesla itself now says Q2 2027 -> same issue as error 6 (consider "Revised"). |
| unsupervised-fsd-customers-q4-2026 | status "In progress" | CONTRADICTION | Error 6 |
| ride-hailing-half-us-2025 / robotaxi-8-10-metros-2025 / no-safety-driver-end-2025 / million-robotaxis-2020 / autonomy-quarter-half-us-2026 | Evidence: "Tesla's page lists seven cities (Austin, Dallas, Fort Worth, Houston, Miami, Orlando, Tampa)" 4 Nov | UNVERIFIED | Depends on tesla.com/robotaxi (403). Six-city count on 21 Oct is verified. The Dallas+Fort Worth = one metro, so "six metro areas" is correct arithmetic (DFW). |
| no-safety-driver-end-2025 | Public no-monitor Austin rides began 22 Jan 2026; "Delivered late" | CORRECT | Safety Report period starts 22 Jan 2026 (TeslaNorth); ledger evidence consistent |
| cybercab-production-before-2027 | Delivered | CORRECT | Q2 deck says production began (deck dated 22 Jul) |
| cybercab-production-april-2026 | Delivered, outcome 24 Apr | UNVERIFIED | See 2b |
| spacex-arr..., terafab..., compute..., grok-bot..., starship-flight15..., starship-weekly... | Oct 20-21 entries | NOT AUDITED | Out of scope (non-autonomy) |
| promise-tracker.html | Status counts 6 / 11 / 16 / 27 / 4 | CORRECT | Matches data/promises.json (64 entries) |
| Day-of-week claims | None found on audited pages | n/a | |

### 2f. Source URLs (HTTP check of 180 URLs found in the audited data files)

Result: 132 x 200, 1 x 202 (eur-lex, bot challenge), 4 x 401 (all Reuters), 42 x 403, 1 connection reset (estonianworld.com). No 404 or 410 found.
403s are bot blocks, not dead links: all tesla.com / assets-ir.tesla.com / ir.tesla.com, nhtsa.gov SGO page, dot.report, cnbc.com, investing.com, techspot, github.com (2), sumin.lrv.lt, vlaamsparlement.be, eletric-vehicles.com (sic, spelling is the site's own domain as published). x.com returns 200 for every status URL (client-rendered), so tweet links are not proof the post exists; I validated the three Tesla Europe/Salvini/Robotaxi posts' dates by decoding the snowflake id timestamps, which all match the claimed dates.
One thing to check by hand: https://eletric-vehicles.com/... (Latvia source s-1ec6ca08a6fe). The domain spelling "eletric" looks like a typo of "electric", though the search engine also returned it with that spelling, so it may be real.

## 3. Could not verify, and why

- Everything on tesla.com (FSD market list, Robotaxi city list incl. Fort Worth, Cybercab FAQ, Safety Report, support pages): 403 to our fetcher and WebFetch. For Fort Worth specifically no secondary news item turned up in two searches, and the X post is unreadable. Only the tweet timestamp matches. Treat "Fort Worth live from 2 Nov" and "tesla.com lists FW (checked 4 Nov)" as company-claim, unconfirmed by us; robotaxi-source-checks.json never had a successful fetch of tesla.com/robotaxi, so the "checked 4 Nov" statement needs a stated method.
- Tesla's non-EU FSD market list (CA MX PR AU NZ KR) and China's absence: no readable primary source; sources conflict.
- Regulator pages behind bot walls: Lithuania (sumin.lrv.lt 403), Czech MD (CAPTCHA), Vlaams Parlement (403), Estonian World (reset), Croatia DZM (only N1/HINA media link). Dates for LT/EE/BE/CZ/HR match secondary sources at day level only for LT, EE, DK, BE (eleport) and month level for CZ/HR (NATA, Q3 deck).
- Reuters items (FR tests 3 Sep, SE 18 Jun, FI 23 Jun, LT 20 May): 401 paywall.
- CNET Cybercab-production article, Car and Driver EPA specs, EVwire EU safety dashboard, NATA Feb safety article, Teslarati, Gizmodo/CPUC: not opened (blocked or out of budget).
- robotracker.app history for Austin/Bay Area step dates (e.g. Bay Area "launched 2025-08-31") and GitHub area-data commit: 403 / not opened.
- dot.report "last updated 4 Nov" for AQ26002; NHTSA SGO page (403).
- Cybercab daily registry history (before 3 Nov) and the Texas 12-Teslas/other counts: only the live 4 Nov snapshot could be compared.
- 21 NHTSA requests: only NATA gives the count; the NHTSA memo does not.
- Out of scope / not checked: Optimus, Starship, Grok, Mars, Roadster, Semi, Energy promise entries; fsd-europe.html pages for non-EU jurisdictions beyond Norway; Q3 "464,391 built" figure.
