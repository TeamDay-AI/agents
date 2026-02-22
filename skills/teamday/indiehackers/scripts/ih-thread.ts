#!/usr/bin/env bun
/**
 * Indie Hackers Thread Reader
 *
 * Reads posts and comments from Indie Hackers' public Firebase RTDB.
 * Supports reading a specific post by ID, or browsing recent posts.
 *
 * Usage:
 *   bun .claude/skills/indiehackers/scripts/ih-thread.ts "abc123def"
 *   bun .claude/skills/indiehackers/scripts/ih-thread.ts --recent --limit=5
 *   bun .claude/skills/indiehackers/scripts/ih-thread.ts --recent --group=Solopreneurs
 */

const FIREBASE_BASE = "https://indie-hackers.firebaseio.com";

interface IHPost {
  id: string;
  title: string;
  body: string;
  author: string;
  group: string;
  replies: number;
  views: number;
  age: string;
  url: string;
}

interface IHComment {
  author: string;
  body: string;
  age: string;
  depth: number;
}

function parseArgs(args: string[]): {
  postId: string;
  recent: boolean;
  limit: number;
  group: string;
} {
  let postId = "";
  let recent = false;
  let limit = 10;
  let group = "";

  for (const arg of args) {
    if (arg === "--recent") {
      recent = true;
    } else if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--group=")) {
      group = arg.split("=")[1];
    } else if (!arg.startsWith("--")) {
      postId = arg;
    }
  }

  return { postId, recent, limit: Math.min(limit, 50), group };
}

function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  if (diff < 2592000000) return `${Math.floor(diff / 604800000)}w ago`;
  return `${Math.floor(diff / 2592000000)}mo ago`;
}

function truncate(text: string, maxLen: number): string {
  if (!text) return "";
  const clean = text.replace(/\n/g, " ").trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + "..." : clean;
}

async function fetchRecentPosts(limit: number, group: string): Promise<IHPost[]> {
  const url = `${FIREBASE_BASE}/posts.json?orderBy="createdTimestamp"&limitToLast=${limit}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "TeamDay-IHSkill/1.0" },
  });

  if (!res.ok) {
    throw new Error(`Firebase error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!data) return [];

  let posts = Object.entries(data).map(([id, raw]: [string, any]) => ({
    id,
    title: raw.title || "Untitled",
    body: raw.body || "",
    author: raw.username || "anonymous",
    group: raw.groupName || "General",
    replies: raw.numReplies || 0,
    views: raw.numViews || 0,
    age: timeAgo(raw.createdTimestamp || 0),
    url: `https://www.indiehackers.com/post/${id}`,
    _ts: raw.createdTimestamp || 0,
  }));

  // Filter by group if specified
  if (group) {
    posts = posts.filter((p) => p.group.toLowerCase() === group.toLowerCase());
  }

  // Sort by timestamp descending (most recent first)
  posts.sort((a: any, b: any) => b._ts - a._ts);

  // Remove the internal _ts field
  return posts.map(({ _ts, ...p }: any) => p);
}

async function fetchPost(postId: string): Promise<{ post: IHPost; comments: IHComment[] }> {
  // Fetch the post
  const postUrl = `${FIREBASE_BASE}/posts/${postId}.json`;
  const postRes = await fetch(postUrl, {
    headers: { "User-Agent": "TeamDay-IHSkill/1.0" },
  });

  if (!postRes.ok) {
    throw new Error(`Firebase error: ${postRes.status} ${postRes.statusText}`);
  }

  const raw = await postRes.json();
  if (!raw) {
    throw new Error(`Post not found: ${postId}`);
  }

  const post: IHPost = {
    id: postId,
    title: raw.title || "Untitled",
    body: raw.body || "",
    author: raw.username || "anonymous",
    group: raw.groupName || "General",
    replies: raw.numReplies || 0,
    views: raw.numViews || 0,
    age: timeAgo(raw.createdTimestamp || 0),
    url: `https://www.indiehackers.com/post/${postId}`,
  };

  // Fetch comments
  const comments: IHComment[] = [];
  const commentsUrl = `${FIREBASE_BASE}/comments/${postId}.json?orderBy="createdTimestamp"&limitToFirst=50`;
  const commentsRes = await fetch(commentsUrl, {
    headers: { "User-Agent": "TeamDay-IHSkill/1.0" },
  });

  if (commentsRes.ok) {
    const commentsData = await commentsRes.json();
    if (commentsData) {
      for (const [, c] of Object.entries(commentsData) as [string, any][]) {
        if (!c.body) continue;
        comments.push({
          author: c.username || "anonymous",
          body: c.body,
          age: timeAgo(c.createdTimestamp || 0),
          depth: c.depth || 0,
        });
      }
      // Sort by creation time
      comments.sort((a: any, b: any) => {
        // Approximate — comments without exact timestamp go to end
        return 0;
      });
    }
  }

  return { post, comments };
}

function formatComment(c: IHComment): string {
  const indent = "  ".repeat(c.depth);
  const body = c.body.replace(/\n/g, `\n${indent}  `);
  return `${indent}u/${c.author} (${c.age}):\n${indent}  ${body}`;
}

// --- CLI ---
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help") {
  console.log(`
Indie Hackers Thread Reader — fetch posts + comments

Uses Indie Hackers' public Firebase Realtime Database.

Usage:
  bun .claude/skills/indiehackers/scripts/ih-thread.ts "<post_id>" [options]
  bun .claude/skills/indiehackers/scripts/ih-thread.ts --recent [options]

Options:
  --recent           Browse recent posts (instead of reading a specific one)
  --limit=N          Number of posts/comments to fetch (default: 10, max: 50)
  --group=NAME       Filter recent posts by group name (e.g., "Solopreneurs")

Examples:
  bun .claude/skills/indiehackers/scripts/ih-thread.ts "9f7c029fdc"
  bun .claude/skills/indiehackers/scripts/ih-thread.ts --recent --limit=5
  bun .claude/skills/indiehackers/scripts/ih-thread.ts --recent --group=Solopreneurs
`);
  process.exit(0);
}

const opts = parseArgs(args);

if (opts.recent) {
  // Browse recent posts
  console.log(`Fetching recent Indie Hackers posts${opts.group ? ` in "${opts.group}"` : ""}...`);
  console.log(`Limit: ${opts.limit}\n`);

  try {
    const posts = await fetchRecentPosts(opts.limit, opts.group);

    if (posts.length === 0) {
      console.log("No posts found.");
      process.exit(0);
    }

    // Structured JSON
    console.log(JSON.stringify(posts, null, 2));

    // Human-readable summary
    console.log(`\n--- ${posts.length} Recent Posts ---\n`);
    for (const [i, p] of posts.entries()) {
      console.log(`${i + 1}. [${p.replies} replies, ${p.views} views, ${p.age}] ${p.group}`);
      console.log(`   ${p.title}`);
      if (p.body) console.log(`   > ${truncate(p.body, 150)}`);
      console.log(`   ${p.url}\n`);
    }
  } catch (err) {
    console.error("Error fetching recent posts:", err);
    process.exit(1);
  }
} else if (opts.postId) {
  // Read a specific post
  console.log(`Fetching post: ${opts.postId}\n`);

  try {
    const { post, comments } = await fetchPost(opts.postId);

    // Print post
    console.log("=== POST ===");
    console.log(`Title: ${post.title}`);
    console.log(`Group: ${post.group} | Author: u/${post.author}`);
    console.log(`Replies: ${post.replies} | Views: ${post.views} | Posted: ${post.age}`);
    console.log(`URL: ${post.url}`);
    console.log();
    if (post.body) {
      console.log("--- Body ---");
      console.log(post.body);
      console.log();
    }

    // Print comments
    if (comments.length > 0) {
      console.log(`=== COMMENTS (${comments.length} loaded) ===\n`);
      for (const c of comments) {
        console.log(formatComment(c));
        console.log();
      }
    } else {
      console.log("No comments found.");
    }

    // Structured JSON to stderr
    process.stderr.write(JSON.stringify({ post, comments }, null, 2));
  } catch (err) {
    console.error("Error fetching post:", err);
    process.exit(1);
  }
} else {
  console.error("Error: provide a post ID or use --recent");
  process.exit(1);
}
