import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { sessionConfig } from "@/lib/config";
import {
  SessionPayload,
  SessionRole,
  signSessionToken,
  verifySessionToken,
} from "@/lib/session-token";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: SessionRole;
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await signSessionToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
  const store = await cookies();
  // Cookie hanya dikirim lewat HTTPS. Saat pengembangan lokal dengan
  // `npm start` (NODE_ENV=production) cookie tetap berfungsi pada http://localhost,
  // sedangkan deployment wajib memakai APP_URL https://.
  const secure = (process.env.APP_URL ?? "").startsWith("https://");
  store.set(sessionConfig.cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: sessionConfig.ttlHours * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(sessionConfig.cookieName);
}

/**
 * Membaca sesi dari cookie lalu memverifikasi ulang pengguna ke database.
 * Perubahan peran atau penonaktifan akun langsung berlaku tanpa menunggu
 * token kedaluwarsa.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(sessionConfig.cookieName)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Halaman ini hanya untuk admin sarana prasarana.");
  }
  return user;
}

export function isAdmin(user: Pick<SessionUser, "role">): boolean {
  return user.role === "ADMIN";
}

export type { SessionPayload };
