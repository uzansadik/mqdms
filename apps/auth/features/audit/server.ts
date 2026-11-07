import { writeAuditLog } from "@mqdms/audit";
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

export async function audit({ organizationId, action, target, metadata }: AuditInput) {
  const session = await getSession();

  if (!session) {
    return;
  }

  const requestHeaders = await headers();

  await writeAuditLog({
    organizationId,

    actorId: session.user.id,

    action,

    target,

    metadata,

    ipAddress: requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip"),

    userAgent: requestHeaders.get("user-agent"),
  });
}
