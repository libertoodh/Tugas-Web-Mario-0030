import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bookingRules } from "@/lib/config";
import { SlotStatus } from "@/lib/status";
import { isValidDateString, witaDayRange } from "@/lib/time";
import { ApiError } from "@/lib/api";

export interface AvailabilitySlot {
  startAt: Date;
  endAt: Date;
  status: SlotStatus;
}

export interface RoomAvailability {
  roomId: string;
  date: string;
  slots: AvailabilitySlot[];
  availableHours: number;
  totalHours: number;
}

interface BookingRow {
  id: string;
  roomId: string;
  bookingCode: string;
  activityName: string;
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
}

interface BlockRow {
  id: string;
  roomId: string;
  reason: string;
  startAt: Date;
  endAt: Date;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

/** Slot per jam operasional untuk satu tanggal WITA. */
export function hourlySlots(date: string): AvailabilitySlot[] {
  const { start } = witaDayRange(date);
  const slots: AvailabilitySlot[] = [];
  for (let hour = bookingRules.openHour; hour < bookingRules.closeHour; hour += 1) {
    const slotStart = new Date(start.getTime() + hour * 3600 * 1000);
    const slotEnd = new Date(slotStart.getTime() + 3600 * 1000);
    slots.push({ startAt: slotStart, endAt: slotEnd, status: "AVAILABLE" });
  }
  return slots;
}

function applyStatus(
  slots: AvailabilitySlot[],
  startAt: Date,
  endAt: Date,
  status: SlotStatus,
) {
  const priority: Record<SlotStatus, number> = {
    AVAILABLE: 0,
    PENDING: 1,
    OCCUPIED: 2,
    BLOCKED: 3,
  };
  for (const slot of slots) {
    if (overlaps(slot.startAt, slot.endAt, startAt, endAt)) {
      if (priority[status] >= priority[slot.status]) {
        slot.status = status;
      }
    }
  }
}

export async function getRoomAvailability(
  roomId: string,
  date: string,
): Promise<RoomAvailability> {
  if (!isValidDateString(date)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Tanggal tidak valid.");
  }
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
  if (!room) throw new ApiError(404, "NOT_FOUND", "Ruangan tidak ditemukan.");

  const { start, end } = witaDayRange(date);
  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        roomId,
        status: { in: ["PENDING", "APPROVED"] },
        startAt: { lt: end },
        endAt: { gt: start },
      },
      select: {
        id: true,
        roomId: true,
        bookingCode: true,
        activityName: true,
        startAt: true,
        endAt: true,
        status: true,
      },
    }),
    prisma.roomScheduleBlock.findMany({
      where: { roomId, startAt: { lt: end }, endAt: { gt: start } },
      select: { id: true, roomId: true, reason: true, startAt: true, endAt: true },
    }),
  ]);

  const slots = hourlySlots(date);
  for (const booking of bookings) {
    applyStatus(
      slots,
      booking.startAt,
      booking.endAt,
      booking.status === "APPROVED" ? "OCCUPIED" : "PENDING",
    );
  }
  for (const block of blocks) {
    applyStatus(slots, block.startAt, block.endAt, "BLOCKED");
  }

  return {
    roomId,
    date,
    slots,
    totalHours: slots.length,
    availableHours: slots.filter((s) => s.status === "AVAILABLE").length,
  };
}

export interface DayRoomOverview {
  room: {
    id: string;
    name: string;
    building: string;
    floor: number;
    capacity: number;
    facilities: string[];
    isActive: boolean;
  };
  slots: AvailabilitySlot[];
  availableHours: number;
}

export interface DayOverview {
  date: string;
  rooms: DayRoomOverview[];
  bookings: BookingRow[];
  blocks: BlockRow[];
  totals: { available: number; pending: number; occupied: number; blocked: number };
}

/** Ringkasan ketersediaan seluruh ruangan pada satu tanggal (untuk kalender). */
export async function getDayOverview(date: string): Promise<DayOverview> {
  if (!isValidDateString(date)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Tanggal tidak valid.");
  }
  const { start, end } = witaDayRange(date);

  const [rooms, bookings, blocks] = await Promise.all([
    prisma.room.findMany({
      where: { isActive: true },
      orderBy: [{ building: "asc" }, { floor: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        building: true,
        floor: true,
        capacity: true,
        facilities: true,
        isActive: true,
      },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ["PENDING", "APPROVED"] },
        startAt: { lt: end },
        endAt: { gt: start },
      },
      select: {
        id: true,
        roomId: true,
        bookingCode: true,
        activityName: true,
        startAt: true,
        endAt: true,
        status: true,
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.roomScheduleBlock.findMany({
      where: { startAt: { lt: end }, endAt: { gt: start } },
      select: { id: true, roomId: true, reason: true, startAt: true, endAt: true },
      orderBy: { startAt: "asc" },
    }),
  ]);

  const roomOverviews: DayRoomOverview[] = rooms.map((room) => {
    const slots = hourlySlots(date);
    for (const booking of bookings.filter((b) => b.roomId === room.id)) {
      applyStatus(
        slots,
        booking.startAt,
        booking.endAt,
        booking.status === "APPROVED" ? "OCCUPIED" : "PENDING",
      );
    }
    for (const block of blocks.filter((b) => b.roomId === room.id)) {
      applyStatus(slots, block.startAt, block.endAt, "BLOCKED");
    }
    return {
      room,
      slots,
      availableHours: slots.filter((s) => s.status === "AVAILABLE").length,
    };
  });

  const totals = { available: 0, pending: 0, occupied: 0, blocked: 0 };
  for (const room of roomOverviews) {
    for (const slot of room.slots) {
      if (slot.status === "AVAILABLE") totals.available += 1;
      else if (slot.status === "PENDING") totals.pending += 1;
      else if (slot.status === "OCCUPIED") totals.occupied += 1;
      else totals.blocked += 1;
    }
  }

  return { date, rooms: roomOverviews, bookings, blocks, totals };
}
