import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "@/server/auth/password";
import { ActingUser } from "@/server/services/bookings";
import { addDaysToDateString, todayWita } from "@/lib/time";

export const prisma = new PrismaClient();

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "AuditLog", "Notification", "Booking", "RoomScheduleBlock", "Room", "User"
    RESTART IDENTITY CASCADE
  `);
}

export async function createUser(options: {
  role?: Role;
  email?: string;
  name?: string;
  password?: string;
  isActive?: boolean;
} = {}) {
  const role = options.role ?? "PEMOHON";
  const email = options.email ?? `${role.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}@test.idb.ac.id`;
  const password = options.password ?? "Rahasia123!";
  const user = await prisma.user.create({
    data: {
      name: options.name ?? (role === "ADMIN" ? "Admin Uji" : "Pemohon Uji"),
      email,
      passwordHash: await hashPassword(password),
      role,
      isActive: options.isActive ?? true,
    },
  });
  return { user, password };
}

export function acting(user: { id: string; name: string; email: string; role: Role }): ActingUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function createRoom(name = `Ruang Uji ${Math.random().toString(36).slice(2, 6)}`) {
  return prisma.room.create({
    data: {
      name,
      building: "Gedung Uji",
      floor: 1,
      capacity: 40,
      facilities: ["Proyektor", "AC"],
      description: "Ruangan untuk pengujian otomatis.",
    },
  });
}

/** Tanggal pengujian: minimal H+3 agar lolos aturan H-2. */
export function testDate(offsetDays = 3): string {
  return addDaysToDateString(todayWita(), offsetDays);
}

export function futureSlot(offsetDays = 3, start = "09:00", end = "11:00") {
  return { date: testDate(offsetDays), startTime: start, endTime: end };
}
