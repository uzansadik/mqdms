import { db } from "@mqdms/db";
import { auditLog } from "@mqdms/db/schema";

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

export type {
  AuditClient,
  AuditTarget,
  WriteAuditLogInput,
} from "./types";
