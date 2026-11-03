/**
 * Pemeriksaan end-to-end dengan browser sungguhan (Playwright/Chrome).
 *
 * Menjalankan alur utama: login pemohon ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ ajukan peminjaman ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ admin menyetujui
 * ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ pemohon melihat status ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ membatalkan ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ ruangan kembali tersedia.
 * Juga mengambil tangkapan layar desktop dan ponsel.
 *
 * Prasyarat:
 *   - server berjalan (npm run dev atau npm start) di APP_URL
 *   - seed demo aktif (SEED_DEMO_ACCOUNTS=true)
 *
 * Jalankan: npm run test:e2e
 */
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const require = createRequire(import.meta.url);
const playwrightCore = path.join(
  process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"),
  "nodejs",
  "node_modules",
  "@playwright",
  "mcp",
  "node_modules",
  "playwright-core",
);
const { chromium } = require(playwrightCore);

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = path.join(process.cwd(), "docs", "screenshots");
fs.mkdirSync(OUT, { recursive: true });

const pemohon = {
  email: process.env.DEMO_PEMOHON_EMAIL ?? "mariodharma@gmail.com",
  password: process.env.DEMO_PEMOHON_PASSWORD ?? "mariodharma",
};
const admin = {
  email: process.env.DEMO_ADMIN_EMAIL ?? "admin@demo.idb.ac.id",
  password: process.env.DEMO_ADMIN_PASSWORD ?? "Admin123!",
};

function isoDate(offsetDays) {
  const now = new Date();
  const wita = new Date(now.getTime() + 8 * 3600 * 1000);
  const base = new Date(Date.UTC(wita.getUTCFullYear(), wita.getUTCMonth(), wita.getUTCDate()));
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

async function login(page, credentials) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill(credentials.email);
  await page.locator("#password").fill(credentials.password);
  await page.getByRole("button", { name: /^Masuk/ }).click();
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 20000 });
}

const results = [];
function check(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? "PASS" : "FAIL"} - ${name}${detail ? ` :: ${detail}` : ""}`);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "id-ID" });
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "id-ID" });
const page = await desktop.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  // ------------------------------------------------------------------ pemohon
  await login(page, pemohon);
  check("Login pemohon berhasil", page.url().includes("/dashboard"), page.url());
  await page.screenshot({ path: path.join(OUT, "01-dashboard-pemohon.png"), fullPage: true });

  await page.goto(`${BASE}/ruangan`, { waitUntil: "networkidle" });
  const roomCards = await page.locator("h3").count();
  check("Katalog ruangan menampilkan data", roomCards > 0, `${roomCards} kartu ruangan`);
  await page.screenshot({ path: path.join(OUT, "02-katalog-ruangan.png"), fullPage: true });

  const roomId = await page
    .locator('a[href^="/ruangan/"]')
    .first()
    .getAttribute("href")
    .then((href) => href?.split("/").pop());
  await page.goto(`${BASE}/ruangan/${roomId}`, { waitUntil: "networkidle" });
  check("Halaman detail ruangan terbuka", await page.getByText("Ketersediaan harian").isVisible());
  await page.screenshot({ path: path.join(OUT, "03-detail-ruangan.png"), fullPage: true });

  await page.goto(`${BASE}/kalender`, { waitUntil: "networkidle" });
  check("Kalender ketersediaan tampil", await page.getByText("Jadwal seluruh ruangan").isVisible());
  await page.screenshot({ path: path.join(OUT, "04-kalender.png"), fullPage: true });

  // ------------------------------------------------------- buat pengajuan baru
  const date = isoDate(3);
  let bookingId = null;
  outer: for (let attempt = 1; attempt <= 10; attempt += 1) {
    await page.goto(`${BASE}/pengajuan/baru`, { waitUntil: "networkidle" });
    await page.locator("#roomId").selectOption({ index: attempt });
    await page.locator("#date").fill(date);
    const startHour = 17 + (attempt % 4);
    await page.locator("#startTime").fill(`${startHour}:00`);
    await page.locator("#endTime").fill(`${startHour + 1}:00`);
    await page.locator("#activityName").fill("Uji Otomatis Peminjaman");
    await page.locator("#participantCount").fill("12");
    await page.locator("#purpose").fill("Pemeriksaan end-to-end alur pengajuan peminjaman ruangan.");
    await page.getByRole("button", { name: "Lanjutkan pengajuan" }).click();
    await page.getByRole("button", { name: "Kirim pengajuan" }).click();
    try {
      await page.waitForURL(/\/riwayat\/[a-z0-9]+/, { timeout: 25000 });
      bookingId = page.url().split("/").pop();
      break outer;
    } catch {
      const alert = await page.locator('[role="alert"]').first().innerText().catch(() => "");
      console.log(`  percobaan ruangan #${attempt} gagal: ${alert.replace(/\s+/g, " ").slice(0, 140)}`);
    }
  }
  if (!bookingId) throw new Error("Tidak dapat membuat pengajuan uji pada ruangan mana pun.");
  const pendingVisible = await page.getByText("Menunggu Persetujuan").first().isVisible();
  check("Pengajuan tersimpan dengan status Menunggu Persetujuan", pendingVisible, bookingId);
  const codeText = await page.locator("h1").innerText();
  const bookingCode = codeText.replace("Pengajuan ", "").trim();
  await page.screenshot({ path: path.join(OUT, "05-detail-pengajuan.png"), fullPage: true });

  // -------------------------------------------------------------------- admin
  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "id-ID",
  });
  const adminPage = await adminContext.newPage();
  adminPage.on("pageerror", (error) => pageErrors.push(error.message));
  await login(adminPage, admin);
  check("Login admin diarahkan ke dashboard admin", adminPage.url().includes("/admin"), adminPage.url());
  await adminPage.screenshot({ path: path.join(OUT, "06-dashboard-admin.png"), fullPage: true });

  await adminPage.goto(`${BASE}/admin/pengajuan/${bookingId}`, { waitUntil: "networkidle" });
  check("Admin dapat membuka detail pengajuan", await adminPage.getByText("Informasi pemohon").isVisible());
  await adminPage.getByRole("button", { name: "Setujui pengajuan" }).click();
  await adminPage.getByRole("button", { name: "Ya, setujui" }).click();
  await adminPage.getByText("Pengajuan disetujui", { exact: false }).first().waitFor({ timeout: 40000 });
  await adminPage.reload({ waitUntil: "networkidle" });
  const approved = await adminPage.getByText("Disetujui").first().isVisible();
  check("Admin menyetujui pengajuan", approved, bookingCode);
  await adminPage.screenshot({ path: path.join(OUT, "07-admin-persetujuan.png"), fullPage: true });

  // --------------------------------------------------- status di sisi pemohon
  await page.reload({ waitUntil: "networkidle" });
  check("Status disetujui tampil pada halaman pemohon", await page.getByText("Disetujui").first().isVisible());

  await page.goto(`${BASE}/kalender?date=${date}`, { waitUntil: "networkidle" });
  const occupied = await page.getByText("Terisi").first().isVisible();
  check("Kalender menandai slot sebagai terisi", occupied);

  // --------------------------------------------------------------- pembatalan
  await page.goto(`${BASE}/riwayat/${bookingId}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Batalkan pengajuan" }).click();
  await page.getByRole("button", { name: "Ya, batalkan" }).click();
  await page.getByText("Pengajuan dibatalkan", { exact: false }).first().waitFor({ timeout: 40000 });
  await page.reload({ waitUntil: "networkidle" });
  check("Pemohon dapat membatalkan pengajuan", await page.getByText("Dibatalkan").first().isVisible());
  await page.screenshot({ path: path.join(OUT, "08-setelah-pembatalan.png"), fullPage: true });

  await page.goto(`${BASE}/ruangan/${roomId}?date=${date}`, { waitUntil: "networkidle" });
  const availableAgain = await page.getByText("Tersedia").first().isVisible();
  check("Ruangan kembali tersedia setelah pembatalan", availableAgain);

  // -------------------------------------------------------------------- ponsel
  const mobilePage = await mobile.newPage();
  await login(mobilePage, pemohon);
  await mobilePage.screenshot({ path: path.join(OUT, "09-dashboard-ponsel.png"), fullPage: true });
  await mobilePage.goto(`${BASE}/kalender`, { waitUntil: "networkidle" });
  await mobilePage.screenshot({ path: path.join(OUT, "10-kalender-ponsel.png"), fullPage: true });
  const mobileNav = await mobilePage.getByRole("navigation", { name: "Navigasi bawah" }).isVisible();
  check("Navigasi bawah tampil pada layar ponsel", mobileNav);
  const horizontalOverflow = await mobilePage.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  check("Tidak ada overflow horizontal pada ponsel", !horizontalOverflow);

  // ------------------------------------------------------------------ riwayat
  await page.goto(`${BASE}/riwayat`, { waitUntil: "networkidle" });
  check("Riwayat memuat daftar pengajuan", await page.getByText("Uji Otomatis Peminjaman").first().isVisible());
  await page.screenshot({ path: path.join(OUT, "11-riwayat.png"), fullPage: true });

  check("Tidak ada error JavaScript di halaman", pageErrors.length === 0, pageErrors.join(" | "));
} catch (error) {
  console.error("E2E gagal:", error);
  results.push({ name: "Eksekusi E2E", ok: false, detail: String(error) });
} finally {
  await browser.close();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} pemeriksaan lulus.`);
if (failed.length > 0) {
  console.error("Gagal:", failed.map((item) => item.name).join(", "));
  process.exit(1);
}
