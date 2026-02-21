---
name: generate-image
description: Generate AI images using FAL AI, Gemini, OpenAI, or Grok (xAI). Use for blog covers, marketing visuals, social media content, or any image generation needs. Supports multiple aspect ratios and styles.
allowed-tools: Bash, Read, Write
env:
  - FAL_KEY
  - GEMINI_API_KEY
  - OPENAI_API_KEY
  - XAI_API_KEY
---

# AI Image Generation

Generate high-quality AI images for blog posts, marketing, and creative content.

## Quick Start

```bash
# FAL AI (primary - recommended)
bun .claude/skills/generate-image/scripts/generate-image.ts "your detailed prompt" output-name.webp

# Gemini (fast - default 16:9)
bun .claude/skills/generate-image/scripts/generate-image-gemini.ts "your prompt" output-name.webp

# Gemini with custom aspect ratio
bun .claude/skills/generate-image/scripts/generate-image-gemini.ts "your prompt" output-name.webp --aspect=1:1

# Gemini Pro (4K resolution)
bun .claude/skills/generate-image/scripts/generate-image-gemini.ts "your prompt" output-name.webp --pro --size=4K

# OpenAI (GPT Image 1.5)
bun .claude/skills/generate-image/scripts/generate-image-openai.ts "your prompt" output-name.webp

# OpenAI with variations
bun .claude/skills/generate-image/scripts/generate-image-openai.ts "Logo for coffee shop" logo.webp --n=4 --size=1024x1024

# Grok (xAI - affordable, fast)
bun .claude/skills/generate-image/scripts/generate-image-grok.ts "your prompt" output-name.webp

# Grok Pro (higher quality)
bun .claude/skills/generate-image/scripts/generate-image-grok.ts "your prompt" output-name.webp --pro
```

Images save to the current working directory by default. Set `BLOG_IMAGE_OUTPUT_DIR` to customize.

## When to Use

- Creating cover images for blog posts
- Generating illustrations for articles
- Visual metaphors for abstract concepts
- Marketing visuals for social media
- Logo concepts and variations

## Crafting Effective Prompts

### Structure
```
[Subject] + [Style] + [Mood/Lighting] + [Composition]
```

### Examples

**Tech/AI:**
```
"Conceptual illustration of neural networks connecting and collaborating,
glowing blue and orange data streams, modern tech aesthetic,
professional lighting"
```

**Business:**
```
"Minimalist illustration of business growth and collaboration, geometric shapes
connecting upward, professional color palette of blues and greens"
```

### Prompt Tips

- Be specific about style: "modern minimalist", "3D render", "conceptual illustration"
- Mention lighting: "soft professional lighting", "glowing tones", "dramatic backlight"
- Describe mood: "collaborative", "innovative", "calm and focused"
- Specify composition: "centered", "two elements connecting", "abstract visualization"
- Add constraints: "no watermark", "no text", "no logos"

### Advanced Prompting (GPT Image 1.5)

**For photorealism:** Use camera terms (lens, aperture, lighting)
```
"Shot with 50mm lens, shallow depth of field, soft natural lighting"
```

**For text in images:** Put text in quotes, specify typography
```
"Include the text 'HELLO WORLD' in bold sans-serif, centered"
```

**For logos:** Request multiple variations with `--n=4`

**Iterate, don't overload:** Start simple, then refine.

## Available Generators

### FAL AI (Recommended)
- **Speed**: ~30 seconds
- **Quality**: High (Flux 2 Flex model)
- **Format**: Landscape 16:9, PNG output
- **Features**: Automatic prompt expansion
- **Requires**: FAL_KEY

### Gemini (Google AI)
- **Models**: `gemini-2.5-flash-image` (default), `gemini-3-pro-image-preview` (`--pro`)
- **Options**: `--aspect=RATIO`, `--size=SIZE` (1K, 2K, 4K)
- **Features**: Text rendering, style transfer
- **Requires**: GEMINI_API_KEY

### OpenAI (GPT Image 1.5)
- **Options**: `--quality`, `--size`, `--n=COUNT` (1-10 variations)
- **Strengths**: Photorealism, text in images, infographics, logos
- **Requires**: OPENAI_API_KEY

### Grok (xAI)
- **Models**: `grok-imagine-image` (default, $0.02), `grok-imagine-image-pro` (`--pro`, $0.07)
- **Options**: `--aspect=RATIO`, `--resolution=RES`, `--n=COUNT`
- **Strengths**: Very affordable, fast, good creative output
- **Requires**: XAI_API_KEY

## Dependencies

Install required packages before using:

```bash
bun add @fal-ai/client @google/genai openai
```

Only install what you need — `@fal-ai/client` for FAL AI, `@google/genai` for Gemini, `openai` for OpenAI. Grok uses raw `fetch` and needs no extra package.

## Output

- **Format**: WebP (optimized for web)
- **Default Dimensions**: 16:9 landscape (1456x816px typical)
- **File Naming**: Use kebab-case: `my-image-name.webp`
