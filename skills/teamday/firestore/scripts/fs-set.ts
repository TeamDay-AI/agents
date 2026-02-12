import { getDb } from "./fs-init";

async function main() {
  const path = process.argv[2];
  const jsonData = process.argv[3];
  const merge = process.argv.includes("--merge");

  if (!path || !jsonData) {
    console.error(
      "Usage: bun run fs-set.ts <document/path> '<json>' [--merge]"
    );
    console.error("Examples:");
    console.error(
      '  bun run fs-set.ts users/user123 \'{"name":"John","email":"john@example.com"}\''
    );
    console.error(
      '  bun run fs-set.ts users/user123 \'{"status":"inactive"}\' --merge'
    );
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(jsonData);
  } catch {
    console.error("ERROR: Invalid JSON data");
    process.exit(1);
  }

  const db = getDb();

  if (merge) {
    await db.doc(path).set(data, { merge: true });
    console.log(`Document merged: ${path}`);
  } else {
    await db.doc(path).set(data);
    console.log(`Document set: ${path}`);
  }

  // Show the resulting document
  const doc = await db.doc(path).get();
  console.log(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
