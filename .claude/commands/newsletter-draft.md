---
description: Draft the Sunday newsletter from the week's top stories and tracker changes (Markdown for Beehiiv; never sends)
argument-hint: "[--end YYYY-MM-DD] [--days 7] [--top 5]"
allowed-tools: Read, Edit, Write, Bash(python3 scripts/newsletter-draft.py*), Bash(git log*), Bash(git status*)
---
Draft the Sunday newsletter. Options: $ARGUMENTS

1. Run `python3 scripts/newsletter-draft.py --write $ARGUMENTS`. It reads `data/articles.json` and
   `data/intelligence/changes.json`, ranks the week's stories (pinned, then longest read), adds tracker changes that carry a
   source, tags every link with UTM parameters, and saves `docs/newsletter-drafts/<date>.md`.
2. Open the draft and fill every `DRAFT` marker: a 2-3 sentence intro in the owner's voice (ask for the angle), one line on
   why each story matters, and "Coming up" using only confirmed dates from `/calendar.html` and `data/calendar-studio.json`.
   Keep the site's own wording for facts; do not add claims that are not in the linked stories.
3. Drop weak stories rather than padding. Check that no story is repeated and every link resolves to a real page.
4. Remove all `DRAFT` markers. Show the owner the final Markdown.
5. Do not send or schedule anything and do not touch Beehiiv; the owner pastes it into Beehiiv (the current plan has no
   draft API). Do not commit the draft unless asked.
