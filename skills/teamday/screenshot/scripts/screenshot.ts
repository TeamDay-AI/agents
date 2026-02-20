#!/usr/bin/env bun
/**
 * Screenshot Skill
 * Takes screenshots of web pages for use in blog posts and documentation.
 *
 * Usage:
 *   bun .claude/skills/screenshot/scripts/screenshot.ts <url> <filename> [options]
 *
 * Examples:
 *   bun .claude/skills/screenshot/scripts/screenshot.ts https://example.com homepage.webp
 *   bun .claude/skills/screenshot/scripts/screenshot.ts https://example.com homepage.webp --dark --width=1400
 */

import { chromium, type Page, type Browser } from 'playwright';
import { resolve, extname } from 'path';
import sharp from 'sharp';

interface ScreenshotOptions {
    width: number;
    height: number;
    dark: boolean;
    wait: number;
    full: boolean;
    selector?: string;
}

function parseArgs(): { url: string; filename: string; options: ScreenshotOptions } {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: bun screenshot.ts <url> <filename> [options]');
        console.error('');
        console.error('Options:');
        console.error('  --width=1200    Viewport width');
        console.error('  --height=800    Viewport height');
        console.error('  --dark          Enable dark mode');
        console.error('  --wait=2000     Wait time after load (ms)');
        console.error('  --full          Full page screenshot');
        console.error('  --selector=".class"  Screenshot specific element');
        process.exit(1);
    }

    const url = args[0];
    const filename = args[1];

    const options: ScreenshotOptions = {
        width: 1200,
        height: 800,
        dark: false,
        wait: 2000,
        full: false,
    };

    for (const arg of args.slice(2)) {
        if (arg.startsWith('--width=')) {
            options.width = parseInt(arg.split('=')[1], 10);
        } else if (arg.startsWith('--height=')) {
            options.height = parseInt(arg.split('=')[1], 10);
        } else if (arg === '--dark') {
            options.dark = true;
        } else if (arg.startsWith('--wait=')) {
            options.wait = parseInt(arg.split('=')[1], 10);
        } else if (arg === '--full') {
            options.full = true;
        } else if (arg.startsWith('--selector=')) {
            options.selector = arg.split('=')[1];
        }
    }

    return { url, filename, options };
}

async function takeScreenshot(url: string, filename: string, options: ScreenshotOptions): Promise<string> {
    let browser: Browser | null = null;

    try {
        console.log(`📸 Taking screenshot of ${url}`);

        browser = await chromium.launch({
            headless: true,
        });

        const context = await browser.newContext({
            viewport: { width: options.width, height: options.height },
            colorScheme: options.dark ? 'dark' : 'light',
        });

        const page: Page = await context.newPage();

        // Navigate and wait for network to settle
        await page.goto(url, {
            waitUntil: 'networkidle',
            timeout: 30000,
        });

        // Additional wait for dynamic content
        if (options.wait > 0) {
            await page.waitForTimeout(options.wait);
        }

        // Determine output path
        const outputDir = process.env.SCREENSHOT_OUTPUT_DIR || process.cwd();
        const outputPath = resolve(outputDir, filename);

        // Take screenshot
        let screenshotBuffer: Buffer;

        if (options.selector) {
            const element = await page.$(options.selector);
            if (!element) {
                throw new Error(`Element not found: ${options.selector}`);
            }
            screenshotBuffer = await element.screenshot() as Buffer;
        } else {
            screenshotBuffer = await page.screenshot({
                fullPage: options.full,
            }) as Buffer;
        }

        // Convert to WebP if needed
        const ext = extname(filename).toLowerCase();
        if (ext === '.webp') {
            const webpBuffer = await sharp(screenshotBuffer)
                .webp({ quality: 85 })
                .toBuffer();
            await Bun.write(outputPath, webpBuffer);
        } else if (ext === '.jpg' || ext === '.jpeg') {
            const jpegBuffer = await sharp(screenshotBuffer)
                .jpeg({ quality: 85 })
                .toBuffer();
            await Bun.write(outputPath, jpegBuffer);
        } else {
            // PNG or other formats
            await Bun.write(outputPath, screenshotBuffer);
        }

        console.log(`✅ Screenshot saved to: ${outputPath}`);
        console.log(`📝 Use in markdown as: /images/${filename}`);

        return outputPath;

    } catch (error) {
        if (error instanceof Error && error.message.includes('Executable doesn\'t exist')) {
            console.error('❌ Playwright browsers not installed.');
            console.error('');
            console.error('Run this command to install:');
            console.error('  npx playwright install chromium');
            process.exit(1);
        }
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Main execution
const { url, filename, options } = parseArgs();
takeScreenshot(url, filename, options).catch((error) => {
    console.error('❌ Screenshot failed:', error.message);
    process.exit(1);
});
