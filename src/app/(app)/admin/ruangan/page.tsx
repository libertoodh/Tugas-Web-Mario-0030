import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { listRooms } from "@/server/services/rooms";
import { Badge, Card, EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { RoomActiveToggle } from "./room-active-toggle";

export const dynamic = "force-dynamic";

export default async function AdminRoomsPage() {
  const rooms = await listRooms({ includeInactive: true });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manajemen Ruangan"
        description="Kelola katalog ruangan. Ruangan tidak dihapus permanen agar riwayat peminjaman tetap utuh."
        actions={
          <Link href="/admin/ruangan/baru" className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" aria-hidden />
            Tambah ruangan
          </Link>
        }
      />

      <Card className="overflow-hidden">
        {rooms.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-5 w-5" aria-hidden />}
            title="Belum ada ruangan"
            description="Tambahkan ruangan pertama agar sivitas akademika dapat mengajukan peminjaman."
            action={
              <Link href="/admin/ruangan/baru" className={buttonClass("primary", "sm")}>
                Tambah ruangan
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[48rem]">
              <caption className="sr-only">Daftar seluruh ruangan</caption>
              <thead>
                <tr>
                  <th scope="col">Ruangan</th>
                  <th scope="col">Lokasi</th>
                  <th scope="col">Kapasitas</th>
                  <th scope="col">Fasilitas</th>
                  <th scope="col">Riwayat</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td>
                      <p className="font-medium text-ink-900">{room.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {room.category ? (
                          <span className="rounded bg-sand-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-600">
                            {room.category}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 max-w-56 text-xs text-ink-500">
                        {room.description ?? "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap text-sm">
                      {room.building}
                      <p className="text-xs text-ink-500">
                        {room.floor > 0 ? `Lantai ${room.floor}` : "Lantai belum tercatat"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap">
                      {room.capacity > 0 ? `${room.capacity} orang` : "Belum tercatat"}
                    </td>
                    <td className="max-w-56">
                      <p className="truncate text-xs text-ink-600">
                        {room.facilities.length > 0 ? room.facilities.join(", ") : "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap text-sm">{room._count.bookings} pengajuan</td>
                    <td>
                      {room.isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-800 ring-emerald-200" dotClassName="bg-emerald-600">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge className="bg-stone-100 text-stone-700 ring-stone-200" dotClassName="bg-stone-400">
                          Nonaktif
                        </Badge>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/admin/ruangan/${room.id}`}
                          className="text-sm font-medium text-brand-700 hover:underline"
                        >
                          Edit
                        </Link>
                        <RoomActiveToggle
                          roomId={room.id}
                          roomName={room.name}
                          isActive={room.isActive}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  );
}
