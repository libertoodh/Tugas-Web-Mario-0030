import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { roomSchema } from "@/lib/validation";
import { recordAudit } from "./audit";

export type RoomSummary = Prisma.RoomGetPayload<{
  include: { _count: { select: { bookings: true } } };
}>;

export async function listRooms(
  options: { includeInactive?: boolean; q?: string; category?: string } = {},
) {
  const { includeInactive = false, q, category } = options;
  return prisma.room.findMany({
    where: {
      ...(includeInactive ? {} : { isActive: true }),
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { building: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { bookings: true } } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getRoomById(id: string) {
  return prisma.room.findUnique({ where: { id } });
}

export async function getRoomDetail(id: string) {
  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      _count: { select: { bookings: true } },
    },
  });
  if (!room) throw new ApiError(404, "NOT_FOUND", "Ruangan tidak ditemukan.");
  return room;
}

export async function getRoomUpcomingBookings(roomId: string, limit = 10) {
  return prisma.booking.findMany({
    where: { roomId, status: { in: ["PENDING", "APPROVED"] }, endAt: { gte: new Date() } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { startAt: "asc" },
    take: limit,
  });
}

export async function getRoomHistory(roomId: string, limit = 50) {
  return prisma.booking.findMany({
    where: { roomId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { startAt: "desc" },
    take: limit,
  });
}

export async function createRoom(actorId: string, rawInput: unknown) {
  const input = roomSchema.parse(rawInput);
  try {
    const room = await prisma.room.create({
      data: {
        name: input.name,
        building: input.building,
        floor: input.floor,
        capacity: input.capacity,
        category: input.category || null,
        imageUrl: input.imageUrl || null,
        facilities: input.facilities,
        description: input.description || null,
        isActive: input.isActive ?? true,
      },
    });
    await recordAudit({
      actorId,
      action: "ROOM_CREATED",
      entity: "Room",
      entityId: room.id,
      metadata: { name: room.name, building: room.building },
    });
    return room;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(
        409,
        "CONFLICT",
        "Ruangan dengan nama dan gedung yang sama sudah ada.",
        { name: "Nama ruangan sudah digunakan di gedung ini." },
      );
    }
    throw error;
  }
}

export async function updateRoom(actorId: string, roomId: string, rawInput: unknown) {
  const input = roomSchema.partial().parse(rawInput);
  const existing = await prisma.room.findUnique({ where: { id: roomId } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Ruangan tidak ditemukan.");

  try {
    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.building !== undefined ? { building: input.building } : {}),
        ...(input.floor !== undefined ? { floor: input.floor } : {}),
        ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
        ...(input.category !== undefined ? { category: input.category || null } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl || null } : {}),
        ...(input.facilities !== undefined ? { facilities: input.facilities } : {}),
        ...(input.description !== undefined
          ? { description: input.description || null }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    await recordAudit({
      actorId,
      action: "ROOM_UPDATED",
      entity: "Room",
      entityId: room.id,
      metadata: { name: room.name },
    });
    return room;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(
        409,
        "CONFLICT",
        "Ruangan dengan nama dan gedung yang sama sudah ada.",
        { name: "Nama ruangan sudah digunakan di gedung ini." },
      );
    }
    throw error;
  }
}

/**
 * Menonaktifkan / mengaktifkan ruangan. Ruangan tidak pernah dihapus permanen
 * agar riwayat peminjaman tetap utuh.
 */
export async function setRoomActive(actorId: string, roomId: string, isActive: boolean) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new ApiError(404, "NOT_FOUND", "Ruangan tidak ditemukan.");

  if (!isActive) {
    const upcoming = await prisma.booking.count({
      where: {
        roomId,
        status: "APPROVED",
        endAt: { gte: new Date() },
      },
    });
    if (upcoming > 0) {
      throw new ApiError(
        409,
        "RULE_VIOLATION",
        `Ruangan masih memiliki ${upcoming} peminjaman disetujui yang akan datang. Batalkan atau selesaikan jadwal tersebut sebelum menonaktifkan ruangan.`,
      );
    }
  }

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: { isActive },
  });
  await recordAudit({
    actorId,
    action: isActive ? "ROOM_ACTIVATED" : "ROOM_DEACTIVATED",
    entity: "Room",
    entityId: roomId,
    metadata: { name: room.name },
  });
  return updated;
}

export async function createScheduleBlock(actorId: string, rawInput: unknown) {
  const { scheduleBlockSchema } = await import("@/lib/validation");
  const input = scheduleBlockSchema.parse(rawInput);
  const { witaDateTimeToUtc } = await import("@/lib/time");
  const startAt = witaDateTimeToUtc(input.date, input.startTime);
  const endAt = witaDateTimeToUtc(input.date, input.endTime);
  if (endAt <= startAt) {
    throw new ApiError(422, "VALIDATION_ERROR", "Jam selesai harus setelah jam mulai.");
  }

  const room = await prisma.room.findUnique({ where: { id: input.roomId } });
  if (!room) throw new ApiError(404, "NOT_FOUND", "Ruangan tidak ditemukan.");

  try {
    const block = await prisma.roomScheduleBlock.create({
      data: {
        roomId: input.roomId,
        startAt,
        endAt,
        reason: input.reason,
        source: input.source,
        createdById: actorId,
      },
    });
    await recordAudit({
      actorId,
      action: "SCHEDULE_BLOCK_CREATED",
      entity: "RoomScheduleBlock",
      entityId: block.id,
      metadata: { roomId: input.roomId, reason: input.reason },
    });
    return block;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2004" || error.message.includes("23P01"))
    ) {
      throw new ApiError(409, "CONFLICT", "Blokir jadwal bertabrakan dengan blokir lain.");
    }
    throw error;
  }
}

export async function deleteScheduleBlock(actorId: string, blockId: string) {
  const block = await prisma.roomScheduleBlock.findUnique({ where: { id: blockId } });
  if (!block) throw new ApiError(404, "NOT_FOUND", "Blokir jadwal tidak ditemukan.");
  await prisma.roomScheduleBlock.delete({ where: { id: blockId } });
  await recordAudit({
    actorId,
    action: "SCHEDULE_BLOCK_DELETED",
    entity: "RoomScheduleBlock",
    entityId: blockId,
  });
}
