/**
 * Sync Agent Library to Firebase
 *
 * This script reads agent definitions from the filesystem and syncs them
 * to the `agent_library` Firestore collection for the marketplace.
 *
 * Usage:
 *   bun run agents/sync-to-firebase.ts
 *
 * Environment:
 *   FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_BASE64
 *   FIRESTORE_EMULATOR_HOST (optional, for local development)
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, basename } from 'path'
import matter from 'gray-matter'

// Types
interface AgentFrontmatter {
  id: string
  name: string
  description: string
  version: string
  avatar?: string
  greeting?: string
  category: string
  tags: string[]
  tier?: 'free' | 'pro' | 'enterprise'
  tools?: string[]
  model?: string
  requires?: {
    skills?: string[]
    mcps?: string[]
    credentials?: string[]
  }
  worksWellWith?: string[]
}

interface SquadFrontmatter {
  id: string
  name: string
  description: string
  version: string
  avatar?: string
  greeting?: string
  category: string
  tags: string[]
  useCase: string
  tier?: 'free' | 'pro' | 'enterprise'
  agents: string[]
  lead?: string
}

interface FirestoreAgent {
  id: string
  name: string
  description: string
  prompt: string
  version: string
  avatar?: string
  greeting?: string
  category: string
  tags: string[]
  tier: string
  tools?: string[]
  model?: string
  requires?: {
    skills?: string[]
    mcps?: string[]
    credentials?: string[]
  }
  worksWellWith?: string[]
  type: 'specialist' | 'librarian'
  source: 'library'
  createdAt: FieldValue
  updatedAt: FieldValue
}

interface FirestoreSquad {
  id: string
  name: string
  description: string
  prompt: string
  version: string
  avatar?: string
  greeting?: string
  category: string
  tags: string[]
  useCase: string
  tier: string
  agents: string[]
  lead?: string
  type: 'squad'
  source: 'library'
  createdAt: FieldValue
  updatedAt: FieldValue
}

// Remove undefined values from object (Firestore doesn't accept undefined)
function removeUndefined<T extends Record<string, any>>(obj: T): T {
  const result = {} as T
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (value !== undefined) {
      // Recursively clean nested objects (but not arrays or FieldValue)
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
    // Use teamday-cc to match the app's project ID
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

// Parse a markdown agent file
function parseAgentFile(filePath: string): { frontmatter: AgentFrontmatter; prompt: string } {
  const content = readFileSync(filePath, 'utf-8')
  const { data, content: body } = matter(content)

  // Extract the prompt (everything after frontmatter)
  const prompt = body.trim()

  return {
    frontmatter: data as AgentFrontmatter,
    prompt,
  }
}

// Parse a markdown squad file
function parseSquadFile(filePath: string): { frontmatter: SquadFrontmatter; prompt: string } {
  const content = readFileSync(filePath, 'utf-8')
  const { data, content: body } = matter(content)

  return {
    frontmatter: data as SquadFrontmatter,
    prompt: body.trim(),
  }
}

// Get all agent files from a directory
function getAgentFiles(dir: string): string[] {
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => join(dir, f))
}

// Sync agents to Firestore
async function syncAgents(db: Firestore, agentsDir: string): Promise<number> {
  const collection = db.collection('agent_library')
  let count = 0

  // Sync specialists
  const specialistsDir = join(agentsDir, 'specialists')
  const specialistFiles = getAgentFiles(specialistsDir)

  for (const file of specialistFiles) {
    const { frontmatter, prompt } = parseAgentFile(file)

    const doc: FirestoreAgent = {
      id: frontmatter.id,
      name: frontmatter.name,
      description: frontmatter.description,
      prompt,
      version: frontmatter.version,
      avatar: frontmatter.avatar,
      greeting: frontmatter.greeting,
      category: frontmatter.category,
      tags: frontmatter.tags || [],
      tier: frontmatter.tier || 'free',
      tools: frontmatter.tools,
      model: frontmatter.model,
      requires: frontmatter.requires,
      worksWellWith: frontmatter.worksWellWith,
      type: 'specialist',
      source: 'library',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await collection.doc(frontmatter.id).set(removeUndefined(doc), { merge: true })
    console.log(`  ✅ ${frontmatter.avatar || '🤖'} ${frontmatter.name}`)
    count++
  }

  // Sync librarian
  const librarianDir = join(agentsDir, 'librarian')
  const librarianFiles = getAgentFiles(librarianDir)

  for (const file of librarianFiles) {
    const { frontmatter, prompt } = parseAgentFile(file)

    const doc: FirestoreAgent = {
      id: frontmatter.id,
      name: frontmatter.name,
      description: frontmatter.description,
      prompt,
      version: frontmatter.version,
      avatar: frontmatter.avatar,
      greeting: frontmatter.greeting,
      category: frontmatter.category,
      tags: frontmatter.tags || [],
      tier: frontmatter.tier || 'free',
      tools: frontmatter.tools,
      model: frontmatter.model,
      requires: frontmatter.requires,
      worksWellWith: frontmatter.worksWellWith,
      type: 'librarian',
      source: 'library',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await collection.doc(frontmatter.id).set(removeUndefined(doc), { merge: true })
    console.log(`  ✅ ${frontmatter.avatar || '🤖'} ${frontmatter.name}`)
    count++
  }

  return count
}

// Sync squads to Firestore
async function syncSquads(db: Firestore, agentsDir: string): Promise<number> {
  const collection = db.collection('agent_library')
  let count = 0

  const squadsDir = join(agentsDir, 'squads')
  const squadFiles = getAgentFiles(squadsDir)

  for (const file of squadFiles) {
    const { frontmatter, prompt } = parseSquadFile(file)

    const doc: FirestoreSquad = {
      id: frontmatter.id,
      name: frontmatter.name,
      description: frontmatter.description,
      prompt,
      version: frontmatter.version,
      avatar: frontmatter.avatar,
      greeting: frontmatter.greeting,
      category: frontmatter.category,
      tags: frontmatter.tags || [],
      useCase: frontmatter.useCase,
      tier: frontmatter.tier || 'free',
      agents: frontmatter.agents,
      lead: frontmatter.lead,
      type: 'squad',
      source: 'library',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await collection.doc(frontmatter.id).set(removeUndefined(doc), { merge: true })
    console.log(`  ✅ ${frontmatter.avatar || '🤖'} ${frontmatter.name} (squad)`)
    count++
  }

  return count
}

// Main
async function main() {
  console.log('🚀 Syncing Agent Library to Firebase\n')

  const db = initFirebase()
  const agentsDir = join(import.meta.dir, '.')

  console.log('📦 Syncing agents...')
  const agentCount = await syncAgents(db, agentsDir)

  console.log('\n📦 Syncing squads...')
  const squadCount = await syncSquads(db, agentsDir)

  console.log(`\n✨ Done! Synced ${agentCount} agents and ${squadCount} squads.`)
}

main().catch(console.error)
