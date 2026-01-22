#!/usr/bin/env bun
/**
 * Browser Eval - Execute JavaScript in page context
 *
 * Usage:
 *   bun browser-eval.ts '<javascript code>'
 *   bun browser-eval.ts --file=script.js
 *
 * Examples:
 *   bun browser-eval.ts 'document.title'
 *   bun browser-eval.ts 'document.querySelectorAll("a").length'
 *   bun browser-eval.ts 'Array.from(document.querySelectorAll("h1")).map(h => h.textContent)'
 *   bun browser-eval.ts --file=scraper.js
 */

import puppeteer from 'puppeteer-core';
import { readFileSync } from 'fs';

const DEFAULT_PORT = 9222;

async function getWebSocketEndpoint(port: number): Promise<string> {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    const info = await response.json();
    return info.webSocketDebuggerUrl;
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: browser-eval.ts \'<javascript>\' | --file=script.js');
        console.log('');
        console.log('Examples:');
        console.log('  browser-eval.ts \'document.title\'');
        console.log('  browser-eval.ts \'Array.from(document.querySelectorAll("a")).map(a => a.href)\'');
        process.exit(1);
    }

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

        // Get the JavaScript to execute
        let jsCode: string;

        const fileArg = args.find(a => a.startsWith('--file='));
        if (fileArg) {
            const filePath = fileArg.split('=')[1];
            jsCode = readFileSync(filePath, 'utf-8');
        } else {
            jsCode = args.join(' ');
        }

        // Execute in page context
        const result = await page.evaluate((code) => {
            // eslint-disable-next-line no-eval
            return eval(code);
        }, jsCode);

        // Output result
        if (result === undefined) {
            console.log('(undefined)');
        } else if (result === null) {
            console.log('null');
        } else if (typeof result === 'object') {
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.log(result);
        }

    } finally {
        browser.disconnect();
    }
}

main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});
