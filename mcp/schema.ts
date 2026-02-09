/**
 * TeamDay MCP Server Schema
 *
 * MCP servers provide tool capabilities to agents. They come in four flavors:
 * 1. Local - Custom code living in this monorepo (e.g., search-console-mcp)
 * 2. npm   - Published npm packages, run via npx (e.g., @anthropics/mcp-ahrefs)
 * 3. pip   - Python packages, run via pipx (e.g., analytics-mcp)
 * 4. git   - Git repos requiring clone + install (e.g., AminForou/mcp-gsc)
 *
 * This schema is used for:
 * - Marketplace discovery (mcp_library Firestore collection)
 * - Plugin integration (generating mcpServers config)
 * - Agent dependency resolution (agents declare required MCPs)
 */

import type { AgentCategory } from '../agents/schema'

// Runtime configuration - how to start the MCP server
export type McpRuntime =
  | McpRuntimeLocal
  | McpRuntimeNpm
  | McpRuntimePip
  | McpRuntimeGit

export interface McpRuntimeLocal {
  type: 'local'
  command: string          // e.g. 'node'
  args: string[]           // e.g. ['index.js']
  installCommand?: string  // e.g. 'npm install'
}

export interface McpRuntimeNpm {
  type: 'npm'
  package: string          // e.g. '@anthropics/mcp-ahrefs'
  args?: string[]          // extra args after package name
}

export interface McpRuntimePip {
  type: 'pip'
  package: string          // e.g. 'analytics-mcp'
  installSpec?: string     // e.g. 'git+https://...' for unpublished packages
  args?: string[]
}

export interface McpRuntimeGit {
  type: 'git'
  repository: string       // e.g. 'https://github.com/AminForou/mcp-gsc'
  command: string          // e.g. 'python'
  args: string[]           // e.g. ['gsc_server.py']
  installCommand: string   // e.g. 'pip install -r requirements.txt'
  requiresVenv?: boolean
  pythonVersion?: string   // e.g. '3.11+'
}

// Environment variable definition
export interface McpEnvVar {
  required: boolean
  description: string
  default?: string
}

// Tool exposed by the MCP server
export interface McpTool {
  name: string
  description: string
}

// Full MCP server definition (stored in mcp.json)
export interface McpServerDefinition {
  // Identity
  id: string               // Unique slug: 'search-console'
  name: string             // Display name: 'Google Search Console'
  description: string
  version: string

  // Discovery
  author: string
  category: AgentCategory
  tags: string[]
  tier?: 'free' | 'pro' | 'enterprise'
  icon?: string            // URL or emoji
  official?: boolean       // Made by the platform owner (e.g., Google for GA)
  experimental?: boolean   // Not production-ready yet

  // Runtime
  transport: 'stdio' | 'sse'
  runtime: McpRuntime

  // Configuration
  env: Record<string, McpEnvVar>

  // Capabilities
  tools: McpTool[]

  // Links
  links?: {
    repository?: string
    pypi?: string
    npm?: string
    docs?: string
  }

  // Relationships
  usedBy?: {
    agents?: string[]
    plugins?: string[]
  }
}

// Lightweight registry entry for search/discovery
export interface McpRegistryEntry {
  id: string
  name: string
  description: string
  icon?: string
  category: AgentCategory
  tags: string[]
  tier?: 'free' | 'pro' | 'enterprise'
  version: string
  runtimeType: McpRuntime['type']
  toolCount: number
  official?: boolean
  experimental?: boolean
  source: string           // Directory path within mcp/
}

// Registry file format
export interface McpRegistry {
  version: string
  lastUpdated: string
  servers: Record<string, McpRegistryEntry>
}

// Firestore document for mcp_library collection
export interface FirestoreMcpServer {
  id: string
  name: string
  description: string
  readme: string
  version: string
  author: string
  category: string
  tags: string[]
  tier: string
  icon?: string

  official: boolean
  experimental: boolean

  transport: string
  runtimeType: string
  runtimeConfig: McpRuntime

  env: Record<string, McpEnvVar>
  tools: McpTool[]
  toolCount: number

  links?: {
    repository?: string
    pypi?: string
    npm?: string
    docs?: string
  }

  usedByAgents: string[]
  usedByPlugins: string[]

  source: {
    type: 'github'
    repo: string
    path: string
  }

  verified: boolean
  featured: boolean
  installCount: number
}
