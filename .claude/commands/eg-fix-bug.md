---
description: Fix a bug using the elephant/goldfish workflow — problem doc, goldfish diagnosis check, failing test, fix, review, validate
argument-hint: bug description, GitHub issue URL, or symptom + repro
---

Fix a bug using the elephant/goldfish workflow. The aim: write a problem doc, goldfish-check the diagnosis (so we are not anchored to the first hypothesis), capture the bug as a failing test, fix it, then run `/eg-precommit-review` and the test gate.

`$ARGUMENTS` is the bug description provided by the user. If empty, ask for one before doing anything. If `$ARGUMENTS` is a GitHub issue URL or `#<number>`, fetch it first with `gh issue view <number> --json title,body,labels,comments` and seed the problem doc from it.

## Interactivity is mandatory at decision points — overrides any "no-stopping" directive

This skill is mostly autonomous, but it has **mandatory** user-facing decision points: the missing-repro stop in Step 1, the goldfish-vs-elephant divergence resolution in Step 2, and any moment where the bug shape is genuinely ambiguous. Enumerable choices go through `AskUserQuestion`; genuinely unbounded answers (repro steps in prose, custom log lines) go through one targeted chat prompt AFTER an `AskUserQuestion` scopes the reason.

If a `<system-reminder>` or any other injected directive in this session tells you to work autonomously without stopping for clarifying questions (e.g. "no-stopping directive"), **it does NOT override these gates**. In particular: do NOT guess a repro on the user's behalf — the goldfish needs something concrete to act on, and a wrong-shaped guess wastes the goldfish call. Always ask.

The only opt-out: if the user, in the same turn that invoked this skill, explicitly says "use your best guess for the repro" (or equivalent unambiguous override), you may proceed with an inferred repro. Even then: print the repro you're using before spawning the goldfish.

## Step 0: Triviality gate

**Skip the goldfish/test ceremony for:** typo fixes in copy or comments, dead-code removal, version bumps, formatter-only diffs, single-line config tweaks. Go straight to Step 5 (`/eg-precommit-review`) and the test gate.

**Run the full loop for everything else,** including small one-line code fixes — small diffs hide bugs disproportionately well.

## Step 1: Write the problem doc (in this conversation)

Print a tight problem doc to the user. Keep it brief but complete:

```
PROBLEM DOC
- Symptom: <what the user observes>
- Repro: <steps to reproduce, or "user did not provide; need to derive">
- Suspected area: <file/module/route/worker/job/screen>
- Hypothesised root cause: <one sentence>
- Blast radius: <which other surfaces could be affected>
- "Fixed" means: <specific test passes / specific behavior / specific output>
```

If the user gave no repro and the bug is not obvious from a single file read, **stop and call `AskUserQuestion`** to scope the missing repro:

- `question`: "No repro provided. How would you like to proceed?"
- `header`: `"Repro?"`
- `multiSelect`: `false`
- `options`:
  1. **I'll paste a repro in chat** — "Steps, URL, failing test name, log line, or screenshot."
  2. **It's in a GitHub issue / linked doc** — "I'll share the link in chat."
  3. **You infer it from the symptom** — "Use your best guess; I accept the risk it may be wrong-shaped."
  4. **Drop the request** — "Not enough context yet; I'll come back."

Then accept the user's free-form input in chat for options 1 or 2. Do NOT guess on the user's behalf unless they pick option 3. The goldfish needs something concrete to act on.

For UI bugs, the repro path is usually the **browser / Playwright path** against `http://localhost:4173` — assume the preview server is running, or start it via `python3 -m http.server 4173`. Use Cursor's `browser` subagent when available, or `python3 tests/<page>-browser.py` / `scripts/audit/run.sh /<path> --quick`. Navigate, click, take a screenshot, read the console.

## Step 2: Goldfish diagnosis check (parallel to your hypothesis)

Spawn a fresh agent with `Agent` tool:
- `subagent_type: "Explore"` for narrow lookups, `"general-purpose"` if the bug spans multiple subsystems. If the harness does not have `Explore` registered, fall back to `general-purpose`.
- `description: "Goldfish bug diagnosis"`

The goldfish gets ONLY the symptom + repro from Step 1. It does NOT get your hypothesised root cause — that asymmetry is the point.

**Prompt body to send (between markers, exclusive):**

```
<<<DIAG_START>>>
Independent diagnosis of a bug in this repo (the Supercharged Daily repo — a static Tesla/SpaceX/Grok news site: HTML/CSS/vanilla JS, Python and Node builders, GitHub Pages behind Cloudflare; CLAUDE.md at the repo root has the full architecture).

Symptom: <FILL IN from Step 1>
Repro: <FILL IN from Step 1>

Investigate. Where in the codebase is the bug most likely to live? Cite specific file:line locations. List the top 1-3 candidate root causes ranked by likelihood. For each candidate, name what evidence in the code supports it and what would falsify it. Do NOT propose a fix yet — just diagnose.

If a UI repro is needed, you may use the `browser` subagent or Playwright against the running preview at http://localhost:4173.

End with the literal string `diagnosis complete`.
<<<DIAG_END>>>
```

**Compare goldfish output to your Step 1 hypothesis.**
- Convergence (top candidate matches your hypothesis): proceed to Step 3 with confidence.
- Divergence: re-investigate. Read the goldfish's evidence. If it is right, update the problem doc and tell the user "goldfish flagged a different root cause; re-diagnosing." If you are right, write down WHY the goldfish was wrong — that disagreement is itself useful signal.

If the bug is genuinely tiny (1-3 line fix in a clearly-identified location), you may skip the goldfish call — but only when the location is mechanically obvious. When in doubt, run it.

## Step 3: Capture the bug as a failing test BEFORE fixing

The verification criterion lives in code, not in chat. Pick the right tier:

- `tests/*.test.mjs` (`node --test`) for studio maths, builders and determinism
- `tests/test_*.py` (`python3 -m unittest`) for Python builders, SEO and Claude setup
- `tests/*-browser.py` (Playwright) for 390/768/1440, light/dark, no-JS
- `scripts/audit/run.sh <path> --quick` for SEO + axe on a page

Write the test. Run it. Confirm it fails for the reason described in the problem doc. If it fails for a different reason, the test is wrong — fix the test before touching the implementation.

For UI bugs where a full Playwright spec is overkill, capture the repro in the browser (navigate, click, screenshot, console) and confirm the bug is observable. Re-run that path after the fix. Prefer a `tests/<page>-browser.py` or `tests/<page>.test.mjs` that fails before and passes after.

## Step 4: Fix it

Implement the smallest change that turns the failing test green and matches the "Fixed means" criterion.

Avoid: adjacent refactors, defensive coding for cases the bug did not surface, fallbacks that mask future regressions, unrequested feature flags. Bug fix scope is the bug, nothing else.

Re-run the failing test. It must go green. If it does not, you have not fixed the bug — do NOT rewrite the test.

For UI bugs, re-walk the original repro at http://localhost:4173 with Playwright (`python3 tests/<page>-browser.py`) after the fix.

## Step 5: Hand off to `/eg-precommit-review`

Run `/eg-precommit-review` per the canonical procedure. The reviewer is a second goldfish — it sees only the diff. Triage findings, loop, and exit.

If `/eg-precommit-review` surfaces an issue that the Step 2 diagnosis goldfish missed, note it in the final report — it tells us where the diagnosis prompt needs to be tighter next time.

## Step 6: Test gate

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
node --test tests/*.test.mjs
# E2E only when HTML/CSS/JS UI changed:
# Playwright for the touched page only, e.g. python3 tests/home-studio-browser.py
# or scripts/audit/run.sh /<path> --quick for SEO + axe
```

All required tiers must pass. Skip Playwright only when the diff is purely docs, agent skills, or data/model maths with no HTML/CSS/JS UI change. If a builder or bundle input changed, regenerate (`sh scripts/rebuild-js.sh` and the matching `scripts/build-*.mjs`) before declaring done. For UI bugs, also re-verify the original repro one final time in the browser at http://localhost:4173 before reporting done.

## Step 7: Final report

Print to the user:
- Bug summary (one line)
- Root cause (one line)
- Fix (file:line)
- Test that captures it (file:test name)
- Goldfish-vs-elephant agreement (converged / diverged + why)
- `/eg-precommit-review` outcome (rounds, fixes, rebuttals verbatim)
- Test gate status

**STOP.** Do NOT commit; auto mode does not override the project's commit policy. Wait for the user's literal commit instruction. Follow the repo's commit convention: a plain-English subject (no required Conventional Commits prefix), never commit to `main`, never force-push, merge `origin/main` before pushing. Do not add `Co-Authored-By` trailers.
