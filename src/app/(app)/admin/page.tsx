import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  DoorOpen,
  Plus,
  XCircle,
} from "lucide-react";
import { getAdminSummary } from "@/server/services/bookings";
import { getSessionUser } from "@/server/auth/session";
import { formatWita, formatWitaDate, greetingWita } from "@/lib/time";
import {
  Alert,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatCard,
  buttonClass,
} from "@/components/ui";
import { BookingStatusBadge } from "@/components/booking-status-badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [summary, user] = await Promise.all([getAdminSummary(), getSessionUser()]);
  const firstName = user?.name.split(" ")[0] ?? "Admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Admin Sarana Prasarana"
        description={`${greetingWita()}, ${firstName} • ${formatWitaDate(new Date())} • ${formatWita(new Date(), "HH:mm")} WITA`}
        actions={
          <>
            <Link href="/admin/pengajuan" className={buttonClass("outline", "md")}>
              Semua pengajuan
            </Link>
            <Link href="/admin/ruangan/baru" className={buttonClass("primary", "md")}>
              <Plus className="h-4 w-4" aria-hidden />
              Tambah ruangan
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Ruangan aktif"
          value={summary.activeRoomCount}
          hint={`${summary.roomCount} ruangan terdaftar`}
          icon={<DoorOpen className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          label="Menunggu keputusan"
          value={summary.counts.PENDING}
          icon={<Clock className="h-4 w-4" aria-hidden />}
          tone="amber"
        />
        <StatCard
          label="Peminjaman disetujui"
          value={summary.counts.APPROVED}
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
          tone="emerald"
        />
        <StatCard
          label="Ditolak / dibatalkan"
          value={`${summary.counts.REJECTED} / ${summary.counts.CANCELLED}`}
          icon={<XCircle className="h-4 w-4" aria-hidden />}
          tone="rose"
        />
      </div>

      {summary.counts.PENDING > 0 ? (
        <Alert variant="warning" title={`${summary.counts.PENDING} pengajuan menunggu keputusan`}>
          Tinjau pengajuan di bawah. Sistem akan memeriksa ulang bentrok jadwal saat
          Anda menyetujui, termasuk bila ada permintaan lain yang masuk bersamaan.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Menunggu keputusan"
            description="Diurutkan berdasarkan waktu peminjaman terdekat"
            action={
              <Link
                href="/admin/pengajuan?status=PENDING"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
              >
                Kelola <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          {summary.pending.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" aria-hidden />}
              title="Tidak ada pengajuan menunggu"
              description="Semua pengajuan sudah diproses."
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {summary.pending.slice(0, 6).map((booking) => (
                <li key={booking.id}>
                  <Link
                    href={`/admin/pengajuan/${booking.id}`}
                    className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-sand-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {booking.room.name} • {booking.activityName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        {booking.user.name} • {formatWita(booking.startAt, "d MMM yyyy")},{" "}
                        {formatWita(booking.startAt, "HH:mm")}–{formatWita(booking.endAt, "HH:mm")} WITA
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-brand-700">Tinjau</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Jadwal mendatang"
            description="Peminjaman yang sudah disetujui"
            action={
              <Link
                href="/admin/jadwal"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
              >
                Jadwal <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          {summary.upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-5 w-5" aria-hidden />}
              title="Belum ada jadwal"
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {summary.upcoming.slice(0, 6).map((booking) => (
                <li key={booking.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-ink-900">
                    {formatWita(booking.startAt, "EEE, d MMM")} • {formatWita(booking.startAt, "HH:mm")}–
                    {formatWita(booking.endAt, "HH:mm")}
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {booking.room.name} • {booking.activityName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Pengajuan terbaru"
          description="Delapan pengajuan terakhir dari seluruh pengguna"
          action={
            <Link
              href="/admin/pengajuan"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
            >
              Lihat semua <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        />
        {summary.latest.length === 0 ? (
          <EmptyState icon={<Building2 className="h-5 w-5" aria-hidden />} title="Belum ada pengajuan" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[46rem]">
              <thead>
                <tr>
                  <th scope="col">Kode</th>
                  <th scope="col">Pemohon</th>
                  <th scope="col">Ruangan</th>
                  <th scope="col">Waktu</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {summary.latest.map((booking) => (
                  <tr key={booking.id}>
                    <td className="font-mono text-xs">{booking.bookingCode}</td>
                    <td>
                      <p className="font-medium text-ink-900">{booking.user.name}</p>
                      <p className="text-xs text-ink-500">{booking.user.email}</p>
                    </td>
                    <td>{booking.room.name}</td>
                    <td className="whitespace-nowrap text-xs">
                      {formatWita(booking.startAt, "d MMM yyyy")}
                      <p className="text-ink-500">
                        {formatWita(booking.startAt, "HH:mm")}–{formatWita(booking.endAt, "HH:mm")}
                      </p>
                    </td>
                    <td>
                      <BookingStatusBadge status={booking.status} short />
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/admin/pengajuan/${booking.id}`}
                        className="text-sm font-medium text-brand-700 hover:underline"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
