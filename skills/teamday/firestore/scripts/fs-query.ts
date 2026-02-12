import { getDb } from "./fs-init";

type WhereFilterOp =
  | "<"
  | "<="
  | "=="
  | "!="
  | ">="
  | ">"
  | "array-contains"
  | "in"
  | "array-contains-any"
  | "not-in";

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  let limit = 50;
  if (limitIdx !== -1) {
    limit = parseInt(args[limitIdx + 1]) || 50;
    args.splice(limitIdx, 2);
  }

  const [collection, field, opOrValue, value] = args;

  if (!collection) {
    console.error(
      "Usage: bun run fs-query.ts <collection> [field] [operator] [value] [--limit N]"
    );
    console.error("Examples:");
    console.error("  bun run fs-query.ts users");
    console.error("  bun run fs-query.ts users status active");
    console.error('  bun run fs-query.ts users status == active');
    console.error('  bun run fs-query.ts orders amount ">" 100');
    process.exit(1);
  }

  const db = getDb();
  let query: FirebaseFirestore.Query = db.collection(collection);

  if (field) {
    let operator: WhereFilterOp = "==";
    let filterValue: string;

    if (value !== undefined) {
      operator = opOrValue as WhereFilterOp;
      filterValue = value;
    } else if (opOrValue !== undefined) {
      filterValue = opOrValue;
    } else {
      console.error("Provide both field and value for filtering");
      process.exit(1);
    }

    // Parse as number or boolean if applicable
    let parsed: any = filterValue!;
    if (parsed === "true") parsed = true;
    else if (parsed === "false") parsed = false;
    else if (!isNaN(Number(parsed)) && parsed !== "") parsed = Number(parsed);

    query = query.where(field, operator, parsed);
  }

  const snapshot = await query.limit(limit).get();

  if (snapshot.empty) {
    console.log("No documents found.");
    return;
  }

  const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  console.log(JSON.stringify(docs, null, 2));
  console.log(`\n${docs.length} document(s) returned.`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
