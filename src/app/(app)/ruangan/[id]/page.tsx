import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  Users,
} from "lucide-react";
import { getRoomDetail, getRoomUpcomingBookings } from "@/server/services/rooms";
import { getRoomAvailability } from "@/server/services/availability";
import { formatWita, isValidDateString, todayWita } from "@/lib/time";
import { slotStatusMeta } from "@/lib/status";
import { Badge, Card, CardHeader, EmptyState, Input, PageHeader, buttonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

const FALLBACK_IMAGE = "/hero-idb.jpg";

export default async function RoomDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const { date: dateParam } = await searchParams;
  const date = dateParam && isValidDateString(dateParam) ? dateParam : todayWita();

  const room = await getRoomDetail(id).catch(() => null);
  if (!room) notFound();

  const [availability, upcoming] = await Promise.all([
    getRoomAvailability(room.id, date),
    getRoomUpcomingBookings(room.id, 5),
  ]);

  const location = room.floor > 0 ? `${room.building}, lantai ${room.floor}` : room.building;
  const summary = [
    location,
    room.capacity > 0 ? `kapasitas ${room.capacity} orang` : "kapasitas belum tercatat",
  ].join(" • ");

  return (
    <div className="space-y-5">
      <Link
        href="/ruangan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke katalog
      </Link>

      <PageHeader
        title={room.name}
        description={summary}
        actions={
          room.isActive ? (
            <Link href={`/pengajuan/baru?roomId=${room.id}&date=${date}`} className={buttonClass("primary")}>
              Ajukan peminjaman
            </Link>
          ) : (
            <Badge className="bg-stone-100 text-stone-700 ring-stone-200">Ruangan nonaktif</Badge>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="relative aspect-[16/9] w-full bg-brand-900">
            <Image
              src={room.imageUrl ?? FALLBACK_IMAGE}
              alt={`Foto ${room.name}`}
              fill
              priority
              unoptimized={(room.imageUrl ?? "").startsWith("http")}
              sizes="(min-width: 1024px) 66vw, 100vw"
              className="object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-brand-900/50 via-transparent to-transparent"
              aria-hidden
            />
            {room.category ? (
              <span className="absolute left-4 top-4 rounded-md bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-800 shadow-sm">
                {room.category}
              </span>
            ) : null}
            <span className="absolute bottom-3 right-4 text-[10px] font-medium text-white/80">
              Foto: idbbali.ac.id
            </span>
          </div>

          <CardHeader title="Detail ruangan" />
          <div className="space-y-4 p-5">
            <p className="text-sm leading-relaxed text-ink-600">
              {room.description ?? "Belum ada deskripsi ruangan."}
            </p>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">Lokasi</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink-900">
                  <MapPin className="h-4 w-4 text-ink-400" aria-hidden />
                  {location}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">Lantai</dt>
                <dd className="mt-1 text-sm text-ink-900">
                  {room.floor > 0 ? room.floor : "Belum tercatat"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">Kapasitas</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                  <Users className="h-4 w-4 text-ink-400" aria-hidden />
                  {room.capacity > 0 ? `${room.capacity} orang` : "Belum tercatat"}
                </dd>
              </div>
            </dl>
            <details className="rounded-lg bg-sand-50 p-3 ring-1 ring-inset ring-stone-100">
              <summary className="cursor-pointer text-xs font-semibold text-brand-700 hover:underline">
                Info kapasitas ruangan
              </summary>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-600">
                {room.capacity > 0
                  ? `Kapasitas ${room.capacity} orang berdasarkan data Fasilitas Kampus IDB Bali. Pengajuan peminjaman dibatasi maksimal ${room.capacity} peserta.`
                  : "Laman resmi Fasilitas Kampus IDB Bali belum mencantumkan kapasitas ruangan ini. Admin dapat melengkapinya lewat Manajemen Ruangan; selama belum diisi, sistem tidak membatasi jumlah peserta berdasarkan kapasitas."}
              </p>
            </details>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Fasilitas</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {room.facilities.length === 0 ? (
                  <li className="text-sm text-ink-500">Belum ada data fasilitas.</li>
                ) : (
                  room.facilities.map((facility) => (
                    <li
                      key={facility}
                      className="rounded-md bg-sand-100 px-2.5 py-1 text-xs font-medium text-ink-700"
                    >
                      {facility}
                    </li>
                  ))
                )}
              </ul>
            </div>
            <p className="border-t border-stone-100 pt-3 text-xs text-ink-500">
              Data dan foto bersumber dari{" "}
              <a
                href="https://www.idbbali.ac.id/fasilitas-kampus/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-700 hover:underline"
              >
                Fasilitas Kampus IDB Bali
              </a>
              .
            </p>
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Jadwal mendatang" description="Pengajuan aktif pada ruangan ini" />
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" aria-hidden />}
              title="Belum ada jadwal"
              description="Ruangan ini belum memiliki peminjaman aktif."
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {upcoming.map((booking) => (
                <li key={booking.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-ink-900">
                    {formatWita(booking.startAt, "EEE, d MMM yyyy")}
                  </p>
                  <p className="text-xs text-ink-500">
                    {formatWita(booking.startAt, "HH:mm")}–{formatWita(booking.endAt, "HH:mm")} WITA
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-ink-600">{booking.activityName}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Ketersediaan harian"
          description="Status per jam berdasarkan data peminjaman di database"
          action={
            <form method="get" className="flex items-center gap-2">
              <label htmlFor="date" className="sr-only">
                Pilih tanggal
              </label>
              <Input id="date" name="date" type="date" defaultValue={date} className="h-9 w-auto" />
              <button type="submit" className={buttonClass("outline", "sm")}>
                Lihat
              </button>
            </form>
          }
        />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2" aria-label="Legenda status">
            {(["AVAILABLE", "PENDING", "OCCUPIED", "BLOCKED"] as const).map((key) => (
              <span
                key={key}
                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${slotStatusMeta[key].className}`}
              >
                {slotStatusMeta[key].label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {availability.slots.map((slot) => {
              const meta = slotStatusMeta[slot.status];
              const isFree = slot.status === "AVAILABLE";
              const content = (
                <>
                  <span className="flex items-center gap-1 text-xs font-semibold">
                    <Clock className="h-3 w-3" aria-hidden />
                    {formatWita(slot.startAt, "HH:mm")}–{formatWita(slot.endAt, "HH:mm")}
                  </span>
                  <span className="mt-1 block text-[11px]">{meta.label}</span>
                </>
              );
              return isFree ? (
                <Link
                  key={slot.startAt.toISOString()}
                  href={`/pengajuan/baru?roomId=${room.id}&date=${date}&start=${formatWita(slot.startAt, "HH:mm")}&end=${formatWita(slot.endAt, "HH:mm")}`}
                  className={`rounded-xl p-2.5 ring-1 ring-inset transition hover:ring-2 ${meta.className}`}
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={slot.startAt.toISOString()}
                  className={`rounded-xl p-2.5 ring-1 ring-inset ${meta.className}`}
                >
                  {content}
                </div>
              );
            })}
          </div>

          <p className="flex items-start gap-1.5 text-xs text-ink-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Slot hijau dapat langsung diajukan. Slot kuning menunggu keputusan admin,
            merah sudah disetujui, dan abu-abu diblokir untuk jadwal kampus.
          </p>
        </div>
      </Card>

      <Card className="flex items-start gap-2 p-4 text-sm text-ink-600">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
        <p>
          Pengajuan yang disetujui akan mengunci jadwal ini. Sistem memeriksa bentrok
          di server dan database sehingga dua peminjaman tidak dapat menempati waktu
          yang sama.
        </p>
      </Card>
    </div>
  );
}
