# Claude Code setup for Supercharged Daily

What lives in `.claude/` and `scripts/`, how to use it from a phone or terminal, and what still needs your approval.
Choices and reasons are in `docs/decisions.md`; tool research is in `docs/research.md`.

## One thing to switch on: `settings.json`

The hooks and the permission rules live in `.claude/settings.json`. The session that built this setup was not allowed to write
that file (it controls its own permissions), so the ready-to-use version is saved as `.claude/settings.proposed.json`.
To activate it, review it and rename it:

```bash
git mv .claude/settings.proposed.json .claude/settings.json && git commit -m "Enable Claude Code hooks and permissions"
```

Until then the agents, commands, skills and rules all work, but the three hooks and the permission allow/deny lists are off.
Optionally run `scripts/install-git-hooks.sh` so the same pre-commit checks also run for commits made outside Claude Code.

## Subagents (`.claude/agents/`)
| Agent | Use it for | Model | Can edit |
|---|---|---|---|
| `designer` | layout, typography, theme, brand consistency; always looks at screenshots | sonnet | yes |
| `frontend` | page templates, tracker UIs, CSS/JS, bundles, Core Web Vitals, WCAG fixes | sonnet | yes |
| `seo` | titles, descriptions, JSON-LD, sitemaps, feeds, Google News readiness | sonnet | yes |
| `reviewer` | cold, strict review of every change; ends `SHIP` or `NO-SHIP` | opus | **no (read-only)** |
| `content-ops` | scaffold an article, draft the Sunday newsletter, run the publishing checklist; drafts only | sonnet | yes |

Ask for one by name ("have the reviewer look at this") or let the description match.

## Slash commands (`.claude/commands/`)
| Command | What it does |
|---|---|
| `/new-article <slug> \| <topic> \| <tag> \| <headline> \| <summary>` | `scripts/new-article.py` clones the live template, adds the story card and `data/articles.json` entry; you add facts and sources; DRAFT markers block publishing |
| `/new-review <model>` | edit `data/reviews-studio.json` and rebuild; never invents a rating |
| `/audit-page <path or URL> [--live] [--quick]` | SEO check + axe (WCAG 2.2 AA, 390/1440, light/dark) + Lighthouse, then a prioritised fix list |
| `/screenshot <path or URL> [--full] [--live]` | 390/768/1440 px in light and dark, then looks at them |
| `/newsletter-draft` | `scripts/newsletter-draft.py`: the week's top stories and sourced tracker changes as Markdown to paste into Beehiiv; never sends |
| `/ship` | tests, builders, audits, `reviewer`, changelog, merge `main`, push, open the PR |
| `/eg-brainstorm` | Elephant/goldfish concept brief from a rough idea (parallel goldfish, then synthesis) |
| `/eg-prd` | Elephant/goldfish PRD: codebase grounding, gap-filling, research, then a durable spec |
| `/eg-fix-bug` | Problem doc → goldfish diagnosis → failing test → fix → `/eg-precommit-review` |
| `/eg-new-feature` | Design doc → three-goldfish check → implement → `/eg-precommit-review` |
| `/eg-precommit-review` | Independent goldfish review of the pending diff before you commit |

Cursor Agent reads the same five flows as skills under `.cursor/skills/eg-*/` (`/eg-brainstorm` and so on in a new Agent chat). Publishing still uses `/new-article`, `/new-review`, `/newsletter-draft` and `/ship`.

## Hooks (`.claude/hooks/`, active once `settings.json` is enabled)
| Hook | When | What |
|---|---|---|
| `pre_commit.py` | before any `git commit` | blocks (exit 2) on: committing to main; secrets in added lines (gitleaks if installed, built-in patterns otherwise; the Supabase publishable key and Cloudflare beacon token are allowed); JSON/JS/Python that does not parse; loose text in an HTML `<head>` (a broken meta tag); `DRAFT` markers in articles; failing unit tests. About 5 seconds. |
| `format.py` | after Edit/Write | prettier on Markdown and short-line CSS/JS/JSON only. Generated and minified files are skipped on purpose. Never blocks. |
| `session_start.py` | session start | prints the branch, how far behind `origin/main` it is, and the reminder to merge before pushing |

`git commit --no-verify` and force-pushes are denied. Type checking and linting are not wired in because the site has no
TypeScript or linter yet; add them to `pre_commit.py` when the migration lands.

## Skills (`.claude/skills/`) and rules (`.claude/rules/`)
- `build-tracker`: the studio pattern (data, model, view, builder, tests, CI, docs) and the honesty rules for sourced data.
- `review-page`: how review pages are built, and why no star rating exists yet.
- `motionsites-web-builder`: vendored MIT core from [Motionsites-AI/claude-skill](https://github.com/Motionsites-AI/claude-skill). Example prompts and media stay © MotionSites and are gitignored — `sh scripts/fetch-motionsites-shelf.sh` pulls them locally. Use it only for a cinematic landing page or hero; self-host media; no Unlimited upsell on site pages.
- `rules/repo-mechanics.md`: generated pages, bots committing every 30 minutes, hashed bundles, shallow-clone date logic.
- `rules/editorial.md`: sourcing, claim types, corrections, disclosure; loads when editing `dispatch/`, `reviews/`, `data/`.

## Audit and helper scripts
```bash
scripts/audit/run.sh /starship.html --quick     # SEO + accessibility, ~20 s; drop --quick to add Lighthouse
scripts/audit/run.sh /dispatch/x.html --live    # the real site (compression and caching included)
node scripts/audit/screenshot.mjs /tmp/x.html /tmp/shots --full
python3 scripts/new-article.py --slug ... --topic ... --tag ... --title ... --summary ... [--dry-run]
python3 scripts/newsletter-draft.py --end 2026-11-01 --write
```
The first audit run installs `playwright-core`, `@axe-core/playwright` and `lighthouse` into `~/.cache/sd-audit` (no browser
download; it uses `CHROMIUM_PATH` or the Chromium under `/opt/pw-browsers`). Local runs serve the repo with third-party
requests blocked, so Lighthouse numbers there are a lower bound; confirm important results with `--live`.

## MCP servers and plugins (recommended, not installed)
Cloud (phone) sessions do not load plugins, so skills are vendored as files. Servers that need OAuth work best as claude.ai
connectors. When the Astro migration starts, add these to a committed `.mcp.json` (pin versions, never `@latest`):
```json
{ "mcpServers": {
  "astro-docs": { "type": "http", "url": "https://mcp.docs.astro.build/mcp" },
  "cloudflare-docs": { "type": "http", "url": "https://docs.mcp.cloudflare.com/mcp" },
  "chrome-devtools": { "type": "stdio", "command": "npx", "args": ["-y", "chrome-devtools-mcp@1.12.0", "--headless", "--isolated"] } } }
```
Supabase: connect the Supabase connector read-only and scoped to this project; the setup denies `execute_sql` and destructive
tools and asks before migrations. The docs servers need the cloud environment's network access set to allow those hosts.
`.cursor/mcp.json` still lists MailerLite although the newsletter is on Beehiiv; it looks stale.

## Suggested additions to CLAUDE.md (your call)
- "Merge `origin/main` before every push; bots rewrite generated pages every 30 minutes."
- "Reviews carry no numeric score by design; never add a rating without my say-so."
- "I publish from my phone: keep updates short and put the result first."
