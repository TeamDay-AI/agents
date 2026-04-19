#!/usr/bin/env python3
"""
Mux an audio track (music, voiceover) onto a video with automatic fade in/out.
Preserves existing video stream (no re-encode) to stay fast and keep quality.

Usage:
  python3 mux_audio.py VIDEO.mp4 AUDIO.mp3 --out OUT.mp4
  python3 mux_audio.py VIDEO.mp4 AUDIO.mp3 --out OUT.mp4 --volume 0.8
                        --fade-in 0.5 --fade-out 1.2
"""
import argparse, os, subprocess, shutil, sys

FFMPEG  = shutil.which('ffmpeg')  or '/opt/homebrew/bin/ffmpeg'
FFPROBE = shutil.which('ffprobe') or '/opt/homebrew/bin/ffprobe'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('audio')
    ap.add_argument('--out', required=True)
    ap.add_argument('--volume', type=float, default=0.85)
    ap.add_argument('--fade-in', type=float, default=0.5)
    ap.add_argument('--fade-out', type=float, default=1.2)
    args = ap.parse_args()

    r = subprocess.run([FFPROBE, '-v', 'error', '-show_entries', 'format=duration',
                        '-of', 'default=noprint_wrappers=1:nokey=1', args.video],
                       capture_output=True, text=True)
    vdur = float(r.stdout.strip())
    fade_out_start = max(0, vdur - args.fade_out)

    af = (f"afade=t=in:st=0:d={args.fade_in},"
          f"afade=t=out:st={fade_out_start:.3f}:d={args.fade_out},"
          f"volume={args.volume}")

    cmd = [FFMPEG, '-y', '-i', args.video, '-i', args.audio,
           '-filter_complex', f'[1:a]{af}[a]',
           '-map', '0:v:0', '-map', '[a]',
           '-c:v', 'copy',
           '-c:a', 'aac', '-b:a', '192k',
           '-shortest',
           '-movflags', '+faststart',
           args.out]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print('STDERR:', r.stderr[-3000:], file=sys.stderr)
        sys.exit(1)

    size_mb = os.path.getsize(args.out) / 1_048_576
    print(f'✓ {args.out} ({size_mb:.1f} MB, {vdur:.2f}s)')


if __name__ == '__main__':
    main()
