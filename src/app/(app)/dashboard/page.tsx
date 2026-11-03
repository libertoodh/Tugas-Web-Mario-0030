import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Plus,
  XCircle,
} from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { getRequesterSummary } from "@/server/services/bookings";
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

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");

  const { counts, latest, upcoming } = await getRequesterSummary(user.id);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greetingWita()}, ${firstName}`}
        description={`${formatWitaDate(new Date())} • ${formatWita(new Date(), "HH:mm")} WITA`}
        actions={
          <Link href="/pengajuan/baru" className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" aria-hidden />
            Ajukan Peminjaman
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Menunggu persetujuan"
          value={counts.PENDING}
          icon={<Clock className="h-4 w-4" aria-hidden />}
          tone="amber"
        />
        <StatCard
          label="Disetujui"
          value={counts.APPROVED}
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
          tone="emerald"
        />
        <StatCard
          label="Ditolak"
          value={counts.REJECTED}
          icon={<XCircle className="h-4 w-4" aria-hidden />}
          tone="rose"
        />
        <StatCard
          label="Dibatalkan"
          value={counts.CANCELLED}
          icon={<ClipboardList className="h-4 w-4" aria-hidden />}
          tone="stone"
        />
      </div>

      {counts.PENDING > 0 ? (
        <Alert variant="info" title="Ada pengajuan menunggu keputusan">
          Pengajuan berstatus Menunggu Persetujuan belum berarti ruangan sudah
          dipesan. Ruangan baru terkunci setelah admin menyetujui pengajuan.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Jadwal peminjaman mendatang"
            description="Peminjaman yang sudah disetujui"
            action={
              <Link
                href="/kalender"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
              >
                Kalender <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" aria-hidden />}
              title="Belum ada jadwal mendatang"
              description="Setelah pengajuan disetujui, jadwal peminjaman akan tampil di sini."
              action={
                <Link href="/ruangan" className={buttonClass("outline", "sm")}>
                  Lihat katalog ruangan
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {upcoming.map((booking) => (
                <li key={booking.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {booking.activityName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {booking.room.name} • {formatWita(booking.startAt, "EEE, d MMM")} •{" "}
                      {formatWita(booking.startAt, "HH:mm")}–{formatWita(booking.endAt, "HH:mm")} WITA
                    </p>
                  </div>
                  <BookingStatusBadge status="APPROVED" short />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Pengajuan terbaru"
            description="Lima pengajuan terakhir Anda"
            action={
              <Link
                href="/riwayat"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
              >
                Riwayat <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          {latest.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" aria-hidden />}
              title="Belum ada pengajuan"
              description="Ajukan peminjaman ruangan pertama Anda untuk melihat statusnya di sini."
              action={
                <Link href="/pengajuan/baru" className={buttonClass("primary", "sm")}>
                  Ajukan sekarang
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {latest.map((booking) => (
                <li key={booking.id} className="px-5 py-3.5">
                  <Link
                    href={`/riwayat/${booking.id}`}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {booking.room.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        {booking.bookingCode} • {formatWita(booking.startAt, "d MMM yyyy, HH:mm")} WITA
                      </p>
                    </div>
                    <BookingStatusBadge status={booking.status} short />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold text-ink-900">Butuh ruangan untuk kegiatan?</h2>
          <p className="mt-1 text-sm text-ink-500">
            Cek ketersediaan terlebih dahulu, lalu ajukan peminjaman minimal H-
            {process.env.BOOKING_MIN_LEAD_DAYS ?? "2"}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/ruangan" className={buttonClass("outline", "md")}>
            Katalog ruangan
          </Link>
          <Link href="/kalender" className={buttonClass("primary", "md")}>
            Kalender
          </Link>
        </div>
      </Card>
    </div>
  );
}
