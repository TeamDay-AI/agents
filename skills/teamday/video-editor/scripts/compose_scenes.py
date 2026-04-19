#!/usr/bin/env python3
"""
Compose multiple video clips into a cinematic scene sequence.

Library API (import-friendly) + CLI. Ports Jam/SuperScale's compose_premium.py
pattern into a reusable module. Each scene can have its own colour grade,
text overlay, and transition style.

Usage as library:

    from compose_scenes import Scene, compose

    scenes = [
        Scene('raw/s1.mp4', title='Your team', subtitle='is always on.',
              contrast=1.35, sat=1.2, bright=-0.04,
              r_curve='0/0 0.4/0.32 1/0.88',
              g_curve='0/0 0.45/0.48 1/0.92',
              b_curve='0/0.05 0.35/0.45 0.75/0.9 1/0.98',
              vignette=True),
        Scene('raw/s2.mp4', title='You lead.', subtitle='They work.',
              contrast=1.4, sat=1.35, bright=-0.02,
              r_curve='0/0.02 0.5/0.5 1/0.94',
              g_curve='0/0 0.5/0.5 1/0.92',
              b_curve='0/0.08 0.45/0.6 1/1'),
    ]
    compose(scenes, out='final.mp4', endcard='endcard.mp4',
            dur=4.0, xfade=0.45, fps=24, W=1920, H=1080)

CLI:
    python3 compose_scenes.py config.json
"""
import os, subprocess, sys, shutil, json
from dataclasses import dataclass, field
from typing import Optional, List
from PIL import Image, ImageDraw, ImageFont

FFMPEG = shutil.which('ffmpeg') or '/opt/homebrew/bin/ffmpeg'

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(os.path.dirname(HERE), 'assets', 'fonts')
FONT_B_DEFAULT = os.path.join(FONT_DIR, 'Inter-Bold.otf')
FONT_M_DEFAULT = os.path.join(FONT_DIR, 'Inter-Medium.otf')
FONT_R_DEFAULT = os.path.join(FONT_DIR, 'Inter-Regular.otf')


@dataclass
class Scene:
    video: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    title_size: int = 78
    subtitle_size: int = 44
    y_frac: float = 0.74
    text_color: tuple = (255, 255, 255, 255)
    sub_color: tuple = (220, 220, 220, 220)
    # Color grade
    contrast: float = 1.3
    sat: float = 1.25
    bright: float = 0.0
    r_curve: str = '0/0 0.5/0.48 1/0.92'
    g_curve: str = '0/0 0.5/0.5 1/0.94'
    b_curve: str = '0/0.04 0.5/0.55 1/1'
    vignette: bool = False
    # Timing
    fade_in_t: float = 0.35
    fade_in_d: float = 0.55
    fade_out_d: float = 0.55


@dataclass
class ComposeOpts:
    out: str = 'final.mp4'
    endcard: Optional[str] = None
    dur: float = 4.0
    xfade: float = 0.45
    fps: int = 24
    W: int = 1920
    H: int = 1080
    tmp_dir: str = '.compose_tmp'
    font_bold: str = FONT_B_DEFAULT
    font_medium: str = FONT_M_DEFAULT
    font_regular: str = FONT_R_DEFAULT
    transitions: tuple = ('fade', 'dissolve', 'fade', 'dissolve', 'fadeblack')


def _run(cmd, label=''):
    if label:
        print(f'>>> {label}')
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print('STDERR:', r.stderr[-3500:], file=sys.stderr)
        sys.exit(1)


def make_text_png(path: str, title: Optional[str], subtitle: Optional[str],
                  title_size: int, subtitle_size: int,
                  y_frac: float, text_color: tuple, sub_color: tuple,
                  W: int, H: int,
                  font_bold: str, font_regular: str,
                  rule: bool = False,
                  rule_color: tuple = (255, 190, 80, 220),
                  rule_width: int = 420):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    lines = []
    if title:
        lines.append((title, ImageFont.truetype(font_bold, title_size), text_color))
    # Measure title block
    title_h = 0
    if lines:
        bb = draw.textbbox((0, 0), lines[0][0], font=lines[0][1])
        title_h = bb[3] - bb[1]

    y = int(H * y_frac) - title_h // 2
    if title:
        font = lines[0][1]
        bb = draw.textbbox((0, 0), title, font=font)
        tw = bb[2] - bb[0]
        x = (W - tw) // 2
        draw.text((x + 3, y + 3), title, font=font, fill=(0, 0, 0, 170))
        draw.text((x, y), title, font=font, fill=text_color)
        y += title_h + 18

    if rule:
        ry = y + 6
        draw.rectangle([(W // 2 - rule_width // 2, ry),
                        (W // 2 + rule_width // 2, ry + 3)], fill=rule_color)
        y = ry + 10

    if subtitle:
        sub_font = ImageFont.truetype(font_regular, subtitle_size)
        bb = draw.textbbox((0, 0), subtitle, font=sub_font)
        tw = bb[2] - bb[0]
        x = (W - tw) // 2
        sy = y + 18
        draw.text((x + 1, sy + 1), subtitle, font=sub_font, fill=(0, 0, 0, 160))
        draw.text((x, sy), subtitle, font=sub_font, fill=sub_color)

    img.save(path)
    return path


def _base_vf(scene: Scene, opts: ComposeOpts) -> str:
    chain = (
        f"trim=0:{opts.dur},setpts=PTS-STARTPTS,"
        f"scale={opts.W}:{opts.H}:force_original_aspect_ratio=increase,"
        f"crop={opts.W}:{opts.H},"
        f"fps={opts.fps},setsar=1,"
        f"eq=contrast={scene.contrast}:saturation={scene.sat}:brightness={scene.bright},"
        f"curves=r='{scene.r_curve}':g='{scene.g_curve}':b='{scene.b_curve}'"
    )
    if scene.vignette:
        chain += ',vignette=PI/5'
    return chain


def _overlay(scene: Scene, text_png: str, out: str, opts: ComposeOpts):
    vf = _base_vf(scene, opts)
    fade_out_t = opts.dur - scene.fade_out_d - 0.15
    text_chain = (
        f"[1:v]format=rgba,"
        f"fade=t=in:st={scene.fade_in_t}:d={scene.fade_in_d}:alpha=1,"
        f"fade=t=out:st={fade_out_t}:d={scene.fade_out_d}:alpha=1[txt]"
    )
    video_chain = f"[0:v]{vf}[vg];[vg][txt]overlay=0:0[vout]"
    _run([
        FFMPEG, '-y', '-i', scene.video, '-i', text_png,
        '-filter_complex', f"{text_chain};{video_chain}",
        '-map', '[vout]', '-an',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '16',
        '-t', str(opts.dur),
        out,
    ], f'grade+text → {os.path.basename(out)}')


def compose(scenes: List[Scene], **kwargs):
    opts = ComposeOpts(**kwargs)
    os.makedirs(opts.tmp_dir, exist_ok=True)

    processed = []
    for i, sc in enumerate(scenes):
        text_png = os.path.join(opts.tmp_dir, f't{i+1}.png')
        if sc.title or sc.subtitle:
            make_text_png(text_png, sc.title, sc.subtitle,
                          sc.title_size, sc.subtitle_size,
                          sc.y_frac, sc.text_color, sc.sub_color,
                          opts.W, opts.H, opts.font_bold, opts.font_regular)
        out_mp4 = os.path.join(opts.tmp_dir, f'p{i+1}.mp4')
        if sc.title or sc.subtitle:
            _overlay(sc, text_png, out_mp4, opts)
        else:
            # No overlay — grade only
            vf = _base_vf(sc, opts)
            _run([FFMPEG, '-y', '-i', sc.video, '-vf', vf, '-an',
                  '-c:v', 'libx264', '-preset', 'fast', '-crf', '16',
                  '-t', str(opts.dur), out_mp4],
                 f'grade-only → {os.path.basename(out_mp4)}')
        processed.append(out_mp4)

    # Assemble xfade chain
    inputs = []
    for p in processed:
        inputs += ['-i', p]
    if opts.endcard:
        inputs += ['-i', opts.endcard]
        all_clips = processed + [opts.endcard]
    else:
        all_clips = processed

    n = len(all_clips)
    fc = []
    prev_label = '[0:v]'
    for i in range(1, n):
        offset = round(i * opts.dur - i * opts.xfade, 4)
        trans = opts.transitions[(i - 1) % len(opts.transitions)]
        out_label = f'[v{i}]' if i < n - 1 else '[vout]'
        fc.append(f"{prev_label}[{i}:v]xfade=transition={trans}:duration={opts.xfade}:offset={offset}{out_label}")
        prev_label = out_label

    _run([
        FFMPEG, '-y', *inputs,
        '-filter_complex', ';'.join(fc),
        '-map', '[vout]',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '14',
        '-profile:v', 'high', '-level', '4.2',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        opts.out,
    ], f'final → {opts.out}')

    size_mb = os.path.getsize(opts.out) / 1_048_576
    print(f'\n✓ Done: {opts.out} ({size_mb:.1f} MB)')


def _scenes_from_json(cfg: dict) -> tuple:
    scenes = [Scene(**s) for s in cfg['scenes']]
    opts_kwargs = {k: v for k, v in cfg.items() if k != 'scenes'}
    return scenes, opts_kwargs


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Usage: compose_scenes.py config.json', file=sys.stderr)
        sys.exit(2)
    with open(sys.argv[1]) as f:
        cfg = json.load(f)
    scenes, opts_kwargs = _scenes_from_json(cfg)
    compose(scenes, **opts_kwargs)
