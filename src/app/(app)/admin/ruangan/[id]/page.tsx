import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getRoomById, getRoomHistory, getRoomUpcomingBookings } from "@/server/services/rooms";
import { formatWita } from "@/lib/time";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { RoomForm } from "../room-form";
import { RoomActiveToggle } from "../room-active-toggle";

export const dynamic = "force-dynamic";

export default async function EditRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const room = await getRoomById(id);
  if (!room) notFound();

  const [upcoming, history] = await Promise.all([
    getRoomUpcomingBookings(room.id, 10),
    getRoomHistory(room.id, 15),
  ]);

  return (
    <div className="space-y-5">
      <Link
        href="/admin/ruangan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke manajemen ruangan
      </Link>

      <PageHeader
        title={`Edit ${room.name}`}
        description={`${room.building}${room.floor > 0 ? `, lantai ${room.floor}` : ""}`}
        actions={
          <RoomActiveToggle roomId={room.id} roomName={room.name} isActive={room.isActive} />
        }
      />

      <RoomForm room={room} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Jadwal mendatang" description="Pengajuan aktif pada ruangan ini" />
          {upcoming.length === 0 ? (
            <EmptyState title="Tidak ada jadwal aktif" />
          ) : (
            <ul className="divide-y divide-stone-100">
              {upcoming.map((booking) => (
                <li key={booking.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {formatWita(booking.startAt, "d MMM yyyy, HH:mm")}–{formatWita(booking.endAt, "HH:mm")}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {booking.activityName} • {booking.user.name}
                    </p>
                  </div>
                  <BookingStatusBadge status={booking.status} short />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Riwayat terakhir" description="Termasuk pengajuan yang ditolak/dibatalkan" />
          {history.length === 0 ? (
            <EmptyState title="Belum ada riwayat" />
          ) : (
            <ul className="divide-y divide-stone-100">
              {history.map((booking) => (
                <li key={booking.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink-900">
                      {formatWita(booking.startAt, "d MMM yyyy")} • {booking.bookingCode}
                    </p>
                    <p className="truncate text-xs text-ink-500">{booking.activityName}</p>
                  </div>
                  <BookingStatusBadge status={booking.status} short />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="flex items-center gap-2 text-xs text-ink-500">
        <Badge className="bg-sand-100 text-ink-600 ring-stone-200">Catatan</Badge>
        Ruangan dengan riwayat peminjaman tidak dihapus permanen; gunakan tombol
        nonaktifkan agar integritas data tetap terjaga.
      </p>
    </div>
  );
}
