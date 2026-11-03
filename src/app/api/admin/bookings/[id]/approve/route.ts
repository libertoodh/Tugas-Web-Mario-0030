import { assertTrustedOrigin, handleApiError, ok } from "@/lib/api";
import { requireAdmin } from "@/server/auth/session";
import { approveBooking } from "@/server/services/bookings";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const { id } = await params;
    const booking = await approveBooking(admin.id, id);
    return ok(booking);
  } catch (error) {
    return handleApiError(error);
  }
}
