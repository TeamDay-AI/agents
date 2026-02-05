/**
 * TeamDay Agent Schema
 *
 * Agents are dual-purpose:
 * 1. Chat agents - Users can chat directly with them in TeamDay
 * 2. Subagents - Other agents can invoke them via Task tool
 *
 * This schema extends the Claude Agent SDK format with TeamDay-specific fields.
 */

// Core agent definition (Claude SDK compatible)
export interface AgentDefinition {
  // Required by SDK
  description: string;  // When to use this agent (for auto-invocation)
  prompt: string;       // System prompt defining behavior

  // Optional SDK fields
  tools?: string[];     // Allowed tools (inherits all if omitted)
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
}

// Extended TeamDay agent (includes UI/marketplace fields)
export interface TeamDayAgent extends AgentDefinition {
  // Identity
  id: string;           // Unique slug: 'seo-specialist'
  name: string;         // Display name: 'SEO Specialist'
  version: string;      // SemVer: '1.0.0'

  // UI/Chat
  avatar?: string;      // URL or emoji: '🔍' or '/avatars/seo.png'
  greeting?: string;    // First message when starting chat

  // Discovery/Marketplace
  category: AgentCategory;
  tags: string[];       // For search: ['seo', 'marketing', 'analytics']
  author?: string;      // 'teamday' | 'community' | username

  // Dependencies
  requires?: {
    skills?: string[];  // e.g., ['teamday/browser', 'anthropic/pdf']
    mcps?: string[];    // e.g., ['search-console', 'google-analytics']
    credentials?: string[]; // e.g., ['GOOGLE_ANALYTICS_CREDENTIALS']
  };

  // Relationships
  worksWellWith?: string[];  // Other agent IDs
  partOfSquads?: string[];   // Squad IDs this agent belongs to

  // Pricing/Access
  tier?: 'free' | 'pro' | 'enterprise';

  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

// Squad = pre-composed team of agents
export interface AgentSquad {
  id: string;
  name: string;
  description: string;
  avatar?: string;

  // Team composition
  agents: string[];     // Agent IDs in this squad
  lead?: string;        // Primary agent ID (orchestrates others)

  // Discovery
  category: AgentCategory;
  tags: string[];

  // Use case
  useCase: string;      // "Build SEO-optimized websites"

  tier?: 'free' | 'pro' | 'enterprise';
}

// Categories for organization
export type AgentCategory =
  | 'development'    // Coding, debugging, architecture
  | 'marketing'      // SEO, content, analytics
  | 'operations'     // DevOps, security, compliance
  | 'data'           // Analytics, ML, data engineering
  | 'design'         // UI/UX, graphics, branding
  | 'business'       // Strategy, planning, finance
  | 'research'       // Analysis, exploration, learning
  | 'productivity'   // Automation, organization, communication
  | 'custom';        // User-created

// Registry for discovery (stored in Firebase + synced to filesystem)
export interface AgentRegistry {
  version: string;
  lastUpdated: string;
  agents: Record<string, AgentRegistryEntry>;
  squads: Record<string, SquadRegistryEntry>;
}

// Lightweight entry for search (full agent loaded on demand)
export interface AgentRegistryEntry {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  category: AgentCategory;
  tags: string[];
  tier?: 'free' | 'pro' | 'enterprise';
  version: string;
  // Path to full definition (filesystem) or Firestore doc ID
  source: string;
}

export interface SquadRegistryEntry {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  category: AgentCategory;
  tags: string[];
  agents: string[];
  useCase: string;
  tier?: 'free' | 'pro' | 'enterprise';
  source: string;
}
