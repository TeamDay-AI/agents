#!/usr/bin/env bun
/**
 * Blog Image Generator (Gemini - Google AI)
 *
 * Generates images for blog posts using Google's Gemini image generation
 * Models:
 *   - gemini-2.5-flash-image (Nano Banana) - fast, efficient
 *   - gemini-3-pro-image-preview (Nano Banana Pro) - professional, up to 4K, thinking mode
 *
 * Usage: bun .claude/skills/blog-image-generation/scripts/generate-image-gemini.ts "prompt" output-filename.webp [options]
 *
 * Options:
 *   --model=MODEL     Model to use (default: gemini-2.5-flash-image)
 *   --pro             Shortcut for --model=gemini-3-pro-image-preview
 *   --aspect=RATIO    Aspect ratio: 1:1, 16:9, 9:16, 3:2, 2:3, 4:3, 3:4, 4:5, 5:4, 21:9 (default: 16:9)
 *   --size=SIZE       Resolution for pro model: 1K, 2K, 4K (default: 2K)
 */

import { GoogleGenAI } from "@google/genai";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { execSync } from "child_process";

const DEFAULT_MODEL = "gemini-2.5-flash-image";
const PRO_MODEL = "gemini-3-pro-image-preview";
const VALID_ASPECTS = ["1:1", "16:9", "9:16", "3:2", "2:3", "4:3", "3:4", "4:5", "5:4", "21:9"];
const VALID_SIZES = ["1K", "2K", "4K"];

interface GenerateOptions {
  model: string;
  aspectRatio: string;
  imageSize: string;
}

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY or GOOGLE_API_KEY environment variable required");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function generateBlogImage(prompt: string, outputFilename: string, options: GenerateOptions) {
  const { model, aspectRatio, imageSize } = options;
  const isPro = model === PRO_MODEL;

  console.log(`\n🎨 Generating image with Gemini (${model}):`);
  console.log(`   "${prompt}"`);
  console.log(`   Aspect: ${aspectRatio}${isPro ? `, Size: ${imageSize}` : ""}\n`);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio,
          ...(isPro && { imageSize }),
        },
      },
    });

    // Extract image data from response
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new Error("No response parts returned");
    }

    let imageBuffer: Buffer | null = null;

    for (const part of parts) {
      if (part.text) {
        console.log("📝 Model response:", part.text);
      } else if (part.inlineData) {
        const imageBase64 = part.inlineData.data;
        if (imageBase64) {
          imageBuffer = Buffer.from(imageBase64, "base64");
        }
      }
    }

    if (!imageBuffer) {
      throw new Error("No image data returned");
    }

    console.log("✅ Image generated\n");

    // Save to public/images directory
    const outputPath = join(
      process.cwd(),
      "packages/marketing/public/images",
      outputFilename
    );

    // Convert to WebP if filename ends with .webp (Gemini returns PNG)
    if (outputFilename.toLowerCase().endsWith('.webp')) {
      const tempPngPath = outputPath.replace(/\.webp$/i, '-temp.png');
      await writeFile(tempPngPath, imageBuffer);

      try {
        execSync(`cwebp -q 85 "${tempPngPath}" -o "${outputPath}"`, { stdio: 'pipe' });
        await unlink(tempPngPath);
        console.log(`✅ Image converted to WebP and saved to: ${outputPath}`);
      } catch {
        console.warn(`⚠️  cwebp not found, saving as PNG with .webp extension`);
        await writeFile(outputPath, imageBuffer);
      }
    } else {
      await writeFile(outputPath, imageBuffer);
      console.log(`✅ Image saved to: ${outputPath}`);
    }
    console.log(`📝 Use in markdown: /images/${outputFilename}\n`);

    return outputPath;
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

// Parse options
let model = getArg("model") || DEFAULT_MODEL;
let aspectRatio = getArg("aspect") || "16:9";
let imageSize = getArg("size") || "2K";

// --pro flag shortcut
if (args.includes("--pro")) {
  model = PRO_MODEL;
}

// Validate aspect ratio
if (!VALID_ASPECTS.includes(aspectRatio)) {
  console.error(`❌ Invalid aspect ratio: ${aspectRatio}`);
  console.error(`   Valid options: ${VALID_ASPECTS.join(", ")}`);
  process.exit(1);
}

// Validate size (must be uppercase)
imageSize = imageSize.toUpperCase();
if (!VALID_SIZES.includes(imageSize)) {
  console.error(`❌ Invalid size: ${imageSize}`);
  console.error(`   Valid options: ${VALID_SIZES.join(", ")}`);
  process.exit(1);
}

const filteredArgs = args.filter(arg => !arg.startsWith("--"));

if (filteredArgs.length < 2) {
  console.log(`
Usage: bun .claude/skills/blog-image-generation/scripts/generate-image-gemini.ts "prompt" output-filename.webp [options]

Options:
  --model=MODEL    Gemini model to use (default: gemini-2.5-flash-image)
                     - gemini-2.5-flash-image (Nano Banana, fast)
                     - gemini-3-pro-image-preview (Nano Banana Pro, thinking mode)
  --pro            Shortcut for --model=gemini-3-pro-image-preview
  --aspect=RATIO   Aspect ratio (default: 16:9)
                     Options: ${VALID_ASPECTS.join(", ")}
  --size=SIZE      Resolution for pro model (default: 2K)
                     Options: ${VALID_SIZES.join(", ")}

Environment:
  GEMINI_API_KEY or GOOGLE_API_KEY must be set

Examples:
  # Blog header (16:9 landscape)
  bun .claude/skills/blog-image-generation/scripts/generate-image-gemini.ts "A futuristic AI brain" ai-brain.webp

  # Square image
  bun .claude/skills/blog-image-generation/scripts/generate-image-gemini.ts "App icon" icon.webp --aspect=1:1

  # High-res portrait with pro model
  bun .claude/skills/blog-image-generation/scripts/generate-image-gemini.ts "Portrait photo" portrait.webp --pro --aspect=9:16 --size=4K

Output: packages/marketing/public/images/
  `);
  process.exit(1);
}

const [prompt, filename] = filteredArgs;
generateBlogImage(prompt, filename, { model, aspectRatio, imageSize });
