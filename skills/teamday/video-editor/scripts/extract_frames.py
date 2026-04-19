#!/usr/bin/env python3
"""
Extract frames from a video for analysis or keyframe reverse-engineering.

Usage:
    python3 extract_frames.py INPUT.mp4 [--fps 1] [--out frames/] [--prefix frame]
                               [--size 1280x720] [--max N]

Common patterns:
  1 frame/sec (good for 10–30s clips, quick vision scan):
      extract_frames.py video.mp4 --fps 1

  Start + end + midpoints (5 samples, evenly spaced):
      extract_frames.py video.mp4 --samples 5

  Thumbnail scan at low res (fast vision-model pass):
      extract_frames.py video.mp4 --fps 2 --size 640x360

Use case: Jam's cinematic videos have strong keyframes. Extracting 1 frame/sec
from a reference video lets Claude vision scan the composition/colour/mood and
replicate the style in new prompts.
"""
import argparse, os, subprocess, shutil, sys, json

FFMPEG = shutil.which('ffmpeg') or '/opt/homebrew/bin/ffmpeg'
FFPROBE = shutil.which('ffprobe') or '/opt/homebrew/bin/ffprobe'


def probe_duration(path):
    r = subprocess.run([FFPROBE, '-v', 'error', '-show_entries',
                        'format=duration', '-of',
                        'default=noprint_wrappers=1:nokey=1', path],
                       capture_output=True, text=True)
    return float(r.stdout.strip())


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print('STDERR:', r.stderr[-1500:], file=sys.stderr)
        sys.exit(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input')
    ap.add_argument('--fps', type=float, default=1.0,
                    help='Frames per second to extract (ignored if --samples)')
    ap.add_argument('--samples', type=int, default=0,
                    help='Extract exactly N evenly-spaced samples (overrides --fps)')
    ap.add_argument('--out', default='frames',
                    help='Output directory (created if missing)')
    ap.add_argument('--prefix', default='frame',
                    help='Filename prefix (default: frame)')
    ap.add_argument('--size', default='',
                    help='Optional resize WIDTHxHEIGHT (e.g. 640x360 or 640x-1)')
    ap.add_argument('--max', type=int, default=0,
                    help='Hard cap on total frames (default: unlimited)')
    ap.add_argument('--json', action='store_true',
                    help='Emit JSON summary with frame paths + timestamps')
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)

    duration = probe_duration(args.input)
    out_pattern = os.path.join(args.out, f'{args.prefix}_%04d.png')

    vf = []
    timestamps = []

    if args.samples > 0:
        # Sample N evenly-spaced frames using select filter
        step = duration / (args.samples + 1)
        picks = [step * (i + 1) for i in range(args.samples)]
        timestamps = picks
        expr = '+'.join([f"eq(t\\,{t:.3f})" for t in picks])
        # Use select with gt for robustness (pick the first frame at/after each pick)
        # Simpler: run N separate -ss extractions
        for i, t in enumerate(picks, start=1):
            out_path = os.path.join(args.out, f'{args.prefix}_{i:04d}.png')
            cmd = [FFMPEG, '-y', '-ss', f'{t:.3f}', '-i', args.input,
                   '-frames:v', '1']
            if args.size:
                cmd += ['-vf', f'scale={args.size.replace("x", ":")}']
            cmd += [out_path]
            run(cmd)
        frames = sorted(os.path.join(args.out, f) for f in os.listdir(args.out)
                        if f.startswith(args.prefix) and f.endswith('.png'))
    else:
        vf_parts = [f'fps={args.fps}']
        if args.size:
            vf_parts.append(f'scale={args.size.replace("x", ":")}')
        cmd = [FFMPEG, '-y', '-i', args.input, '-vf', ','.join(vf_parts)]
        if args.max:
            cmd += ['-frames:v', str(args.max)]
        cmd += [out_pattern]
        run(cmd)
        frames = sorted(os.path.join(args.out, f) for f in os.listdir(args.out)
                        if f.startswith(args.prefix) and f.endswith('.png'))
        timestamps = [i / args.fps for i in range(len(frames))]

    if args.json:
        summary = {
            'input': args.input,
            'duration': duration,
            'frame_count': len(frames),
            'frames': [
                {'path': f, 't': round(t, 3)}
                for f, t in zip(frames, timestamps)
            ],
        }
        print(json.dumps(summary, indent=2))
    else:
        print(f'Extracted {len(frames)} frames → {args.out}/')
        for f, t in zip(frames, timestamps):
            print(f'  [{t:>6.2f}s] {f}')


if __name__ == '__main__':
    main()
