#!/usr/bin/env bun
/**
 * Reddit Search Script
 *
 * Searches Reddit's public JSON API for posts matching a query.
 * No authentication required — uses the public .json endpoint.
 *
 * Usage:
 *   bun .claude/skills/reddit/scripts/reddit-search.ts "ai agents for business" --subreddit=artificial --sort=new --time=week --limit=15
 *   bun .claude/skills/reddit/scripts/reddit-search.ts "claude code" --sort=relevance --time=month
 */

const REDDIT_BASE = "https://www.reddit.com";
const USER_AGENT = "RedditSkill/1.0 (research bot)";

interface RedditPost {
  title: string;
  subreddit: string;
  author: string;
  score: number;
  num_comments: number;
  url: string;
  permalink: string;
  selftext: string;
  created_utc: number;
  link_flair_text: string | null;
  is_self: boolean;
  over_18: boolean;
}

interface SearchResult {
  title: string;
  subreddit: string;
  author: string;
  score: number;
  comments: number;
  age: string;
  flair: string | null;
  permalink: string;
  preview: string;
}

function parseArgs(args: string[]): {
  query: string;
  subreddit?: string;
  sort: string;
  time: string;
  limit: number;
} {
  let query = "";
  let subreddit: string | undefined;
  let sort = "relevance";
  let time = "week";
  let limit = 25;

  for (const arg of args) {
    if (arg.startsWith("--subreddit=")) {
      subreddit = arg.split("=")[1];
    } else if (arg.startsWith("--sort=")) {
      sort = arg.split("=")[1];
    } else if (arg.startsWith("--time=")) {
      time = arg.split("=")[1];
    } else if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.split("=")[1], 10);
    } else if (!arg.startsWith("--")) {
      query = arg;
    }
  }

  return { query, subreddit, sort, time, limit };
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

async function searchReddit(opts: {
  query: string;
  subreddit?: string;
  sort: string;
  time: string;
  limit: number;
}): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: opts.query,
    sort: opts.sort,
    t: opts.time,
    limit: String(Math.min(opts.limit, 100)),
    raw_json: "1",
  });

  let url: string;
  if (opts.subreddit) {
    params.set("restrict_sr", "1");
    url = `${REDDIT_BASE}/r/${opts.subreddit}/search.json?${params}`;
  } else {
    url = `${REDDIT_BASE}/search.json?${params}`;
  }

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Reddit API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const posts: RedditPost[] = data.data.children.map((c: any) => c.data);

  return posts
    .filter((p) => !p.over_18)
    .map((p) => ({
      title: p.title,
      subreddit: p.subreddit,
      author: p.author,
      score: p.score,
      comments: p.num_comments,
      age: timeAgo(p.created_utc),
      flair: p.link_flair_text,
      permalink: `https://reddit.com${p.permalink}`,
      preview: truncate(p.selftext, 200),
    }));
}

// --- CLI ---
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help") {
  console.log(`
Reddit Search — find relevant discussions

Usage:
  bun .claude/skills/reddit/scripts/reddit-search.ts "<query>" [options]

Options:
  --subreddit=NAME   Restrict to a specific subreddit
  --sort=VALUE       hot | new | relevance (default) | comments | top
  --time=VALUE       hour | day | week (default) | month | year | all
  --limit=N          Number of results, max 100 (default: 25)

Examples:
  bun .claude/skills/reddit/scripts/reddit-search.ts "ai agents for business"
  bun .claude/skills/reddit/scripts/reddit-search.ts "claude code" --subreddit=ClaudeAI --sort=new
  bun .claude/skills/reddit/scripts/reddit-search.ts "mcp server" --time=month --limit=10
`);
  process.exit(0);
}

const opts = parseArgs(args);

if (!opts.query) {
  console.error("Error: query is required (first argument)");
  process.exit(1);
}

console.log(`Searching Reddit: "${opts.query}"${opts.subreddit ? ` in r/${opts.subreddit}` : ""}`);
console.log(`Sort: ${opts.sort} | Time: ${opts.time} | Limit: ${opts.limit}\n`);

try {
  const results = await searchReddit(opts);

  if (results.length === 0) {
    console.log("No results found. Try broadening your query or time range.");
    process.exit(0);
  }

  // Output as structured JSON for the agent to process
  console.log(JSON.stringify(results, null, 2));

  // Also print a human-readable summary
  console.log(`\n--- Summary: ${results.length} posts found ---\n`);
  for (const [i, r] of results.entries()) {
    console.log(
      `${i + 1}. [${r.score} pts, ${r.comments} comments, ${r.age}] r/${r.subreddit}`
    );
    console.log(`   ${r.title}`);
    if (r.preview) console.log(`   > ${r.preview}`);
    console.log(`   ${r.permalink}\n`);
  }
} catch (err) {
  console.error("Error searching Reddit:", err);
  process.exit(1);
}
