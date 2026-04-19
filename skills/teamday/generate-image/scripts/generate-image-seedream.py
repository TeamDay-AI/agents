#!/usr/bin/env python3
"""
Generate images via ByteDance Seedream 4.0 on FAL.

Seedream is ByteDance's top-tier image model — excellent for cinematic scenes,
complex composition, photorealism, and creative work. Better than Flux 2 for
premium marketing visuals.

Endpoint: fal-ai/bytedance/seedream/v4/text-to-image

Usage:
    python3 generate-image-seedream.py PROMPT --out PATH [--aspect 16:9] [--n 1]
                                       [--seed N] [--size 2K|4K]

Env: FAL_KEY
"""
import argparse, os, sys, json, subprocess, time

try:
    import fal_client
except ImportError:
    os.system(f'{sys.executable} -m pip install -q fal-client')
    import fal_client

ENDPOINT = 'fal-ai/bytedance/seedream/v4/text-to-image'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('prompt')
    ap.add_argument('--out', required=True, help='Output path (PNG/JPG/WebP)')
    ap.add_argument('--aspect', default='16:9',
                    choices=['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'])
    ap.add_argument('--n', type=int, default=1, help='Number of variants')
    ap.add_argument('--seed', type=int, default=None)
    ap.add_argument('--size', default='auto_2K',
                    choices=['square_hd', 'square', 'portrait_4_3',
                             'portrait_16_9', 'landscape_4_3', 'landscape_16_9',
                             'auto', 'auto_2K', 'auto_4K'],
                    help='Seedream image_size (default auto_2K — respects aspect)')
    args = ap.parse_args()

    if not os.environ.get('FAL_KEY'):
        print('ERROR: FAL_KEY not set', file=sys.stderr); sys.exit(1)

    payload = {'prompt': args.prompt, 'num_images': args.n,
               'aspect_ratio': args.aspect, 'image_size': args.size}
    if args.seed is not None:
        payload['seed'] = args.seed

    print(f'→ Seedream 4.0 · {args.aspect} · n={args.n}')
    t0 = time.time()
    result = fal_client.subscribe(ENDPOINT, arguments=payload, with_logs=False)
    print(f'  generated in {time.time()-t0:.1f}s')

    images = result.get('images', [])
    if not images:
        print('No images in result:', json.dumps(result)[:400], file=sys.stderr)
        sys.exit(1)

    # Save all outputs; when n>1, suffix -1, -2, ...
    stem, ext = os.path.splitext(args.out)
    if not ext:
        ext = '.png'
    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or '.', exist_ok=True)

    saved = []
    for i, img in enumerate(images):
        url = img['url'] if isinstance(img, dict) else img
        out_path = args.out if len(images) == 1 else f'{stem}-{i+1}{ext}'
        r = subprocess.run(['curl', '-sSL', '-o', out_path, url],
                           capture_output=True, text=True)
        if r.returncode != 0:
            print(f'  curl failed for {i}: {r.stderr}', file=sys.stderr)
            sys.exit(1)
        size_kb = os.path.getsize(out_path) / 1024
        saved.append(out_path)
        print(f'  ✓ {out_path} ({size_kb:.0f} KB)')

    if result.get('seed') is not None:
        print(f'  seed: {result["seed"]}')


if __name__ == '__main__':
    main()
