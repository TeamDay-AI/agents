#!/usr/bin/env bun
/**
 * Blog Image Generator (FAL AI - Primary)
 *
 * Generates high-quality images for blog posts using FAL AI's Flux 2 model
 * Usage: bun .claude/skills/blog-image-generation/scripts/generate-image.ts "prompt" output-filename.webp
 */

import { fal } from "@fal-ai/client";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { execSync } from "child_process";

// Configure FAL AI
const FAL_KEY = process.env.FAL_KEY;

if (!FAL_KEY) {
  console.error("❌ Error: FAL_KEY environment variable not set");
  console.error("Set it with: export FAL_KEY='your-fal-api-key'");
  process.exit(1);
}

fal.config({
  credentials: FAL_KEY
});

async function generateBlogImage(prompt: string, outputFilename: string) {
  console.log("🎨 Generating image with FAL AI (Flux 2):");
  console.log(`   "${prompt}"\n`);

  try {
    // Generate with Flux 2 Flex model
    const result: any = await fal.subscribe("fal-ai/flux-2-flex", {
      input: {
        prompt,
        image_size: "landscape_16_9", // Perfect for blog covers
        enable_prompt_expansion: true, // Let AI improve the prompt
        output_format: "png",
        num_inference_steps: 28,
        guidance_scale: 3.5
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log("⏳ Generating...");
        }
      }
    });

    console.log("✅ Image generated\n");

    // Download the image
    const imageUrl = result.data.images[0].url;
    console.log(`📥 Downloading from: ${imageUrl}`);

    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Save to output directory (configurable via env var, configurable via env)
    const outputDir = process.env.BLOG_IMAGE_OUTPUT_DIR || process.cwd();
    const outputPath = join(outputDir, outputFilename);

    // Convert to WebP if filename ends with .webp (FAL returns PNG)
    if (outputFilename.toLowerCase().endsWith('.webp')) {
      const tempPngPath = outputPath.replace(/\.webp$/i, '-temp.png');
      await writeFile(tempPngPath, buffer);

      try {
        execSync(`cwebp -q 85 "${tempPngPath}" -o "${outputPath}"`, { stdio: 'pipe' });
        await unlink(tempPngPath);
        console.log(`✅ Image converted to WebP and saved to: ${outputPath}`);
      } catch (err) {
        // Fallback: keep as PNG with .webp extension (not ideal but works)
        console.warn(`⚠️  cwebp not found, saving as PNG with .webp extension`);
        await writeFile(outputPath, buffer);
      }
    } else {
      await writeFile(outputPath, buffer);
      console.log(`✅ Image saved to: ${outputPath}`);
    }
    console.log(`📝 Use in markdown: /images/${outputFilename}\n`);

    // Show stats
    console.log("📊 Generation stats:");
    console.log(`   Seed: ${result.data.seed}`);
    console.log(`   Dimensions: ${result.data.images[0].width}x${result.data.images[0].height}\n`);

    return outputPath;
  } catch (error) {
    console.error("❌ Error generating image:", error);
    throw error;
  }
}

// CLI interface
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log(`
Usage: bun .claude/skills/blog-image-generation/scripts/generate-image.ts "prompt" output-filename.webp

Example:
  bun .claude/skills/blog-image-generation/scripts/generate-image.ts "A futuristic AI brain collaborating with a human" ai-collaboration.webp

The image will be saved to the current directory (or BLOG_IMAGE_OUTPUT_DIR if set)
  `);
  process.exit(1);
}

const [prompt, filename] = args;
generateBlogImage(prompt, filename);
