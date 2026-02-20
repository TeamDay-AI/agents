#!/usr/bin/env bun
/**
 * Google Analytics 4 Reporting Script
 * Uses Application Default Credentials from gcloud
 *
 * Usage:
 *   bun .claude/skills/google-analytics/scripts/ga-report.ts [command] [options]
 *
 * Commands:
 *   summary [days]         - Overall metrics summary (default: 28 days)
 *   pages [days] [limit]   - Top pages by views
 *   sources [days] [limit] - Traffic sources
 *   countries [days]       - Traffic by country
 *   realtime               - Current active users
 *   events [days] [limit]  - Top events
 */

import { GoogleAuth } from "google-auth-library";

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const QUOTA_PROJECT = process.env.GOOGLE_PROJECT_ID;

if (!PROPERTY_ID) {
  console.error("Error: GA4_PROPERTY_ID environment variable not set");
  console.error("Set it with: export GA4_PROPERTY_ID='your-property-id'");
  process.exit(1);
}

interface ReportRequest {
  dateRanges: Array<{ startDate: string; endDate: string }>;
  dimensions?: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  limit?: number;
  orderBys?: Array<{
    metric?: { metricName: string };
    dimension?: { dimensionName: string };
    desc?: boolean;
  }>;
}

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Failed to get access token");
  return token.token;
}

async function runReport(request: ReportRequest): Promise<any> {
  const token = await getAccessToken();
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-goog-user-project": QUOTA_PROJECT,
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GA API Error: ${response.status} - ${error}`);
  }
  return response.json();
}

async function runRealtimeReport(): Promise<any> {
  const token = await getAccessToken();
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runRealtimeReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-goog-user-project": QUOTA_PROJECT,
      },
      body: JSON.stringify({
        metrics: [
          { name: "activeUsers" },
        ],
        dimensions: [
          { name: "country" },
        ],
      }),
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GA Realtime API Error: ${response.status} - ${error}`);
  }
  return response.json();
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function formatPercent(num: number): string {
  return `${(num * 100).toFixed(2)}%`;
}

async function getSummary(days: number = 28) {
  const data = await runReport({
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "averageSessionDuration" },
      { name: "bounceRate" },
      { name: "newUsers" },
      { name: "engagedSessions" },
    ],
  });

  const row = data.rows?.[0]?.metricValues || [];
  console.log(`\n📊 Google Analytics Summary (Last ${days} days)`);
  console.log(`   Property: ${PROPERTY_ID}`);
  console.log("─".repeat(50));
  console.log(`   Active Users:     ${formatNumber(parseInt(row[0]?.value || "0"))}`);
  console.log(`   Sessions:         ${formatNumber(parseInt(row[1]?.value || "0"))}`);
  console.log(`   Page Views:       ${formatNumber(parseInt(row[2]?.value || "0"))}`);
  console.log(`   Avg Session:      ${Math.round(parseFloat(row[3]?.value || "0"))}s`);
  console.log(`   Bounce Rate:      ${formatPercent(parseFloat(row[4]?.value || "0"))}`);
  console.log(`   New Users:        ${formatNumber(parseInt(row[5]?.value || "0"))}`);
  console.log(`   Engaged Sessions: ${formatNumber(parseInt(row[6]?.value || "0"))}`);
  console.log("");
}

async function getTopPages(days: number = 28, limit: number = 20) {
  const data = await runReport({
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "pagePath" }],
    metrics: [
      { name: "screenPageViews" },
      { name: "activeUsers" },
      { name: "averageSessionDuration" },
    ],
    limit,
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
  });

  console.log(`\n📄 Top Pages (Last ${days} days)`);
  console.log("─".repeat(80));
  console.log(`${"Page".padEnd(50)} ${"Views".padStart(8)} ${"Users".padStart(8)} ${"Avg Time".padStart(10)}`);
  console.log("─".repeat(80));

  for (const row of data.rows || []) {
    const page = row.dimensionValues[0].value.substring(0, 48);
    const views = parseInt(row.metricValues[0].value);
    const users = parseInt(row.metricValues[1].value);
    const avgTime = Math.round(parseFloat(row.metricValues[2].value));
    console.log(`${page.padEnd(50)} ${formatNumber(views).padStart(8)} ${formatNumber(users).padStart(8)} ${avgTime + "s".padStart(10)}`);
  }
  console.log("");
}

async function getTrafficSources(days: number = 28, limit: number = 15) {
  const data = await runReport({
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
    metrics: [
      { name: "sessions" },
      { name: "activeUsers" },
    ],
    limit,
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });

  console.log(`\n🔗 Traffic Sources (Last ${days} days)`);
  console.log("─".repeat(60));
  console.log(`${"Source / Medium".padEnd(40)} ${"Sessions".padStart(10)} ${"Users".padStart(8)}`);
  console.log("─".repeat(60));

  for (const row of data.rows || []) {
    const source = row.dimensionValues[0].value;
    const medium = row.dimensionValues[1].value;
    const sessions = parseInt(row.metricValues[0].value);
    const users = parseInt(row.metricValues[1].value);
    const label = `${source} / ${medium}`.substring(0, 38);
    console.log(`${label.padEnd(40)} ${formatNumber(sessions).padStart(10)} ${formatNumber(users).padStart(8)}`);
  }
  console.log("");
}

async function getCountries(days: number = 28) {
  const data = await runReport({
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "country" }],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
    ],
    limit: 20,
    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
  });

  console.log(`\n🌍 Traffic by Country (Last ${days} days)`);
  console.log("─".repeat(50));
  console.log(`${"Country".padEnd(30)} ${"Users".padStart(10)} ${"Sessions".padStart(8)}`);
  console.log("─".repeat(50));

  for (const row of data.rows || []) {
    const country = row.dimensionValues[0].value.substring(0, 28);
    const users = parseInt(row.metricValues[0].value);
    const sessions = parseInt(row.metricValues[1].value);
    console.log(`${country.padEnd(30)} ${formatNumber(users).padStart(10)} ${formatNumber(sessions).padStart(8)}`);
  }
  console.log("");
}

async function getRealtime() {
  const data = await runRealtimeReport();

  console.log(`\n⚡ Realtime Active Users`);
  console.log("─".repeat(40));

  let total = 0;
  for (const row of data.rows || []) {
    const country = row.dimensionValues[0].value;
    const users = parseInt(row.metricValues[0].value);
    total += users;
    console.log(`   ${country}: ${users} user(s)`);
  }
  console.log("─".repeat(40));
  console.log(`   Total: ${total} active now`);
  console.log("");
}

async function getTopEvents(days: number = 28, limit: number = 15) {
  const data = await runReport({
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "eventName" }],
    metrics: [
      { name: "eventCount" },
      { name: "totalUsers" },
    ],
    limit,
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
  });

  console.log(`\n🎯 Top Events (Last ${days} days)`);
  console.log("─".repeat(55));
  console.log(`${"Event".padEnd(35)} ${"Count".padStart(10)} ${"Users".padStart(8)}`);
  console.log("─".repeat(55));

  for (const row of data.rows || []) {
    const event = row.dimensionValues[0].value.substring(0, 33);
    const count = parseInt(row.metricValues[0].value);
    const users = parseInt(row.metricValues[1].value);
    console.log(`${event.padEnd(35)} ${formatNumber(count).padStart(10)} ${formatNumber(users).padStart(8)}`);
  }
  console.log("");
}

// Main
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
    case "sources":
      await getTrafficSources(arg1, arg2);
      break;
    case "countries":
      await getCountries(arg1);
      break;
    case "realtime":
      await getRealtime();
      break;
    case "events":
      await getTopEvents(arg1, arg2);
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log("Available: summary, pages, sources, countries, realtime, events");
      process.exit(1);
  }
} catch (error: any) {
  console.error("Error:", error.message);
  process.exit(1);
}
