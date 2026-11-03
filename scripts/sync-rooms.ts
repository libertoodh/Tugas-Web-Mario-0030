/**
 * Menyelaraskan katalog ruangan di database dengan data resmi IDB Bali.
 *
 * - Ruangan lama yang konsepnya sama diperbarui di tempat agar peminjaman
 *   yang sudah ada tetap menunjuk ke ruangan yang benar.
 * - Peminjaman/blokir pada ruangan lama dipindahkan ke ruangan pengganti.
 * - Ruangan lama yang tidak lagi ada di katalog dihapus bila tidak punya
 *   peminjaman; bila masih punya, ruangan dibiarkan (tidak dihapus).
 *
 * Jalankan: npx tsx scripts/sync-rooms.ts
 */
import { PrismaClient } from "@prisma/client";
import { ROOM_CATALOG } from "../prisma/rooms-data";

const prisma = new PrismaClient();

/** Ruangan lama -> nama ruangan baru di katalog. */
const LEGACY_MAP: Record<string, string> = {
  "Studio Desain": "Studio Gambar",
  "Laboratorium Komputer": "Lab Komputer",
  "Ruang Teori A1": "Ruang Kelas",
  "Ruang Teori A2": "Ruang Kelas",
  Auditorium: "Aula",
  "Studio Fotografi": "Studio Foto",
  "Galeri Karya": "Creative Gallery",
  "Ruang Rapat Senat": "Ruang Meeting",
  "Ruang Sidang": "Ruang Kelas Magister",
};

async function main() {
  const before = await prisma.room.findMany();
  const byName = new Map(before.map((room) => [room.name, room]));

  const catalogIds: string[] = [];
  for (const item of ROOM_CATALOG) {
    let room = await prisma.room.findUnique({
      where: {
        room_building_name_key: { building: item.building, name: item.name },
      },
    });

    if (!room) {
      const legacy = before.find(
        (candidate) => LEGACY_MAP[candidate.name] === item.name && !catalogIds.includes(candidate.id),
      );
      if (legacy) {
        room = await prisma.room.update({
          where: { id: legacy.id },
          data: {
            name: item.name,
            building: item.building,
            floor: item.floor,
            capacity: item.capacity,
            category: item.category,
            imageUrl: item.imageUrl,
            facilities: item.facilities,
            description: item.description,
          },
        });
        console.log(`Diperbarui di tempat: ${legacy.name} -> ${room.name} (${room.id})`);
      }
    }

    if (!room) {
      room = await prisma.room.create({
        data: {
          name: item.name,
          building: item.building,
          floor: item.floor,
          capacity: item.capacity,
          category: item.category,
          imageUrl: item.imageUrl,
          facilities: item.facilities,
          description: item.description,
        },
      });
      console.log(`Dibuat: ${room.name} (${room.id})`);
    } else if (byName.get(item.name) !== room || room.building !== item.building) {
      room = await prisma.room.update({
        where: { id: room.id },
        data: {
          floor: item.floor,
          capacity: item.capacity,
          category: item.category,
          imageUrl: item.imageUrl,
          facilities: item.facilities,
          description: item.description,
        },
      });
      console.log(`Diselaraskan: ${room.name}`);
    }
    catalogIds.push(room.id);
  }

  const catalogByName = new Map(
    (await prisma.room.findMany({ where: { id: { in: catalogIds } } })).map((room) => [
      room.name,
      room,
    ]),
  );

  const leftovers = await prisma.room.findMany({ where: { id: { notIn: catalogIds } } });
  for (const leftover of leftovers) {
    const targetName = LEGACY_MAP[leftover.name];
    const target = targetName ? catalogByName.get(targetName) : undefined;
    if (target) {
      const bookings = await prisma.booking.updateMany({
        where: { roomId: leftover.id },
        data: { roomId: target.id },
      });
      const blocks = await prisma.roomScheduleBlock.updateMany({
        where: { roomId: leftover.id },
        data: { roomId: target.id },
      });
      console.log(
        `Dipindahkan: ${leftover.name} -> ${target.name} (${bookings.count} peminjaman, ${blocks.count} blokir)`,
      );
    }

    try {
      await prisma.room.delete({ where: { id: leftover.id } });
      console.log(`Dihapus: ${leftover.name}`);
    } catch {
      console.warn(`Dilewati (masih punya referensi): ${leftover.name}`);
    }
  }

  const total = await prisma.room.count();
  console.log(`\nSelesai. ${total} ruangan di database.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
