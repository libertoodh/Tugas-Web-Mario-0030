import Image from "next/image";
import { ArrowRight, MapPin, Sofa, Users } from "lucide-react";
import type { Room } from "@prisma/client";
import { Badge, Card } from "./ui";

const FALLBACK_IMAGE = "/hero-idb.jpg";

function locationLabel(room: Pick<Room, "building" | "floor">) {
  return room.floor > 0 ? `${room.building}, lantai ${room.floor}` : room.building;
}

export function RoomCard({
  room,
  href,
  availability,
}: {
  room: Pick<
    Room,
    | "id"
    | "name"
    | "building"
    | "floor"
    | "capacity"
    | "facilities"
    | "isActive"
    | "category"
    | "imageUrl"
  >;
  href?: string;
  availability?: { availableHours: number; totalHours: number };
}) {
  const target = href ?? `/ruangan/${room.id}`;
  return (
    <Card className="group relative flex h-full flex-col overflow-hidden transition-colors hover:border-brand-300 focus-within:ring-2 focus-within:ring-brand-300">
      {/* Satu tautan menutupi seluruh kartu: klik di mana pun membuka detail ruangan. */}
      <a
        href={target}
        aria-label={`Buka detail ${room.name}`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none"
      />

      <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-900">
        <Image
          src={room.imageUrl ?? FALLBACK_IMAGE}
          alt={`Foto ${room.name}`}
          fill
          unoptimized={(room.imageUrl ?? "").startsWith("http")}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-brand-900/55 via-transparent to-transparent"
          aria-hidden
        />
        {room.category ? (
          <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-brand-800 shadow-sm">
            {room.category}
          </span>
        ) : null}
        {room.isActive ? (
          <Badge className="absolute right-3 top-3 bg-emerald-50/95 text-emerald-800 ring-emerald-200" dotClassName="bg-emerald-600">
            Aktif
          </Badge>
        ) : (
          <Badge className="absolute right-3 top-3 bg-stone-100/95 text-stone-700 ring-stone-200" dotClassName="bg-stone-400">
            Nonaktif
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink-900 transition-colors group-hover:text-brand-800">
            {room.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {locationLabel(room)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-sand-50 px-2.5 py-2 ring-1 ring-inset ring-stone-100">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Kapasitas</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-ink-900">
              <Users className="h-3.5 w-3.5 text-ink-400" aria-hidden />
              {room.capacity > 0 ? `${room.capacity} orang` : "Belum tercatat"}
            </p>
          </div>
          <div className="rounded-lg bg-sand-50 px-2.5 py-2 ring-1 ring-inset ring-stone-100">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Fasilitas</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-ink-900">
              <Sofa className="h-3.5 w-3.5 text-ink-400" aria-hidden />
              {room.facilities.length > 0 ? `${room.facilities.length} item` : "Belum tercatat"}
            </p>
          </div>
        </div>

        {room.facilities.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {room.facilities.slice(0, 3).map((facility) => (
              <li
                key={facility}
                className="rounded-md bg-sand-100 px-2 py-1 text-[11px] font-medium text-ink-600"
              >
                {facility}
              </li>
            ))}
            {room.facilities.length > 3 ? (
              <li className="rounded-md bg-sand-100 px-2 py-1 text-[11px] font-medium text-ink-500">
                +{room.facilities.length - 3}
              </li>
            ) : null}
          </ul>
        ) : null}

        {availability ? (
          <p className="mt-auto text-xs text-ink-500">
            <span className="font-medium text-ink-800">{availability.availableHours}</span> dari{" "}
            {availability.totalHours} jam tersedia
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-stone-100 px-4 py-3 text-sm font-medium text-brand-700 transition-colors group-hover:bg-brand-50">
        Lihat detail ruangan
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>
    </Card>
  );
}
