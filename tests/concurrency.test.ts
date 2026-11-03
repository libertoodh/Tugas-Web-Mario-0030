import { beforeEach, describe, expect, it } from "vitest";
import { approveBooking, createBooking } from "@/server/services/bookings";
import { createRoom, createUser, futureSlot, prisma, resetDatabase } from "./helpers";

describe("Konkurensi dan integritas jadwal", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("beberapa pengajuan menunggu pada slot yang sama tidak otomatis dianggap disetujui", async () => {
    const room = await createRoom();
    const slot = futureSlot(6, "09:00", "11:00");

    for (let index = 0; index < 3; index += 1) {
      const { user } = await createUser();
      const booking = await createBooking(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        {
          roomId: room.id,
          ...slot,
          activityName: `Pengajuan Paralel ${index}`,
          participantCount: 15,
          purpose: "Menguji beberapa pengajuan pada slot yang sama.",
        },
      );
      expect(booking.status).toBe("PENDING");
    }

    const approved = await prisma.booking.count({ where: { roomId: room.id, status: "APPROVED" } });
    expect(approved).toBe(0);
  });

  it("dua persetujuan bersamaan tidak menghasilkan double booking", async () => {
    const { user: admin } = await createUser({ role: "ADMIN" });
    const room = await createRoom();
    const slot = futureSlot(7, "13:00", "15:00");

    const bookings = [];
    for (let index = 0; index < 5; index += 1) {
      const { user } = await createUser();
      bookings.push(
        await createBooking(actingUser(user), {
          roomId: room.id,
          ...slot,
          activityName: `Konkurensi ${index}`,
          participantCount: 20,
          purpose: "Menguji persetujuan bersamaan.",
        }),
      );
    }

    const results = await Promise.allSettled(
      bookings.map((booking) => approveBooking(admin.id, booking.id)),
    );

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected.length).toBe(bookings.length - 1);

    const approved = await prisma.booking.findMany({
      where: { roomId: room.id, status: "APPROVED" },
    });
    expect(approved).toHaveLength(1);
  });

  it("constraint database menolak penyimpanan langsung dua peminjaman disetujui yang bertumpang tindih", async () => {
    const { user } = await createUser();
    const { user: admin } = await createUser({ role: "ADMIN" });
    const room = await createRoom();
    const slot = futureSlot(8, "10:00", "12:00");

    const booking = await createBooking(actingUser(user), {
      roomId: room.id,
      ...slot,
      activityName: "Peminjaman Pertama",
      participantCount: 10,
      purpose: "Menguji constraint database.",
    });
    await approveBooking(admin.id, booking.id);

    const startAt = new Date(`${slot.date}T11:00:00+08:00`);
    const endAt = new Date(`${slot.date}T13:00:00+08:00`);

    await expect(
      prisma.$executeRaw`
        INSERT INTO "Booking" ("id", "bookingCode", "userId", "roomId", "startAt", "endAt", "activityName", "participantCount", "purpose", "status", "createdAt", "updatedAt")
        VALUES (
          ${"raw_insert_test"}, ${"BK-RAW-TEST"}, ${user.id}, ${room.id},
          ${startAt}, ${endAt}, ${"Insert Langsung"}, ${10}, ${"Menguji exclusion constraint."},
          'APPROVED'::"BookingStatus", ${new Date()}, ${new Date()}
        )
      `,
    ).rejects.toThrow();
  });
});

function actingUser(user: { id: string; name: string; email: string; role: "PEMOHON" | "ADMIN" }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
