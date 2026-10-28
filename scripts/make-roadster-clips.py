#!/usr/bin/env python3
"""Cut the short background loops for the Roadster experience from Tesla's official event video.

The source is Tesla's public video CDN. It is NOT committed (101 MB): download it to a scratch directory, or let this script do it.
It is pinned by SHA-256 in data/roadster-clips.json; if Tesla re-encodes the file the script stops instead of cutting a different video.

    python3 scripts/make-roadster-clips.py --source /tmp/roadster-clips/event.mp4          # download if missing, cut, write posters and checksums
    python3 scripts/make-roadster-clips.py --check                                          # verify committed outputs against the checksums (no ffmpeg)
    python3 scripts/make-roadster-clips.py --only hop                                       # one clip

Each clip is silent, 12 s or less, faded in and out (0.5 s) so a loop restarts through black, and written as H.264 MP4 and VP9 WebM
at 1280 px (desktop) and 720 px (phones), plus an AVIF and WebP poster. Every clip is credited and linked to the original on the page.
"""
import argparse, hashlib, json, pathlib, subprocess, sys, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CFG = ROOT / 'data' / 'roadster-clips.json'
OUT = ROOT / 'assets' / 'roadster-clips'
SIZES = {'1280': dict(crf_mp4=27, crf_webm=34), '720': dict(crf_mp4=29, crf_webm=36)}


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def run(cmd):
    subprocess.run(cmd, check=True)


def check(cfg):
    bad = []
    lim = cfg['limits']
    for o in cfg['outputs']:
        p = ROOT / o['path']
        if not p.is_file() or sha256(p) != o['sha256'] or p.stat().st_size != o['bytes']:
            bad.append(o['path'])
    # A visitor downloads one format at one size per clip, so the budget is per set (for example every 720 px MP4), not the sum of all files.
    for w in SIZES:
        for ext in ('mp4', 'webm'):
            sizes = [o['bytes'] for o in cfg['outputs'] if o['path'].endswith(f'-{w}.{ext}')]
            if sum(sizes) > lim['maxSetBytes']:
                bad.append(f'{w} {ext} set is {sum(sizes)} bytes, over {lim["maxSetBytes"]}')
            for o in cfg['outputs']:
                if o['path'].endswith(f'-{w}.{ext}') and o['bytes'] > lim['maxBytesPerClip']:
                    bad.append(f'{o["path"]} over {lim["maxBytesPerClip"]} bytes')
    ids = {c['id'] for c in cfg['clips']}
    for c in cfg['clips']:
        if c['duration'] > lim['maxClipSeconds']:
            bad.append(f'{c["id"]} longer than {lim["maxClipSeconds"]} s')
        for w in SIZES:
            for ext in ('mp4', 'webm'):
                if not any(o['path'] == f'assets/roadster-clips/{c["id"]}-{w}.{ext}' for o in cfg['outputs']):
                    bad.append(f'missing {c["id"]}-{w}.{ext}')
    return bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', default='/tmp/roadster-clips/event.mp4')
    ap.add_argument('--only')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--force', action='store_true', help='cut even if the source checksum changed (then update data/roadster-clips.json by hand)')
    a = ap.parse_args()
    cfg = json.loads(CFG.read_text())
    if a.check:
        bad = check(cfg)
        print('OK' if not bad else 'PROBLEMS:\n  ' + '\n  '.join(bad))
        sys.exit(1 if bad else 0)
    src = pathlib.Path(a.source)
    src.parent.mkdir(parents=True, exist_ok=True)
    if not src.is_file():
        print('downloading', cfg['source']['url'])
        urllib.request.urlretrieve(cfg['source']['url'], src)
    got = sha256(src)
    if got != cfg['source']['sha256'] and not a.force:
        sys.exit(f'Source checksum changed ({got}). Tesla may have replaced the video; review the segments, then rerun with --force.')
    OUT.mkdir(parents=True, exist_ok=True)
    outputs = [o for o in cfg['outputs'] if a.only and o['path'].split('/')[-1].split('-')[0] != a.only]
    for c in cfg['clips']:
        if a.only and c['id'] != a.only:
            continue
        d = c['duration']
        for w, q in SIZES.items():
            vf = f'scale={w}:-2:flags=lanczos,fade=t=in:st=0:d=0.5,fade=t=out:st={d - 0.6}:d=0.6,format=yuv420p'
            base = ['ffmpeg', '-v', 'error', '-y', '-ss', str(c['start']), '-t', str(d), '-i', str(src), '-an', '-vf', vf]
            mp4 = OUT / f'{c["id"]}-{w}.mp4'
            webm = OUT / f'{c["id"]}-{w}.webm'
            run(base + ['-c:v', 'libx264', '-preset', 'slow', '-crf', str(q['crf_mp4']), '-profile:v', 'main', '-movflags', '+faststart', str(mp4)])
            run(base + ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', str(q['crf_webm']), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', str(webm)])
            for p in (mp4, webm):
                outputs.append({'path': str(p.relative_to(ROOT)), 'bytes': p.stat().st_size, 'sha256': sha256(p)})
        # Posters from the same frame, as AVIF and WebP, at both widths.
        from PIL import Image
        frame = OUT / f'{c["id"]}-poster.png'
        run(['ffmpeg', '-v', 'error', '-y', '-ss', str(c['start'] + c['poster']), '-i', str(src), '-frames:v', '1', str(frame)])
        im = Image.open(frame).convert('RGB')
        for w in (1280, 720):
            r = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            for ext, kw in (('avif', dict(quality=52, speed=4)), ('webp', dict(quality=80, method=6))):
                p = OUT / f'{c["id"]}-poster-{w}.{ext}'
                r.save(p, **kw)
                outputs.append({'path': str(p.relative_to(ROOT)), 'bytes': p.stat().st_size, 'sha256': sha256(p)})
        frame.unlink()
        print('cut', c['id'])
    cfg['outputs'] = sorted(outputs, key=lambda o: o['path'])
    CFG.write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + '\n')
    bad = check(cfg)
    print('OK' if not bad else 'PROBLEMS:\n  ' + '\n  '.join(bad))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
