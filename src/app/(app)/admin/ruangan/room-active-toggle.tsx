"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Power } from "lucide-react";
import { useToast } from "@/components/toast";
import { Modal } from "@/components/modal";
import { Alert, Button } from "@/components/ui";

export function RoomActiveToggle({
  roomId,
  roomName,
  isActive,
}: {
  roomId: string;
  roomName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal mengubah status ruangan.");
        return;
      }
      toast({
        title: isActive ? "Ruangan dinonaktifkan" : "Ruangan diaktifkan",
        description: `${roomName} ${isActive ? "tidak lagi" : "kembali"} tampil di katalog.`,
        variant: "success",
      });
      setOpen(false);
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant={isActive ? "outline" : "secondary"} size="sm" onClick={() => setOpen(true)}>
        <Power className="h-3.5 w-3.5" aria-hidden />
        {isActive ? "Nonaktifkan" : "Aktifkan"}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isActive ? "Nonaktifkan ruangan?" : "Aktifkan ruangan?"}
        description={roomName}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Batal
            </Button>
            <Button
              variant={isActive ? "danger" : "primary"}
              onClick={toggle}
              loading={loading}
            >
              {isActive ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-ink-600">
          {error ? <Alert variant="error">{error}</Alert> : null}
          <p>
            {isActive
              ? "Ruangan yang dinonaktifkan tidak tampil di katalog dan tidak dapat diajukan. Riwayat peminjaman tetap tersimpan. Ruangan dengan peminjaman disetujui yang akan datang tidak dapat dinonaktifkan."
              : "Ruangan akan kembali tampil di katalog dan dapat diajukan peminjam."}
          </p>
        </div>
      </Modal>
    </>
  );
}
