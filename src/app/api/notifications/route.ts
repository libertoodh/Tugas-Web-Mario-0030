import { assertTrustedOrigin, handleApiError, ok, readJson } from "@/lib/api";
import { requireUser } from "@/server/auth/session";
import {
  listNotifications,
  markNotificationsRead,
  unreadNotificationCount,
} from "@/server/services/notifications";

export async function GET() {
  try {
    const user = await requireUser();
    const [items, unread] = await Promise.all([
      listNotifications(user.id, 20),
      unreadNotificationCount(user.id),
    ]);
    return ok({ items, unread });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const body = (await readJson(request)) as { ids?: unknown };
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter((id): id is string => typeof id === "string")
      : undefined;
    await markNotificationsRead(user.id, ids);
    return ok({ updated: true });
  } catch (error) {
    return handleApiError(error);
  }
}
