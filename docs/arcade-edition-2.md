# Arcade edition 02

The games hub and all three games keep the existing site shell, fonts, red identity, game artwork, photo credits and route names. New vector covers are original and require no paid assets.

## Player-facing changes

- Redesigned hub with type filters, dated daily missions, personal bests, a return-to-game link and an explicitly separate original-edition world board.
- Catch and Hot Staging gain forgiving training, six-mission campaigns with saved checkpoints, three-mission daily runs, fixed-step simulation, readable instruments, tactical failure debriefs, medals and non-scoring demonstrations.
- Phone controls support simultaneous pointers, cancellation, keyboard activation, pause/resume and a focus view. Sound begins muted and is opt-in. Decorative flashes and camera shake stop for reduced motion.
- Robotaxi Boss gains visible city deployment, fare policies, daily contracts, three permanent weekly upgrades, a two-day forecast, income history and saved planning/night phases. Battery levels are visible, zone controls have named accessible actions, and saved state is validated before restoration.
- Game pages load the normal site controls without the interruption/popup script; inline newsletter forms and the Subscribe link retain their existing controllers.
- Browser-storage errors fall back to visit-only play with an explicit message. New-edition scores use versioned local records and never post to the original public board. Demonstrations never save a score.

## Rules and persistence

Daily missions use UTC dates, a versioned seed, separate physics randomness and fixed simulation steps. Their links preserve the date. Campaign and training have separate records. Profile records use `sd-arcade-profile-v2`; fleet weeks use mode-specific `sd-arcade-taxi-resume-v2` keys. No login, account data or newsletter signup logic changes.

All flight timings, economics, capacities and mission conditions are fictional arcade rules. They do not represent Tesla economics or SpaceX engineering.

## Validation

Determinism, date validation, bounded saved records, profile merging, forgiving mission parameters and feasible default contracts have unit coverage. Browser journeys cover the hub and all three games at phone/tablet/desktop sizes in dark and light themes, simultaneous/cancelled controls, paused physics, daily resets, demonstrations without scoring, successful staging, a complete fleet week, saved-week restoration and blocked browser storage. Screenshot artifacts accompany CI.

## Later, requiring infrastructure work

A verified global leaderboard needs a versioned server API and server-side run verification. The existing public worker accepts client-supplied scores and cannot prove a run happened. This release preserves its historical records without presenting new local scores as verified world rankings. Deploying a replacement needs the site's Cloudflare configuration; no paid tool is required by the current release.

Cross-device arcade progress would need a deliberate account-data/schema extension. Device-only progress remains the clear default here.
