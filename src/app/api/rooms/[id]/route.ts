import { assertTrustedOrigin, handleApiError, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/server/auth/session";
import {
  getRoomDetail,
  setRoomActive,
  updateRoom,
} from "@/server/services/rooms";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const room = await getRoomDetail(id);
    return ok(room);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await readJson(request);
    const room = await updateRoom(admin.id, id, body);
    return ok(room);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Ruangan tidak dihapus permanen. DELETE berarti menonaktifkan ruangan agar
 * riwayat peminjaman tetap konsisten.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const { id } = await params;
    const room = await setRoomActive(admin.id, id, false);
    return ok(room);
  } catch (error) {
    return handleApiError(error);
  }
}
