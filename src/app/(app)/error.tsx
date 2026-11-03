"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Alert, Button, Card, buttonClass } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Detail teknis hanya dikirim ke console, tidak ditampilkan ke pengguna.
    console.error("[app] kesalahan halaman:", error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-10">
      <Card className="p-6">
        <div className="flex items-center gap-2 text-ink-900">
          <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />
          <h1 className="text-lg font-semibold">Halaman tidak dapat dimuat</h1>
        </div>
        <p className="mt-2 text-sm text-ink-600">
          Terjadi kesalahan saat memuat data. Data Anda tidak berubah. Silakan coba
          lagi; bila masalah berlanjut, hubungi admin sarana prasarana.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-ink-400">Kode kesalahan: {error.digest}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Coba lagi
          </Button>
          <Link href="/dashboard" className={buttonClass("outline")}>
            Kembali ke dashboard
          </Link>
        </div>
      </Card>
      <Alert variant="info">
        Bila kesalahan terjadi terus-menerus, sertakan kode kesalahan di atas saat
        melapor agar dapat ditelusuri pada log server.
      </Alert>
    </div>
  );
}
