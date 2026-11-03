/**
 * PostgreSQL lokal untuk pengembangan Neraca Salon.
 *
 * Memakai binary PostgreSQL dari paket @embedded-postgres/windows-x64.
 * Cluster disimpan di luar folder proyek agar tidak tersinkronisasi OneDrive.
 *
 *   npm run db:local:start   jalankan server (port 55433)
 *   npm run db:local:stop    hentikan server
 *
 * Untuk produksi gunakan PostgreSQL/Supabase dan isi DATABASE_URL +
 * APP_DATABASE_URL di .env.
 */
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.LOCAL_DB_PORT ?? 55433);
const DATA_DIR =
  process.env.LOCAL_DB_DIR ?? path.join(os.homedir(), ".salon-finance", "pgdata");
const LOG_FILE = path.join(path.dirname(DATA_DIR), "postgres.log");
const LOG_ERR_FILE = path.join(path.dirname(DATA_DIR), "postgres.err.log");
const DATABASES = ["salon_finance", "salon_finance_test"];
const BIN = path.join(
  process.cwd(),
  "node_modules",
  "@embedded-postgres",
  "windows-x64",
  "native",
  "bin",
);
const EXE = process.platform === "win32" ? ".exe" : "";

function run(exe: string, args: string[], options: { silent?: boolean } = {}) {
  const result = spawnSync(path.join(BIN, exe + EXE), args, {
    encoding: "utf8",
    stdio: options.silent ? "pipe" : "inherit",
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function isInitialised() {
  return fs.existsSync(path.join(DATA_DIR, "PG_VERSION"));
}

function isRunning() {
  const result = run("pg_ctl", ["-D", DATA_DIR, "status"], { silent: true });
  return result.stdout.includes("server is running");
}

function initialise() {
  if (isInitialised()) {
    console.log(`Cluster sudah ada di ${DATA_DIR}`);
    return;
  }
  fs.mkdirSync(path.dirname(DATA_DIR), { recursive: true });
  const pwfile = path.join(path.dirname(DATA_DIR), ".pgpass-init");
  fs.writeFileSync(pwfile, "postgres");
  console.log(`Membuat cluster PostgreSQL di ${DATA_DIR} ...`);
  const result = run("initdb", [
    "-D",
    DATA_DIR,
    "-U",
    "postgres",
    "--auth=scram-sha-256",
    "--pwfile",
    pwfile,
    "--encoding=UTF8",
    "--locale=C",
  ]);
  fs.rmSync(pwfile, { force: true });
  if (result.status !== 0) throw new Error("initdb gagal. Lihat pesan di atas.");
}

async function waitForPort(timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const reachable = await new Promise<boolean>((resolve) => {
      const socket = net.connect({ host: "127.0.0.1", port: PORT });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
      socket.setTimeout(1000, () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (reachable) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function start() {
  if (isRunning()) {
    console.log("Server PostgreSQL lokal sudah berjalan.");
    return;
  }
  console.log(`Menjalankan PostgreSQL di port ${PORT} ...`);
  if (process.platform === "win32") {
    const command = [
      `Start-Process -FilePath '${path.join(BIN, "postgres.exe")}'`,
      `-ArgumentList '-D','"${DATA_DIR}"','-p','${PORT}','-h','127.0.0.1'`,
      `-WindowStyle Hidden -RedirectStandardOutput '${LOG_FILE}' -RedirectStandardError '${LOG_ERR_FILE}'`,
    ].join(" ");
    const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
      stdio: "ignore",
    });
    if (result.status !== 0) {
      throw new Error("Gagal menjalankan PostgreSQL. Periksa log di folder data.");
    }
  } else {
    const child = spawn(
      path.join(BIN, "pg_ctl" + EXE),
      ["-D", DATA_DIR, "-l", LOG_FILE, "-o", `-p ${PORT} -h 127.0.0.1`, "start"],
      { detached: true, stdio: "ignore" },
    );
    child.unref();
  }

  const ready = await waitForPort();
  if (!ready) {
    throw new Error(
      `PostgreSQL tidak merespons di port ${PORT}. Periksa log: ${LOG_FILE}`,
    );
  }
  console.log("Server berjalan.");
}

function stop() {
  if (!isRunning()) {
    console.log("Server tidak sedang berjalan.");
    return;
  }
  run("pg_ctl", ["-D", DATA_DIR, "stop", "-m", "fast"]);
}

function ensureDatabases() {
  const script = `
    const { Client } = require("pg");
    const names = ${JSON.stringify(DATABASES)};
    (async () => {
      const admin = new Client({
        host: "127.0.0.1", port: ${PORT}, user: "postgres", password: "postgres",
        database: "postgres", connectionTimeoutMillis: 15000,
      });
      await admin.connect();
      for (const name of names) {
        const found = await admin.query("select 1 from pg_database where datname = $1", [name]);
        if (found.rowCount === 0) {
          await admin.query('create database "' + name + '"');
          console.log('Database "' + name + '" dibuat.');
        } else {
          console.log('Database "' + name + '" sudah ada.');
        }
      }
      await admin.end();
    })().catch((error) => { console.error(error.message); process.exit(1); });
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error("Gagal membuat database.");
}

const command = process.argv[2] ?? "start";

async function main() {
  switch (command) {
    case "start":
      initialise();
      await start();
      ensureDatabases();
      console.log(`\nPostgreSQL lokal aktif di port ${PORT}. Log: ${LOG_FILE}`);
      console.log(
        `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${PORT}/salon_finance"`,
      );
      break;
    case "stop":
      stop();
      break;
    default:
      console.error(`Perintah tidak dikenal: ${command}. Gunakan start | stop.`);
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
