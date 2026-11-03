"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { cn } from "./ui";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

export interface ShellUser {
  id: string;
  name: string;
  email: string;
  role: "PEMOHON" | "ADMIN";
}

function navForRole(role: ShellUser["role"]): NavItem[] {
  if (role === "ADMIN") {
    return [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/pengajuan", label: "Pengajuan", icon: ClipboardList },
      { href: "/admin/ruangan", label: "Ruangan", icon: Building2 },
      { href: "/admin/jadwal", label: "Jadwal", icon: CalendarDays },
      { href: "/kalender", label: "Kalender", icon: DoorOpen },
    ];
  }
  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/ruangan", label: "Ruangan", icon: Building2 },
    { href: "/kalender", label: "Kalender", icon: CalendarDays },
    { href: "/riwayat", label: "Riwayat", icon: History },
  ];
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppShell({
  user,
  unread,
  children,
}: {
  user: ShellUser;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const nav = navForRole(user.role);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-dvh bg-sand-50">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Lompat ke konten utama
      </a>

      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"} className="flex items-center gap-2.5">
            <Image
              src="/idb-mark.png"
              alt="Logo Institut Desain dan Bisnis Bali"
              width={36}
              height={36}
              priority
              className="h-9 w-9"
            />
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-ink-900">
                Sistem Peminjaman Ruangan
              </span>
              <span className="hidden text-[11px] text-ink-500 sm:block">
                Institut Desain dan Bisnis Bali
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-50 text-brand-800"
                      : "text-ink-600 hover:bg-sand-100 hover:text-ink-900",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <NotificationBell initialUnread={unread} />
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-sm hover:bg-sand-50">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sand-200 text-xs font-semibold text-ink-700">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-28 truncate font-medium text-ink-800 sm:block">
                  {user.name.split(" ")[0]}
                </span>
                {user.role === "ADMIN" ? (
                  <ShieldCheck className="h-4 w-4 text-brand-700" aria-label="Admin" />
                ) : null}
              </summary>
              <div className="absolute right-0 top-11 z-40 w-64 rounded-xl border border-stone-200 bg-white p-1 shadow-xl">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-medium text-ink-900">{user.name}</p>
                  <p className="truncate text-xs text-ink-500">{user.email}</p>
                  <p className="mt-1 text-xs font-medium text-brand-700">
                    {user.role === "ADMIN" ? "Admin Sarana Prasarana" : "Pemohon"}
                  </p>
                </div>
                <div className="my-1 h-px bg-stone-100" />
                <button
                  type="button"
                  onClick={logout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-sand-100 disabled:opacity-60"
                >
                  {loggingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <LogOut className="h-4 w-4" aria-hidden />
                  )}
                  Keluar
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main
        id="konten-utama"
        className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pb-12 sm:pt-8"
      >
        {children}
      </main>

      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur md:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 py-1.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium",
                    active ? "text-brand-800" : "text-ink-500",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
