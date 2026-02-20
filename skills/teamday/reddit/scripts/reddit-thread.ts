#!/usr/bin/env bun
/**
 * Reddit Thread Reader
 *
 * Fetches a Reddit post and its comments for analysis.
 * Accepts a full Reddit URL or a permalink path.
 *
 * Usage:
 *   bun .claude/skills/reddit/scripts/reddit-thread.ts "https://reddit.com/r/ClaudeAI/comments/abc123/post_title/"
 *   bun .claude/skills/reddit/scripts/reddit-thread.ts "/r/ClaudeAI/comments/abc123/post_title/" --depth=3
 */

const REDDIT_BASE = "https://www.reddit.com";
const USER_AGENT = "TeamDay-RedditSkill/1.0 (research bot)";

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

function parseComment(thing: any, maxDepth: number, currentDepth = 0): CommentData | null {
  if (!thing || thing.kind !== "t1") return null;
  const d = thing.data;
  if (!d.body || d.author === "AutoModerator") return null;

  const replies: CommentData[] = [];
  if (currentDepth < maxDepth && d.replies && d.replies.data) {
    for (const child of d.replies.data.children) {
      const parsed = parseComment(child, maxDepth, currentDepth + 1);
      if (parsed) replies.push(parsed);
    }
  }

  return {
    author: d.author,
    body: d.body,
    score: d.score,
    age: timeAgo(d.created_utc),
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
  return `${indent}[${c.score} pts] u/${c.author} (${c.age}):\n${indent}  ${body}`;
}

async function fetchThread(permalink: string, maxDepth: number) {
  // Normalize the URL
  let url = permalink.trim();
  if (url.startsWith("http")) {
    url = new URL(url).pathname;
  }
  // Remove trailing slash, add .json
  url = url.replace(/\/$/, "");
  const jsonUrl = `${REDDIT_BASE}${url}.json?raw_json=1&limit=50`;

  const res = await fetch(jsonUrl, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Reddit API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // data[0] = post listing, data[1] = comments listing
  const postData = data[0].data.children[0].data;
  const commentThings = data[1].data.children;

  const post = {
    title: postData.title,
    subreddit: postData.subreddit,
    author: postData.author,
    score: postData.score,
    num_comments: postData.num_comments,
    selftext: postData.selftext,
    url: postData.url,
    age: timeAgo(postData.created_utc),
    flair: postData.link_flair_text,
  };

  const comments: CommentData[] = [];
  for (const thing of commentThings) {
    const parsed = parseComment(thing, maxDepth);
    if (parsed) comments.push(parsed);
  }

  return { post, comments };
}

// --- CLI ---
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help") {
  console.log(`
Reddit Thread Reader — fetch post + comments for analysis

Usage:
  bun .claude/skills/reddit/scripts/reddit-thread.ts "<url_or_permalink>" [options]

Options:
  --depth=N   Max comment nesting depth to fetch (default: 3)

Examples:
  bun .claude/skills/reddit/scripts/reddit-thread.ts "https://reddit.com/r/ClaudeAI/comments/abc123/title/"
  bun .claude/skills/reddit/scripts/reddit-thread.ts "/r/artificial/comments/xyz789/some_post/" --depth=2
`);
  process.exit(0);
}

let permalink = "";
let maxDepth = 3;

for (const arg of args) {
  if (arg.startsWith("--depth=")) {
    maxDepth = parseInt(arg.split("=")[1], 10);
  } else if (!arg.startsWith("--")) {
    permalink = arg;
  }
}

if (!permalink) {
  console.error("Error: URL or permalink is required");
  process.exit(1);
}

console.log(`Fetching thread: ${permalink}`);
console.log(`Comment depth: ${maxDepth}\n`);

try {
  const { post, comments } = await fetchThread(permalink, maxDepth);

  // Print post
  console.log("=== POST ===");
  console.log(`Title: ${post.title}`);
  console.log(`Subreddit: r/${post.subreddit} | Author: u/${post.author}`);
  console.log(`Score: ${post.score} | Comments: ${post.num_comments} | Posted: ${post.age}`);
  if (post.flair) console.log(`Flair: ${post.flair}`);
  console.log();
  if (post.selftext) {
    console.log("--- Body ---");
    console.log(post.selftext);
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
  console.error("Error fetching thread:", err);
  process.exit(1);
}
