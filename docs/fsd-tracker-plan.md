# FSD tracker: research and plan

Written 27 Oct 2026. This is a plan, not a build. Nothing in it ships until you approve it.
A visual preview with real figures is in `docs/fsd-tracker-concept.html` (open it in a browser; it is not part of the site).

## 1. What we have today

Four pages cover FSD. They are accurate and carefully sourced, but they read like a briefing, not a dashboard.

| Page | What it does well | What is missing |
|---|---|---|
| `/fsd.html` (global tracker, 301 KB, about 8,000 px long on desktop, 11,000 px on a phone) | World atlas, country finder, per-country briefing, "compare two markets", dated change log, honest labels (Tesla-listed, scope unresolved, not on checked list) | No chart of any number. The hero globe is decoration. Four software cards are text. Nothing says how big FSD is, or how fast it is growing |
| `/fsd-europe.html` (329 KB) | The most careful Europe tracker we found: permission, listing, delivery and observation kept apart, per-country evidence | The "path to EU-wide approval" meter that FSD·EU leads with is not drawn, although the 15-state and 65% thresholds are already in `data/fsd-europe.json` |
| `/updates.html` (software tracker) | 138 dated snapshots of which builds 3,364 connected cars run, by country | The history is never charted. Competitors lead with exactly this |
| `/autonomy.html` (evidence desk) | Claim checks and a source room | Not connected to the numbers on the other pages |

The real gap is that a reader cannot answer "how big is FSD, is it growing, is it safe, and what is happening near me?" in one screen. Every competitor answers one of those four. None answers all four with sources.

## 2. Who else is out there

I opened 13 live sites, screenshotted most of them and read their pages. Notes on what each does, what to borrow and what to avoid.

| Site | What it is | Best idea | Weakness |
|---|---|---|---|
| **RobotaxiTracker.com** | Crowdsourced robotaxi fleet counts (Tesla, Waymo, Zoox, Avride) | The benchmark for design: operator tabs, big KPI cards, area charts you can hover day by day, small-multiple charts per city, a dot-matrix of fleet by state, Texas DMV registrations, fares, camera sightings, a weekly newsletter | Robotaxi only. No FSD adoption, safety or country rollout. Counts are spotted plates, which it says |
| **FSD Community Tracker** (teslafsdtracker.com, built on Power BI and Google Sites) | Crowdsourced disengagement data, "miles to critical disengagement" per version | The one metric analysts quote. Piper Sandler cited it (441 to over 9,200 miles after v14.1, as reported by Yahoo Finance) | Hard to use: the dashboard is an embedded Power BI report that did not render in my headless browser, and there are no direct links to a chart. Self-selected testers, so skewed. Tesla publishes no intervention data to check it against |
| **FSD·EU** (fsd-eu-tracker.de) | Europe approvals | "Path to EU-wide approval": current and potential bars with threshold markers (15 of 27 states and 65% of population), a simulator, a map | Counts 10 of 27 recognised while Tesla's deck says nine, with no explanation of the difference. Little evidence per country |
| **Not an FSD Tracker** (notanfsdtracker.com) | Global and EU tables, map, articles, alerts | A single table with HW4, HW3, supervised, expected-unsupervised, regulator and notes. "Get FSD alerts" and "contact your regulator" calls to action. News cards with share images | Text-heavy, no charts, a cookie banner that covers the page, not obviously dated per cell |
| **FSD Database** (fsddb.com) | Live data from one public fleet (Whole Mars Catalog) | Per-car cards: miles on FSD, battery, software, a Ctrl+K command menu | A handful of cars, so not representative. Early beta |
| **TeslaFi firmware tracker** | Rolling-out-now banner, installs per day | A heat-map table of installs per build per day, a "waiting" count, an "email me new versions" button | Light, dated look. Only its own users |
| **Teslascope** (software and statistics pages) | Build distribution | A pie of build share, a table with latest wave and countries, a model-mix statistics page | A pie is the weakest chart for this. 110M miles tracked, 50K+ drivers, so a different sample from TeslaFi |
| **Not a Tesla App** software pages | Per-version release notes and rollout statistics | Release notes next to rollout percentages | Stats disagree with TeslaFi and Teslascope (different pools) |
| **Tesorb** | Long-form "OTA tracker" and "global regulatory tracker" articles | Readable explanations | Articles, not trackers. Last updated April |
| **Tesla Software Intelligence** (fsd-autoupdate.netlify.app) | FSD branch and rollout tracker with a v15 outlook | Clean branch-by-branch status | Last updated 13 September |
| **EVwire, Electrek, Teslarati, Basenor** | News and analysis, including Electrek's analysis of NHTSA crash reports | Context and critique | Not trackers. Basenor and similar SEO blogs repeat numbers without sources and often disagree |
| **Tesla itself** | Quarterly deck charts (cumulative FSD miles, active subscriptions) and a live FSD safety page | The only primary numbers for adoption and miles | The safety page is Tesla's own baseline. It blocked my fetch, so I have only reports of it |

I did not find an open-source FSD tracker repository. I could not verify a Teslascope "public FSD metrics dashboard" that one blog mentions, so it is not in the table.

### Numbers that conflict between sites (a reason to be sourced)

- EU countries: FSD·EU showed 10 of 27, one tracker listed nine, Tesla's own Q3 deck says nine EU approvals. Latvia recognised on 26 Oct. The difference is "recognised", "listed" and "approved".
- Share of the fleet on the newest build: TeslaFi showed 21% and Teslascope 23.9% for the same build on the same day. Different pools of owners.
- "Miles per critical disengagement" for v14: 1,454, 1,677 and 9,200 appear in different reports, depending on subset and date.

## 3. Where we can be clearly better

1. **Every number labelled** Disclosed, Target, Reported or Estimate, with the date and the document. No other FSD tracker does this.
2. **One page that answers four questions**: how big (adoption and miles), how safe (claims, checked), what is running (software), what is allowed where (countries).
3. **Promises versus reality** for autonomy, from our own ledger. Nobody else connects the tracker to the track record.
4. **Plain English for your car**: pick your country and hardware, see what you can have and what is still pending.
5. **Real design**: dark, dense, fast, direct-labelled charts. The existing trackers are either a Power BI embed, a pie, or text.

## 4. The proposed page

Rebuild `/fsd.html` as **"FSD by the numbers"** and keep `/fsd-europe.html`, `/updates.html` and `/autonomy.html` as deep dives it links to. (Your decision, section 9.)

Structure, top to bottom. One question per section, one chart per question.

| # | Section | Question | Visual |
|---|---|---|---|
| 0 | Hero strip | How big is FSD right now? | Four KPI cards: active subscriptions (1.74M, Q3 2026), North America attach rate (over 75%), cumulative miles (about 15.5B, read from Tesla's chart), EU countries (9 listed, 10 recognised). Each with a label, date and source |
| 1 | Adoption | Is it growing? | Bar chart of active subscriptions per quarter (0.95M to 1.74M) with our subscriptions-per-delivered-car ratio underneath (12.2% to 17.1%, clearly "our calculation") |
| 2 | Miles | How much has it driven? | Cumulative FSD miles area chart (v11 and before, v12 and beyond) traced from Tesla's deck chart and labelled approximate. Europe callout: over 100,000 customers and over 160 million km since approval (Q3 deck) |
| 3 | Safety | What does Tesla claim, and what does that compare? | A "claims lab": Tesla's published crash-rate comparison, what it is compared against, the window it covers, and the caveats critics raise (for example that the European dataset's windows end in 2025). Never presented as our measurement |
| 4 | Independent reliability | What do independent testers see? | Cited headline figures from the community tracker per version, attributed and dated. Full chart only with the owner's permission (section 9) |
| 5 | Software | What are cars running? | Stacked area of build share over time (we already have the 138 snapshots), an install heat-map table like TeslaFi's, and a timeline of FSD branches with release-notes links |
| 6 | World atlas | Where can I use it? | The existing atlas, restyled dark, plus a step chart "countries with Tesla-listed FSD over time" and a "recognised, listed, delivered" ladder per country |
| 7 | Europe | When might the EU decide? | Path-to-EU-wide meter: states recognised against the 15 needed; population only once we have legal voting weights |
| 8 | Robotaxi link | How far from driverless? | Tesla's cumulative unsupervised Robotaxi miles (nearly 2 million at end of Q3) with links to the Cybercab guide and live tracker |
| 9 | Promises | What was promised? | Autonomy deadlines from `data/promises.json`: said, due, outcome |
| 10 | My car | What does this mean for me? | Country and hardware picker. Reuses the saved "my country" and My Tesla profile |
| 11 | What changed | What is new this week? | Dated log, newest first, plus an RSS feed and email alert |

## 5. Chart and design rules

- **Dark by default**, light supported, same tokens as the Optimus and Cybercab guides. Accent red for the thing that matters; teal, amber and violet for status.
- **Direct labels, no legends** where possible. Big numbers in tabular figures. Monospace for units and dates.
- **Colour never carries meaning alone**: status chips have text, charts have patterns or labels.
- **Every chart has a "view as table"** and a one-line takeaway above it. Screen-reader text states the result.
- **Estimates look different**: dashed lines and an "Approx." chip for anything read off a chart or calculated by us.
- **No pie charts.** Stacked area for share over time, bars for quarters, step charts for counts, small multiples for countries.
- **Motion**: numbers count up once, charts draw in once, off under reduced motion.
- **Mobile first**: KPI cards stack, charts keep their labels at 390 px, tables scroll sideways with a visible hint.

### How to draw the charts

I recommend **charts drawn as SVG by the builder**, with about 8 KB of script for hover tooltips and "view as table". This is how the Optimus ramp is built. It costs no dependency, ships no chart library to phones, and keeps the page fast. For the dense software time series I would test uPlot as a fallback.

Before building I would run the "research before you build" step in CLAUDE.md on the alternatives (Observable Plot, uPlot, Apache ECharts, Chart.js, D3): stars, last release, bundle size, accessibility. I have not done that yet, so treat the recommendation as provisional.

## 6. Data plan: where each number comes from

| Module | Source | Label | Refresh |
|---|---|---|---|
| Active subscriptions, cumulative deliveries, attach rate, EU callouts | Tesla quarterly update decks. The deck footnote says subscriptions include upfront payment and monthly plans and exclude free trials | Disclosed | Quarterly, by hand, within a day of each deck |
| Cumulative FSD miles | Tesla deck chart (axis 0 to 16 billion, no data labels in the text) | Approx. from chart | Quarterly |
| Live FSD miles counter | Tesla's FSD safety page. It blocked my fetch, so this needs a manual snapshot or your browser | Disclosed | Quarterly, manual |
| Safety comparison | Tesla's US and EU safety dashboards, plus NHTSA's Standing General Order data for context | Disclosed (Tesla), Regulator (NHTSA) | Quarterly |
| Build share and rollout | Our existing Teslascope snapshots (`data/updates-history.json`, every 30 minutes or so) | Reported (sample) | Automatic, already running |
| Countries | `data/fsd-global.json` and `data/fsd-europe.json` | Existing labels | Existing checks |
| Independent reliability | FSD Community Tracker, attributed | Reported | Only with permission |
| Promises | `data/promises.json` | Existing | Existing |

New files, following the Optimus and Cybercab pattern: `data/fsd-metrics.json` (series, each point with source, date and label), `fsd-metrics-model.js` (validator), `scripts/build-fsd-hub.mjs` (page, SVG charts, JSON-LD, search records), `fsd-hub.css`, `fsd-hub.js`, tests, a CI workflow and `docs/fsd-hub-refresh.md`. The builder fails if a point has no source or date.

## 7. Why people would come back

- **A "last updated" and "next expected update" on every card**, so it is clear when to return (for example "next Tesla deck: January 2027").
- **Follow a country**: save your country, and get an email or on-site notice when its status changes. The newsletter and "my country" storage already exist.
- **Weekly "FSD this week"** block that feeds the Sunday newsletter.
- **Share cards**: every chart exports a 1200x630 image with the source printed on it, for X.
- **RSS feed** of FSD changes.
- **Events that make news get a permanent home**: the EU vote, a new country, a new version, Tesla's next safety report. Each has a place on the page, updated the day it happens.
- **Speed**: pre-rendered numbers, no layout shift, mobile Lighthouse 90+.

## 8. Delivery in five reviewed PRs

1. **Foundation**: data file, validator, builder, KPI strip, adoption chart, tests. You see the new top of the page.
2. **Software and miles**: build-share chart, install heat-map, miles chart, FSD branch timeline.
3. **Atlas and Europe**: dark atlas restyle, countries-over-time chart, path-to-EU meter (if I can source voting weights), recognised-listed-delivered ladder.
4. **Claims and promises**: the safety claims lab, independent-reliability block, promises strip, robotaxi link.
5. **Return visits and polish**: follow-a-country alerts, RSS, share cards, "my car" picker, speed pass, cross-links, refresh checklist.

Each PR gets screenshots at 390, 768 and 1440 px in light and dark, axe, a gzip-served Lighthouse run, and a cold review before it opens, as on the Cybercab guide.

## 9. Decisions I need from you

1. **Rebuild `/fsd.html` or create a new page?** I recommend rebuilding, because the URL already has the links and search ranking, with the old atlas kept inside the new page.
2. **Independent reliability data**: may I contact the FSD Community Tracker owner for permission to chart their data? Without it we show only attributed headline figures.
3. **Alerts**: email only (through the existing newsletter), or also X posts from you when a country changes?
4. **Tesla's safety page**: it blocked my fetch. Can you paste the current numbers, or is a manual snapshot each quarter acceptable?
5. **Scope**: all five PRs, or stop after PR 2 and look?

## 10. Risks

- **Tesla numbers change or move.** Mitigation: every figure carries its date and document, and the builder rejects unsourced points.
- **Estimates read off a chart.** Mitigation: labelled Approx. and drawn dashed. If Tesla publishes exact figures, we replace them and log a correction.
- **Third-party samples are biased.** Mitigation: always labelled as a sample, never as the fleet.
- **A long page.** Mitigation: sections load as the reader scrolls, charts are static SVG, the old 300 KB of inline HTML shrinks because the atlas data moves out of the page.
- **Safety framing.** We report what Tesla claims and what critics note, and never state our own safety conclusion.
- **Overlap with the Europe and software pages.** Mitigation: the hub shows summaries and links; the deep dives keep the detail.

## Appendix: sites opened for this research (27 Oct 2026)

robotaxitracker.com, fsd-eu-tracker.de, notanfsdtracker.com (home and EU tracker), teslafsdtracker.com and its Google Sites documentation page, fsddb.com, teslafi.com/firmware.php, teslascope.com (home, software, statistics), notateslaapp.com/software-updates, tesorb.com (OTA tracker, global regulatory tracker, rollout timeline), fsd-autoupdate.netlify.app, evwire.com. Not opened: tesla.com (blocked), Electrek, Basenor, Dominik Roth's blog, the Teslascope metrics dashboard.
