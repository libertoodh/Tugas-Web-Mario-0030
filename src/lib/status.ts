export type BookingStatusValue = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export const BOOKING_STATUSES: BookingStatusValue[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

export const bookingStatusMeta: Record<
  BookingStatusValue,
  { label: string; short: string; description: string; className: string; dot: string }
> = {
  PENDING: {
    label: "Menunggu Persetujuan",
    short: "Menunggu",
    description: "Pengajuan sudah diterima dan sedang ditinjau admin sarana prasarana.",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
  },
  APPROVED: {
    label: "Disetujui",
    short: "Disetujui",
    description: "Ruangan sudah dipesan untuk jadwal ini.",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-600",
  },
  REJECTED: {
    label: "Ditolak",
    short: "Ditolak",
    description: "Pengajuan ditolak admin. Lihat alasan penolakan pada detail.",
    className: "bg-rose-50 text-rose-800 ring-rose-200",
    dot: "bg-rose-600",
  },
  CANCELLED: {
    label: "Dibatalkan",
    short: "Dibatalkan",
    description: "Pengajuan dibatalkan. Ruangan kembali tersedia.",
    className: "bg-stone-100 text-stone-700 ring-stone-200",
    dot: "bg-stone-400",
  },
};

export type SlotStatus = "AVAILABLE" | "PENDING" | "OCCUPIED" | "BLOCKED";

export const slotStatusMeta: Record<
  SlotStatus,
  { label: string; className: string; description: string }
> = {
  AVAILABLE: {
    label: "Tersedia",
    className: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    description: "Belum ada peminjaman yang disetujui.",
  },
  PENDING: {
    label: "Menunggu",
    className: "bg-amber-100 text-amber-900 ring-amber-200",
    description: "Ada pengajuan yang menunggu persetujuan admin.",
  },
  OCCUPIED: {
    label: "Terisi",
    className: "bg-rose-100 text-rose-900 ring-rose-200",
    description: "Sudah ada peminjaman yang disetujui.",
  },
  BLOCKED: {
    label: "Diblokir",
    className: "bg-stone-200 text-stone-700 ring-stone-300",
    description: "Diblokir untuk jadwal kuliah atau keperluan kampus.",
  },
};

export function isBookingStatus(value: string): value is BookingStatusValue {
  return (BOOKING_STATUSES as string[]).includes(value);
}
