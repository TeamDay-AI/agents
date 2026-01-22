#!/usr/bin/env bun
/**
 * Browser Stop - Close the remote-debugging Chrome instance
 *
 * Usage:
 *   bun browser-stop.ts
 */

import puppeteer from 'puppeteer-core';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const DEFAULT_PORT = 9222;
const PORT_FILE = join(tmpdir(), 'browser-skill-port');
const PID_FILE = join(tmpdir(), 'browser-skill-pid');

async function getWebSocketEndpoint(port: number): Promise<string> {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    const info = await response.json();
    return info.webSocketDebuggerUrl;
}

async function main() {
    try {
        const wsEndpoint = await getWebSocketEndpoint(DEFAULT_PORT);
        const browser = await puppeteer.connect({
            browserWSEndpoint: wsEndpoint,
        });

        console.log('🛑 Closing browser...');
        await browser.close();
        console.log('✅ Browser closed');

    } catch {
        // Try to kill by PID if connection fails
        if (existsSync(PID_FILE)) {
            try {
                const pid = parseInt(readFileSync(PID_FILE, 'utf-8'), 10);
                process.kill(pid);
                console.log(`✅ Killed browser process (PID: ${pid})`);
            } catch {
                console.log('ℹ️  Browser not running');
            }
        } else {
            console.log('ℹ️  Browser not running');
        }
    }

    // Clean up temp files
    try {
        if (existsSync(PORT_FILE)) unlinkSync(PORT_FILE);
        if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
    } catch {
        // Ignore cleanup errors
    }
}

main();
