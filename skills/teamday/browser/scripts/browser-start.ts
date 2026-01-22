#!/usr/bin/env bun
/**
 * Browser Start - Launch Chrome with remote debugging
 *
 * Based on Mario Zechner's approach: https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/
 *
 * Usage:
 *   bun browser-start.ts [options]
 *
 * Options:
 *   --profile    Load user's Chrome profile (preserves logins)
 *   --port=PORT  Remote debugging port (default: 9222)
 *   --headless   Run in headless mode
 */

import { spawn, execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { homedir, tmpdir, platform } from 'os';
import { join } from 'path';

const PORT_FILE = join(tmpdir(), 'browser-skill-port');
const PID_FILE = join(tmpdir(), 'browser-skill-pid');

interface Options {
    profile: boolean;
    port: number;
    headless: boolean;
}

function parseArgs(): Options {
    const args = process.argv.slice(2);
    const options: Options = {
        profile: false,
        port: 9222,
        headless: false,
    };

    for (const arg of args) {
        if (arg === '--profile') {
            options.profile = true;
        } else if (arg.startsWith('--port=')) {
            options.port = parseInt(arg.split('=')[1], 10);
        } else if (arg === '--headless') {
            options.headless = true;
        }
    }

    return options;
}

function getChromePath(): string {
    const os = platform();

    if (os === 'darwin') {
        const paths = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            `${homedir()}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
        ];
        for (const p of paths) {
            if (existsSync(p)) return p;
        }
    } else if (os === 'linux') {
        const paths = [
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
        ];
        for (const p of paths) {
            if (existsSync(p)) return p;
        }
    } else if (os === 'win32') {
        const paths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        ];
        for (const p of paths) {
            if (existsSync(p)) return p;
        }
    }

    throw new Error('Chrome not found. Please install Google Chrome.');
}

function getChromeProfilePath(): string {
    const os = platform();

    if (os === 'darwin') {
        return join(homedir(), 'Library/Application Support/Google/Chrome');
    } else if (os === 'linux') {
        return join(homedir(), '.config/google-chrome');
    } else if (os === 'win32') {
        return join(homedir(), 'AppData/Local/Google/Chrome/User Data');
    }

    throw new Error(`Unsupported platform: ${os}`);
}

async function isPortInUse(port: number): Promise<boolean> {
    try {
        const response = await fetch(`http://127.0.0.1:${port}/json/version`);
        return response.ok;
    } catch {
        return false;
    }
}

async function startBrowser(options: Options): Promise<void> {
    // Check if browser already running
    if (await isPortInUse(options.port)) {
        console.log(`✅ Browser already running on port ${options.port}`);
        const response = await fetch(`http://127.0.0.1:${options.port}/json/version`);
        const info = await response.json();
        console.log(`   WebSocket: ${info.webSocketDebuggerUrl}`);
        return;
    }

    const chromePath = getChromePath();
    const tempProfileDir = join(tmpdir(), 'browser-skill-profile');

    // Prepare arguments
    const args: string[] = [
        `--remote-debugging-port=${options.port}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--disable-sync',
    ];

    if (options.headless) {
        args.push('--headless=new');
    }

    // Handle profile
    if (options.profile) {
        const sourceProfile = getChromeProfilePath();

        if (!existsSync(sourceProfile)) {
            console.error(`❌ Chrome profile not found at: ${sourceProfile}`);
            process.exit(1);
        }

        console.log('📦 Syncing Chrome profile (this preserves your logins)...');

        // Clean up existing temp profile
        if (existsSync(tempProfileDir)) {
            rmSync(tempProfileDir, { recursive: true, force: true });
        }
        mkdirSync(tempProfileDir, { recursive: true });

        // Rsync essential profile data (excluding cache and heavy files)
        try {
            execSync(`rsync -a --exclude='Cache*' --exclude='Service Worker' --exclude='*.log' --exclude='Crash*' --exclude='BrowserMetrics*' "${sourceProfile}/Default/" "${tempProfileDir}/Default/"`, {
                stdio: 'inherit'
            });
        } catch (error) {
            console.warn('⚠️  Profile sync had some errors (non-fatal)');
        }

        args.push(`--user-data-dir=${tempProfileDir}`);
        console.log('✅ Profile synced');
    } else {
        // Use a fresh temp profile
        const freshProfile = join(tmpdir(), 'browser-skill-fresh');
        if (!existsSync(freshProfile)) {
            mkdirSync(freshProfile, { recursive: true });
        }
        args.push(`--user-data-dir=${freshProfile}`);
    }

    // Start Chrome
    console.log(`🚀 Starting Chrome on port ${options.port}...`);

    const child = spawn(chromePath, args, {
        detached: true,
        stdio: 'ignore',
    });

    child.unref();

    // Save port and PID for other scripts
    writeFileSync(PORT_FILE, String(options.port));
    writeFileSync(PID_FILE, String(child.pid));

    // Wait for browser to be ready
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));

        if (await isPortInUse(options.port)) {
            const response = await fetch(`http://127.0.0.1:${options.port}/json/version`);
            const info = await response.json();

            console.log('✅ Browser ready!');
            console.log(`   Port: ${options.port}`);
            console.log(`   WebSocket: ${info.webSocketDebuggerUrl}`);
            console.log(`   PID: ${child.pid}`);

            if (options.profile) {
                console.log('   Profile: User profile loaded (logins preserved)');
            }

            return;
        }

        attempts++;
    }

    console.error('❌ Browser failed to start within timeout');
    process.exit(1);
}

// Export helper for other scripts
export function getDebugPort(): number {
    try {
        return parseInt(readFileSync(PORT_FILE, 'utf-8'), 10);
    } catch {
        return 9222;
    }
}

export function getWebSocketEndpoint(port: number = getDebugPort()): Promise<string> {
    return fetch(`http://127.0.0.1:${port}/json/version`)
        .then(r => r.json())
        .then(info => info.webSocketDebuggerUrl);
}

// Main
const options = parseArgs();
startBrowser(options).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});
