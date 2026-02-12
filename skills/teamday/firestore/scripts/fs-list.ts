import { getDb } from "./fs-init";

async function main() {
  const db = getDb();
  const collections = await db.listCollections();

  if (collections.length === 0) {
    console.log("No collections found.");
    return;
  }

  console.log("Collections:");
  for (const col of collections) {
    const snapshot = await col.limit(1).count().get();
    console.log(`  ${col.id} (~${snapshot.data().count} documents)`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
