import { getDayOverview } from "@/server/services/availability";
import { isValidDateString, todayWita } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { AvailabilityCalendar, OverviewPayload } from "./availability-calendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam && isValidDateString(dateParam) ? dateParam : todayWita();
  const overview = await getDayOverview(date);

  const payload: OverviewPayload = {
    date: overview.date,
    rooms: overview.rooms.map((item) => ({
      room: {
        id: item.room.id,
        name: item.room.name,
        building: item.room.building,
        floor: item.room.floor,
        capacity: item.room.capacity,
      },
      slots: item.slots.map((slot) => ({
        startAt: slot.startAt.toISOString(),
        endAt: slot.endAt.toISOString(),
        status: slot.status,
      })),
      availableHours: item.availableHours,
    })),
    bookings: overview.bookings.map((booking) => ({
      id: booking.id,
      roomId: booking.roomId,
      bookingCode: booking.bookingCode,
      activityName: booking.activityName,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      status: booking.status,
    })),
    blocks: overview.blocks.map((block) => ({
      id: block.id,
      roomId: block.roomId,
      reason: block.reason,
      startAt: block.startAt.toISOString(),
      endAt: block.endAt.toISOString(),
    })),
    totals: overview.totals,
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Kalender Ketersediaan" />
      <AvailabilityCalendar initialDate={date} initialOverview={payload} />
    </div>
  );
}
