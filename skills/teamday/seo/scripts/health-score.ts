#!/usr/bin/env bun
/**
 * SEO Health Score Estimator
 *
 * Lightweight crawler that fetches pages from the sitemap, checks for common
 * SEO issues (the same ones Ahrefs Site Audit flags), and estimates a health
 * score percentage.
 *
 * Usage:
 *   bun run .claude/skills/seo/scripts/health-score.ts [--sample N] [--full] [--fix] [--verbose]
 *
 * Options:
 *   --sample N    Randomly sample N URLs (default: 50)
 *   --full        Crawl every URL in the sitemap
 *   --local       Use localhost:4322 (Astro dev server) for fast crawling
 *   --dist        Read HTML directly from packages/marketing/dist/ (no server needed)
 *   --fix         Output actionable fix suggestions
 *   --verbose     Print per-URL details
 *   --json        Output results as JSON
 *   --categories  Show issue counts grouped by category only (compact)
 */

import { parseArgs } from 'util';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    sample: { type: 'string', default: '50' },
    full: { type: 'boolean', default: false },
    local: { type: 'boolean', default: false },
    dist: { type: 'boolean', default: false },
    fix: { type: 'boolean', default: false },
    verbose: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    categories: { type: 'boolean', default: false },
  },
});

const SAMPLE_SIZE = args.full ? Infinity : parseInt(args.sample!, 10);
const PROD_URL = 'https://www.teamday.ai';
const LOCAL_URL = 'http://localhost:4322';
const SITE_URL = args.dist ? PROD_URL : (args.local ? LOCAL_URL : PROD_URL);
const CONCURRENCY = (args.local || args.dist) ? 20 : 8;
const TIMEOUT_MS = args.local ? 5_000 : 15_000;
const DIST_DIR = 'packages/marketing/dist';

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
  allHrefs: string[];  // ALL hrefs found (including cross-domain, assets, etc.)
}

// ---------------------------------------------------------------------------
// Dist-mode helpers — read HTML directly from filesystem
// ---------------------------------------------------------------------------
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

function scanDistUrls(): string[] {
  if (!existsSync(DIST_DIR)) {
    console.error(`  dist/ not found at ${DIST_DIR}. Run 'bun run build' in packages/marketing first.`);
    process.exit(1);
  }
  const files = execSync(`find ${DIST_DIR} -name '*.html' -type f`, { encoding: 'utf-8' });
  return files.trim().split('\n')
    .map(f => {
      const path = f.replace(DIST_DIR, '').replace(/\.html$/, '').replace(/\/index$/, '') || '/';
      return `${PROD_URL}${path}`;
    });
}

function readDistHtml(url: string): string | null {
  const path = url.replace(PROD_URL, '');
  // Try path.html, then path/index.html
  const candidates = [
    join(DIST_DIR, `${path}.html`),
    join(DIST_DIR, path, 'index.html'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, 'utf-8');
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sitemap fetcher — works with both prod and localhost
// ---------------------------------------------------------------------------
async function fetchSitemapUrls(): Promise<string[]> {
  // Try sitemap first (works on prod, may work on localhost if built)
  try {
    const indexRes = await fetch(`${SITE_URL}/sitemap-index.xml`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (indexRes.ok) {
      const indexXml = await indexRes.text();
      const sitemapUrls = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

      const allUrls: string[] = [];
      for (const rawUrl of sitemapUrls) {
        // When using --local, rewrite prod URLs in sitemap to localhost
        const sitemapUrl = args.local ? rawUrl.replace(PROD_URL, LOCAL_URL) : rawUrl;
        const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        const xml = await res.text();
        const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
        // Rewrite all URLs to target host
        allUrls.push(...urls.map(u => args.local ? u.replace(PROD_URL, LOCAL_URL) : u));
      }
      return allUrls.filter(u => u.startsWith(SITE_URL));
    }
  } catch { /* sitemap not available, fall through */ }

  // Fallback for localhost: scan dist/ for .html files
  if (args.local) {
    const { execSync } = await import('child_process');
    const distDir = 'packages/marketing/dist';
    try {
      const files = execSync(`find ${distDir} -name '*.html' -type f`, { encoding: 'utf-8' });
      return files.trim().split('\n')
        .map(f => f.replace(distDir, '').replace(/\.html$/, '').replace(/\/index$/, '') || '/')
        .map(path => `${SITE_URL}${path}`);
    } catch {
      console.error('  Cannot find sitemap or dist/ — is the dev server running?');
      process.exit(1);
    }
  }

  console.error('  Failed to fetch sitemap');
  process.exit(1);
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
  // Match both name="..." and property="..."
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
    const tag = m[0];
    // Has no alt attribute at all
    if (!/\balt\s*=/i.test(tag)) {
      count++;
    }
  }
  return count;
}

function countWords(html: string): number {
  // Strip tags, then count words
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.split(/\s+/).filter(Boolean).length;
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const re = /href=["']([^"'#]*)/gi;
  const links: string[] = [];
  // Extensions that are not HTML pages — skip when checking broken links
  const assetExts = /\.(css|js|woff2?|ttf|eot|svg|png|jpe?g|gif|ico|webp|avif|xml|json|txt|pdf|zip|gz|mp4|webm)$/i;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let href = m[1];
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    // Resolve relative URLs
    if (href.startsWith('/')) {
      href = `${SITE_URL}${href}`;
    }
    if (href.startsWith(SITE_URL)) {
      const clean = href.split('?')[0].split('#')[0]; // strip query & fragment
      // Skip assets and Cloudflare internal paths
      if (assetExts.test(clean) || clean.includes('/cdn-cgi/')) continue;
      links.push(clean);
    }
  }
  return [...new Set(links)];
}

/**
 * Extract ALL hrefs from HTML (including external, subdomain, non-www variants).
 * Used for cross-domain issue detection that Ahrefs catches but we previously missed.
 */
function extractAllHrefs(html: string, pageUrl: string): string[] {
  const re = /href=["']([^"'#]*)/gi;
  const hrefs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let href = m[1];
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('data:')) continue;
    // Resolve relative URLs
    if (href.startsWith('/')) {
      try {
        const base = new URL(pageUrl);
        href = `${base.origin}${href}`;
      } catch { continue; }
    }
    if (href.startsWith('http')) {
      hrefs.push(href.split('#')[0]);
    }
  }
  return [...new Set(hrefs)];
}

// ---------------------------------------------------------------------------
// Page checker
// ---------------------------------------------------------------------------
async function checkPage(url: string): Promise<PageResult> {
  const start = performance.now();
  let status = 0;
  let html = '';
  let size = 0;

  if (args.dist) {
    // Read directly from filesystem
    const content = readDistHtml(url);
    if (content) {
      status = 200;
      html = content;
      size = new TextEncoder().encode(html).byteLength;
    } else {
      status = 404;
    }
  } else {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: 'follow',
        headers: { 'User-Agent': 'TeamDay-SEO-Crawler/1.0' },
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
        internalLinks: [], allHrefs: [],
      };
    }
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
  // When running --local, canonicals point to prod URL — normalize for comparison
  const canonical = extractCanonical(html);
  const prodUrl = args.local ? url.replace(LOCAL_URL, PROD_URL) : url;
  if (!canonical) {
    issues.push({ url, severity: 'warning', category: 'Canonical', message: 'Missing canonical tag', fix: 'Add <link rel="canonical" href="..."> pointing to self' });
  } else {
    const normalizedCanonical = canonical.replace(/\/$/, '');
    const normalizedUrl = prodUrl.replace(/\/$/, '');
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
    // Check for x-default
    const hasXDefault = hreflangLinks.some(l => l.hreflang === 'x-default');
    if (!hasXDefault) {
      issues.push({ url, severity: 'notice', category: 'Hreflang', message: 'Hreflang tags present but missing x-default', fix: 'Add hreflang="x-default" pointing to the default locale version' });
    }
    // Check self-referencing hreflang (normalize localhost to prod for comparison)
    const hasSelf = hreflangLinks.some(l => {
      const href = l.href.replace(/\/$/, '');
      return href === prodUrl.replace(/\/$/, '') || href === url.replace(/\/$/, '');
    });
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
  const allHrefs = extractAllHrefs(html, url);

  // --- Cloudflare email protection links ---
  const emailProtectionRe = /\/cdn-cgi\/l\/email-protection/g;
  const emailProtectionCount = (html.match(emailProtectionRe) || []).length;
  if (emailProtectionCount > 0) {
    issues.push({
      url, severity: 'notice', category: 'Email Protection',
      message: `${emailProtectionCount} Cloudflare email-protection link(s) detected`,
      fix: 'Enable JS rendering in Ahrefs crawler, or replace mailto: links with a contact form/obfuscated text',
    });
  }

  return {
    url, status, loadTimeMs, issues,
    title, description, h1, canonical,
    hasOg, hasTwitterCard, imagesMissingAlt, wordCount, size,
    internalLinks, allHrefs,
  };
}

// ---------------------------------------------------------------------------
// Broken internal link checker (uses internalLinks from PageResult)
// ---------------------------------------------------------------------------
async function checkBrokenLinks(results: PageResult[]): Promise<Issue[]> {
  // Collect all internal links and their sources from crawled pages
  const linkSources = new Map<string, string[]>(); // target -> [source URLs]

  for (const r of results) {
    for (const link of r.internalLinks || []) {
      if (!linkSources.has(link)) linkSources.set(link, []);
      linkSources.get(link)!.push(r.url);
    }
  }

  // Normalize crawled URLs (strip trailing slashes for comparison)
  const crawledUrls = new Set(results.map(r => r.url.replace(/\/$/, '')));
  const issues: Issue[] = [];

  // Find links that point to URLs we didn't crawl (not in sitemap = potentially broken)
  // Exclude /cdn-cgi/ links (Cloudflare internal, already flagged by Email Protection check)
  const uncrawled = [...linkSources.keys()].filter(u => {
    const normalized = u.replace(/\/$/, '');
    return !crawledUrls.has(normalized) && u.startsWith(SITE_URL) && !u.includes('/cdn-cgi/');
  });

  if (!args.json) {
    console.log(`  Found ${uncrawled.length} uncrawled internal link targets, checking...`);
  }

  // Check all uncrawled links
  let checked = 0;
  const checkConcurrency = Math.min(10, uncrawled.length);

  async function checkWorker() {
    while (checked < uncrawled.length) {
      const i = checked++;
      const targetUrl = uncrawled[i];

      let isBroken = false;
      let statusCode = 0;

      if (args.dist) {
        // In dist mode, check if file exists on disk
        const content = readDistHtml(targetUrl);
        isBroken = content === null;
        statusCode = isBroken ? 404 : 200;
      } else {
        try {
          const res = await fetch(targetUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000),
            redirect: 'follow',
            headers: { 'User-Agent': 'TeamDay-SEO-Crawler/1.0' },
          });
          statusCode = res.status;
          isBroken = res.status >= 400;
        } catch {
          continue; // Skip connectivity errors
        }
      }

      if (isBroken) {
        const sources = linkSources.get(targetUrl) || [];
        issues.push({
          url: sources[0] || targetUrl,
          severity: 'error',
          category: 'Broken Links',
          message: `Broken internal link to ${targetUrl.replace(SITE_URL, '')} (HTTP ${statusCode})`,
          fix: `Remove or fix the link. Found on ${sources.length} page(s): ${sources.slice(0, 3).map(s => s.replace(SITE_URL, '')).join(', ')}`,
        });
      }
    }
  }

  const workers = Array.from({ length: checkConcurrency }, () => checkWorker());
  await Promise.all(workers);

  return issues;
}

// ---------------------------------------------------------------------------
// Cross-page duplicate detection (titles, descriptions, H1s)
// ---------------------------------------------------------------------------
function checkDuplicates(results: PageResult[]): Issue[] {
  const issues: Issue[] = [];

  // Group pages by title, description, and H1
  const titleMap = new Map<string, string[]>(); // title -> [urls]
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

  // Flag duplicates (2+ pages with same title/description/H1)
  // Ahrefs treats duplicate titles as ERRORS (affects health score)
  for (const [title, urls] of titleMap) {
    if (urls.length > 1) {
      for (const url of urls) {
        issues.push({
          url,
          severity: 'error',
          category: 'Duplicate Title',
          message: `Title "${title.slice(0, 60)}..." shared by ${urls.length} pages`,
          fix: `Make each page's title unique. Other pages: ${urls.filter(u => u !== url).slice(0, 2).map(u => u.replace(SITE_URL, '')).join(', ')}`,
        });
      }
    }
  }

  // Ahrefs treats duplicate descriptions as WARNINGS (do NOT affect score)
  for (const [desc, urls] of descMap) {
    if (urls.length > 1) {
      for (const url of urls) {
        issues.push({
          url,
          severity: 'warning',
          category: 'Duplicate Description',
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
          url,
          severity: 'warning',
          category: 'Duplicate H1',
          message: `H1 "${h1.slice(0, 60)}..." shared by ${urls.length} pages`,
          fix: `Make each page's H1 unique. Other pages: ${urls.filter(u => u !== url).slice(0, 2).map(u => u.replace(SITE_URL, '')).join(', ')}`,
        });
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Footer/header link validator (links appearing on 50%+ of pages)
// ---------------------------------------------------------------------------
function checkCommonLinks(results: PageResult[]): { commonLinks: string[]; report: string } {
  // Count how many pages each link appears on
  const linkCount = new Map<string, number>();
  for (const r of results) {
    for (const link of r.internalLinks || []) {
      linkCount.set(link, (linkCount.get(link) || 0) + 1);
    }
  }

  // Links on 50%+ of pages = footer/header links
  const threshold = Math.max(2, Math.floor(results.length * 0.5));
  const commonLinks = [...linkCount.entries()]
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([link, count]) => link);

  const report = commonLinks
    .map(link => `  ${link.replace(SITE_URL, '')} (on ${linkCount.get(link)} of ${results.length} pages)`)
    .join('\n');

  return { commonLinks, report };
}

// ---------------------------------------------------------------------------
// Cross-domain & link hygiene checks (catches issues Ahrefs finds by following ALL links)
// ---------------------------------------------------------------------------
function checkLinkHygiene(results: PageResult[]): { issues: Issue[]; report: string } {
  const issues: Issue[] = [];

  // Parse the canonical domain from SITE_URL (e.g., "www.teamday.ai")
  let canonicalHost: string;
  try { canonicalHost = new URL(SITE_URL).hostname; } catch { canonicalHost = ''; }
  // The bare domain without www (e.g., "teamday.ai")
  const bareDomain = canonicalHost.replace(/^www\./, '');

  // Collect all hrefs across all pages
  const subdomainLinks = new Map<string, Set<string>>(); // subdomain -> set of source pages
  const nonWwwLinks = new Map<string, Set<string>>();    // non-www URL -> source pages
  const fileExtLinks = new Map<string, Set<string>>();   // .md/.txt file URLs -> source pages
  const imageAsPageLinks = new Map<string, Set<string>>(); // image URLs linked as hrefs -> source pages

  const fileExts = /\.(md|txt|rst|log|csv)$/i;
  const imageExts = /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i;

  for (const r of results) {
    for (const href of r.allHrefs) {
      let hrefHost: string;
      let hrefPath: string;
      try {
        const u = new URL(href);
        hrefHost = u.hostname;
        hrefPath = u.pathname;
      } catch { continue; }

      // 1. Subdomain leakage — links to *.teamday.ai that aren't the canonical host
      //    Ahrefs in "subdomains" mode will crawl these and count them in your audit
      if (hrefHost !== canonicalHost && hrefHost.endsWith(`.${bareDomain}`)) {
        if (!subdomainLinks.has(href)) subdomainLinks.set(href, new Set());
        subdomainLinks.get(href)!.add(r.url);
      }

      // 2. Non-www links — teamday.ai/... without www prefix
      //    These resolve differently and create duplicate crawl targets for Ahrefs
      if (hrefHost === bareDomain && canonicalHost.startsWith('www.')) {
        if (!nonWwwLinks.has(href)) nonWwwLinks.set(href, new Set());
        nonWwwLinks.get(href)!.add(r.url);
      }

      // 3. Raw file links — .md, .txt files linked as hrefs
      //    Ahrefs crawls these as pages and they return 404 or raw text
      if (hrefHost === canonicalHost && fileExts.test(hrefPath)) {
        if (!fileExtLinks.has(href)) fileExtLinks.set(href, new Set());
        fileExtLinks.get(href)!.add(r.url);
      }

      // 4. Image URLs linked as hrefs (not <img src>, but <a href>)
      //    Ahrefs treats these as page links and flags them as non-HTML pages
      if (hrefHost === canonicalHost && imageExts.test(hrefPath)) {
        if (!imageAsPageLinks.has(href)) imageAsPageLinks.set(href, new Set());
        imageAsPageLinks.get(href)!.add(r.url);
      }
    }
  }

  // Generate issues
  // Subdomain links — group by subdomain for reporting
  const subdomainGroups = new Map<string, { count: number; examples: string[] }>();
  for (const [href, sources] of subdomainLinks) {
    try {
      const host = new URL(href).hostname;
      if (!subdomainGroups.has(host)) subdomainGroups.set(host, { count: 0, examples: [] });
      const g = subdomainGroups.get(host)!;
      g.count++;
      if (g.examples.length < 3) g.examples.push(href);
    } catch { /* skip */ }
  }
  for (const [subdomain, data] of subdomainGroups) {
    issues.push({
      url: SITE_URL,
      severity: 'error',
      category: 'Subdomain Leakage',
      message: `${data.count} link(s) to subdomain ${subdomain} found — Ahrefs will crawl these in "subdomains" audit mode`,
      fix: `Either change audit scope to "prefix" mode, add robots.txt Disallow on the subdomain, or remove links. Examples: ${data.examples.slice(0, 2).join(', ')}`,
    });
  }

  // Non-www links
  if (nonWwwLinks.size > 0) {
    const examples = [...nonWwwLinks.keys()].slice(0, 5);
    const sourcePages = new Set<string>();
    for (const sources of nonWwwLinks.values()) {
      for (const s of sources) sourcePages.add(s);
    }
    issues.push({
      url: [...sourcePages][0] || SITE_URL,
      severity: 'warning',
      category: 'Non-Canonical Domain',
      message: `${nonWwwLinks.size} link(s) use non-www domain (${bareDomain} instead of ${canonicalHost})`,
      fix: `Update links to use ${canonicalHost}. Examples: ${examples.slice(0, 3).map(u => u.replace(`https://${bareDomain}`, '')).join(', ')}`,
    });
  }

  // Raw file links
  for (const [href, sources] of fileExtLinks) {
    issues.push({
      url: [...sources][0],
      severity: 'warning',
      category: 'Raw File Link',
      message: `Link to raw file: ${href.replace(SITE_URL, '')}`,
      fix: `Replace with the rendered HTML page URL. Found on ${sources.size} page(s).`,
    });
  }

  // Image-as-page links (only flag if there are many — a few are normal for gallery/lightbox)
  if (imageAsPageLinks.size > 5) {
    issues.push({
      url: SITE_URL,
      severity: 'notice',
      category: 'Image Links',
      message: `${imageAsPageLinks.size} image URLs linked as <a href> (not <img src>) — Ahrefs may flag as non-HTML pages`,
      fix: 'Consider using <img> tags or lightbox overlays instead of linking directly to image files',
    });
  }

  // Build report section
  const reportLines: string[] = [];
  if (subdomainGroups.size > 0) {
    reportLines.push('  SUBDOMAIN LEAKAGE:');
    for (const [subdomain, data] of subdomainGroups) {
      reportLines.push(`    ${subdomain}: ${data.count} links (e.g. ${data.examples[0]})`);
    }
  }
  if (nonWwwLinks.size > 0) {
    reportLines.push(`  NON-WWW LINKS: ${nonWwwLinks.size} links to ${bareDomain} (should be ${canonicalHost})`);
    const examples = [...nonWwwLinks.keys()].slice(0, 3);
    for (const ex of examples) {
      reportLines.push(`    ${ex}`);
    }
  }
  if (fileExtLinks.size > 0) {
    reportLines.push(`  RAW FILE LINKS: ${fileExtLinks.size} links to .md/.txt files`);
    for (const [href] of [...fileExtLinks.entries()].slice(0, 5)) {
      reportLines.push(`    ${href.replace(SITE_URL, '')}`);
    }
  }

  return { issues, report: reportLines.join('\n') };
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
function calculateHealthScore(results: PageResult[]): { score: number; errors: number; warnings: number; notices: number; pagesWithErrors: number; pagesWithWarnings: number } {
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

  // Ahrefs formula: ONLY errors affect the score, NOT warnings or notices
  // score = (total_pages - pages_with_errors) / total_pages * 100
  const pagesWithErrors = results.filter(r => r.issues.some(i => i.severity === 'error')).length;
  const pagesWithWarnings = results.filter(r => r.issues.some(i => i.severity === 'warning') && !r.issues.some(i => i.severity === 'error')).length;
  const score = results.length > 0 ? Math.round(((results.length - pagesWithErrors) / results.length) * 100) : 0;

  return { score, errors, warnings, notices, pagesWithErrors, pagesWithWarnings };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
function printReport(results: PageResult[], extraIssues: Issue[], commonLinksReport: string, hygieneReport?: string) {
  // Merge extra issues (broken links, duplicates) into the results for scoring
  // Create a map for quick lookup
  const extraByUrl = new Map<string, Issue[]>();
  for (const issue of extraIssues) {
    if (!extraByUrl.has(issue.url)) extraByUrl.set(issue.url, []);
    extraByUrl.get(issue.url)!.push(issue);
  }

  // Clone results with extra issues merged in for accurate scoring
  const mergedResults = results.map(r => ({
    ...r,
    issues: [...r.issues, ...(extraByUrl.get(r.url) || [])],
  }));

  const { score, errors, warnings, notices, pagesWithErrors, pagesWithWarnings } = calculateHealthScore(mergedResults);

  // Aggregate issues by category
  const byCategory = new Map<string, { errors: number; warnings: number; notices: number; examples: Issue[] }>();
  const allIssues = [...mergedResults.flatMap(r => r.issues)];

  for (const issue of allIssues) {
    if (!byCategory.has(issue.category)) {
      byCategory.set(issue.category, { errors: 0, warnings: 0, notices: 0, examples: [] });
    }
    const cat = byCategory.get(issue.category)!;
    cat[issue.severity]++;
    if (cat.examples.length < 3) cat.examples.push(issue);
  }

  if (args.json) {
    console.log(JSON.stringify({
      score,
      totalPages: mergedResults.length,
      errors,
      warnings,
      notices,
      categories: Object.fromEntries(byCategory),
      linkHygiene: hygieneReport || null,
      pages: args.verbose ? mergedResults : undefined,
    }, null, 2));
    return;
  }

  // Console report
  console.log('\n' + '='.repeat(60));
  console.log(`  SEO HEALTH SCORE: ${score}%`);
  console.log('='.repeat(60));
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

  // Verbose: per-page results
  if (args.verbose) {
    console.log('\n' + '='.repeat(60));
    console.log('  PER-PAGE RESULTS:');
    console.log('-'.repeat(60));
    for (const r of mergedResults.sort((a, b) => b.issues.length - a.issues.length)) {
      const path = r.url.replace(SITE_URL, '') || '/';
      const issueCount = r.issues.length;
      const status = r.status === 200 ? 'OK' : `${r.status}`;
      console.log(`\n  [${status}] ${path} (${r.loadTimeMs}ms, ${(r.size / 1024).toFixed(0)}KB, ${r.wordCount}w)`);
      if (r.issues.length > 0) {
        for (const issue of r.issues) {
          console.log(`    ${issue.severity === 'error' ? 'X' : issue.severity === 'warning' ? '!' : '-'} [${issue.category}] ${issue.message}`);
        }
      }
    }
  }

  // Common links (footer/header)
  if (commonLinksReport) {
    console.log('\n  FOOTER/HEADER LINKS (appear on 50%+ of pages):');
    console.log('-'.repeat(60));
    console.log(commonLinksReport);
  }

  // Duplicate summary
  const dupTitles = [...(byCategory.get('Duplicate Title') || { errors: 0, warnings: 0 }).warnings ? [byCategory.get('Duplicate Title')!] : []];
  const dupTitleCount = byCategory.get('Duplicate Title')?.warnings || 0;
  const dupDescCount = byCategory.get('Duplicate Description')?.warnings || 0;
  const dupH1Count = byCategory.get('Duplicate H1')?.warnings || 0;
  if (dupTitleCount || dupDescCount || dupH1Count) {
    console.log('\n  CROSS-PAGE DUPLICATES:');
    console.log('-'.repeat(60));
    if (dupTitleCount) console.log(`  Duplicate titles: ${dupTitleCount} pages affected`);
    if (dupDescCount) console.log(`  Duplicate descriptions: ${dupDescCount} pages affected`);
    if (dupH1Count) console.log(`  Duplicate H1s: ${dupH1Count} pages affected`);
  }

  // Link hygiene report (subdomain leakage, non-www, raw files)
  if (hygieneReport) {
    console.log('\n  LINK HYGIENE (Ahrefs "subdomains" audit catches these):');
    console.log('-'.repeat(60));
    console.log(hygieneReport);
  }

  // Score target
  console.log('\n' + '='.repeat(60));
  if (score >= 80) {
    console.log('  READY to trigger Ahrefs re-crawl!');
  } else {
    console.log(`  Target: 80% — need to fix ${Math.ceil((0.8 - score / 100) * mergedResults.length)} more pages`);
  }
  console.log('='.repeat(60) + '\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!args.json) {
    console.log('\n  TeamDay SEO Health Score Estimator');
    console.log('  ' + '-'.repeat(40));
    if (args.dist) {
      console.log('  Mode: dist/ (reading HTML from filesystem)');
    } else {
      console.log(`  Mode: ${args.local ? 'localhost' : 'production'}`);
    }
    console.log('  Fetching URLs...');
  }

  const allUrls = args.dist ? scanDistUrls() : await fetchSitemapUrls();
  if (!args.json) {
    console.log(`  Found ${allUrls.length} URLs in sitemap`);
  }

  // Sample or crawl all
  let urls: string[];
  if (args.full || allUrls.length <= SAMPLE_SIZE) {
    urls = allUrls;
  } else {
    // Random sample
    const shuffled = [...allUrls].sort(() => Math.random() - 0.5);
    urls = shuffled.slice(0, SAMPLE_SIZE);
    if (!args.json) {
      console.log(`  Sampling ${urls.length} URLs...`);
    }
  }

  // Crawl
  const results = await crawlWithConcurrency(urls);

  // Cross-page duplicate detection
  if (!args.json) {
    console.log('  Checking for cross-page duplicates...');
  }
  const duplicateIssues = checkDuplicates(results);

  // Check broken internal links (uses internalLinks from PageResult)
  if (!args.json) {
    console.log('  Checking internal links...');
  }
  const brokenLinkIssues = await checkBrokenLinks(results);

  // Identify footer/header links (common links on 50%+ of pages)
  const { commonLinks, report: commonLinksReport } = checkCommonLinks(results);

  // Cross-domain & link hygiene checks (subdomain leakage, non-www, raw file links)
  if (!args.json) {
    console.log('  Checking link hygiene (subdomains, non-www, raw files)...');
  }
  const { issues: hygieneIssues, report: hygieneReport } = checkLinkHygiene(results);

  // Merge all extra issues
  const extraIssues = [...duplicateIssues, ...brokenLinkIssues, ...hygieneIssues];

  // Report
  printReport(results, extraIssues, commonLinksReport, hygieneReport);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
