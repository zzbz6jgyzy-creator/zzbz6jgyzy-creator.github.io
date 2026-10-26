---
paths:
  - "dispatch/**"
  - "reviews/**"
  - "data/*.json"
  - "docs/newsletter-drafts/**"
---
# Editorial rules for Supercharged Daily

The brand is that it can be trusted on contested, fast-moving subjects. Hold these without exception.

1. **Name the source in the sentence** ("per SpaceX's 8-K", "Teslascope's sample of 364 cars"). Link primary sources
   (filings, regulator pages, company IR, official posts) before secondary ones. Never cite an outlet you did not open.
2. **Keep claim types apart**: company statement, filing, regulator action, third-party report, our own analysis. A
   company saying "soon" is a claim, not a date.
3. **Never invent** a quote, figure, rating, date, or source. If you can't verify it, leave it out or label it "reported" with
   the outlet. Don't paraphrase a source into something stronger than it said.
4. **Label what a number is**: sample is not rollout; registered is not in service; recognition is not availability; a
   rating is not a measurement; a schedule slide is not a launch time. Give "as of" dates and the unit.
5. **Dates and times**: ISO UTC in data. In prose give the day and the zone for times readers care about.
6. **Corrections are visible.** If a published fact changes, update `dateModified`, say what changed on the page, and never
   silently rewrite. Don't set an "Updated" date for a feed refresh or a cosmetic edit.
7. **Disclosure**: the editor holds Tesla and SpaceX shares; finance pieces carry the disclosure (build-articles.py adds it).
   Affiliate and referral links carry `rel="sponsored"` and a visible note next to them.
8. **Images** are ours, official/press-use, or credited with licence; alt text describes the image. No fake or implied-real
   renders without saying they are illustrations.
9. **Tone**: plain, specific, confident without hype. The headline states the news. No clickbait, no numbered filler.
