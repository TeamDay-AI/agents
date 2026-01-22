#!/usr/bin/env bun
/**
 * Browser Pick - Interactive element selector
 *
 * Activates element selection mode in the browser. User clicks elements,
 * and their DOM information is returned for automation/scraping.
 *
 * Usage:
 *   bun browser-pick.ts              Single element selection
 *   bun browser-pick.ts --multi      Multi-select (Cmd/Ctrl+Click to add, Enter to finish)
 *
 * The agent receives:
 *   - Tag name and classes
 *   - Text content
 *   - Attributes
 *   - CSS selector
 *   - Parent hierarchy
 *   - Outer HTML (truncated)
 */

import puppeteer, { type Page } from 'puppeteer-core';

const DEFAULT_PORT = 9222;

async function getWebSocketEndpoint(port: number): Promise<string> {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    const info = await response.json();
    return info.webSocketDebuggerUrl;
}

// Inject picker UI into page
const PICKER_SCRIPT = `
(function() {
    if (window.__browserPicker) {
        window.__browserPicker.destroy();
    }

    const multiMode = %MULTI_MODE%;
    const selectedElements = [];
    let currentHighlight = null;

    // Create overlay for highlighting
    const overlay = document.createElement('div');
    overlay.id = '__browser-picker-overlay';
    overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;border:2px solid #0066ff;background:rgba(0,102,255,0.1);transition:all 0.1s;display:none;';
    document.body.appendChild(overlay);

    // Create info panel
    const infoPanel = document.createElement('div');
    infoPanel.id = '__browser-picker-info';
    infoPanel.style.cssText = 'position:fixed;bottom:20px;left:20px;right:20px;background:#1a1a1a;color:#fff;padding:16px;border-radius:8px;z-index:999999;font-family:monospace;font-size:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);max-height:200px;overflow:auto;';
    infoPanel.innerHTML = multiMode
        ? '<div style="color:#0066ff;font-weight:bold;">🎯 Pick Mode: Click elements (Cmd/Ctrl+Click to multi-select). Press Enter to finish.</div>'
        : '<div style="color:#0066ff;font-weight:bold;">🎯 Pick Mode: Click an element to select it</div>';
    document.body.appendChild(infoPanel);

    function getElementInfo(el) {
        // Generate CSS selector
        function getSelector(element) {
            if (element.id) return '#' + element.id;
            let path = [];
            while (element && element.nodeType === 1) {
                let selector = element.tagName.toLowerCase();
                if (element.id) {
                    selector = '#' + element.id;
                    path.unshift(selector);
                    break;
                }
                if (element.className) {
                    const classes = Array.from(element.classList).slice(0, 2).join('.');
                    if (classes) selector += '.' + classes;
                }
                const siblings = element.parentElement?.children || [];
                if (siblings.length > 1) {
                    const index = Array.from(siblings).indexOf(element) + 1;
                    selector += ':nth-child(' + index + ')';
                }
                path.unshift(selector);
                element = element.parentElement;
            }
            return path.slice(-4).join(' > ');
        }

        // Get parent hierarchy
        function getParentChain(element, depth = 3) {
            const chain = [];
            let current = element.parentElement;
            while (current && chain.length < depth && current !== document.body) {
                chain.push({
                    tag: current.tagName.toLowerCase(),
                    classes: Array.from(current.classList).slice(0, 3),
                    id: current.id || null
                });
                current = current.parentElement;
            }
            return chain;
        }

        // Get attributes
        const attrs = {};
        for (const attr of el.attributes) {
            if (!['style', 'class'].includes(attr.name)) {
                attrs[attr.name] = attr.value.slice(0, 100);
            }
        }

        return {
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            classes: Array.from(el.classList),
            text: (el.innerText || '').slice(0, 200).trim(),
            selector: getSelector(el),
            attributes: attrs,
            parentChain: getParentChain(el),
            outerHTML: el.outerHTML.slice(0, 500)
        };
    }

    function highlightElement(el) {
        if (!el || el === document.body) {
            overlay.style.display = 'none';
            return;
        }
        const rect = el.getBoundingClientRect();
        overlay.style.display = 'block';
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
    }

    function updateInfoPanel(info) {
        if (multiMode && selectedElements.length > 0) {
            infoPanel.innerHTML = '<div style="color:#00cc66;margin-bottom:8px;">✅ Selected ' + selectedElements.length + ' element(s). Cmd/Ctrl+Click to add more, Enter to finish.</div>' +
                '<div style="color:#888;">Last: &lt;' + info.tag + '&gt; ' + (info.classes.length ? '.' + info.classes.slice(0,2).join('.') : '') + '</div>';
        } else {
            infoPanel.innerHTML = '<div style="color:#0066ff;margin-bottom:8px;">Hovering: &lt;' + info.tag + '&gt;</div>' +
                '<div style="color:#888;">' + info.selector + '</div>' +
                '<div style="margin-top:8px;color:#aaa;">' + (info.text || '(no text)').slice(0, 100) + '</div>';
        }
    }

    // Event handlers
    function onMouseMove(e) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el && el !== currentHighlight && !el.id?.startsWith('__browser-picker')) {
            currentHighlight = el;
            highlightElement(el);
            updateInfoPanel(getElementInfo(el));
        }
    }

    function onClick(e) {
        e.preventDefault();
        e.stopPropagation();

        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el.id?.startsWith('__browser-picker')) return;

        const info = getElementInfo(el);

        if (multiMode && (e.metaKey || e.ctrlKey)) {
            // Multi-select: add to list
            selectedElements.push(info);
            updateInfoPanel(info);
        } else if (multiMode) {
            // First click in multi mode
            selectedElements.push(info);
            updateInfoPanel(info);
        } else {
            // Single mode: return immediately
            cleanup();
            window.__browserPickerResult = [info];
        }
    }

    function onKeyDown(e) {
        if (e.key === 'Enter' && multiMode && selectedElements.length > 0) {
            cleanup();
            window.__browserPickerResult = selectedElements;
        } else if (e.key === 'Escape') {
            cleanup();
            window.__browserPickerResult = [];
        }
    }

    function cleanup() {
        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKeyDown, true);
        overlay.remove();
        infoPanel.remove();
        delete window.__browserPicker;
    }

    // Attach handlers
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);

    window.__browserPicker = { destroy: cleanup };
    window.__browserPickerResult = null;
})();
`;

async function main() {
    const args = process.argv.slice(2);
    const multiMode = args.includes('--multi');

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

        // Bring page to front
        await page.bringToFront();

        console.log(multiMode
            ? '🎯 Pick mode activated (multi-select). Click elements, Cmd/Ctrl+Click to add more, Enter to finish.'
            : '🎯 Pick mode activated. Click an element in the browser.');
        console.log('   Press Escape to cancel.');

        // Inject picker script
        const script = PICKER_SCRIPT.replace('%MULTI_MODE%', String(multiMode));
        await page.evaluate(script);

        // Poll for result
        let result = null;
        while (result === null) {
            await new Promise(resolve => setTimeout(resolve, 200));
            result = await page.evaluate(() => (window as any).__browserPickerResult);
        }

        if (result.length === 0) {
            console.log('❌ Selection cancelled');
            process.exit(0);
        }

        // Output result
        console.log('\n📋 Selected element(s):\n');

        for (const info of result) {
            console.log('───────────────────────────────────────');
            console.log(`Tag:      <${info.tag}>`);
            if (info.id) console.log(`ID:       #${info.id}`);
            if (info.classes.length) console.log(`Classes:  .${info.classes.join('.')}`);
            console.log(`Selector: ${info.selector}`);
            if (info.text) console.log(`Text:     "${info.text.slice(0, 100)}${info.text.length > 100 ? '...' : ''}"`);
            if (Object.keys(info.attributes).length) {
                console.log(`Attrs:    ${JSON.stringify(info.attributes)}`);
            }
            console.log(`Parents:  ${info.parentChain.map((p: any) => p.tag + (p.id ? '#' + p.id : '')).join(' > ')}`);
            console.log(`HTML:     ${info.outerHTML.slice(0, 200)}${info.outerHTML.length > 200 ? '...' : ''}`);
        }

        console.log('───────────────────────────────────────\n');

        // Also output as JSON for programmatic use
        console.log('JSON:');
        console.log(JSON.stringify(result, null, 2));

    } finally {
        browser.disconnect();
    }
}

main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});
