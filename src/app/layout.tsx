import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { APP_NAME, CAMPUS_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} | ${CAMPUS_NAME}`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Sistem Peminjaman Ruangan Institut Desain dan Bisnis Bali (IDB Bali) untuk melihat ketersediaan, mengajukan, dan memproses peminjaman ruangan kampus.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#024d71",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
