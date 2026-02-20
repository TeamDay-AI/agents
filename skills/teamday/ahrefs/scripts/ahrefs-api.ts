#!/usr/bin/env bun
/**
 * Ahrefs API Client Script
 * Direct API calls to Ahrefs v3 - no MCP layer
 *
 * Usage:
 *   bun .claude/skills/ahrefs/scripts/ahrefs-api.ts [command] [target] [options]
 *
 * Commands:
 *   overview [domain]           - Domain overview (DR, backlinks, traffic)
 *   domain-rating [domain]      - Just the Domain Rating
 *   backlinks [domain] [limit]  - Top backlinks
 *   refdomains [domain] [limit] - Referring domains
 *   keywords [domain] [limit]   - Top organic keywords
 *   competitors [domain] [limit]- Organic competitors
 *   pages [domain] [limit]      - Top pages by traffic
 *   broken-backlinks [domain]   - Broken backlinks
 *   keyword-overview "keyword"  - Keyword metrics
 *   serp "keyword"              - SERP overview for keyword
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, "..", ".env");

// Load API key from .env file
function loadApiKey(): string {
  // Check environment variable first
  if (process.env.AHREFS_API_KEY) {
    return process.env.AHREFS_API_KEY;
  }

  // Load from .env file
  if (existsSync(ENV_PATH)) {
    const content = readFileSync(ENV_PATH, "utf-8");
    const match = content.match(/AHREFS_API_KEY=(.+)/);
    if (match) return match[1].trim();
  }

  throw new Error(
    `No API key found. Create ${ENV_PATH} with AHREFS_API_KEY=your-key`
  );
}

const API_BASE = "https://api.ahrefs.com/v3";
const API_KEY = loadApiKey();
const DEFAULT_DOMAIN = process.env.AHREFS_DEFAULT_DOMAIN || "";
const DEFAULT_COUNTRY = "us";

interface ApiResponse {
  [key: string]: any;
}

async function apiCall(endpoint: string, params: Record<string, any> = {}): Promise<ApiResponse> {
  const url = new URL(`${API_BASE}/${endpoint}`);

  // Add query params
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ahrefs API Error ${response.status}: ${error}`);
  }

  return response.json();
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatCurrency(num: number): string {
  return `$${formatNumber(num)}`;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ============================================
// Commands
// ============================================

async function getDomainOverview(domain: string) {
  console.log(`\n📊 Ahrefs Domain Overview: ${domain}`);
  console.log("─".repeat(50));

  try {
    // Get domain rating
    const drData = await apiCall("site-explorer/domain-rating", {
      target: domain,
      date: today(),
    });

    // Get backlinks stats
    const blData = await apiCall("site-explorer/backlinks-stats", {
      target: domain,
      date: today(),
      mode: "domain",
    });

    // Get metrics (organic traffic)
    const metricsData = await apiCall("site-explorer/metrics", {
      target: domain,
      date: today(),
      mode: "domain",
      country: DEFAULT_COUNTRY,
    });

    console.log(`   Domain Rating:      ${drData.domain_rating || "N/A"}`);
    console.log(`   Backlinks:          ${formatNumber(blData.live || 0)}`);
    console.log(`   Referring Domains:  ${formatNumber(blData.live_refdomains || 0)}`);
    console.log(`   Organic Keywords:   ${formatNumber(metricsData.org_keywords || 0)}`);
    console.log(`   Organic Traffic:    ${formatNumber(metricsData.org_traffic || 0)}/mo`);
    console.log(`   Traffic Value:      ${formatCurrency(metricsData.org_cost || 0)}/mo`);
    console.log("");
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    console.log("\nTip: Your plan may not have full API access.");
    console.log("Enterprise plans have full API access.");
    console.log("Other plans can use: claude mcp tools (mcp__ahrefs__*)");
  }
}

async function getDomainRating(domain: string) {
  const data = await apiCall("site-explorer/domain-rating", {
    target: domain,
    date: today(),
  });

  console.log(`\n🏆 Domain Rating: ${domain}`);
  console.log("─".repeat(40));
  console.log(`   DR: ${data.domain_rating}`);
  console.log("");
}

async function getBacklinks(domain: string, limit: number = 20) {
  const data = await apiCall("site-explorer/all-backlinks", {
    target: domain,
    mode: "domain",
    select: "url_from,url_to,anchor,domain_rating_source,traffic_domain",
    limit,
    order_by: "domain_rating_source:desc",
  });

  console.log(`\n🔗 Top Backlinks: ${domain}`);
  console.log("─".repeat(90));
  console.log(`${"From URL".padEnd(50)} ${"DR".padStart(4)} ${"Traffic".padStart(10)} ${"Anchor".padStart(20)}`);
  console.log("─".repeat(90));

  for (const row of data.backlinks || []) {
    const from = (row.url_from || "").substring(0, 48);
    const dr = row.domain_rating_source || 0;
    const traffic = formatNumber(row.traffic_domain || 0);
    const anchor = (row.anchor || "").substring(0, 18);
    console.log(`${from.padEnd(50)} ${String(dr).padStart(4)} ${traffic.padStart(10)} ${anchor.padStart(20)}`);
  }
  console.log("");
}

async function getRefdomains(domain: string, limit: number = 20) {
  const data = await apiCall("site-explorer/refdomains", {
    target: domain,
    mode: "domain",
    select: "domain,domain_rating,backlinks,first_seen,last_visited",
    limit,
    order_by: "domain_rating:desc",
  });

  console.log(`\n🌐 Referring Domains: ${domain}`);
  console.log("─".repeat(70));
  console.log(`${"Domain".padEnd(40)} ${"DR".padStart(4)} ${"Links".padStart(8)} ${"First Seen".padStart(12)}`);
  console.log("─".repeat(70));

  for (const row of data.refdomains || []) {
    const refDomain = (row.domain || "").substring(0, 38);
    const dr = row.domain_rating || 0;
    const links = formatNumber(row.backlinks || 0);
    const firstSeen = (row.first_seen || "").substring(0, 10);
    console.log(`${refDomain.padEnd(40)} ${String(dr).padStart(4)} ${links.padStart(8)} ${firstSeen.padStart(12)}`);
  }
  console.log("");
}

async function getOrganicKeywords(domain: string, limit: number = 25) {
  const data = await apiCall("site-explorer/organic-keywords", {
    target: domain,
    mode: "domain",
    country: DEFAULT_COUNTRY,
    date: today(),
    select: "keyword,position,volume,traffic,keyword_difficulty,url",
    limit,
    order_by: "traffic:desc",
  });

  console.log(`\n🔑 Top Organic Keywords: ${domain} (${DEFAULT_COUNTRY.toUpperCase()})`);
  console.log("─".repeat(85));
  console.log(`${"Keyword".padEnd(40)} ${"Pos".padStart(4)} ${"Volume".padStart(8)} ${"Traffic".padStart(8)} ${"KD".padStart(4)}`);
  console.log("─".repeat(85));

  for (const row of data.keywords || []) {
    const keyword = (row.keyword || "").substring(0, 38);
    const pos = row.position || "-";
    const volume = formatNumber(row.volume || 0);
    const traffic = formatNumber(row.traffic || 0);
    const kd = row.keyword_difficulty || "-";
    console.log(`${keyword.padEnd(40)} ${String(pos).padStart(4)} ${volume.padStart(8)} ${traffic.padStart(8)} ${String(kd).padStart(4)}`);
  }
  console.log("");
}

async function getOrganicCompetitors(domain: string, limit: number = 15) {
  const data = await apiCall("site-explorer/organic-competitors", {
    target: domain,
    mode: "domain",
    country: DEFAULT_COUNTRY,
    date: today(),
    select: "domain,common_keywords,org_keywords,org_traffic,domain_rating",
    limit,
    order_by: "common_keywords:desc",
  });

  console.log(`\n🥊 Organic Competitors: ${domain}`);
  console.log("─".repeat(80));
  console.log(`${"Competitor".padEnd(35)} ${"Common KW".padStart(10)} ${"Total KW".padStart(10)} ${"Traffic".padStart(10)} ${"DR".padStart(4)}`);
  console.log("─".repeat(80));

  for (const row of data.competitors || []) {
    const comp = (row.domain || "").substring(0, 33);
    const common = formatNumber(row.common_keywords || 0);
    const total = formatNumber(row.org_keywords || 0);
    const traffic = formatNumber(row.org_traffic || 0);
    const dr = row.domain_rating || 0;
    console.log(`${comp.padEnd(35)} ${common.padStart(10)} ${total.padStart(10)} ${traffic.padStart(10)} ${String(dr).padStart(4)}`);
  }
  console.log("");
}

async function getTopPages(domain: string, limit: number = 20) {
  const data = await apiCall("site-explorer/top-pages", {
    target: domain,
    mode: "domain",
    date: today(),
    select: "url,traffic,top_keyword,position,keywords",
    limit,
    order_by: "traffic:desc",
  });

  console.log(`\n📄 Top Pages by Traffic: ${domain}`);
  console.log("─".repeat(100));
  console.log(`${"Page".padEnd(50)} ${"Traffic".padStart(8)} ${"Keywords".padStart(8)} ${"Top Keyword".padStart(30)}`);
  console.log("─".repeat(100));

  for (const row of data.pages || []) {
    const page = (row.url || "").replace(`https://${domain}`, "").substring(0, 48);
    const traffic = formatNumber(row.traffic || 0);
    const keywords = formatNumber(row.keywords || 0);
    const topKw = (row.top_keyword || "").substring(0, 28);
    console.log(`${page.padEnd(50)} ${traffic.padStart(8)} ${keywords.padStart(8)} ${topKw.padStart(30)}`);
  }
  console.log("");
}

async function getBrokenBacklinks(domain: string) {
  const data = await apiCall("site-explorer/broken-backlinks", {
    target: domain,
    mode: "domain",
    select: "url_from,url_to,anchor,domain_rating_source,http_code",
    limit: 25,
    order_by: "domain_rating_source:desc",
  });

  console.log(`\n💔 Broken Backlinks: ${domain}`);
  console.log("─".repeat(95));
  console.log(`${"From URL".padEnd(45)} ${"To URL".padEnd(30)} ${"DR".padStart(4)} ${"Code".padStart(5)}`);
  console.log("─".repeat(95));

  const backlinks = data.backlinks || [];
  if (backlinks.length === 0) {
    console.log("   No broken backlinks found! 🎉");
  } else {
    for (const row of backlinks) {
      const from = (row.url_from || "").substring(0, 43);
      const to = (row.url_to || "").replace(`https://${domain}`, "").substring(0, 28);
      const dr = row.domain_rating_source || 0;
      const code = row.http_code || "-";
      console.log(`${from.padEnd(45)} ${to.padEnd(30)} ${String(dr).padStart(4)} ${String(code).padStart(5)}`);
    }
  }
  console.log("");
}

async function getKeywordOverview(keyword: string) {
  const data = await apiCall("keywords-explorer/overview", {
    keywords: keyword,
    country: DEFAULT_COUNTRY,
    select: "keyword,volume,keyword_difficulty,cpc,clicks,traffic_potential,parent_topic",
  });

  const kw = data.keywords?.[0] || {};

  console.log(`\n🔎 Keyword Overview: "${keyword}"`);
  console.log("─".repeat(50));
  console.log(`   Search Volume:      ${formatNumber(kw.volume || 0)}/mo`);
  console.log(`   Keyword Difficulty: ${kw.keyword_difficulty || "N/A"}`);
  console.log(`   CPC:                ${formatCurrency(kw.cpc || 0)}`);
  console.log(`   Clicks:             ${formatNumber(kw.clicks || 0)}/mo`);
  console.log(`   Traffic Potential:  ${formatNumber(kw.traffic_potential || 0)}`);
  console.log(`   Parent Topic:       ${kw.parent_topic || "N/A"}`);
  console.log("");
}

async function getSerpOverview(keyword: string) {
  const data = await apiCall("serp-overview/serp-overview", {
    keyword,
    country: DEFAULT_COUNTRY,
    select: "position,url,domain_rating,traffic,backlinks,title",
    top_positions: 10,
  });

  console.log(`\n📊 SERP Overview: "${keyword}" (${DEFAULT_COUNTRY.toUpperCase()})`);
  console.log("─".repeat(100));
  console.log(`${"#".padStart(2)} ${"URL".padEnd(50)} ${"DR".padStart(4)} ${"Traffic".padStart(8)} ${"Links".padStart(8)}`);
  console.log("─".repeat(100));

  for (const row of data.serp || []) {
    const pos = row.position || "-";
    const url = (row.url || "").substring(0, 48);
    const dr = row.domain_rating || 0;
    const traffic = formatNumber(row.traffic || 0);
    const links = formatNumber(row.backlinks || 0);
    console.log(`${String(pos).padStart(2)} ${url.padEnd(50)} ${String(dr).padStart(4)} ${traffic.padStart(8)} ${links.padStart(8)}`);
  }
  console.log("");
}

// ============================================
// Main
// ============================================

const command = process.argv[2] || "overview";
const arg1 = process.argv[3] || DEFAULT_DOMAIN;
const arg2 = parseInt(process.argv[4]) || 20;

try {
  switch (command) {
    case "overview":
      await getDomainOverview(arg1);
      break;
    case "domain-rating":
    case "dr":
      await getDomainRating(arg1);
      break;
    case "backlinks":
      await getBacklinks(arg1, arg2);
      break;
    case "refdomains":
      await getRefdomains(arg1, arg2);
      break;
    case "keywords":
      await getOrganicKeywords(arg1, arg2);
      break;
    case "competitors":
      await getOrganicCompetitors(arg1, arg2);
      break;
    case "pages":
      await getTopPages(arg1, arg2);
      break;
    case "broken-backlinks":
      await getBrokenBacklinks(arg1);
      break;
    case "keyword-overview":
    case "kw":
      await getKeywordOverview(arg1);
      break;
    case "serp":
      await getSerpOverview(arg1);
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log("\nAvailable commands:");
      console.log("  overview [domain]           - Domain overview");
      console.log("  domain-rating [domain]      - Domain Rating only");
      console.log("  backlinks [domain] [limit]  - Top backlinks");
      console.log("  refdomains [domain] [limit] - Referring domains");
      console.log("  keywords [domain] [limit]   - Organic keywords");
      console.log("  competitors [domain] [limit]- Organic competitors");
      console.log("  pages [domain] [limit]      - Top pages");
      console.log("  broken-backlinks [domain]   - Broken backlinks");
      console.log('  keyword-overview "keyword"  - Keyword metrics');
      console.log('  serp "keyword"              - SERP overview');
      process.exit(1);
  }
} catch (error: any) {
  console.error(`\n❌ Error: ${error.message}`);

  if (error.message.includes("401") || error.message.includes("403")) {
    console.log("\n💡 Authentication issue. Check:");
    console.log("   1. API key is correct in .claude/skills/ahrefs/.env");
    console.log("   2. Your Ahrefs plan has API access (Enterprise required for full API)");
    console.log("   3. For non-Enterprise: use MCP tools instead (mcp__ahrefs__*)");
  }

  process.exit(1);
}
