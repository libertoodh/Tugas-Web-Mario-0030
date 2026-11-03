/**
 * Konfigurasi aplikasi & aturan bisnis.
 *
 * Nilai batas pengajuan di bawah ini adalah DRAF pengembangan (belum
 * kebijakan resmi kampus) dan dapat diubah melalui environment variables.
 */

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

export const APP_NAME = "Sistem Peminjaman Ruangan";
export const CAMPUS_NAME = "Institut Desain dan Bisnis Bali (IDB Bali)";
export const TIMEZONE = "Asia/Makassar";
export const TIMEZONE_LABEL = "WITA";

export const bookingRules = {
  /** Minimal H-2 (hari kalender) sebelum tanggal peminjaman. */
  minLeadDays: intFromEnv("BOOKING_MIN_LEAD_DAYS", 2),
  /** Maksimal pengajuan sekian hari ke depan. */
  maxAdvanceDays: intFromEnv("BOOKING_MAX_ADVANCE_DAYS", 30),
  /** Durasi maksimum satu peminjaman (jam). */
  maxDurationHours: intFromEnv("BOOKING_MAX_DURATION_HOURS", 8),
  /** Jam operasional (WITA). */
  openHour: intFromEnv("BOOKING_OPEN_HOUR", 7),
  closeHour: intFromEnv("BOOKING_CLOSE_HOUR", 22),
} as const;

export const sessionConfig = {
  cookieName: "idb_session",
  ttlHours: intFromEnv("SESSION_TTL_HOURS", 8),
} as const;

export const emailConfig = {
  provider: (process.env.EMAIL_PROVIDER ?? "log").toLowerCase(),
  from: process.env.EMAIL_FROM ?? "Sistem Peminjaman Ruangan IDB Bali <no-reply@idb.ac.id>",
  adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL ?? "",
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: intFromEnv("SMTP_PORT", 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
  },
} as const;

export function assertServerSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET belum diatur atau kurang dari 32 karakter. Salin .env.example menjadi .env.",
    );
  }
  return secret;
}

export const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
