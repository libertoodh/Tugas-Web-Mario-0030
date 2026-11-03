import { handleApiError, ok } from "@/lib/api";
import { requireAdmin } from "@/server/auth/session";
import { listAllBookings } from "@/server/services/bookings";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const data = await listAllBookings(query);
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}
