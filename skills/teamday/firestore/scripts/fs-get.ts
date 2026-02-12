import { getDb } from "./fs-init";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: bun run fs-get.ts <document/path>");
    console.error("Example: bun run fs-get.ts users/user123");
    process.exit(1);
  }

  const db = getDb();
  const doc = await db.doc(path).get();

  if (!doc.exists) {
    console.error(`Document not found: ${path}`);
    process.exit(1);
  }

  console.log(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
