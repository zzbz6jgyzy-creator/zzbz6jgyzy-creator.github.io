# Supercharged Daily — Tesla, SpaceX & Grok

Tesla, SpaceX and Grok desk from [@ALJR86](https://x.com/ALJR86). News, numbers and launch footage. Not affiliated.

Static site for GitHub Pages.

## Local preview

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Pages

- `index.html` — profile expansion
- `news.html` — today’s Tesla, SpaceX and Grok headlines (live Google News in the browser, plus `news-data.json`)
- `.github/workflows/news-snapshot.yml` — refreshes `news-data.json` on main about twice an hour
- `tsla.html` / `calendar.html` — Markets and the Musk-world calendar
- `games.html` — Games hub (Hot Staging, Catch, Robotaxi Boss) plus the world board
- `board.js` — shared world-board client (`https://aljr-boards.superchargeddaily.workers.dev`)
- `workers/aljr-boards.js` — Cloudflare Worker + KV that stores the top 20 locked runs per game
- `cybercab.html` — Cybercab Tracker (edit `cybercab-data.js` to update)
- `goldcab.html` — redirects to the Games hub
- `poll.js` — weekly TSLA poll on the homepage (Abacus free counter)
- `robotaxi.html` — Robotaxi Boss (Tesla fleet, one week)
- `catch.html` — Catch (Starship chopsticks)
- `staging.html` — Hot Staging (Starship ascent / stage window)
- `tesla.html` / `spacex.html` / `grok.html` — Tesla and SpaceX desks, plus the Grok Bot tutorial (introduction through advanced)
- `fsd-europe.html` — FSD Europe tracker (approved countries in red, TCMV vote math)
- `fsd.html` — wider FSD country list, versions and milestones
- `starship.html` — Starship Mission Control (next launch, objectives, schedule, flight log)
- `updates.html` — Software Update Tracker (searchable releases, models, live map)
- `.github/workflows/updates-snapshot.yml` — refreshes `updates-live.json` on main about twice an hour
- Contact / newsletter: `hello@superchargeddaily.com`
- `tcmv.html` — TCMV meeting log (same data as the FSD Europe tracker)
- `reviews/` — Tesla car reviews (index + Model 3 / Y / S / X / Cybertruck)
- Referral: [ts.la/alex474841](https://ts.la/alex474841)
- `dispatch/` — longer versions of posts, each linked back to X
- `about.html` — who is behind the account
