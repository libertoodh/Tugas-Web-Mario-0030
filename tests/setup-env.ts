/**
 * Pengujian memakai database PostgreSQL terpisah (idb_test) yang dibuat oleh
 * `npm run db:local:init`. Database pengembangan tidak tersentuh.
 */
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:55432/idb_test?schema=public";
process.env.AUTH_SECRET =
  process.env.AUTH_SECRET ?? "test-secret-0123456789abcdef0123456789abcdef";
process.env.EMAIL_PROVIDER = "log";
process.env.SEED_DEMO_ACCOUNTS = "false";
