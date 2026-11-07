# Webcast HUD (SpaceX games)

A launch-stream style overlay for Catch and Hot Staging, and a small version on the Games hub's featured card. It follows the familiar layout of launch webcasts: SPEED and ALTITUDE gauges (bottom left), a T+ clock with a milestone timeline and the mission name (centre), a G-FORCE gauge and an engine ring (bottom right). It is a fan-made look drawn from scratch: no SpaceX logos, fonts or artwork, and every page keeps the "independent of Tesla and SpaceX" line.

## Files
- `webcast-hud.js`: `WebcastHud.create(stageEl, {mission, milestones, speedMax, altMax, gMax})`, then `.update({t, speed, alt, g, engines, milestone, mission, visible})` each frame. It is in the `catch`, `staging` and `games` bundles (`scripts/js-bundles.json`).
- `webcast-hud.css`: always dark (it sits on the canvas in both themes), responsive by container width so it also works in focus view. Linked from `catch.html`, `staging.html`, `games.html`.
- `games-webcast.js`: the decorative hub version (ticking clock, still under reduced motion).

## Where the numbers come from (all simulated)
- **Hot Staging:** altitude is the game's `stack.alt` (km); speed is the km/h figure the game already used (5,120 plus climb time, plus a bump at separation); T+ is the mission clock (T- during the countdown); G rises with the climb and the Max-Q load; milestones are Startup, Liftoff, Max Q, Stage sep, Fairing.
- **Catch:** altitude is the ship's height above the arms, scaled to 72 km at the start of the run; speed is game speed times 55 (km/h); G is 0 in free fall and about 2.2 to 3 under thrust; T+ counts flight time while playing; milestones are Boostback, Entry burn (below 70% of the start altitude), Landing burn (below 30%) and Catch (only on a successful catch).
- The overlay is `aria-hidden`: the screen-reader telemetry stays the existing arcade panel. It is labelled "Simulated telemetry".

## Notes
- Hot Staging's own attitude dial moved above the bar, and its in-canvas velocity readout was removed (the SPEED gauge replaces it).
- `tests/home-studio-browser.py` and `tests/arcade-browser.py` now serve an empty `live-data.json`, so a real launch in progress cannot change their result.
