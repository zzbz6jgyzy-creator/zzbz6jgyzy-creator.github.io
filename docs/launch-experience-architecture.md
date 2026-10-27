# Launch viewing experience

## Audit and direction

The existing tool combines useful pad geometry, an on-device compass, local city search, source-aware launch dates and optional NWS forecasts. The main opportunity is to make that capability understandable before asking someone to work through a long stack of instruments.

The compass is a defining feature, but previously sat after setup, a large globe, metrics and a verdict. On phones, those sections separate the initial promise from the tool people want outdoors. Multiple large cards also give equal emphasis to the actual pad bearing and an adjustable, hypothetical ascent point.

The design should lead with a compact mission briefing: the selected launch, its timing status, observing place and direction. The primary journey is **choose a location → choose a mission → face the pad**. Advanced geometry, weather checks, practical guidance and the explanation of the model remain readily available without competing with that journey.

The original `observatory-hero.svg` is decorative vector artwork, not a map, flight prediction or live feed. It contains no numeric data, location labels or claimed trajectory. It adds an Earth-limb and launch motif without a video download, external embed or replacement brand identity.

## Architecture to preserve

- A single selected launch and observing location should drive the mission summary, compass, globe, sky illustration and viewing brief. Changing either must invalidate weather results for the prior selection.
- Retain the isolated compass mathematics and existing permission, calibration, tilt, stale-reading, screen-orientation and true-north handling. The compass points at a real pad bearing; it does not track a rocket.
- Keep a useful static page when JavaScript, sensors, storage or fresh data are unavailable. An example observing location must remain visibly distinct from a visitor's own location.
- Keep actual source timestamps and date precision. A day-only target has no invented launch clock, local daylight assessment or launch-hour forecast.
- Prefer location and sensor requests after explicit user actions. Searching the bundled city list does not need to send a query to a geocoder.

## Data boundaries

Great-circle distance and the initial bearing are derived from the observing coordinates and pad. The globe's shaded footprint and sky point come from an illustrative altitude/downrange scenario along a typical heading. They are not a mission trajectory or a probability of seeing the launch. Do not combine these into a fabricated visibility percentage or an unconditional yes/no result.

Actual viewing also depends on flight path, stage events, brightness, terrain, obstructions, haze and cloud along the line of sight. Solar geometry can describe daylight and a potentially sunlit high-altitude point; it cannot establish visible plume brightness. NWS forecasts are useful only within their coverage and matching forecast intervals. Missing forecasts are unknown conditions, not clear skies.

Source freshness and a launch countdown describe a published target. They do not confirm that a vehicle will lift off at that instant. Keep the official-source route next to the selected mission and in the field briefing.

## Sharing and continuity

An audit found that the existing “Share this view” link preserved the launch and optional approximate location but omitted altitude, downrange distance, horizon and units. Recipients could therefore see a different scenario. Shared views should preserve validated, bounded scenario settings and distinguish those settings from optional location sharing. Include only rounded coordinates after an explicit choice; never assume that sharing the selected launch grants permission to share a precise location.

Section navigation should preserve useful deep links and keyboard access. Compass shortcuts must open the correct panel before moving focus. Reduced-motion visitors should get immediate, stable navigation rather than animated travel through the page.
