import { NotificationType, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emailConfig } from "@/lib/config";
import { getEmailProvider, EmailMessage } from "./email";

type Db = PrismaClient | Prisma.TransactionClient;

export interface NotifyInput {
  userId: string;
  bookingId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  email?: EmailMessage;
}

/**
 * Menyimpan notifikasi in-app lalu mencoba mengirim email.
 * Kegagalan email tidak menggagalkan alur bisnis; statusnya dicatat
 * (SENT/SKIPPED/FAILED) dan aplikasi tidak mengklaim email terkirim.
 */
export async function notify(input: NotifyInput, db: Db = prisma) {
  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      bookingId: input.bookingId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      emailStatus: input.email ? "PENDING" : "SKIPPED",
    },
  });

  if (!input.email) return notification;

  let emailStatus: "SENT" | "SKIPPED" | "FAILED" = "FAILED";
  try {
    const result = await getEmailProvider().send(input.email);
    emailStatus = result.status;
  } catch (error) {
    console.error(
      "[notifications] email gagal:",
      error instanceof Error ? error.message : error,
    );
  }

  return db.notification.update({
    where: { id: notification.id },
    data: { emailStatus },
  });
}

/** Notifikasi untuk seluruh admin aktif, plus alamat admin opsional di env. */
export async function notifyAdmins(
  input: Omit<NotifyInput, "userId">,
  db: Db = prisma,
) {
  const admins = await db.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true, email: true, name: true },
  });

  const results = [];
  for (const admin of admins) {
    results.push(
      await notify(
        {
          ...input,
          userId: admin.id,
          email: input.email
            ? { ...input.email, to: admin.email }
            : undefined,
        },
        db,
      ),
    );
  }

  // Alamat tambahan (mis. kotak masuk sarana prasarana) bila diatur.
  if (emailConfig.adminNotificationEmail && input.email) {
    try {
      await getEmailProvider().send({
        ...input.email,
        to: emailConfig.adminNotificationEmail,
      });
    } catch (error) {
      console.error(
        "[notifications] email admin gagal:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return results;
}

export async function listNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function unreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  return prisma.notification.updateMany({
    where: {
      userId,
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
    },
    data: { isRead: true },
  });
}
