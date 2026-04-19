#!/usr/bin/env python3
"""
SuperScale SuperAI — Cinematic Video Compositor
Uses Pillow for text rendering + ffmpeg for video processing,
color grading, overlay compositing, and xfade transitions.
"""
import subprocess, sys, os
from PIL import Image, ImageDraw, ImageFont

FFMPEG = (
    '/data/sandbox/bU08FgGEE6e3zyxR84qF/agents/a-vByovUiBhPpaC9VVlpP0'
    '/.local/lib/python3.13/site-packages/imageio_ffmpeg/binaries'
    '/ffmpeg-linux-x86_64-v7.0.2'
)
BASE = '/data/sandbox/bU08FgGEE6e3zyxR84qF/spaces/s-LP8eJuL2eLHgB6dtsKkw'
S    = f'{BASE}/video_scenes'
OUT  = f'{BASE}/superscale_superai_cinematic.mp4'

FONT_B = '/usr/share/fonts/truetype/lato/Lato-Bold.ttf'
FONT_R = '/usr/share/fonts/truetype/lato/Lato-Regular.ttf'

DUR  = 3.25   # seconds per processed clip
XF   = 0.3    # xfade overlap
FPS  = 24
W, H = 1920, 1080

raw_clips = [
    f'{S}/scene1_ai_raw.mp4',
    f'{S}/scene2_vegas_raw.mp4',
    f'{S}/scene3_la_raw.mp4',
    f'{S}/scene4_dashboard_raw.mp4',
]
processed = [f'{S}/p{i+1}.mp4' for i in range(4)]


def run(cmd, label):
    print(f'\n>>> {label}')
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print('STDERR:', r.stderr[-3000:])
        sys.exit(1)
    print('    OK')


# ── Text overlay helpers ────────────────────────────────────────────────────

def make_text_png(path, lines, font_path=FONT_B, font_size=68,
                  color=(255, 255, 255, 255), line_spacing=1.25,
                  y_frac=0.75, shadow=True):
    """
    Render one or more lines of text centred horizontally at y_frac * H
    onto a transparent 1920×1080 RGBA canvas. Returns path.
    """
    img  = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(font_path, font_size)

    # Measure total block height
    line_heights = []
    for line in lines:
        bb = draw.textbbox((0, 0), line, font=font)
        line_heights.append(bb[3] - bb[1])
    total_h = sum(line_heights) + int(line_spacing * font_size) * (len(lines) - 1)
    block_top = int(H * y_frac) - total_h // 2

    y_cursor = block_top
    for i, (line, lh) in enumerate(zip(lines, line_heights)):
        bb  = draw.textbbox((0, 0), line, font=font)
        tw  = bb[2] - bb[0]
        x   = (W - tw) // 2
        if shadow:
            draw.text((x + 3, y_cursor + 3), line, font=font, fill=(0, 0, 0, 160))
        draw.text((x, y_cursor), line, font=font, fill=color)
        y_cursor += lh + int(line_spacing * font_size) if i < len(lines) - 1 else 0

    img.save(path)
    return path


def overlay_text(video_in, text_png, video_out,
                 fade_in_t=0.0, fade_in_d=0.45,
                 fade_out_t=None, fade_out_d=0.45,
                 base_vf=''):
    """
    Apply base video filters + overlay a pre-rendered text PNG with fade-in/out.
    """
    if fade_out_t is None:
        fade_out_t = DUR - fade_out_d - 0.05

    text_chain = (
        f"[1:v]format=rgba,"
        f"fade=t=in:st={fade_in_t}:d={fade_in_d}:alpha=1,"
        f"fade=t=out:st={fade_out_t}:d={fade_out_d}:alpha=1[txt]"
    )
    if base_vf:
        video_chain = f"[0:v]{base_vf}[vg];[vg][txt]overlay=0:0[vout]"
    else:
        video_chain = f"[0:v][txt]overlay=0:0[vout]"

    fc = f"{text_chain};{video_chain}"

    run([
        FFMPEG, '-y',
        '-i', video_in,
        '-i', text_png,
        '-filter_complex', fc,
        '-map', '[vout]', '-an',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-t', str(DUR),
        video_out
    ], f'  overlay → {os.path.basename(video_out)}')


def base_vf(contrast, sat, bright, r_curve, g_curve, b_curve):
    return (
        f"trim=0:{DUR},setpts=PTS-STARTPTS,"
        f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
        f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,"
        f"fps={FPS},"
        f"eq=contrast={contrast}:saturation={sat}:brightness={bright},"
        f"curves=r='{r_curve}':g='{g_curve}':b='{b_curve}'"
    )


# ── SCENE 1: AI Particles ────────────────────────────────────────────────────
print('=== Scene 1: AI Particles ===')
png1 = make_text_png(f'{S}/t1.png',
                     ['THIS IS WHAT AI SHOULD LOOK LIKE'],
                     font_size=72, y_frac=0.76)
vf1 = base_vf(1.35, 1.2, -0.05,
              '0/0 0.5/0.4 1/0.88',
              '0/0 0.5/0.5 1/0.95',
              '0/0 0.25/0.35 0.75/0.9 1/1')
overlay_text(raw_clips[0], png1, processed[0], base_vf=vf1)

# ── SCENE 2: Las Vegas ───────────────────────────────────────────────────────
# Two text layers: combine both onto one PNG (main + "LIVE" badge)
print('\n=== Scene 2: Las Vegas ===')

def make_vegas_png(path):
    img  = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font_l = ImageFont.truetype(FONT_B, 76)
    font_s = ImageFont.truetype(FONT_R, 30)
    # Main text
    main = 'MAU VEGAS - NEXT LEVEL'
    bb = draw.textbbox((0, 0), main, font=font_l)
    tw = bb[2] - bb[0]
    x  = (W - tw) // 2
    y  = int(H * 0.72)
    draw.text((x + 3, y + 3), main, font=font_l, fill=(0, 0, 0, 150))
    draw.text((x, y), main, font=font_l, fill=(255, 255, 255, 255))
    # LIVE badge
    live_txt = '● LIVE'
    live_font = ImageFont.truetype(FONT_R, 30)
    bb2 = draw.textbbox((0, 0), live_txt, font=live_font)
    tw2 = bb2[2] - bb2[0]
    x2 = (W - tw2) // 2
    y2 = int(H * 0.84)
    draw.text((x2, y2), live_txt, font=live_font, fill=(0, 255, 136, 255))
    img.save(path)
    return path

png2 = make_vegas_png(f'{S}/t2.png')
vf2 = base_vf(1.4, 1.65, -0.03,
              '0/0.04 0.5/0.56 1/0.96',
              '0/0 0.5/0.45 1/0.88',
              '0/0.05 0.4/0.62 1/1')
overlay_text(raw_clips[1], png2, processed[1], base_vf=vf2)

# ── SCENE 3: Los Angeles ─────────────────────────────────────────────────────
print('\n=== Scene 3: Los Angeles ===')
png3 = make_text_png(f'{S}/t3.png',
                     ['GAMESBEAT LA - UNLOCKED'],
                     font_size=72, y_frac=0.75)
vf3 = base_vf(1.25, 1.35, 0.02,
              '0/0.04 0.5/0.65 1/1',
              '0/0 0.5/0.5 1/0.92',
              '0/0 0.5/0.35 1/0.78')
overlay_text(raw_clips[2], png3, processed[2], base_vf=vf3)

# ── SCENE 4: AI Dashboard — multi-layer text ─────────────────────────────────
# Header stays throughout; keywords cycle (Predict / Optimise / Scale)
# We'll render 4 PNG layers and overlay them with staggered fade timing
print('\n=== Scene 4: AI Dashboard (multi-layer) ===')

def make_dashboard_title_png(path):
    img  = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT_B, 64)
    text = 'INTRODUCING SUPERSCALE SUPERAI'
    bb   = draw.textbbox((0, 0), text, font=font)
    tw   = bb[2] - bb[0]
    x    = (W - tw) // 2
    y    = int(H * 0.70)
    draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, 140))
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))
    img.save(path)

def make_keyword_png(path, word):
    img  = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT_B, 60)
    bb   = draw.textbbox((0, 0), word, font=font)
    tw   = bb[2] - bb[0]
    x    = (W - tw) // 2
    y    = int(H * 0.82)
    # Glow / shadow
    draw.text((x + 2, y + 2), word, font=font, fill=(0, 100, 200, 120))
    draw.text((x, y), word, font=font, fill=(0, 204, 255, 255))
    img.save(path)

png4_title   = f'{S}/t4_title.png'
png4_predict = f'{S}/t4_predict.png'
png4_optimise= f'{S}/t4_optimise.png'
png4_scale   = f'{S}/t4_scale.png'
make_dashboard_title_png(png4_title)
make_keyword_png(png4_predict,  'Predict')
make_keyword_png(png4_optimise, 'Optimise')
make_keyword_png(png4_scale,    'Scale')

vf4_base = base_vf(1.3, 1.15, 0.0,
                   '0/0 0.6/0.5 1/0.82',
                   '0/0 0.5/0.52 1/0.95',
                   '0/0.06 0.4/0.65 1/1')

# Build one complex filter: base → overlay title → overlay each keyword at offset
fc4 = (
    # title: fade in 0.3s → hold → fade out 0.3s at end
    f"[1:v]format=rgba,"
    f"fade=t=in:st=0:d=0.35:alpha=1,"
    f"fade=t=out:st={DUR-0.35}:d=0.35:alpha=1[title];"

    # Predict: 0.6 → 1.5s
    f"[2:v]format=rgba,"
    f"fade=t=in:st=0.6:d=0.25:alpha=1,"
    f"fade=t=out:st=1.25:d=0.25:alpha=1[kw1];"

    # Optimise: 1.55 → 2.45s
    f"[3:v]format=rgba,"
    f"fade=t=in:st=1.55:d=0.25:alpha=1,"
    f"fade=t=out:st=2.2:d=0.25:alpha=1[kw2];"

    # Scale: 2.5 → 3.25s
    f"[4:v]format=rgba,"
    f"fade=t=in:st=2.5:d=0.25:alpha=1,"
    f"fade=t=out:st=3.0:d=0.25:alpha=1[kw3];"

    # Composite layers
    f"[0:v]{vf4_base}[vbase];"
    f"[vbase][title]overlay=0:0[v1];"
    f"[v1][kw1]overlay=0:0[v2];"
    f"[v2][kw2]overlay=0:0[v3];"
    f"[v3][kw3]overlay=0:0[vout]"
)

run([
    FFMPEG, '-y',
    '-i', raw_clips[3],
    '-i', png4_title,
    '-i', png4_predict,
    '-i', png4_optimise,
    '-i', png4_scale,
    '-filter_complex', fc4,
    '-map', '[vout]', '-an',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-t', str(DUR),
    processed[3]
], 'Scene 4: AI Dashboard (multi-layer)')

# ── FINAL COMPOSITE: xfade transitions + fade-to-black ───────────────────────
print('\n=== Final composite ===')
o1 = round(DUR - XF, 4)
o2 = round(2 * DUR - 2 * XF, 4)
o3 = round(3 * DUR - 3 * XF, 4)
total = round(4 * DUR - 3 * XF, 4)
fade_out_start = round(total - 0.55, 4)

fc_final = (
    f"[0:v][1:v]xfade=transition=fade:duration={XF}:offset={o1}[v01];"
    f"[v01][2:v]xfade=transition=fade:duration={XF}:offset={o2}[v012];"
    f"[v012][3:v]xfade=transition=fade:duration={XF}:offset={o3},"
    f"fade=t=out:st={fade_out_start}:d=0.55[vout]"
)

run([
    FFMPEG, '-y',
    '-i', processed[0], '-i', processed[1], '-i', processed[2], '-i', processed[3],
    '-filter_complex', fc_final,
    '-map', '[vout]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15',
    '-profile:v', 'high', '-level', '4.2',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    OUT
], 'Final composite — xfade + fade-to-black')

# ── Summary ───────────────────────────────────────────────────────────────────
probe = subprocess.run([FFMPEG, '-i', OUT], capture_output=True, text=True)
for line in probe.stderr.split('\n'):
    if 'Duration' in line:
        print(f'\n  {line.strip()}')
        break
size_mb = os.path.getsize(OUT) / 1_048_576
print(f'  Output : {OUT}')
print(f'  Size   : {size_mb:.1f} MB')
print('\n  SuperScale SuperAI cinematic spot — DONE!\n')
