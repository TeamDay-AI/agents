#!/usr/bin/env bun
/**
 * Quora Question Reader
 *
 * Reads a Quora question page and extracts the question + top answers.
 * Uses a tiered fallback strategy since Quora blocks direct fetch:
 *   Tier 1: Direct fetch (rarely works — Cloudflare blocks most requests)
 *   Tier 2: Wayback Machine snapshot (archive.org — often has Quora pages)
 *   Tier 3: Browser automation via browser skill scripts (most reliable)
 *
 * NOTE: For agents with WebFetch tool access, using WebFetch directly on
 * the Quora URL is often the simplest approach. This script is for
 * automated/batch processing or when WebFetch isn't available.
 *
 * Usage:
 *   bun .claude/skills/quora/scripts/quora-read.ts "https://www.quora.com/What-are-the-best-AI-tools"
 *   bun .claude/skills/quora/scripts/quora-read.ts "https://www.quora.com/..." --method=browser
 */

interface QuoraAnswer {
  author: string;
  content: string;
  upvotes: string;
  index: number;
}

interface QuoraPage {
  url: string;
  title: string;
  description: string;
  answerCount: string;
  answers: QuoraAnswer[];
  method: string;
}

function parseArgs(args: string[]): {
  url: string;
  method: "auto" | "fetch" | "wayback" | "browser";
} {
  let url = "";
  let method: "auto" | "fetch" | "wayback" | "browser" = "auto";

  for (const arg of args) {
    if (arg.startsWith("--method=")) {
      method = arg.split("=")[1] as any;
    } else if (!arg.startsWith("--")) {
      url = arg;
    }
  }

  return { url, method };
}

function extractFromHtml(html: string): Partial<QuoraPage> {
  const result: Partial<QuoraPage> = {};

  // Extract title from og:title or <title> tag
  const ogTitleMatch =
    html.match(/property="og:title"\s+content="([^"]+)"/i) ||
    html.match(/content="([^"]+)"\s+property="og:title"/i);
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

  if (ogTitleMatch) {
    result.title = decodeHtmlEntities(ogTitleMatch[1]).replace(/ - Quora$/, "");
  } else if (titleMatch) {
    result.title = decodeHtmlEntities(titleMatch[1]).replace(/ - Quora$/, "");
  } else {
    result.title = "Unknown";
  }

  // Extract description from og:description or meta description
  const descMatch =
    html.match(/property="og:description"\s+content="([^"]+)"/i) ||
    html.match(/content="([^"]+)"\s+property="og:description"/i) ||
    html.match(/name="description"\s+content="([^"]+)"/i);
  result.description = descMatch ? decodeHtmlEntities(descMatch[1]) : "";

  // Try to extract answer count from page content
  const answerCountMatch = html.match(/(\d+)\s+answers?/i);
  result.answerCount = answerCountMatch ? answerCountMatch[1] : "unknown";

  // Extract answers from structured data (JSON-LD)
  const answers: QuoraAnswer[] = [];

  // Try JSON-LD first (most reliable when present)
  const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    try {
      const ld = JSON.parse(match[1]);

      // QAPage schema
      if (ld["@type"] === "QAPage" && ld.mainEntity) {
        const q = ld.mainEntity;
        if (q.name) result.title = decodeHtmlEntities(q.name);
        if (q.answerCount) result.answerCount = String(q.answerCount);

        const acceptedAnswer = q.acceptedAnswer;
        if (acceptedAnswer) {
          const answerList = Array.isArray(acceptedAnswer) ? acceptedAnswer : [acceptedAnswer];
          for (const a of answerList) {
            answers.push({
              author: a.author?.name || "Anonymous",
              content: stripHtml(a.text || ""),
              upvotes: String(a.upvoteCount || "?"),
              index: answers.length + 1,
            });
          }
        }

        const suggestedAnswer = q.suggestedAnswer;
        if (suggestedAnswer) {
          const suggList = Array.isArray(suggestedAnswer) ? suggestedAnswer : [suggestedAnswer];
          for (const a of suggList) {
            answers.push({
              author: a.author?.name || "Anonymous",
              content: stripHtml(a.text || ""),
              upvotes: String(a.upvoteCount || "?"),
              index: answers.length + 1,
            });
          }
        }
      }
    } catch {
      // JSON parse failed, skip
    }
  }

  result.answers = answers;
  return result;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// --- Tier 1: Direct Fetch ---
async function fetchDirect(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    if (!res.ok) return null;

    const html = await res.text();
    // Cloudflare challenge pages are small and contain "Just a moment"
    if (html.includes("Just a moment") || html.includes("cf-browser-verification")) return null;
    // Quora login walls are small JS shells
    if (html.length < 5000) return null;
    // Must contain actual Quora content markers
    if (!html.includes("QAPage") && !html.includes("og:title")) return null;
    return html;
  } catch {
    return null;
  }
}

// --- Tier 2: Wayback Machine ---
async function fetchWayback(url: string): Promise<string | null> {
  try {
    // First, check if Wayback Machine has this URL
    const checkUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    const checkRes = await fetch(checkUrl, {
      headers: { "User-Agent": "QuoraSkill/1.0" },
    });

    if (!checkRes.ok) return null;

    const checkData = await checkRes.json();
    const snapshot = checkData?.archived_snapshots?.closest;
    if (!snapshot || !snapshot.available) return null;

    // Fetch the archived page
    const archiveUrl = snapshot.url;
    console.log(`  Found snapshot from ${snapshot.timestamp.slice(0, 8)}: ${archiveUrl}`);

    const res = await fetch(archiveUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!res.ok) return null;

    const html = await res.text();
    if (html.length < 3000) return null;
    // Strip Wayback Machine toolbar injection
    return html.replace(/<!-- BEGIN WAYBACK TOOLBAR INSERT -->[\s\S]*?<!-- END WAYBACK TOOLBAR INSERT -->/gi, "");
  } catch {
    return null;
  }
}

// --- Tier 3: Browser Automation ---
async function fetchBrowser(url: string): Promise<string | null> {
  try {
    // Navigate to the page
    const nav = Bun.spawnSync({
      cmd: ["bun", ".claude/skills/browser/scripts/browser-navigate.ts", url],
      stdout: "pipe",
      stderr: "pipe",
    });

    if (nav.exitCode !== 0) {
      console.error("  Browser navigate failed:", nav.stderr.toString().slice(0, 200));
      return null;
    }

    // Wait for page to load and JS to render
    await Bun.sleep(4000);

    // Extract page HTML via browser-eval
    const evalCmd = Bun.spawnSync({
      cmd: [
        "bun",
        ".claude/skills/browser/scripts/browser-eval.ts",
        "document.documentElement.outerHTML",
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    if (evalCmd.exitCode !== 0) {
      console.error("  Browser eval failed:", evalCmd.stderr.toString().slice(0, 200));
      return null;
    }

    const html = evalCmd.stdout.toString();
    if (html.length < 3000) return null;
    return html;
  } catch (err) {
    console.error("  Browser error:", err);
    return null;
  }
}

async function readQuoraPage(url: string, method: string): Promise<QuoraPage> {
  let html: string | null = null;
  let usedMethod = method;

  if (method === "auto" || method === "fetch") {
    console.log("Tier 1: Trying direct fetch...");
    html = await fetchDirect(url);
    if (html) {
      usedMethod = "fetch";
      console.log("  Success.");
    } else {
      console.log("  Blocked (Cloudflare/login wall).");
    }
  }

  if (!html && (method === "auto" || method === "wayback")) {
    console.log("Tier 2: Checking Wayback Machine...");
    html = await fetchWayback(url);
    if (html) {
      usedMethod = "wayback";
      console.log("  Success (archived snapshot).");
    } else {
      console.log("  No snapshot available.");
    }
  }

  if (!html && (method === "auto" || method === "browser")) {
    console.log("Tier 3: Trying browser automation...");
    console.log("  (Requires: bun .claude/skills/browser/scripts/browser-start.ts)");
    html = await fetchBrowser(url);
    if (html) {
      usedMethod = "browser";
      console.log("  Success (browser rendered).");
    } else {
      console.log("  Browser extraction failed.");
    }
  }

  if (!html) {
    throw new Error(
      "Could not read Quora page with any method.\n" +
        "Recommended alternatives:\n" +
        "  1. Use WebFetch tool directly on the URL (if available)\n" +
        "  2. Start browser first: bun .claude/skills/browser/scripts/browser-start.ts\n" +
        "  3. Try --method=browser explicitly"
    );
  }

  const extracted = extractFromHtml(html);

  return {
    url,
    title: extracted.title || "Unknown",
    description: extracted.description || "",
    answerCount: extracted.answerCount || "unknown",
    answers: extracted.answers || [],
    method: usedMethod,
  };
}

// --- CLI ---
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help") {
  console.log(`
Quora Reader — fetch question + answers for analysis

Tiered fallback: direct fetch → Wayback Machine → browser automation.

Usage:
  bun .claude/skills/quora/scripts/quora-read.ts "<quora-url>" [options]

Options:
  --method=VALUE   auto (default) | fetch | wayback | browser

Note: Quora blocks most direct requests via Cloudflare. The most reliable
methods are Wayback Machine (for popular questions) and browser automation
(for any page). Agents with WebFetch tool access should try that first.

Examples:
  bun .claude/skills/quora/scripts/quora-read.ts "https://www.quora.com/What-are-the-best-AI-tools"
  bun .claude/skills/quora/scripts/quora-read.ts "https://www.quora.com/..." --method=browser
`);
  process.exit(0);
}

const opts = parseArgs(args);

if (!opts.url) {
  console.error("Error: Quora URL is required (first argument)");
  process.exit(1);
}

if (!opts.url.includes("quora.com")) {
  console.error("Error: URL must be a quora.com URL");
  process.exit(1);
}

console.log(`Reading Quora page: ${opts.url}`);
console.log(`Method: ${opts.method}\n`);

try {
  const page = await readQuoraPage(opts.url, opts.method);

  // Print human-readable output
  console.log("\n=== QUESTION ===");
  console.log(`Title: ${page.title}`);
  if (page.description) console.log(`Description: ${page.description}`);
  console.log(`Answers: ${page.answerCount} | Method: ${page.method}`);
  console.log(`URL: ${page.url}`);
  console.log();

  if (page.answers.length > 0) {
    console.log(`=== TOP ANSWERS (${page.answers.length} extracted) ===\n`);
    for (const a of page.answers) {
      console.log(`--- Answer #${a.index} by ${a.author} (${a.upvotes} upvotes) ---`);
      console.log(a.content);
      console.log();
    }
  } else {
    console.log("No answers could be extracted from the HTML.");
    console.log("Tips:");
    console.log("  - Try --method=browser for JavaScript-rendered content");
    console.log("  - Use WebFetch tool directly if available");
  }

  // Structured JSON to stderr for programmatic use
  process.stderr.write(JSON.stringify(page, null, 2));
} catch (err) {
  console.error("Error reading Quora page:", err);
  process.exit(1);
}
