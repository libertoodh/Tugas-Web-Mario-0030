import { assertTrustedOrigin, handleApiError, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/server/auth/session";
import { rejectBooking } from "@/server/services/bookings";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const { id } = await params;
    const body = (await readJson(request)) as { reason?: unknown };
    const booking = await rejectBooking(admin.id, id, body?.reason ?? "");
    return ok(booking);
  } catch (error) {
    return handleApiError(error);
  }
}
