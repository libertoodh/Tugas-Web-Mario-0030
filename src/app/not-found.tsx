import Link from "next/link";
import { Card, buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
      <Card className="w-full p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">404</p>
        <h1 className="mt-2 text-xl font-semibold text-ink-900">
          Halaman atau data tidak ditemukan
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          Tautan mungkin sudah berubah, atau data yang Anda cari tidak tersedia untuk
          akun ini.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/dashboard" className={buttonClass("primary")}>
            Ke dashboard
          </Link>
          <Link href="/ruangan" className={buttonClass("outline")}>
            Katalog ruangan
          </Link>
        </div>
      </Card>
    </main>
  );
}
