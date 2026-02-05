/**
 * Sync Plugin Library to Firebase
 *
 * This script reads plugin definitions from the filesystem and syncs them
 * to the `plugin_library` Firestore collection for the marketplace.
 *
 * Only metadata is synced - actual plugin files stay on GitHub and are
 * cloned during installation.
 *
 * Usage:
 *   bun run plugins/sync-to-firebase.ts
 *
 * Environment:
 *   FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_BASE64
 *   FIRESTORE_EMULATOR_HOST (optional, for local development)
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

// Types
interface PluginManifest {
  name: string
  displayName?: string
  description: string
  version?: string
  author?: string | { name: string; email?: string; url?: string }
  category?: string
  keywords?: string[]
  license?: string
  repository?: string | { type: string; url: string }
  homepage?: string
  capabilities?: {
    commands?: string[]
    skills?: string[]
    agents?: string[]
  }
  mcpServers?: Record<string, any>
  requires?: {
    credentials?: string[]
  }
}

interface FirestorePlugin {
  id: string
  name: string
  displayName: string
  description: string
  readme: string
  version: string
  author: string
  category: string
  keywords: string[]
  license: string
  capabilities: {
    commands: string[]
    skills: string[]
    agents: string[]
  }
  hasMcpServers: boolean
  mcpServerNames: string[]
  requiredCredentials: string[]
  source: {
    type: 'github'
    repo: string
    path: string
  }
  verified: boolean
  featured: boolean
  installCount: number
  createdAt: FieldValue
  updatedAt: FieldValue
}

const GITHUB_REPO = 'TeamDay-AI/agents'

// Remove undefined values from object
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
    console.log(`🔧 Using Firestore emulator at ${emulatorHost}`)
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
    console.log('🔥 Connected to Firebase production')
  }

  return getFirestore()
}

// Get author name from manifest
function getAuthorName(author: PluginManifest['author']): string {
  if (!author) return 'Unknown'
  if (typeof author === 'string') return author
  return author.name || 'Unknown'
}

// Parse a plugin directory
function parsePlugin(pluginDir: string): { manifest: PluginManifest; readme: string } | null {
  const manifestPath = join(pluginDir, '.claude-plugin', 'plugin.json')
  const readmePath = join(pluginDir, 'README.md')

  if (!existsSync(manifestPath)) {
    console.warn(`  ⚠️ No manifest found in ${pluginDir}`)
    return null
  }

  try {
    const manifest: PluginManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf-8') : ''

    return { manifest, readme }
  } catch (e) {
    console.error(`  ❌ Failed to parse ${pluginDir}:`, e)
    return null
  }
}

// Get all plugin directories
function getPluginDirs(pluginsDir: string): string[] {
  if (!existsSync(pluginsDir)) return []

  return readdirSync(pluginsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
    .map(dirent => join(pluginsDir, dirent.name))
}

// Sync plugins to Firestore
async function syncPlugins(db: Firestore, pluginsDir: string): Promise<number> {
  const collection = db.collection('plugin_library')
  let count = 0

  const pluginDirs = getPluginDirs(pluginsDir)

  for (const dir of pluginDirs) {
    const parsed = parsePlugin(dir)
    if (!parsed) continue

    const { manifest, readme } = parsed
    const pluginName = manifest.name

    const doc: FirestorePlugin = {
      id: pluginName,
      name: pluginName,
      displayName: manifest.displayName || pluginName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      description: manifest.description || '',
      readme,
      version: manifest.version || '1.0.0',
      author: getAuthorName(manifest.author),
      category: manifest.category || 'other',
      keywords: manifest.keywords || [],
      license: manifest.license || 'MIT',
      capabilities: {
        commands: manifest.capabilities?.commands || [],
        skills: manifest.capabilities?.skills || [],
        agents: manifest.capabilities?.agents || [],
      },
      hasMcpServers: !!manifest.mcpServers && Object.keys(manifest.mcpServers).length > 0,
      mcpServerNames: manifest.mcpServers ? Object.keys(manifest.mcpServers) : [],
      requiredCredentials: manifest.requires?.credentials || [],
      source: {
        type: 'github',
        repo: GITHUB_REPO,
        path: `plugins/${pluginName}`,
      },
      verified: true, // All library plugins are verified
      featured: false,
      installCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    // Use merge to preserve installCount and other stats
    await collection.doc(pluginName).set(removeUndefined(doc), { merge: true })

    const icon = getCategoryIcon(manifest.category)
    console.log(`  ✅ ${icon} ${doc.displayName}`)
    count++
  }

  return count
}

// Get category icon
function getCategoryIcon(category?: string): string {
  const icons: Record<string, string> = {
    content: '📝',
    compliance: '🛡️',
    security: '🔒',
    development: '💻',
    marketing: '📣',
    automation: '⚙️',
    analytics: '📊',
    other: '🔌',
  }
  return icons[category || 'other'] || '🔌'
}

// Main
async function main() {
  console.log('🚀 Syncing Plugin Library to Firebase\n')

  const db = initFirebase()
  const pluginsDir = join(import.meta.dir, '.')

  console.log('📦 Syncing plugins...')
  const count = await syncPlugins(db, pluginsDir)

  console.log(`\n✨ Done! Synced ${count} plugins.`)
}

main().catch(console.error)
