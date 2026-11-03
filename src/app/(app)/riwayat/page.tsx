import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, Plus, Search } from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { listMyBookings } from "@/server/services/bookings";
import { bookingStatusMeta, BOOKING_STATUSES } from "@/lib/status";
import { formatWita } from "@/lib/time";
import {
  Badge,
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

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const status = params.status && BOOKING_STATUSES.includes(params.status as never)
    ? params.status
    : "ALL";
  const q = params.q?.trim() ?? "";

  const bookings = await listMyBookings(user.id, { status, q });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Riwayat Peminjaman"
        actions={
          <Link href="/pengajuan/baru" className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" aria-hidden />
            Ajukan peminjaman
          </Link>
        }
      />

      <Card className="p-4">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
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
                defaultValue={q}
                placeholder="Kode pengajuan, kegiatan, atau ruangan"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5 sm:w-56">
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
          <div className="flex gap-2">
            <Button type="submit" variant="secondary">
              Terapkan
            </Button>
            <Link href="/riwayat" className={buttonClass("ghost", "md")}>
              Reset
            </Link>
          </div>
        </form>
      </Card>

      {bookings.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" aria-hidden />}
            title="Belum ada pengajuan"
            description={
              q || status !== "ALL"
                ? "Tidak ada pengajuan yang cocok dengan filter. Coba ubah kata kunci atau status."
                : "Pengajuan peminjaman ruangan Anda akan muncul di halaman ini."
            }
            action={
              <Link href="/pengajuan/baru" className={buttonClass("primary", "sm")}>
                Ajukan sekarang
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <table className="table-base">
              <caption className="sr-only">Daftar pengajuan peminjaman Anda</caption>
              <thead>
                <tr>
                  <th scope="col">Kode</th>
                  <th scope="col">Ruangan</th>
                  <th scope="col">Tanggal & waktu</th>
                  <th scope="col">Kegiatan</th>
                  <th scope="col">Diajukan</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="font-mono text-xs text-ink-600">{booking.bookingCode}</td>
                    <td>
                      <p className="font-medium text-ink-900">{booking.room.name}</p>
                      <p className="text-xs text-ink-500">
                        {booking.room.building}
                        {booking.room.floor > 0 ? ` • L${booking.room.floor}` : ""}
                      </p>
                    </td>
                    <td className="whitespace-nowrap">
                      {formatWita(booking.startAt, "d MMM yyyy")}
                      <p className="text-xs text-ink-500">
                        {formatWita(booking.startAt, "HH:mm")}–{formatWita(booking.endAt, "HH:mm")} WITA
                      </p>
                    </td>
                    <td className="max-w-48">
                      <p className="truncate">{booking.activityName}</p>
                    </td>
                    <td className="whitespace-nowrap text-xs text-ink-500">
                      {formatWita(booking.createdAt, "d MMM yyyy")}
                    </td>
                    <td>
                      <BookingStatusBadge status={booking.status} short />
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/riwayat/${booking.id}`}
                        className="text-sm font-medium text-brand-700 hover:underline"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="space-y-3 md:hidden">
            {bookings.map((booking) => (
              <Card key={booking.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {booking.room.name}
                    </p>
                    <p className="font-mono text-[11px] text-ink-500">{booking.bookingCode}</p>
                  </div>
                  <BookingStatusBadge status={booking.status} short />
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-500">Waktu</dt>
                    <dd className="text-right text-ink-800">
                      {formatWita(booking.startAt, "d MMM yyyy")}, {formatWita(booking.startAt, "HH:mm")}–
                      {formatWita(booking.endAt, "HH:mm")}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-500">Kegiatan</dt>
                    <dd className="max-w-52 truncate text-right text-ink-800">
                      {booking.activityName}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <Link
                    href={`/riwayat/${booking.id}`}
                    className="text-sm font-medium text-brand-700 hover:underline"
                  >
                    Lihat detail
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          <p className="text-xs text-ink-500">
            Menampilkan {bookings.length} pengajuan
            {status !== "ALL" ? ` dengan status ${bookingStatusMeta[status as keyof typeof bookingStatusMeta].label}` : ""}.
          </p>
        </>
      )}

      <Badge className="bg-sand-100 text-ink-600 ring-stone-200">
        Data pribadi pada halaman ini hanya dapat dilihat oleh pemilik akun dan admin
        sarana prasarana.
      </Badge>
    </div>
  );
}
