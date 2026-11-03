"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LifeBuoy, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { loginSchema } from "@/lib/validation";
import { Alert, Field, Input } from "@/components/ui";
import { cn } from "@/components/ui";

type LoginValues = z.infer<typeof loginSchema>;

const helpHref =
  "mailto:info@idbbali.ac.id?subject=" +
  encodeURIComponent("Bantuan akses Sistem Peminjaman Ruangan");

export function LoginForm({ demoEnabled }: { demoEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await response.json();
      if (!response.ok) {
        setServerError(body?.error?.message ?? "Gagal masuk. Silakan coba lagi.");
        return;
      }
      const next = searchParams.get("next");
      const target =
        next && next.startsWith("/") ? next : (body.data.redirectTo as string);
      router.replace(target);
      router.refresh();
    } catch {
      setServerError("Tidak dapat menghubungi server. Periksa koneksi Anda.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
      {serverError ? <Alert variant="error">{serverError}</Alert> : null}

      <Field label="Email" htmlFor="email" error={errors.email?.message} required>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@idb.ac.id"
            className="rounded-md border-stone-300 bg-slate-50/70 pl-10"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
        </div>
      </Field>

      <Field label="Kata sandi" htmlFor="password" error={errors.password?.message} required>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Kata sandi"
            className="rounded-md border-stone-300 bg-slate-50/70 pl-10 pr-11"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-ink-400 hover:text-ink-700"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <a
          href={helpHref}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          <LifeBuoy className="h-4 w-4" aria-hidden />
          Tidak bisa login?
        </a>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <LogIn className="h-4 w-4" aria-hidden />
          )}
          Masuk
        </button>
      </div>

      {demoEnabled ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-sand-50 p-3 text-xs">
          <p className="font-medium text-ink-800">Akun demo pengembangan</p>
          <div className="mt-2 flex flex-col gap-1">
            <button
              type="button"
              className={cn("text-left text-brand-700 hover:underline")}
              onClick={() => {
                setValue("email", "pemohon@demo.idb.ac.id");
                setValue("password", "Pemohon123!");
              }}
            >
              Isi akun pemohon — pemohon@demo.idb.ac.id
            </button>
            <button
              type="button"
              className={cn("text-left text-brand-700 hover:underline")}
              onClick={() => {
                setValue("email", "admin@demo.idb.ac.id");
                setValue("password", "Admin123!");
              }}
            >
              Isi akun admin — admin@demo.idb.ac.id
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
