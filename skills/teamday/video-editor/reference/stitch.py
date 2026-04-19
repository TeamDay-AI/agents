from moviepy import VideoFileClip, concatenate_videoclips
import os

base = "/data/sandbox/bU08FgGEE6e3zyxR84qF/spaces/s-LP8eJuL2eLHgB6dtsKkw/superscale"

# Optimal chain:
# 1. Hook (chaotic ad explosion)
# 2. AI Takeover (glitch → clean futuristic UI) — hard cut is perfect here
# 3. Scale Chained (generated from seg02 last frame — seamless continuation)
# 4. Resolution Chained (generated from seg03 last frame — seamless resolution)
segments = [
    "segment_01_hook.mp4",
    "segment_02_ai_takeover.mp4",
    "segment_02b_scale_chained.mp4",
    "segment_03b_resolution_chained.mp4",
]

clips = []
for seg in segments:
    path = os.path.join(base, seg)
    print(f"Loading: {seg}")
    clip = VideoFileClip(path)
    print(f"  → {clip.duration:.1f}s | {clip.size} | fps={clip.fps}")
    clips.append(clip)

print("\nConcatenating...")
final = concatenate_videoclips(clips, method="compose")
print(f"Total duration: {final.duration:.1f}s")

output = os.path.join(base, "superscale_ai_takeover_FINAL.mp4")
final.write_videofile(
    output,
    codec="libx264",
    audio_codec="aac",
    fps=24,
    preset="fast",
    logger="bar"
)

print(f"\nDone! Output: {output}")
for clip in clips:
    clip.close()
final.close()
