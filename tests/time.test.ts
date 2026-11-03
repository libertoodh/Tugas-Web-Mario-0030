import { describe, expect, it } from "vitest";
import {
  formatWita,
  greetingWita,
  witaDateTimeToUtc,
  witaHour,
} from "@/lib/time";

describe("Waktu Bali (WITA / Asia/Makassar)", () => {
  it("mengonversi tanggal dan jam WITA ke instant UTC yang benar", () => {
    const result = witaDateTimeToUtc("2026-10-23", "09:00");
    expect(result.toISOString()).toBe("2026-10-23T01:00:00.000Z");
    expect(formatWita(result, "yyyy-MM-dd HH:mm")).toBe("2026-10-23 09:00");
  });

  it("membaca jam sesuai zona waktu Bali, bukan zona server", () => {
    // 00:30 UTC = 08:30 WITA
    expect(witaHour(new Date("2026-10-20T00:30:00Z"))).toBe(8);
    // 17:30 UTC = 01:30 WITA (hari berikutnya)
    expect(witaHour(new Date("2026-10-20T17:30:00Z"))).toBe(1);
  });

  it("memberi salam pagi pada 08.30 WITA", () => {
    expect(greetingWita(new Date("2026-10-20T00:30:00Z"))).toBe("Selamat pagi");
  });

  it("memberi salam siang pada 12.00 WITA", () => {
    expect(greetingWita(new Date("2026-10-20T04:00:00Z"))).toBe("Selamat siang");
  });

  it("memberi salam sore pada 16.00 WITA", () => {
    expect(greetingWita(new Date("2026-10-20T08:00:00Z"))).toBe("Selamat sore");
  });

  it("memberi salam malam pada 20.00 WITA", () => {
    expect(greetingWita(new Date("2026-10-20T12:00:00Z"))).toBe("Selamat malam");
  });

  it("batas pergantian salam tepat pada 04.00, 11.00, 15.00, dan 18.00 WITA", () => {
    expect(greetingWita(new Date("2026-10-19T19:59:00Z"))).toBe("Selamat malam"); // 03.59
    expect(greetingWita(new Date("2026-10-19T20:00:00Z"))).toBe("Selamat pagi"); // 04.00
    expect(greetingWita(new Date("2026-10-20T02:59:00Z"))).toBe("Selamat pagi"); // 10.59
    expect(greetingWita(new Date("2026-10-20T03:00:00Z"))).toBe("Selamat siang"); // 11.00
    expect(greetingWita(new Date("2026-10-20T06:59:00Z"))).toBe("Selamat siang"); // 14.59
    expect(greetingWita(new Date("2026-10-20T07:00:00Z"))).toBe("Selamat sore"); // 15.00
    expect(greetingWita(new Date("2026-10-20T09:59:00Z"))).toBe("Selamat sore"); // 17.59
    expect(greetingWita(new Date("2026-10-20T10:00:00Z"))).toBe("Selamat malam"); // 18.00
  });
});
