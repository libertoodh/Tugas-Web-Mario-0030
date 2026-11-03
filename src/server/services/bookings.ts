import { Booking, BookingStatus, Prisma, PrismaClient, Room } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { bookingRules } from "@/lib/config";
import {
  bookingCreateSchema,
  bookingRejectSchema,
  listBookingsQuerySchema,
} from "@/lib/validation";
import {
  addDaysToDateString,
  daysBetweenDateStrings,
  formatWita,
  todayWita,
  witaDateTimeToUtc,
  witaDayRange,
} from "@/lib/time";
import { recordAudit } from "./audit";
import { notify, notifyAdmins } from "./notifications";
import { SessionRole } from "@/lib/session-token";

type Db = PrismaClient | Prisma.TransactionClient;

export interface ActingUser {
  id: string;
  name: string;
  email: string;
  role: SessionRole;
}

export type BookingWithRoom = Booking & {
  room: Pick<Room, "id" | "name" | "building" | "floor" | "capacity">;
};

export interface ConflictSuggestion {
  roomId: string;
  roomName: string;
  start: string;
  end: string;
  label: string;
}

function generateBookingCode(startAt: Date): string {
  const datePart = startAt.toISOString().slice(0, 10).replace(/-/g, "").slice(2);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BK-${datePart}-${random}`;
}

/** Cek bentrok dengan peminjaman yang SUDAH DISETUJUI. */
async function findApprovedConflicts(
  db: Db,
  roomId: string,
  startAt: Date,
  endAt: Date,
  excludeBookingId?: string,
) {
  return db.$queryRaw<Array<{ id: string; bookingCode: string; startAt: Date; endAt: Date }>>`
    SELECT "id", "bookingCode", "startAt", "endAt"
    FROM "Booking"
    WHERE "roomId" = ${roomId}
      AND "status" = 'APPROVED'
      AND (${excludeBookingId ?? null}::text IS NULL OR "id" <> ${excludeBookingId ?? null})
      AND tstzrange("startAt", "endAt", '[)') && tstzrange(${startAt}::timestamptz, ${endAt}::timestamptz, '[)')
    ORDER BY "startAt"
    LIMIT 10
  `;
}

/** Cek bentrok dengan blokir jadwal (mis. jadwal kuliah). */
async function findBlockConflicts(
  db: Db,
  roomId: string,
  startAt: Date,
  endAt: Date,
) {
  return db.$queryRaw<Array<{ id: string; reason: string; startAt: Date; endAt: Date }>>`
    SELECT "id", "reason", "startAt", "endAt"
    FROM "RoomScheduleBlock"
    WHERE "roomId" = ${roomId}
      AND tstzrange("startAt", "endAt", '[)') && tstzrange(${startAt}::timestamptz, ${endAt}::timestamptz, '[)')
    ORDER BY "startAt"
    LIMIT 10
  `;
}

/** Mengunci baris ruangan agar keputusan untuk ruangan yang sama diproses berurutan. */
async function lockRoom(db: Db, roomId: string) {
  await db.$queryRaw`SELECT "id" FROM "Room" WHERE "id" = ${roomId} FOR UPDATE`;
}

export async function suggestAlternatives(
  roomId: string,
  startAt: Date,
  endAt: Date,
  limit = 3,
): Promise<ConflictSuggestion[]> {
  const date = startAt.toISOString();
  void date;
  const rooms = await prisma.room.findMany({
    where: { isActive: true, id: { not: roomId } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const suggestions: ConflictSuggestion[] = [];
  const durationMs = endAt.getTime() - startAt.getTime();

  for (const room of rooms) {
    if (suggestions.length >= limit) break;
    const [approved, blocks] = await Promise.all([
      findApprovedConflicts(prisma, room.id, startAt, endAt),
      findBlockConflicts(prisma, room.id, startAt, endAt),
    ]);
    if (approved.length === 0 && blocks.length === 0) {
      suggestions.push({
        roomId: room.id,
        roomName: room.name,
        start: formatWita(startAt, "HH:mm"),
        end: formatWita(endAt, "HH:mm"),
        label: `${room.name} pada jam yang sama`,
      });
    }
  }

  // Saran jam lain di ruangan yang sama pada hari yang sama.
  if (suggestions.length < limit + 2) {
    const dayStart = witaDayRange(formatWita(startAt, "yyyy-MM-dd")).start;
    for (let hour = bookingRules.openHour; hour < bookingRules.closeHour; hour += 1) {
      if (suggestions.length >= limit + 2) break;
      const candidateStart = new Date(dayStart.getTime() + hour * 60 * 60 * 1000);
      const candidateEnd = new Date(candidateStart.getTime() + durationMs);
      if (candidateStart.getTime() === startAt.getTime()) continue;
      if (candidateEnd.getTime() > dayStart.getTime() + bookingRules.closeHour * 3600 * 1000) continue;
      const [approved, blocks] = await Promise.all([
        findApprovedConflicts(prisma, roomId, candidateStart, candidateEnd),
        findBlockConflicts(prisma, roomId, candidateStart, candidateEnd),
      ]);
      if (approved.length === 0 && blocks.length === 0) {
        suggestions.push({
          roomId,
          roomName: "Ruangan ini",
          start: formatWita(candidateStart, "HH:mm"),
          end: formatWita(candidateEnd, "HH:mm"),
          label: `Jam ${formatWita(candidateStart, "HH:mm")}–${formatWita(candidateEnd, "HH:mm")} di ruangan yang sama`,
        });
      }
    }
  }

  return suggestions.slice(0, limit + 2);
}

function validateScheduleRules(date: string, startAt: Date) {
  const today = todayWita();
  const lead = daysBetweenDateStrings(today, date);

  if (lead < 0) {
    throw new ApiError(422, "RULE_VIOLATION", "Tanggal peminjaman sudah lewat.");
  }
  if (lead < bookingRules.minLeadDays) {
    throw new ApiError(
      422,
      "RULE_VIOLATION",
      `Pengajuan paling lambat ${bookingRules.minLeadDays} hari sebelum tanggal peminjaman (H-${bookingRules.minLeadDays}).`,
    );
  }
  if (lead > bookingRules.maxAdvanceDays) {
    throw new ApiError(
      422,
      "RULE_VIOLATION",
      `Pengajuan hanya dapat dibuat maksimal ${bookingRules.maxAdvanceDays} hari ke depan.`,
    );
  }
  if (startAt.getTime() <= Date.now()) {
    throw new ApiError(422, "RULE_VIOLATION", "Waktu peminjaman sudah lewat.");
  }
}

function slotLabel(startAt: Date, endAt: Date): string {
  return `${formatWita(startAt, "d MMM yyyy")} pukul ${formatWita(startAt, "HH:mm")}–${formatWita(endAt, "HH:mm")} WITA`;
}

export async function createBooking(user: ActingUser, rawInput: unknown) {
  const input = bookingCreateSchema.parse(rawInput);

  if (user.role !== "PEMOHON" && user.role !== "ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Peran pengguna tidak dikenali.");
  }

  const room = await prisma.room.findUnique({ where: { id: input.roomId } });
  if (!room) throw new ApiError(404, "NOT_FOUND", "Ruangan tidak ditemukan.");
  if (!room.isActive) {
    throw new ApiError(409, "RULE_VIOLATION", "Ruangan sedang dinonaktifkan.");
  }
  // Kapasitas 0 berarti belum tercatat di sumber resmi, jadi tidak membatasi.
  if (room.capacity > 0 && input.participantCount > room.capacity) {
    throw new ApiError(
      422,
      "RULE_VIOLATION",
      `Jumlah peserta (${input.participantCount}) melebihi kapasitas ruangan (${room.capacity} orang).`,
    );
  }

  const startAt = witaDateTimeToUtc(input.date, input.startTime);
  const endAt = witaDateTimeToUtc(input.date, input.endTime);
  validateScheduleRules(input.date, startAt);

  const created = await prisma.$transaction(
    async (tx) => {
      // Kunci ruangan: pembuatan & persetujuan untuk ruangan sama menjadi serial.
      await lockRoom(tx, room.id);

      const [approvedConflicts, blockConflicts] = await Promise.all([
        findApprovedConflicts(tx, room.id, startAt, endAt),
        findBlockConflicts(tx, room.id, startAt, endAt),
      ]);

      if (approvedConflicts.length > 0 || blockConflicts.length > 0) {
        const suggestions = await suggestAlternatives(room.id, startAt, endAt);
        const reason =
          blockConflicts.length > 0
            ? `Ruangan tidak tersedia pada ${slotLabel(startAt, endAt)} karena diblokir (${blockConflicts[0].reason}).`
            : `Ruangan sudah dipesan pada ${slotLabel(startAt, endAt)}.`;
        throw new ApiError(409, "CONFLICT", reason, { suggestions });
      }

      const duplicate = await tx.booking.findFirst({
        where: {
          userId: user.id,
          roomId: room.id,
          startAt,
          endAt,
          status: { in: ["PENDING", "APPROVED"] },
        },
        select: { id: true, bookingCode: true },
      });
      if (duplicate) {
        throw new ApiError(
          409,
          "CONFLICT",
          `Pengajuan serupa sudah ada (${duplicate.bookingCode}). Cek halaman Riwayat untuk menghindari data ganda.`,
          { bookingId: duplicate.id, bookingCode: duplicate.bookingCode },
        );
      }

      return tx.booking.create({
        data: {
          bookingCode: generateBookingCode(startAt),
          userId: user.id,
          roomId: room.id,
          startAt,
          endAt,
          activityName: input.activityName,
          participantCount: input.participantCount,
          purpose: input.purpose,
          status: "PENDING",
        },
        include: {
          room: { select: { id: true, name: true, building: true, floor: true, capacity: true } },
        },
      });
    },
    { timeout: 20000 },
  );

  await recordAudit({
    actorId: user.id,
    action: "BOOKING_CREATED",
    entity: "Booking",
    entityId: created.id,
    metadata: {
      bookingCode: created.bookingCode,
      roomId: room.id,
      startAt: created.startAt.toISOString(),
      endAt: created.endAt.toISOString(),
    },
  });

  const summary = slotLabel(startAt, endAt);
  await notify({
    userId: user.id,
    bookingId: created.id,
    type: "BOOKING_CREATED",
    title: "Pengajuan peminjaman diterima",
    message: `Pengajuan ${created.bookingCode} untuk ${room.name} pada ${summary} berstatus Menunggu Persetujuan.`,
    email: {
      to: user.email,
      subject: `[IDB Bali] Pengajuan ${created.bookingCode} diterima`,
      text: `Halo ${user.name},\n\nPengajuan peminjaman ruangan Anda telah kami terima.\n\nKode: ${created.bookingCode}\nRuangan: ${room.name} (${room.building}, lantai ${room.floor})\nWaktu: ${summary}\nKegiatan: ${input.activityName}\nStatus: Menunggu Persetujuan\n\nAnda akan menerima pemberitahuan setelah admin memproses pengajuan.\n\nSistem Peminjaman Ruangan - IDB Bali`,
    },
  });

  await notifyAdmins({
    bookingId: created.id,
    type: "BOOKING_CREATED",
    title: "Pengajuan peminjaman baru",
    message: `${user.name} mengajukan ${room.name} pada ${summary} (${created.bookingCode}).`,
    email: {
      to: "",
      subject: `[IDB Bali] Pengajuan baru ${created.bookingCode}`,
      text: `Pengajuan baru menunggu keputusan.\n\nKode: ${created.bookingCode}\nPemohon: ${user.name} <${user.email}>\nRuangan: ${room.name} (${room.building}, lantai ${room.floor})\nWaktu: ${summary}\nKegiatan: ${input.activityName}\nPeserta: ${input.participantCount}\n\nBuka dashboard admin untuk memproses.`,
    },
  });

  return created;
}

export async function approveBooking(adminId: string, bookingId: string) {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "ADMIN" || !admin.isActive) {
    throw new ApiError(403, "FORBIDDEN", "Hanya admin yang dapat menyetujui pengajuan.");
  }

  const updated = await prisma.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          room: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });
      if (!booking) throw new ApiError(404, "NOT_FOUND", "Pengajuan tidak ditemukan.");

      await lockRoom(tx, booking.roomId);

      const fresh = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!fresh) throw new ApiError(404, "NOT_FOUND", "Pengajuan tidak ditemukan.");
      if (fresh.status !== "PENDING") {
        throw new ApiError(
          409,
          "CONFLICT",
          `Pengajuan berstatus ${fresh.status} dan tidak dapat disetujui lagi.`,
        );
      }
      if (fresh.endAt.getTime() <= Date.now()) {
        throw new ApiError(422, "RULE_VIOLATION", "Jadwal pengajuan sudah lewat.");
      }

      const [conflicts, blocks] = await Promise.all([
        findApprovedConflicts(tx, fresh.roomId, fresh.startAt, fresh.endAt, fresh.id),
        findBlockConflicts(tx, fresh.roomId, fresh.startAt, fresh.endAt),
      ]);
      if (conflicts.length > 0 || blocks.length > 0) {
        throw new ApiError(
          409,
          "CONFLICT",
          "Jadwal ruangan sudah tidak tersedia. Tolak pengajuan ini atau minta pemohon memilih waktu lain.",
          {
            conflicts: conflicts.map((c) => ({
              bookingCode: c.bookingCode,
              startAt: c.startAt,
              endAt: c.endAt,
            })),
            blocks: blocks.map((b) => ({ reason: b.reason, startAt: b.startAt, endAt: b.endAt })),
          },
        );
      }

      const result = await tx.booking.update({
        where: { id: fresh.id },
        data: { status: "APPROVED", approvedBy: adminId, approvedAt: new Date() },
        include: {
          room: { select: { id: true, name: true, building: true, floor: true, capacity: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return result;
    },
    { timeout: 20000 },
  );

  const summary = slotLabel(updated.startAt, updated.endAt);

  await recordAudit({
    actorId: adminId,
    action: "BOOKING_APPROVED",
    entity: "Booking",
    entityId: updated.id,
    metadata: { bookingCode: updated.bookingCode },
  });

  await notify({
    userId: updated.userId,
    bookingId: updated.id,
    type: "BOOKING_APPROVED",
    title: "Pengajuan disetujui",
    message: `Pengajuan ${updated.bookingCode} untuk ${updated.room.name} pada ${summary} telah disetujui.`,
    email: {
      to: updated.user.email,
      subject: `[IDB Bali] Pengajuan ${updated.bookingCode} disetujui`,
      text: `Halo ${updated.user.name},\n\nPengajuan Anda telah DISETUJUI.\n\nKode: ${updated.bookingCode}\nRuangan: ${updated.room.name} (${updated.room.building}, lantai ${updated.room.floor})\nWaktu: ${summary}\nKegiatan: ${updated.activityName}\n\nMohon gunakan ruangan sesuai jadwal dan jaga kebersihan.\n\nSistem Peminjaman Ruangan - IDB Bali`,
    },
  });

  return updated;
}

export async function rejectBooking(adminId: string, bookingId: string, rawReason: unknown) {
  const reason =
    typeof rawReason === "string"
      ? rawReason
      : (bookingRejectSchema.parse(rawReason).reason);

  const parsed = bookingRejectSchema.safeParse({ reason });
  if (!parsed.success) {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "Alasan penolakan wajib diisi minimal 5 karakter.",
      { reason: parsed.error.issues[0]?.message },
    );
  }

  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "ADMIN" || !admin.isActive) {
    throw new ApiError(403, "FORBIDDEN", "Hanya admin yang dapat menolak pengajuan.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!booking) throw new ApiError(404, "NOT_FOUND", "Pengajuan tidak ditemukan.");

    await lockRoom(tx, booking.roomId);
    const fresh = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!fresh) throw new ApiError(404, "NOT_FOUND", "Pengajuan tidak ditemukan.");
    if (fresh.status !== "PENDING") {
      throw new ApiError(409, "CONFLICT", "Hanya pengajuan yang menunggu yang dapat ditolak.");
    }

    return tx.booking.update({
      where: { id: fresh.id },
      data: {
        status: "REJECTED",
        rejectionReason: parsed.data.reason,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
      include: {
        room: { select: { id: true, name: true, building: true, floor: true, capacity: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  });

  const summary = slotLabel(updated.startAt, updated.endAt);

  await recordAudit({
    actorId: adminId,
    action: "BOOKING_REJECTED",
    entity: "Booking",
    entityId: updated.id,
    metadata: { bookingCode: updated.bookingCode, reason: parsed.data.reason },
  });

  await notify({
    userId: updated.userId,
    bookingId: updated.id,
    type: "BOOKING_REJECTED",
    title: "Pengajuan ditolak",
    message: `Pengajuan ${updated.bookingCode} untuk ${updated.room.name} pada ${summary} ditolak. Alasan: ${parsed.data.reason}`,
    email: {
      to: updated.user.email,
      subject: `[IDB Bali] Pengajuan ${updated.bookingCode} ditolak`,
      text: `Halo ${updated.user.name},\n\nPengajuan Anda DITOLAK.\n\nKode: ${updated.bookingCode}\nRuangan: ${updated.room.name}\nWaktu: ${summary}\nKegiatan: ${updated.activityName}\nAlasan penolakan: ${parsed.data.reason}\n\nSilakan ajukan jadwal atau ruangan lain.\n\nSistem Peminjaman Ruangan - IDB Bali`,
    },
  });

  return updated;
}

export async function cancelBooking(actor: ActingUser, bookingId: string) {
  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!booking) throw new ApiError(404, "NOT_FOUND", "Pengajuan tidak ditemukan.");

    if (actor.role !== "ADMIN" && booking.userId !== actor.id) {
      throw new ApiError(403, "FORBIDDEN", "Anda hanya dapat membatalkan pengajuan milik sendiri.");
    }
    if (booking.status !== "PENDING" && booking.status !== "APPROVED") {
      throw new ApiError(
        409,
        "RULE_VIOLATION",
        `Pengajuan berstatus ${booking.status} tidak dapat dibatalkan.`,
      );
    }
    if (actor.role !== "ADMIN" && booking.startAt.getTime() <= Date.now()) {
      throw new ApiError(
        409,
        "RULE_VIOLATION",
        "Peminjaman yang sudah dimulai tidak dapat dibatalkan.",
      );
    }

    return tx.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
      include: {
        room: { select: { id: true, name: true, building: true, floor: true, capacity: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  });

  const summary = slotLabel(updated.startAt, updated.endAt);
  const byAdmin = actor.role === "ADMIN" && updated.userId !== actor.id;

  await recordAudit({
    actorId: actor.id,
    action: byAdmin ? "BOOKING_CANCELLED_BY_ADMIN" : "BOOKING_CANCELLED_BY_USER",
    entity: "Booking",
    entityId: updated.id,
    metadata: { bookingCode: updated.bookingCode },
  });

  await notify({
    userId: updated.userId,
    bookingId: updated.id,
    type: "BOOKING_CANCELLED",
    title: byAdmin ? "Peminjaman dibatalkan admin" : "Pengajuan dibatalkan",
    message: byAdmin
      ? `Peminjaman ${updated.bookingCode} untuk ${updated.room.name} pada ${summary} dibatalkan oleh admin sarana prasarana.`
      : `Pengajuan ${updated.bookingCode} untuk ${updated.room.name} pada ${summary} telah dibatalkan. Ruangan kembali tersedia.`,
    email: {
      to: updated.user.email,
      subject: `[IDB Bali] Peminjaman ${updated.bookingCode} dibatalkan`,
      text: `Halo ${updated.user.name},\n\nPeminjaman berikut telah DIBATALKAN${byAdmin ? " oleh admin sarana prasarana" : ""}.\n\nKode: ${updated.bookingCode}\nRuangan: ${updated.room.name}\nWaktu: ${summary}\n\nRuangan kembali tersedia untuk peminjaman lain apabila tidak ada jadwal yang bertabrakan.\n\nSistem Peminjaman Ruangan - IDB Bali`,
    },
  });

  if (!byAdmin) {
    await notifyAdmins({
      bookingId: updated.id,
      type: "BOOKING_CANCELLED",
      title: "Pengajuan dibatalkan pemohon",
      message: `${actor.name} membatalkan ${updated.bookingCode} (${updated.room.name}, ${summary}).`,
      email: {
        to: "",
        subject: `[IDB Bali] Pembatalan ${updated.bookingCode}`,
        text: `Pemohon membatalkan pengajuan.\n\nKode: ${updated.bookingCode}\nPemohon: ${actor.name} <${actor.email}>\nRuangan: ${updated.room.name}\nWaktu: ${summary}`,
      },
    });
  }

  return updated;
}

export async function getBookingForViewer(actor: ActingUser, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      room: true,
      user: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true } },
      notifications: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!booking) throw new ApiError(404, "NOT_FOUND", "Pengajuan tidak ditemukan.");
  if (actor.role !== "ADMIN" && booking.userId !== actor.id) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke pengajuan ini.");
  }
  return booking;
}

export function buildBookingWhere(
  userId: string | undefined,
  query: unknown,
): Prisma.BookingWhereInput {
  const filters = listBookingsQuerySchema.parse(query ?? {});
  const where: Prisma.BookingWhereInput = {};

  if (userId) where.userId = userId;
  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status as BookingStatus;
  }
  if (filters.roomId) where.roomId = filters.roomId;
  if (filters.date) {
    const { start, end } = witaDayRange(filters.date);
    where.startAt = { gte: start, lt: end };
  }
  if (filters.q) {
    const q = filters.q;
    where.OR = [
      { bookingCode: { contains: q, mode: "insensitive" } },
      { activityName: { contains: q, mode: "insensitive" } },
      { room: { name: { contains: q, mode: "insensitive" } } },
      { purpose: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listMyBookings(userId: string, query: unknown) {
  return prisma.booking.findMany({
    where: buildBookingWhere(userId, query),
    include: {
      room: { select: { id: true, name: true, building: true, floor: true, capacity: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });
}

export async function listAllBookings(query: unknown) {
  return prisma.booking.findMany({
    where: buildBookingWhere(undefined, query),
    include: {
      room: { select: { id: true, name: true, building: true, floor: true, capacity: true } },
      user: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });
}

export async function getRequesterSummary(userId: string) {
  const now = new Date();
  const [grouped, latest, upcoming] = await Promise.all([
    prisma.booking.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.booking.findMany({
      where: { userId },
      include: { room: { select: { id: true, name: true, building: true, floor: true, capacity: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.booking.findMany({
      where: { userId, status: "APPROVED", startAt: { gte: now } },
      include: { room: { select: { id: true, name: true, building: true, floor: true, capacity: true } } },
      orderBy: { startAt: "asc" },
      take: 5,
    }),
  ]);

  const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 } as Record<BookingStatus, number>;
  for (const row of grouped) counts[row.status] = row._count._all;

  return { counts, latest, upcoming };
}

export async function getAdminSummary() {
  const now = new Date();
  const [roomCount, activeRoomCount, grouped, latest, pending, upcoming] = await Promise.all([
    prisma.room.count(),
    prisma.room.count({ where: { isActive: true } }),
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.booking.findMany({
      include: {
        room: { select: { id: true, name: true, building: true, floor: true, capacity: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.booking.findMany({
      where: { status: "PENDING" },
      include: {
        room: { select: { id: true, name: true, building: true, floor: true, capacity: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startAt: "asc" },
      take: 20,
    }),
    prisma.booking.findMany({
      where: { status: "APPROVED", startAt: { gte: now } },
      include: {
        room: { select: { id: true, name: true, building: true, floor: true, capacity: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startAt: "asc" },
      take: 10,
    }),
  ]);

  const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 } as Record<BookingStatus, number>;
  for (const row of grouped) counts[row.status] = row._count._all;

  return { roomCount, activeRoomCount, counts, latest, pending, upcoming };
}

export { addDaysToDateString };
