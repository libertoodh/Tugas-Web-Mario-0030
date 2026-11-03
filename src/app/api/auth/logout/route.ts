import { assertTrustedOrigin, handleApiError, ok } from "@/lib/api";
import { destroySession, getSessionUser } from "@/server/auth/session";
import { recordAudit } from "@/server/services/audit";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const user = await getSessionUser();
    await destroySession();
    if (user) {
      await recordAudit({
        actorId: user.id,
        action: "LOGOUT",
        entity: "User",
        entityId: user.id,
      });
    }
    return ok({ loggedOut: true });
  } catch (error) {
    return handleApiError(error);
  }
}
