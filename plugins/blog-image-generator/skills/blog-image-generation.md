---
name: blog-image-generation
description: Generate AI images for blog posts and marketing content using FAL AI or OpenAI. Use when creating blog covers, illustrations, or visual content for articles. Works with landscape 16:9 format optimized for blog headers.
allowed-tools: Bash, Read, Write
---

# Blog Image Generation

Generate high-quality AI images for blog posts and marketing content.

## Quick Start

Generate a blog cover image:

```bash
bun .claude/skills/blog-image-generation/scripts/generate-image.ts "your detailed prompt" output-name.webp
```

Images save to: `packages/marketing/public/images/`

Use in blog markdown:
```yaml
image: /images/output-name.webp
cover: /images/output-name.webp
```

## When to Use

- Creating cover images for blog posts
- Generating illustrations for articles
- Visual metaphors for abstract concepts
- Marketing visuals for social media

## Crafting Effective Prompts

### Structure
```
[Subject] + [Style] + [Mood/Lighting] + [Composition]
```

### Examples

**AI/Tech Posts:**
```
"Conceptual illustration of large and small neural networks connecting and collaborating,
glowing blue and orange data streams between them, modern tech aesthetic,
professional lighting, represents AI memory and learning"
```

**Business Posts:**
```
"Minimalist illustration of business growth and collaboration, geometric shapes
connecting upward, professional color palette of blues and greens, clean modern style"
```

**Tutorial Posts:**
```
"Isometric 3D illustration showing step-by-step workflow, bright vibrant colors,
clean lines, educational infographic style, soft shadows and professional lighting"
```

### Prompt Tips

✅ **Do:**
- Be specific about style: "modern minimalist", "3D render", "conceptual illustration"
- Mention lighting: "soft professional lighting", "glowing tones", "dramatic backlight"
- Describe mood: "collaborative", "innovative", "calm and focused"
- Specify composition: "centered", "two elements connecting", "abstract visualization"

❌ **Avoid:**
- Vague descriptions: "nice image", "cool picture"
- Too many conflicting styles
- Overly complex scenes with many elements

## Available Generators

### Primary: FAL AI (Recommended)
- **Speed**: ~30 seconds
- **Quality**: High (Flux 2 Flex model)
- **Format**: Landscape 16:9, PNG output
- **Features**: Automatic prompt expansion
- **Script**: `scripts/generate-image.ts`

### Fallback: OpenAI
- **Model**: GPT Image 1
- **Format**: Base64 encoded, converted to WebP
- **Script**: `scripts/generate-image-openai.ts`
- **Requires**: OPENAI_API_KEY environment variable

## Instructions

### Step 1: Analyze Blog Content
1. Read the blog post or outline
2. Identify the core concept or theme
3. Determine visual metaphor or illustration style

### Step 2: Craft Detailed Prompt
1. Choose style (conceptual, 3D, minimalist, etc.)
2. Describe main elements (2-3 max)
3. Add mood/lighting descriptors
4. Specify composition

### Step 3: Generate Image
```bash
bun .claude/skills/blog-image-generation/scripts/generate-image.ts "prompt" filename.webp
```

### Step 4: Add to Blog Frontmatter
```yaml
---
title: "Your Blog Title"
image: /images/filename.webp
cover: /images/filename.webp
---
```

## Examples from Production

### Buddy Memory Blog
**Prompt:**
```
"Conceptual illustration of large and small neural networks connecting and
collaborating, glowing blue and orange data streams between them, modern tech
aesthetic, professional lighting, represents AI memory and learning"
```

**Output:** `buddy-memory.webp`
**Used in:** "Building Buddy: When Claude Built His Own Memory"

## Troubleshooting

### Image Generation Fails
- Check that bun is installed: `bun --version`
- Verify script path is correct
- Check API keys are configured

### Poor Quality Output
- Make prompt more specific and detailed
- Add style descriptors: "high quality", "professional", "detailed"
- Specify lighting conditions
- Use reference styles: "like a tech conference poster", "similar to Stripe's marketing"

### Wrong Aspect Ratio
- FAL AI script uses landscape_16_9 by default (perfect for blog covers)
- Don't try to specify different ratios - it's optimized for headers

## Technical Details

**Output Location:** `packages/marketing/public/images/`
**Format:** WebP (optimized for web)
**Dimensions:** 16:9 landscape (1456×816px typical)
**File Naming:** Use kebab-case: `my-blog-cover.webp`

## Script Reference

Both scripts located in: `.claude/skills/blog-image-generation/scripts/`

- `generate-image.ts` - FAL AI (primary)
- `generate-image-openai.ts` - OpenAI (fallback)

See script files for API configuration and advanced options.
