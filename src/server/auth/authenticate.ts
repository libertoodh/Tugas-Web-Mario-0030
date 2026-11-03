import { prisma } from "@/lib/prisma";
import { verifyPassword } from "./password";
import { SessionUser } from "./session";

// Hash dummy untuk menyamakan waktu proses saat email tidak ditemukan
// (mengurangi user enumeration lewat timing).
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.7RiIs0Z3z2i6xS9oX0L1J0jWlq1h3Hu";

export type AuthenticatedUser = SessionUser;

/**
 * Autentikasi lokal MVP.
 *
 * Titik integrasi SSO: setelah profil dari SSO kampus diverifikasi, panggil
 * fungsi yang memuat/menyinkronkan user dari database (bukan membuat sesi dari
 * klaim peran di token SSO).
 */
export async function authenticate(
  email: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || !user.isActive) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
