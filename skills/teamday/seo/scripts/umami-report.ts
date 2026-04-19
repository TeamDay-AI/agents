#!/usr/bin/env bun
/**
 * Umami Analytics Reporting Script
 * Uses public share link to query Umami's API (no auth required)
 *
 * Usage:
 *   bun .claude/skills/seo/scripts/umami-report.ts [command] [options]
 *
 * Commands:
 *   summary [days]         - Overall metrics summary (default: 28 days)
 *   pages [days] [limit]   - Top pages by views
 *   referrers [days] [limit] - Top referrers
 *   browsers [days]        - Browser breakdown
 *   os [days]              - OS breakdown
 *   countries [days]       - Traffic by country
 *   events [days] [limit]  - Top events
 *   active                 - Current active visitors
 */

const UMAMI_BASE = process.env.UMAMI_BASE_URL || "https://umami.lsd.sk";
const SHARE_ID = process.env.UMAMI_SHARE_ID || "GRVFnQSQSLlfRjCa";

let cachedAuth: { websiteId: string; token: string } | null = null;

async function getShareAuth(): Promise<{ websiteId: string; token: string }> {
  if (cachedAuth) return cachedAuth;

  const res = await fetch(`${UMAMI_BASE}/api/share/${SHARE_ID}`);
  if (!res.ok) throw new Error(`Share auth failed: ${res.status}`);
  cachedAuth = await res.json();
  return cachedAuth!;
}

async function umamiGet(
  path: string,
  params: Record<string, string | number> = {}
): Promise<any> {
  const { websiteId, token } = await getShareAuth();
  const url = new URL(`${UMAMI_BASE}/api/websites/${websiteId}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: { "x-umami-share-token": token },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Umami API ${res.status}: ${body}`);
  }
  return res.json();
}

function dateRange(days: number): { startAt: number; endAt: number } {
  const endAt = Date.now();
  const startAt = endAt - days * 24 * 60 * 60 * 1000;
  return { startAt, endAt };
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

// --- Commands ---

async function getSummary(days: number = 28) {
  const { startAt, endAt } = dateRange(days);
  const stats = await umamiGet("/stats", { startAt, endAt });

  const bounceRate =
    stats.visits > 0 ? ((stats.bounces / stats.visits) * 100).toFixed(1) : "0";
  const avgTime =
    stats.visits > 0
      ? formatDuration(stats.totaltime / stats.visits)
      : "0s";

  console.log(`\nUmami Analytics Summary (Last ${days} days)`);
  console.log("─".repeat(50));
  console.log(`   Page Views:       ${formatNumber(stats.pageviews ?? 0)}`);
  console.log(`   Unique Visitors:  ${formatNumber(stats.visitors ?? 0)}`);
  console.log(`   Visits:           ${formatNumber(stats.visits ?? 0)}`);
  console.log(`   Bounces:          ${formatNumber(stats.bounces ?? 0)} (${bounceRate}%)`);
  console.log(`   Avg Visit Time:   ${avgTime}`);
  console.log("");
}

async function getTopPages(days: number = 28, limit: number = 20) {
  const { startAt, endAt } = dateRange(days);
  const data = await umamiGet("/metrics", { startAt, endAt, type: "path" });

  const rows = (data as Array<{ x: string; y: number }>).slice(0, limit);

  console.log(`\nTop Pages (Last ${days} days)`);
  console.log("─".repeat(70));
  console.log(`${"Page".padEnd(55)} ${"Visitors".padStart(10)}`);
  console.log("─".repeat(70));

  for (const row of rows) {
    const page = row.x.substring(0, 53);
    console.log(`${page.padEnd(55)} ${formatNumber(row.y).padStart(10)}`);
  }
  console.log("");
}

async function getReferrers(days: number = 28, limit: number = 15) {
  const { startAt, endAt } = dateRange(days);
  const data = await umamiGet("/metrics", { startAt, endAt, type: "referrer" });

  const rows = (data as Array<{ x: string; y: number }>).slice(0, limit);

  console.log(`\nTop Referrers (Last ${days} days)`);
  console.log("─".repeat(60));
  console.log(`${"Referrer".padEnd(45)} ${"Visitors".padStart(10)}`);
  console.log("─".repeat(60));

  for (const row of rows) {
    const ref = (row.x || "(direct)").substring(0, 43);
    console.log(`${ref.padEnd(45)} ${formatNumber(row.y).padStart(10)}`);
  }
  console.log("");
}

async function getBrowsers(days: number = 28) {
  const { startAt, endAt } = dateRange(days);
  const data = await umamiGet("/metrics", { startAt, endAt, type: "browser" });

  const rows = data as Array<{ x: string; y: number }>;

  console.log(`\nBrowsers (Last ${days} days)`);
  console.log("─".repeat(45));
  console.log(`${"Browser".padEnd(30)} ${"Visitors".padStart(10)}`);
  console.log("─".repeat(45));

  for (const row of rows) {
    console.log(`${row.x.padEnd(30)} ${formatNumber(row.y).padStart(10)}`);
  }
  console.log("");
}

async function getOS(days: number = 28) {
  const { startAt, endAt } = dateRange(days);
  const data = await umamiGet("/metrics", { startAt, endAt, type: "os" });

  const rows = data as Array<{ x: string; y: number }>;

  console.log(`\nOperating Systems (Last ${days} days)`);
  console.log("─".repeat(45));
  console.log(`${"OS".padEnd(30)} ${"Visitors".padStart(10)}`);
  console.log("─".repeat(45));

  for (const row of rows) {
    console.log(`${row.x.padEnd(30)} ${formatNumber(row.y).padStart(10)}`);
  }
  console.log("");
}

async function getCountries(days: number = 28) {
  const { startAt, endAt } = dateRange(days);
  const data = await umamiGet("/metrics", { startAt, endAt, type: "country" });

  const rows = (data as Array<{ x: string; y: number }>).slice(0, 20);

  console.log(`\nTraffic by Country (Last ${days} days)`);
  console.log("─".repeat(45));
  console.log(`${"Country".padEnd(30)} ${"Visitors".padStart(10)}`);
  console.log("─".repeat(45));

  for (const row of rows) {
    console.log(`${row.x.padEnd(30)} ${formatNumber(row.y).padStart(10)}`);
  }
  console.log("");
}

async function getEvents(days: number = 28, limit: number = 15) {
  const { startAt, endAt } = dateRange(days);
  const data = await umamiGet("/metrics", { startAt, endAt, type: "event" });

  const rows = (data as Array<{ x: string; y: number }>).slice(0, limit);

  console.log(`\nTop Events (Last ${days} days)`);
  console.log("─".repeat(55));
  console.log(`${"Event".padEnd(40)} ${"Count".padStart(10)}`);
  console.log("─".repeat(55));

  for (const row of rows) {
    const event = row.x.substring(0, 38);
    console.log(`${event.padEnd(40)} ${formatNumber(row.y).padStart(10)}`);
  }
  console.log("");
}

async function getActive() {
  const data = await umamiGet("/active");

  console.log(`\nActive Visitors Right Now`);
  console.log("─".repeat(35));
  console.log(`   ${formatNumber(data.visitors ?? data[0]?.x ?? 0)} visitor(s) online`);
  console.log("");
}

// --- Main ---

const command = process.argv[2] || "summary";
const arg1 = parseInt(process.argv[3]) || 28;
const arg2 = parseInt(process.argv[4]) || 20;

try {
  switch (command) {
    case "summary":
      await getSummary(arg1);
      break;
    case "pages":
      await getTopPages(arg1, arg2);
      break;
    case "referrers":
      await getReferrers(arg1, arg2);
      break;
    case "browsers":
      await getBrowsers(arg1);
      break;
    case "os":
      await getOS(arg1);
      break;
    case "countries":
      await getCountries(arg1);
      break;
    case "events":
      await getEvents(arg1, arg2);
      break;
    case "active":
      await getActive();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log(
        "Available: summary, pages, referrers, browsers, os, countries, events, active"
      );
      process.exit(1);
  }
} catch (error: any) {
  console.error("Error:", error.message);
  process.exit(1);
}
