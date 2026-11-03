import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquareText,
  Users,
  XCircle,
} from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { getBookingForViewer } from "@/server/services/bookings";
import { ApiError } from "@/lib/api";
import { formatWita } from "@/lib/time";
import { bookingStatusMeta } from "@/lib/status";
import { Alert, Card, CardHeader, PageHeader } from "@/components/ui";
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { CancelBookingButton } from "../cancel-booking-button";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  let booking;
  try {
    booking = await getBookingForViewer(user, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const canCancel =
    booking.userId === user.id &&
    (booking.status === "PENDING" || booking.status === "APPROVED") &&
    booking.startAt.getTime() > Date.now();

  const cancelBlockedReason =
    booking.userId !== user.id
      ? "Hanya pemilik pengajuan yang dapat membatalkan."
      : booking.status === "CANCELLED"
        ? "Pengajuan sudah dibatalkan."
        : booking.status === "REJECTED"
          ? "Pengajuan yang ditolak tidak dapat dibatalkan."
          : booking.startAt.getTime() <= Date.now()
            ? "Peminjaman sudah dimulai atau selesai."
            : undefined;

  const timeline = [
    {
      title: "Pengajuan dibuat",
      time: booking.createdAt,
      description: `Diajukan oleh ${booking.user.name}.`,
      icon: CalendarDays,
      tone: "text-ink-600 bg-sand-100",
    },
    ...(booking.approvedAt
      ? [
          {
            title:
              booking.status === "REJECTED"
                ? "Pengajuan ditolak"
                : "Pengajuan disetujui",
            time: booking.approvedAt,
            description: booking.approver
              ? `Diproses oleh ${booking.approver.name}.`
              : "Diproses oleh admin sarana prasarana.",
            icon: booking.status === "REJECTED" ? XCircle : CheckCircle2,
            tone:
              booking.status === "REJECTED"
                ? "text-rose-700 bg-rose-50"
                : "text-emerald-700 bg-emerald-50",
          },
        ]
      : []),
    ...(booking.cancelledAt
      ? [
          {
            title: "Pengajuan dibatalkan",
            time: booking.cancelledAt,
            description: "Ruangan kembali tersedia bila tidak ada jadwal lain.",
            icon: XCircle,
            tone: "text-stone-600 bg-stone-100",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/riwayat"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke riwayat
      </Link>

      <PageHeader
        title={`Pengajuan ${booking.bookingCode}`}
        description={`${booking.activityName} • ${booking.room.name}`}
        actions={<BookingStatusBadge status={booking.status} />}
      />

      {booking.status === "PENDING" ? (
        <Alert variant="warning" title="Menunggu persetujuan admin">
          Pengajuan ini belum mengunci ruangan. Admin sarana prasarana akan meninjau
          jadwal dan memberikan keputusan.
        </Alert>
      ) : null}

      {booking.status === "REJECTED" && booking.rejectionReason ? (
        <Alert variant="error" title="Alasan penolakan">
          {booking.rejectionReason}
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Detail peminjaman" />
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
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Kegiatan</p>
              <p className="mt-1 text-sm text-ink-900">{booking.activityName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Jumlah peserta</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-900">
                <Users className="h-4 w-4 text-ink-400" aria-hidden />
                {booking.participantCount} orang
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
            <div className="sm:col-span-2 rounded-xl bg-sand-50 p-3 text-xs text-ink-500">
              {booking.status === "APPROVED" || booking.status === "PENDING"
                ? bookingStatusMeta[booking.status].description
                : bookingStatusMeta[booking.status].description}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Riwayat keputusan" />
            <ol className="space-y-4 p-5">
              {timeline.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={`${item.title}-${item.time.toISOString()}`} className="flex gap-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.tone}`}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink-900">{item.title}</p>
                      <p className="text-xs text-ink-500">
                        {formatWita(item.time, "d MMM yyyy, HH:mm")} WITA
                      </p>
                      <p className="mt-0.5 text-xs text-ink-600">{item.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card className="p-4">
            <p className="text-sm font-medium text-ink-900">Tindakan</p>
            <div className="mt-2">
              <CancelBookingButton
                bookingId={booking.id}
                bookingCode={booking.bookingCode}
                disabledReason={canCancel ? undefined : cancelBlockedReason}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              Pembatalan hanya dapat dilakukan sebelum waktu mulai dan tidak berlaku
              untuk pengajuan yang sudah ditolak. Admin menerima pemberitahuan setiap
              pembatalan.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
