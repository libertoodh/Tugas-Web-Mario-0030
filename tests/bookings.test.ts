import { beforeEach, describe, expect, it } from "vitest";
import {
  approveBooking,
  cancelBooking,
  createBooking,
  getBookingForViewer,
  listMyBookings,
  rejectBooking,
} from "@/server/services/bookings";
import { getRoomAvailability } from "@/server/services/availability";
import {
  acting,
  createRoom,
  createUser,
  futureSlot,
  prisma,
  resetDatabase,
} from "./helpers";

describe("Alur peminjaman ruangan", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("pengajuan valid berhasil dibuat dengan status Menunggu Persetujuan", async () => {
    const { user } = await createUser();
    const room = await createRoom();
    const slot = futureSlot(3, "09:00", "11:00");

    const booking = await createBooking(acting(user), {
      roomId: room.id,
      ...slot,
      activityName: "Workshop Desain",
      participantCount: 25,
      purpose: "Workshop desain untuk mahasiswa semester 3.",
    });

    expect(booking.status).toBe("PENDING");
    expect(booking.bookingCode).toMatch(/^BK-\d{6}-[A-Z0-9]{4}$/);
    expect(booking.startAt.toISOString()).toBe(new Date(`${slot.date}T09:00:00+08:00`).toISOString());

    const notifications = await prisma.notification.findMany({ where: { bookingId: booking.id } });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it("menolak jam selesai yang lebih awal dari jam mulai", async () => {
    const { user } = await createUser();
    const room = await createRoom();

    await expect(
      createBooking(acting(user), {
        roomId: room.id,
        ...futureSlot(3, "13:00", "11:00"),
        activityName: "Uji Validasi",
        participantCount: 10,
        purpose: "Menguji validasi jam.",
      }),
    ).rejects.toThrow();
  });

  it("menolak peserta melebihi kapasitas ruangan", async () => {
    const { user } = await createUser();
    const room = await createRoom();

    await expect(
      createBooking(acting(user), {
        roomId: room.id,
        ...futureSlot(),
        activityName: "Kelas Besar",
        participantCount: room.capacity + 1,
        purpose: "Menguji batas kapasitas ruangan.",
      }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("menolak pengajuan yang bentrok dengan peminjaman yang sudah disetujui", async () => {
    const { user } = await createUser();
    const { user: admin } = await createUser({ role: "ADMIN" });
    const room = await createRoom();
    const slot = futureSlot(4, "10:00", "12:00");

    const first = await createBooking(acting(user), {
      roomId: room.id,
      ...slot,
      activityName: "Kegiatan Pertama",
      participantCount: 20,
      purpose: "Kegiatan pertama pada slot yang sama.",
    });
    await approveBooking(admin.id, first.id);

    await expect(
      createBooking(acting(user), {
        roomId: room.id,
        ...slot,
        activityName: "Kegiatan Kedua",
        participantCount: 20,
        purpose: "Kegiatan kedua pada slot yang sama.",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("admin dapat menyetujui pengajuan", async () => {
    const { user } = await createUser();
    const { user: admin } = await createUser({ role: "ADMIN" });
    const room = await createRoom();

    const booking = await createBooking(acting(user), {
      roomId: room.id,
      ...futureSlot(),
      activityName: "Seminar",
      participantCount: 30,
      purpose: "Seminar tugas akhir.",
    });

    const approved = await approveBooking(admin.id, booking.id);
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedBy).toBe(admin.id);
    expect(approved.approvedAt).not.toBeNull();

    const notification = await prisma.notification.findFirst({
      where: { bookingId: booking.id, type: "BOOKING_APPROVED" },
    });
    expect(notification).not.toBeNull();
  });

  it("admin tidak dapat menolak pengajuan tanpa alasan", async () => {
    const { user } = await createUser();
    const { user: admin } = await createUser({ role: "ADMIN" });
    const room = await createRoom();

    const booking = await createBooking(acting(user), {
      roomId: room.id,
      ...futureSlot(),
      activityName: "Rapat",
      participantCount: 10,
      purpose: "Rapat koordinasi.",
    });

    await expect(rejectBooking(admin.id, booking.id, "")).rejects.toMatchObject({ status: 422 });
    await expect(rejectBooking(admin.id, booking.id, "   ")).rejects.toMatchObject({ status: 422 });

    const rejected = await rejectBooking(
      admin.id,
      booking.id,
      "Ruangan sudah dipakai untuk jadwal kuliah.",
    );
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionReason).toContain("jadwal kuliah");
  });

  it("pemohon tidak dapat melihat pengajuan milik pengguna lain", async () => {
    const { user: owner } = await createUser();
    const { user: other } = await createUser();
    const room = await createRoom();

    const booking = await createBooking(acting(owner), {
      roomId: room.id,
      ...futureSlot(),
      activityName: "Kegiatan Privat",
      participantCount: 12,
      purpose: "Kegiatan milik pemohon lain.",
    });

    await expect(getBookingForViewer(acting(other), booking.id)).rejects.toMatchObject({
      status: 403,
    });

    const othersList = await listMyBookings(other.id, {});
    expect(othersList.find((item) => item.id === booking.id)).toBeUndefined();

    const ownersList = await listMyBookings(owner.id, {});
    expect(ownersList).toHaveLength(1);
  });

  it("pemohon hanya dapat membatalkan pengajuannya sendiri", async () => {
    const { user: owner } = await createUser();
    const { user: other } = await createUser();
    const room = await createRoom();

    const booking = await createBooking(acting(owner), {
      roomId: room.id,
      ...futureSlot(),
      activityName: "Kegiatan",
      participantCount: 15,
      purpose: "Kegiatan untuk uji pembatalan.",
    });

    await expect(cancelBooking(acting(other), booking.id)).rejects.toMatchObject({ status: 403 });

    const cancelled = await cancelBooking(acting(owner), booking.id);
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelledAt).not.toBeNull();
  });

  it("ruangan kembali tersedia setelah pembatalan bila tidak ada jadwal lain", async () => {
    const { user } = await createUser();
    const { user: admin } = await createUser({ role: "ADMIN" });
    const room = await createRoom();
    const slot = futureSlot(5, "14:00", "16:00");

    const first = await createBooking(acting(user), {
      roomId: room.id,
      ...slot,
      activityName: "Kegiatan Awal",
      participantCount: 20,
      purpose: "Kegiatan yang akan dibatalkan.",
    });
    await approveBooking(admin.id, first.id);

    const before = await getRoomAvailability(room.id, slot.date);
    const slotBefore = before.slots.find((item) => item.startAt.toISOString() === new Date(`${slot.date}T14:00:00+08:00`).toISOString());
    expect(slotBefore?.status).toBe("OCCUPIED");

    await cancelBooking(acting(user), first.id);

    const after = await getRoomAvailability(room.id, slot.date);
    const slotAfter = after.slots.find((item) => item.startAt.toISOString() === new Date(`${slot.date}T14:00:00+08:00`).toISOString());
    expect(slotAfter?.status).toBe("AVAILABLE");

    const second = await createBooking(acting(user), {
      roomId: room.id,
      ...slot,
      activityName: "Kegiatan Pengganti",
      participantCount: 20,
      purpose: "Mengisi slot setelah pembatalan.",
    });
    const approvedSecond = await approveBooking(admin.id, second.id);
    expect(approvedSecond.status).toBe("APPROVED");
  });

  it("menolak pembatalan pengajuan yang sudah ditolak", async () => {
    const { user } = await createUser();
    const { user: admin } = await createUser({ role: "ADMIN" });
    const room = await createRoom();

    const booking = await createBooking(acting(user), {
      roomId: room.id,
      ...futureSlot(),
      activityName: "Kegiatan",
      participantCount: 10,
      purpose: "Kegiatan untuk uji status.",
    });
    await rejectBooking(admin.id, booking.id, "Jadwal tidak tersedia.");

    await expect(cancelBooking(acting(user), booking.id)).rejects.toMatchObject({ status: 409 });
  });

  it("mencegah pengajuan ganda yang identik (klik ganda / kirim ulang)", async () => {
    const { user } = await createUser();
    const room = await createRoom();
    const slot = futureSlot(6, "09:00", "11:00");
    const payload = {
      roomId: room.id,
      ...slot,
      activityName: "Kegiatan Ganda",
      participantCount: 20,
      purpose: "Menguji pencegahan data ganda.",
    };

    const first = await createBooking(acting(user), payload);
    await expect(createBooking(acting(user), payload)).rejects.toMatchObject({
      status: 409,
      details: { bookingCode: first.bookingCode },
    });

    const total = await prisma.booking.count({ where: { userId: user.id } });
    expect(total).toBe(1);
  });

  it("pengajuan yang sudah diputuskan tidak dapat disetujui ulang", async () => {
    const { user } = await createUser();
    const { user: admin } = await createUser({ role: "ADMIN" });
    const room = await createRoom();

    const booking = await createBooking(acting(user), {
      roomId: room.id,
      ...futureSlot(),
      activityName: "Kegiatan",
      participantCount: 10,
      purpose: "Menguji keputusan ganda.",
    });

    await approveBooking(admin.id, booking.id);
    await expect(approveBooking(admin.id, booking.id)).rejects.toMatchObject({ status: 409 });
  });

  it("menyimpan informasi penolakan dan notifikasi ke pemohon", async () => {
    const { user } = await createUser();
    const { user: admin } = await createUser({ role: "ADMIN" });
    const room = await createRoom();

    const booking = await createBooking(acting(user), {
      roomId: room.id,
      ...futureSlot(),
      activityName: "Kegiatan",
      participantCount: 10,
      purpose: "Kegiatan untuk uji notifikasi.",
    });

    await rejectBooking(admin.id, booking.id, "Bentrok dengan jadwal kuliah.");

    const notifications = await prisma.notification.findMany({
      where: { bookingId: booking.id, userId: user.id },
    });
    const rejected = notifications.find((item) => item.type === "BOOKING_REJECTED");
    expect(rejected).toBeDefined();
    expect(rejected?.message).toContain("Bentrok dengan jadwal kuliah");

    const userNotifications = await prisma.notification.findMany({ where: { userId: user.id } });
    expect(userNotifications.every((item) => item.userId === user.id)).toBe(true);
  });
});
