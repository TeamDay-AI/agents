#!/usr/bin/env bun
/**
 * Browser Cookies - Get cookies including HTTP-only ones
 *
 * This uses CDP to access cookies that JavaScript cannot see (HTTP-only cookies).
 * Useful for authenticated scraping scenarios.
 *
 * Usage:
 *   bun browser-cookies.ts                 All cookies for current page
 *   bun browser-cookies.ts --domain=x.com  Filter by domain
 *   bun browser-cookies.ts --name=session  Filter by name
 *   bun browser-cookies.ts --json          Output as JSON
 */

import puppeteer from 'puppeteer-core';

const DEFAULT_PORT = 9222;

interface Options {
    domain?: string;
    name?: string;
    json: boolean;
}

async function getWebSocketEndpoint(port: number): Promise<string> {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    const info = await response.json();
    return info.webSocketDebuggerUrl;
}

function parseArgs(): Options {
    const args = process.argv.slice(2);
    const options: Options = {
        json: args.includes('--json'),
    };

    for (const arg of args) {
        if (arg.startsWith('--domain=')) {
            options.domain = arg.split('=')[1];
        } else if (arg.startsWith('--name=')) {
            options.name = arg.split('=')[1];
        }
    }

    return options;
}

async function main() {
    const options = parseArgs();

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

        // Get CDP client
        const client = await page.createCDPSession();

        // Get all cookies
        const { cookies } = await client.send('Network.getAllCookies');

        // Filter cookies
        let filteredCookies = cookies;

        if (options.domain) {
            filteredCookies = filteredCookies.filter(c =>
                c.domain.includes(options.domain!)
            );
        }

        if (options.name) {
            filteredCookies = filteredCookies.filter(c =>
                c.name.toLowerCase().includes(options.name!.toLowerCase())
            );
        }

        if (filteredCookies.length === 0) {
            console.log('No cookies found matching criteria.');
            return;
        }

        if (options.json) {
            console.log(JSON.stringify(filteredCookies, null, 2));
            return;
        }

        // Pretty print
        console.log(`🍪 Found ${filteredCookies.length} cookie(s):\n`);

        for (const cookie of filteredCookies) {
            console.log('───────────────────────────────────────');
            console.log(`Name:      ${cookie.name}`);
            console.log(`Value:     ${cookie.value.slice(0, 50)}${cookie.value.length > 50 ? '...' : ''}`);
            console.log(`Domain:    ${cookie.domain}`);
            console.log(`Path:      ${cookie.path}`);
            console.log(`HttpOnly:  ${cookie.httpOnly ? '✅ Yes' : '❌ No'}`);
            console.log(`Secure:    ${cookie.secure ? '✅ Yes' : '❌ No'}`);
            console.log(`SameSite:  ${cookie.sameSite || 'None'}`);
            if (cookie.expires > 0) {
                console.log(`Expires:   ${new Date(cookie.expires * 1000).toISOString()}`);
            } else {
                console.log(`Expires:   Session`);
            }
        }

        console.log('───────────────────────────────────────');

    } finally {
        browser.disconnect();
    }
}

main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});
