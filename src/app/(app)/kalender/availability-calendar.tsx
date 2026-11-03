"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { id as idLocale } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import "react-day-picker/style.css";
import { slotStatusMeta, BookingStatusValue } from "@/lib/status";
import { formatWita } from "@/lib/time";
import { Alert, Badge, Button, Card, CardHeader, buttonClass } from "@/components/ui";

interface SlotPayload {
  startAt: string;
  endAt: string;
  status: "AVAILABLE" | "PENDING" | "OCCUPIED" | "BLOCKED";
}

interface RoomPayload {
  room: {
    id: string;
    name: string;
    building: string;
    floor: number;
    capacity: number;
  };
  slots: SlotPayload[];
  availableHours: number;
}

interface BookingPayload {
  id: string;
  roomId: string;
  bookingCode: string;
  activityName: string;
  startAt: string;
  endAt: string;
  status: BookingStatusValue;
}

interface BlockPayload {
  id: string;
  roomId: string;
  reason: string;
  startAt: string;
  endAt: string;
}

export interface OverviewPayload {
  date: string;
  rooms: RoomPayload[];
  bookings: BookingPayload[];
  blocks: BlockPayload[];
  totals: { available: number; pending: number; occupied: number; blocked: number };
}

function toLocalDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(date: string, days: number) {
  const base = toLocalDate(date);
  base.setDate(base.getDate() + days);
  return toDateString(base);
}

export function AvailabilityCalendar({
  initialDate,
  initialOverview,
}: {
  initialDate: string;
  initialOverview: OverviewPayload;
}) {
  const [date, setDate] = useState(initialDate);
  const [overview, setOverview] = useState<OverviewPayload>(initialOverview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (date === initialDate && overview.date === date) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/availability?date=${date}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error?.message ?? "Gagal memuat jadwal");
        if (!cancelled) setOverview(body.data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // initialOverview hanya dipakai untuk render pertama.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const hours = useMemo(() => {
    const first = overview.rooms[0]?.slots ?? [];
    return first.map((slot) => formatWita(new Date(slot.startAt), "HH:mm"));
  }, [overview.rooms]);

  const historyHref = `/pengajuan/baru?date=${date}`;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDate(shiftDate(date, -1))}
              aria-label="Hari sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <button
              type="button"
              onClick={() => setShowPicker((value) => !value)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium text-ink-800 hover:bg-sand-50"
              aria-expanded={showPicker}
            >
              <CalendarDays className="h-4 w-4 text-ink-500" aria-hidden />
              {formatWita(new Date(`${date}T12:00:00`), "EEEE, d MMMM yyyy")}
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDate(shiftDate(date, 1))}
              aria-label="Hari berikutnya"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDate(toDateString(new Date()))}
            >
              Hari ini
            </Button>
            <Link href={historyHref} className={buttonClass("primary", "sm")}>
              Ajukan peminjaman
            </Link>
          </div>
        </div>

        {showPicker ? (
          <div className="relative mt-3">
            <div className="inline-block rounded-xl border border-stone-200 bg-white p-2 shadow-sm">
              <DayPicker
                mode="single"
                locale={idLocale}
                selected={toLocalDate(date)}
                onSelect={(selected) => {
                  if (selected) {
                    setDate(toDateString(selected));
                    setShowPicker(false);
                  }
                }}
                classNames={{
                  months: "flex flex-col",
                  month_caption: "flex items-center justify-center py-2 text-sm font-medium",
                  weekdays: "flex",
                  weekday: "w-9 text-center text-[11px] font-medium uppercase text-ink-400",
                  week: "flex",
                  day: "h-9 w-9 text-sm",
                  day_button:
                    "h-9 w-9 rounded-lg text-ink-700 hover:bg-sand-100 aria-selected:bg-brand-700 aria-selected:text-white",
                  selected: "rounded-lg bg-brand-700 text-white",
                  today: "font-semibold text-brand-700",
                  outside: "text-ink-300",
                  nav: "flex items-center justify-between px-1",
                  button_previous:
                    "h-7 w-7 rounded-md border border-stone-200 text-ink-600 hover:bg-sand-100",
                  button_next:
                    "h-7 w-7 rounded-md border border-stone-200 text-ink-600 hover:bg-sand-100",
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="absolute right-0 top-0 rounded-md p-1 text-ink-400 hover:text-ink-700"
              aria-label="Tutup pemilih tanggal"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </Card>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex flex-wrap items-center gap-2" aria-label="Legenda ketersediaan">
        {(["AVAILABLE", "PENDING", "OCCUPIED", "BLOCKED"] as const).map((key) => (
          <span
            key={key}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${slotStatusMeta[key].className}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
            {slotStatusMeta[key].label}
          </span>
        ))}
        <span className="text-xs text-ink-500">
          {overview.totals.available} jam tersedia dari{" "}
          {overview.totals.available + overview.totals.pending + overview.totals.occupied + overview.totals.blocked} jam
          yang ditampilkan.
        </span>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Jadwal seluruh ruangan"
          description="Geser ke samping pada ponsel untuk melihat seluruh jam (WITA)"
          action={
            loading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Memuat
              </span>
            ) : null
          }
        />
        {overview.rooms.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-500">
            Belum ada ruangan aktif.
          </p>
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[44rem] table-fixed border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-32 border-b border-r border-stone-200 bg-white px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-500 sm:w-48 sm:px-4">
                    Ruangan
                  </th>
                  {hours.map((hour) => (
                    <th
                      key={hour}
                      scope="col"
                      className="w-11 border-b border-stone-200 px-1 py-2.5 text-center text-[11px] font-semibold text-ink-500"
                    >
                      {hour}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overview.rooms.map((room) => (
                  <tr key={room.room.id}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 w-32 border-b border-r border-stone-100 bg-white px-3 py-2 text-left font-medium text-ink-900 sm:w-48 sm:px-4"
                    >
                      <span className="block max-w-40 truncate text-sm">{room.room.name}</span>
                      <span className="block text-[11px] font-normal text-ink-500">
                        {room.room.building}
                        {room.room.floor > 0 ? ` • L${room.room.floor}` : ""}
                      </span>
                    </th>
                    {room.slots.map((slot) => {
                      const meta = slotStatusMeta[slot.status];
                      const start = formatWita(new Date(slot.startAt), "HH:mm");
                      return (
                        <td key={slot.startAt} className="border-b border-stone-100 p-1">
                          {slot.status === "AVAILABLE" ? (
                            <Link
                              href={`/pengajuan/baru?roomId=${room.room.id}&date=${date}&start=${start}&end=${formatWita(new Date(slot.endAt), "HH:mm")}`}
                              className={`flex h-10 items-center justify-center rounded-md text-[10px] font-medium ring-1 ring-inset transition hover:ring-2 ${meta.className}`}
                              aria-label={`${room.room.name} pukul ${start} tersedia, ajukan peminjaman`}
                              title={`${room.room.name} • ${start} • ${meta.label}`}
                            >
                              {slot.status === "AVAILABLE" ? "" : null}
                            </Link>
                          ) : (
                            <div
                              className={`flex h-10 items-center justify-center rounded-md text-[10px] font-medium ring-1 ring-inset ${meta.className}`}
                              title={`${room.room.name} • ${start} • ${meta.label}`}
                              aria-label={`${room.room.name} pukul ${start}: ${meta.label}`}
                            >
                              {slot.status === "PENDING" ? "Menunggu" : slot.status === "OCCUPIED" ? "Terisi" : "Diblokir"}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Rincian jadwal"
          description="Pengajuan aktif dan blokir pada tanggal ini"
        />
        {overview.bookings.length === 0 && overview.blocks.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-500">
            Tidak ada peminjaman atau blokir pada tanggal ini.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {overview.bookings.map((booking) => {
              const room = overview.rooms.find((r) => r.room.id === booking.roomId);
              return (
                <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {room?.room.name ?? "Ruangan"} • {booking.activityName}
                    </p>
                    <p className="text-xs text-ink-500">
                      {formatWita(new Date(booking.startAt), "HH:mm")}–
                      {formatWita(new Date(booking.endAt), "HH:mm")} WITA • {booking.bookingCode}
                    </p>
                  </div>
                  <Badge
                    className={
                      booking.status === "APPROVED"
                        ? "bg-rose-50 text-rose-800 ring-rose-200"
                        : "bg-amber-50 text-amber-800 ring-amber-200"
                    }
                    dotClassName={booking.status === "APPROVED" ? "bg-rose-600" : "bg-amber-500"}
                  >
                    {booking.status === "APPROVED" ? "Sudah terisi" : "Menunggu persetujuan"}
                  </Badge>
                </li>
              );
            })}
            {overview.blocks.map((block) => {
              const room = overview.rooms.find((r) => r.room.id === block.roomId);
              return (
                <li key={block.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {room?.room.name ?? "Ruangan"} • {block.reason}
                    </p>
                    <p className="text-xs text-ink-500">
                      {formatWita(new Date(block.startAt), "HH:mm")}–
                      {formatWita(new Date(block.endAt), "HH:mm")} WITA
                    </p>
                  </div>
                  <Badge className="bg-stone-100 text-stone-700 ring-stone-200" dotClassName="bg-stone-400">
                    Diblokir
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
