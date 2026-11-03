import { assertTrustedOrigin, handleApiError, ok } from "@/lib/api";
import { requireUser } from "@/server/auth/session";
import { cancelBooking } from "@/server/services/bookings";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    const booking = await cancelBooking(user, id);
    return ok(booking);
  } catch (error) {
    return handleApiError(error);
  }
}
