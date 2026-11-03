import Link from "next/link";
import { ExternalLink, Search, Sofa } from "lucide-react";
import { listRooms } from "@/server/services/rooms";
import { getDayOverview } from "@/server/services/availability";
import { isValidDateString, todayWita } from "@/lib/time";
import { Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { RoomCard } from "@/components/room-card";

export const dynamic = "force-dynamic";

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; date?: string; category?: string }>;
}) {
  const params = await searchParams;
  const date = params.date && isValidDateString(params.date) ? params.date : todayWita();
  const q = params.q?.trim() ?? "";
  const category = params.category?.trim() ?? "";

  const [allRooms, rooms, overview] = await Promise.all([
    listRooms(),
    listRooms({ q, category }),
    getDayOverview(date),
  ]);

  const categories = Array.from(
    new Set(allRooms.map((room) => room.category).filter((value): value is string => Boolean(value))),
  ).sort((a, b) => a.localeCompare(b, "id"));

  const availabilityByRoom = new Map(
    overview.rooms.map((item) => [
      item.room.id,
      { availableHours: item.availableHours, totalHours: item.slots.length },
    ]),
  );

  const filterHref = (nextCategory: string) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (date) query.set("date", date);
    if (nextCategory) query.set("category", nextCategory);
    const suffix = query.toString();
    return suffix ? `/ruangan?${suffix}` : "/ruangan";
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Katalog Ruangan"
        description="Ruangan kampus IDB Bali yang dapat diajukan peminjaman, lengkap dengan foto, fasilitas, dan ketersediaan."
      />

      <Card className="p-4">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="q" className="block text-sm font-medium text-ink-800">
              Cari ruangan
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                aria-hidden
              />
              <Input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Nama ruangan, kategori, atau gedung"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="date" className="block text-sm font-medium text-ink-800">
              Tanggal ketersediaan
            </label>
            <Input id="date" name="date" type="date" defaultValue={date} />
          </div>
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <Button type="submit" variant="secondary">
            Terapkan
          </Button>
        </form>
      </Card>

      {categories.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filter kategori ruangan">
          <Link
            href={filterHref("")}
            aria-current={category ? undefined : "page"}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition ${
              category
                ? "bg-white text-ink-600 ring-stone-200 hover:bg-stone-50"
                : "bg-brand-700 text-white ring-brand-700"
            }`}
          >
            Semua
          </Link>
          {categories.map((item) => (
            <Link
              key={item}
              href={filterHref(item)}
              aria-current={category === item ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition ${
                category === item
                  ? "bg-brand-700 text-white ring-brand-700"
                  : "bg-white text-ink-600 ring-stone-200 hover:bg-stone-50"
              }`}
            >
              {item}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          {rooms.length} ruangan aktif
          {category ? ` kategori ${category}` : ""}
          {q ? ` untuk pencarian “${q}”` : ""}
        </p>
        <Link href="/kalender" className="text-sm font-medium text-brand-700 hover:underline">
          Lihat kalender ketersediaan
        </Link>
      </div>

      {rooms.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sofa className="h-5 w-5" aria-hidden />}
            title="Ruangan tidak ditemukan"
            description="Coba kata kunci lain, pilih kategori lain, atau reset filter pencarian."
            action={
              <Link href="/ruangan" className="text-sm font-medium text-brand-700 hover:underline">
                Reset pencarian
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              availability={availabilityByRoom.get(room.id)}
            />
          ))}
        </div>
      )}

      <p className="flex items-start gap-1.5 text-xs text-ink-500">
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Nama, deskripsi, dan foto ruangan bersumber dari{" "}
          <a
            href="https://www.idbbali.ac.id/fasilitas-kampus/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-700 hover:underline"
          >
            laman Fasilitas Kampus IDB Bali
          </a>
          . Fasilitas umum seperti kantin, lobby, asrama, dan loket akademik tidak termasuk
          karena bukan ruang yang dipinjam melalui sistem ini.
        </span>
      </p>
    </div>
  );
}
