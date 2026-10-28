# Extra tools: use them whenever possible

The owner has installed these tools (see `docs/tooling.md` for where and how) and wants them used **whenever possible**. Before doing a task by hand, check this list. If a listed tool fits, use it, and say which one you used in the PR description under "Checked".

| Job | Use | Notes |
|---|---|---|
| Fetch and parse web pages, extract data from competitor or source pages | **Scrapling** (`/home/user/tools/venv-scrapling`), then **Firecrawl** (`@mendable/firecrawl-js` in `/home/user/tools/js`) | Scrapling first. Firecrawl needs an API key; self-hosting does not fit the container's disk |
| "Where is X written, what calls Y, which builders touch this file" in this repo | **graphify** (`graphify update <path>`, `graphify query "..."`) | Build the graph from a scratch copy of the code, not inside the repo; never commit `graphify-out/` |
| Programmatic video from site data (tracker animations, share clips, explainers) | **Remotion** or **HyperFrames** (`/home/user/tools/js`) | Remotion is free for individuals and for-profit companies of up to 3 employees; confirm that still applies before commercial use. HyperFrames is Apache-2.0 |
| Cut, trim, caption or render existing footage | **Kdenlive** project files rendered with `melt`, **Rescript** for transcript-based edits | Rescript's licence is noncommercial: personal drafts only unless the owner confirms otherwise |
| Short vertical clips from long video, topic-to-video | **OpenShorts**, **MoneyPrinterTurbo** | Need third-party API keys the repo does not hold |
| Voiceover, voice cloning, dubbing | **VoiceStudio**, **Voicebox** | CPU only here, so slow, and models are not downloaded; AGPL (VoiceStudio) |
| Shrinking large text context | **pxpipe offline export only** | See limits below |

## Limits that always apply (these are what "possible" means)

1. **Editorial rules win.** Anything a tool produces for the site is held to `editorial.md`: sourced, labelled, no invented figures. Generated or synthetic voice, faces and footage must be labelled as such.
2. **Never put keys or secrets in the repo.** If a tool needs an API key and none is in the environment, say so and continue by hand; do not ask for a key to be pasted into a file.
3. **Respect sites.** Use Scrapling and Firecrawl for pages that allow fetching. Do not use stealth or proxy features to get past a site's block (Tesla's pages return 403 to our fetcher and we leave them).
4. **Do not run pxpipe as a proxy.** It rewrites model requests into images, is lossy on exact strings (hashes, ids, numbers) and would sit between this session and the API. Only its offline `export` mode is allowed, and never for anything where exact figures matter.
5. **Keep the container healthy.** Disk is limited. Use CPU PyTorch wheels, clear `uv cache clean` after installs, and do not download model weights unless a task needs them.
6. **Third-party code stays out of the repo.** Tools live under `/home/user/tools` and their own clones; only outputs we have reviewed are committed. Check each licence before shipping what a tool made.
7. **If a tool is blocked, say so.** When the session's safety checks refuse to run a tool, report it and do the task another way instead of working around the block.
