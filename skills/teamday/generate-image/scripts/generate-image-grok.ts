#!/usr/bin/env bun
/**
 * Image Generator (xAI Grok)
 *
 * Generates images using xAI's Grok image models.
 *
 * Usage: bun .claude/skills/generate-image/scripts/generate-image-grok.ts "prompt" output-filename.webp [options]
 *
 * Options:
 *   --model=MODEL       grok-imagine-image (default), grok-imagine-image-pro, grok-2-image-1212
 *   --pro               Shortcut for grok-imagine-image-pro
 *   --aspect=RATIO      1:1, 16:9 (default), 9:16, 4:3, 3:4
 *   --resolution=RES    1k (default), 2k
 *   --n=COUNT           Number of variations to generate, 1-10 (default: 1)
 *
 * Key capabilities:
 *   - Fast, affordable image generation ($0.02/image base, $0.07/pro)
 *   - Good at creative/stylistic images
 *   - Multiple aspect ratios
 *   - Batch generation (up to 10 variations)
 */

import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { execSync } from "child_process";

const VALID_MODELS = ["grok-imagine-image", "grok-imagine-image-pro", "grok-2-image-1212"];
const VALID_ASPECTS = ["1:1", "16:9", "9:16", "4:3", "3:4"];
const VALID_RESOLUTIONS = ["1k", "2k"];

interface GenerateOptions {
  model: string;
  aspect: string;
  resolution: string;
  n: number;
}

async function generateImage(prompt: string, outputFilename: string, options: GenerateOptions) {
  const { model, aspect, resolution, n } = options;
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    console.error("❌ XAI_API_KEY environment variable is not set");
    process.exit(1);
  }

  console.log(`\n🎨 Generating image with xAI Grok (${model}):`);
  console.log(`   "${prompt}"`);
  console.log(`   Aspect: ${aspect}, Resolution: ${resolution}${n > 1 ? `, Variations: ${n}` : ""}\n`);

  try {
    const response = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        n,
        aspect_ratio: aspect,
        response_format: "url",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ xAI API error (${response.status}): ${errText}`);
      process.exit(1);
    }

    const result = await response.json() as { data?: Array<{ url?: string }> };
    const images = result.data || [];

    if (images.length === 0) {
      console.error("❌ xAI returned no images");
      process.exit(1);
    }

    console.log(`✅ Generated ${images.length} image(s)\n`);

    const outputDir = join(process.cwd(), "packages/marketing/public/images");

    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i].url;
      if (!imageUrl) {
        console.error(`⚠️  Image ${i + 1} has no URL, skipping`);
        continue;
      }

      // Download image from temp URL
      const imgResponse = await fetch(imageUrl);
      const buffer = Buffer.from(await imgResponse.arrayBuffer());

      // Add index suffix if multiple images
      let finalFilename = outputFilename;
      if (images.length > 1) {
        const ext = outputFilename.substring(outputFilename.lastIndexOf("."));
        const base = outputFilename.substring(0, outputFilename.lastIndexOf("."));
        finalFilename = `${base}-${i + 1}${ext}`;
      }

      const outputPath = join(outputDir, finalFilename);

      // Convert to WebP if filename ends with .webp
      if (finalFilename.toLowerCase().endsWith(".webp")) {
        const tempPngPath = outputPath.replace(/\.webp$/i, "-temp.png");
        await writeFile(tempPngPath, buffer);

        try {
          execSync(`cwebp -q 85 "${tempPngPath}" -o "${outputPath}"`, { stdio: "pipe" });
          await unlink(tempPngPath);
          console.log(`✅ Converted to WebP: ${outputPath}`);
        } catch {
          console.warn(`⚠️  cwebp not found, saving as PNG with .webp extension`);
          await writeFile(outputPath, buffer);
        }
      } else {
        await writeFile(outputPath, buffer);
        console.log(`✅ Saved: ${outputPath}`);
      }
      console.log(`📝 Markdown: /images/${finalFilename}`);
    }

    console.log();
    return outputDir;
  } catch (error) {
    console.error("❌ Error generating image:", error);
    throw error;
  }
}

// CLI interface
const args = process.argv.slice(2);

const getArg = (prefix: string): string | undefined => {
  const arg = args.find(a => a.startsWith(`--${prefix}=`));
  return arg?.split("=")[1];
};

const hasFlag = (flag: string): boolean => args.includes(`--${flag}`);

// Parse options with defaults
let model = getArg("model") || (hasFlag("pro") ? "grok-imagine-image-pro" : "grok-imagine-image");
let aspect = getArg("aspect") || "16:9";
let resolution = getArg("resolution") || "1k";
let n = parseInt(getArg("n") || "1", 10);

// Validate model
if (!VALID_MODELS.includes(model)) {
  console.error(`❌ Invalid model: ${model}`);
  console.error(`   Valid options: ${VALID_MODELS.join(", ")}`);
  process.exit(1);
}

// Validate aspect
if (!VALID_ASPECTS.includes(aspect)) {
  console.error(`❌ Invalid aspect ratio: ${aspect}`);
  console.error(`   Valid options: ${VALID_ASPECTS.join(", ")}`);
  process.exit(1);
}

// Validate resolution
if (!VALID_RESOLUTIONS.includes(resolution)) {
  console.error(`❌ Invalid resolution: ${resolution}`);
  console.error(`   Valid options: ${VALID_RESOLUTIONS.join(", ")}`);
  process.exit(1);
}

// Validate n
if (isNaN(n) || n < 1 || n > 10) {
  console.error(`❌ Invalid n: must be 1-10`);
  process.exit(1);
}

const filteredArgs = args.filter(arg => !arg.startsWith("--"));

if (filteredArgs.length < 2) {
  console.log(`
Usage: bun .claude/skills/generate-image/scripts/generate-image-grok.ts "prompt" output-filename.webp [options]

Options:
  --model=MODEL       Image model (default: grok-imagine-image)
                        - grok-imagine-image: Fast, affordable ($0.02/image)
                        - grok-imagine-image-pro: Higher quality ($0.07/image)
                        - grok-2-image-1212: Alternative model ($0.07/image)
  --pro               Shortcut for --model=grok-imagine-image-pro
  --aspect=RATIO      Aspect ratio (default: 16:9)
                        - 1:1 (square)
                        - 16:9 (landscape, good for blog headers)
                        - 9:16 (portrait/mobile)
                        - 4:3 (standard)
                        - 3:4 (portrait standard)
  --resolution=RES    Resolution: 1k (default), 2k
  --n=COUNT           Generate multiple variations, 1-10 (default: 1)

Environment:
  XAI_API_KEY must be set

Examples:
  # Blog header (landscape, default model)
  bun .../generate-image-grok.ts "A futuristic AI workspace" ai-workspace.webp

  # Pro quality
  bun .../generate-image-grok.ts "Product photography of headphones" headphones.webp --pro

  # Square avatar
  bun .../generate-image-grok.ts "Professional avatar, friendly smile" avatar.webp --aspect=1:1

  # Generate 4 variations
  bun .../generate-image-grok.ts "Logo for tech startup" logo.webp --n=4 --aspect=1:1

  # Portrait for social media
  bun .../generate-image-grok.ts "Motivational quote background" story-bg.webp --aspect=9:16

Output: packages/marketing/public/images/
  `);
  process.exit(1);
}

const [prompt, filename] = filteredArgs;
generateImage(prompt, filename, { model, aspect, resolution, n });
