import { type AuditClient, writeAuditLog } from "@mqdms/audit";
import { headers } from "next/headers";

import { getSession } from "@/features/auth/session";

type AuditInput = {
  organizationId?: string | null;

  action: string;

  target?: {
    type: string;
    id?: string | null;
  };

  metadata?: Record<string, unknown>;
};

/**
 * Audit kaydı yazar.
 *
 * İkinci parametre olarak transaction istemcisi geçilebilir: kayıt ile onu
 * üreten işlem aynı transaction'da yazılmalıdır.
 */
export async function audit(
  { organizationId, action, target, metadata }: AuditInput,
  client?: AuditClient,
) {
  const session = await getSession();

  if (!session) {
    return;
  }

  const requestHeaders = await headers();

  await writeAuditLog(
    {
      organizationId,

      actorId: session.user.id,

      action,

      target,

      metadata,

      ipAddress: requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip"),

      userAgent: requestHeaders.get("user-agent"),
    },
    client,
  );
}
