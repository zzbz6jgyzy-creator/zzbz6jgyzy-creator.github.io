# Sunday newsletter experience

The dedicated `/newsletter.html` page introduces the free Sunday edition, the editor, an explicitly illustrative preview, a real issue, FAQs and two native signup forms. It uses the existing brand assets, fonts and colours. It is listed in site search and the sitemap. Existing inline article, tracker and homepage forms are retained; a Newsletter footer link makes the preview discoverable across the site.

## Signup and measurement

The public site does **not** create a Beehiiv subscription directly. Valid forms redirect to the existing Beehiiv publication with the email and allowlisted UTM attribution. Beehiiv owns the remaining signup/confirmation steps. No subscriber flag is written, so an abandoned signup remains retryable. Newsletter signup and website membership remain separate.

The existing anonymous `signup_submit` counter now fires from the validated handoff, rather than from any nonempty form submit. Honeypots and invalid addresses do not count. Only the event name and page pathname are sent to the existing counter; email is never sent to analytics or stored by this flow. The Counts page calls these **handoffs**, not confirmed subscribers. Historical pre-change totals were form submits and cannot be corrected retroactively. No-JavaScript native signups are not counted by the browser event counter.

Beehiiv receives `utm_source=website`, page-path `utm_campaign`, allowlisted topic `utm_content` and placement `utm_medium`. The landing page uses `site-newsletter-hero` and `site-newsletter-footer`; existing placements keep their existing names. These are attribution hints, not a promise of automatic segmentation. Use Beehiiv's actual subscriber records/source reports to assess completed subscriptions. No new analytics worker deployment is required.

## Reliability

Storage reads/writes in grow.js are guarded. Popup forms added after load bind through one MutationObserver, with dataset guards against duplicate listeners. Navigation rewires Subscribe after creating desktop/mobile links. Reduced-motion visitors get an immediate scroll. Latest-issue links read only a validated slug from the existing public metadata and retain static links on failure.

## Human follow-up in Beehiiv

This PR does not change Beehiiv account settings or send email. Confirm that the current public signup completes as intended and that actual subscriber source reporting retains the UTM values. Set up a welcome email in Beehiiv's available settings. If a multi-email automation requires an upgrade, keep a single welcome email instead of purchasing a plan.

Suggested welcome email:

> Subject: Welcome to Supercharged Daily
>
> Thanks for joining. I'm Alex, and I run Supercharged Daily from Ireland. Each Sunday, I bring together the week in Tesla, SpaceX and xAI, including Grok, with context and links to go deeper.
>
> While you wait for the next edition: read the latest issue, build your personal Daily at https://superchargeddaily.com/daily.html, or explore the explainers at https://superchargeddaily.com/explainers.html.
>
> You can unsubscribe using the link below any newsletter. Thanks for reading — Alex.

Use Beehiiv's required footer, unsubscribe link and actual sender settings. The page's existing-subscriber FAQ provides the same onward routes without relying on an email automation.

## Verification

Node tests cover validation, abandoned-signup retries, placement attribution, honeypots and handoff counts. Browser tests intercept all external navigation and counter requests, exercise both forms with/without JavaScript, blocked storage, late-added forms, safe issue fallbacks, mobile/desktop Subscribe focus, keyboard FAQ use, and ten width/theme combinations. Test runs create no subscribers or live analytics events.

## Provider handoff troubleshooting

If a visitor returns without completing signup, both forms remain available. They can try again or open the public Beehiiv publication directly. A site handoff counter cannot determine why a provider signup was abandoned; review actual Beehiiv subscriber records before drawing a conversion conclusion.
