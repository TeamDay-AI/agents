#!/usr/bin/env python3
"""
SuperScale SuperAI — GTA Mobile-Ad Compositor
Punch cuts, black flash frames, MISSION PASSED card, TAP NOW CTA.
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
OUT  = f'{BASE}/superscale_gta_ad.mp4'

FONT_B  = '/usr/share/fonts/truetype/lato/Lato-Bold.ttf'
FONT_R  = '/usr/share/fonts/truetype/lato/Lato-Regular.ttf'

FPS = 24
W, H = 1920, 1080

raw = {
    'la':    f'{S}/gta1_raw.mp4',
    'vegas': f'{S}/gta2_raw.mp4',
    'party': f'{S}/gta3_raw.mp4',
    'cta':   f'{S}/gta4_raw.mp4',
}


def run(cmd, label):
    print(f'\n>>> {label}')
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print('STDERR:', r.stderr[-3000:])
        sys.exit(1)
    print('    OK')


# ── Step 1: Trim & scale all clips ───────────────────────────────────────────
clips = {
    'la':    (f'{S}/g1.mp4', 3.2),   # LA mission
    'vegas': (f'{S}/g2.mp4', 2.8),   # Vegas arrival
    'party': (f'{S}/g3.mp4', 3.0),   # Party / networking
    'cta':   (f'{S}/g4.mp4', 3.5),   # CTA end card
}

scale_vf = (
    f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
    f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,fps={FPS},setsar=1"
)

for key, (out_path, dur) in clips.items():
    vf = f"trim=0:{dur},setpts=PTS-STARTPTS,{scale_vf}"
    run([FFMPEG, '-y', '-i', raw[key], '-vf', vf, '-an',
         '-c:v', 'libx264', '-preset', 'fast', '-crf', '17',
         '-t', str(dur), out_path],
        f'Trim/scale {key} → {dur}s')


# ── Step 2: Render special interstitial frames ────────────────────────────────

def make_mission_passed(path):
    """Classic GTA gold 'MISSION PASSED' card on black — 24 frames = 1s."""
    img  = Image.new('RGB', (W, H), (0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Gold main text
    font_xl = ImageFont.truetype(FONT_B, 110)
    font_sm = ImageFont.truetype(FONT_R, 38)
    font_md = ImageFont.truetype(FONT_B, 54)

    title = 'MISSION PASSED'
    bb = draw.textbbox((0, 0), title, font=font_xl)
    tw = bb[2] - bb[0]
    # Gold gradient look — draw shadow then gold
    draw.text(((W - tw) // 2 + 5, H // 2 - 90), title,
              font=font_xl, fill=(120, 80, 0))
    draw.text(((W - tw) // 2, H // 2 - 95), title,
              font=font_xl, fill=(255, 210, 40))

    # Sub-line
    sub = 'SuperScale SuperAI Unlocked  •  +9999 XP'
    bb2 = draw.textbbox((0, 0), sub, font=font_sm)
    tw2 = bb2[2] - bb2[0]
    draw.text(((W - tw2) // 2, H // 2 + 40), sub,
              font=font_sm, fill=(200, 200, 200))

    # Thin gold rule above
    draw.rectangle([(W // 2 - 420, H // 2 - 108),
                    (W // 2 + 420, H // 2 - 100)],
                   fill=(255, 190, 30))
    img.save(path)


def make_tap_overlay(path):
    """'► TAP NOW' pill badge to overlay on CTA."""
    img  = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT_B, 52)
    txt  = '► TAP TO CONNECT'
    bb   = draw.textbbox((0, 0), txt, font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    pad = 28
    bx  = (W - tw) // 2
    by  = int(H * 0.87)
    # Pill background
    draw.rounded_rectangle(
        [bx - pad, by - pad // 2, bx + tw + pad, by + th + pad // 2],
        radius=40, fill=(255, 180, 0, 230)
    )
    # Shadow + text
    draw.text((bx + 2, by + 2), txt, font=font, fill=(100, 60, 0, 200))
    draw.text((bx, by), txt, font=font, fill=(20, 10, 0, 255))
    img.save(path)


passed_png = f'{S}/mission_passed.png'
tap_png    = f'{S}/tap_overlay.png'
make_mission_passed(passed_png)
make_tap_overlay(tap_png)
print('\nInterstitial frames rendered.')

# ── Step 3: Make MISSION PASSED clip (1.1s, fade in+out) ────────────────────
passed_mp4 = f'{S}/mission_passed.mp4'
run([
    FFMPEG, '-y',
    '-loop', '1', '-i', passed_png,
    '-vf', f'fps={FPS},fade=t=in:st=0:d=0.18,fade=t=out:st=0.9:d=0.2',
    '-t', '1.1',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '17',
    '-pix_fmt', 'yuv420p', passed_mp4
], 'MISSION PASSED clip')

# ── Step 4: Overlay TAP NOW badge on CTA clip ────────────────────────────────
cta_final = f'{S}/g4_tap.mp4'
run([
    FFMPEG, '-y',
    '-i', clips['cta'][0],
    '-i', tap_png,
    '-filter_complex',
    (
        '[1:v]format=rgba,'
        'fade=t=in:st=0.6:d=0.3:alpha=1,'
        'fade=t=out:st=3.1:d=0.35:alpha=1[badge];'
        '[0:v][badge]overlay=0:0[vout]'
    ),
    '-map', '[vout]', '-an',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '17',
    '-t', '3.5', cta_final
], 'CTA + TAP NOW overlay')

# ── Step 5: Black-flash micro-clips (0.12s) between scenes ──────────────────
flash_mp4 = f'{S}/flash.mp4'
run([
    FFMPEG, '-y',
    '-f', 'lavfi', '-i', f'color=c=black:s={W}x{H}:r={FPS}',
    '-t', '0.12',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '17',
    '-pix_fmt', 'yuv420p', flash_mp4
], 'Black flash clip')

# ── Step 6: Concat everything ────────────────────────────────────────────────
# Sequence: LA | flash | VEGAS | flash | PARTY | MISSION PASSED | CTA+TAP
segment_files = [
    clips['la'][0],    # 3.2s
    flash_mp4,         # 0.12s
    clips['vegas'][0], # 2.8s
    flash_mp4,         # 0.12s
    clips['party'][0], # 3.0s
    passed_mp4,        # 1.1s
    cta_final,         # 3.5s
]

# Write concat list
concat_txt = f'{S}/concat.txt'
with open(concat_txt, 'w') as f:
    for p in segment_files:
        f.write(f"file '{p}'\n")

run([
    FFMPEG, '-y',
    '-f', 'concat', '-safe', '0', '-i', concat_txt,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15',
    '-profile:v', 'high', '-level', '4.2',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    OUT
], 'Final concat render')

# ── Summary ───────────────────────────────────────────────────────────────────
probe = subprocess.run([FFMPEG, '-i', OUT], capture_output=True, text=True)
for line in probe.stderr.split('\n'):
    if 'Duration' in line:
        print(f'\n  {line.strip()}')
        break
size_mb = os.path.getsize(OUT) / 1_048_576
print(f'  Output : {OUT}')
print(f'  Size   : {size_mb:.1f} MB')
print('\n  GTA Mobile Ad — DONE!\n')
