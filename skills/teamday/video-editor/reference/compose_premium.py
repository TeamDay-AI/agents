#!/usr/bin/env python3
"""
SuperScale SuperAI — Premium AI Cinematic Showcase Compositor
Seedance 2.0 footage · cinematic grade · xfade transitions · text overlays
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
OUT  = f'{BASE}/superscale_premium_showcase.mp4'

FONT_B = '/usr/share/fonts/truetype/lato/Lato-Bold.ttf'
FONT_R = '/usr/share/fonts/truetype/lato/Lato-Regular.ttf'

DUR = 4.0    # seconds per clip
XF  = 0.4    # xfade overlap
FPS = 24
W, H = 1920, 1080

raw_clips = [
    f'{S}/premium1_datacenter_raw.mp4',
    f'{S}/premium2_citydata_raw.mp4',
    f'{S}/premium3_dashboard_raw.mp4',
    f'{S}/premium4_human_ai_raw.mp4',
]
processed = [f'{S}/pr{i+1}.mp4' for i in range(4)]


def run(cmd, label):
    print(f'\n>>> {label}')
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print('STDERR:', r.stderr[-3000:])
        sys.exit(1)
    print('    OK')


# ── Text rendering helpers ──────────────────────────────────────────────────

def make_text_png(path, lines, font_path=FONT_B, font_size=72,
                  color=(255, 255, 255, 255), sub_lines=None,
                  sub_color=(200, 200, 200, 220), y_frac=0.76):
    img  = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(font_path, font_size)

    # Measure main block
    heights = [draw.textbbox((0,0), l, font=font)[3] - draw.textbbox((0,0), l, font=font)[1]
               for l in lines]
    spacing = int(font_size * 0.3)
    total_h = sum(heights) + spacing * (len(lines) - 1)
    y = int(H * y_frac) - total_h // 2

    for i, (line, lh) in enumerate(zip(lines, heights)):
        bb = draw.textbbox((0, 0), line, font=font)
        tw = bb[2] - bb[0]
        x  = (W - tw) // 2
        # Shadow
        draw.text((x + 3, y + 3), line, font=font, fill=(0, 0, 0, 160))
        draw.text((x, y), line, font=font, fill=color)
        y += lh + (spacing if i < len(lines) - 1 else 0)

    if sub_lines:
        sub_font = ImageFont.truetype(FONT_R, 32)
        sy = y + 22
        for sub in sub_lines:
            bb = draw.textbbox((0, 0), sub, font=sub_font)
            tw = bb[2] - bb[0]
            x  = (W - tw) // 2
            draw.text((x, sy), sub, font=sub_font, fill=sub_color)
            sy += 42

    img.save(path)
    return path


def make_accent_png(path, lines, accent_color=(0, 204, 255, 255),
                    font_size=64, y_frac=0.76):
    """Glowing cyan accent text for tech scenes."""
    img  = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT_B, font_size)
    glow = ImageFont.truetype(FONT_B, font_size)

    heights = [draw.textbbox((0,0), l, font=font)[3] - draw.textbbox((0,0), l, font=font)[1]
               for l in lines]
    spacing = int(font_size * 0.35)
    total_h = sum(heights) + spacing * (len(lines) - 1)
    y = int(H * y_frac) - total_h // 2

    for i, (line, lh) in enumerate(zip(lines, heights)):
        bb = draw.textbbox((0, 0), line, font=font)
        tw = bb[2] - bb[0]
        x  = (W - tw) // 2
        # Glow halo
        for dx, dy in [(-2,0),(2,0),(0,-2),(0,2),(-2,-2),(2,2)]:
            draw.text((x+dx, y+dy), line, font=glow, fill=(0, 180, 255, 60))
        # Shadow
        draw.text((x+3, y+3), line, font=font, fill=(0, 40, 80, 180))
        # Main
        draw.text((x, y), line, font=font, fill=accent_color)
        y += lh + (spacing if i < len(lines) - 1 else 0)

    img.save(path)
    return path


def base_vf(contrast, sat, bright, r_curve, g_curve, b_curve):
    return (
        f"trim=0:{DUR},setpts=PTS-STARTPTS,"
        f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
        f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,"
        f"fps={FPS},setsar=1,"
        f"eq=contrast={contrast}:saturation={sat}:brightness={bright},"
        f"curves=r='{r_curve}':g='{g_curve}':b='{b_curve}'"
    )


def overlay_text(video_in, text_png, video_out,
                 fade_in_t=0.3, fade_in_d=0.5,
                 fade_out_t=None, fade_out_d=0.5,
                 vf=''):
    if fade_out_t is None:
        fade_out_t = DUR - fade_out_d - 0.1

    text_chain = (
        f"[1:v]format=rgba,"
        f"fade=t=in:st={fade_in_t}:d={fade_in_d}:alpha=1,"
        f"fade=t=out:st={fade_out_t}:d={fade_out_d}:alpha=1[txt]"
    )
    if vf:
        video_chain = f"[0:v]{vf}[vg];[vg][txt]overlay=0:0[vout]"
    else:
        video_chain = f"[0:v][txt]overlay=0:0[vout]"

    run([
        FFMPEG, '-y', '-i', video_in, '-i', text_png,
        '-filter_complex', f"{text_chain};{video_chain}",
        '-map', '[vout]', '-an',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '16', '-t', str(DUR),
        video_out
    ], f'  overlay → {os.path.basename(video_out)}')


# ── SCENE 1: AI Data Center — deep blue/teal, high contrast ─────────────────
print('=== Scene 1: AI Data Center ===')
png1 = make_text_png(f'{S}/pr1_txt.png',
                     ['AI AT SCALE'],
                     font_size=96,
                     color=(255, 255, 255, 255),
                     sub_lines=['Next-generation compute infrastructure'],
                     y_frac=0.74)
vf1 = base_vf(1.4, 1.3, -0.04,
              '0/0 0.4/0.3 1/0.85',
              '0/0 0.45/0.48 1/0.92',
              '0/0.08 0.35/0.55 0.75/0.95 1/1')
overlay_text(raw_clips[0], png1, processed[0], vf=vf1)

# ── SCENE 2: City Data — warm teal-orange grade ──────────────────────────────
print('\n=== Scene 2: City Data ===')
png2 = make_text_png(f'{S}/pr2_txt.png',
                     ['EVERYWHERE YOU OPERATE'],
                     font_size=80,
                     color=(255, 230, 180, 255),
                     sub_lines=['Global reach · Real-time intelligence'],
                     y_frac=0.75)
vf2 = base_vf(1.3, 1.55, -0.02,
              '0/0.03 0.5/0.58 1/0.97',
              '0/0 0.5/0.48 1/0.9',
              '0/0.04 0.45/0.6 1/1')
overlay_text(raw_clips[1], png2, processed[1], vf=vf2)

# ── SCENE 3: AI Dashboard — cool blue, high-tech feel ───────────────────────
print('\n=== Scene 3: AI Dashboard ===')

def make_dashboard_png(path):
    img  = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font_lg = ImageFont.truetype(FONT_B, 80)
    font_sm = ImageFont.truetype(FONT_R, 32)

    # Main header
    title = 'PREDICT · OPTIMISE · SCALE'
    bb = draw.textbbox((0, 0), title, font=font_lg)
    tw = bb[2] - bb[0]
    x  = (W - tw) // 2
    y  = int(H * 0.71)
    draw.text((x+3, y+3), title, font=font_lg, fill=(0, 80, 150, 160))
    draw.text((x, y), title, font=font_lg, fill=(0, 204, 255, 255))

    # Sub-text
    sub = 'SuperScale SuperAI  ·  Live Intelligence'
    bb2 = draw.textbbox((0, 0), sub, font=font_sm)
    tw2 = bb2[2] - bb2[0]
    x2  = (W - tw2) // 2
    draw.text((x2, int(H * 0.84)), sub, font=font_sm, fill=(180, 220, 255, 200))
    img.save(path)

png3_path = f'{S}/pr3_txt.png'
make_dashboard_png(png3_path)
vf3 = base_vf(1.35, 1.2, 0.0,
              '0/0 0.55/0.45 1/0.82',
              '0/0 0.5/0.52 1/0.94',
              '0/0.07 0.4/0.65 1/1')
overlay_text(raw_clips[2], png3_path, processed[2], vf=vf3, fade_in_t=0.4)

# ── SCENE 4: Human + AI — warm golden hour, cinematic close ─────────────────
print('\n=== Scene 4: Human + AI ===')

def make_endcard_png(path):
    img  = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font_xl = ImageFont.truetype(FONT_B, 100)
    font_sm = ImageFont.truetype(FONT_R, 36)

    title = 'SUPERSCALE SUPERAI'
    bb = draw.textbbox((0, 0), title, font=font_xl)
    tw = bb[2] - bb[0]
    x  = (W - tw) // 2
    y  = int(H * 0.68)
    # Gold shadow + white text
    draw.text((x+4, y+4), title, font=font_xl, fill=(120, 70, 0, 180))
    draw.text((x, y), title, font=font_xl, fill=(255, 255, 255, 255))

    # Tagline
    tag = 'The AI platform built for performance marketers'
    bb2 = draw.textbbox((0, 0), tag, font=font_sm)
    tw2 = bb2[2] - bb2[0]
    x2  = (W - tw2) // 2
    draw.text((x2, int(H * 0.82)), tag, font=font_sm, fill=(255, 220, 160, 220))

    # Thin gold rule below title
    ry = int(H * 0.775)
    draw.rectangle([(W//2 - 380, ry), (W//2 + 380, ry + 2)], fill=(255, 190, 30, 200))
    img.save(path)

png4_path = f'{S}/pr4_txt.png'
make_endcard_png(png4_path)
vf4 = base_vf(1.25, 1.4, 0.03,
              '0/0.02 0.5/0.62 1/1',
              '0/0 0.5/0.5 1/0.9',
              '0/0 0.5/0.35 1/0.78')
overlay_text(raw_clips[3], png4_path, processed[3], vf=vf4, fade_in_t=0.5, fade_in_d=0.6)

# ── FINAL COMPOSITE: xfade + fade-to-black ──────────────────────────────────
print('\n=== Final composite ===')
o1 = round(DUR - XF, 4)
o2 = round(2 * DUR - 2 * XF, 4)
o3 = round(3 * DUR - 3 * XF, 4)
total = round(4 * DUR - 3 * XF, 4)
fade_out_start = round(total - 0.6, 4)

fc_final = (
    f"[0:v][1:v]xfade=transition=fade:duration={XF}:offset={o1}[v01];"
    f"[v01][2:v]xfade=transition=dissolve:duration={XF}:offset={o2}[v012];"
    f"[v012][3:v]xfade=transition=fade:duration={XF}:offset={o3},"
    f"fade=t=out:st={fade_out_start}:d=0.6[vout]"
)

run([
    FFMPEG, '-y',
    '-i', processed[0], '-i', processed[1], '-i', processed[2], '-i', processed[3],
    '-filter_complex', fc_final,
    '-map', '[vout]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14',
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
print('\n  Premium AI Cinematic Showcase — DONE!\n')
