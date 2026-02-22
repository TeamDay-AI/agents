#!/usr/bin/env bun
/**
 * Hacker News Search Script
 *
 * Searches Hacker News via the Algolia API for posts and comments.
 * No authentication required — uses the public Algolia endpoint.
 *
 * Usage:
 *   bun .claude/skills/hackernews/scripts/hn-search.ts "ai agents" --sort=date --time=week
 *   bun .claude/skills/hackernews/scripts/hn-search.ts "claude code" --type=comment --limit=10
 */

const HN_ALGOLIA_BASE = "https://hn.algolia.com/api/v1";
const USER_AGENT = "TeamDay-HNSkill/1.0 (research bot)";

interface SearchResult {
  title: string;
  author: string;
  score: number;
  comments: number;
  age: string;
  type: "story" | "comment";
  permalink: string;
  preview: string;
}

function parseArgs(args: string[]): {
  query: string;
  sort: string;
  time: string;
  limit: number;
  type: string;
} {
  let query = "";
  let sort = "popularity";
  let time = "week";
  let limit = 25;
  let type = "story";

  for (const arg of args) {
    if (arg.startsWith("--sort=")) {
      sort = arg.split("=")[1];
    } else if (arg.startsWith("--time=")) {
      time = arg.split("=")[1];
    } else if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--type=")) {
      type = arg.split("=")[1];
    } else if (!arg.startsWith("--")) {
      query = arg;
    }
  }

  return { query, sort, time, limit, type };
}

function timeAgo(utcSeconds: number): string {
  const now = Date.now() / 1000;
  const diff = now - utcSeconds;

  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return `${Math.floor(diff / 2592000)}mo ago`;
}

function truncate(text: string, maxLen: number): string {
  if (!text) return "";
  const clean = text.replace(/\n/g, " ").trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + "..." : clean;
}

function getTimeFilter(time: string): string {
  const now = Math.floor(Date.now() / 1000);
  const ranges: Record<string, number> = {
    day: 86400,
    week: 604800,
    month: 2592000,
    year: 31536000,
  };

  if (time === "all" || !ranges[time]) return "";
  return `created_at_i>${now - ranges[time]}`;
}

async function searchHN(opts: {
  query: string;
  sort: string;
  time: string;
  limit: number;
  type: string;
}): Promise<SearchResult[]> {
  // Use /search_by_date for date sort, /search for popularity
  const endpoint = opts.sort === "date" ? "search_by_date" : "search";

  const params = new URLSearchParams({
    query: opts.query,
    hitsPerPage: String(Math.min(opts.limit, 100)),
  });

  // Add type filter via tags
  if (opts.type === "story") {
    params.set("tags", "story");
  } else if (opts.type === "comment") {
    params.set("tags", "comment");
  }
  // "all" = no tags filter

  // Add time filter
  const timeFilter = getTimeFilter(opts.time);
  if (timeFilter) {
    params.set("numericFilters", timeFilter);
  }

  const url = `${HN_ALGOLIA_BASE}/${endpoint}?${params}`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`HN Algolia API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  return data.hits.map((hit: any) => {
    const isComment = (hit._tags || []).includes("comment");
    const title = hit.title || hit.story_title || "(untitled)";

    return {
      title,
      author: hit.author || "unknown",
      score: hit.points ?? 0,
      comments: hit.num_comments ?? 0,
      age: timeAgo(hit.created_at_i),
      type: isComment ? "comment" : "story",
      permalink: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      preview: isComment
        ? truncate(hit.comment_text || "", 200)
        : truncate(hit.url || "", 100),
    } as SearchResult;
  });
}

// --- CLI ---
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help") {
  console.log(`
Hacker News Search — find relevant discussions

Usage:
  bun .claude/skills/hackernews/scripts/hn-search.ts "<query>" [options]

Options:
  --sort=VALUE    popularity (default) | date
  --time=VALUE    day | week (default) | month | year | all
  --limit=N       Number of results, max 100 (default: 25)
  --type=VALUE    story (default) | comment | all

Examples:
  bun .claude/skills/hackernews/scripts/hn-search.ts "ai agents"
  bun .claude/skills/hackernews/scripts/hn-search.ts "claude code" --sort=date --time=month
  bun .claude/skills/hackernews/scripts/hn-search.ts "mcp server" --type=comment --limit=10
`);
  process.exit(0);
}

const opts = parseArgs(args);

if (!opts.query) {
  console.error("Error: query is required (first argument)");
  process.exit(1);
}

console.log(`Searching Hacker News: "${opts.query}"`);
console.log(`Sort: ${opts.sort} | Time: ${opts.time} | Type: ${opts.type} | Limit: ${opts.limit}\n`);

try {
  const results = await searchHN(opts);

  if (results.length === 0) {
    console.log("No results found. Try broadening your query or time range.");
    process.exit(0);
  }

  // Output as structured JSON for the agent to process
  console.log(JSON.stringify(results, null, 2));

  // Also print a human-readable summary
  console.log(`\n--- Summary: ${results.length} results found ---\n`);
  for (const [i, r] of results.entries()) {
    const typeTag = r.type === "comment" ? "[comment]" : "";
    console.log(
      `${i + 1}. [${r.score} pts, ${r.comments} comments, ${r.age}] ${typeTag}`
    );
    console.log(`   ${r.title}`);
    if (r.preview) console.log(`   > ${r.preview}`);
    console.log(`   ${r.permalink}\n`);
  }
} catch (err) {
  console.error("Error searching Hacker News:", err);
  process.exit(1);
}
