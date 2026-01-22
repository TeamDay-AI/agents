#!/usr/bin/env bun
/**
 * Browser Navigate - Navigate to URLs or open new tabs
 *
 * Usage:
 *   bun browser-navigate.ts <url>           Navigate current tab
 *   bun browser-navigate.ts <url> --new     Open URL in new tab
 *   bun browser-navigate.ts --back          Go back in history
 *   bun browser-navigate.ts --forward       Go forward in history
 *   bun browser-navigate.ts --reload        Reload current page
 *   bun browser-navigate.ts --list          List all tabs
 *   bun browser-navigate.ts --tab=N         Switch to tab N (0-indexed)
 */

import puppeteer from 'puppeteer-core';

const DEFAULT_PORT = 9222;

async function getWebSocketEndpoint(port: number): Promise<string> {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    const info = await response.json();
    return info.webSocketDebuggerUrl;
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: browser-navigate.ts <url> [--new] | --back | --forward | --reload | --list | --tab=N');
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

        // Handle --list
        if (args.includes('--list')) {
            console.log('📋 Open tabs:');
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const title = await page.title();
                const url = page.url();
                console.log(`  [${i}] ${title || '(no title)'}`);
                console.log(`      ${url}`);
            }
            return;
        }

        // Handle --tab=N
        const tabArg = args.find(a => a.startsWith('--tab='));
        if (tabArg) {
            const tabIndex = parseInt(tabArg.split('=')[1], 10);
            if (tabIndex >= 0 && tabIndex < pages.length) {
                await pages[tabIndex].bringToFront();
                console.log(`✅ Switched to tab ${tabIndex}`);
            } else {
                console.error(`❌ Tab ${tabIndex} not found. Have ${pages.length} tabs.`);
            }
            return;
        }

        // Get current page (most recently focused)
        let page = pages[pages.length - 1];
        if (!page) {
            page = await browser.newPage();
        }

        // Handle navigation commands
        if (args.includes('--back')) {
            await page.goBack();
            console.log('⬅️  Went back');
            console.log(`   Now at: ${page.url()}`);
            return;
        }

        if (args.includes('--forward')) {
            await page.goForward();
            console.log('➡️  Went forward');
            console.log(`   Now at: ${page.url()}`);
            return;
        }

        if (args.includes('--reload')) {
            await page.reload();
            console.log('🔄 Reloaded page');
            return;
        }

        // Handle URL navigation
        const url = args.find(a => !a.startsWith('--'));
        if (!url) {
            console.error('❌ No URL provided');
            process.exit(1);
        }

        // Validate/fix URL
        let finalUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            finalUrl = `https://${url}`;
        }

        // Open in new tab?
        if (args.includes('--new')) {
            page = await browser.newPage();
            console.log('📑 Opened new tab');
        }

        console.log(`🌐 Navigating to: ${finalUrl}`);

        await page.goto(finalUrl, {
            waitUntil: 'networkidle0',
            timeout: 30000,
        });

        const title = await page.title();
        console.log(`✅ Loaded: ${title}`);
        console.log(`   URL: ${page.url()}`);

    } finally {
        browser.disconnect();
    }
}

main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});
