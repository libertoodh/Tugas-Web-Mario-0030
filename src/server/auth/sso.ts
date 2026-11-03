/**
 * Titik integrasi SSO kampus (belum aktif pada MVP).
 *
 * MVP memakai autentikasi lokal (email + kata sandi, bcrypt, sesi JWT
 * httpOnly). Ketika kampus menyediakan SSO (OIDC/SAML/CAS), implementasikan
 * adapter di bawah lalu sambungkan pada route login.
 *
 * Yang perlu disiapkan agar SSO tidak memaksa penulisan ulang:
 *  - User.email harus sama dengan email kampus (sudah unik di database).
 *  - Peran (PEMOHON/ADMIN) tetap ditentukan dari database, bukan dari klaim
 *    SSO, sehingga pengguna tidak bisa menaikkan hak aksesnya sendiri.
 *  - Akun yang tidak aktif (isActive=false) tetap ditolak.
 */
import { emailConfig } from "@/lib/config";

export interface SsoProfile {
  email: string;
  name: string;
  /** Identitas unik dari penyedia SSO, untuk pemetaan lanjutan. */
  subject?: string;
}

export interface SsoProvider {
  readonly name: string;
  /** Mengembalikan URL otorisasi untuk memulai login. */
  getAuthorizationUrl(state: string): string;
  /** Menukar code menjadi profil pengguna. */
  exchangeCode(code: string, state: string): Promise<SsoProfile>;
}

export function ssoEnabled(): boolean {
  return process.env.SSO_ENABLED === "true";
}

/**
 * Mengembalikan provider SSO bila dikonfigurasi. Saat ini selalu null karena
 * belum ada adapter yang diimplementasikan; aplikasi TIDAK mengklaim SSO aktif.
 */
export function getSsoProvider(): SsoProvider | null {
  if (!ssoEnabled()) return null;
  console.warn(
    "[sso] SSO_ENABLED=true tetapi belum ada adapter SSO yang diimplementasikan. Login lokal tetap dipakai.",
  );
  return null;
}

export function ssoConfigSummary() {
  return {
    enabled: ssoEnabled(),
    provider: process.env.SSO_PROVIDER ?? "",
    issuer: process.env.SSO_ISSUER ?? "",
    clientIdConfigured: Boolean(process.env.SSO_CLIENT_ID),
    clientSecretConfigured: Boolean(process.env.SSO_CLIENT_SECRET),
    fromAddress: emailConfig.from,
  };
}
