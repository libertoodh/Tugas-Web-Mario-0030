import Link from "next/link";
import { ClipboardList, Search } from "lucide-react";
import { listAllBookings } from "@/server/services/bookings";
import { listRooms } from "@/server/services/rooms";
import { bookingStatusMeta, BOOKING_STATUSES } from "@/lib/status";
import { formatWita } from "@/lib/time";
import {
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  buttonClass,
} from "@/components/ui";
import { BookingStatusBadge } from "@/components/booking-status-badge";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; roomId?: string; date?: string }>;
}) {
  const params = await searchParams;
  const status = params.status && BOOKING_STATUSES.includes(params.status as never)
    ? params.status
    : "ALL";

  const [bookings, rooms] = await Promise.all([
    listAllBookings({
      status,
      q: params.q ?? "",
      roomId: params.roomId ?? "",
      date: params.date ?? "",
    }),
    listRooms({ includeInactive: true }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manajemen Pengajuan"
        description="Seluruh pengajuan peminjaman ruangan. Keputusan hanya dapat dilakukan admin."
        actions={
          <Link href="/admin/jadwal" className={buttonClass("outline", "md")}>
            Lihat jadwal ruangan
          </Link>
        }
      />

      <Card className="p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5 lg:col-span-2">
            <label htmlFor="q" className="block text-sm font-medium text-ink-800">
              Cari
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                aria-hidden
              />
              <Input
                id="q"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Kode, kegiatan, pemohon, atau ruangan"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="status" className="block text-sm font-medium text-ink-800">
              Status
            </label>
            <Select id="status" name="status" defaultValue={status}>
              <option value="ALL">Semua status</option>
              {BOOKING_STATUSES.map((key) => (
                <option key={key} value={key}>
                  {bookingStatusMeta[key].label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="roomId" className="block text-sm font-medium text-ink-800">
              Ruangan
            </label>
            <Select id="roomId" name="roomId" defaultValue={params.roomId ?? ""}>
              <option value="">Semua ruangan</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="date" className="block text-sm font-medium text-ink-800">
              Tanggal
            </label>
            <Input id="date" name="date" type="date" defaultValue={params.date ?? ""} />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
            <Button type="submit" variant="secondary">
              Terapkan filter
            </Button>
            <Link href="/admin/pengajuan" className={buttonClass("ghost", "md")}>
              Reset
            </Link>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {bookings.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" aria-hidden />}
            title="Tidak ada pengajuan"
            description="Belum ada pengajuan yang cocok dengan filter yang dipilih."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[56rem]">
              <caption className="sr-only">Daftar seluruh pengajuan peminjaman</caption>
              <thead>
                <tr>
                  <th scope="col">Kode</th>
                  <th scope="col">Pemohon</th>
                  <th scope="col">Ruangan</th>
                  <th scope="col">Waktu</th>
                  <th scope="col">Diajukan</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="font-mono text-xs">{booking.bookingCode}</td>
                    <td>
                      <p className="font-medium text-ink-900">{booking.user.name}</p>
                      <p className="text-xs text-ink-500">{booking.user.email}</p>
                    </td>
                    <td>
                      <p>{booking.room.name}</p>
                      <p className="text-xs text-ink-500">
                        {booking.room.building}
                        {booking.room.floor > 0 ? ` • L${booking.room.floor}` : ""}
                      </p>
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      {formatWita(booking.startAt, "d MMM yyyy")}
                      <p className="text-ink-500">
                        {formatWita(booking.startAt, "HH:mm")}–{formatWita(booking.endAt, "HH:mm")} WITA
                      </p>
                    </td>
                    <td className="whitespace-nowrap text-xs text-ink-500">
                      {formatWita(booking.createdAt, "d MMM yyyy")}
                    </td>
                    <td>
                      <BookingStatusBadge status={booking.status} short />
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/admin/pengajuan/${booking.id}`}
                        className="text-sm font-medium text-brand-700 hover:underline"
                      >
                        {booking.status === "PENDING" ? "Tinjau" : "Detail"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-ink-500">Menampilkan {bookings.length} pengajuan (maksimal 200 terbaru).</p>
    </div>
  );
}
