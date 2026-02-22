#!/usr/bin/env bun
/**
 * Indie Hackers Search Script
 *
 * Searches Indie Hackers via their public Algolia API.
 * Indexes available: products, groups, users.
 *
 * Usage:
 *   bun .claude/skills/indiehackers/scripts/ih-search.ts "AI agents" --index=products --limit=10
 *   bun .claude/skills/indiehackers/scripts/ih-search.ts "automation" --index=groups
 */

const ALGOLIA_APP_ID = "N86T1R3OWZ";
const ALGOLIA_API_KEY = "5140dac5e87f47346abbda1a34ee70c3";
const ALGOLIA_URL = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes`;

interface SearchResult {
  name: string;
  description: string;
  url: string;
  extra: Record<string, any>;
}

function parseArgs(args: string[]): {
  query: string;
  index: string;
  limit: number;
} {
  let query = "";
  let index = "products";
  let limit = 20;

  for (const arg of args) {
    if (arg.startsWith("--index=")) {
      index = arg.split("=")[1];
    } else if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.split("=")[1], 10);
    } else if (!arg.startsWith("--")) {
      query = arg;
    }
  }

  return { query, index, limit: Math.min(limit, 50) };
}

function formatProduct(hit: any): SearchResult {
  return {
    name: hit.name || "Unknown",
    description: hit.tagline || hit.description || "",
    url: `https://www.indiehackers.com/product/${hit.productId || hit.objectID}`,
    extra: {
      revenue: hit.revenue != null ? `$${hit.revenue}/mo` : "undisclosed",
      followers: hit.numFollowers || 0,
      started: hit.startDateStr || "unknown",
      website: hit.websiteUrl || null,
      twitter: hit.twitterHandle ? `@${hit.twitterHandle}` : null,
      tags: (hit._tags || []).filter((t: string) => t.startsWith("vertical-")).map((t: string) => t.replace("vertical-", "")),
    },
  };
}

function formatGroup(hit: any): SearchResult {
  return {
    name: hit.name || "Unknown",
    description: hit.description || hit.about || "",
    url: `https://www.indiehackers.com/group/${hit.objectID}`,
    extra: {
      members: hit.numMembers || 0,
      posts: hit.numPosts || 0,
    },
  };
}

function formatUser(hit: any): SearchResult {
  return {
    name: hit.username || hit.fullName || "Unknown",
    description: hit.bio || "",
    url: `https://www.indiehackers.com/${hit.username || hit.objectID}`,
    extra: {
      points: hit.points || 0,
      streak: hit.streak || 0,
    },
  };
}

async function searchIH(opts: { query: string; index: string; limit: number }): Promise<SearchResult[]> {
  const res = await fetch(`${ALGOLIA_URL}/${opts.index}/query`, {
    method: "POST",
    headers: {
      "x-algolia-application-id": ALGOLIA_APP_ID,
      "x-algolia-api-key": ALGOLIA_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: opts.query,
      hitsPerPage: opts.limit,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Algolia error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const hits = data.hits || [];

  const formatters: Record<string, (hit: any) => SearchResult> = {
    products: formatProduct,
    groups: formatGroup,
    users: formatUser,
  };

  const formatter = formatters[opts.index];
  if (!formatter) {
    throw new Error(`Unknown index: ${opts.index}. Available: products, groups, users`);
  }

  return hits.map(formatter);
}

// --- CLI ---
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help") {
  console.log(`
Indie Hackers Search — find relevant products, groups, and users

Uses Indie Hackers' public Algolia search API.

Usage:
  bun .claude/skills/indiehackers/scripts/ih-search.ts "<query>" [options]

Options:
  --index=VALUE    products (default) | groups | users
  --limit=N        Number of results, max 50 (default: 20)

Examples:
  bun .claude/skills/indiehackers/scripts/ih-search.ts "AI agents" --index=products
  bun .claude/skills/indiehackers/scripts/ih-search.ts "automation" --index=groups
  bun .claude/skills/indiehackers/scripts/ih-search.ts "claude" --index=users --limit=5
`);
  process.exit(0);
}

const opts = parseArgs(args);

if (!opts.query) {
  console.error("Error: query is required (first argument)");
  process.exit(1);
}

console.log(`Searching Indie Hackers: "${opts.query}" in ${opts.index}`);
console.log(`Limit: ${opts.limit}\n`);

try {
  const results = await searchIH(opts);

  if (results.length === 0) {
    console.log("No results found. Try different keywords or a different index.");
    process.exit(0);
  }

  // Structured JSON output
  console.log(JSON.stringify(results, null, 2));

  // Human-readable summary
  console.log(`\n--- Summary: ${results.length} results in "${opts.index}" ---\n`);
  for (const [i, r] of results.entries()) {
    console.log(`${i + 1}. ${r.name}`);
    if (r.description) console.log(`   ${r.description.slice(0, 150)}`);
    const extras = Object.entries(r.extra)
      .filter(([, v]) => v != null && v !== 0 && (!Array.isArray(v) || v.length > 0))
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join(" | ");
    if (extras) console.log(`   [${extras}]`);
    console.log(`   ${r.url}\n`);
  }
} catch (err) {
  console.error("Error searching Indie Hackers:", err);
  process.exit(1);
}
