#!/usr/bin/env bun
/**
 * Quora Search Script
 *
 * Searches Google for Quora questions via DataForSEO SERP API.
 * Uses `site:quora.com "query"` to find relevant questions.
 *
 * Requires: DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD env vars.
 *
 * Usage:
 *   bun .claude/skills/quora/scripts/quora-search.ts "AI agents for business" --limit=10
 *   bun .claude/skills/quora/scripts/quora-search.ts "best AI tools 2026" --location=2826
 */

const DATAFORSEO_API = "https://api.dataforseo.com/v3/serp/google/organic/live/regular";

interface QuoraResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
  questionSlug: string;
}

function parseArgs(args: string[]): {
  query: string;
  limit: number;
  location: number;
} {
  let query = "";
  let limit = 10;
  let location = 2840; // US

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--location=")) {
      location = parseInt(arg.split("=")[1], 10);
    } else if (!arg.startsWith("--")) {
      query = arg;
    }
  }

  return { query, limit: Math.min(limit, 30), location };
}

function isQuoraQuestion(url: string): boolean {
  // Filter out profile pages, topic pages, spaces, etc.
  // Valid question URLs look like: quora.com/What-is-the-best-AI-tool
  // They DON'T contain /profile/, /topic/, /space/, /q/, /answer/
  const path = new URL(url).pathname;
  const skipPatterns = ["/profile/", "/topic/", "/space/", "/q/", "/answer/", "/search"];
  if (skipPatterns.some((p) => path.includes(p))) return false;

  // Question URLs typically have a slug directly under root: /Some-Question-Here
  // or under a topic: /topic-name/Some-Question-Here
  // They usually contain hyphens (word separators in the slug)
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return false;

  return true;
}

function extractSlug(url: string): string {
  const path = new URL(url).pathname;
  return path.split("/").filter(Boolean).pop() || path;
}

async function searchQuora(opts: {
  query: string;
  limit: number;
  location: number;
}): Promise<QuoraResult[]> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new Error(
      "Missing DATAFORSEO_LOGIN and/or DATAFORSEO_PASSWORD environment variables.\n" +
        "Set them in your environment or .env file."
    );
  }

  const auth = Buffer.from(`${login}:${password}`).toString("base64");

  const keyword = `site:quora.com "${opts.query}"`;

  const body = [
    {
      keyword,
      location_code: opts.location,
      language_code: "en",
      device: "desktop",
      depth: opts.limit + 10, // fetch extra to account for non-question pages
    },
  ];

  const res = await fetch(DATAFORSEO_API, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DataForSEO API error: ${res.status} ${res.statusText}\n${text}`);
  }

  const data = await res.json();

  if (data.status_code !== 20000) {
    throw new Error(`DataForSEO error: ${data.status_message}`);
  }

  const task = data.tasks?.[0];
  if (!task || task.status_code !== 20000) {
    throw new Error(`DataForSEO task error: ${task?.status_message || "No task returned"}`);
  }

  const items = task.result?.[0]?.items || [];

  const results: QuoraResult[] = [];

  for (const item of items) {
    if (item.type !== "organic") continue;

    const url = item.url as string;
    if (!url || !url.includes("quora.com")) continue;
    if (!isQuoraQuestion(url)) continue;

    results.push({
      title: item.title || "",
      url,
      snippet: item.description || "",
      position: item.rank_absolute || item.rank_group || 0,
      questionSlug: extractSlug(url),
    });

    if (results.length >= opts.limit) break;
  }

  return results;
}

// --- CLI ---
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help") {
  console.log(`
Quora Search — find relevant questions for engagement

Uses DataForSEO Google SERP API with site:quora.com to find questions.

Usage:
  bun .claude/skills/quora/scripts/quora-search.ts "<query>" [options]

Options:
  --limit=N          Number of results, max 30 (default: 10)
  --location=CODE    DataForSEO location code (default: 2840 = US)

Common location codes:
  2840 = US, 2826 = UK, 2276 = Germany, 2036 = Australia, 2124 = Canada

Examples:
  bun .claude/skills/quora/scripts/quora-search.ts "AI agents for business"
  bun .claude/skills/quora/scripts/quora-search.ts "best AI tools 2026" --limit=15
  bun .claude/skills/quora/scripts/quora-search.ts "AI automation" --location=2826
`);
  process.exit(0);
}

const opts = parseArgs(args);

if (!opts.query) {
  console.error("Error: query is required (first argument)");
  process.exit(1);
}

console.log(`Searching Quora via Google: "${opts.query}"`);
console.log(`Limit: ${opts.limit} | Location: ${opts.location}\n`);

try {
  const results = await searchQuora(opts);

  if (results.length === 0) {
    console.log("No Quora questions found. Try different keywords.");
    process.exit(0);
  }

  // Output structured JSON for the agent
  console.log(JSON.stringify(results, null, 2));

  // Human-readable summary
  console.log(`\n--- Summary: ${results.length} Quora questions found ---\n`);
  for (const [i, r] of results.entries()) {
    console.log(`${i + 1}. [Google #${r.position}] ${r.title}`);
    if (r.snippet) console.log(`   > ${r.snippet.slice(0, 200)}`);
    console.log(`   ${r.url}\n`);
  }
} catch (err) {
  console.error("Error searching Quora:", err);
  process.exit(1);
}
