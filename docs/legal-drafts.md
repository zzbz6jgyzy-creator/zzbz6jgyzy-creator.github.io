# Legal page drafts (privacy, cookies, terms)

`/privacy.html`, `/cookies.html` and `/terms.html` are built by `scripts/build-trust-pages.py` with a **DRAFT – review before publishing** banner and `noindex`. When you approve a page, delete `DRAFT_NOTE` from it, set `"draft": False`, and run `python3 scripts/build-trust-pages.py`. The footer row (Privacy · Cookies · Terms) comes from `scripts/footer.json` → `python3 scripts/sync-footer.py`.

## What the drafts are based on (found in the code)
- **Newsletter:** forms post to Beehiiv (`alexs-newsletter-84b17e.beehiiv.com`).
- **Members:** Google sign-in through Supabase (`members.js`, `signInWithOAuth` provider `google`); session in localStorage.
- **Analytics:** Cloudflare Web Analytics beacon on every page (cookieless). Own counter `workers/sd-events`: per-day counts by event name and page path, "no cookies, no IPs, no user IDs" (its own header comment).
- **No first-party cookies:** no `document.cookie` writes in site code. localStorage keys include theme (`sd-theme`), saved views, game and Earth explorer settings, members return path.
- **Third parties loaded with the page:** X embed script `platform.twitter.com/widgets.js`: Dispatch articles with X posts load it when a post scrolls near the reader, or on the "Load post from X" button where Save-Data is on (`x-embed.js`; changed 11 Nov 2026 at the owner's request); six articles loaded it on page load with no post in them, removed 9 Nov 2026. The homepage/Starship live card loads it while an X livestream is the live event; YouTube iframes (mostly `youtube-nocookie.com`, a few `youtube.com`); TradingView iframe (markets); jsDelivr scripts on 3 Dispatch pages.
- **Money:** Tesla referral `ts.la/alex474841` (marked sponsored), Buy Me a Coffee.

## ⚠ Flag: consent
The site's own code sets no non-essential cookies, so I did **not** add a banner. Correction (9 Nov 2026): the earlier note here said X's script loads automatically on 96 pages. That count included pages where it only loads after a click. The real number was six articles with no X post in them, and the script has been removed from those. What still loads X without a click: the homepage and Starship live card, while an X livestream is the live event. YouTube and TradingView (updated 9 Nov 2026): article videos are now tap-to-play, showing our own image and loading YouTube's no-cookie player only after a tap; the TSLA chart loads TradingView only after a tap. What still loads without a tap: the live-stream player during a live event (youtube-nocookie.com, muted) and the X livestream card. Ask your adviser whether those two need a consent prompt.

## Could not determine (marked "To confirm" in the drafts)
1. Which member data Supabase stores beyond the Google profile, and retention.
2. Retention for newsletter subscribers and emails.
3. Cloudflare logging and whether a bot-protection cookie (`__cf_bm`) is set on your plan/settings.
4. Governing law (drafted as Ireland).
5. Whether any other analytics or ad tools are configured outside the repo (Beehiiv tracking pixels in the newsletter itself, Cloudflare Zaraz, etc.).
6. Whether Buy Me a Coffee supporters get anything (members perks) that the terms should mention.
