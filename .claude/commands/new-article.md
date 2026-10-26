---
description: Scaffold a Dispatch article (page, story card, articles.json entry) and help write it to the editorial rules
argument-hint: "<slug> | <topic: tesla|spacex|xai> | <tag> | <headline> | <one-line summary>"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(python3 scripts/render-article.py*), Bash(python3 scripts/new-article.py*), Bash(python3 scripts/audit/*), Bash(node scripts/audit/*)
---
Create a new Dispatch story from: $ARGUMENTS

If any of slug, topic, tag, headline or summary is missing, ask once for just what is missing. Use the headline exactly as
the owner gives it; do not "improve" it.

1. Create `content/dispatch/<slug>.md` with the front matter from `docs/writing-articles.md` (title exactly as given, summary,
   topic, tag, optional image and imageAlt). Do not hand-write HTML.
2. Ask the owner for the facts and the sources (links). Write the body in Markdown: what happened, what is confirmed and by
   whom, what is not, and the sources. Follow `.claude/rules/editorial.md`. Never invent a quote, number or date; if a fact has
   no source, leave it out or label it reported.
3. Run `python3 scripts/render-article.py <slug>` (it refuses DRAFT markers, raw HTML and missing sources or alt text), then
   `python3 scripts/audit/seo_check.py dispatch/<slug>.html` and
   `node scripts/audit/axe.mjs /dispatch/<slug>.html`, and fix what they report.
4. Take screenshots (`/screenshot /dispatch/<slug>.html`) and look at the 390 px dark and light ones.
5. Do not commit or push. Tell the owner what is ready, what is unverified, and suggest `/ship`.
