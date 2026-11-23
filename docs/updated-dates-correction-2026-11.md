# Updated dates corrected on 23 Nov 2026

On 9 Nov 2026 the reading toolbar's buttons were relabelled ("Share" became "Post on X / Copy link / Share…", PR #307). `scripts/editorial-dates.py` counted that as an edit, so 83 of 166 stories showed "Updated 9 Nov 2026" and that `dateModified` although their reporting had not changed (editorial rule 6). From this change the toolbar is page furniture, and the next home-build corrects them:

- **47 stories** had no edit after publication, so the "Updated" line goes and `dateModified` returns to the publication time.
- **36 stories** show their last real edit instead.

Dry run on full history before the change: `revision_date()` with and without `rs:tools` in `BLOCKS`, for every story in `data/articles.json`. Only these 83 differ.

## Last real edit restored

| Story | Published | Was | Now |
|---|---|---|---|
| [Tuesday’s Falcon 9 carries SpaceX’s second Starfall test](/dispatch/bandwagon5-starfall-second-demo.html) | 18 Oct 2026 | 9 Nov 2026 | 19 Oct 2026 |
| [Texas weighed selling Boca Chica State Park to SpaceX](/dispatch/boca-chica-state-park-spacex.html) | 17 Oct 2026 | 9 Nov 2026 | 19 Oct 2026 |
| [Booster 22 just fired all 33 engines. Here’s what still stands between Starship and its first double catch](/dispatch/booster-22-static-fire.html) | 25 Oct 2026 | 9 Nov 2026 | 6 Nov 2026 |
| [Dragon docks with the station’s last new solar arrays](/dispatch/crs35-dragon-docks.html) | 15 Oct 2026 | 9 Nov 2026 | 19 Oct 2026 |
| [319 Cybercabs, six weeks: what the Texas numbers really tell us](/dispatch/cybercab-319-analysis.html) | 14 Oct 2026 | 9 Nov 2026 | 16 Oct 2026 |
| [349 Cybercabs registered in Texas](/dispatch/cybercab-349-texas.html) | 15 Oct 2026 | 9 Nov 2026 | 19 Oct 2026 |
| [Dragon Freedom, 237 days](/dispatch/dragon-freedom.html) | 7 Oct 2026 | 9 Nov 2026 | 9 Oct 2026 |
| [668 Falcon booster landings](/dispatch/falcon-668-landings.html) | 12 Oct 2026 | 9 Nov 2026 | 28 Oct 2026 |
| [FSD through Swiss snow](/dispatch/fsd-snow.html) | 7 Oct 2026 | 9 Nov 2026 | 9 Oct 2026 |
| [Grok Bot says it’s 3x faster, adds Robinhood and Coinbase](/dispatch/grok-bot-3x-faster-connectors.html) | 17 Oct 2026 | 9 Nov 2026 | 19 Oct 2026 |
| [SpaceX reports Tuesday, Tesla Wednesday, then 1.3B shares unlock](/dispatch/musk-earnings-week-q3-2026.html) | 18 Oct 2026 | 9 Nov 2026 | 28 Oct 2026 |
| [Tesla and SpaceX slide after the midterms. What a Democratic Congress can and can't do to the merger](/dispatch/musk-midterms-tesla-spacex-selloff.html) | 5 Nov 2026 | 9 Nov 2026 | 6 Nov 2026 |
| [Powerwalls help set a 745 MW home-battery record](/dispatch/powerwall-745mw-record.html) | 14 Oct 2026 | 9 Nov 2026 | 16 Oct 2026 |
| [EU fast-tracks Project Bromo vs SpaceX](/dispatch/project-bromo-eu-spacex-rival.html) | 16 Oct 2026 | 9 Nov 2026 | 19 Oct 2026 |
| [SpaceX’s Raptor engines, explained: from 185 tons to Raptor 4’s 300](/dispatch/raptor-engines-explained.html) | 27 Oct 2026 | 9 Nov 2026 | 5 Nov 2026 |
| [Roadster day preview: Musk promised a “BANGER”](/dispatch/roadster-banger-demo-day.html) | 15 Oct 2026 | 9 Nov 2026 | 19 Oct 2026 |
| [Roadster's promised SpaceX cold-gas thrusters](/dispatch/roadster-cold-gas-thrusters.html) | 13 Oct 2026 | 9 Nov 2026 | 28 Oct 2026 |
| [Roadster thrusters vs Falcon 9](/dispatch/roadster-falcon9-cold-gas-thrusters.html) | 14 Oct 2026 | 9 Nov 2026 | 28 Oct 2026 |
| [Roadster livestream: Thu 8:55pm ET (5:55pm PT)](/dispatch/roadster-livestream.html) | 14 Oct 2026 | 9 Nov 2026 | 16 Oct 2026 |
| [Roadster reveal set for 15 Oct (preview)](/dispatch/roadster-reveal.html) | 12 Oct 2026 | 9 Nov 2026 | 16 Oct 2026 |
| [Tesla Robotaxi now runs until midnight in Austin](/dispatch/robotaxi-austin-midnight-803.html) | 17 Oct 2026 | 9 Nov 2026 | 25 Oct 2026 |
| [Ship 40 is home: inside the first Starship returned to Starbase](/dispatch/ship-40.html) | 7 Oct 2026 | 9 Nov 2026 | 9 Oct 2026 |
| [Musk says Ship 42 will be the first Starship caught by the tower, now that its static fires are done](/dispatch/ship-42-first-tower-catch.html) | 29 Oct 2026 | 9 Nov 2026 | 6 Nov 2026 |
| [Southwest puts Starlink on every plane](/dispatch/southwest-starlink-full-fleet.html) | 15 Oct 2026 | 9 Nov 2026 | 19 Oct 2026 |
| [SpaceX Q3 results: $14.6B revenue and a $4.4B profit as AI becomes the biggest business](/dispatch/spacex-q3-2026-results.html) | 20 Oct 2026 | 9 Nov 2026 | 25 Oct 2026 |
| [9,000 meters became 60](/dispatch/stargaze.html) | 7 Oct 2026 | 9 Nov 2026 | 20 Oct 2026 |
| [15,000 satellites, no dish](/dispatch/starlink-direct.html) | 7 Oct 2026 | 9 Nov 2026 | 9 Oct 2026 |
| [Starlink answers Reliance: “ready to connect India”](/dispatch/starlink-india-reliance-reply.html) | 16 Oct 2026 | 9 Nov 2026 | 19 Oct 2026 |
| [Who throttled Ukraine’s Starshield? Three accounts of one speed cap, and what’s actually confirmed](/dispatch/starlink-ukraine-slowdown-who-ordered.html) | 21 Oct 2026 | 9 Nov 2026 | 23 Oct 2026 |
| [NASA’s safety panel says one Starship Moon landing needs about 22 launches. Musk says 6 to 8. Here’s the math behind both numbers](/dispatch/starship-moon-refuel-22-vs-8.html) | 23 Oct 2026 | 9 Nov 2026 | 6 Nov 2026 |
| [The Tesla dream scenario](/dispatch/tesla-dream-scenario.html) | 14 Oct 2026 | 9 Nov 2026 | 19 Oct 2026 |
| [Tesla Q3 preview: the cash burn, what’s at stake for the stock, and the SpaceX merger talk](/dispatch/tesla-q3-2026-preview.html) | 20 Oct 2026 | 9 Nov 2026 | 22 Oct 2026 |
| [Tesla: The Plan. The complete story, 2003 to today](/dispatch/tesla-the-plan-complete-story.html) | 29 Oct 2026 | 9 Nov 2026 | 5 Nov 2026 |
| [Starlink on nearly half of United’s flights](/dispatch/united-starlink-half.html) | 15 Oct 2026 | 9 Nov 2026 | 19 Oct 2026 |
| [X will bar “ugly” and “shrill” advertisers](/dispatch/x-ads-esthetic-standard.html) | 17 Oct 2026 | 9 Nov 2026 | 19 Oct 2026 |
| [The X Subscription: Grok, Cursor and X Premium in one plan](/dispatch/x-subscription.html) | 12 Oct 2026 | 9 Nov 2026 | 16 Oct 2026 |

## No edit since publication (the "Updated" line goes)

| Story | Published |
|---|---|
| [Anthropic’s IPO filing puts its SpaceX compute bill at $3.1 billion a month, 2.5 times what SpaceX disclosed in June](/dispatch/anthropic-spacex-compute-3-1b.html) | 29 Oct 2026 |
| [ARK’s $4,400 Tesla target comes with a smaller robotaxi forecast](/dispatch/ark-tesla-2031-model.html) | 20 Oct 2026 |
| [Assisted Driving Basic, €99](/dispatch/assisted-driving.html) | 10 Oct 2026 |
| [Booster B1088 flies and lands for a 20th time](/dispatch/b1088-20th-flight.html) | 13 Oct 2026 |
| [No, Canada isn’t cutting off Starlink. Here’s what Carney actually said, and why Telesat still needs SpaceX](/dispatch/canada-starlink-telesat-fact-check.html) | 20 Oct 2026 |
| [Dragon flies the last of the station's 8 new solar wings](/dispatch/crs35-final-solar-arrays.html) | 13 Oct 2026 |
| [Cybercabs now outnumber Model Ys in Tesla’s Texas robotaxi fleet](/dispatch/cybercab-outnumbers-model-y.html) | 28 Oct 2026 |
| [easyJet said Starlink’s numbers didn’t work. Nine months later it’s putting it on its whole Airbus fleet](/dispatch/easyjet-starlink-u-turn.html) | 27 Oct 2026 |
| [The FCC voted 3-0 to propose opening 482 MHz more spectrum to satellite-to-phone service, over objections from AT&T, Verizon and T-Mobile](/dispatch/fcc-d2d-482mhz-vote.html) | 29 Oct 2026 |
| [FSD fleet passes 15.4 billion miles](/dispatch/fsd-15-billion-miles.html) | 12 Oct 2026 |
| [LA to NY, 45 hours 37 minutes](/dispatch/fsd-cannonball.html) | 10 Oct 2026 |
| [Grok Bot now works from the iPhone Action Button](/dispatch/grok-bot-iphone-action-button.html) | 20 Oct 2026 |
| [SpaceX will ‘make you whole’ if Grok Bot shops wrong](/dispatch/grok-bot-make-you-whole-analysis.html) | 15 Oct 2026 |
| [Grok Voice 3.0 tops speech-to-speech at 86.9](/dispatch/grok-voice-3-spacexsi.html) | 14 Oct 2026 |
| [The Tesla Model Y is Australia's best-selling passenger car through October, with 39,035 sold against 35,927 RAV4s](/dispatch/model-y-australia-passenger-car.html) | 6 Nov 2026 |
| [A SpaceX–Tesla merger could hand Musk Tesla control without hitting a single Mars or robotaxi goal](/dispatch/musk-pay-spacex-tesla-merger-control.html) | 3 Nov 2026 |
| [Musk pledges a SpaceX share to every kid in America](/dispatch/musk-spacex-share-every-kid.html) | 19 Oct 2026 |
| [Cybercab lands in Europe for Paris](/dispatch/paris-cybercab-europe.html) | 12 Oct 2026 |
| [Gwynne Shotwell's 2 million SpaceX shares are headed to teens' Trump Accounts in December](/dispatch/shotwell-2m-spacex-shares-trump-accounts.html) | 31 Oct 2026 |
| [SpaceX passed on three Space Force launches, and no other rocket company bid either. Here’s every option the military has left](/dispatch/space-force-no-bids.html) | 23 Oct 2026 |
| [One customer paid a third of SpaceX’s bills last quarter. Here’s what the 10-Q adds to that $4.4 billion profit](/dispatch/spacex-10q-customer-b.html) | 24 Oct 2026 |
| [SpaceX rents out its compute, but can’t rent any itself](/dispatch/spacex-cant-rent-compute.html) | 19 Oct 2026 |
| [SpaceX has told NASA's Moon lander companies it won't launch them, the latest step back from the agency that saved it in 2008](/dispatch/spacex-dragon-falcon-nasa-retreat.html) | 29 Oct 2026 |
| [SpaceX tells the FAA it plans 10,000 launches a year. The airlines want launches at off-peak hours](/dispatch/spacex-faa-10000-launches.html) | 28 Oct 2026 |
| [SpaceX Q3 preview: Wall Street expects $12.7B in revenue, AI now the biggest piece](/dispatch/spacex-q3-2026-preview.html) | 20 Oct 2026 |
| [Starlink’s new “dynamic pricing” moves in 10% and 20% steps, so the same Max plan now costs $104 to $156 depending on the town](/dispatch/starlink-dynamic-pricing-map.html) | 30 Oct 2026 |
| [Europe’s big four carriers eye Starlink’s satellite airwaves](/dispatch/starlink-eu-spectrum-bid.html) | 19 Oct 2026 |
| [Venezuela and Brazil, cleared](/dispatch/starlink-latam.html) | 10 Oct 2026 |
| [Starlink now has more subscribers than AT&T Fiber. Here’s what that does and doesn’t mean](/dispatch/starlink-passes-att-fiber.html) | 25 Oct 2026 |
| [The US ambassador says Musk offered Starlink to 500 South African schools. Starlink’s own letter says 5,000](/dispatch/starlink-south-africa-schools.html) | 22 Oct 2026 |
| [SpaceX runs 2 of every 3 working satellites](/dispatch/starlink-two-thirds.html) | 12 Oct 2026 |
| [Trump says Musk “put it back.” Ukraine’s drone pilots say their tests show the Starshield speed cap is still there](/dispatch/starshield-cap-still-on.html) | 23 Oct 2026 |
| [Starship will now push Orion to the Moon. What NASA’s new Artemis IV plan changes, and a first look inside Cabin 1](/dispatch/starship-pushes-orion-to-moon.html) | 24 Oct 2026 |
| [33 Raptor 3s: about 18 million pounds of thrust](/dispatch/super-heavy-raptor3.html) | 13 Oct 2026 |
| [8,240 tonnes of thrust](/dispatch/super-heavy-thrust.html) | 11 Oct 2026 |
| [Musk says Terafab’s output will rank in the top 20 of world GDP. I checked the math](/dispatch/terafab-top-20-gdp-math.html) | 21 Oct 2026 |
| [Tesla’s December vote: three items, no shareholder proposals](/dispatch/tesla-2026-proxy-three-items.html) | 19 Oct 2026 |
| [Tesla is ditching outside maps for its own AI maps. Its fleet’s 15.8 billion FSD miles are the whole bet](/dispatch/tesla-ai-maps-v15.html) | 22 Oct 2026 |
| [Tesla says it arrives in Argentina on 20 November; exhibition first, sales later](/dispatch/tesla-argentina.html) | 6 Nov 2026 |
| [Automations app spotted in Europe](/dispatch/tesla-automations-europe.html) | 12 Oct 2026 |
| [Musk says Tesla will likely rent Optimus rather than sell it](/dispatch/tesla-optimus-rental.html) | 7 Nov 2026 |
| [Every new Tesla can now power tools from its charge port. Here’s what 2.4 kW gets you](/dispatch/tesla-powershare-120v-outlet.html) | 28 Oct 2026 |
| [Tesla’s Q3: profit fell 43%, but $1.5 billion of cash came back. Where the money went, and every promise now on the clock](/dispatch/tesla-q3-2026-results.html) | 22 Oct 2026 |
| [Tesla's chip slide renames HW4 to SI4 and sketches SI6 at 80x the compute, with Dojo 3 aimed at space](/dispatch/tesla-si-roadmap.html) | 6 Nov 2026 |
| [Elon says Tesla has no government contracts, and SpaceX government work will be under 10% of revenue this quarter](/dispatch/tesla-spacex-government-contracts.html) | 6 Nov 2026 |
| [Model Y alone outsold the next nine US EV brands](/dispatch/tesla-us-ev-share-q3.html) | 13 Oct 2026 |
| [Vandenberg just broke its launch record with two months to spare](/dispatch/vandenberg-72-launch-record.html) | 27 Oct 2026 |
