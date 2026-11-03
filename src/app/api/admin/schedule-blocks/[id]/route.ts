import { assertTrustedOrigin, handleApiError, ok } from "@/lib/api";
import { requireAdmin } from "@/server/auth/session";
import { deleteScheduleBlock } from "@/server/services/rooms";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const { id } = await params;
    await deleteScheduleBlock(admin.id, id);
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
