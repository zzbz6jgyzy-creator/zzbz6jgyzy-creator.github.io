# Extra tools installed for this project (28 Oct 2026)

Installed in the cloud session's container, outside this repository. The container is ephemeral, so this page records what was installed and how to repeat it. Nothing here is part of the site and none of it is committed.

| Tool | Source | Where | State |
|---|---|---|---|
| Scrapling 0.5 | github.com/D4Vinci/Scrapling (BSD-3-Clause) | `/home/user/tools/venv-scrapling` | Installed with the `ai` extra (fetchers and MCP server). Tested: parsed the new FSD tracker page's headline cards |
| Kdenlive 23.08.5 and melt 7.22 | github.com/KDE/kdenlive cloned for reference; installed from the Ubuntu package | `/usr/bin/kdenlive`, `/usr/bin/melt` | Installed. `melt` renders MLT projects headlessly (tested: 2 s clip to H.264). The GUI cannot be used in a cloud session |
| MoneyPrinterTurbo 1.3.9 | github.com/harry0703/MoneyPrinterTurbo (MIT) | `/home/user/tools/venv-mpt` | Dependencies installed, app modules import. Needs an LLM key and a stock-footage key (Pexels) to make videos |
| OpenShorts | github.com/mutonby/openshorts (MIT) | `/home/user/tools/venv-openshorts` | Dependencies installed with CPU PyTorch. Needs a Gemini key to pick clips |
| Voicebox | github.com/jamiepine/voicebox (MIT) | `/home/user/tools/venv-voicebox` | Backend dependencies installed and the API app imports. Two engines that install straight from other GitHub repositories (LuxTTS, LinaCodec) were skipped. No model weights downloaded. Desktop app (Tauri) not built |
| VoiceStudio | github.com/debpalash/VoiceStudio (AGPL-3.0) | `/home/user/tools/venv-voicestudio` | Python package installed, imports. No model weights downloaded. The project's `curl | sh` installer was not run |
| Rescript | github.com/wassgha/rescript (PolyForm Noncommercial) | `/home/user/wassgha/rescript` | `npm install --ignore-scripts` done, its two reviewed post-install steps run by hand. The Next.js build was not run (blocked by the session's safety checks) |

## Limits to know

- The container has 4 CPUs, 15 GB RAM and no GPU. Voice cloning, dubbing and video generation will be slow and the models are several gigabytes each, so none were downloaded.
- MoneyPrinterTurbo and OpenShorts need third-party API keys. Keys are never stored in this repository; add them to the environment settings if you want these used.
- Rescript's licence is noncommercial. Supercharged Daily carries affiliate links and a tip jar, so check the licence before using Rescript output commercially.
- Scrapling can drive a stealth browser. This project uses it only for ordinary fetching and parsing of pages that allow it, not to get past a site's blocks (Tesla's pages return 403 to our fetcher, and we respect that).

## Repeat the install

```
uv venv --python 3.12 /home/user/tools/venv-scrapling
uv pip install --python /home/user/tools/venv-scrapling/bin/python "scrapling[ai]"
apt-get install -y --no-install-recommends kdenlive melt
```

For the PyTorch tools use the CPU wheels (`--index-url https://download.pytorch.org/whl/cpu --no-deps torch torchvision`) before installing the rest, or the NVIDIA libraries add several gigabytes.
