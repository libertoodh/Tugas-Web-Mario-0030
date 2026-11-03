import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { APP_NAME } from "@/lib/config";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");

  const demoEnabled =
    process.env.SEED_DEMO_ACCOUNTS === "true" && process.env.NODE_ENV !== "production";

  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <header className="h-14 shrink-0 bg-brand-700 sm:h-16" aria-hidden />

      <div className="grid flex-1 content-start lg:grid-cols-[1.55fr_1fr] lg:content-stretch">
        {/* Hero: foto kampus memenuhi seluruh panel kiri */}
        <section className="relative hidden overflow-hidden bg-brand-900 lg:block">
          <Image
            src="/hero-idb.jpg"
            alt="Gedung Institut Desain dan Bisnis Bali"
            fill
            priority
            sizes="(min-width: 1024px) 62vw, 100vw"
            className="object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-900/20 to-brand-900/5"
            aria-hidden
          />
          <div
            className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-brand-900/40 to-transparent"
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-8">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/70">
                Kampus IDB Bali
              </p>
              <p className="mt-1 text-base font-medium text-white">
                Institut Desain dan Bisnis Bali
              </p>
            </div>
            <span className="mb-1 h-1 w-12 rounded-full bg-accent-500" aria-hidden />
          </div>
        </section>

        {/* Hero ringkas untuk ponsel */}
        <div className="relative h-44 w-full overflow-hidden bg-brand-900 sm:h-52 lg:hidden">
          <Image
            src="/hero-idb.jpg"
            alt="Gedung Institut Desain dan Bisnis Bali"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-brand-900/85 via-brand-900/25 to-brand-900/5"
            aria-hidden
          />
          <p className="absolute bottom-3 left-4 text-[10px] font-medium uppercase tracking-[0.2em] text-white/90">
            Kampus IDB Bali
          </p>
        </div>

        <section className="login-pattern relative flex flex-col bg-white px-5 py-8 sm:px-8">
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-start lg:justify-center">
            <div className="flex flex-col items-center text-center">
              <Image
                src="/idb-mark.png"
                alt="Logo Institut Desain dan Bisnis Bali"
                width={72}
                height={72}
                priority
                className="h-16 w-16"
              />
              <h1 className="mt-3 text-xl font-bold tracking-tight text-ink-900">{APP_NAME}</h1>
              <p className="mt-1 text-sm italic text-accent-600">
                Institut Desain dan Bisnis Bali
              </p>
            </div>

            <LoginForm demoEnabled={demoEnabled} />

            <div className="mt-6 border-t border-stone-200 pt-4 text-center">
              <p className="text-[11px] leading-relaxed text-ink-500">
                Belum memiliki akun? Hubungi admin sarana prasarana kampus.
              </p>
              <p className="mt-2 text-[11px] text-ink-400">
                © {new Date().getFullYear()} Institut Desain dan Bisnis Bali
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
