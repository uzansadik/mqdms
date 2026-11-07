import { db } from "@mqdms/db";
import { auditLog } from "@mqdms/db/schema";

import type { WriteAuditLogInput } from "./types";

export async function writeAuditLog({
  organizationId,
  actorId,
  action,
  target,
  metadata = {},
  ipAddress,
  userAgent,
}: WriteAuditLogInput) {
  await db.insert(auditLog).values({
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
  AuditTarget,
  WriteAuditLogInput,
} from "./types";
