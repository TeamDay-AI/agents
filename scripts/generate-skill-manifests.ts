#!/usr/bin/env bun
/**
 * Generate skill-manifest.json for every skill package in teamday-agents.
 *
 * Walks skills/{provider}/{slug}/, computes sha256 of every file (excluding
 * meta paths), and writes skill-manifest.json at the skill root.
 *
 * Versioning: date-based (YYYY-MM-DD). If today's manifest would be identical
 * to the existing one, we keep the existing version — no-op. If files differ
 * and the manifest's version already matches today, we bump to `YYYY-MM-DD-2`,
 * `-3`, etc.
 *
 * Usage:
 *   bun scripts/generate-skill-manifests.ts                 # all skills
 *   bun scripts/generate-skill-manifests.ts teamday/generate-image
 */
import { createHash } from "crypto";
import { promises as fs } from "fs";
import { existsSync } from "fs";
import path from "path";

const SKILLS_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  "skills",
);

const SKIP = new Set([
  ".teamday",
  "__pycache__",
  ".git",
  "node_modules",
  ".DS_Store",
  "skill-manifest.json", // never checksum the manifest itself
]);

interface ManifestFile {
  path: string;
  checksum: string;
}

interface Manifest {
  slug: string;
  provider: string;
  version: string;
  changelog?: string;
  files: ManifestFile[];
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function walk(root: string, current: string, out: ManifestFile[]) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP.has(e.name) || e.name.endsWith(".pyc")) continue;
    const abs = path.join(current, e.name);
    if (e.isDirectory()) {
      await walk(root, abs, out);
    } else if (e.isFile()) {
      const content = await fs.readFile(abs);
      out.push({
        path: path.relative(root, abs),
        checksum: sha256(content),
      });
    }
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextSameDayVersion(existing: string): string {
  const today = todayISO();
  if (existing === today) return `${today}-2`;
  const m = existing.match(/^(\d{4}-\d{2}-\d{2})-(\d+)$/);
  if (m?.[1] === today) return `${today}-${Number(m[2]) + 1}`;
  return today;
}

function filesEqual(a: ManifestFile[], b: ManifestFile[]): boolean {
  if (a.length !== b.length) return false;
  const map = new Map(a.map((f) => [f.path, f.checksum]));
  return b.every((f) => map.get(f.path) === f.checksum);
}

async function processSkill(provider: string, slug: string): Promise<boolean> {
  const skillDir = path.join(SKILLS_ROOT, provider, slug);
  if (!existsSync(skillDir)) return false;
  const stat = await fs.stat(skillDir);
  if (!stat.isDirectory()) return false;

  const files: ManifestFile[] = [];
  await walk(skillDir, skillDir, files);
  files.sort((a, b) => a.path.localeCompare(b.path));

  const manifestPath = path.join(skillDir, "skill-manifest.json");
  let version = todayISO();
  let previous: Manifest | null = null;

  if (existsSync(manifestPath)) {
    try {
      previous = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
    } catch {
      previous = null;
    }
  }

  if (previous) {
    if (filesEqual(previous.files, files)) {
      // No change — keep existing version, do nothing
      return false;
    }
    // Changed — bump to today, or today-N if today was already taken
    version = nextSameDayVersion(previous.version);
  }

  const manifest: Manifest = {
    slug,
    provider,
    version,
    files,
  };
  if (previous?.changelog && previous.version === version) {
    manifest.changelog = previous.changelog;
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`✓ ${provider}/${slug} → ${version} (${files.length} files)`);
  return true;
}

async function main() {
  const argv = process.argv.slice(2);
  const targets: Array<{ provider: string; slug: string }> = [];

  if (argv.length > 0) {
    for (const arg of argv) {
      const [provider, slug] = arg.split("/");
      if (!provider || !slug) {
        console.error(`Invalid target: ${arg} (expected provider/slug)`);
        process.exit(1);
      }
      targets.push({ provider, slug });
    }
  } else {
    // Scan all providers/slugs
    const providers = await fs.readdir(SKILLS_ROOT, { withFileTypes: true });
    for (const provider of providers) {
      if (!provider.isDirectory()) continue;
      const slugs = await fs.readdir(path.join(SKILLS_ROOT, provider.name), {
        withFileTypes: true,
      });
      for (const slug of slugs) {
        if (slug.isDirectory()) targets.push({ provider: provider.name, slug: slug.name });
      }
    }
  }

  let changed = 0;
  for (const { provider, slug } of targets) {
    if (await processSkill(provider, slug)) changed++;
  }
  console.log(`\n${changed} manifest(s) updated (${targets.length} scanned).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
