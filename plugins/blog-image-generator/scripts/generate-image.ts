#!/usr/bin/env bun
/**
 * Blog Image Generator (FAL AI - Primary)
 *
 * Generates high-quality images for blog posts using FAL AI's Flux 2 model
 * Usage: bun scripts/generate-image.ts "prompt" output-filename.webp
 *
 * Setup:
 *   export FAL_KEY='your-fal-api-key'
 *   export BLOG_IMAGE_OUTPUT_DIR='./output'  # Optional, defaults to ./output
 */

import { fal } from "@fal-ai/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// Configure FAL AI from environment variable
const FAL_KEY = process.env.FAL_KEY;

if (!FAL_KEY) {
  console.error("❌ Error: FAL_KEY environment variable not set");
  console.error("\nSetup instructions:");
  console.error("1. Get your FAL AI API key from https://fal.ai/dashboard/keys");
  console.error("2. Set the environment variable:");
  console.error("   export FAL_KEY='your-fal-api-key-here'");
  console.error("\nOr create a .env file:");
  console.error("   FAL_KEY=your-fal-api-key-here");
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

    // Save to output directory (configurable via env var)
    const outputDir = process.env.BLOG_IMAGE_OUTPUT_DIR || join(process.cwd(), "output");

    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    const outputPath = join(outputDir, outputFilename);
    await writeFile(outputPath, buffer);

    console.log(`✅ Image saved to: ${outputPath}`);
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
Usage: bun scripts/generate-image.ts "prompt" output-filename.webp

Example:
  bun scripts/generate-image.ts "A futuristic AI brain collaborating with a human" ai-collaboration.webp

Environment variables:
  FAL_KEY                  - Your FAL AI API key (required)
  BLOG_IMAGE_OUTPUT_DIR    - Output directory (default: ./output)

The image will be saved to the output directory.
  `);
  process.exit(1);
}

const [prompt, filename] = args;
generateBlogImage(prompt, filename);
