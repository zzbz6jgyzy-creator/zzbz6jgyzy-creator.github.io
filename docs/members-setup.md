# Supercharged Daily members and discussions

This feature adds Google sign-in, public display names, immediate article comments and replies, article/comment thumbs-up, reporting, and owner moderation. It preserves the existing GitHub Pages site and design. Joining does not subscribe anyone to the newsletter.

## Status and activation

`members-config.json` contains the project's public URL and publishable key. `enabled` stays `false` until the database migration, Google provider, redirects, and real sign-in smoke test are complete. With it off, existing pages show no member controls and the Members page says sign-in opens soon. No production comments, votes, users or SQL were created by the implementation tests.

The publishable key is intentionally public. Never place a Supabase secret key, service-role key, database password, Google client secret or user access token in GitHub or chat. These are not needed in this browser integration.

### 1. Install the database

In the Supabase project **SQL Editor**, create a query and run the complete contents of:

`supabase/migrations/202610220001_members.sql`

Run this initial migration once, in the intended new project. It is wrapped in a transaction and creates only the `sd_private` schema and the named `sd_*` public RPC functions. The schema's application tables have RLS enabled and no direct anonymous/authenticated access. The read RPC returns bounded public discussion data. Write RPCs validate the signed-in account, permissions, inputs and per-member limits.

Do not expose `sd_private` through the Data API. The default `public` API schema is sufficient. The migration asks PostgREST to refresh its schema cache.

### 2. Configure the website redirects

In Supabase **Authentication → URL Configuration**:

- Site URL: `https://superchargeddaily.com`
- Additional Redirect URL: `https://superchargeddaily.com/members.html`

Use exact production URLs. If testing a private local preview, temporarily allow only that exact callback URL as well and remove it afterward. The client uses the Supabase SDK's PKCE flow and accepts only local homepage/member/Dispatch return paths. It never redirects a reader to a supplied external URL.

### 3. Enable Google

Create an OAuth client in a Google Cloud project you control, following [Supabase's Google setup guide](https://supabase.com/docs/guides/auth/social-login/auth-google).

- Configure the Google Auth Platform branding and audience for Supercharged Daily.
- Website homepage: `https://superchargeddaily.com`
- Privacy policy: `https://superchargeddaily.com/community.html#privacy`
- Authorized JavaScript origin: `https://superchargeddaily.com`
- Authorized redirect URI: `https://luidcuzdrcvmzdxpiiwf.supabase.co/auth/v1/callback`
- Use basic identity scopes (`openid`, email and profile); no Google mailbox, contacts or other account access is needed.

Enter the Google Client ID and Client Secret directly into Supabase **Authentication → Sign In / Providers → Google**, enable it and save. Keep the secret in those dashboards. Google's Testing audience restricts sign-in to listed test users; make the audience available to your intended readers before public launch. Google may require branding/domain verification.

The Supabase provider callback and the website return URL serve different parts of the flow; configure both exactly as above. Google sign-in avoids public email/password verification delivery setup for this first version.

### 4. Make the editor account a moderator

First sign in with the Google account that will moderate the site and save a display name, agreeing to the community rules. During an initial pilot, set `articles` in the public configuration to `["/dispatch/tesla-ai-maps-v15.html"]` and enable the configuration only when steps 1–3 work.

In Supabase Authentication → Users, identify your own account UUID. In SQL Editor, replace the example UUID below with that exact UUID:

```sql
update sd_private.members
set moderator = true
where id = 'YOUR-OWN-AUTH-USER-UUID'::uuid;
```

Refresh `/members.html`. It will show **Editor moderation**, with **Recent comments** and **Reported comments**. No reader-controlled name, Google profile metadata or request parameter can grant this role.

Moderators can remove comments or block an account. Blocking stops commenting, reporting and reactions, removes that account's comment bodies, and removes its reactions. An editor account cannot be blocked through the member API. To reverse an accidental block, the project owner can update `blocked=false` for the verified member UUID in SQL Editor.

### 5. Pilot, then enable all Dispatch articles

Check with two real Google accounts:

1. Sign in/out, choose a display name and return to the original article.
2. Post a comment and a reply. Both must appear immediately for another reader without owner approval.
3. Add/remove article and comment thumbs-up; retries must not create duplicate votes.
4. Report a comment with the second account and inspect the owner's reported queue.
5. Remove a comment, check its placeholder/replies, and test a block using a test member account.
6. Check a signed-out reader on mobile and desktop.

Then set `articles` to `"all"` and `enabled` to `true` in `members-config.json`. Disabling the flag again hides the feature without deleting any accounts or discussion data. Public configuration uses `cache: no-cache`; normal hosting/CDN cache behavior still applies to responses.

The module initially loads the discussion near the end of an article. The pinned, self-hosted Supabase SDK is fetched only for member accounts and articles when their discussion is near the viewport. Ordinary hub pages get the small navigation link without loading the SDK.

## Day-to-day moderation

Comments publish immediately. There is no approval queue. The account page shows the 50 most recent published comments, with a reported view for reader flags. Editors can also remove or block from an individual article's comment controls, including older discussions. Deleting an own comment or removing it as editor clears its body and leaves a placeholder where necessary for replies. Reports are private to moderators; author emails and voter lists are not returned in public discussion data.

The first version uses one reply level, 20 initial root comments, paginated replies, and keyset pagination. It deliberately uses plain text for user content rather than accepting HTML. Public display names are unique without regard to case. Rate limits are enforced in the database under a per-member row lock: one comment every 20 seconds, up to 30/day; up to 200 reaction changes/day with a 500ms gap; up to 10 reports/day. Posting retries use a UUID nonce and reaction writes specify the desired state rather than flipping it blindly.

A blocked member can still read public articles and remove their own remaining comment records. To handle account deletion requests, verify the requester, remove their comment bodies, then delete the account in Supabase Authentication → Users. The foreign keys remove the member profile, reactions and reports and retain anonymized reply placeholders. Review the community/privacy text as the site owner before launch; it describes the implemented data flow without claiming a retention period or legal certification.

## Builds and coverage

`scripts/inject-members.py` adds a standalone stylesheet and module once per public HTML page with the site's navigation and main content. The bundle injector and SEO generation pass call it, so future and existing pages receive it during the normal build. This PR includes a homepage, About and one article example plus the new account/policy pages; the production full-repository build updates the remaining pages. The normal shared JS bundles are unaffected.

No paid tool is required for the code. Supabase free-tier quotas, project inactivity pausing and Google account/provider availability still apply. There is no password or email sender dependency in the Google-only first version. Backups/export and usage monitoring remain project-owner operations.

## Verification

- `node tests/members-db.mjs`: runs the real migration in PGlite PostgreSQL with Supabase-style auth roles; tests direct-access denial, verified-user requirements, immediate publication, owner permissions, vote uniqueness/idempotency, post retry safety, rate limits, reply validation, reports, blocks, deletion and pagination.
- `python tests/members-browser.py`: runs the actual vendored SDK in Chromium with mocked provider endpoints; tests mobile/desktop account/discussion flows, Google PKCE request parameters, XSS-safe text rendering, failed-post text preservation, nonce reuse, immediate comments/replies, thumbs-up, reporting, owner controls and disabled configuration. It never writes to the live Supabase project.
- `python scripts/inject-members.py --check`: checks module coverage/idempotency. Integration checks also cover every captured sitemap page and a newly created article fixture.

Database test dependency: `@electric-sql/pglite@0.5.11`. Browser tests need Python Playwright and Chromium. The runtime vendor is `@supabase/supabase-js@2.118.0`, bundled for the browser with esbuild 0.25.12; the MIT license is included. `scripts/build-members-vendor.mjs` documents a reproducible rebuild. Live Google sign-in and hosted PostgREST behavior require the owner-controlled setup and smoke test above.

The Member permissions and integration checks workflow runs the SQL, injector and syntax tests for related pull requests and pushes. Browser flows are verified separately with mocked provider APIs.
