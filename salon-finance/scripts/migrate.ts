import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL belum diisi di .env");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const dir = path.resolve("migrations");
const files = fs
  .readdirSync(dir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of files) {
  const applied = await client.query(
    "SELECT 1 FROM schema_migrations WHERE filename = $1",
    [file],
  );
  if (applied.rowCount) {
    console.log(`✓ ${file} (sudah diterapkan)`);
    continue;
  }

  const sql = fs.readFileSync(path.join(dir, file), "utf8");
  console.log(`→ menerapkan ${file} ...`);
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log(`✓ ${file}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`✗ ${file} gagal:`);
    console.error(error instanceof Error ? error.message : error);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("\nMigrasi selesai.");
