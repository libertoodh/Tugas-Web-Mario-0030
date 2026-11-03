import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/server/auth/session";
import { unreadNotificationCount } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const unread = await unreadNotificationCount(user.id);

  return (
    <AppShell user={user} unread={unread}>
      {children}
    </AppShell>
  );
}
