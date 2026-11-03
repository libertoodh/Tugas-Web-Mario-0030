import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { fieldErrors } from "./validation";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RULE_VIOLATION"
  | "RATE_LIMITED"
  | "INTERNAL";

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
) {
  return NextResponse.json({ ok: false, error: { code, message, details } }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return fail(error.status, error.code, error.message, error.details);
  }
  if (error instanceof ZodError) {
    return fail(422, "VALIDATION_ERROR", "Data yang dikirim belum valid.", fieldErrors(error));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // 23P01 = exclusion constraint (anti double-booking) dilanggar.
    if (error.code === "P2004" || error.message.includes("23P01")) {
      return fail(
        409,
        "CONFLICT",
        "Jadwal ruangan baru saja terisi. Silakan pilih waktu atau ruangan lain.",
      );
    }
    if (error.code === "P2002") {
      return fail(409, "CONFLICT", "Data serupa sudah ada.");
    }
    if (error.code === "P2025") {
      return fail(404, "NOT_FOUND", "Data tidak ditemukan.");
    }
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return fail(400, "VALIDATION_ERROR", "Permintaan tidak valid.");
  }
  // Jangan membocorkan detail internal ke klien.
  console.error("[api] unexpected error:", error instanceof Error ? error.message : error);
  return fail(500, "INTERNAL", "Terjadi kesalahan pada server. Silakan coba lagi.");
}

/**
 * Perlindungan tambahan terhadap CSRF: permintaan yang mengubah data harus
 * berasal dari origin aplikasi sendiri (cookie sesi memakai SameSite=Lax).
 */
export function assertTrustedOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // Same-origin fetch dari server / klien non-browser.
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "FORBIDDEN", "Origin permintaan tidak valid.");
  }
  const requestHost = request.headers.get("host");
  const allowed = new Set<string>();
  if (requestHost) allowed.add(requestHost);
  if (configured) {
    try {
      allowed.add(new URL(configured).host);
    } catch {
      /* abaikan konfigurasi tidak valid */
    }
  }
  if (!allowed.has(originHost)) {
    throw new ApiError(403, "FORBIDDEN", "Permintaan ditolak: origin tidak dikenal.");
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Body permintaan harus berupa JSON.");
  }
}
