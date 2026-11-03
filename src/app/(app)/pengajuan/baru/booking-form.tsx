"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { AlertCircle, CalendarCheck2, Clock, Info, Loader2 } from "lucide-react";
import { bookingCreateSchema } from "@/lib/validation";
import { formatWita } from "@/lib/time";
import { slotStatusMeta } from "@/lib/status";
import { useToast } from "@/components/toast";
import { Modal } from "@/components/modal";
import { Alert, Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";

export interface RoomOption {
  id: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  facilities: string[];
}

export interface BookingFormValues {
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  activityName: string;
  participantCount: number;
  purpose: string;
}

interface SlotInfo {
  startAt: string;
  endAt: string;
  status: "AVAILABLE" | "PENDING" | "OCCUPIED" | "BLOCKED";
}

interface Suggestion {
  roomId: string;
  roomName: string;
  start: string;
  end: string;
  label: string;
}

export function BookingForm({
  rooms,
  defaults,
  rules,
}: {
  rooms: RoomOption[];
  defaults: Partial<BookingFormValues>;
  rules: { minLeadDays: number; maxAdvanceDays: number; maxDurationHours: number; openHour: number; closeHour: number };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<BookingFormValues | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [slots, setSlots] = useState<SlotInfo[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingCreateSchema) as unknown as Resolver<BookingFormValues>,
    defaultValues: {
      roomId: defaults.roomId ?? rooms[0]?.id ?? "",
      date: defaults.date ?? "",
      startTime: defaults.startTime ?? "09:00",
      endTime: defaults.endTime ?? "11:00",
      activityName: "",
      participantCount: 20,
      purpose: "",
    },
  });

  const roomId = watch("roomId");
  const date = watch("date");
  const startTime = watch("startTime");
  const endTime = watch("endTime");
  const participantCount = watch("participantCount");
  const purpose = watch("purpose");
  const selectedRoom = rooms.find((room) => room.id === roomId);

  const loadSlots = useCallback(async (room: string, day: string) => {
    if (!room || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      setSlots(null);
      return;
    }
    setLoadingSlots(true);
    setSlotError(null);
    try {
      const response = await fetch(`/api/availability?roomId=${room}&date=${day}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? "Gagal memuat ketersediaan");
      setSlots(body.data.slots);
    } catch (error) {
      setSlots(null);
      setSlotError(error instanceof Error ? error.message : "Gagal memuat ketersediaan");
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    void loadSlots(roomId, date);
  }, [roomId, date, loadSlots]);

  function openSummary(values: BookingFormValues) {
    setServerError(null);
    setSuggestions([]);
    setPendingValues(values);
    setSummaryOpen(true);
  }

  async function submit(values: BookingFormValues) {
    setServerError(null);
    setSuggestions([]);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await response.json();

      if (!response.ok) {
        const message = body?.error?.message ?? "Pengajuan gagal disimpan.";
        setServerError(message);
        if (body?.error?.details?.suggestions) {
          setSuggestions(body.error.details.suggestions as Suggestion[]);
        }
        if (body?.error?.details && typeof body.error.details === "object") {
          for (const [field, fieldMessage] of Object.entries(body.error.details)) {
            if (typeof fieldMessage === "string" && field in values) {
              setError(field as keyof BookingFormValues, { message: fieldMessage });
            }
          }
        }
        setSummaryOpen(false);
        return;
      }

      toast({
        title: "Pengajuan berhasil dikirim",
        description: `Kode ${body.data.bookingCode} berstatus Menunggu Persetujuan.`,
        variant: "success",
      });
      reset();
      router.push(`/riwayat/${body.data.id}`);
      router.refresh();
    } catch {
      setServerError("Tidak dapat menghubungi server. Periksa koneksi Anda.");
      setSummaryOpen(false);
    }
  }

  function applySuggestion(suggestion: Suggestion) {
    setValue("roomId", suggestion.roomId);
    setValue("startTime", suggestion.start);
    setValue("endTime", suggestion.end);
    setSuggestions([]);
    setServerError(null);
  }

  const durationLabel = (() => {
    if (!startTime || !endTime || endTime <= startTime) return null;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const minutes = eh * 60 + em - (sh * 60 + sm);
    return `${Math.floor(minutes / 60)} jam${minutes % 60 ? ` ${minutes % 60} menit` : ""}`;
  })();

  return (
    <>
      <form onSubmit={handleSubmit(openSummary)} className="grid gap-4 lg:grid-cols-3" noValidate>
        <div className="space-y-4 lg:col-span-2">
          {serverError ? (
            <Alert variant="error" title="Pengajuan tidak dapat diproses">
              {serverError}
              {suggestions.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  <p className="font-medium">Saran jadwal alternatif:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.roomId}-${suggestion.start}-${suggestion.end}`}
                        type="button"
                        onClick={() => applySuggestion(suggestion)}
                        className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-800 hover:bg-rose-50"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </Alert>
          ) : null}

          <Card>
            <CardHeader
              title="Detail peminjaman"
              description="Semua waktu menggunakan zona WITA (Asia/Makassar)."
            />
            <div className="space-y-4 p-5">
              <Field label="Ruangan" htmlFor="roomId" error={errors.roomId?.message} required>
                <Select
                  id="roomId"
                  aria-invalid={Boolean(errors.roomId)}
                  {...register("roomId")}
                >
                  <option value="">Pilih ruangan</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} — {room.floor > 0 ? `${room.building}, lantai ${room.floor}` : room.building}
                      {room.capacity > 0 ? ` (kapasitas ${room.capacity})` : ""}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Tanggal" htmlFor="date" error={errors.date?.message} required>
                  <Input
                    id="date"
                    type="date"
                    min={undefined}
                    aria-invalid={Boolean(errors.date)}
                    {...register("date")}
                  />
                </Field>
                <Field label="Jam mulai" htmlFor="startTime" error={errors.startTime?.message} required>
                  <Input
                    id="startTime"
                    type="time"
                    step={1800}
                    aria-invalid={Boolean(errors.startTime)}
                    {...register("startTime")}
                  />
                </Field>
                <Field label="Jam selesai" htmlFor="endTime" error={errors.endTime?.message} required>
                  <Input
                    id="endTime"
                    type="time"
                    step={1800}
                    aria-invalid={Boolean(errors.endTime)}
                    {...register("endTime")}
                  />
                </Field>
              </div>

              {durationLabel ? (
                <p className="-mt-2 flex items-center gap-1.5 text-xs text-ink-500">
                  <Clock className="h-3.5 w-3.5" aria-hidden /> Durasi {durationLabel} • maksimal{" "}
                  {rules.maxDurationHours} jam
                </p>
              ) : null}

              <Field
                label="Nama kegiatan"
                htmlFor="activityName"
                error={errors.activityName?.message}
                required
              >
                <Input
                  id="activityName"
                  placeholder="Contoh: Kritik Karya Desain Produk"
                  aria-invalid={Boolean(errors.activityName)}
                  {...register("activityName")}
                />
              </Field>

              <Field
                label="Jumlah peserta"
                htmlFor="participantCount"
                error={errors.participantCount?.message}
                hint={
                  selectedRoom
                    ? selectedRoom.capacity > 0
                      ? `Kapasitas ${selectedRoom.name}: ${selectedRoom.capacity} orang`
                      : `Kapasitas ${selectedRoom.name}: belum tercatat`
                    : undefined
                }
                required
              >
                <Input
                  id="participantCount"
                  type="number"
                  min={1}
                  max={selectedRoom && selectedRoom.capacity > 0 ? selectedRoom.capacity : 1000}
                  aria-invalid={Boolean(errors.participantCount)}
                  {...register("participantCount")}
                />
              </Field>

              <Field
                label="Keperluan / deskripsi kegiatan"
                htmlFor="purpose"
                error={errors.purpose?.message}
                required
              >
                <Textarea
                  id="purpose"
                  rows={4}
                  placeholder="Jelaskan kebutuhan ruangan, perlengkapan khusus, atau catatan lain."
                  aria-invalid={Boolean(errors.purpose)}
                  {...register("purpose")}
                />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Ketersediaan ruangan"
              description={date ? formatWita(new Date(`${date}T12:00:00`), "d MMMM yyyy") : "Pilih tanggal"}
              action={
                loadingSlots ? <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden /> : null
              }
            />
            <div className="p-4">
              {slotError ? (
                <p className="text-sm text-rose-700">{slotError}</p>
              ) : !roomId || !date ? (
                <p className="text-sm text-ink-500">
                  Pilih ruangan dan tanggal untuk melihat ketersediaan per jam.
                </p>
              ) : loadingSlots && !slots ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="skeleton h-8 w-full" />
                  ))}
                </div>
              ) : slots && slots.length > 0 ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {slots.map((slot) => {
                    const meta = slotStatusMeta[slot.status];
                    const label = `${formatWita(new Date(slot.startAt), "HH:mm")}–${formatWita(new Date(slot.endAt), "HH:mm")}`;
                    const selected =
                      startTime === formatWita(new Date(slot.startAt), "HH:mm") &&
                      endTime === formatWita(new Date(slot.endAt), "HH:mm");
                    return (
                      <button
                        key={slot.startAt}
                        type="button"
                        disabled={slot.status !== "AVAILABLE"}
                        onClick={() => {
                          setValue("startTime", formatWita(new Date(slot.startAt), "HH:mm"), {
                            shouldValidate: true,
                          });
                          setValue("endTime", formatWita(new Date(slot.endAt), "HH:mm"), {
                            shouldValidate: true,
                          });
                        }}
                        className={`rounded-lg p-2 text-left text-[11px] font-medium ring-1 ring-inset transition ${meta.className} ${
                          slot.status === "AVAILABLE"
                            ? "hover:ring-2"
                            : "cursor-not-allowed opacity-80"
                        } ${selected ? "ring-2 ring-offset-1" : ""}`}
                        aria-pressed={selected}
                      >
                        <span className="block tabular-nums">{label}</span>
                        <span className="block opacity-80">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-ink-500">Tidak ada data ketersediaan.</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3 text-[11px] text-ink-500">
                {(["AVAILABLE", "PENDING", "OCCUPIED", "BLOCKED"] as const).map((key) => (
                  <span key={key} className="inline-flex items-center gap-1">
                    <span className={`h-2.5 w-2.5 rounded-sm ring-1 ring-inset ${slotStatusMeta[key].className}`} aria-hidden />
                    {slotStatusMeta[key].label}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-4 text-sm text-ink-600">
            <p className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              Pengajuan paling lambat H-{rules.minLeadDays} dan maksimal {rules.maxAdvanceDays} hari
              ke depan. Nilai ini masih berupa draf pengembangan dan dapat diubah melalui konfigurasi.
            </p>
          </Card>

          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            <CalendarCheck2 className="h-4 w-4" aria-hidden />
            Lanjutkan pengajuan
          </Button>
        </div>
      </form>

      <Modal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="Ringkasan pengajuan"
        description="Periksa kembali sebelum dikirim. Pengajuan akan berstatus Menunggu Persetujuan."
        footer={
          <>
            <Button variant="outline" onClick={() => setSummaryOpen(false)}>
              Periksa lagi
            </Button>
            <Button
              loading={isSubmitting}
              disabled={!pendingValues}
              onClick={() => pendingValues && submit(pendingValues)}
            >
              Kirim pengajuan
            </Button>
          </>
        }
      >
        {pendingValues ? (
          <dl className="divide-y divide-stone-100 text-sm">
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-ink-500">Ruangan</dt>
              <dd className="text-right font-medium text-ink-900">{selectedRoom?.name ?? "-"}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-ink-500">Tanggal</dt>
              <dd className="text-right font-medium text-ink-900">
                {formatWita(new Date(`${pendingValues.date}T12:00:00`), "EEEE, d MMMM yyyy")}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-ink-500">Waktu</dt>
              <dd className="text-right font-medium text-ink-900">
                {pendingValues.startTime}–{pendingValues.endTime} WITA
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-ink-500">Kegiatan</dt>
              <dd className="text-right font-medium text-ink-900">{pendingValues.activityName}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-ink-500">Peserta</dt>
              <dd className="text-right font-medium text-ink-900">
                {participantCount} orang
              </dd>
            </div>
            <div className="py-2">
              <dt className="text-ink-500">Keperluan</dt>
              <dd className="mt-1 text-ink-900">{purpose}</dd>
            </div>
          </dl>
        ) : null}
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Mengirim formulir ini tidak mengunci ruangan. Ruangan baru terkunci setelah
          disetujui admin.
        </p>
      </Modal>
    </>
  );
}
