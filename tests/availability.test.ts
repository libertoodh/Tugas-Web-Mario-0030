import { beforeEach, describe, expect, it } from "vitest";
import { getDayOverview, getRoomAvailability } from "@/server/services/availability";
import { createScheduleBlock } from "@/server/services/rooms";
import { approveBooking, createBooking } from "@/server/services/bookings";
import { createRoom, createUser, futureSlot, resetDatabase } from "./helpers";

describe("Ketersediaan dan kalender", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("menampilkan status menunggu, terisi, dan diblokir secara konsisten", async () => {
    const { user } = await createUser();
    const { user: admin } = await createUser({ role: "ADMIN" });
    const room = await createRoom("Studio Uji");
    const date = futureSlot(9, "08:00", "09:00").date;

    const pending = await createBooking(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      {
        roomId: room.id,
        date,
        startTime: "08:00",
        endTime: "09:00",
        activityName: "Menunggu",
        participantCount: 10,
        purpose: "Menguji status menunggu.",
      },
    );

    const approved = await createBooking(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      {
        roomId: room.id,
        date,
        startTime: "10:00",
        endTime: "11:00",
        activityName: "Disetujui",
        participantCount: 10,
        purpose: "Menguji status terisi.",
      },
    );
    await approveBooking(admin.id, approved.id);

    await createScheduleBlock(admin.id, {
      roomId: room.id,
      date,
      startTime: "13:00",
      endTime: "14:00",
      reason: "Jadwal kuliah",
      source: "ACADEMIC_SCHEDULE",
    });

    const availability = await getRoomAvailability(room.id, date);
    const byHour = (hour: string) =>
      availability.slots.find(
        (slot) => slot.startAt.toISOString() === new Date(`${date}T${hour}:00+08:00`).toISOString(),
      )?.status;

    expect(byHour("08:00")).toBe("PENDING");
    expect(byHour("10:00")).toBe("OCCUPIED");
    expect(byHour("13:00")).toBe("BLOCKED");
    expect(byHour("09:00")).toBe("AVAILABLE");

    const overview = await getDayOverview(date);
    expect(overview.rooms.some((item) => item.room.id === room.id)).toBe(true);
    expect(overview.bookings.some((item) => item.id === pending.id)).toBe(true);
    expect(overview.blocks.some((item) => item.reason === "Jadwal kuliah")).toBe(true);
  });

  it("pengajuan yang diblokir jadwal kuliah ditolak saat dibuat", async () => {
    const { user } = await createUser();
    const { user: admin } = await createUser({ role: "ADMIN" });
    const room = await createRoom();
    const slot = futureSlot(10, "08:00", "10:00");

    await createScheduleBlock(admin.id, {
      roomId: room.id,
      date: slot.date,
      startTime: "08:00",
      endTime: "10:00",
      reason: "Jadwal kuliah wajib",
      source: "ACADEMIC_SCHEDULE",
    });

    await expect(
      createBooking(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        {
          roomId: room.id,
          ...slot,
          activityName: "Kegiatan bentrok blokir",
          participantCount: 10,
          purpose: "Harus ditolak karena jadwal kuliah.",
        },
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("menolak pengajuan di luar jam operasional", async () => {
    const { user } = await createUser();
    const room = await createRoom();
    const slot = futureSlot(11, "22:00", "23:00");

    await expect(
      createBooking(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        {
          roomId: room.id,
          ...slot,
          activityName: "Kegiatan malam",
          participantCount: 10,
          purpose: "Di luar jam operasional.",
        },
      ),
    ).rejects.toThrow();
  });
});
