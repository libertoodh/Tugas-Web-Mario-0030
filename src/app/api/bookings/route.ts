import { ApiError, assertTrustedOrigin, handleApiError, ok, readJson } from "@/lib/api";
import { requireUser } from "@/server/auth/session";
import {
  createBooking,
  listAllBookings,
  listMyBookings,
} from "@/server/services/bookings";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const scope = url.searchParams.get("scope");

    if (scope === "all") {
      if (user.role !== "ADMIN") {
        throw new ApiError(403, "FORBIDDEN", "Akses ditolak.");
      }
      const data = await listAllBookings(query);
      return ok(data);
    }

    const data = await listMyBookings(user.id, query);
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const body = await readJson(request);
    const booking = await createBooking(user, body);
    return ok(booking, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
