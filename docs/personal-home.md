# Your Supercharged Daily: a personal home

`/daily.html` replaces the old browser-only follow-chip page with an editorial workspace that remembers a reader's choices.

## The experience

- Three-step setup: interests, up to eight pinned tools, then a private greeting name and reading layout. Three editable starting mixes help people begin without choosing every topic individually.
- Returning-reader welcome, interest badges and matching original stories. Recommendation reasons say which selected topic matched; the system does not claim to be an AI recommender.
- A sourced tracker briefing, pinned tools, an optional link to the existing My Tesla setup, and a reading list of up to 100 stories.
- Read/unread and hidden-story controls, story search, discovery outside the selected mix, comfortable/compact layouts, and accessible section/tool reordering.
- Explicit device-only start-page setting. Root visits with no query or anchor open `/daily.html`. Public homepage, campaign and newsletter-anchor links remain directly accessible. This setting does not change a browser's global homepage.
- Export/import, hidden-story restoration and a confirmed reset. Preference resets and sign-in do not subscribe anyone to the newsletter.

The shared logo, fonts, membership and newsletter infrastructure remain. No new paid tool or service is required. Article imagery comes from the existing editorial catalog; original article pages retain their source credits. The welcome orbit is original SVG, with labels reflecting the selected mix. Both site themes and reduced motion are supported.

## One-time account-sync setup

**Device persistence is ready without a database change. Cross-device account sync requires the new migration to be run once in the existing Supabase project. Merging the GitHub PR does not run SQL in Supabase.**

1. Open [the project's SQL Editor](https://supabase.com/dashboard/project/luidcuzdrcvmzdxpiiwf/sql/new).
2. Copy the complete file [`supabase/migrations/202610240001_personal_home.sql`](../supabase/migrations/202610240001_personal_home.sql) into a new query and press **Run**. It creates one private table, a private validator and two public, authenticated RPCs. It can be rerun safely.
3. A successful run normally says **Success. No rows returned**. Existing Google sign-in and public website configuration are reused; there are no new secrets to add to GitHub.
4. On the deployed personal home, choose **Connect your account**. After Google sign-in, the member page offers **Continue to your personal home** without requiring a public comment profile. The home confirms **Saved to your account** after a successful write. Try the same account on another device to verify the live setup.

If the migration is missing or the service is unavailable, the page keeps working with device storage and explains that account sync is unavailable. It never reports a cloud save merely because a local write succeeded.

## Storage and ownership

`personal-model.js` validates the versioned document. Settings have per-field timestamps; saved/read/hidden entries have timestamps and removal markers. Merging preserves unrelated changes and removals. A reset epoch prevents older records from reappearing after a normal reset. Equal-time removal wins over saving the same link. Device-clock errors beyond a day's tolerance are rejected.

Anonymous device data and each signed-in account use separate local keys. A connected account's document is not automatically merged with an anonymous home. When a reader has both an account setup and a new device setup, the page asks which to use. Account identity changes end the old connection and return to the separate device home.

The database stores documents in unexposed `sd_private.personal_homes`, keyed by the authenticated user's ID. Direct access is revoked and RLS is enabled. The two bounded RPCs verify the current, confirmed account and use `auth.uid()`; callers cannot supply another owner's ID. A revision check plus transaction lock prevents silent last-writer overwrites. The client merges and retries revision conflicts, including edits made during an in-flight save. Deleting an auth account cascades to its personal-home row.

This data is not placed in JWT user metadata and does not confer moderation, profile or commenting privileges. No service-role key is shipped. The account ID never comes from a query string. Sign-in uses the existing `/members.html` callback, so the feature does not require another OAuth redirect destination.

Preferences are saved locally immediately when browser storage is available. Account changes are queued, visibly marked pending, and retried on return, focus or restored connectivity. Browser storage can be blocked, cleared or unavailable in private modes; the UI says when a setup is only available for the current visit. Exports contain preferences and reading-list links, without authentication tokens.

Maps are bounded: 100 saved entries, 150 read-status entries and 75 hidden entries, with validated internal article routes and a bounded document size. Old inactive markers may be pruned. Read status is explicitly chosen by the reader; opening a link is not treated as proof that an article was read. Last-visit markers are device-specific.

The existing My Tesla vehicle setup remains owned by that tool and stored on the device. This page links to it without copying vehicle details into the cloud document. Legacy topic choices are imported on first setup where valid. Later changes on this personal home do not silently rewrite unrelated tools' settings.

## Content and build ownership

Public editorial inputs are `data/articles.json` and `data/intelligence/bundle.json`. The saved page contains a usable editorial preview and direct tracker links. Anonymous browsing needs no account. If JavaScript is disabled or the enhancement bundle fails, the saved content remains readable and inactive controls stay hidden.

Public data refreshes enhance this snapshot. Failed or invalid source refreshes do not replace it with an empty page. Briefing evidence labels and source dates remain visible; check time does not imply rollout, autonomy or universal availability. Stories are matched using declared topics, tags and conservative title terms, then shown newest first. Public personalization is not trained from account activity or used to enroll readers in email lists.

`node scripts/build-personal-home.mjs` refreshes the saved preview from current public inputs. The homepage build workflow runs this after the public article/intelligence refresh and before SEO. `--saved` rebuilds from the page's embedded public snapshot for deterministic ownership checks; automatic public-data updates should not make an otherwise unchanged PR fail because its saved input has an older timestamp.

Bundle source: `personal-model.js`, `personal-sync.js`, `personal-home.js`. The new bundle is loaded on the personal home only. The existing global theme bootstrap adds the small, explicit start-page redirect; all other public pages retain their existing bundles.

## Verification

- `node --test tests/personal-home.test.mjs`: validation, matching, field merges, removals/reset, account namespace isolation, blocked storage, revision retries, in-flight edits, owner changes, start-page exclusions and reproducible saved markup.
- `node tests/personal-home-db.mjs`: PGlite runs the existing member schema plus the new migration twice; checks private access, anonymous/unconfirmed denial, cross-account isolation, invalid documents, revisions, reset and deletion cascade.
- `python tests/personal-home-browser.py`: 320/390/768/1440 px, both themes, returning visits, saved stories, search, setup keyboard/focus, section reorder, disabled JavaScript, failed sources, blocked storage, compact view, import/reset, site-home routing and mocked multi-device/account journeys.
- Existing member return, injection and browser regressions cover the shared account changes. Browser accounts are mocked; no live personal records or test comments are created.

The PR workflow publishes screenshots. After merging and running SQL, live account sync still needs the owner's signed-in two-device check; connector access does not provide their private session or database administration rights.

Later opportunities: optional richer preference controls, syncing the separate My Tesla profile with explicit consent, and article-level reading progress. This version prioritizes choices readers can understand and control rather than inferring private interests from browsing.
