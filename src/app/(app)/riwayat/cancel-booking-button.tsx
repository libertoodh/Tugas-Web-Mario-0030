"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban } from "lucide-react";
import { useToast } from "@/components/toast";
import { Modal } from "@/components/modal";
import { Alert, Button } from "@/components/ui";

export function CancelBookingButton({
  bookingId,
  bookingCode,
  disabledReason,
}: {
  bookingId: string;
  bookingCode: string;
  disabledReason?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Pembatalan gagal.");
        return;
      }
      toast({
        title: "Pengajuan dibatalkan",
        description: `${bookingCode} dibatalkan dan ruangan kembali tersedia bila tidak ada jadwal lain.`,
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
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={Boolean(disabledReason)}
        title={disabledReason}
      >
        <Ban className="h-4 w-4" aria-hidden />
        Batalkan pengajuan
      </Button>
      {disabledReason ? (
        <p className="mt-1.5 text-xs text-ink-500">{disabledReason}</p>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Batalkan pengajuan?"
        description={`Pengajuan ${bookingCode} akan berstatus Dibatalkan dan tidak dapat dikembalikan.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Kembali
            </Button>
            <Button variant="danger" onClick={cancel} loading={loading}>
              Ya, batalkan
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-ink-600">
          {error ? <Alert variant="error">{error}</Alert> : null}
          <p>
            Setelah dibatalkan, ruangan kembali tersedia untuk peminjaman lain selama
            tidak ada jadwal lain yang bertabrakan. Admin akan menerima pemberitahuan
            pembatalan ini.
          </p>
        </div>
      </Modal>
    </>
  );
}
