#!/usr/bin/env bun
/**
 * Browser Screenshot - Capture current page to file
 *
 * Usage:
 *   bun browser-screenshot.ts <filename>
 *   bun browser-screenshot.ts <filename> --full     Full page capture
 *   bun browser-screenshot.ts <filename> --selector='.element'
 *
 * Output goes to: packages/marketing/public/images/ (for blog use)
 * Or specify absolute path for custom location
 */

import puppeteer from 'puppeteer-core';
import { resolve, extname, isAbsolute } from 'path';
import sharp from 'sharp';

const DEFAULT_PORT = 9222;

interface Options {
    full: boolean;
    selector?: string;
}

async function getWebSocketEndpoint(port: number): Promise<string> {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    const info = await response.json();
    return info.webSocketDebuggerUrl;
}

function parseArgs(): { filename: string; options: Options } {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: browser-screenshot.ts <filename> [--full] [--selector=".class"]');
        process.exit(1);
    }

    const filename = args.find(a => !a.startsWith('--'));
    if (!filename) {
        console.error('❌ No filename provided');
        process.exit(1);
    }

    const options: Options = {
        full: args.includes('--full'),
    };

    const selectorArg = args.find(a => a.startsWith('--selector='));
    if (selectorArg) {
        options.selector = selectorArg.split('=')[1];
    }

    return { filename, options };
}

async function main() {
    const { filename, options } = parseArgs();

    let wsEndpoint: string;
    try {
        wsEndpoint = await getWebSocketEndpoint(DEFAULT_PORT);
    } catch {
        console.error('❌ Browser not running. Start it first with: bun browser-start.ts');
        process.exit(1);
    }

    const browser = await puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
    });

    try {
        const pages = await browser.pages();
        const page = pages[pages.length - 1];

        if (!page) {
            console.error('❌ No page open. Navigate first with: bun browser-navigate.ts <url>');
            process.exit(1);
        }

        // Determine output path
        let outputPath: string;
        if (isAbsolute(filename)) {
            outputPath = filename;
        } else {
            // Default to marketing images folder
            outputPath = resolve(process.cwd(), 'packages/marketing/public/images', filename);
        }

        console.log(`📸 Taking screenshot...`);

        let screenshotBuffer: Uint8Array;

        if (options.selector) {
            const element = await page.$(options.selector);
            if (!element) {
                console.error(`❌ Element not found: ${options.selector}`);
                process.exit(1);
            }
            screenshotBuffer = await element.screenshot();
        } else {
            screenshotBuffer = await page.screenshot({
                fullPage: options.full,
            });
        }

        // Convert to appropriate format
        const ext = extname(filename).toLowerCase();
        let finalBuffer: Buffer;

        if (ext === '.webp') {
            finalBuffer = await sharp(screenshotBuffer)
                .webp({ quality: 85 })
                .toBuffer();
        } else if (ext === '.jpg' || ext === '.jpeg') {
            finalBuffer = await sharp(screenshotBuffer)
                .jpeg({ quality: 85 })
                .toBuffer();
        } else {
            finalBuffer = Buffer.from(screenshotBuffer);
        }

        await Bun.write(outputPath, finalBuffer);

        console.log(`✅ Screenshot saved: ${outputPath}`);

        // Show markdown reference if saved to images folder
        if (outputPath.includes('packages/marketing/public/images')) {
            console.log(`📝 Use in markdown: /images/${filename}`);
        }

    } finally {
        browser.disconnect();
    }
}

main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});
