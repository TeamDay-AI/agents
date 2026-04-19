#!/usr/bin/env python3
"""
Build a TeamDay logo endcard (or render one with custom text) and append it
to an existing video using xfade (fadeblack by default).

Two modes:
  1) Render endcard from TeamDay brand assets, append to video.
  2) Use an existing endcard MP4 and just append.

Usage:
  # Append endcard to a Seedance-generated video (default TeamDay endcard)
  python3 append_endcard.py VIDEO.mp4 --out OUT.mp4

  # Customise endcard text
  python3 append_endcard.py VIDEO.mp4 --out OUT.mp4 \
      --wordmark "TeamDay" --tagline "Your AI workforce." --url "teamday.ai"

  # Use a pre-rendered endcard MP4 instead of generating
  python3 append_endcard.py VIDEO.mp4 --endcard-mp4 MY_END.mp4 --out OUT.mp4
"""
import argparse, os, subprocess, shutil, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), 'assets')
FONT_B = os.path.join(ASSETS, 'fonts', 'Inter-Bold.otf')
FONT_M = os.path.join(ASSETS, 'fonts', 'Inter-Medium.otf')
FONT_R = os.path.join(ASSETS, 'fonts', 'Inter-Regular.otf')
LOGO   = os.path.join(ASSETS, 'teamday_logo.png')

FFMPEG  = shutil.which('ffmpeg')  or '/opt/homebrew/bin/ffmpeg'
FFPROBE = shutil.which('ffprobe') or '/opt/homebrew/bin/ffprobe'


def _run(cmd, label=''):
    if label:
        print(f'>>> {label}')
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print('STDERR:', r.stderr[-3500:], file=sys.stderr)
        sys.exit(1)


def probe(path, entry):
    r = subprocess.run([FFPROBE, '-v', 'error', '-show_entries', entry,
                        '-of', 'default=noprint_wrappers=1:nokey=1', path],
                       capture_output=True, text=True)
    return r.stdout.strip()


def render_endcard_still(out_png, W, H, wordmark, tagline, url, logo_path, fonts):
    frame = Image.new('RGBA', (W, H), (6, 6, 8, 255))
    logo = Image.open(logo_path).convert('RGBA')
    target_h = int(H * 0.28)
    aspect = logo.width / logo.height
    target_w = int(target_h * aspect)
    logo_r = logo.resize((target_w, target_h), Image.LANCZOS)
    lx = (W - target_w) // 2
    ly = int(H * 0.26)
    frame.alpha_composite(logo_r, (lx, ly))

    draw = ImageDraw.Draw(frame)
    # Wordmark
    word_size = int(H * 0.105)
    font_word = ImageFont.truetype(fonts['bold'], word_size)
    bb = draw.textbbox((0, 0), wordmark, font=font_word)
    tw = bb[2] - bb[0]
    x = (W - tw) // 2
    y = ly + target_h + int(H * 0.035)
    draw.text((x + 3, y + 3), wordmark, font=font_word, fill=(0, 0, 0, 200))
    draw.text((x, y), wordmark, font=font_word, fill=(255, 255, 255, 255))

    # Amber rule
    ry = y + int(word_size * 1.18)
    rule_w = int(W * 0.25)
    draw.rectangle([(W // 2 - rule_w // 2, ry),
                    (W // 2 + rule_w // 2, ry + 3)],
                   fill=(255, 190, 80, 220))

    # Tagline
    tag_size = int(H * 0.043)
    font_tag = ImageFont.truetype(fonts['medium'], tag_size)
    bb2 = draw.textbbox((0, 0), tagline, font=font_tag)
    tw2 = bb2[2] - bb2[0]
    x2 = (W - tw2) // 2
    y2 = ry + int(H * 0.028)
    draw.text((x2, y2), tagline, font=font_tag, fill=(220, 220, 225, 240))

    # URL
    url_size = int(H * 0.032)
    font_url = ImageFont.truetype(fonts['regular'], url_size)
    bb3 = draw.textbbox((0, 0), url, font=font_url)
    tw3 = bb3[2] - bb3[0]
    x3 = (W - tw3) // 2
    y3 = y2 + int(H * 0.065)
    draw.text((x3, y3), url, font=font_url, fill=(160, 165, 180, 220))

    frame.convert('RGB').save(out_png, 'PNG')
    return out_png


def render_endcard_mp4(out_mp4, still_png, duration, fps, W, H):
    fade_out_start = max(0.0, duration - 0.4)
    _run([
        FFMPEG, '-y', '-loop', '1', '-i', still_png,
        '-vf', (f"fps={fps},format=yuv420p,"
                f"fade=t=in:st=0:d=0.6,"
                f"fade=t=out:st={fade_out_start}:d=0.4"),
        '-t', str(duration),
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '15',
        '-pix_fmt', 'yuv420p',
        out_mp4,
    ], f'endcard mp4 → {os.path.basename(out_mp4)}')


def append(video, endcard_mp4, out, xfade=0.5, transition='fadeblack'):
    vdur = float(probe(video, 'format=duration'))
    offset = round(vdur - xfade, 4)
    # Match size/fps/pix_fmt via filter pipeline
    W = int(probe(video, 'stream=width').splitlines()[0])
    H = int(probe(video, 'stream=height').splitlines()[0])

    fc = (
        f"[0:v]scale={W}:{H},setsar=1,fps=24,format=yuv420p[v0];"
        f"[1:v]scale={W}:{H},setsar=1,fps=24,format=yuv420p[v1];"
        f"[v0][v1]xfade=transition={transition}:duration={xfade}:offset={offset}[vout]"
    )

    # Preserve audio from source if present
    has_audio = probe(video, 'stream=codec_type').splitlines().count('audio') > 0
    cmd = [FFMPEG, '-y', '-i', video, '-i', endcard_mp4,
           '-filter_complex', fc, '-map', '[vout]']
    if has_audio:
        cmd += ['-map', '0:a:0', '-c:a', 'aac', '-b:a', '192k']
    cmd += ['-c:v', 'libx264', '-preset', 'slow', '-crf', '14',
            '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]
    _run(cmd, f'append → {out}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--out', required=True)
    ap.add_argument('--endcard-mp4', default='',
                    help='Use pre-rendered endcard MP4 instead of generating')
    ap.add_argument('--wordmark', default='TeamDay')
    ap.add_argument('--tagline', default='Your AI workforce.')
    ap.add_argument('--url', default='teamday.ai')
    ap.add_argument('--duration', type=float, default=2.5)
    ap.add_argument('--xfade', type=float, default=0.5)
    ap.add_argument('--transition', default='fadeblack',
                    help='ffmpeg xfade transition name (fade, fadeblack, dissolve…)')
    ap.add_argument('--logo', default=LOGO)
    ap.add_argument('--font-bold', default=FONT_B)
    ap.add_argument('--font-medium', default=FONT_M)
    ap.add_argument('--font-regular', default=FONT_R)
    ap.add_argument('--tmp', default='.endcard_tmp')
    args = ap.parse_args()

    os.makedirs(args.tmp, exist_ok=True)

    if args.endcard_mp4:
        endcard = args.endcard_mp4
    else:
        W = int(probe(args.video, 'stream=width').splitlines()[0])
        H = int(probe(args.video, 'stream=height').splitlines()[0])
        still = os.path.join(args.tmp, 'endcard_still.png')
        render_endcard_still(still, W, H, args.wordmark, args.tagline, args.url,
                             args.logo,
                             {'bold': args.font_bold,
                              'medium': args.font_medium,
                              'regular': args.font_regular})
        endcard = os.path.join(args.tmp, 'endcard.mp4')
        render_endcard_mp4(endcard, still, args.duration, 24, W, H)

    append(args.video, endcard, args.out, xfade=args.xfade,
           transition=args.transition)

    size_mb = os.path.getsize(args.out) / 1_048_576
    print(f'\n✓ Wrote {args.out} ({size_mb:.1f} MB)')


if __name__ == '__main__':
    main()
