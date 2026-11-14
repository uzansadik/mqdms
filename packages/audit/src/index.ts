import { db } from "@mqdms/db";
import { auditLog } from "@mqdms/db/schema";
import { and, desc, eq } from "drizzle-orm";

import type { AuditClient, WriteAuditLogInput } from "./types";

/**
 * Audit kaydı yazar.
 *
 * İkinci parametre olarak bir transaction istemcisi geçilebilir: kayıt ile
 * onu üreten işlem aynı transaction içinde yazılırsa, audit yazımı
 * başarısız olduğunda kayıt da geri alınır.
 */
export async function writeAuditLog(
  {
    organizationId,
    actorId,
    action,
    target,
    metadata = {},
    ipAddress,
    userAgent,
  }: WriteAuditLogInput,
  client: AuditClient = db,
) {
  await client.insert(auditLog).values({
    organizationId: organizationId ?? null,
    actorId: actorId ?? null,

    action,

    targetType: target?.type ?? null,
    targetId: target?.id ?? null,

    metadata,

    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });
}

/** Bir audit kaydının okunabilir özeti. */
export type AuditLogEntry = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

/**
 * Bir hedefin audit geçmişini okur.
 *
 * Kayıtlar en yeniden eskiye doğru sıralanır. Sorgu daima
 * `organizationId` ile kısıtlanır: başka organizasyonun geçmişi görünmez.
 */
export async function listAuditLogs(input: {
  organizationId: string;
  targetType: string;
  targetId: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.organizationId, input.organizationId),
        eq(auditLog.targetType, input.targetType),
        eq(auditLog.targetId, input.targetId),
      ),
    )
    .orderBy(desc(auditLog.createdAt))
    .limit(input.limit ?? 50);
}

export type {
  AuditClient,
  AuditTarget,
  WriteAuditLogInput,
} from "./types";
