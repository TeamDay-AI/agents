/**
 * Sync Skill Library to Firebase
 *
 * This script reads skill definitions from the filesystem and syncs them
 * to the `skill_library` Firestore collection for the marketplace.
 *
 * Skills are organized by provider:
 * - anthropic/ - Official Anthropic skills (submodule)
 * - huggingface/ - Hugging Face skills (submodule)
 * - community/ - Community-contributed skills
 * - teamday/ - TeamDay internal skills
 *
 * Usage:
 *   bun run skills/sync-to-firebase.ts
 *
 * Environment:
 *   FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_BASE64
 *   FIRESTORE_EMULATOR_HOST (optional, for local development)
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, basename, dirname } from 'path'
import matter from 'gray-matter'

// Types
interface SkillFrontmatter {
  name?: string
  description?: string
  'allowed-tools'?: string
  model?: string
  category?: string
  tags?: string[]
  requires?: {
    mcps?: string[]
    credentials?: string[]
  }
}

interface FirestoreSkill {
  id: string
  name: string
  displayName: string
  description: string
  prompt: string
  provider: string
  category: string
  tags: string[]
  allowedTools: string[]
  model: string | null
  requiredMcps: string[]
  requiredCredentials: string[]
  source: {
    type: 'github'
    repo: string
    path: string
  }
  verified: boolean
  featured: boolean
  usageCount: number
  createdAt: FieldValue
  updatedAt: FieldValue
}

const GITHUB_REPO = 'TeamDay-AI/agents'
const PROVIDERS = ['anthropic', 'huggingface', 'community', 'teamday']

// Provider source repos (for submodules)
const PROVIDER_REPOS: Record<string, string> = {
  anthropic: 'anthropics/skills',
  huggingface: 'huggingface/skills',
  community: GITHUB_REPO,
  teamday: GITHUB_REPO,
}

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

// Parse a SKILL.md file
function parseSkillFile(filePath: string): { frontmatter: SkillFrontmatter; prompt: string } | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const { data, content: body } = matter(content)

    return {
      frontmatter: data as SkillFrontmatter,
      prompt: body.trim(),
    }
  } catch (e) {
    console.error(`  ❌ Failed to parse ${filePath}:`, e)
    return null
  }
}

// Get all skill directories for a provider
function getSkillDirs(providerDir: string): string[] {
  if (!existsSync(providerDir)) return []

  return readdirSync(providerDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
    .map(dirent => join(providerDir, dirent.name))
}

// Generate display name from slug
function toDisplayName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Sync skills for a provider
async function syncProviderSkills(
  db: Firestore,
  skillsDir: string,
  provider: string
): Promise<number> {
  const collection = db.collection('skill_library')
  const providerDir = join(skillsDir, provider)
  let count = 0

  if (!existsSync(providerDir)) {
    console.log(`  ⚠️ Provider directory not found: ${provider}`)
    return 0
  }

  const skillDirs = getSkillDirs(providerDir)

  for (const dir of skillDirs) {
    const skillMdPath = join(dir, 'SKILL.md')
    if (!existsSync(skillMdPath)) {
      // Try lowercase
      const altPath = join(dir, 'skill.md')
      if (!existsSync(altPath)) continue
    }

    const parsed = parseSkillFile(existsSync(skillMdPath) ? skillMdPath : join(dir, 'skill.md'))
    if (!parsed) continue

    const { frontmatter, prompt } = parsed
    const skillName = basename(dir)
    const skillId = `${provider}/${skillName}`

    // Determine source repo
    const sourceRepo = PROVIDER_REPOS[provider] || GITHUB_REPO
    const sourcePath = sourceRepo === GITHUB_REPO
      ? `skills/${provider}/${skillName}`
      : `skills/${skillName}`

    const doc: FirestoreSkill = {
      id: skillId,
      name: skillName,
      displayName: frontmatter.name || toDisplayName(skillName),
      description: frontmatter.description || '',
      prompt,
      provider,
      category: frontmatter.category || 'other',
      tags: frontmatter.tags || [provider],
      allowedTools: frontmatter['allowed-tools']?.split(',').map(t => t.trim()) || [],
      model: frontmatter.model || null,
      requiredMcps: frontmatter.requires?.mcps || [],
      requiredCredentials: frontmatter.requires?.credentials || [],
      source: {
        type: 'github',
        repo: sourceRepo,
        path: sourcePath,
      },
      verified: provider === 'anthropic' || provider === 'huggingface',
      featured: false,
      usageCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    // Use merge to preserve usageCount and other stats
    await collection.doc(skillId.replace('/', '_')).set(removeUndefined(doc), { merge: true })

    const icon = getCategoryIcon(frontmatter.category)
    console.log(`  ✅ ${icon} ${doc.displayName} (${provider})`)
    count++
  }

  return count
}

// Get category icon
function getCategoryIcon(category?: string): string {
  const icons: Record<string, string> = {
    research: '🔍',
    writing: '✍️',
    data: '📊',
    code: '💻',
    marketing: '📣',
    productivity: '⚡',
    files: '📄',
    other: '🔧',
  }
  return icons[category || 'other'] || '🔧'
}

// Main
async function main() {
  console.log('🚀 Syncing Skill Library to Firebase\n')

  const db = initFirebase()
  const skillsDir = join(import.meta.dir, '.')

  let totalCount = 0

  for (const provider of PROVIDERS) {
    console.log(`\n📦 Syncing ${provider} skills...`)
    const count = await syncProviderSkills(db, skillsDir, provider)
    totalCount += count
  }

  console.log(`\n✨ Done! Synced ${totalCount} skills.`)
}

main().catch(console.error)
