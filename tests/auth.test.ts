import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { authenticate } from "@/server/auth/authenticate";
import { signSessionToken } from "@/lib/session-token";
import { createUser, resetDatabase } from "./helpers";

describe("Autentikasi", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("login berhasil dengan email dan kata sandi yang benar", async () => {
    const { user, password } = await createUser({ email: "dosen@idb.ac.id", name: "Dosen Uji" });
    const result = await authenticate("dosen@idb.ac.id", password);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(user.id);
    expect(result?.role).toBe("PEMOHON");
  });

  it("login gagal dengan kata sandi salah", async () => {
    await createUser({ email: "salah@idb.ac.id" });
    const result = await authenticate("salah@idb.ac.id", "KataSandiSalah123!");
    expect(result).toBeNull();
  });

  it("login gagal untuk email yang tidak terdaftar", async () => {
    const result = await authenticate("tidak-ada@idb.ac.id", "Rahasia123!");
    expect(result).toBeNull();
  });

  it("akun nonaktif tidak dapat login", async () => {
    await createUser({ email: "nonaktif@idb.ac.id", isActive: false });
    const result = await authenticate("nonaktif@idb.ac.id", "Rahasia123!");
    expect(result).toBeNull();
  });

  it("pemohon tidak dapat mengakses halaman admin", async () => {
    const { user } = await createUser({ role: "PEMOHON" });
    const token = await signSessionToken({
      sub: user.id,
      name: user.name,
      email: user.email,
      role: "PEMOHON",
    });
    const request = new NextRequest("http://localhost:3000/admin", {
      headers: { cookie: `idb_session=${token}` },
    });
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("pengguna tanpa sesi diarahkan ke halaman login", async () => {
    const request = new NextRequest("http://localhost:3000/riwayat");
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("admin dapat mengakses halaman admin", async () => {
    const { user } = await createUser({ role: "ADMIN" });
    const token = await signSessionToken({
      sub: user.id,
      name: user.name,
      email: user.email,
      role: "ADMIN",
    });
    const request = new NextRequest("http://localhost:3000/admin/pengajuan", {
      headers: { cookie: `idb_session=${token}` },
    });
    const response = await middleware(request);
    expect(response.status).toBe(200);
  });

  it("token sesi yang dimodifikasi ditolak", async () => {
    const { user } = await createUser();
    const token = await signSessionToken({
      sub: user.id,
      name: user.name,
      email: user.email,
      role: "PEMOHON",
    });
    const tampered = `${token.slice(0, -4)}aaaa`;
    const request = new NextRequest("http://localhost:3000/dashboard", {
      headers: { cookie: `idb_session=${tampered}` },
    });
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });
});
