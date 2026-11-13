import type { db } from "@mqdms/db";

export type AuditTarget = {
  type: string;
  id?: string | null;
};

/**
 * Veritabanı istemcisi.
 *
 * Hem normal `db` hem de `db.transaction()` içinden gelen transaction
 * istemcisi aynı arayüzü sunar. Bir kayıt ile onun audit kaydının **tek
 * transaction'da** yazılması gerektiğinde transaction istemcisi geçilir.
 */
export type AuditClient = Pick<typeof db, "insert">;

export type WriteAuditLogInput = {
  organizationId?: string | null;
  actorId?: string | null;

  action: string;

  target?: AuditTarget;

  metadata?: Record<string, unknown>;

  ipAddress?: string | null;
  userAgent?: string | null;
};
