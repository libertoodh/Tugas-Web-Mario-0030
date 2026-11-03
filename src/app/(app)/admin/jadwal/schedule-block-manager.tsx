"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { Modal } from "@/components/modal";
import { Alert, Button, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { formatWita } from "@/lib/time";

interface BlockItem {
  id: string;
  roomId: string;
  roomName: string;
  startAt: string;
  endAt: string;
  reason: string;
  source: string;
}

export function ScheduleBlockManager({
  rooms,
  date,
  blocks,
}: {
  rooms: Array<{ id: string; name: string }>;
  date: string;
  blocks: BlockItem[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BlockItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState({
    roomId: rooms[0]?.id ?? "",
    date,
    startTime: "08:00",
    endTime: "10:00",
    reason: "",
    source: "MANUAL" as "MANUAL" | "ACADEMIC_SCHEDULE",
  });

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/schedule-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal menyimpan blokir jadwal.");
        return;
      }
      toast({
        title: "Blokir jadwal ditambahkan",
        description: "Slot tersebut kini berstatus Diblokir pada kalender.",
        variant: "success",
      });
      setFormOpen(false);
      setValues((current) => ({ ...current, reason: "" }));
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/schedule-blocks/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) {
        toast({
          title: "Gagal menghapus blokir",
          description: body?.error?.message ?? "Coba lagi.",
          variant: "error",
        });
        return;
      }
      toast({ title: "Blokir jadwal dihapus", variant: "success" });
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast({ title: "Tidak dapat menghubungi server", variant: "error" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Blokir jadwal"
          description="Dipakai untuk jadwal kuliah, perawatan ruangan, atau keperluan kampus."
          action={
            <Button size="sm" onClick={() => setFormOpen(true)} disabled={rooms.length === 0}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Tambah blokir
            </Button>
          }
        />
        {blocks.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-500">
            Tidak ada blokir jadwal pada tanggal ini.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {blocks.map((block) => (
              <li key={block.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">
                    {block.roomName} • {block.reason}
                  </p>
                  <p className="text-xs text-ink-500">
                    {formatWita(new Date(block.startAt), "HH:mm")}–{formatWita(new Date(block.endAt), "HH:mm")} WITA
                    {block.source === "ACADEMIC_SCHEDULE" ? " • Jadwal akademik" : ""}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(block)}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Hapus
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-stone-100 px-5 py-3 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <Ban className="h-3.5 w-3.5" aria-hidden />
            Struktur ini juga menjadi titik integrasi jadwal kuliah otomatis pada tahap berikutnya.
          </span>
        </div>
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Tambah blokir jadwal"
        description="Blokir mencegah pengajuan pada slot tersebut dan ditampilkan abu-abu pada kalender."
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={loading}>
              Batal
            </Button>
            <Button
              onClick={submit}
              loading={loading}
              disabled={!values.roomId || values.reason.trim().length < 3}
            >
              Simpan blokir
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error ? <Alert variant="error">{error}</Alert> : null}
          <Field label="Ruangan" htmlFor="block-room" required>
            <Select
              id="block-room"
              value={values.roomId}
              onChange={(event) => setValues({ ...values, roomId: event.target.value })}
            >
              <option value="">Pilih ruangan</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Tanggal" htmlFor="block-date" required>
              <Input
                id="block-date"
                type="date"
                value={values.date}
                onChange={(event) => setValues({ ...values, date: event.target.value })}
              />
            </Field>
            <Field label="Mulai" htmlFor="block-start" required>
              <Input
                id="block-start"
                type="time"
                value={values.startTime}
                onChange={(event) => setValues({ ...values, startTime: event.target.value })}
              />
            </Field>
            <Field label="Selesai" htmlFor="block-end" required>
              <Input
                id="block-end"
                type="time"
                value={values.endTime}
                onChange={(event) => setValues({ ...values, endTime: event.target.value })}
              />
            </Field>
          </div>
          <Field label="Alasan" htmlFor="block-reason" required hint="Contoh: Jadwal kuliah Desain Interior.">
            <Input
              id="block-reason"
              value={values.reason}
              onChange={(event) => setValues({ ...values, reason: event.target.value })}
              placeholder="Jadwal kuliah / perawatan / keperluan kampus"
            />
          </Field>
          <Field label="Sumber" htmlFor="block-source">
            <Select
              id="block-source"
              value={values.source}
              onChange={(event) =>
                setValues({ ...values, source: event.target.value as "MANUAL" | "ACADEMIC_SCHEDULE" })
              }
            >
              <option value="MANUAL">Manual</option>
              <option value="ACADEMIC_SCHEDULE">Jadwal akademik</option>
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus blokir jadwal?"
        description={deleteTarget ? `${deleteTarget.roomName} • ${deleteTarget.reason}` : ""}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Batal
            </Button>
            <Button variant="danger" onClick={remove} loading={deleting}>
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          Slot akan kembali tersedia bila tidak ada peminjaman disetujui pada waktu tersebut.
        </p>
      </Modal>
    </>
  );
}
