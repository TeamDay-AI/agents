#!/usr/bin/env bun
/**
 * Avatar Image Generator
 * 
 * Generates square profile avatars using FAL AI
 * Usage: bun .claude/skills/blog-image-generation/scripts/generate-avatar.ts "prompt" output-filename.webp
 */

import { fal } from "@fal-ai/client";
import { writeFile } from "fs/promises";
import { join } from "path";

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error("❌ Error: FAL_KEY environment variable not set");
  console.error("Set it with: export FAL_KEY='your-fal-api-key'");
  process.exit(1);
}
fal.config({
  credentials: FAL_KEY
});

async function generateAvatar(prompt: string, outputFilename: string) {
  console.log("🎨 Generating avatar with FAL AI (Flux 2):");
  console.log(`   "${prompt}"\n`);

  try {
    const result: any = await fal.subscribe("fal-ai/flux-2-flex", {
      input: {
        prompt,
        image_size: "square", // Square format for avatars
        enable_prompt_expansion: true,
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

    console.log("✅ Avatar generated\n");

    const imageUrl = result.data.images[0].url;
    console.log(`📥 Downloading from: ${imageUrl}`);

    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const outputDir = process.env.AVATAR_OUTPUT_DIR || join(process.cwd(), "packages/marketing/public/authors");
    const outputPath = join(outputDir, outputFilename);

    await writeFile(outputPath, buffer);

    console.log(`✅ Avatar saved to: ${outputPath}`);
    console.log(`📝 Use in code: /authors/${outputFilename}\n`);

    return outputPath;
  } catch (error) {
    console.error("❌ Error generating avatar:", error);
    throw error;
  }
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log(`
Usage: bun .claude/skills/blog-image-generation/scripts/generate-avatar.ts "prompt" output-filename.png

Example:
  bun .claude/skills/blog-image-generation/scripts/generate-avatar.ts "Abstract AI avatar with neural network patterns" claude.png

The avatar will be saved to packages/marketing/public/authors/

Note: Images are generated as PNG. Use cwebp to convert to WebP for optimization:
  cwebp -q 85 packages/marketing/public/authors/avatar.png -o packages/marketing/public/authors/avatar.webp
  `);
  process.exit(1);
}

const [prompt, filename] = args;
generateAvatar(prompt, filename);
