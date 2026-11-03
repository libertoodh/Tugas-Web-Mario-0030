"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/toast";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Textarea } from "@/components/ui";

export function AdminDecisionPanel({
  bookingId,
  bookingCode,
  canDecide,
  decidedLabel,
}: {
  bookingId: string;
  bookingCode: string;
  canDecide: boolean;
  decidedLabel?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy("approve");
    setError(null);
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/approve`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Persetujuan gagal.");
        return;
      }
      toast({
        title: "Pengajuan disetujui",
        description: `${bookingCode} kini berstatus Disetujui dan jadwal ruangan terkunci.`,
        variant: "success",
      });
      setApproveOpen(false);
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    setBusy("reject");
    setError(null);
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Penolakan gagal.");
        return;
      }
      toast({
        title: "Pengajuan ditolak",
        description: "Alasan penolakan tersimpan dan pemohon menerima pemberitahuan.",
        variant: "success",
      });
      setRejectOpen(false);
      setReason("");
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setBusy(null);
    }
  }

  if (!canDecide) {
    return (
      <Alert variant="info" title="Tidak ada tindakan tersedia">
        {decidedLabel ?? "Pengajuan ini sudah diproses."}
      </Alert>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={() => {
            setError(null);
            setApproveOpen(true);
          }}
          className="flex-1"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Setujui pengajuan
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setError(null);
            setRejectOpen(true);
          }}
          className="flex-1"
        >
          <XCircle className="h-4 w-4" aria-hidden />
          Tolak pengajuan
        </Button>
      </div>

      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Setujui pengajuan?"
        description={`${bookingCode} akan berstatus Disetujui dan jadwal ruangan terkunci.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={busy === "approve"}>
              Batal
            </Button>
            <Button onClick={approve} loading={busy === "approve"}>
              Ya, setujui
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-ink-600">
          {error ? <Alert variant="error">{error}</Alert> : null}
          <p>
            Sistem akan memeriksa ulang bentrok jadwal di server sebelum menyimpan
            keputusan. Bila jadwal sudah terisi, persetujuan ditolak dan Anda dapat
            meminta pemohon memilih waktu lain.
          </p>
        </div>
      </Modal>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Tolak pengajuan"
        description="Alasan penolakan wajib diisi dan akan dikirim kepada pemohon."
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={busy === "reject"}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={reject}
              loading={busy === "reject"}
              disabled={reason.trim().length < 5}
            >
              Tolak pengajuan
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {error ? <Alert variant="error">{error}</Alert> : null}
          <Field
            label="Alasan penolakan"
            htmlFor="reason"
            hint="Minimal 5 karakter. Jelaskan alasan agar pemohon dapat menyesuaikan pengajuan."
            required
          >
            <Textarea
              id="reason"
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Contoh: Ruangan sudah digunakan untuk jadwal kuliah pada waktu tersebut."
            />
          </Field>
          {reason.length > 0 && reason.trim().length < 5 ? (
            <p className="text-xs text-rose-700">Alasan minimal 5 karakter.</p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
