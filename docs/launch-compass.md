# Launch viewing: live phone and tablet compass

The main compass on `/see-the-launch.html` previously showed a static north-up pad bearing. Its sensor toggle was hidden inside the optional field dialog. This change makes live heading a prominent part of the page.

## Access

- Hero **Open live compass** action, a **Compass** navigation shortcut and a three-step callout above the planning controls.
- The main compass card comes before the sky illustration on phone and tablet layouts.
- **Start live compass**, **Use my location**, a full-screen view and visible sensor/turn cues.
- The full-screen field view uses the same sensor session and retains its dim red setting.

A visitor selects an observing spot (city, coordinates or explicit device-location request), taps Start and allows the browser's orientation request if shown. Nothing requests motion, heading or geolocation permissions on page load. The top edge of a nearly flat, face-up screen is the pointing reference.

## Heading handling

`launch-viewing-compass.js` isolates the testable heading calculations. iOS uses `webkitCompassHeading`; unanchored relative alpha never becomes a heading. Android absolute orientation uses the orientation rotation matrix. Screen rotation is handled for portrait and landscape, including the legacy iOS `window.orientation` fallback. Circular smoothing takes the shortest arc across north.

Sensor headings are magnetic. The selected observing location and current UTC date feed an offline World Magnetic Model 2025 calculation, giving an approximate true-north heading for comparison with the pad's true bearing. The correction is applied once. Local interference and browser/device differences remain possible, so alignment is labelled approximate.

The vendor is adapted from [`dpyeates/magvar` 2.0.1](https://github.com/dpyeates/magvar/tree/148ee7df62e83210ad824b2652bb89131ceaff81), pinned commit `148ee7df62e83210ad824b2652bb89131ceaff81`, MIT licensed. Changes: standalone UMD wrapper, explicit UTC date input, horizontal field-strength result and model-validity guards. Only WMM2025 coefficients are included. The full MIT notice remains in the source, standalone licence and exported runtime licence string. NOAA/BGS coefficient data are public domain U.S. Government material; no endorsement is implied.

Sources:

- [Apple: magnetic compass heading](https://developer.apple.com/documentation/webkitjs/deviceorientationevent/1804777-webkitcompassheading)
- [MDN: explicit absolute-orientation permission](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static)
- [W3C: Device Orientation and Motion](https://www.w3.org/TR/orientation-event/)
- [NOAA NCEI: World Magnetic Model](https://www.ncei.noaa.gov/products/world-magnetic-model)
- [NOAA WMM2025 standard test values](https://www.ncei.noaa.gov/sites/default/files/2025-02/WMM2025_TEST_VALUES.txt)

The model is valid from 2025 through 2029. Dates outside that interval, invalid coordinates, latitudes above 85° and horizontal field strength below 6,000 nT do not produce a live corrected cue. The static true-north bearing remains available. Future model updates require replacing the coefficients/model and checking new official reference points.

## Lifecycle and fallbacks

`DeviceOrientationEvent.requestPermission(true)` runs directly in the user's tap handler, before unrelated asynchronous work. Pending permission requests are versioned, so resolving one after the page is hidden cannot restart the sensors. Only absolute or WebKit compass events are processed; competing relative events cannot overwrite a valid absolute sample.

The page distinguishes waiting, live, blocked, unsupported, HTTPS required, timeout, hold-flatter, low accuracy, stale, model unavailable and paused states. Negative/non-finite sensor values are rejected. The UI does not claim alignment when reported uncertainty exceeds 25°, the screen is more than 45° from flat or no fresh heading is available.

An initial reading gets ten seconds. A live reading without new data for twenty seconds loses its live label and turn cue. A new valid reading can recover it. Leaving the sky view, closing field view, forgetting the location, hiding the document or leaving the page removes the listeners and resets controls. No sensor session automatically resumes after a hidden tab or reload.

Some phones/tablets lack a usable magnetometer or browser sensor access. Denied or unsupported sensors keep the north-up pad bearing and show practical browser/calibration instructions. This compass points toward the selected pad; it is not live rocket tracking.

## Verification

- `node tests/launch-viewing-compass.test.mjs`: eleven tests, including all twelve official NOAA reference points within 0.03°; iOS, Android, portrait/landscape, relative-event rejection, invalid readings, model expiry, north wrap and turn cues.
- `node tests/launch-viewing.test.mjs`: fourteen existing geometry/source/saved-output tests.
- `python tests/launch-viewing-compass-browser.py`: thirteen grouped scenarios against the built page, synthetic iOS and Android readings, phone/tablet portrait and landscape, permission denial, missing API, timeout, inaccurate/tilted/stale readings, interrupted permission requests, shared modal state and explicit location access.
- `python tests/launch-viewing-browser.py`: twenty-eight existing responsive, location, forecast, source-failure, no-JavaScript and field-view scenarios.

Browser tests simulate sensor events in Chromium. They do not substitute for a physical sensor check. Before relying on the feature at a launch, test an iPhone/Safari, an iPad with compass hardware, and an Android phone/Chrome outside, away from metal. Confirm the direction against the built-in compass set to true north, then rotate between portrait and landscape and test permission denial. No real phone/tablet hardware was attached to this development session.

No paid API, account setup, database change or new service is required. Coordinates stay local for compass correction.
