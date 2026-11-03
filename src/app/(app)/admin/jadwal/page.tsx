import { CalendarDays } from "lucide-react";
import { getDayOverview } from "@/server/services/availability";
import { listRooms } from "@/server/services/rooms";
import { isValidDateString, todayWita } from "@/lib/time";
import { slotStatusMeta } from "@/lib/status";
import { Card, CardHeader, EmptyState, Input, PageHeader, buttonClass } from "@/components/ui";
import { ScheduleBlockManager } from "./schedule-block-manager";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam && isValidDateString(dateParam) ? dateParam : todayWita();

  const [overview, rooms] = await Promise.all([
    getDayOverview(date),
    listRooms({ includeInactive: true }),
  ]);

  const roomNames = new Map(rooms.map((room) => [room.id, room.name]));
  const blocks = overview.blocks.map((block) => ({
    id: block.id,
    roomId: block.roomId,
    roomName: roomNames.get(block.roomId) ?? "Ruangan",
    startAt: block.startAt.toISOString(),
    endAt: block.endAt.toISOString(),
    reason: block.reason,
    source: "MANUAL",
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jadwal Ruangan"
        description="Pantau pemakaian seluruh ruangan per jam dan kelola blokir jadwal."
        actions={
          <form method="get" className="flex items-end gap-2">
            <div>
              <label htmlFor="date" className="mb-1 block text-xs font-medium text-ink-600">
                Tanggal
              </label>
              <Input id="date" name="date" type="date" defaultValue={date} className="h-10 w-auto" />
            </div>
            <button type="submit" className={buttonClass("outline", "md")}>
              Lihat
            </button>
          </form>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader
          title="Status per jam"
          description="Hijau tersedia, kuning menunggu, merah terisi, abu-abu diblokir"
        />
        {overview.rooms.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" aria-hidden />}
            title="Belum ada ruangan aktif"
            description="Tambahkan ruangan terlebih dahulu di manajemen ruangan."
          />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 border-b border-r border-stone-200 bg-white px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Ruangan
                  </th>
                  {overview.rooms[0].slots.map((slot) => (
                    <th
                      key={slot.startAt.toISOString()}
                      scope="col"
                      className="border-b border-stone-200 px-1 py-2.5 text-center text-[11px] font-semibold text-ink-500"
                    >
                      {new Intl.DateTimeFormat("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Makassar",
                        hour12: false,
                      }).format(slot.startAt)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overview.rooms.map((item) => (
                  <tr key={item.room.id}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-r border-stone-100 bg-white px-4 py-2 text-left font-medium text-ink-900"
                    >
                      <span className="block max-w-40 truncate text-sm">{item.room.name}</span>
                      <span className="block text-[11px] font-normal text-ink-500">
                        {item.room.building}
                        {item.room.floor > 0 ? ` • L${item.room.floor}` : ""}
                      </span>
                    </th>
                    {item.slots.map((slot) => (
                      <td key={slot.startAt.toISOString()} className="border-b border-stone-100 p-1">
                        <div
                          className={`flex h-9 items-center justify-center rounded-md text-[10px] font-medium ring-1 ring-inset ${slotStatusMeta[slot.status].className}`}
                          title={`${item.room.name} • ${slotStatusMeta[slot.status].label}`}
                        >
                          {slot.status === "AVAILABLE" ? "" : slotStatusMeta[slot.status].label}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ScheduleBlockManager rooms={rooms.map((room) => ({ id: room.id, name: room.name }))} date={date} blocks={blocks} />
    </div>
  );
}
