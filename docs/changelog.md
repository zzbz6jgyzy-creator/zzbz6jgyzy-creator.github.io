## 2026-10-29 — Cinematic Earth preview

- Added a standalone full-screen Earth study with genuine 8K NASA surface imagery, separate clouds, city lights, ocean reflections and atmospheric lighting.
- Added touch, mouse and keyboard exploration, lighting presets, pause, zoom, reset, adaptive detail and fullscreen. Static imagery and cinematic lighting are disclosed with source and licence credits.
- Kept the prototype out of navigation and search indexing while reviewed. Added browser screenshots, a short film capture, failure-state checks and checksums for the vendored image tiers.

## 2026-10-28 — Prominent member navigation

- Added a labelled Members button to the desktop header and moved mobile/tablet account access into a large card directly below search, ahead of Your Daily and the section list.
- Kept account return links in sync across both entry points and retained the existing Explore shortcut. Compact desktop widths keep Search and Your Daily available as labelled icons so the header fits.
- Refreshed the shared navigation and affected JavaScript bundles. Verified native links, account return handling and responsive layouts through the navigation and member browser suites.

## 2026-10-28 — Referral link wording

- The Tesla referral link now reads "Order with my Tesla link" in the site footer, the Gear page band and the referral banner (grow.js). The "Referral link: we may earn a reward" note stays beside every one of them.
- The footer referral link now carries `rel="sponsored"` (editorial rule 7). The analytics label "Tesla referral" is unchanged.

## 2026-10-28 — Navigation studio

- Add grouped desktop mega menus and a dedicated Trackers directory.
- Introduce a full-width mobile menu with inline search and quieter utility controls.
- Preserve native menu fallbacks, keyboard focus, account return paths, current reporting and existing destinations.
- Keep follow controls available for the current visit when browser storage is blocked.

## 2026-10-28 — Mobile opening and persistent navigation

- Bring imagery before signup on phones and keep Search and Your Daily visible.

# Changelog

## 29 Oct 2026 — Gear page, second pass: calmer and organised by what you want

- **Organised by need, not by shop:** one "Shop by what you need" list of 15 equal cards (TESMAG and EV Bandit merged), ordered by usefulness with the two "Start here" items (floor mats, screen protection) first. Each card has an icon, a small neutral source label (TESMAG or EV Bandit, plus the existing line name such as 3D MAXpider), one description and a single link. The two long photo grids and the big shop banners are gone.
- **Filter chips that work without JavaScript:** All, Interior, Screen & glass, Wheels, Exterior & performance, TESMAG, EV Bandit are radio buttons styled in CSS (`:has()`); a 20-line script only adds "Showing N of 15" and makes `#daily` / `#upgrades` links pick the matching chip.
- **Compact hero, no photograph:** headline, one sentence, "Shop all TESMAG" and "Shop all EV Bandit" at the top, then the "Choose your Tesla" picker (five TESMAG model cards; a compact list on phones). Same Wikimedia photos and credits for those five; credits for photos no longer shown were removed.
- **Simple sticky nav:** Your Tesla, Browse gear, Before you order, with the current section highlighted. The dark-glass header treatment is removed; the header is the normal site header again.
- **Disclosure:** the affiliate note appears twice (beside the two shop-all links at the top, and after the list) instead of about eight times; every link still has `rel="sponsored noopener"`, an external-link arrow, and "affiliate link, opens in a new tab" in its accessible name. The referral band keeps its own "Referral link: we may earn a reward" note.
- **Quieter ending:** the checklist and the referral band follow the list, without banners. The extra "The week. Worth your time." newsletter block was removed from this page.
- **Size:** page height 10,267 / 8,469 / 6,689 px (390 / 768 / 1440) before, 6,034 / 4,658 / 3,776 px after. Mobile transfer 504 KiB to 270 KiB. Lighthouse mobile (gzip server, 3 runs each): Performance 91-94 before, 98-99 after; LCP 2.8-3.1 s before, 1.9-2.3 s after; CLS 0, TBT 0-70 ms before and 0 after. Lab numbers vary by a few points between runs.

## 28 Oct 2026 — Gear page redesign

- **Car-led hero with a "Choose your Tesla" picker:** a full-bleed dark stage with the existing Model 3 photo, a short headline and five model tiles. Each tile opens that model's TESMAG collection in one tap; a small "Upgrades" chip jumps to the EV Bandit shelf on the same page. On phones the tiles are a swipeable snap carousel with the next card peeking.
- **Designed quick-nav:** a sticky pill under the header (Models, TESMAG, EV Bandit, Before you order) that highlights the section in view.
- **Two shops as bold tiles, then the shelves:** TESMAG (daily living) and EV Bandit (upgrades) each get a larger feature card and a tighter grid. Same products, copy, partner links and Wikimedia credits.
- **Disclosure next to the links:** an "Affiliate" chip with the existing commission wording sits under the picker, in each shelf header and again under each shelf. Every partner and referral link keeps `rel="sponsored noopener"`.
- **Built, not hand-edited:** `gear.html` is now generated from `data/gear.json` by `scripts/build-gear-studio.mjs` (between `<!--gx:studio-->` markers); `tests/gear-studio.test.mjs` and `.github/workflows/gear-checks.yml` check determinism, links, anchors and images.
- **Images and weight:** responsive AVIF/WebP for the six category photos (`assets/gear/`, made by `scripts/build-gear-images.mjs`), correct width/height on every image, the hero image preloaded, `sizes` matched to the real tile widths, and `tesla-page.css` and `page-studios.css` no longer loaded on this page. Measured with Lighthouse mobile, 3 runs each, old vs new page on the same machine: gzip server 87-88 vs 94-95 Performance, LCP 3.5-3.7 s vs 2.7-2.8 s, 801 KiB vs 504-521 KiB; uncompressed server 72-77 vs 77-79, LCP 4.6-5.3 s vs 4.7 s, 1,085 KiB vs about 790 KiB. CLS 0 and TBT about 0 both times. Lab numbers vary by several points between runs, so treat the gain as modest, not a guarantee for readers.
- **Contrast:** text over photos (shop tiles, collection tiles, hero copy, picker intro) was checked by sampling the rendered pixels behind each line at 390, 768 and 1440 px: all text at or above 4.5:1, large text above 3:1, without relying on text shadows.
- **Referral link:** the "Order with my referral" band link now carries `rel="sponsored noopener"` (it was `noopener noreferrer` with no `sponsored`).
- **Removed:** the "Layout. Shop cards follow 21st.dev ..." credit (the cards no longer follow those components), and the unused `.ps-gear` rules in `page-studios.css` (its `?v=` bumped on the pages that load it).

## 28 Oct 2026 — Roadster preview: chapter tabs on phones

- **Tabbed chapters:** at 900 px and narrower the Roadster preview keeps the hero and the reveal as one continuous scroll, then shows the rest in seven tabs (Pictures, Inside, Engineering, Numbers, Models, Timeline, Questions) on a sticky dark-glass bar, one panel at a time, each ending in a "Next" button. At 390 px the page is 11,700 to 14,900 px depending on the tab (it was 31,200 px). Desktop is unchanged.
- **Deep links and keyboard:** every existing anchor opens its tab and lands below the sticky bars; tabs use the WAI-ARIA tabs pattern (arrows, Home, End); scrolling is instant and Back is never trapped. Without script, or on a wide screen, every panel is visible in order.
- **Moved:** the changes log and credit line now close the page outside the tabs (it was the right-hand column of the evidence chapter); the sources ledger is two columns on desktop.

## 28 Oct 2026 — Roadster experience, part 3 and the cinematic pass

- **Chapters:** every angle (reel with collections and a full-screen viewer), inside (numbered hotspots), engineering (six systems and a mechanism diagram), the numbers (with a simplified g-force illustration), three trims (side-by-side comparison, miles or kilometres), the money, the wait (2017 against 2026) and the evidence ledger. The model validator rejects unsourced items, unknown sources and Reported items that cite no reporting.
- **Look:** the hero is now the car (a full-bleed studio still with vignette and grain, headline anchored low), the header is dark glass on this page in both themes, the reveal stage has large numerals, caption overlays and a progress mark, gallery cards are large with overlaid captions and a dominant-colour placeholder, and sections reveal on scroll (CSS only, off with reduced motion).
- **Without script:** all engineering panels are visible and the script-only controls are hidden. Pause motion also stops the hotspot pulse.
- **Data fixes:** the 2017 price row is a claim, the slip is dated "Oct 2026", dates are stated as Texas time, cockpit card 01 is Reported, the physics tick sits at 1.6 s.
- **Housekeeping:** unused clip posters and the doors and finale clips were removed (data/roadster-clips.json and `--check` agree); the stylesheet version is now a hash written by the builder.

## 28 Oct 2026 — Roadster experience, part 2 (video loops)

- **Five stage loops** (ramp, flip, hop over a line of Teslas, the timed run, under the lights) now play behind the reveal steps, cut from Tesla's official event video. A sixth, the rear wing, plays behind the engineering chapter. Silent, 12 seconds or less, faded in and out, credited and linked to the original.
- **Light on data:** one format at one size per clip (phones are served WebM first: all six clips are 1.45 MB at 720 px; desktop WebM is 3.26 MB at 1280 px), `preload="none"`, only the active step's loop plays, the next is fetched one step ahead, and nothing downloads with reduced motion, Save-Data or the Pause button.
- **Pipeline:** `scripts/make-roadster-clips.py` (ffmpeg) with the source pinned by checksum; a test checks every output's checksum and the budget.

## 28 Oct 2026 — Roadster experience, part 1 (hidden preview)

- **A new Roadster page is being built at `/roadster-preview.html`** (hidden: `noindex`, not in the menu, sitemap or search). It is a dark, cinematic scroll page; the live `/roadster.html` is unchanged until you approve the preview and it is swapped in.
- **This part:** the hero (flight loop, wordmark, the four key facts), a pinned "reveal" stage whose picture follows five steps (ramp, flip, hop over a line of Teslas, the 0.81-second claim, no price), the 50-second film and a click-to-load replay of Tesla's full event, the reservation terms, ten questions and a change log, each item labelled by who said it and sourced.
- **New facts, all from pages we opened:** Engadget, TechCrunch, The Verge, Hagerty, Autoblog and HotCars (reservation prices and clause 4 of the reservation agreement, the event location near Waco, the engineer's figures). Tesla's own pages block our fetcher, so they are not cited as opened.
- **Motion:** muted loops that play only on screen and when allowed; reduced motion, Save-Data and a visible Pause button show stills instead.

## 28 Oct 2026 — Latvia is the 10th EU country to recognise FSD (Supervised)

- **FSD Europe:** Latvia’s 26 Oct recognition of the Dutch RDW approval is now recorded from the [Ministry of Transport / CSDD notice](https://www.sam.gov.lv/lv/jaunums/latvija-atzist-niderlande-izsniegto-provizorisko-tipa-apstiprinajumu-tesla-izstradatajai-vaditaja-paligsistemai). That is 10 of 27 EU states. Tesla still does not list customer availability there; rollout begins soon, so listed EU markets stay at 9.
- **QMV share:** the ten recognising states are 14.3% of EU population on Eurostat’s 1 January 2025 figures (15 states and 65% remain the thresholds). Tesla’s 21 Oct Q3 deck still says nine EU countries for the 100,000-customer / 160 million km claim.
- **Footer:** the shared “Contact me” mailto is wrapped in Cloudflare `email_off` comments so Email Obfuscation does not inject `email-decode.min.js` on pages whose SVG maps use `<a href>` (that decoder throws `o.href.indexOf is not a function` on SVGAnimatedString).
- **Tests:** wallpaper studio download journeys use a local HTTP server. Chromium’s download manager never sent the Desktop `<a download>` click through Playwright `route.fulfill`, so `expect_download` timed out on main as well.

## 28 Oct 2026 — Teslascope counts and coming-soon fares

- **FSD global:** the 28 Oct Teslascope 689 vs 94 sample compares 2026.38.5.11 with 2026.38.5.10, the two builds that carry v14.3.13 and HW3 v14.3 Lite. Those counts are Teslascope’s all-hardware snapshot, not an HW3-only census. 2026.38.5.11 is not described as the most widespread Lite-carrying build (2026.38.5.1 was larger in the same snapshot).
- **Robotaxi:** Las Vegas, Jacksonville, Phoenix and San Antonio say there is no fare information until Tesla launches service. The city dossier headline is “Not yet available”, not a live estimate.

## 28 Oct 2026 — Freshness audit: dates, launch merge, Robotaxi cities

- **Launches:** the hourly refresh no longer lets the cached file overwrite a later Launch Library 2 NET when status is unchanged (Starlink 15-21 → 02:35 UTC). Regression test in `tests/calendar-launch-import.py`.
- **Starship:** Ship 42 six-engine static fire (27 Oct, about 21:46 Irish time, reported) on the Flight 15 record; Flight 16 keeps December, reported, and adds FAA NET 10 Dec 2026 plus NSF late-January 2027 for the first Florida flight.
- **Grok Bot:** changelog checked through v0.77.0 (26 Oct).
- **Dispatch:** dated Update notes on the CRS-35, earnings-week and Roadster-thruster previews; article blurbs no longer read as still upcoming. Lock-up outcome not stated.
- **Robotaxi:** Las Vegas, Jacksonville, Phoenix and San Antonio listed as Tesla coming soon (21 Oct safety report, via TeslaNorth).
- **FSD global:** HW3 v14.3 Lite pointed at 2026.38.5.11, the most widespread Teslascope build on 28 Oct.
- **Promises:** Flight 15 ledger gets the 25 Oct B22 33-engine fire and the 26–27 Oct Ship 42 static fires; “add your car to the fleet in 2026” gets Elluswamy’s Q3 “somewhere around Q2 next year” line (TeslaNorth). Status left In progress. The Promise Tracker builder now stamps JSON-LD `dateModified` from the ledger.
- **CI:** push-triggered Rebuild JS bundles uses its own concurrency group so `data-push-main` cannot cancel it.

## 28 Oct 2026 — FSD tracker, part 5c (finishing step 5)

- **Save image:** each drawn chart (adoption, miles, software lines, map with the Europe inset, EU recognitions) gets a "Save image" button that makes a 1200x630 PNG: title, the card's own description (units, sample, dates), the chart, key and source line. A card only gets the button if it has a source line. The map image is titled "Where Tesla lists FSD (Supervised)" with the "a listing is not a legal approval" note. No library; the button keeps keyboard focus and announces the result.
- **My car:** the country picker reads the car saved in My Tesla on the same device (read only). It fills the country and echoes the model, year and the computer the owner confirmed in My Tesla (or says it is not confirmed). It never infers hardware from the model year and makes no claim about FSD eligibility, matching My Tesla.
- **Cross-links:** the global FSD tracker and FSD Europe now link to FSD by the numbers (through their own view files and builders; their tests assert the link).

## 28 Oct 2026 — FSD tracker, part 5b (menu)

- **Menu:** "FSD by the numbers" (badge New) added under Tesla, Software & autonomy, in the desktop and phone menus, from `scripts/nav.json` via `scripts/sync-nav.py`. Every page's menu block is regenerated, so the diff is the same block on about 160 pages.

## 28 Oct 2026 — FSD tracker, part 5a (return visits)

- **When it updates next:** a table of what refreshes from which source and when we expect the next change (our expectations, marked as such, not Tesla's schedule).
- **Follow by email:** the site's usual weekly tracker digest box on the page (Beehiiv, topic tesla-software). We have no per-country alerts: the newsletter tool does not segment by country, so the box is the whole offer.
- **RSS:** `/fsd-tracker-feed.xml` carries this page's change log.
- **Your country:** a picker in the markets section that remembers the country on the device only and shows Tesla-list and EU recognition status from the page's own data.
- **Share image:** a 1200x630 card with the four headline numbers (`scripts/fsd-tracker-og-card.mjs`).
- **Tests:** two library-ban tests matched bundle hashes (a hash containing "d3" failed them); they now match library file names.

## 28 Oct 2026 — FSD tracker, part 4 (safety claims and promises)

- **What Tesla says about safety:** Tesla's published miles per major collision (FSD 5.30M, manual with Active Safety 2.18M, manual without 0.86M, U.S. average 0.66M) as bars, with each group's collisions and miles, the collision definition, last year's figures, the EU dashboard claim and four caveats. The figures are labelled Reported, with their February 2026 date, because we have not compared them with Tesla's own report: they come from Not a Tesla App, EVwire, Drive Tesla Canada and Automotive World (headline only), which we opened. Two caveats are our own reading and carry no label or outlet. The 8.0x and 2.4x multiples are our own division and marked as estimates. The validator checks each row (miles driven / collisions = miles per collision, within 1%).
- **What was promised:** all 15 FSD / autonomy promises read from `data/promises.json` (tally, said and due dates, status, source), so a correction in the promise tracker shows here.
- **Tools used:** Scrapling fetched the three source articles.

## 28 Oct 2026 — FSD tracker, part 3 (atlas and Europe)

- **Where it works:** a dark world map of Tesla-listed FSD markets with a Europe close-up, region bars and a pointer to the country-by-country finder. Drawn at build time from public-domain Natural Earth geometry; no map library.
- **Europe and the road to a decision:** one tile per EU state (recognised and listed, recognised only, nothing recorded, with a dot where customer use is reported), the two thresholds FSD·EU draws (15 of 27 states and 65% of EU population) and a step chart and dated list of the ten recognitions. The population share is our own arithmetic on Eurostat's 1 January 2025 figures (14.3% for the ten recognising states, which also matches FSD·EU's figure). The page says a national recognition is not a committee vote and that we do not forecast one.
- **Pinned data:** the markets and Europe slices are now pinned into `data/fsd-tracker.json` by `scripts/refresh-fsd-pins.mjs` (renamed from `refresh-fsd-software.mjs`), so the page no longer reads other trackers' data files at build time.
- **Also in this change:** `docs/tooling.md` and `.claude/rules/tools.md` (the installed extra tools and the rule to use them).

## 28 Oct 2026 — FSD tracker, part 2 (miles and software)

- **Cumulative miles:** an area chart of FSD miles (V11 and before, V12 and beyond), measured from the chart in Tesla's Q3 deck. The deck gives no exact total, so every value is marked approximate (about 15 billion at the end of Q3, likely within half a billion; checked against the same chart in the Q1 deck). A fifth headline card shows it. Europe callout: over 100,000 customers and more than 160 million km.
- **Software:** running totals of cars Teslascope has seen on each of the six builds with the most cars (one line per build, not stacked, because a car can appear under more than one build), a table of new cars seen per day, and a timeline of the eight latest FSD builds with first-seen dates. The data is a dated slice pinned in `data/fsd-tracker.json` by `scripts/refresh-fsd-pins.mjs`, so the page does not change every hour.
- **Phones:** every chart has a larger-text phone version, so labels stay readable at 390 px.

## 27 Oct 2026 — FSD tracker, part 1 (foundation)

- **New page `/fsd-tracker.html` ("FSD by the numbers")**, separate from `/fsd.html` so you can compare the two and keep either. This first part has the headline strip (active FSD subscriptions, North America attach rate, Europe customers, Tesla-listed markets), the adoption chart with a table view, a label legend, a change log and sources.
- **Numbers:** seven quarters of active subscriptions and cumulative deliveries from Tesla's Q1, Q2 and Q3 2026 decks. Subscriptions per delivered car is our own ratio and is labelled as an estimate.
- **Wiring:** own builder, data file, validator, bundle, build-time SVG charts (no chart library), tests, CI workflow and `docs/fsd-tracker-refresh.md`. The markets figure is read from `data/fsd-global.json`, so it cannot disagree with `/fsd.html`.
- The planning documents are in `docs/fsd-tracker-plan.md` and `docs/fsd-tracker-concept.html`.

## 27 Oct 2026 — Cybercab guide in the navigation

- **Menu:** "Cybercab guide" (badge "New", "Specs, timeline & promises") now sits next to "Cybercab tracker" under Tesla › Software & autonomy, in both the Tesla and Explore menus and the mobile quick links. Edited once in `scripts/nav.json` and synced to every page with `scripts/sync-nav.py`.

## 27 Oct 2026 — Cybercab guide, part 3 (links and polish)

- **Link from the live tracker:** `cybercab.html` (rebuilt from `mobility-view.js`) now points to the guide from the "Read the measures correctly" strip. The only generated-page change is that link and the bundle hash.
- **What changed:** the guide's own log records the added sections.
- **SEO audit tool:** `scripts/audit/seo_check.py` read an inline SVG `<title>` as the page title; it now ignores titles inside SVG.
- **Speed:** guide mobile Lighthouse 97 (Accessibility 100, SEO 100, CLS 0), served gzip like Cloudflare.
- Not done, proposed: a "Cybercab guide" entry in the shared navigation (it would regenerate nearly every page).

## 27 Oct 2026 — Cybercab guide, part 2 (showpieces)

- **Illustrated anatomy:** our own side-view drawing of the Cybercab with five numbered features (butterfly doors, two seats, no manual controls, front light bar, front motor), each with its label and source. It is marked as our illustration, not Tesla CAD. The charge port and battery pack are listed but not drawn because their positions are unpublished.
- **Capacity arithmetic:** "125,000 a year" is installed capacity, not output. A table and a slider show what a weekly build rate adds up to (per year, share of capacity, weeks to 10,000 cars). It is arithmetic, not a forecast, and says so.
- **Against the other operators:** Tesla, Waymo and Zoox in their own published figures (Waymo's 270 million miles through June and fifteenth U.S. city from its blog; Tesla's Q3 deck). Baidu Apollo Go is left out because we could not open a figure from Baidu.
- **Share card:** a 1200x630 card for X and other previews replaces the default image; the template is `scripts/cybercab-og-card.html`.
- **Test:** every Disclosed item in the new sections must cite a Tesla, regulator or company document.

## 27 Oct 2026 — Cybercab guide, part 1 (content backbone)

- **New page `/cybercab-guide.html`:** what Tesla has disclosed about the Cybercab versus what is only reported or a target. Six sourced numbers, a versions table (2024 reveal, production car, a blank customer column), a 15-event timeline with a filter, seven robotaxi promises checked, ten sourced questions, a "What changed" log and a source ledger with the date each source was opened.
- **Labels:** every figure is Disclosed (Tesla or a regulator, in a document we opened), Target or Reported. Battery, range, motor and weight come from a Car and Driver report of an EPA filing, so they are Reported; Tesla has published no spec sheet. The Dallas line says the call named the Robotaxi service, not Cybercabs specifically.
- **Promises are single-sourced:** the guide holds only ids from `data/promises.json`; wording, status and evidence come from the ledger and the build fails if an id disappears.
- **Evidence:** Munro Live's walkthrough post (with Tesla's Lars Moravy and @EricETesla) is embedded with the site's click-to-load X embed. We did not watch the video, so the page quotes only the post.
- **Wiring:** own builder, data file, validator, bundle, CI workflow and refresh checklist (`docs/cybercab-guide-refresh.md`). It does not touch the bot-rebuilt `cybercab.html`; links from there come in a later, separate change.

## 27 Oct 2026 — Viewer fixes and an Optimus change log

- **3D viewers (Cybertruck, Model 3, Optimus):** the explode slider has a 24 px touch target (WCAG 2.5.8) on all three viewers, now defined once in the shared `model3-explorer.css`. Cybertruck and Model 3 gain it (it was 4 px); Optimus already had it as its own rule. axe is clean on all three viewer pages.
- **Cybertruck viewer:** hidden internal parts (battery, motors and so on) were flagged `null` instead of `false` while assembled, which three.js still draws. They are now skipped properly. (The body hides them, so nothing visibly changes; it removes wasted rendering and a possible see-through at the glass.) Model 3 does not use that part system and is unaffected.
- **Optimus page:** a visible "What changed" section lists dated updates and corrections, newest first (editorial rule 6), and the first correction is on it (the sources header had shown unfilled template text instead of the review date).
- **`docs/optimus-refresh.md`:** a step-by-step checklist for when Tesla unveils Gen 3 or publishes a new quarterly update.

## 27 Oct 2026 — Optimus guide: craft and speed (Optimus PR 3 of 3)

- **Layout shift:** the page now uses the site's `--font` token, which already carries metric-matched Inter fallbacks, so the headline no longer re-wraps when the web font loads. Mobile CLS 0.021 → 0.001.
- **Share image:** a 1200x630 card for X and other previews ("Optimus: built in Fremont", the robot, three key facts) replaces a cropped investor-slide image. It labels the delivery date as a target and credits the fan-made model; the template is `scripts/optimus-og-card.html`.
- **Motion:** a gentle rise on section heads and cards, CSS scroll-driven, only where supported, off under reduced motion and always fully visible when printed. (A progress line under the chapter bar was dropped: the site already has a scroll beam.)
- **Tablet:** below 900 px the X-ray stacks above its panel at full width, and the 3D launcher shows its text under the poster.
- Measured (Lighthouse, mobile, served gzip-compressed as Cloudflare does): Performance 95, Accessibility 100, Best Practices 96, SEO 100, LCP 2.4 s, CLS 0.001, TBT 0. The Best Practices point is the Cloudflare analytics beacon failing on localhost. Desktop: 100 / 100 / 96 / 100.

## 27 Oct 2026 — Optimus in 3D

- **New 3D explorer** on `/optimus.html` ("Take Optimus apart."), built the same way as the Cybertruck and Model 3 explorers: it loads only when a reader presses Explore in 3D, in an isolated viewer with Explode, Parts, Reset, Rotate, pinch/keyboard zoom and an Exit button that returns focus.
- **Model:** "Tesla Optimus Gen 3" by Michael (Sketchfab), CC BY 4.0. The author's 78 MB single mesh was cut into 17 parts at the joints, simplified and compressed to 2.1 MB (`scripts/optimus-model-pipeline.mjs`, provenance and hashes in `assets/3d/optimus-provenance.json`). Labelled fan-made, not Tesla CAD; it resembles Gen 2.
- **Inside:** 14 rotary and 14 linear actuators, the 2-DoF neck, battery cells and board, central computer, cameras, hand motors and tendons, foot sensors and the harness, modelled in code from Tesla's 2022 description. Exploding slides each cover off its joint and turns the torso covers into a translucent ghost.
- **11 sourced part cards**, generated from `data/optimus-studio.json` into `optimus-parts.js`. The X-ray's selected system opens the matching part in 3D.
- Tests: `tests/optimus-3d-browser.py` (software WebGL: load, 28 actuators, explode, card, reset, keyboard orbit, guide launch and exit, missing-model fallback) and new node checks for cards, generation and model hashes.

## 27 Oct 2026 — Homepage editorial experience

- New “Go beyond the headline” opening with a larger, aligned Roadster/Starship/Starlink showcase and clearer original reporting, toolkit and personal Daily routes.
- More readable typography, visible My Tesla/live compass links, and a clearer free Sunday briefing offer with native signup and a real issue preview.
- Kept news/tracker refresh ownership, SEO metadata, source context and existing imagery. Added no runtime JavaScript or dependency.
- Responsive browser checks cover phones, tablet, desktop, both themes, no JavaScript, unavailable data and 200% text. Before/after previews come from the actual PR base and head; no test emails are sent.


## 27 Oct 2026 — Optimus guide: interactive showpieces (Optimus PR 2 of 3)

- **X-ray body:** the cropped portrait in "Inside the machine" is replaced by a detailed X-ray illustration: translucent shell, frame, all 28 body actuators in the 2022 layout (14 rotary, 14 linear, from Tesla's AI Day description), the 2-DoF neck, battery cells and pack board, central computer, cameras, cable runs, six hand motors with tendons, and foot force sensors. Choosing a system lights it up and shows its labels.
- **Hand lab:** switch between Gen 2 (11 DoF, published) and Gen 3 (22 DoF, reported) to see which motions are driven and how tendons run to forearm actuators; a grip slider shows why touch sensing matters (slip, hold, crack).
- **Ramp explorer:** an illustrative S-curve toward 20,000 a week ("at least a year", per Musk), rounded figures marked "Illustration, not a forecast", with a slider, pointer cursor, two paces, weekly/yearly/cumulative readouts, a delivery-target band and a table view. Labelled as illustration; Tesla has published no volumes.
- **Promise strip:** each commitment drawn from when it was said to when it was due, with its outcome and a Today line.
- New tests for the ramp model and every new control; illustrations live in `scripts/optimus-art.mjs`.

## 27 Oct 2026 — Optimus guide: research backbone (Optimus PR 1 of 3)

- **State of play:** eight sourced numbers (production started, 1M/yr Fremont design, 10M/yr Texas design, 20,000/week goal, late-2027 deliveries, AI5 in April 2027, 22-DoF Gen 3 hand, the 1M-robot pay milestone), each labelled Disclosed, Target or Reported, with an as-of date.
- **Generations compared:** concept, AI Day prototype, Gen 2, Version 2.5 and Gen 3 side by side; blank cells say "Not published" rather than guessing. On phones, a switcher shows one generation beside the labels.
- **Timeline:** 19 dated moments from 2021 to the 2027 targets, filterable by kind.
- **Promises vs reality:** seven dated commitments checked: 2 kept, 1 missed, 1 not shown, 3 open.
- **The field:** Atlas, Figure 03, Digit, NEO and Unitree G1 in their makers' own words, next to Optimus.
- Three more evidence records (Tesla Diner, kung fu, running), 14 FAQs, 38 sources (22 new or rechecked on 27 Oct 2026), BreadcrumbList, and a fix for the literal `${reviewDate}` in the sources header.

## 27 Oct 2026 — Robotaxi Boss: sound, phone and results (PR 3 of 3)

- **Sound:** on after you start (a muted choice is remembered, same as the other games), through a compressor with city hum, a rain bed when it rains, traffic during the day replay, a rising cash tick on fares, a sting and haptic when a cab breaks, an arpeggio and haptic for contract wins, and a toast over the map for events and status. Haptics respect mute and reduced motion.
- **Phone:** Play enters focus view, the action bar ("Run the day", "Sleep ·" and the rest) is fixed to the bottom of the screen, the fleet is a swipeable tray, dispatch opens as a bottom sheet, the header and mode bar are compact, and landscape gives the map the full height. The map scrolls into view after each night instead of jumping to the forecast.
- **Results screen:** animated medal, points counting up, rows (cash, cabs, rides, missed, reputation, contracts won), personal-best delta, and a Share result button that sends a generated 1200x630 card through the share sheet (text and link fallback, then clipboard). Failed weeks ("Permits suspended", "Chapter 11") get their own card.
- Shared helpers `SDArcade.share` and `SDArcade.medalSvg` added to `arcade.js` for new games to reuse.
- Cleanup: removed the dead leaderboard, callsign and hero-button code from `robotaxi.js` and 23 dead CSS rules from `robotaxi.css`; the manual and intro describe windows, tokens, contracts and the new ways to lose.
- Tests: Robotaxi sound default and remembered mute, phone focus view with the fixed action bar at 390 px, results card after the week.

## 27 Oct 2026 — Robotaxi Boss: decisions that matter (PR 2 of 3)

- Campaign and daily days now run in **four dispatch windows** (morning rush, midday, evening rush, night out). Between windows the day pauses for about 7 seconds: spend **dispatch tokens** (2 a day, 3 with the Ops centre) to **surge** a zone (+25% fare, -20% demand), **rebalance the fleet** toward the zones that are short, or pay for a **roadside fix** after a breakdown. Under reduced motion and in tests the windows run straight through with no interventions, so `Run the day` is still synchronous. Training keeps the single-shot day.
- **Two contracts a day:** pick the safe one or the bold one (35% more rides for 70% more bonus).
- **Six upgrades:** Ops centre (+1 token), Surge AI (surge +40% fares, only 15% demand lost) and Brand campaign (+10 reputation, +5% demand) join the original three.
- **Stakes:** reputation under 15, or cash below zero, at the end of a day ends the week early ("Permits suspended" / "Chapter 11", recorded as an incomplete run). Reputation rules are gentler than before for ordinary coverage gaps and harsher for total neglect.
- **Campaign progression:** "Run another week" starts week 2, 3 and so on (more rain, +6% demand per week, more breakdowns). Week 1 is unchanged and deterministic; Restart goes back to week 1.
- Anonymous counters for Robotaxi starts, retries, completions and `game_fail_bankrupt` (Worker allowlist extended, redeploy needed).
- Map and run improvements: the map scrolls into view when you run the day; playback keeps running when the map is off screen.

## 27 Oct 2026 — Robotaxi Boss: the living city (PR 1 of 3)

- The static SVG diagram is replaced by a live Canvas 2D city (`robotaxi-fx.js`): a seeded procedural map with downtown towers, an airport with a runway and passing planes, a stadium with floodlights and a concert glow, hills with houses and contours, a river, arterial roads and a depot with charging bays.
- Time of day runs from 6:00 to 22:00 (ambient light, dusk glow, lit windows, road lamps, headlight cones); rain adds streaks, ripples and wet roads.
- Cabs drive their routes to their zones; demand shows as pulsing passenger dots and a coverage ring around each zone; rides produce floating fares and a cash ticker; missed demand and breakdowns (with smoke) are shown on the map; the contract has a progress ring. The day now plays as a 10-second replay of the existing deterministic result (skippable; instant under reduced motion). Rules, scores and saved weeks are unchanged.
- Zone hit areas stay real buttons ("Assign selected cabs to ..."); the cards, steppers and fleet grid are untouched. The canvas reserves its space (layout shift 0.0035 on desktop, 0 on phone) and costs about 3.6 ms per frame in a software-rendered browser.

## 27 Oct 2026 — Hot Staging phone layout, results screen and cleanup (PR 3 of 3)

- Phone: compact header and mode bar, Play enters focus view automatically (exit is remembered for the session), bigger thumb pad with safe-area padding and a Throttle button in campaign and daily, and a landscape layout where the stage fills the screen and the pad floats over the lower corners.
- Fixed for both Hot Staging and Catch: starting focus view now scrolls to the top (landscape phones used to show the stage cut off), and the instrument panel is hidden in landscape focus view.
- Results screen: animated medal, points counting up, timing/attitude/bonus rows, personal-best delta, and a Share result button that sends a generated 1200x630 card through the share sheet (text and link fallback, then clipboard). Failures show a matching card with the reason and run score.
- The instrument panel no longer says "Stage now" after the flight has ended.
- Page copy and the mission manual describe Max-Q, gusts, Raptor-outs and the streak bonus. 19 rules of dead legacy CSS removed from `staging.css` (about 200 lines).
- Tests: Hot Staging focus view at 390 and 1440 px, results card after a stage.

## 27 Oct 2026 — Hot Staging interaction and feel (PR 2 of 3)

- Campaign and daily flights now have telegraphed **gusts** (arrows and tint about 1.25 s ahead, callout says which way to steer), a mid-flight **Raptor-out** (engine goes dark, pulls the stack to one side), and **Max-Q load management**: hold Throttle (S / Down, or the new pad button) through the Max-Q band to keep the structural load bar down. Throttling costs steering authority (65%) and slows the clock to the window (0.6x). Unattended load past 1.0 is a new "Max-Q breakup" failure. Training is unchanged: no gusts, no Max-Q, same timings.
- Scoring: streak bonus for consecutive clean stages, +150 Max-Q managed, +120 Raptor-out saved; shown in the debrief.
- Feel (from Catch): sound on after Play with a remembered mute, compressor, proximity ping that rises as the needle nears the sweet spot, warning beeps, haptics on window/stage/fail/engine-out, slow motion (0.62x) while the window is open and a 110 ms hit-stop on stage and fail (both off for reduced motion and demo), `R` to retry, tips on every failure, first-run coaching callouts, mission briefing callout.
- Anonymous counters for Hot Staging starts, retries, completions and each failure kind (`game_fail_walk|early|late|rud|maxq`); Worker allowlist extended (deploy needed).
- Tests: Play now unmutes Staging like Catch; new checks for gust schedule determinism, remembered mute, training staying simple, and an unattended campaign flight failing.

## 27 Oct 2026 — Games: Catch upgrade and Hot Staging visual overhaul

- Catch: anonymous play counters (`game_start`, `game_retry`, `game_complete`, `game_fail_*`, `game_return_d1`; page path only, no IDs), phone-first layout (compact header, focus view on Play, landscape pad), sound on after Play with a remembered mute, callouts, plume glow, final-approach slow motion, haptics, `R` to retry.
- Hot Staging (PR 1 of 3): new renderer in `staging-fx.js` + `staging.js`. Perspective planet with parallax surface, cloud deck, city lights, limb glow and aurora; speed streaks and exhaust trail; Max-Q vapour collar; cinematic stage (starburst, booster flip and fall, Ship acceleration, camera tracking); four breakup cinematics (debris, fireball, shards; the debrief now appears after 1.2 s); canvas instruments (altitude tape, attitude gauge with safe/fail zones, staging-window meter). Simulation, scoring and test timings are unchanged. Frame time in a software-rendered headless browser went from about 11.8 ms to 15.8 ms at 1440 px (planet surface cached at half resolution).

## 27 Oct 2026 — Live leftover titles and launch Record line

- Roadster story-list titles now match the renamed previews (`Roadster day preview: Musk promised a “BANGER”`, `Roadster reveal set for 15 Oct (preview)`). The banger `<title>` keeps ` | Supercharged Daily`; og/twitter stay unsuffixed.
- A stale Launch Library 2 “In Flight” label becomes Success once NET has passed, so flown launches no longer show `Editorial calendar · Launch in Flight` on the Record line.
- News studio’s rebuild check keeps pictures, newsletter and a deterministic second pass, and no longer requires the committed `news.html` snapshot. Source-only title updates can land without a generated-page commit.

## 27 Oct 2026 — Date and freshness fixes

- Tesla 2026 Annual Meeting (3 Dec, 3pm CT / 21:00 Irish) is now on the calendar, TSLA page and homepage major-event countdown, with the 6 Nov in-person drawing deadline. Sources: SEC annual report and votetesla.com.
- Homepage / Tesla overview “newest build” now tie-breaks same-day first-seen dates by numeric version, so 2026.38.5.11 beats 2026.38.5.6.
- Launch calendar keeps the last ~45 days from Launch Library 2’s previous-launches feed (one extra hourly call). Backfilled Crew-13, Transporter-18 and Falcon Heavy NROL-97; Starlink 15-16 shows as launched; CRS-35 / Starlink 15-25 / SDA T1TL-A stored times match LL2.
- Starship Flight 16 is a December 2026 reported target (NASASpaceflight), labelled as reporting rather than a SpaceX date.
- Roadster “Latest stories” card titles are past-tense. Data-push workflows share a `data-push-main` concurrency group and use `scripts/ci-push-retry.sh`.
- Calendar studio tests pick the next upcoming Starlink instead of flown 15-16. Homepage live.js never remounts the prerendered next-stream card unless something is actually live, and LL2 rows that have already reached NET are dropped so they cannot appear as a “Live now” card.
- Rebased onto main after the headlines refresh. Tesla overview and news studio were rebuilt from that snapshot so 2026.38.5.11 and the updated story titles sit on the latest generated pages.
- Homepage live.js never treats an LL2 launch as the top “Live now” card, so a Go / In Flight Falcon cannot remount into `.hv-live-top` and shift the 320px first screen.
- Rebased onto the 27 Oct daily-refresh prerender. Homepage trackers were rebuilt so 2026.38.5.11 stays on the latest snapshot; a next-stream remount into `.hv-live-top` is hidden on phones unless the card is actually live.
- Rebased onto the later calendar-copy and homepage prerender commits. Calendar studio, its hashed bundle, SpaceX, markets and launch-viewing were rebuilt from main’s data so LL2 Success/In Flight stay `done` and the launch-schedule leftover copy is preserved.
- Stopped the merge-conflict race with hourly data jobs: this PR no longer carries bot-generated HTML/JSON/bundles. Studio ownership `git diff` is PR-skipped; `home-build` / `js-bundle` write those files after merge. News/Starlink/newsletter jobs no longer `git add *.html`.
- Homepage 320px CLS: phone hero stays in document order so `.hv-start` cannot jump from the hero. `.hv-event` keeps a 151px box while live.js drops `data-prebuilt` after hydration. Threshold stays `< 0.1`.

## 27 Oct 2026 — Write articles in Markdown

- New articles can be one file: `content/dispatch/<slug>.md`. `scripts/render-article.py` renders it to the same markup as a hand-written
  page and CI (`home-build.yml`) then runs the usual generators. Refuses DRAFT markers, raw HTML, missing sources or alt text. Guide:
  `docs/writing-articles.md`; tests: `tests/test_render_article.py`. Existing articles are untouched.
- Fixed: `new-article.py` pages inherited the old live X widgets script from the template; it is now stripped.

## 26 Oct 2026 — Migration step 0 and 1 (no live change)

- New `astro/` project: Astro 7 static build that packages the current site for Cloudflare Workers, plus `astro/scripts/parity.mjs`
  (1,868 files byte-identical, 152 sitemap URLs resolve). Headers, 301s for the old stubs and a styled 404 verified with `wrangler dev`.
- GitHub Pages still serves the site. Nothing deleted. See `docs/migration.md`; rollback is deleting `astro/`.

## 26 Oct 2026 — Phone homepage leads with the news

- At 600 px and below the homepage now shows: headline, newsletter sign-up, then the top story (image and headline) in the first
  screen (measured at 390, 430 and 600 px; at 360 and 320 px the headline starts at the fold). Before, the hero copy and the Roadster
  showcase pushed the top story below the second screen. CSS only (`home-studio.css`): visual order changes with `display: contents` and
  `order`, DOM order and the desktop layout are untouched. Lighthouse mobile unchanged (LCP 4.1 s locally, CLS 0).
- Trade-off: the pitch line, the three start links and the Roadster showcase now sit below the stories on phones. To undo, delete the
  `@media (max-width: 600px)` block at the end of `home-studio.css`.

## 26 Oct 2026 — X posts load on request

- All 40 articles with embedded X posts now show the post as readable text (the standard embed blockquote) with a "Load post from X"
  button. `platform.twitter.com` is no longer requested on page load. Adds `x-embed.js` and `x-embed.css`; `tests/x-embed-browser.py`
  and `tests/test_x_embeds.py` guard it. Expected effect on articles: Best Practices up from 58 (third-party cookies, console issues,
  31 KB and 12+ requests gone) and no embed-related layout shift.
- Light-theme contrast sweep over all 82 articles in both themes: captions on dark screenshot panels and inline-dimmed source notes fixed.

## 26 Oct 2026 — Phase 2: Claude Code setup

- Added `CLAUDE.md` (the project brief) and `.claude/`: five subagents, six slash commands, two skills, two rules files, three
  hooks. Details in `docs/claude-code-setup.md`; reasons in `docs/decisions.md`.
- New helpers: `scripts/audit/` (SEO check, axe, Lighthouse, screenshots), `scripts/new-article.py`,
  `scripts/newsletter-draft.py`, `scripts/install-git-hooks.sh`. Tests in `tests/test_claude_setup.py`.
- **Not active yet:** hooks and permission rules are in `.claude/settings.proposed.json` until you rename it to `settings.json`.

## 26 Oct 2026 — P1 round

- **Article CLS 0.11 → 0.** Breadcrumb, "Updated" and disclosure styles moved from the async `related.css` to render-blocking `styles.css`; `styles.css` version bumped. Verified on live with throttled Chrome (before) and locally with `related.css` delayed by 1.5 s (after).
- **Investigated and not changed:**
  - Starship LCP: real paint is about 0.2 s after first paint; Lighthouse's 2 s figure is simulation.
  - Merging blocking CSS: measured slower.
  - The "duplicate" stylesheet links are `<noscript>` fallbacks.
  - The news sitemap window: narrowed on `main` by #205.
- **Merged `main`:** kept #205's robotaxi description repair and homepage red, and reapplied the light-theme contrast fixes on top.

## 26 Oct 2026 — P0 fixes from the audit

- **SEO:** repaired the broken description, `og:description` and `twitter:description` tags on `dispatch/robotaxi-938-f1-cota.html`.
- **SEO:** headlines are no longer cut mid-sentence.
  - `<title>` now ends at a whole clause, keeping the " | Supercharged Daily" suffix only when it fits.
  - `og:title`, `twitter:title` and the NewsArticle `headline` carry the full headline.
  - Affects 78 articles. The new `seo_lib.headline_title` and `seo_lib.social_headline` are covered in `tests/test_seo_audit.py`.
- **Theme:** the site now follows the device's light/dark setting until the reader uses the toggle.
  - Only the toggle saves a choice; the page no longer saves `dark` on every load.
  - Readers who already have a saved theme keep it.
- **Accessibility (WCAG 1.4.3 / 2.5.3):** fixed contrast failures in both themes on 30 scanned pages.
  - Light theme: the FSD Europe and Cybercab homepage cards and the launch compass were unreadable.
  - Dark theme: red text, filled red buttons, and muted labels on Starship and FSD Europe.
  - News image links no longer duplicate the headline link for screen readers.
  - Calendar day buttons now include their visible text in the accessible name.
- Rebuilt the hashed JS bundles (core, news, calendar).

Known leftovers:

- **Roadster / Optimus:** label mismatches on the hotspot and film buttons (2.5.3).
- **Decorative `aria-hidden` text** (FSD country codes, Optimus hero type). axe flags it; WCAG exempts it.
- **Pre-existing failure:** `tests/fsd-global.test.mjs` fails the same way on `main` before these changes.
