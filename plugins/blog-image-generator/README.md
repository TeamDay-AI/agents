# Blog Image Generator

AI-powered blog cover image generation using FAL AI's Flux 2 model. Perfect for creating professional 16:9 landscape images for blog headers, social media, and marketing content.

## Features

- **High-Quality Generation**: Uses FAL AI Flux 2 Flex model
- **Blog-Optimized**: 16:9 landscape format (1456×816px typical)
- **Fast**: ~30 seconds generation time
- **Prompt Expansion**: AI automatically improves your prompts
- **Conversational**: Use with Claude Code for easy image creation

## Installation

```bash
/plugin install blog-image-generator@TeamDay-AI
```

## Setup

### 1. Get FAL AI API Key

1. Visit [https://fal.ai/dashboard/keys](https://fal.ai/dashboard/keys)
2. Create an account or sign in
3. Generate an API key

### 2. Configure Environment

```bash
export FAL_KEY='your-fal-api-key-here'
```

Or create a `.env` file:
```env
FAL_KEY=your-fal-api-key-here
BLOG_IMAGE_OUTPUT_DIR=./output  # Optional
```

### 3. Install Dependencies

```bash
bun install @fal-ai/client
```

## Usage

### Via Claude (Conversational)

```
Claude, generate a blog image for "AI compliance automation"
```

Claude will:
1. Craft an appropriate prompt based on your topic
2. Generate the image using FAL AI
3. Save it to your output directory
4. Tell you how to use it in your blog

### Via Command Line

```bash
bun scripts/generate-image.ts "prompt" output-filename.webp
```

**Example**:
```bash
bun scripts/generate-image.ts \
  "Conceptual illustration of AI agents working together, modern tech aesthetic, professional lighting" \
  ai-agents-cover.webp
```

## Crafting Effective Prompts

### Structure

```
[Subject] + [Style] + [Mood/Lighting] + [Composition]
```

### Examples

**AI/Tech Content**:
```
"Conceptual illustration of neural networks connecting and collaborating,
glowing blue and orange data streams, modern tech aesthetic,
professional lighting, represents AI and learning"
```

**Business Content**:
```
"Minimalist illustration of business growth and collaboration,
geometric shapes connecting upward, professional blues and greens,
clean modern style"
```

**Tutorial Content**:
```
"Isometric 3D illustration showing step-by-step workflow,
bright vibrant colors, clean lines, educational infographic style,
soft shadows and professional lighting"
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

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FAL_KEY` | ✅ Yes | - | Your FAL AI API key |
| `BLOG_IMAGE_OUTPUT_DIR` | No | `./output` | Where to save generated images |

### Output Format

- **Format**: WebP (optimized for web)
- **Aspect Ratio**: 16:9 landscape
- **Typical Dimensions**: 1456×816px
- **File Naming**: Use kebab-case (e.g., `my-blog-cover.webp`)

## Examples

### Generate Marketing Image

```bash
bun scripts/generate-image.ts \
  "Professional team collaboration in modern office, diverse people working with AI technology, bright natural lighting, inspiring and innovative atmosphere" \
  team-collaboration.webp
```

### Generate Technical Illustration

```bash
bun scripts/generate-image.ts \
  "Isometric 3D illustration of cloud infrastructure and microservices, colorful geometric shapes representing servers and databases, clean modern tech aesthetic" \
  cloud-architecture.webp
```

### Use in Blog Markdown

After generation, reference in your blog's frontmatter:

```markdown
---
title: "My Blog Post"
image: /images/my-cover.webp
cover: /images/my-cover.webp
---
```

## Troubleshooting

### "FAL_KEY environment variable not set"

**Solution**: Export your FAL AI API key:
```bash
export FAL_KEY='your-api-key'
```

### Image quality is poor

**Solutions**:
- Make your prompt more specific and detailed
- Add style descriptors: "high quality", "professional", "detailed"
- Specify lighting conditions explicitly
- Reference well-known visual styles

### Wrong aspect ratio

The tool uses 16:9 landscape by default (optimized for blog headers). This cannot be changed as it's the ideal format for blog covers.

### Generation fails

**Common causes**:
- Invalid FAL API key
- Network connectivity issues
- FAL AI service outage

**Check**:
1. Verify API key is correct
2. Test network connection
3. Visit [FAL AI status page](https://status.fal.ai)

## Cost

FAL AI pricing varies by model and usage. Flux 2 Flex typically costs:
- ~$0.03-0.05 per image
- Very affordable for blog content creation

Check current pricing at [https://fal.ai/pricing](https://fal.ai/pricing)

## License

MIT License - see [LICENSE](../LICENSE)

## Contributing

Contributions welcome! Please submit issues and pull requests to [TeamDay-AI/agents](https://github.com/TeamDay-AI/agents).

## Support

- **Issues**: [GitHub Issues](https://github.com/TeamDay-AI/agents/issues)
- **Questions**: support@teamday.ai

## Related

- [Compliance Agents Plugin](../compliance-agents) - SOC 2 compliance automation
- [TeamDay Platform](https://teamday.ai) - AI-native team collaboration

---

Built by [TeamDay](https://teamday.ai) - Making AI agents accessible to everyone.
