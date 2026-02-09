/**
 * Sync MCP Server Library to Firebase
 *
 * This script reads MCP server definitions from mcp.json manifests and syncs
 * them to the `mcp_library` Firestore collection for the marketplace.
 *
 * Each MCP server directory should contain:
 *   - mcp.json   (manifest with metadata, runtime config, env vars, tools)
 *   - README.md  (optional, displayed in marketplace)
 *   - index.js   (for local runtime type - the actual server code)
 *
 * Usage:
 *   bun run mcp/sync-to-firebase.ts
 *
 * Environment:
 *   FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_BASE64
 *   FIRESTORE_EMULATOR_HOST (optional, for local development)
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

import type { McpServerDefinition, FirestoreMcpServer } from './schema'

const GITHUB_REPO = 'TeamDay-AI/agents'

// Remove undefined values from object (Firestore doesn't accept undefined)
function removeUndefined<T extends Record<string, any>>(obj: T): T {
  const result = {} as T
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof FieldValue)) {
        result[key as keyof T] = removeUndefined(value)
      } else {
        result[key as keyof T] = value
      }
    }
  }
  return result
}

// Initialize Firebase
function initFirebase(): Firestore {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST

  if (emulatorHost) {
    console.log(`  Using Firestore emulator at ${emulatorHost}`)
    initializeApp({ projectId: 'teamday-cc' })
  } else {
    const serviceAccountJson =
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
        ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
        : null)

    if (!serviceAccountJson) {
      throw new Error(
        'Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_BASE64'
      )
    }

    const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount
    initializeApp({ credential: cert(serviceAccount) })
    console.log('  Connected to Firebase production')
  }

  return getFirestore()
}

// Parse an MCP server directory
function parseMcpServer(serverDir: string): { manifest: McpServerDefinition; readme: string } | null {
  const manifestPath = join(serverDir, 'mcp.json')
  const readmePath = join(serverDir, 'README.md')

  if (!existsSync(manifestPath)) {
    console.warn(`  Warning: No mcp.json found in ${serverDir}`)
    return null
  }

  try {
    const manifest: McpServerDefinition = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf-8') : ''

    return { manifest, readme }
  } catch (e) {
    console.error(`  Failed to parse ${serverDir}:`, e)
    return null
  }
}

// Get all MCP server directories
function getMcpServerDirs(mcpDir: string): string[] {
  if (!existsSync(mcpDir)) return []

  return readdirSync(mcpDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
    .map(dirent => join(mcpDir, dirent.name))
}

// Get category icon
function getCategoryIcon(category?: string): string {
  const icons: Record<string, string> = {
    marketing: '📣',
    development: '💻',
    operations: '🚀',
    data: '📊',
    productivity: '⚙️',
    business: '💼',
    research: '🔬',
    other: '🔌',
  }
  return icons[category || 'other'] || '🔌'
}

// Sync MCP servers to Firestore
async function syncMcpServers(db: Firestore, mcpDir: string): Promise<number> {
  const collection = db.collection('mcp_library')
  let count = 0

  const serverDirs = getMcpServerDirs(mcpDir)

  for (const dir of serverDirs) {
    const parsed = parseMcpServer(dir)
    if (!parsed) continue

    const { manifest, readme } = parsed
    const dirName = dir.split('/').pop()!

    const doc: FirestoreMcpServer = {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      readme,
      version: manifest.version,
      author: manifest.author || 'TeamDay',
      category: manifest.category || 'other',
      tags: manifest.tags || [],
      tier: manifest.tier || 'free',
      icon: manifest.icon,
      official: manifest.official || false,
      experimental: manifest.experimental || false,

      transport: manifest.transport || 'stdio',
      runtimeType: manifest.runtime.type,
      runtimeConfig: manifest.runtime,

      env: manifest.env || {},
      tools: manifest.tools || [],
      toolCount: manifest.tools?.length || 0,

      links: manifest.links,

      usedByAgents: manifest.usedBy?.agents || [],
      usedByPlugins: manifest.usedBy?.plugins || [],

      source: {
        type: 'github',
        repo: GITHUB_REPO,
        path: `mcp/${dirName}`,
      },

      verified: true,
      featured: false,
      installCount: 0,
    }

    // Use merge to preserve installCount and other stats
    await collection.doc(manifest.id).set(
      removeUndefined({
        ...doc,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true }
    )

    const icon = getCategoryIcon(manifest.category)
    console.log(`  ${icon} ${manifest.name} (${manifest.tools?.length || 0} tools, ${manifest.runtime.type})`)
    count++
  }

  return count
}

// Main
async function main() {
  console.log('Syncing MCP Server Library to Firebase\n')

  const db = initFirebase()
  const mcpDir = join(import.meta.dir, '.')

  console.log('Syncing MCP servers...')
  const count = await syncMcpServers(db, mcpDir)

  console.log(`\nDone! Synced ${count} MCP servers.`)
}

main().catch(console.error)
