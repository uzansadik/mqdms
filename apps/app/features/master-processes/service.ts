import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import { process } from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import { findProcessByCode, getProcess } from "./repository";
import type { ProcessFormValues } from "./schema";

/**
 * Master Process servisi.
 *
 * Master Process organizasyonun ortak proses tanımıdır; bir projeye ait
 * olmaz. Kullanılan kayıtlar fiziksel olarak silinmez; arşivlenir.
 */

/** İş kuralı ihlali. */
export class ProcessRuleError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "ProcessRuleError";
  }
}

/**
 * Yetki kontrolü.
 *
 * Proses kütüphanesi `masterProcesses` izniyle yönetilir.
 */
async function requireProcessPermission(context: AuthContext, action: string): Promise<void> {
  if (!(await hasPermission(context, "masterProcesses", action))) {
    throw new ProcessRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
  }
}

/** Boş string'i `null`'a çevirir. */
function toNull(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

/**
 * Master Process oluşturur.
 *
 * Kod organizasyon içinde case-insensitive unique'tır.
 */
export async function createProcess(
  context: AuthContext,
  input: ProcessFormValues,
): Promise<string> {
  await requireProcessPermission(context, "create");

  const existing = await findProcessByCode(context.organizationId, input.code);

  if (existing) {
    throw new ProcessRuleError("Bu proses kodu zaten kullanılıyor.", "CONFLICT");
  }

  return db.transaction(async (tx) => {
    const created = await tx
      .insert(process)
      .values({
        organizationId: context.organizationId,
        code: input.code,
        name: input.name,
        description: toNull(input.description),
        category: input.category,
        status: input.status,
        createdById: context.userId,
      })
      .returning({ id: process.id });

    const processId = created[0]?.id;

    if (!processId) {
      throw new ProcessRuleError("Proses oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "process.created",
        target: { type: "process", id: processId },
        metadata: { code: input.code, name: input.name, category: input.category },
      },
      tx,
    );

    return processId;
  });
}

/** Master Process'i günceller. */
export async function updateProcess(
  context: AuthContext,
  processId: string,
  input: ProcessFormValues,
): Promise<void> {
  await requireProcessPermission(context, "update");

  const target = await getProcess(context.organizationId, processId);

  if (!target) {
    throw new ProcessRuleError("Proses bulunamadı.", "NOT_FOUND");
  }

  const existing = await findProcessByCode(context.organizationId, input.code, processId);

  if (existing) {
    throw new ProcessRuleError("Bu proses kodu zaten kullanılıyor.", "CONFLICT");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(process)
      .set({
        code: input.code,
        name: input.name,
        description: toNull(input.description),
        category: input.category,
        status: input.status,
      })
      .where(and(eq(process.organizationId, context.organizationId), eq(process.id, processId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "process.updated",
        target: { type: "process", id: processId },
        metadata: { code: input.code, name: input.name, category: input.category },
      },
      tx,
    );
  });
}

/**
 * Master Process'i arşivler.
 *
 * Kayıt fiziksel olarak silinmez; arşivlenir ve geri alınabilir.
 */
export async function archiveProcess(context: AuthContext, processId: string): Promise<void> {
  await requireProcessPermission(context, "archive");

  const target = await getProcess(context.organizationId, processId);

  if (!target) {
    throw new ProcessRuleError("Proses bulunamadı.", "NOT_FOUND");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(process)
      .set({ archivedAt: new Date() })
      .where(and(eq(process.organizationId, context.organizationId), eq(process.id, processId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "process.archived",
        target: { type: "process", id: processId },
        metadata: { code: target.code, name: target.name },
      },
      tx,
    );
  });
}

/** Arşivlenen Master Process'i geri alır. */
export async function restoreProcess(context: AuthContext, processId: string): Promise<void> {
  await requireProcessPermission(context, "restore");

  const target = await getProcess(context.organizationId, processId);

  if (!target) {
    throw new ProcessRuleError("Proses bulunamadı.", "NOT_FOUND");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(process)
      .set({ archivedAt: null })
      .where(and(eq(process.organizationId, context.organizationId), eq(process.id, processId)));

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "process.restored",
        target: { type: "process", id: processId },
        metadata: { code: target.code, name: target.name },
      },
      tx,
    );
  });
}
