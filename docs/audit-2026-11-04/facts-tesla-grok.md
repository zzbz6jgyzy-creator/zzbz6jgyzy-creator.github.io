# Fact-check: Tesla / Grok pages (read-only audit)

Audited 2026-11-04 against `wt-audit` (origin/main). Nothing in the repo was modified. All retrieval dates below are 2026-11-04.
Verdict key: CORRECT / WRONG / STALE / UNVERIFIED / CONTRADICTION.

**Headline: no confirmed factual errors were found.** Figures, dates and day-of-week checks all held. The list below is minor items and open questions. The Tesla production, financial, EPA, Roadster, Optimus and Grok claims I could test all matched primary or high-quality sources.

## 1. Claims checked

### production.html / data/production-studio.json / production.json / production.csv / tesla-overview.json
| Page / file | Claim | Verdict | Correct value / note | Source |
|---|---|---|---|---|
| production.json, production.csv, tesla-overview.json | Q3 2026: 464,391 produced, 486,532 delivered, Model 3/Y 478,237 delivered, Other 8,295, storage 13.7 GWh, published 2 Oct 2026 | CORRECT | Matches Tesla's 8-K Ex. 99.1. The 457,387 + 7,004 production split sums to 464,391. | https://www.sec.gov/Archives/edgar/data/0001318605/000162828026064366/exhibit991111111.htm ; https://www.notateslaapp.com/news/4759/tesla-announces-q3-2026-vehicle-deliveries-beating-analyst-estimates |
| same | Q2 2026: 451,758 produced, 480,126 delivered, 442,936 / 467,762 Model 3/Y, 8,822 / 12,364 Other, 13.5 GWh | CORRECT | | https://electrek.co/2026/07/02/tesla-q2-2026-deliveries-480126/ ; https://app.edgar.tools/filing/1318605/0001628280-26-046717/exhibit99111111.htm |
| same | Q1 2026: 358,023 delivered, 408,386 produced, 8.8 GWh | CORRECT for deliveries; production corroborated indirectly (gap of 50,363 reported). 8.8 GWh not independently checked. | | search results, Q2 2026 delivery coverage |
| same | Q1 2024 to Q4 2025 rows (production, deliveries, GWh) | UNVERIFIED this session (matches my recollection of Tesla IR releases; not re-fetched) | Low risk | ir.tesla.com returns 403 to bots |
| production.html | 2026 YTD deliveries 1,324,681, +8.8% vs 2025 | CORRECT | 358,023 + 480,126 + 486,532 = 1,324,681; 2025 comparison period is 1,217,902; +8.77% | arithmetic from the data |
| production.html | Q3 deliveries -2.1% YoY; production +2.8% vs Q2; storage +9.6% YoY; Model 3/Y share 98.3% | CORRECT | Recomputed from the data | arithmetic |
| production-studio.json | Factory capacity table (California >550,000 and 40 GWh; Nevada Semi 25,000, Powerwall >6 GWh; Texas Model Y >375,000, Cybertruck >125,000, Cybercab >125,000, Megapack 50 GWh; Berlin Model Y >375,000; Shanghai >950,000 and 20 GWh; Optimus California "Early ramp", Texas "Construction") | CORRECT | Matches the capacity table in the Q3 2026 Update (SEC 8-K exhibit). Only difference: the deck calls the site "California" and the site adds "Fremont / Lathrop". | https://www.sec.gov/Archives/edgar/data/0001318605/000162828026066738/exhibit9914.htm |
| production-studio.json | factorySource PDF (assets-ir.tesla.com Q3-2026-Update.pdf) | UNVERIFIED link | 403 to bots; content confirmed through the SEC exhibit | curl 2026-11-04 |

### tsla.html / data/markets-studio.json / markets-financials.csv
| Claim | Verdict | Note / source |
|---|---|---|
| Tesla Q3 2026: revenue $28,046M, operating income $718M, GAAP net income $787M, op. cash flow $6,263M, capex $4,732M, FCF $1,531M, cash and investments $45,447M, published 21 Oct 2026 | CORRECT for revenue, operating income, net income. The others are consistent with the reports but not tied to the deck. | https://electrek.co/2026/10/21/tesla-tsla-q3-2026-financial-results/ ; search summaries (kucoin, investinglive) |
| Segments: Automotive $20,560M, Energy $2,881M, Services $4,605M | CORRECT (sums to $28,046M). One aggregator (beancount.io) shows $20.09B; the other reports agree with $20.56B. | same |
| Q2 2026: revenue $28,236M, op. inc. $398M, NI $1,114M, FCF -$1,092M, cash $43,524M | CORRECT | https://www.electrive.com/2026/07/q2-financial-results-tesla-posts-record-deliveries-as-profits-come-under-pressure/ |
| Q1 2026: revenue $22,387M, op. inc. $941M, NI $477M, capex $2,493M | CORRECT | https://www.tikr.com/blog/tesla-q1-2026-earnings-revenue-up-16-eps-up-52-but-free-cash-flow-turns-negative |
| Q3/Q4 2025 comparison rows | UNVERIFIED this session (Q3 2025 figures match my recollection) | |
| Derived deltas (revenue -0.2%, op. income -55.8%, NI -42.7%, capex +110.5%) | CORRECT | arithmetic |
| SpaceX Q3 2026 deltas (+161.4%, +$3.06B, +$5.46B, +184.8%) | CORRECT arithmetic. The underlying SpaceX filing figures are UNVERIFIED (sec.gov is 403 to bots; SpaceX is outside the Tesla/Grok scope). | |
| No share price or market cap is stated; the page says no quote is cached | CORRECT and compliant (nothing to go stale) | tsla.html |
| Next results "Q4 2026, date unconfirmed" | CORRECT as of today (no announcement found) | search 2026-11-04 |
| Tesla 2026 Annual Meeting Thu 3 Dec 2026, 3:00 pm CT (21:00 UTC); record date 13 Oct; lottery deadline Fri 6 Nov 11:59 pm CT; selections week of 16 Nov | CORRECT. Weekdays verified; "7 Nov 05:59 UTC" equals 6 Nov 11:59 pm CT. | https://notateslaapp.com/news/4853/tesla-announces-2026-shareholder-meeting-for-dec-3 ; DEF 14A https://www.sec.gov/Archives/edgar/data/0001318605/000110465926116700/tm267596-1_def14a.htm |
| "Tesla Q4 deliveries January 2027, expected window" | CORRECT hedging (labelled "not dated yet") | |

### tesla.html / data/tesla-overview.json
| Claim | Verdict | Note |
|---|---|---|
| Q3 deliveries 486,532; 13.7 GWh | CORRECT | see above |
| Newest sampled software build 2026.39.6, Teslascope, 4 Nov 2026 | CORRECT as "newest build with reporting cars in the sample". notateslaapp lists 2026.39.6 (FSD 14.2.2.6 Europe) on 29 Oct. | https://www.notateslaapp.com/software-updates |
| EU countries with FSD recognition: 10 of 27 (9 Tesla-listed), 29 Oct 2026 | CORRECT. The ten (NL, LT, EE, DK, BE, SI, CZ, HR, SK, LV) and the dates for Slovakia (16 Oct) and Latvia (26 Oct) match press coverage. "9 Tesla-listed" is UNVERIFIED (Tesla pages 403). | https://tech-insider.org/tesla-fsd-latvia-10th-eu-country-approval-2026/ ; https://thenextweb.com/news/tesla-fsd-supervised-netherlands-europe (NL approval 10 Apr 2026) |
| Dispatch story cards (Fort Worth Robotaxi 2 Nov, 1,244 vs 1,259 Texas DMV, Cybercab/Model Y counts, etc.) | UNVERIFIED (Texas DMV data was not in scope) | |

### updates.html / data/updates-extras.json / updates-history.json
| Claim | Verdict | Note |
|---|---|---|
| Latest first sighting 2026.39.6, first seen 29 Oct 2026, FSD 14.2.2.6 Europe | CORRECT | notateslaapp 2026-11-04 |
| FSD builds named: 14.3.13 (North America, 2026.38.5.10 / .11), 14.3.12 Oceania, 14.3 Lite for HW3, 14.3.11 | CORRECT | https://www.notateslaapp.com/software-updates ; https://teslascope.com/software |
| 2026.38.6.2 (listed by notateslaapp on 2 Nov 2026) | STALE (minor): absent from the saved sample. Teslascope data refreshes every few hours, so this is a snapshot lag, not an error. | notateslaapp |
| "Most common in sample 2026.38.5.1, 31.3% of 3,288, 4 Nov 08:09 Irish time" | CONTRADICTION (minor, probably sampling): Teslascope's live page the same day shows 2026.38.5.11 largest at 39.4%, 2026.38.3.2 at 9.4%, 2026.38.6 at 5.0%. The site's own table has 38.5.1 at 31.3% and 38.5.11 at 30.0%. The two use different sample windows and fleet sizes. Not provably wrong. | teslascope.com/software |
| TeslaFi snapshot 19 Oct 2026, share column withheld because the snapshot is older | CORRECT handling; it is dated and flagged | updates.html |
| Release-date and version strings in updates-history.json (174 snapshots) | UNVERIFIED in bulk. Spot checks (2026.38.5.5 on 21 Oct, 38.5.11 on 24 Oct, 38.6 on 29 Oct, 38.3.2 on 22 Oct) agree with notateslaapp. | |

### model3-explorer / data/model3-studio.json; cybertruck-explorer / data/cybertruck-studio.json
| Claim | Verdict | Note |
|---|---|---|
| US Model 3: Standard 321 mi, Premium RWD 363, Premium AWD 346, Performance 309 (EPA) | CORRECT | FuelEconomy.gov vehicle IDs 50251, 50038, 50037, 50036 |
| UK Premium Long Range RWD "466 mi (18-inch), 429 mi (19-inch)" | UNVERIFIED / sources conflict. EVGuide gives 466 mi. Motor1's launch article gave 436 mi (18-inch) and 398 mi (larger wheels). tesla.com is 403. Check against Tesla UK page. | https://evguide.uk/tesla/model-3-long-range-rwd ; https://www.motor1.com/news/736657/tesla-model-3-long-range-rwd-uk-launch/ |
| UK Premium AWD: 410 mi WLTP, 0-60 3.8 s (same 3.8 s in reviews-studio.json) while US Premium AWD is 4.2 s | UNVERIFIED / possible inconsistency. EVGuide lists UK Premium LR AWD at 410 mi and 4.2 s. Worth a check against Tesla UK. | evguide.uk/tesla/model-3 |
| Cybertruck: Dual Motor AWD and Premium AWD 325 mi (EPA est.), Cyberbeast 320 mi (Tesla est.), 0-60 4.1 / 2.6 s, towing 11,000 lb, 325 kW peak | 325 mi is CORRECT (EPA records 50039 and 50460). The others are UNVERIFIED (tesla.com 403). | fueleconomy.gov |
| 3D model credits, CC licences, Wikimedia image links | not fact-checked; links return 200 | |

### my-tesla.html / data/my-tesla-epa.json (EPA)
| Check | Verdict | Note |
|---|---|---|
| All 187 vehicle records (range, combined MPGe, kWh/100 mi) compared with the FuelEconomy.gov web service | CORRECT: 187 of 187 match, 0 differences. This exceeds the 10-record spot check. Example IDs: 45015, 41513, 42279, 42916, 37241, 48769, 40385, 43821, 46206, 50251, 37242, 41196, 41194, 46204. | https://www.fueleconomy.gov/ws/rest/vehicle/{id} (JSON), retrieved 2026-11-04 |
| `checkedAt` 2026-11-02, source download page | CORRECT; page returns 200 | https://www.fueleconomy.gov/feg/download.shtml |

### optimus.html / optimus-viewer.html / data/optimus-studio.json / optimus-demos.json
| Claim | Verdict | Note / source |
|---|---|---|
| Tesla said on 21 Oct 2026 that "Optimus production began in Fremont on our high-volume lines"; California line "Early Ramp", Texas "Construction"; no unit count given | CORRECT | Q3 2026 deck (SEC exhibit above); https://www.notateslaapp.com/news/4866/tesla-officially-begins-optimus-robot-production |
| Earnings call: early production on a high-volume Fremont line; at least a year to reach an annualised 20,000 a week; outside deliveries around end of 2027; AI5 in Optimus around April 2027 | CORRECT as the call was reported (the site correctly labels these as targets) | notateslaapp 4866; https://www.fool.com/earnings/call-transcripts/2026/10/22/tesla-tsla-q3-2026-earnings-call-transcript/ |
| Fremont line "designed for 1 million robots a year"; Texas second line 10 million | CORRECT per recap | notateslaapp 4866 |
| Gen 3 "not unveiled as of 27 Oct 2026"; app renders leaked September 2026 | CORRECT as of today (no unveil found 4 Nov). Musk said a video could come in "a month or two". | notateslaapp 4725; search 2026-11-04 |
| Notateslaapp "reports" Gen 3 design in launch production | consistent; the site correctly says Tesla has not formally unveiled it | |
| Unitree G1 from US$13.5K, 1.32 m, ~35 kg, 23 to 43 joint motors | CORRECT | https://www.unitree.com/g1 |
| Agility: 65,000 hours of production experience; GXO, Schaeffler, Toyota Motor Manufacturing Canada; Digit 5 in development | CORRECT | https://www.agilityrobotics.com/ |
| Jan 2026 filing: Gen 3 unveil planned Q1 2026, production before end of 2026, 1M/yr; Apr and Jul filings; June 2025 Kovac departure; Dec 2025 shareholder vote | UNVERIFIED (not re-fetched; plausible). The Kovac date of 6 June 2025 matches my recollection. | |
| Atlas CES 2026 (110 lb, 7.5 ft, Hyundai plants 2028), 1X deposits | UNVERIFIED this session (Engadget URL returns 200) | |
| optimus-demos.json | No dated factual claims found beyond captions; X post links unverifiable (x.com) | |

### roadster.html / roadster-preview.html / data/roadster-studio.json / roadster-experience.json
| Claim | Verdict | Note / source |
|---|---|---|
| Reveal held 15 Oct 2026 (Thursday) in Texas, 16 Oct UTC | CORRECT | https://techcrunch.com/2026/10/15/tesla-reveals-spacex-powered-roadster-that-flies-and-falls-with-style/ |
| Event planned 1 Oct and moved to 15 Oct because of weather | CORRECT | https://techcrunch.com/2026/09/28/tesla-delays-roadster-2-event-again-due-to-bad-weather/ ; https://www.electrive.com/2026/10/01/tesla-postpones-roadster-unveiling-due-to-weather/ |
| Venue SpaceX McGregor test site, outside Waco | CORRECT | Engadget https://www.engadget.com/2288437/teslas-redesigned-roadster-cold-gas-thruster-option-reservation/ ; TechCrunch |
| 0.81 s stage run claimed by Tesla; no independent timing | CORRECT. Widely reported; no independent test found as of 4 Nov. TechCrunch reported "one second". | https://carscoops.com/2288442/2028-tesla-roadster-reveal ; https://www.thetruthaboutcars.com/cars/news-blog/tesla-s-flying-roadster-hits-60-in-0-81-seconds-in-2028-45136759 |
| Production 2028 per Musk; no price, no delivery date | CORRECT | TechCrunch; Engadget |
| Reservation: $50,000 Performance ($5,000 card, then $45,000 within 10 days); Thrust $250,000 total (extra $245,000 within 10 days); Rocket invite only | CORRECT | Engadget; TechCrunch |
| Trim claims <1.6 s / <0.9 s / <0.59 s, >230 mph, >300 mi | TechCrunch confirms >230 mph and 300 miles for all three trims and "sub-one-second" for Thrust. The per-trim 0-60 numbers are UNVERIFIED (Verge fetch blocked, tesla.com 403). | TechCrunch |
| Hagerty/Moravy claims (1 MW, 1,400 Nm, 600 L tank, etc.) | UNVERIFIED (video page returns 200; content not viewed) | |
| Clause 4 of the reservation agreement ("approximate place in line") | UNVERIFIED in detail (HotCars page returns 200; not read) | https://www.hotcars.com/tesla-roadster-2-reservation-terms-2026/ |
| "As of 28 Oct 2026, no independent test" | Still true on 4 Nov (no newer test found) | search |
| Updates since 28 Oct | None found that change any published claim. The Hawthorne display (28 Oct) is already on the site. | search 2026-11-04 |
| 2017 comparison (1.9 s, 250+ mph, 620 mi, 200 kWh, $200k, 2020; Founders $250k) | CORRECT from memory of the 2017 unveil; links to The Verge 2017 return 200 | |

### grok.html / grok-bot.html / data/grok-studio.json
| Claim | Verdict | Note / source |
|---|---|---|
| Grok 4.7 is the current catalogue flagship: 500k context, $2 / $6 per 1M tokens (<200k), $4 / $12 above, cached $0.50 / $1 | CORRECT | https://docs.x.ai/developers/models (fetched 2026-11-04) |
| Grok 4.6: 500k context, same rates | CORRECT | same |
| Grok 4.3: 1M context, $1.25 / $2.50 (<200k), $2.50 / $5 above | CORRECT | same |
| Grok 4.7 announced 21 Sep 2026 | CORRECT | https://letsdatascience.com/news/xai-releases-grok-47-with-500k-context-43aa2021 (and others) |
| Grok Bot launched 11 Aug 2026 | CORRECT | pasqualepillitteri / toolradar / kucoin reports; https://x.ai/news/introducing-grok-bot (403 to bots) |
| X Subscription tiers: Free $0, Plus $8 / $80, Premium $30 / $300 (4x, Bot), Super $100 / $1,000 (15x), Ultra $200 / $2,000 (50x) | CORRECT | https://docs.x.ai/x-subscription/pricing |
| Grok Voice 3.0, 14 Oct 2026, speech-to-speech $0.08/min | CORRECT | aiweekly.co and others; https://x.ai/news/grok-voice-3 returns 200 |
| Grok Bot changelog v0.77.0 on 26 Oct 2026, v0.75.5 on 23 Oct | UNVERIFIED (changelog page is 403 on x.ai/changelog/bot; docs.x.ai changelog path 404 in my attempt). A newer version may exist since 26 Oct. | |
| Grok 5 status | CORRECT by omission: the docs list no Grok 5, and the site does not claim a Grok 5 date. Third-party sources say xAI never published a date. | docs.x.ai/developers/models |
| Doc URLs under docs.x.ai (14 pages) | all 200 | curl |

### reviews (data/reviews-studio.json), gear.html
| Claim | Verdict | Note |
|---|---|---|
| Reviews reference "as of 25 Oct 2026"; Model 3 UK Premium AWD 410 mi WLTP, 250 kW; Cybertruck US Premium AWD 325 mi, 4.1 s, 11,000 lb, 325 kW | UK and Cybertruck figures UNVERIFIED (tesla.com 403). 325 mi EPA verified. | |
| Review of Model 3: owner's 2024 RWD car, 90,000 km, 430 / 360 km range | Private owner facts; not verifiable and not checked | |
| "FSD isn't approved on Irish roads" | CORRECT as of 29 Oct: Ireland is not among the ten recognising states | fsd-europe.json; Tech Insider list |
| gear.html: TESMAG (teslaacessories.com) and EV Bandit links; categories exist | CORRECT. evbandit.com, its 7 collection URLs (carbon-fiber, floor-mats, robot-craftsman, screen-protection, taybi-rims, unplugged-performance, waido) and the home page return 200. TESMAG's sunshade collection loads (22 items in stock; store named TESMAG). The other 13 TESMAG collection URLs return 403 to curl, which is bot protection, not a 404. EV Bandit categories (Floor Mats, Screen Protection, Phone, Storage, Sun Protection) confirmed on its home page. | WebFetch of both |

### about.html / editorial.html / author.html / newsletter / wallpapers
| Claim | Verdict | Note |
|---|---|---|
| Owner name Alex R, Ireland, white 2024 Model 3, X handle @ALJR86, holds Tesla and SpaceX shares, email | UNVERIFIED (private facts; not checked by design) | |
| Editorial page statements (dateModified rule, corrections process, data licence) | Policy statements; not factual claims to verify | |
| Newsletter: free, Sunday, Beehiiv; archive and latest issue links | CORRECT. alexs-newsletter-84b17e.beehiiv.com home, /archive and /p/supercharged-daily-two-catches-one-rocket all return 200; latest issue title matches "Two Catches, One Rocket". `newsletter-latest.json` says issueCount 4 (from Beehiiv sitemap); not displayed on the page. | curl |
| Wallpapers: "16 distinct designs", 4K desktop (3840x2160), 1290x2796 / 2293 phone | CORRECT count: 16 items in data/wallpapers-studio.json, 16 listed on the page. | |
| Crew-9 launch 28 Sep 2024; static fire 24 Sep 2024; Photo NASA/Keegan Barber, public domain | CORRECT | NASA blog: static fire Tue 24 Sep 2024; launch 28 Sep 2024 17:17 UTC. NASA image link NHQ202409280015 returns 200. |

## 2. Confirmed errors, prioritised

**None confirmed.** I found no claim that I could show to be wrong with a source. Items that deserve a human look:

| Priority | File / path | Issue | Suggested action |
|---|---|---|---|
| Low | `data/model3-studio.json` markets[UK].trims `premium-rwd` (range 466, wheelNote "18-inch: 466 mi; 19-inch: 429 mi"); `data/reviews-studio.json` model-3 reference | Third-party sources conflict (EVGuide 466 mi; Motor1 launch 436 / 398 mi). Tesla UK page cannot be fetched. | Confirm against https://www.tesla.com/en_gb/model3 in a browser and keep the as-of date |
| Low | `data/model3-studio.json` UK `premium-awd` `zero60: 3.8` vs US `premium-awd` `zero60: 4.2`; `data/reviews-studio.json` model-3 reference "3.8 s" | EVGuide lists the UK Premium AWD at 4.2 s | Confirm against Tesla UK; if 4.2 s, correct both files |
| Low | `data/updates-history.json` / `updates.html` "Most common in this sample" | Saved sample shows 2026.38.5.1 at 31.3%; Teslascope's own page shows 2026.38.5.11 at 39.4%. The site does label the sample and time. | Refresh snapshot on the next bot run; consider a one-line note that Teslascope's headline % uses a different base |
| Low | `data/updates-extras.json` `recent`, `data/tesla-overview.json` software | 2026.38.6.2 (2 Nov) not yet in sample | Will resolve on next refresh |
| Low | `data/optimus-studio.json` source id `digitaltrends` URL `https://digitaltrends.com/?p=3734125` | Resolves only by redirect to `https://www.digitaltrends.com/cool-tech/tesla-optimus-gen-2-price-range/` | Replace with the canonical URL |
| Info | `data/grok-studio.json` releases[0] "Bot / v0.77.0, 26 Oct" | A newer Bot changelog entry may exist; page checked date 26 Oct is 9 days old | Re-check the changelog |

## 3. Could not verify, and why
- **Tesla-hosted pages** (tesla.com, ir.tesla.com, assets-ir.tesla.com, service.tesla.com; 60 URLs): 403 to the fetcher, as the editorial rules expect. Q3 deck content was cross-checked through the SEC 8-K exhibit and press instead. Tesla IR release links for earlier quarters, owner's manual links, UK trim specs, per-trim Roadster 0-60 targets, Cybertruck tow ratings and Cyberbeast 320 mi were therefore not directly checkable.
- **sec.gov filing URLs cited in the data** (`tsla-20260930.htm`, the SpaceX filing): 403 to curl. The SpaceX Q3 2026 financial figures (revenue $14,575M, nine-month cash flow $13,097M, capex $48,069M) were not verified.
- **x.com post links, YouTube (429), Hagerty video content, The Verge (fetch blocked), CNBC (403) and NDTV (403)**: status only. Content was not read.
- **Older rows** Q1 2024 to Q4 2025 in production data and Q3/Q4 2025 financials: not re-fetched this session.
- **Bulk software history** (174 snapshots) and the TeslaFi table: only spot-checked.
- **Private facts about the owner** (name, residence, car, share holdings, mileage and range anecdotes): not verified, by design.
- **Grok Bot changelog** (x.ai/changelog/bot is 403): versions and dates v0.75.5 and v0.77.0 unconfirmed.
- **Dead links:** none found. 75 of 156 non-media URLs returned 200; 78 returned 403 (Tesla, TESMAG shop, CNBC, NDTV, sec.gov, x.ai changelog); 2 returned 429 (YouTube, DigitalTrends short URL); the one that timed out (modernrobotics.northwestern.edu) returned 200 on retry. No 404s in scope.
