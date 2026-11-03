import { assertTrustedOrigin, handleApiError, ok, readJson } from "@/lib/api";
import { getSessionUser, requireAdmin } from "@/server/auth/session";
import { createRoom, listRooms } from "@/server/services/rooms";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? undefined;
    const includeInactive =
      user?.role === "ADMIN" && url.searchParams.get("includeInactive") === "1";
    const rooms = await listRooms({ includeInactive, q });
    return ok(rooms);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const body = await readJson(request);
    const room = await createRoom(admin.id, body);
    return ok(room, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
