import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { listRooms } from "@/server/services/rooms";
import { bookingRules } from "@/lib/config";
import { isValidDateString, addDaysToDateString, todayWita } from "@/lib/time";
import { Alert, PageHeader } from "@/components/ui";
import { BookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ roomId?: string; date?: string; start?: string; end?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const rooms = await listRooms();
  if (rooms.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Ajukan Peminjaman" />
        <Alert variant="warning" title="Belum ada ruangan aktif">
          Admin belum menambahkan ruangan yang dapat dipinjam. Hubungi admin sarana
          prasarana terlebih dahulu.
        </Alert>
      </div>
    );
  }

  const minDate = addDaysToDateString(todayWita(), bookingRules.minLeadDays);
  const maxDate = addDaysToDateString(todayWita(), bookingRules.maxAdvanceDays);
  const defaultDate =
    params.date && isValidDateString(params.date) && params.date >= minDate && params.date <= maxDate
      ? params.date
      : minDate;

  const defaults = {
    roomId: params.roomId && rooms.some((room) => room.id === params.roomId) ? params.roomId : rooms[0].id,
    date: defaultDate,
    startTime: /^\d{2}:\d{2}$/.test(params.start ?? "") ? params.start : "09:00",
    endTime: /^\d{2}:\d{2}$/.test(params.end ?? "") ? params.end : "11:00",
  };

  return (
    <div className="space-y-5">
      <Link
        href="/ruangan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke katalog
      </Link>

      <PageHeader
        title="Ajukan Peminjaman Ruangan"
        description={`Tanggal yang dapat diajukan: ${minDate} sampai ${maxDate} (WITA).`}
      />

      <BookingForm
        rooms={rooms.map((room) => ({
          id: room.id,
          name: room.name,
          building: room.building,
          floor: room.floor,
          capacity: room.capacity,
          facilities: room.facilities,
        }))}
        defaults={defaults}
        rules={{
          minLeadDays: bookingRules.minLeadDays,
          maxAdvanceDays: bookingRules.maxAdvanceDays,
          maxDurationHours: bookingRules.maxDurationHours,
          openHour: bookingRules.openHour,
          closeHour: bookingRules.closeHour,
        }}
      />
    </div>
  );
}
