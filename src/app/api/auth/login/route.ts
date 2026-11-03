import { assertTrustedOrigin, fail, handleApiError, ok, readJson } from "@/lib/api";
import { fieldErrors, loginSchema } from "@/lib/validation";
import { authenticate } from "@/server/auth/authenticate";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  loginRateLimitKey,
} from "@/server/auth/rate-limit";
import { createSession } from "@/server/auth/session";
import { recordAudit } from "@/server/services/audit";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const body = await readJson(request);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        422,
        "VALIDATION_ERROR",
        "Periksa kembali email dan kata sandi.",
        fieldErrors(parsed.error),
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const key = loginRateLimitKey(parsed.data.email, ip);
    const limit = checkLoginRateLimit(key);
    if (!limit.allowed) {
      return fail(
        429,
        "RATE_LIMITED",
        `Terlalu banyak percobaan masuk. Coba lagi dalam ${Math.ceil(limit.retryAfterSeconds / 60)} menit.`,
        { retryAfterSeconds: limit.retryAfterSeconds },
      );
    }

    const user = await authenticate(parsed.data.email, parsed.data.password);
    if (!user) {
      await recordAudit({
        action: "LOGIN_FAILED",
        entity: "User",
        metadata: { email: parsed.data.email },
      });
      return fail(401, "UNAUTHORIZED", "Email atau kata sandi salah.");
    }

    clearLoginRateLimit(key);
    await createSession(user);
    await recordAudit({
      actorId: user.id,
      action: "LOGIN_SUCCESS",
      entity: "User",
      entityId: user.id,
    });

    return ok({
      user: { id: user.id, name: user.name, role: user.role },
      redirectTo: user.role === "ADMIN" ? "/admin" : "/dashboard",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
