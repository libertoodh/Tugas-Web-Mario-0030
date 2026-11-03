import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock, Mail, MapPin, MessageSquareText, Users } from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { getBookingForViewer } from "@/server/services/bookings";
import { ApiError } from "@/lib/api";
import { formatWita } from "@/lib/time";
import { Alert, Card, CardHeader, PageHeader } from "@/components/ui";
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { AdminDecisionPanel } from "../decision-panel";

export const dynamic = "force-dynamic";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  let booking;
  try {
    booking = await getBookingForViewer(user, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const canDecide = booking.status === "PENDING" && booking.endAt.getTime() > Date.now();
  const decidedLabel =
    booking.status !== "PENDING"
      ? `Pengajuan sudah berstatus ${booking.status === "APPROVED" ? "Disetujui" : booking.status === "REJECTED" ? "Ditolak" : "Dibatalkan"}.`
      : "Jadwal pengajuan sudah lewat sehingga tidak dapat diproses.";

  return (
    <div className="space-y-5">
      <Link
        href="/admin/pengajuan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke manajemen pengajuan
      </Link>

      <PageHeader
        title={`Tinjau ${booking.bookingCode}`}
        description={`${booking.activityName} • ${booking.room.name}`}
        actions={<BookingStatusBadge status={booking.status} />}
      />

      {booking.status === "REJECTED" && booking.rejectionReason ? (
        <Alert variant="error" title="Alasan penolakan">
          {booking.rejectionReason}
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Informasi pemohon" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Nama</p>
                <p className="mt-1 text-sm font-medium text-ink-900">{booking.user.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Email</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-900">
                  <Mail className="h-4 w-4 text-ink-400" aria-hidden />
                  {booking.user.email}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Jumlah peserta
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-900">
                  <Users className="h-4 w-4 text-ink-400" aria-hidden />
                  {booking.participantCount} orang
                  {booking.room.capacity > 0 ? ` (kapasitas ${booking.room.capacity})` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Diajukan pada
                </p>
                <p className="mt-1 text-sm text-ink-900">
                  {formatWita(booking.createdAt, "d MMM yyyy, HH:mm")} WITA
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Detail jadwal & kegiatan" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Ruangan</p>
                <p className="mt-1 text-sm font-medium text-ink-900">{booking.room.name}</p>
                <p className="flex items-center gap-1 text-xs text-ink-500">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {booking.room.building}
                  {booking.room.floor > 0 ? `, lantai ${booking.room.floor}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Waktu</p>
                <p className="mt-1 text-sm font-medium text-ink-900">
                  {formatWita(booking.startAt, "EEEE, d MMMM yyyy")}
                </p>
                <p className="flex items-center gap-1 text-xs text-ink-500">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {formatWita(booking.startAt, "HH:mm")}–{formatWita(booking.endAt, "HH:mm")} WITA
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Keperluan / deskripsi
                </p>
                <p className="mt-1 flex items-start gap-1.5 text-sm leading-relaxed text-ink-700">
                  <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                  {booking.purpose}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Keputusan" description="Status perubahan langsung tersimpan di database" />
            <div className="space-y-3 p-5">
              <AdminDecisionPanel
                bookingId={booking.id}
                bookingCode={booking.bookingCode}
                canDecide={canDecide}
                decidedLabel={decidedLabel}
              />
              {booking.approvedAt ? (
                <p className="text-xs text-ink-500">
                  Diproses {formatWita(booking.approvedAt, "d MMM yyyy, HH:mm")} WITA
                  {booking.approver ? ` oleh ${booking.approver.name}` : ""}.
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Ringkasan" />
            <dl className="divide-y divide-stone-100 text-sm">
              <div className="flex justify-between gap-3 px-5 py-3">
                <dt className="text-ink-500">Kode</dt>
                <dd className="font-mono text-xs text-ink-900">{booking.bookingCode}</dd>
              </div>
              <div className="flex justify-between gap-3 px-5 py-3">
                <dt className="text-ink-500">Status</dt>
                <dd className="text-right font-medium text-ink-900">
                  {booking.status === "PENDING"
                    ? "Menunggu Persetujuan"
                    : booking.status === "APPROVED"
                      ? "Disetujui"
                      : booking.status === "REJECTED"
                        ? "Ditolak"
                        : "Dibatalkan"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 px-5 py-3">
                <dt className="text-ink-500">Pembatalan</dt>
                <dd className="text-right text-ink-900">
                  {booking.cancelledAt
                    ? formatWita(booking.cancelledAt, "d MMM yyyy, HH:mm")
                    : "—"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-4 text-xs leading-relaxed text-ink-500">
            Menyetujui pengajuan akan mengunci jadwal ruangan. Constraint database
            mencegah dua peminjaman disetujui menempati waktu yang sama, termasuk
            bila dua admin memproses bersamaan.
          </Card>
        </div>
      </div>
    </div>
  );
}
