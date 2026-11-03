import { z } from "zod";
import { bookingRules } from "./config";
import { isValidDateString, isValidTimeString } from "./time";

const dateField = z
  .string({ required_error: "Tanggal wajib diisi" })
  .refine(isValidDateString, "Format tanggal tidak valid (yyyy-MM-dd)");

const timeField = z
  .string({ required_error: "Jam wajib diisi" })
  .refine(isValidTimeString, "Format jam tidak valid (HH:mm)");

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email wajib diisi" })
    .trim()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .transform((v) => v.toLowerCase()),
  password: z
    .string({ required_error: "Kata sandi wajib diisi" })
    .min(8, "Kata sandi minimal 8 karakter")
    .max(200, "Kata sandi terlalu panjang"),
});

export const bookingCreateSchema = z
  .object({
    roomId: z.string().trim().min(1, "Ruangan wajib dipilih"),
    date: dateField,
    startTime: timeField,
    endTime: timeField,
    activityName: z
      .string({ required_error: "Nama kegiatan wajib diisi" })
      .trim()
      .min(3, "Nama kegiatan minimal 3 karakter")
      .max(150, "Nama kegiatan maksimal 150 karakter"),
    participantCount: z.coerce
      .number({ invalid_type_error: "Jumlah peserta harus berupa angka" })
      .int("Jumlah peserta harus bilangan bulat")
      .min(1, "Jumlah peserta minimal 1")
      .max(1000, "Jumlah peserta maksimal 1000"),
    purpose: z
      .string({ required_error: "Keperluan wajib diisi" })
      .trim()
      .min(5, "Keperluan minimal 5 karakter")
      .max(1000, "Keperluan maksimal 1000 karakter"),
  })
  .superRefine((value, ctx) => {
    if (value.endTime <= value.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "Jam selesai harus lebih akhir daripada jam mulai",
      });
      return;
    }
    const start = value.startTime.split(":").map(Number);
    const end = value.endTime.split(":").map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    const durationHours = (endMinutes - startMinutes) / 60;
    if (durationHours > bookingRules.maxDurationHours) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: `Durasi maksimum ${bookingRules.maxDurationHours} jam`,
      });
    }
    if (startMinutes < bookingRules.openHour * 60 || endMinutes > bookingRules.closeHour * 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: `Peminjaman hanya dapat dilakukan antara pukul ${bookingRules.openHour}:00 dan ${bookingRules.closeHour}:00 WITA`,
      });
    }
  });

export const bookingRejectSchema = z.object({
  reason: z
    .string({ required_error: "Alasan penolakan wajib diisi" })
    .trim()
    .min(5, "Alasan penolakan minimal 5 karakter")
    .max(1000, "Alasan penolakan maksimal 1000 karakter"),
});

export const roomSchema = z.object({
  name: z
    .string({ required_error: "Nama ruangan wajib diisi" })
    .trim()
    .min(2, "Nama ruangan minimal 2 karakter")
    .max(100, "Nama ruangan maksimal 100 karakter"),
  building: z
    .string({ required_error: "Gedung wajib diisi" })
    .trim()
    .min(2, "Gedung minimal 2 karakter")
    .max(100, "Gedung maksimal 100 karakter"),
  floor: z.coerce
    .number({ invalid_type_error: "Lantai harus berupa angka" })
    .int("Lantai harus bilangan bulat")
    .min(0, "Lantai minimal 0")
    .max(50, "Lantai maksimal 50"),
  capacity: z.coerce
    .number({ invalid_type_error: "Kapasitas harus berupa angka" })
    .int("Kapasitas harus bilangan bulat")
    .min(0, "Kapasitas minimal 0")
    .max(2000, "Kapasitas maksimal 2000"),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  imageUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .or(z.literal(""))
    .refine(
      (value) => !value || value.startsWith("/") || /^https?:\/\//.test(value),
      "URL foto harus diawali / atau http(s)://",
    ),
  facilities: z
    .array(z.string().trim().min(1).max(60))
    .max(30, "Maksimal 30 fasilitas")
    .default([]),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export const scheduleBlockSchema = z.object({
  roomId: z.string().trim().min(1, "Ruangan wajib dipilih"),
  date: dateField,
  startTime: timeField,
  endTime: timeField,
  reason: z.string().trim().min(3, "Alasan minimal 3 karakter").max(200),
  source: z.enum(["MANUAL", "ACADEMIC_SCHEDULE"]).default("MANUAL"),
});

export const listBookingsQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED", "ALL"]).optional(),
  q: z.string().trim().max(100).optional(),
  roomId: z.string().trim().max(50).optional(),
  date: z.string().trim().max(10).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type RoomInput = z.infer<typeof roomSchema>;
export type ScheduleBlockInput = z.infer<typeof scheduleBlockSchema>;

/** Mengubah error zod menjadi map field -> pesan pertama. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
