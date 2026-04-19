#!/usr/bin/env python3
"""
Generate images via ByteDance Seedream (direct ModelArk API, not FAL).

Why direct: ModelArk exposes Seedream 5.0 (released 2026-01-28) which isn't
on FAL yet. Also gives access to watermark: false and native 2K/4K output.

Endpoint: https://ark.ap-southeast.bytepluses.com/api/v3/images/generations
Auth:     ARK_API_KEY env var (Bearer token)

Available models (as of 2026-04-18, query /api/v3/models for latest):
  - seedream-5-0-260128                         TextToImage + ImageToImage (highest quality, highest cost)
  - seedream-4-5-251128    [DEFAULT]            TextToImage + ImageToImage (best quality/cost balance)
  - seedream-4-0-250828                         TextToImage + ImageToImage
  - seedream-3-0-t2i-250415 [retiring]          TextToImage only

Note: "Seedream 5.0-Lite" appears in ByteDance free-pack emails but is NOT
exposed via /api/v3/models. Use 4.5 for cost-efficient default, 5.0 for premium.

Usage:
    python3 generate-image-seedream-modelark.py PROMPT --out PATH
                                  [--aspect 16:9] [--size 2K] [--model seedream-5-0-260128]
                                  [--no-watermark]  # default: no watermark (clean output)
"""
import argparse, os, sys, subprocess, json, time, urllib.request, urllib.error, ssl

ENDPOINT = 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations'
DEFAULT_MODEL = 'seedream-4-5-251128'

# Common aspect → size shortcut. ModelArk accepts generic '2K'/'4K' with
# aspect_ratio inferred from prompt, or explicit WxH.
ASPECT_2K = {
    '16:9':  '2560x1440',
    '9:16':  '1440x2560',
    '1:1':   '2048x2048',
    '4:3':   '2048x1536',
    '3:4':   '1536x2048',
    '21:9':  '2688x1152',
}
ASPECT_4K = {
    '16:9':  '3840x2160',
    '9:16':  '2160x3840',
    '1:1':   '4096x4096',
    '4:3':   '4096x3072',
    '3:4':   '3072x4096',
    '21:9':  '4608x1968',
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('prompt')
    ap.add_argument('--out', required=True)
    ap.add_argument('--aspect', default='16:9',
                    choices=list(ASPECT_2K.keys()))
    ap.add_argument('--size', default='2K', choices=['1K', '2K', '4K'])
    ap.add_argument('--model', default=DEFAULT_MODEL)
    ap.add_argument('--seed', type=int, default=None)
    ap.add_argument('--watermark', action='store_true',
                    help='Include the "AI generated" watermark (default: off)')
    args = ap.parse_args()

    key = os.environ.get('ARK_API_KEY')
    if not key:
        print('ERROR: ARK_API_KEY not set', file=sys.stderr); sys.exit(1)

    if args.size == '4K':
        size_str = ASPECT_4K[args.aspect]
    elif args.size == '2K':
        size_str = ASPECT_2K[args.aspect]
    else:  # 1K
        size_str = {'16:9': '1280x720', '9:16': '720x1280', '1:1': '1024x1024',
                    '4:3': '1024x768', '3:4': '768x1024', '21:9': '1344x576'}[args.aspect]

    payload = {
        'model': args.model,
        'prompt': args.prompt,
        'size': size_str,
        'response_format': 'url',
        'watermark': bool(args.watermark),
    }
    if args.seed is not None:
        payload['seed'] = args.seed

    print(f'→ ModelArk · {args.model} · {size_str} · watermark={args.watermark}')
    t0 = time.time()

    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode(),
        headers={'Authorization': f'Bearer {key}',
                 'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(req, timeout=120,
                                    context=ssl.create_default_context()) as r:
            result = json.load(r)
    except urllib.error.HTTPError as e:
        print(f'HTTP {e.code}:', e.read()[:800].decode(errors='replace'),
              file=sys.stderr); sys.exit(1)
    except Exception as e:
        # Fallback: use curl (handles macOS SSL issues gracefully)
        print(f'  (falling back to curl due to {type(e).__name__})')
        r = subprocess.run(['curl', '-sSf', '-X', 'POST', ENDPOINT,
                            '-H', f'Authorization: Bearer {key}',
                            '-H', 'Content-Type: application/json',
                            '-d', json.dumps(payload), '--max-time', '120'],
                           capture_output=True, text=True)
        if r.returncode != 0:
            print('curl failed:', r.stderr[:800], file=sys.stderr); sys.exit(1)
        result = json.loads(r.stdout)

    dt = time.time() - t0
    print(f'  generated in {dt:.1f}s')

    url = result['data'][0]['url']
    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or '.', exist_ok=True)
    r = subprocess.run(['curl', '-sSL', '-o', args.out, url],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print('download failed:', r.stderr, file=sys.stderr); sys.exit(1)
    size_kb = os.path.getsize(args.out) / 1024
    actual_size = result['data'][0].get('size', 'n/a')
    print(f'  ✓ {args.out} ({size_kb:.0f} KB, {actual_size})')


if __name__ == '__main__':
    main()
