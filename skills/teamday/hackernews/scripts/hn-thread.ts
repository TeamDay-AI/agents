#!/usr/bin/env bun
/**
 * Hacker News Thread Reader
 *
 * Fetches a HN post and its comment tree for analysis.
 * Uses the Algolia Items API for recursive comment fetching.
 *
 * Usage:
 *   bun .claude/skills/hackernews/scripts/hn-thread.ts "12345678"
 *   bun .claude/skills/hackernews/scripts/hn-thread.ts "12345678" --depth=2
 */

const HN_ALGOLIA_BASE = "https://hn.algolia.com/api/v1";
const USER_AGENT = "TeamDay-HNSkill/1.0 (research bot)";

interface HNItem {
  id: number;
  title: string | null;
  text: string | null;
  author: string;
  points: number | null;
  type: "story" | "comment" | "job" | "poll";
  url: string | null;
  created_at_i: number;
  children: HNItem[];
}

interface CommentData {
  author: string;
  body: string;
  score: number;
  age: string;
  depth: number;
  replies: CommentData[];
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

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"');
}

function parseComment(item: HNItem, maxDepth: number, currentDepth = 0): CommentData | null {
  if (!item || !item.author) return null;
  if (item.type !== "comment") return null;

  const body = stripHtml(item.text || "");
  if (!body) return null;

  const replies: CommentData[] = [];
  if (currentDepth < maxDepth && item.children) {
    for (const child of item.children) {
      const parsed = parseComment(child, maxDepth, currentDepth + 1);
      if (parsed) replies.push(parsed);
    }
  }

  return {
    author: item.author,
    body,
    score: item.points ?? 0,
    age: timeAgo(item.created_at_i),
    depth: currentDepth,
    replies,
  };
}

function flattenComments(comments: CommentData[]): CommentData[] {
  const flat: CommentData[] = [];
  for (const c of comments) {
    flat.push(c);
    if (c.replies.length) flat.push(...flattenComments(c.replies));
  }
  return flat;
}

function formatComment(c: CommentData): string {
  const indent = "  ".repeat(c.depth);
  const body = c.body.replace(/\n/g, `\n${indent}  `);
  return `${indent}[${c.score} pts] ${c.author} (${c.age}):\n${indent}  ${body}`;
}

function countAllChildren(item: HNItem): number {
  let count = 0;
  if (item.children) {
    for (const child of item.children) {
      if (child.type === "comment") count++;
      count += countAllChildren(child);
    }
  }
  return count;
}

async function fetchThread(itemId: string, maxDepth: number) {
  const url = `${HN_ALGOLIA_BASE}/items/${itemId}`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`HN Algolia API error: ${res.status} ${res.statusText}`);
  }

  const item: HNItem = await res.json();

  const post = {
    title: item.title || "(untitled)",
    author: item.author,
    points: item.points ?? 0,
    childCount: countAllChildren(item),
    text: stripHtml(item.text || ""),
    url: item.url || null,
    age: timeAgo(item.created_at_i),
    type: item.type,
    permalink: `https://news.ycombinator.com/item?id=${item.id}`,
  };

  const comments: CommentData[] = [];
  if (item.children) {
    for (const child of item.children) {
      const parsed = parseComment(child, maxDepth);
      if (parsed) comments.push(parsed);
    }
  }

  return { post, comments };
}

// --- CLI ---
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help") {
  console.log(`
Hacker News Thread Reader — fetch post + comments for analysis

Usage:
  bun .claude/skills/hackernews/scripts/hn-thread.ts "<item_id>" [options]

Options:
  --depth=N   Max comment nesting depth to fetch (default: 3)

Examples:
  bun .claude/skills/hackernews/scripts/hn-thread.ts "12345678"
  bun .claude/skills/hackernews/scripts/hn-thread.ts "12345678" --depth=2
`);
  process.exit(0);
}

let itemId = "";
let maxDepth = 3;

for (const arg of args) {
  if (arg.startsWith("--depth=")) {
    maxDepth = parseInt(arg.split("=")[1], 10);
  } else if (!arg.startsWith("--")) {
    itemId = arg;
  }
}

if (!itemId) {
  console.error("Error: item ID is required (first argument)");
  process.exit(1);
}

console.log(`Fetching HN thread: ${itemId}`);
console.log(`Comment depth: ${maxDepth}\n`);

try {
  const { post, comments } = await fetchThread(itemId, maxDepth);

  // Print post
  console.log("=== POST ===");
  console.log(`Title: ${post.title}`);
  console.log(`Author: ${post.author} | Points: ${post.points} | Comments: ${post.childCount} | Posted: ${post.age}`);
  if (post.url) console.log(`URL: ${post.url}`);
  console.log(`Link: ${post.permalink}`);
  console.log();

  if (post.text) {
    console.log("--- Body ---");
    console.log(post.text);
    console.log();
  }

  // Print comments
  const flat = flattenComments(comments);
  console.log(`=== COMMENTS (${flat.length} loaded) ===\n`);
  for (const c of flat) {
    console.log(formatComment(c));
    console.log();
  }

  // Also output structured JSON to stderr for programmatic use
  const structured = {
    post,
    comments: flat.map((c) => ({
      author: c.author,
      body: c.body,
      score: c.score,
      age: c.age,
      depth: c.depth,
    })),
  };
  process.stderr.write(JSON.stringify(structured, null, 2));
} catch (err) {
  console.error("Error fetching HN thread:", err);
  process.exit(1);
}
