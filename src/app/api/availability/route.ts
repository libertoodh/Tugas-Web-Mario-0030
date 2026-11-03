import { ApiError, handleApiError, ok } from "@/lib/api";
import { requireUser } from "@/server/auth/session";
import { getDayOverview, getRoomAvailability } from "@/server/services/availability";
import { isValidDateString, todayWita } from "@/lib/time";

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? todayWita();
    const roomId = url.searchParams.get("roomId");

    if (!isValidDateString(date)) {
      throw new ApiError(422, "VALIDATION_ERROR", "Format tanggal tidak valid.");
    }

    if (roomId) {
      const availability = await getRoomAvailability(roomId, date);
      return ok(availability);
    }

    const overview = await getDayOverview(date);
    return ok(overview);
  } catch (error) {
    return handleApiError(error);
  }
}
