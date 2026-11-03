/**
 * Seed data pengembangan.
 *
 * - Katalog ruangan mengikuti data resmi fasilitas kampus IDB Bali
 *   (https://www.idbbali.ac.id/fasilitas-kampus/), lihat prisma/rooms-data.ts.
 * - Foto ruangan disimpan di public/ruangan/.
 * - Akun demo hanya dibuat bila SEED_DEMO_ACCOUNTS=true dan tidak berjalan di
 *   produksi. Password selalu di-hash (bcrypt).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROOM_CATALOG } from "./rooms-data";

const prisma = new PrismaClient();

const TIMEZONE = "Asia/Makassar";

function witaDate(offsetDays: number): string {
  const now = new Date();
  const witaNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const base = new Date(
    Date.UTC(witaNow.getUTCFullYear(), witaNow.getUTCMonth(), witaNow.getUTCDate()),
  );
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

function witaAt(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+08:00`);
}

function code(date: string, suffix: string): string {
  return `BK-${date.slice(2).replace(/-/g, "")}-${suffix}`;
}

async function main() {
  const isProduction = process.env.NODE_ENV === "production";
  const demoEnabled = process.env.SEED_DEMO_ACCOUNTS === "true" && !isProduction;

  for (const room of ROOM_CATALOG) {
    await prisma.room.upsert({
      where: { room_building_name_key: { building: room.building, name: room.name } },
      update: {
        floor: room.floor,
        capacity: room.capacity,
        category: room.category,
        imageUrl: room.imageUrl,
        facilities: room.facilities,
        description: room.description,
      },
      create: {
        name: room.name,
        building: room.building,
        floor: room.floor,
        capacity: room.capacity,
        category: room.category,
        imageUrl: room.imageUrl,
        facilities: room.facilities,
        description: room.description,
      },
    });
  }
  console.log(`Seed: ${ROOM_CATALOG.length} ruangan katalog IDB Bali tersedia.`);

  if (!demoEnabled) {
    console.log(
      "Seed: akun demo dilewati (set SEED_DEMO_ACCOUNTS=true di lingkungan non-produksi untuk membuatnya).",
    );
    return;
  }

  const pemohonEmail = (process.env.DEMO_PEMOHON_EMAIL ?? "mariodharma@gmail.com").toLowerCase();
  const adminEmail = (process.env.DEMO_ADMIN_EMAIL ?? "admin@demo.idb.ac.id").toLowerCase();
  const pemohonPassword = process.env.DEMO_PEMOHON_PASSWORD ?? "mariodharma";
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD ?? "Admin123!";

  const pemohon = await prisma.user.upsert({
    where: { email: pemohonEmail },
    // Nama dan kata sandi pemohon demo selalu diselaraskan saat seed dijalankan ulang.
    update: {
      name: "Mario Dharma",
      role: "PEMOHON",
      isActive: true,
      passwordHash: await bcrypt.hash(pemohonPassword, 12),
    },
    create: {
      name: "Mario Dharma",
      email: pemohonEmail,
      passwordHash: await bcrypt.hash(pemohonPassword, 12),
      role: "PEMOHON",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", isActive: true },
    create: {
      name: "Komang Admin Sarana",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "ADMIN",
    },
  });
  console.log(`Seed: akun demo PEMOHON ${pemohonEmail} dan ADMIN ${adminEmail}.`);

  const existing = await prisma.booking.count({ where: { userId: pemohon.id } });
  if (existing > 0) {
    console.log("Seed: contoh pengajuan sudah ada, dilewati.");
    return;
  }

  const studio = await prisma.room.findFirst({ where: { name: "Studio Gambar" } });
  const lab = await prisma.room.findFirst({ where: { name: "Lab Komputer" } });
  const aula = await prisma.room.findFirst({ where: { name: "Aula" } });
  if (!studio || !lab || !aula) return;

  const tomorrow = witaDate(3);
  const nextWeek = witaDate(7);

  await prisma.booking.createMany({
    data: [
      {
        bookingCode: code(tomorrow, "DEMO1"),
        userId: pemohon.id,
        roomId: studio.id,
        startAt: witaAt(tomorrow, "09:00"),
        endAt: witaAt(tomorrow, "12:00"),
        activityName: "Kritik Karya Desain Produk",
        participantCount: 24,
        purpose:
          "Kritik karya tengah semester untuk mata kuliah Desain Produk, membutuhkan meja kerja luas.",
        status: "APPROVED",
        approvedBy: admin.id,
        approvedAt: new Date(),
      },
      {
        bookingCode: code(nextWeek, "DEMO2"),
        userId: pemohon.id,
        roomId: lab.id,
        startAt: witaAt(nextWeek, "13:00"),
        endAt: witaAt(nextWeek, "15:00"),
        activityName: "Workshop Analitik Bisnis",
        participantCount: 28,
        purpose: "Workshop penggunaan spreadsheet untuk analisis data penjualan.",
        status: "PENDING",
      },
    ],
  });

  await prisma.roomScheduleBlock.create({
    data: {
      roomId: aula.id,
      startAt: witaAt(tomorrow, "08:00"),
      endAt: witaAt(tomorrow, "11:00"),
      reason: "Jadwal kuliah umum (contoh struktur pemblokiran jadwal)",
      source: "ACADEMIC_SCHEDULE",
      createdById: admin.id,
    },
  });

  console.log("Seed: contoh pengajuan dan blokir jadwal dibuat.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
