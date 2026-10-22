# Discussion and tracker refinements

This batch preserves the existing layout, colours, typography and component classes.

## Reader discussions

- Posting a reply reloads its parent thread, reveals the published reply and moves keyboard focus to it. Root comments stay in place, including older loaded discussions.
- Members navigation preserves ordinary site pages and section anchors through the sign-in flow. Article sign-in returns to the discussion. Return paths accept only root-relative static page routes and simple fragments; external URLs, encoded paths, traversal and query strings fall back to the homepage.
- The profile confirmation banner, immediate publication and moderation behaviour are unchanged.

## Software Updates and Cybercab

`scripts/build-tracker-snapshots.mjs` writes the committed source data into the existing HTML mounts. Readers and crawlers can see dated figures, rollout waves, registration changes, city claims and the city table before JavaScript runs. Browser scripts replace these mounts when fresh data loads successfully.

The snapshots retain source links and observation dates. Registration totals, third-party estimates, sightings and service status retain their distinct labels. Missing comparison history is shown as unavailable rather than invented growth. Release cadence is an estimate anchored to the software snapshot date.

Missing, malformed or older build inputs retain the previous valid snapshot. A first build with no valid source shows unavailable copy. Failed browser refreshes retain dated saved content and add a visible status message.

Run both pages with `node scripts/build-tracker-snapshots.mjs`, or select one with `--page updates` / `--page cybercab`. The normal homepage build calls this through `build-noscript.mjs`. The scheduled software and Robotaxi workflows also rebuild and commit their respective HTML, because bot commits do not trigger the separate homepage workflow.

## Verification and limits

- Member return-route checks and browser regressions cover hub navigation, malicious destinations, visible new replies and accessible focus. Browser accounts and writes use mocked provider endpoints.
- Tracker tests exercise changing inputs, missing/older data, HTML escaping, idempotent generation and refresh failures.
- Existing database permission and page injection checks remain in place. CI runs the new regression checks for related changes.

Live Google account sign-in still depends on the configured Google/Supabase services. This batch does not alter database permissions or require SQL, credentials or paid tools. Public data remains a dated snapshot, not live vehicle telemetry. Newsletter integration and changes to editorial modification dates remain separate follow-up work.
