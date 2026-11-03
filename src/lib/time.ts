import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { id as idLocale } from "date-fns/locale";
import { TIMEZONE } from "./config";

/** Tanggal "hari ini" di WITA dalam format yyyy-MM-dd. */
export function todayWita(): string {
  return formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
}

/** Jam (0–23) pada zona waktu Bali (WITA). */
export function witaHour(date: Date = new Date()): number {
  return Number.parseInt(formatInTimeZone(date, TIMEZONE, "HH"), 10);
}

/**
 * Salam otomatis mengikuti jam di Bali (WITA):
 * 04.00–10.59 pagi, 11.00–14.59 siang, 15.00–17.59 sore, 18.00–03.59 malam.
 */
export function greetingWita(date: Date = new Date()): string {
  const hour = witaHour(date);
  if (hour >= 4 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

/** Mengubah tanggal (yyyy-MM-dd) + jam (HH:mm) WITA menjadi instant UTC. */
export function witaDateTimeToUtc(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, TIMEZONE);
}

/** Rentang [awal hari, awal hari berikutnya) untuk tanggal WITA. */
export function witaDayRange(date: string): { start: Date; end: Date } {
  const start = witaDateTimeToUtc(date, "00:00");
  const next = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end: next };
}

export function formatWita(
  value: Date,
  pattern = "d MMM yyyy, HH:mm",
): string {
  return formatInTimeZone(value, TIMEZONE, pattern, { locale: idLocale });
}

export function formatWitaDate(value: Date): string {
  return formatWita(value, "EEEE, d MMMM yyyy");
}

export function formatWitaTime(value: Date): string {
  return formatWita(value, "HH:mm");
}

/** yyyy-MM-dd pada zona WITA. */
export function witaDateKey(value: Date): string {
  return formatInTimeZone(value, TIMEZONE, "yyyy-MM-dd");
}

/** Tanggal + jam terpisah untuk keperluan form. */
export function splitWita(value: Date): { date: string; time: string } {
  return {
    date: witaDateKey(value),
    time: formatWitaTime(value),
  };
}

/** Menambah hari pada string tanggal (yyyy-MM-dd) tanpa efek zona waktu. */
export function addDaysToDateString(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Selisih hari kalender antara dua tanggal yyyy-MM-dd. */
export function daysBetweenDateStrings(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isValidTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function minutesFromTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function leadingZeros(value: number): string {
  return value.toString().padStart(2, "0");
}
