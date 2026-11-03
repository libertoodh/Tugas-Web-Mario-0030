/**
 * Pembatas percobaan login sederhana (in-memory).
 *
 * Cukup untuk satu instance MVP. Jika aplikasi dijalankan di beberapa
 * instance, ganti dengan penyimpanan bersama (Redis) agar tetap efektif.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

type Entry = { count: number; resetAt: number };

const attempts = new Map<string, Entry>();

export function loginRateLimitKey(email: string, ip: string): string {
  return `${email.toLowerCase()}|${ip}`;
}

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearLoginRateLimit(key: string): void {
  attempts.delete(key);
}

/** Untuk pengujian. */
export function resetAllLoginRateLimits(): void {
  attempts.clear();
}
