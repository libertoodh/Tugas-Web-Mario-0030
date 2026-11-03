import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { RoomForm } from "../room-form";

export const dynamic = "force-dynamic";

export default function NewRoomPage() {
  return (
    <div className="space-y-5">
      <Link
        href="/admin/ruangan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke manajemen ruangan
      </Link>
      <PageHeader
        title="Tambah Ruangan"
        description="Ruangan baru langsung tersedia di katalog setelah disimpan."
      />
      <RoomForm />
    </div>
  );
}
