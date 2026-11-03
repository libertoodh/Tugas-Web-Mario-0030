import { execSync } from "node:child_process";
import { Client } from "pg";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:55432/idb_test?schema=public";

async function canConnect(): Promise<boolean> {
  const client = new Client({
    connectionString: TEST_DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

export default async function globalSetup() {
  if (!(await canConnect())) {
    console.log("[test] PostgreSQL lokal belum aktif, mencoba menjalankan...");
    execSync("npx tsx scripts/local-db.ts start", {
      stdio: "inherit",
      timeout: 120_000,
      env: process.env,
    });
  }

  if (!(await canConnect())) {
    throw new Error(
      "Database pengujian tidak dapat dihubungi. Jalankan `npm run db:local:init` lalu `npm run db:local:start`, atau set TEST_DATABASE_URL.",
    );
  }

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
