import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = PrismaClient | Prisma.TransactionClient;

export interface AuditInput {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Mencatat aktivitas penting (login, pembuatan, keputusan, pembatalan).
 * Kegagalan audit tidak boleh menggagalkan operasi utama.
 */
export async function recordAudit(input: AuditInput, db: Db = prisma) {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("[audit] gagal mencatat aktivitas:", error instanceof Error ? error.message : error);
  }
}
