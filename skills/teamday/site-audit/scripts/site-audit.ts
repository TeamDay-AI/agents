#!/usr/bin/env bun
/**
 * Site Health Audit — Technical SEO Crawler
 *
 * Crawls any website via its sitemap, checks every page for common SEO issues
 * (the same ones Ahrefs Site Audit flags), and produces a health score.
 *
 * Zero npm dependencies — uses only Bun/Node builtins.
 *
 * Usage:
 *   bun site-audit.ts --url https://example.com [options]
 *
 * Options:
 *   --url <url>       Base URL of the site to audit (required unless --sitemap)
 *   --sitemap <url>   Direct sitemap URL (skips auto-discovery)
 *   --sample N        Randomly sample N URLs (default: 50)
 *   --full            Crawl every URL in the sitemap
 *   --fix             Output actionable fix suggestions
 *   --verbose         Print per-URL details
 *   --json            Output results as JSON
 *   --categories      Show issue counts grouped by category only (compact)
 *   --output <path>   Write markdown report to file
 */

import { parseArgs } from 'util';
import { writeFileSync } from 'fs';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    url: { type: 'string' },
    sitemap: { type: 'string' },
    sample: { type: 'string', default: '50' },
    full: { type: 'boolean', default: false },
    fix: { type: 'boolean', default: false },
    verbose: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    categories: { type: 'boolean', default: false },
    output: { type: 'string' },
  },
});

if (!args.url && !args.sitemap) {
  console.error('Usage: site-audit.ts --url https://example.com [--sitemap <url>] [--sample N] [--full] [--fix] [--output path]');
  process.exit(1);
}

// Normalize base URL — strip trailing slash
const SITE_URL = (args.url || '').replace(/\/+$/, '');
const SAMPLE_SIZE = args.full ? Infinity : parseInt(args.sample!, 10);
const CONCURRENCY = 8;
const TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Severity = 'error' | 'warning' | 'notice';

interface Issue {
  url: string;
  severity: Severity;
  category: string;
  message: string;
  fix?: string;
}

interface PageResult {
  url: string;
  status: number;
  loadTimeMs: number;
  issues: Issue[];
  title?: string;
  description?: string;
  h1?: string;
  canonical?: string;
  hasOg: boolean;
  hasTwitterCard: boolean;
  imagesMissingAlt: number;
  wordCount: number;
  size: number;
  internalLinks: string[];
}

// ---------------------------------------------------------------------------
// Sitemap auto-discovery
// ---------------------------------------------------------------------------
async function discoverSitemapUrl(baseUrl: string): Promise<string | null> {
  const candidates = [
    `${baseUrl}/sitemap-index.xml`,
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/wp-sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
  ];

  // Try common sitemap locations
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: { 'User-Agent': 'SiteAudit/1.0' },
      });
      if (res.ok) {
        const text = await res.text();
        // Verify it's actually XML with <loc> tags
        if (text.includes('<loc>')) return url;
      }
    } catch { /* try next */ }
  }

  // Parse robots.txt for Sitemap: directives
  try {
    const res = await fetch(`${baseUrl}/robots.txt`, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'SiteAudit/1.0' },
    });
    if (res.ok) {
      const text = await res.text();
      const match = text.match(/^Sitemap:\s*(.+)$/im);
      if (match) return match[1].trim();
    }
  } catch { /* no robots.txt */ }

  return null;
}

// ---------------------------------------------------------------------------
// Sitemap fetcher — supports index sitemaps and direct sitemaps
// ---------------------------------------------------------------------------
async function fetchSitemapUrls(): Promise<string[]> {
  let sitemapUrl: string;

  if (args.sitemap) {
    sitemapUrl = args.sitemap;
  } else {
    if (!args.json) console.log('  Discovering sitemap...');
    const discovered = await discoverSitemapUrl(SITE_URL);
    if (!discovered) {
      console.error(`  Could not find sitemap for ${SITE_URL}`);
      console.error('  Tried: sitemap-index.xml, sitemap.xml, wp-sitemap.xml, robots.txt');
      console.error('  Use --sitemap <url> to specify directly.');
      process.exit(1);
    }
    sitemapUrl = discovered;
    if (!args.json) console.log(`  Found sitemap: ${sitemapUrl}`);
  }

  // Fetch the sitemap
  const res = await fetch(sitemapUrl, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': 'SiteAudit/1.0' },
  });
  if (!res.ok) {
    console.error(`  Failed to fetch sitemap: HTTP ${res.status}`);
    process.exit(1);
  }

  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

  // Check if this is a sitemap index (contains other sitemaps)
  const isSitemapIndex = xml.includes('<sitemapindex') || locs.every(l => l.endsWith('.xml'));

  if (isSitemapIndex && locs.some(l => l.endsWith('.xml'))) {
    // It's an index — fetch all child sitemaps
    const allUrls: string[] = [];
    for (const childUrl of locs) {
      try {
        const childRes = await fetch(childUrl, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { 'User-Agent': 'SiteAudit/1.0' },
        });
        if (childRes.ok) {
          const childXml = await childRes.text();
          const childLocs = [...childXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
          allUrls.push(...childLocs);
        }
      } catch { /* skip failed child sitemaps */ }
    }
    return allUrls.filter(u => SITE_URL ? u.startsWith(SITE_URL) : true);
  }

  // Direct sitemap — return the URLs
  return locs.filter(u => SITE_URL ? u.startsWith(SITE_URL) : true);
}

// ---------------------------------------------------------------------------
// HTML parser helpers (lightweight, no dependencies)
// ---------------------------------------------------------------------------
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractTag(html: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = html.match(re);
  return m?.[1]?.trim() ? decodeHtmlEntities(m[1].trim()) : undefined;
}

function extractMeta(html: string, nameOrProp: string): string | undefined {
  const patterns = [
    new RegExp(`<meta\\s+(?:name|property)=["']${nameOrProp}["']\\s+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta\\s+content=["']([^"']*)["']\\s+(?:name|property)=["']${nameOrProp}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeHtmlEntities(m[1]);
  }
  return undefined;
}

function extractMetaRobots(html: string): string | undefined {
  return extractMeta(html, 'robots');
}

function extractCanonical(html: string): string | undefined {
  const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i)
    || html.match(/<link\s+href=["']([^"']*)["']\s+rel=["']canonical["']/i);
  return m?.[1];
}

function extractHreflangLinks(html: string): { hreflang: string; href: string }[] {
  const re = /<link\s+rel=["']alternate["']\s+hreflang=["']([^"']*)["']\s+href=["']([^"']*)["']/gi;
  const links: { hreflang: string; href: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    links.push({ hreflang: m[1], href: m[2] });
  }
  return links;
}

function countH1(html: string): string[] {
  const re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    results.push(m[1].replace(/<[^>]+>/g, '').trim());
  }
  return results;
}

function countImagesWithoutAlt(html: string): number {
  const imgRe = /<img\s[^>]*>/gi;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    if (!/\balt\s*=/i.test(m[0])) count++;
  }
  return count;
}

function countWords(html: string): number {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.split(/\s+/).filter(Boolean).length;
}

function extractInternalLinks(html: string, siteUrl: string): string[] {
  const re = /href=["']([^"'#]*)/gi;
  const links: string[] = [];
  const assetExts = /\.(css|js|woff2?|ttf|eot|svg|png|jpe?g|gif|ico|webp|avif|xml|json|txt|pdf|zip|gz|mp4|webm)$/i;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let href = m[1];
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (href.startsWith('/')) href = `${siteUrl}${href}`;
    if (href.startsWith(siteUrl)) {
      const clean = href.split('?')[0].split('#')[0];
      if (assetExts.test(clean) || clean.includes('/cdn-cgi/')) continue;
      links.push(clean);
    }
  }
  return [...new Set(links)];
}

// ---------------------------------------------------------------------------
// Page checker
// ---------------------------------------------------------------------------
async function checkPage(url: string): Promise<PageResult> {
  const start = performance.now();
  let status = 0;
  let html = '';
  let size = 0;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
      headers: { 'User-Agent': 'SiteAudit/1.0' },
    });
    status = res.status;
    html = await res.text();
    size = new TextEncoder().encode(html).byteLength;
  } catch (e: any) {
    const loadTimeMs = Math.round(performance.now() - start);
    return {
      url, status: 0, loadTimeMs, issues: [{
        url, severity: 'error', category: 'Connectivity',
        message: `Failed to fetch: ${e.message}`,
        fix: 'Check if the page exists and the server is responding',
      }],
      hasOg: false, hasTwitterCard: false, imagesMissingAlt: 0, wordCount: 0, size: 0,
      internalLinks: [],
    };
  }

  const loadTimeMs = Math.round(performance.now() - start);
  const issues: Issue[] = [];

  // --- Status code ---
  if (status >= 400) {
    issues.push({
      url, severity: 'error', category: 'HTTP Status',
      message: `HTTP ${status}`,
      fix: status === 404 ? 'Page not found — remove from sitemap or fix the route' : `Server returned ${status}`,
    });
  } else if (status >= 300) {
    issues.push({
      url, severity: 'warning', category: 'Redirects',
      message: `HTTP ${status} redirect`,
      fix: 'Update internal links to point to the final URL',
    });
  }

  // --- Title ---
  const title = extractTag(html, 'title');
  if (!title) {
    issues.push({ url, severity: 'error', category: 'Title', message: 'Missing <title> tag', fix: 'Add a descriptive title' });
  } else if (title.length < 10) {
    issues.push({ url, severity: 'warning', category: 'Title', message: `Title too short (${title.length} chars)`, fix: 'Title should be 30-60 characters' });
  } else if (title.length > 60) {
    issues.push({ url, severity: 'warning', category: 'Title', message: `Title too long (${title.length} chars)`, fix: 'Title should be under 60 characters; truncated in SERPs at ~60' });
  }

  // --- Meta description ---
  const description = extractMeta(html, 'description');
  if (!description) {
    issues.push({ url, severity: 'warning', category: 'Meta Description', message: 'Missing meta description', fix: 'Add a meta description (120-160 chars)' });
  } else if (description.length < 50) {
    issues.push({ url, severity: 'notice', category: 'Meta Description', message: `Meta description too short (${description.length} chars)`, fix: 'Aim for 120-160 characters' });
  } else if (description.length > 160) {
    issues.push({ url, severity: 'notice', category: 'Meta Description', message: `Meta description too long (${description.length} chars)`, fix: 'Keep under 160 characters to avoid SERP truncation' });
  }

  // --- H1 ---
  const h1s = countH1(html);
  const h1 = h1s[0];
  if (h1s.length === 0) {
    issues.push({ url, severity: 'warning', category: 'H1', message: 'Missing H1 tag', fix: 'Every page should have exactly one H1' });
  } else if (h1s.length > 1) {
    issues.push({ url, severity: 'warning', category: 'H1', message: `Multiple H1 tags (${h1s.length})`, fix: 'Use only one H1 per page' });
  }

  // --- Canonical ---
  const canonical = extractCanonical(html);
  if (!canonical) {
    issues.push({ url, severity: 'warning', category: 'Canonical', message: 'Missing canonical tag', fix: 'Add <link rel="canonical" href="..."> pointing to self' });
  } else {
    const normalizedCanonical = canonical.replace(/\/$/, '');
    const normalizedUrl = url.replace(/\/$/, '');
    if (normalizedCanonical !== normalizedUrl) {
      issues.push({
        url, severity: 'notice', category: 'Canonical',
        message: `Non-self-referencing canonical: ${canonical}`,
        fix: 'Verify this is intentional (e.g., localized page pointing to default locale)',
      });
    }
  }

  // --- Robots meta ---
  const robotsMeta = extractMetaRobots(html);
  if (robotsMeta?.includes('noindex')) {
    issues.push({
      url, severity: 'notice', category: 'Indexing',
      message: 'Page has noindex directive',
    });
  }

  // --- OG tags ---
  const ogTitle = extractMeta(html, 'og:title');
  const ogDesc = extractMeta(html, 'og:description');
  const ogImage = extractMeta(html, 'og:image');
  const ogUrl = extractMeta(html, 'og:url');
  const hasOg = !!(ogTitle && ogDesc && ogImage);

  if (!ogTitle) issues.push({ url, severity: 'warning', category: 'Open Graph', message: 'Missing og:title', fix: 'Add og:title meta tag' });
  if (!ogDesc) issues.push({ url, severity: 'warning', category: 'Open Graph', message: 'Missing og:description', fix: 'Add og:description meta tag' });
  if (!ogImage) issues.push({ url, severity: 'warning', category: 'Open Graph', message: 'Missing og:image', fix: 'Add og:image meta tag (1200x630 recommended)' });
  if (!ogUrl) issues.push({ url, severity: 'notice', category: 'Open Graph', message: 'Missing og:url', fix: 'Add og:url meta tag' });

  // --- Twitter Card ---
  const twitterCard = extractMeta(html, 'twitter:card');
  const twitterTitle = extractMeta(html, 'twitter:title');
  const hasTwitterCard = !!(twitterCard && twitterTitle);

  if (!twitterCard) issues.push({ url, severity: 'notice', category: 'Twitter Card', message: 'Missing twitter:card', fix: 'Add twitter:card meta tag' });

  // --- Hreflang ---
  const hreflangLinks = extractHreflangLinks(html);
  if (hreflangLinks.length > 0) {
    const hasXDefault = hreflangLinks.some(l => l.hreflang === 'x-default');
    if (!hasXDefault) {
      issues.push({ url, severity: 'notice', category: 'Hreflang', message: 'Hreflang tags present but missing x-default', fix: 'Add hreflang="x-default" pointing to the default locale version' });
    }
    const hasSelf = hreflangLinks.some(l => l.href.replace(/\/$/, '') === url.replace(/\/$/, ''));
    if (!hasSelf) {
      issues.push({ url, severity: 'warning', category: 'Hreflang', message: 'Hreflang set is missing self-referencing entry', fix: 'Include the current URL in the hreflang set' });
    }
  }

  // --- Images without alt ---
  const imagesMissingAlt = countImagesWithoutAlt(html);
  if (imagesMissingAlt > 0) {
    issues.push({
      url, severity: 'warning', category: 'Images',
      message: `${imagesMissingAlt} image(s) missing alt attribute`,
      fix: 'Add descriptive alt text to all <img> tags',
    });
  }

  // --- Word count (thin content) ---
  const wordCount = countWords(html);
  if (wordCount < 100 && status === 200) {
    issues.push({
      url, severity: 'notice', category: 'Content',
      message: `Thin content (${wordCount} words)`,
      fix: 'Pages with very little text content may rank poorly',
    });
  }

  // --- Page size ---
  if (size > 500_000) {
    issues.push({
      url, severity: 'warning', category: 'Performance',
      message: `Large page size (${(size / 1024).toFixed(0)} KB)`,
      fix: 'Consider reducing HTML size — compress images, lazy-load below-fold content',
    });
  }

  // --- Load time ---
  if (loadTimeMs > 3000) {
    issues.push({
      url, severity: 'warning', category: 'Performance',
      message: `Slow response (${loadTimeMs}ms)`,
      fix: 'Target <1s server response time',
    });
  } else if (loadTimeMs > 1500) {
    issues.push({
      url, severity: 'notice', category: 'Performance',
      message: `Moderate response time (${loadTimeMs}ms)`,
    });
  }

  // --- Internal links ---
  const internalLinks = extractInternalLinks(html, SITE_URL);

  // --- Cloudflare email protection links ---
  const emailProtectionCount = (html.match(/\/cdn-cgi\/l\/email-protection/g) || []).length;
  if (emailProtectionCount > 0) {
    issues.push({
      url, severity: 'notice', category: 'Email Protection',
      message: `${emailProtectionCount} Cloudflare email-protection link(s) detected`,
      fix: 'Enable JS rendering in crawlers, or replace mailto: links with a contact form',
    });
  }

  return {
    url, status, loadTimeMs, issues,
    title, description, h1, canonical,
    hasOg, hasTwitterCard, imagesMissingAlt, wordCount, size,
    internalLinks,
  };
}

// ---------------------------------------------------------------------------
// Broken internal link checker
// ---------------------------------------------------------------------------
async function checkBrokenLinks(results: PageResult[]): Promise<Issue[]> {
  const linkSources = new Map<string, string[]>();

  for (const r of results) {
    for (const link of r.internalLinks || []) {
      if (!linkSources.has(link)) linkSources.set(link, []);
      linkSources.get(link)!.push(r.url);
    }
  }

  const crawledUrls = new Set(results.map(r => r.url.replace(/\/$/, '')));
  const issues: Issue[] = [];

  const uncrawled = [...linkSources.keys()].filter(u => {
    const normalized = u.replace(/\/$/, '');
    return !crawledUrls.has(normalized) && u.startsWith(SITE_URL) && !u.includes('/cdn-cgi/');
  });

  if (!args.json) {
    console.log(`  Found ${uncrawled.length} uncrawled internal link targets, checking...`);
  }

  let checked = 0;
  const checkConcurrency = Math.min(10, uncrawled.length);

  async function checkWorker() {
    while (checked < uncrawled.length) {
      const i = checked++;
      const targetUrl = uncrawled[i];

      try {
        const res = await fetch(targetUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
          redirect: 'follow',
          headers: { 'User-Agent': 'SiteAudit/1.0' },
        });
        if (res.status >= 400) {
          const sources = linkSources.get(targetUrl) || [];
          issues.push({
            url: sources[0] || targetUrl,
            severity: 'error',
            category: 'Broken Links',
            message: `Broken internal link to ${targetUrl.replace(SITE_URL, '')} (HTTP ${res.status})`,
            fix: `Remove or fix the link. Found on ${sources.length} page(s): ${sources.slice(0, 3).map(s => s.replace(SITE_URL, '')).join(', ')}`,
          });
        }
      } catch { /* skip connectivity errors */ }
    }
  }

  const workers = Array.from({ length: checkConcurrency }, () => checkWorker());
  await Promise.all(workers);

  return issues;
}

// ---------------------------------------------------------------------------
// Cross-page duplicate detection
// ---------------------------------------------------------------------------
function checkDuplicates(results: PageResult[]): Issue[] {
  const issues: Issue[] = [];
  const titleMap = new Map<string, string[]>();
  const descMap = new Map<string, string[]>();
  const h1Map = new Map<string, string[]>();

  for (const r of results) {
    if (r.title && r.status === 200) {
      const key = r.title.toLowerCase().trim();
      if (!titleMap.has(key)) titleMap.set(key, []);
      titleMap.get(key)!.push(r.url);
    }
    if (r.description && r.status === 200) {
      const key = r.description.toLowerCase().trim();
      if (!descMap.has(key)) descMap.set(key, []);
      descMap.get(key)!.push(r.url);
    }
    if (r.h1 && r.status === 200) {
      const key = r.h1.toLowerCase().trim();
      if (!h1Map.has(key)) h1Map.set(key, []);
      h1Map.get(key)!.push(r.url);
    }
  }

  // Duplicate titles = errors (affect health score in Ahrefs)
  for (const [title, urls] of titleMap) {
    if (urls.length > 1) {
      for (const url of urls) {
        issues.push({
          url, severity: 'error', category: 'Duplicate Title',
          message: `Title "${title.slice(0, 60)}..." shared by ${urls.length} pages`,
          fix: `Make each page's title unique. Other pages: ${urls.filter(u => u !== url).slice(0, 2).map(u => u.replace(SITE_URL, '')).join(', ')}`,
        });
      }
    }
  }

  // Duplicate descriptions = warnings (don't affect score)
  for (const [, urls] of descMap) {
    if (urls.length > 1) {
      for (const url of urls) {
        issues.push({
          url, severity: 'warning', category: 'Duplicate Description',
          message: `Meta description shared by ${urls.length} pages`,
          fix: `Make each page's description unique. Other pages: ${urls.filter(u => u !== url).slice(0, 2).map(u => u.replace(SITE_URL, '')).join(', ')}`,
        });
      }
    }
  }

  for (const [h1, urls] of h1Map) {
    if (urls.length > 1) {
      for (const url of urls) {
        issues.push({
          url, severity: 'warning', category: 'Duplicate H1',
          message: `H1 "${h1.slice(0, 60)}..." shared by ${urls.length} pages`,
          fix: `Make each page's H1 unique. Other pages: ${urls.filter(u => u !== url).slice(0, 2).map(u => u.replace(SITE_URL, '')).join(', ')}`,
        });
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Footer/header link validator
// ---------------------------------------------------------------------------
function checkCommonLinks(results: PageResult[]): { commonLinks: string[]; report: string } {
  const linkCount = new Map<string, number>();
  for (const r of results) {
    for (const link of r.internalLinks || []) {
      linkCount.set(link, (linkCount.get(link) || 0) + 1);
    }
  }

  const threshold = Math.max(2, Math.floor(results.length * 0.5));
  const commonLinks = [...linkCount.entries()]
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([link]) => link);

  const report = commonLinks
    .map(link => `  ${link.replace(SITE_URL, '')} (on ${linkCount.get(link)} of ${results.length} pages)`)
    .join('\n');

  return { commonLinks, report };
}

// ---------------------------------------------------------------------------
// Concurrent executor
// ---------------------------------------------------------------------------
async function crawlWithConcurrency(urls: string[]): Promise<PageResult[]> {
  const results: PageResult[] = [];
  let idx = 0;
  const total = urls.length;

  async function worker() {
    while (idx < urls.length) {
      const i = idx++;
      const url = urls[i];
      if (!args.json) {
        process.stdout.write(`\r  Crawling ${i + 1}/${total}...`);
      }
      const result = await checkPage(url);
      results.push(result);
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, urls.length) }, () => worker());
  await Promise.all(workers);

  if (!args.json) process.stdout.write('\r' + ' '.repeat(40) + '\r');

  return results;
}

// ---------------------------------------------------------------------------
// Health score calculation
// ---------------------------------------------------------------------------
function calculateHealthScore(results: PageResult[]): {
  score: number; errors: number; warnings: number; notices: number;
  pagesWithErrors: number; pagesWithWarnings: number;
} {
  let errors = 0;
  let warnings = 0;
  let notices = 0;

  for (const r of results) {
    for (const issue of r.issues) {
      if (issue.severity === 'error') errors++;
      else if (issue.severity === 'warning') warnings++;
      else notices++;
    }
  }

  // Ahrefs formula: only errors affect score
  const pagesWithErrors = results.filter(r => r.issues.some(i => i.severity === 'error')).length;
  const pagesWithWarnings = results.filter(r =>
    r.issues.some(i => i.severity === 'warning') && !r.issues.some(i => i.severity === 'error')
  ).length;
  const score = results.length > 0 ? Math.round(((results.length - pagesWithErrors) / results.length) * 100) : 0;

  return { score, errors, warnings, notices, pagesWithErrors, pagesWithWarnings };
}

// ---------------------------------------------------------------------------
// Console report
// ---------------------------------------------------------------------------
function printReport(results: PageResult[], extraIssues: Issue[], commonLinksReport: string) {
  const extraByUrl = new Map<string, Issue[]>();
  for (const issue of extraIssues) {
    if (!extraByUrl.has(issue.url)) extraByUrl.set(issue.url, []);
    extraByUrl.get(issue.url)!.push(issue);
  }

  const mergedResults = results.map(r => ({
    ...r,
    issues: [...r.issues, ...(extraByUrl.get(r.url) || [])],
  }));

  const { score, errors, warnings, notices, pagesWithErrors, pagesWithWarnings } = calculateHealthScore(mergedResults);

  // Aggregate issues by category
  const byCategory = new Map<string, { errors: number; warnings: number; notices: number; examples: Issue[] }>();
  const allIssues = mergedResults.flatMap(r => r.issues);

  for (const issue of allIssues) {
    if (!byCategory.has(issue.category)) {
      byCategory.set(issue.category, { errors: 0, warnings: 0, notices: 0, examples: [] });
    }
    const cat = byCategory.get(issue.category)!;
    if (issue.severity === 'error') cat.errors++;
    else if (issue.severity === 'warning') cat.warnings++;
    else cat.notices++;
    if (cat.examples.length < 3) cat.examples.push(issue);
  }

  if (args.json) {
    console.log(JSON.stringify({
      score,
      siteUrl: SITE_URL,
      totalPages: mergedResults.length,
      errors, warnings, notices,
      categories: Object.fromEntries(byCategory),
      pages: args.verbose ? mergedResults : undefined,
    }, null, 2));
    return;
  }

  // Console output
  console.log('\n' + '='.repeat(60));
  console.log(`  SITE HEALTH SCORE: ${score}%`);
  console.log('='.repeat(60));
  console.log(`  Site: ${SITE_URL}`);
  console.log(`  Pages crawled: ${mergedResults.length}`);
  console.log(`  Errors: ${errors}  |  Warnings: ${warnings}  |  Notices: ${notices}`);

  const cleanPages = mergedResults.length - pagesWithErrors;
  console.log(`  Clean pages: ${cleanPages}  |  With errors: ${pagesWithErrors}  |  With warnings only: ${pagesWithWarnings}`);
  console.log(`  (Ahrefs formula: only errors affect score, not warnings)`);

  // Performance stats
  const loadTimes = mergedResults.map(r => r.loadTimeMs).sort((a, b) => a - b);
  const avgLoad = Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length);
  const p95Load = loadTimes[Math.floor(loadTimes.length * 0.95)];
  console.log(`  Avg load: ${avgLoad}ms  |  P95: ${p95Load}ms`);
  console.log('='.repeat(60));

  // Issues by category
  console.log('\n  ISSUES BY CATEGORY:');
  console.log('-'.repeat(60));

  const sortedCats = [...byCategory.entries()].sort((a, b) => {
    const aWeight = a[1].errors * 10 + a[1].warnings * 5 + a[1].notices;
    const bWeight = b[1].errors * 10 + b[1].warnings * 5 + b[1].notices;
    return bWeight - aWeight;
  });

  for (const [category, data] of sortedCats) {
    const parts: string[] = [];
    if (data.errors) parts.push(`${data.errors} errors`);
    if (data.warnings) parts.push(`${data.warnings} warnings`);
    if (data.notices) parts.push(`${data.notices} notices`);

    console.log(`\n  ${category}: ${parts.join(', ')}`);

    if (args.fix || args.verbose) {
      for (const example of data.examples) {
        const path = example.url.replace(SITE_URL, '');
        console.log(`    ${example.severity === 'error' ? 'X' : example.severity === 'warning' ? '!' : '-'} ${path}: ${example.message}`);
        if (args.fix && example.fix) {
          console.log(`      -> ${example.fix}`);
        }
      }
    }
  }

  // Verbose per-page results
  if (args.verbose) {
    console.log('\n' + '='.repeat(60));
    console.log('  PER-PAGE RESULTS:');
    console.log('-'.repeat(60));
    for (const r of mergedResults.sort((a, b) => b.issues.length - a.issues.length)) {
      const path = r.url.replace(SITE_URL, '') || '/';
      console.log(`\n  [${r.status === 200 ? 'OK' : r.status}] ${path} (${r.loadTimeMs}ms, ${(r.size / 1024).toFixed(0)}KB, ${r.wordCount}w)`);
      if (r.issues.length > 0) {
        for (const issue of r.issues) {
          console.log(`    ${issue.severity === 'error' ? 'X' : issue.severity === 'warning' ? '!' : '-'} [${issue.category}] ${issue.message}`);
        }
      }
    }
  }

  // Common links
  if (commonLinksReport) {
    console.log('\n  FOOTER/HEADER LINKS (appear on 50%+ of pages):');
    console.log('-'.repeat(60));
    console.log(commonLinksReport);
  }

  // Duplicate summary
  const dupTitleCount = byCategory.get('Duplicate Title')?.errors || 0;
  const dupDescCount = byCategory.get('Duplicate Description')?.warnings || 0;
  const dupH1Count = byCategory.get('Duplicate H1')?.warnings || 0;
  if (dupTitleCount || dupDescCount || dupH1Count) {
    console.log('\n  CROSS-PAGE DUPLICATES:');
    console.log('-'.repeat(60));
    if (dupTitleCount) console.log(`  Duplicate titles: ${dupTitleCount} pages affected`);
    if (dupDescCount) console.log(`  Duplicate descriptions: ${dupDescCount} pages affected`);
    if (dupH1Count) console.log(`  Duplicate H1s: ${dupH1Count} pages affected`);
  }

  // Score target
  console.log('\n' + '='.repeat(60));
  if (score >= 80) {
    console.log('  Good health! Score is above 80% threshold.');
  } else {
    console.log(`  Target: 80% — need to fix ${Math.ceil((0.8 - score / 100) * mergedResults.length)} more pages`);
  }
  console.log('='.repeat(60) + '\n');
}

// ---------------------------------------------------------------------------
// Markdown report generator
// ---------------------------------------------------------------------------
function formatMarkdown(results: PageResult[], extraIssues: Issue[], commonLinksReport: string): string {
  const extraByUrl = new Map<string, Issue[]>();
  for (const issue of extraIssues) {
    if (!extraByUrl.has(issue.url)) extraByUrl.set(issue.url, []);
    extraByUrl.get(issue.url)!.push(issue);
  }

  const mergedResults = results.map(r => ({
    ...r,
    issues: [...r.issues, ...(extraByUrl.get(r.url) || [])],
  }));

  const { score, errors, warnings, notices, pagesWithErrors, pagesWithWarnings } = calculateHealthScore(mergedResults);
  const date = new Date().toISOString().split('T')[0];

  // Aggregate by category
  const byCategory = new Map<string, { errors: number; warnings: number; notices: number; examples: Issue[] }>();
  const allIssues = mergedResults.flatMap(r => r.issues);
  for (const issue of allIssues) {
    if (!byCategory.has(issue.category)) {
      byCategory.set(issue.category, { errors: 0, warnings: 0, notices: 0, examples: [] });
    }
    const cat = byCategory.get(issue.category)!;
    if (issue.severity === 'error') cat.errors++;
    else if (issue.severity === 'warning') cat.warnings++;
    else cat.notices++;
    if (cat.examples.length < 5) cat.examples.push(issue);
  }

  const sortedCats = [...byCategory.entries()].sort((a, b) => {
    const aWeight = a[1].errors * 10 + a[1].warnings * 5 + a[1].notices;
    const bWeight = b[1].errors * 10 + b[1].warnings * 5 + b[1].notices;
    return bWeight - aWeight;
  });

  // Performance stats
  const loadTimes = mergedResults.map(r => r.loadTimeMs).sort((a, b) => a - b);
  const avgLoad = Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length);
  const p95Load = loadTimes[Math.floor(loadTimes.length * 0.95)];

  const lines: string[] = [
    `# Site Health Audit — ${SITE_URL}`,
    ``,
    `**Date:** ${date}`,
    `**Health Score:** ${score}%`,
    `**Pages Crawled:** ${mergedResults.length}`,
    ``,
    `## Summary`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Health Score | **${score}%** |`,
    `| Pages Crawled | ${mergedResults.length} |`,
    `| Errors | ${errors} |`,
    `| Warnings | ${warnings} |`,
    `| Notices | ${notices} |`,
    `| Clean Pages | ${mergedResults.length - pagesWithErrors} |`,
    `| Pages with Errors | ${pagesWithErrors} |`,
    `| Pages with Warnings Only | ${pagesWithWarnings} |`,
    `| Avg Load Time | ${avgLoad}ms |`,
    `| P95 Load Time | ${p95Load}ms |`,
    ``,
    `> Ahrefs formula: only errors affect the health score, not warnings or notices.`,
    ``,
    `## Issues by Category`,
    ``,
    `| Category | Errors | Warnings | Notices |`,
    `|----------|--------|----------|---------|`,
  ];

  for (const [category, data] of sortedCats) {
    lines.push(`| ${category} | ${data.errors > 0 ? data.errors : '-'} | ${data.warnings > 0 ? data.warnings : '-'} | ${data.notices > 0 ? data.notices : '-'} |`);
  }

  // Top issues with fixes
  lines.push('', '## Top Issues & Fixes', '');

  for (const [category, data] of sortedCats) {
    if (data.errors === 0 && data.warnings === 0) continue;
    const total = data.errors + data.warnings + data.notices;
    lines.push(`### ${category} (${total} issues)`);
    lines.push('');
    for (const example of data.examples) {
      const path = example.url.replace(SITE_URL, '') || '/';
      const icon = example.severity === 'error' ? '**ERROR**' : example.severity === 'warning' ? 'WARNING' : 'notice';
      lines.push(`- \`${path}\`: ${example.message} [${icon}]`);
      if (example.fix) lines.push(`  - Fix: ${example.fix}`);
    }
    lines.push('');
  }

  // Duplicate summary
  const dupTitleCount = byCategory.get('Duplicate Title')?.errors || 0;
  const dupDescCount = byCategory.get('Duplicate Description')?.warnings || 0;
  const dupH1Count = byCategory.get('Duplicate H1')?.warnings || 0;
  if (dupTitleCount || dupDescCount || dupH1Count) {
    lines.push('## Cross-Page Duplicates', '');
    if (dupTitleCount) lines.push(`- **Duplicate titles:** ${dupTitleCount} pages affected`);
    if (dupDescCount) lines.push(`- **Duplicate descriptions:** ${dupDescCount} pages affected`);
    if (dupH1Count) lines.push(`- **Duplicate H1s:** ${dupH1Count} pages affected`);
    lines.push('');
  }

  // Score assessment
  lines.push('## Assessment', '');
  if (score >= 90) {
    lines.push('Excellent health score. Focus on maintaining this level and addressing remaining warnings.');
  } else if (score >= 80) {
    lines.push('Good health score (above 80% threshold). Fix remaining errors to push higher.');
  } else {
    lines.push(`Health score is below the 80% target. Need to fix errors on ${Math.ceil((0.8 - score / 100) * mergedResults.length)} more pages to reach threshold.`);
  }
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!args.json) {
    console.log('\n  Site Health Audit');
    console.log('  ' + '-'.repeat(40));
    console.log(`  Target: ${SITE_URL || '(from sitemap)'}`);
    console.log('  Fetching URLs...');
  }

  const allUrls = await fetchSitemapUrls();
  if (!args.json) {
    console.log(`  Found ${allUrls.length} URLs in sitemap`);
  }

  // Sample or crawl all
  let urls: string[];
  if (args.full || allUrls.length <= SAMPLE_SIZE) {
    urls = allUrls;
  } else {
    const shuffled = [...allUrls].sort(() => Math.random() - 0.5);
    urls = shuffled.slice(0, SAMPLE_SIZE);
    if (!args.json) {
      console.log(`  Sampling ${urls.length} URLs...`);
    }
  }

  // Crawl
  const results = await crawlWithConcurrency(urls);

  // Cross-page duplicate detection
  if (!args.json) console.log('  Checking for cross-page duplicates...');
  const duplicateIssues = checkDuplicates(results);

  // Check broken internal links
  if (!args.json) console.log('  Checking internal links...');
  const brokenLinkIssues = await checkBrokenLinks(results);

  // Footer/header links
  const { report: commonLinksReport } = checkCommonLinks(results);

  // Merge all extra issues
  const extraIssues = [...duplicateIssues, ...brokenLinkIssues];

  // Console report
  printReport(results, extraIssues, commonLinksReport);

  // Write markdown report to file if --output specified
  if (args.output) {
    const markdown = formatMarkdown(results, extraIssues, commonLinksReport);
    writeFileSync(args.output, markdown, 'utf-8');
    console.log(`  Report written to: ${args.output}`);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
