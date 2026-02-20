#!/usr/bin/env bun
/**
 * Extract Ahrefs OAuth token from macOS Keychain
 *
 * The token is stored by Claude Code after OAuth authentication.
 *
 * Usage:
 *   bun .claude/skills/ahrefs/scripts/get-ahrefs-token.ts
 *   bun .claude/skills/ahrefs/scripts/get-ahrefs-token.ts --json
 */

import { execSync } from "child_process";

interface McpOAuthEntry {
  serverName: string;
  serverUrl: string;
  clientId: string;
  accessToken: string;
  expiresAt: number;
  scope: string;
}

interface ClaudeCredentials {
  claudeAiOauth?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scopes: string[];
    subscriptionType: string;
    rateLimitTier: string;
  };
  mcpOAuth?: Record<string, McpOAuthEntry>;
}

function getCredentialsFromKeychain(): ClaudeCredentials | null {
  try {
    const result = execSync(
      'security find-generic-password -s "Claude Code-credentials" -w',
      { encoding: "utf-8" }
    );
    return JSON.parse(result.trim());
  } catch (error) {
    console.error("Failed to read from keychain:", error);
    return null;
  }
}

function findAhrefsToken(credentials: ClaudeCredentials): McpOAuthEntry | null {
  if (!credentials.mcpOAuth) return null;

  for (const [key, value] of Object.entries(credentials.mcpOAuth)) {
    if (key.startsWith("ahrefs|") || value.serverName === "ahrefs") {
      return value;
    }
  }
  return null;
}

// Main
const outputJson = process.argv.includes("--json");
const credentials = getCredentialsFromKeychain();

if (!credentials) {
  console.error("❌ Could not read Claude Code credentials from Keychain");
  console.error("   Make sure you've authenticated with /mcp in Claude Code");
  process.exit(1);
}

const ahrefsAuth = findAhrefsToken(credentials);

if (!ahrefsAuth) {
  console.error("❌ No Ahrefs OAuth token found");
  console.error("   Run /mcp in Claude Code and authenticate with Ahrefs");
  process.exit(1);
}

if (outputJson) {
  console.log(JSON.stringify(ahrefsAuth, null, 2));
} else {
  const expiresDate = new Date(ahrefsAuth.expiresAt);
  console.log(`\n🔑 Ahrefs OAuth Token`);
  console.log("─".repeat(50));
  console.log(`   Server:    ${ahrefsAuth.serverName}`);
  console.log(`   URL:       ${ahrefsAuth.serverUrl}`);
  console.log(`   Scope:     ${ahrefsAuth.scope}`);
  console.log(`   Expires:   ${expiresDate.toISOString()}`);
  console.log(`   Token:     ${ahrefsAuth.accessToken.substring(0, 20)}...`);
  console.log("");
  console.log("To use in scripts:");
  console.log(`   export AHREFS_MCP_TOKEN="${ahrefsAuth.accessToken}"`);
  console.log("");
}
