import { assertTrustedOrigin, handleApiError, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/server/auth/session";
import { createScheduleBlock } from "@/server/services/rooms";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const body = await readJson(request);
    const block = await createScheduleBlock(admin.id, body);
    return ok(block, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
