#!/usr/bin/env bun
/**
 * Blog Image Generator (OpenAI - GPT Image 1.5)
 *
 * Generates images using OpenAI's gpt-image-1.5 model
 *
 * Usage: bun .claude/skills/blog-image-generation/scripts/generate-image-openai.ts "prompt" output-filename.webp [options]
 *
 * Options:
 *   --quality=QUALITY   Quality level: low (fast), medium, high, auto (default: high)
 *   --size=SIZE         Dimensions: 1024x1024, 1536x1024 (landscape), 1024x1536 (portrait), auto (default: 1536x1024)
 *   --n=COUNT           Number of variations to generate (default: 1)
 *
 * Key capabilities (gpt-image-1.5):
 *   - High-fidelity photorealism with natural lighting
 *   - Reliable text rendering with crisp lettering
 *   - Complex structured visuals (infographics, diagrams, multi-panel)
 *   - Strong identity/facial preservation in edits
 *   - Style transfer and real-world knowledge
 */

import OpenAI from "openai";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { execSync } from "child_process";

const VALID_QUALITIES = ["low", "medium", "high", "auto"];
const VALID_SIZES = ["1024x1024", "1536x1024", "1024x1536", "auto"];

interface GenerateOptions {
  quality: "low" | "medium" | "high" | "auto";
  size: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
  n: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateBlogImage(prompt: string, outputFilename: string, options: GenerateOptions) {
  const { quality, size, n } = options;

  console.log(`\n🎨 Generating image with OpenAI (gpt-image-1.5):`);
  console.log(`   "${prompt}"`);
  console.log(`   Quality: ${quality}, Size: ${size}${n > 1 ? `, Variations: ${n}` : ""}\n`);

  try {
    const result = await openai.images.generate({
      model: "gpt-image-1.5",
      prompt,
      size,
      quality,
      n
    });

    console.log(`✅ Generated ${result.data.length} image(s)\n`);

    const outputDir = join(process.cwd(), "packages/marketing/public/images");

    // Save all generated images
    for (let i = 0; i < result.data.length; i++) {
      const imageData = result.data[i];
      let buffer: Buffer;

      if (imageData.b64_json) {
        buffer = Buffer.from(imageData.b64_json, "base64");
      } else if (imageData.url) {
        // Download from URL
        const response = await fetch(imageData.url);
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        console.error("No image data in response");
        continue;
      }

      // Add index suffix if multiple images
      let finalFilename = outputFilename;
      if (result.data.length > 1) {
        const ext = outputFilename.substring(outputFilename.lastIndexOf("."));
        const base = outputFilename.substring(0, outputFilename.lastIndexOf("."));
        finalFilename = `${base}-${i + 1}${ext}`;
      }

      const outputPath = join(outputDir, finalFilename);

      // Convert to WebP if filename ends with .webp (OpenAI returns PNG)
      if (finalFilename.toLowerCase().endsWith('.webp')) {
        const tempPngPath = outputPath.replace(/\.webp$/i, '-temp.png');
        await writeFile(tempPngPath, buffer);

        try {
          execSync(`cwebp -q 85 "${tempPngPath}" -o "${outputPath}"`, { stdio: 'pipe' });
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

// Helper to parse --key=value args
const getArg = (prefix: string): string | undefined => {
  const arg = args.find(a => a.startsWith(`--${prefix}=`));
  return arg?.split("=")[1];
};

// Parse options with defaults
let quality = (getArg("quality") || "high") as GenerateOptions["quality"];
let size = (getArg("size") || "1536x1024") as GenerateOptions["size"];
let n = parseInt(getArg("n") || "1", 10);

// Validate quality
if (!VALID_QUALITIES.includes(quality)) {
  console.error(`❌ Invalid quality: ${quality}`);
  console.error(`   Valid options: ${VALID_QUALITIES.join(", ")}`);
  process.exit(1);
}

// Validate size
if (!VALID_SIZES.includes(size)) {
  console.error(`❌ Invalid size: ${size}`);
  console.error(`   Valid options: ${VALID_SIZES.join(", ")}`);
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
Usage: bun .claude/skills/blog-image-generation/scripts/generate-image-openai.ts "prompt" output-filename.webp [options]

Options:
  --quality=QUALITY   Quality level (default: high)
                        - low: Fast generation, good for iteration
                        - medium: Balanced quality/speed
                        - high: Best quality, slower
                        - auto: Model decides based on prompt
  --size=SIZE         Image dimensions (default: 1536x1024)
                        - 1024x1024 (square)
                        - 1536x1024 (landscape, good for blog headers)
                        - 1024x1536 (portrait)
                        - auto: Model decides
  --n=COUNT           Generate multiple variations, 1-10 (default: 1)

Environment:
  OPENAI_API_KEY must be set

Examples:
  # Blog header (landscape, high quality)
  bun .../generate-image-openai.ts "A futuristic AI brain" ai-brain.webp

  # Fast iteration (low quality)
  bun .../generate-image-openai.ts "Product mockup" mockup.webp --quality=low

  # Square image
  bun .../generate-image-openai.ts "App icon design" icon.webp --size=1024x1024

  # Generate 4 logo variations
  bun .../generate-image-openai.ts "Logo for coffee shop called Bean & Brew" logo.webp --n=4 --size=1024x1024

Prompting Tips (gpt-image-1.5):
  - Structure: background/scene → subject → details → constraints
  - Be specific: materials, textures, lighting, camera angle
  - For text in images: use quotes, spell out unusual words
  - Add constraints: "no watermark", "no extra text", "preserve identity"
  - Quality low is often sufficient and much faster

Output: packages/marketing/public/images/
  `);
  process.exit(1);
}

const [prompt, filename] = filteredArgs;
generateBlogImage(prompt, filename, { quality, size, n });
