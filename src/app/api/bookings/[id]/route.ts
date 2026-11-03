import { handleApiError, ok } from "@/lib/api";
import { requireUser } from "@/server/auth/session";
import { getBookingForViewer } from "@/server/services/bookings";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const booking = await getBookingForViewer(user, id);
    return ok(booking);
  } catch (error) {
    return handleApiError(error);
  }
}
