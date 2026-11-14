import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import {
  item,
  itemGroup,
  processIoDefinition,
  processVariantApplicability,
  processVariantApplicabilityItemGroup,
} from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import { assertRevisionEditable } from "@/features/process-variants/service";

import { getProcessApplicability, getProcessIoDefinition } from "./repository";
import type { ProcessApplicabilityFormValues, ProcessIoFormValues } from "./schema";

/**
 * Process Input/Output ve Applicability servisi.
 *
 * Girdi/çıktı tanımları yalnızca açıklayıcıdır: stok hareketi üretmezler.
 * Applicability kuralları, prosesin önerilebileceği malzeme ve üretim
 * koşullarını tanımlar.
 */

/** İş kuralı ihlali. */
export class ProcessIoRuleError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "CONFLICT"
      | "INVALID_INPUT"
      | "FORBIDDEN"
      | "INVALID_STATE" = "INVALID_INPUT",
  ) {
    super(message);
    this.name = "ProcessIoRuleError";
  }
}

/** Yetki kontrolü. */
async function requireIoPermission(context: AuthContext, action: string): Promise<void> {
  if (!(await hasPermission(context, "processVariants", action))) {
    throw new ProcessIoRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
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

/** Item ve item grup referanslarını doğrular. */
async function validateReferences(
  organizationId: string,
  input: { itemId: string | null; itemGroupId: string | null },
): Promise<void> {
  if (input.itemId) {
    const rows = await db
      .select({ id: item.id })
      .from(item)
      .where(and(eq(item.organizationId, organizationId), eq(item.id, input.itemId)))
      .limit(1);

    if (!rows[0]) {
      throw new ProcessIoRuleError("Ürün bulunamadı.", "NOT_FOUND");
    }
  }

  if (input.itemGroupId) {
    const rows = await db
      .select({ id: itemGroup.id })
      .from(itemGroup)
      .where(and(eq(itemGroup.organizationId, organizationId), eq(itemGroup.id, input.itemGroupId)))
      .limit(1);

    if (!rows[0]) {
      throw new ProcessIoRuleError("Ürün grubu bulunamadı.", "NOT_FOUND");
    }
  }
}

/** Girdi/çıktı tanımı oluşturur. */
export async function createProcessIoDefinition(
  context: AuthContext,
  input: ProcessIoFormValues,
): Promise<string> {
  await requireIoPermission(context, "update");

  await assertRevisionEditable(context, input.processVariantRevisionId);

  await validateReferences(context.organizationId, input);

  return db.transaction(async (tx) => {
    const created = await tx
      .insert(processIoDefinition)
      .values({
        organizationId: context.organizationId,
        processVariantRevisionId: input.processVariantRevisionId,
        logicalId: crypto.randomUUID(),
        direction: input.direction,
        resourceType: input.resourceType,
        name: input.name,
        description: toNull(input.description),
        itemGroupId: input.itemGroupId,
        itemId: input.itemId,
        processState: toNull(input.processState),
        isRequired: input.isRequired,
      })
      .returning({ id: processIoDefinition.id });

    const ioId = created[0]?.id;

    if (!ioId) {
      throw new ProcessIoRuleError("Girdi/çıktı tanımı oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processIo.created",
        target: { type: "processIoDefinition", id: ioId },
        metadata: {
          processVariantRevisionId: input.processVariantRevisionId,
          direction: input.direction,
          name: input.name,
        },
      },
      tx,
    );

    return ioId;
  });
}

/** Girdi/çıktı tanımını günceller. */
export async function updateProcessIoDefinition(
  context: AuthContext,
  ioId: string,
  input: ProcessIoFormValues,
): Promise<void> {
  await requireIoPermission(context, "update");

  const target = await getProcessIoDefinition(context.organizationId, ioId);

  if (!target) {
    throw new ProcessIoRuleError("Girdi/çıktı tanımı bulunamadı.", "NOT_FOUND");
  }

  await assertRevisionEditable(context, target.processVariantRevisionId);

  await validateReferences(context.organizationId, input);

  await db.transaction(async (tx) => {
    await tx
      .update(processIoDefinition)
      .set({
        direction: input.direction,
        resourceType: input.resourceType,
        name: input.name,
        description: toNull(input.description),
        itemGroupId: input.itemGroupId,
        itemId: input.itemId,
        processState: toNull(input.processState),
        isRequired: input.isRequired,
      })
      .where(
        and(
          eq(processIoDefinition.organizationId, context.organizationId),
          eq(processIoDefinition.id, ioId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processIo.updated",
        target: { type: "processIoDefinition", id: ioId },
        metadata: { direction: input.direction, name: input.name },
      },
      tx,
    );
  });
}

/** Girdi/çıktı tanımını siler. */
export async function deleteProcessIoDefinition(context: AuthContext, ioId: string): Promise<void> {
  await requireIoPermission(context, "update");

  const target = await getProcessIoDefinition(context.organizationId, ioId);

  if (!target) {
    throw new ProcessIoRuleError("Girdi/çıktı tanımı bulunamadı.", "NOT_FOUND");
  }

  await assertRevisionEditable(context, target.processVariantRevisionId);

  await db.transaction(async (tx) => {
    await tx
      .delete(processIoDefinition)
      .where(
        and(
          eq(processIoDefinition.organizationId, context.organizationId),
          eq(processIoDefinition.id, ioId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processIo.removed",
        target: { type: "processIoDefinition", id: ioId },
        metadata: { direction: target.direction, name: target.name },
      },
      tx,
    );
  });
}

/**
 * Applicability kuralı oluşturur.
 *
 * Kural, item gruplarını ve koşulları ile birlikte tanımlanır.
 */
export async function createProcessApplicability(
  context: AuthContext,
  input: ProcessApplicabilityFormValues,
): Promise<string> {
  await requireIoPermission(context, "update");

  await assertRevisionEditable(context, input.processVariantRevisionId);

  return db.transaction(async (tx) => {
    const created = await tx
      .insert(processVariantApplicability)
      .values({
        organizationId: context.organizationId,
        processVariantRevisionId: input.processVariantRevisionId,
        name: input.name,
        description: toNull(input.description),
        supplyType: input.supplyType,
        joiningMethod: input.joiningMethod,
        isActive: input.isActive,
      })
      .returning({ id: processVariantApplicability.id });

    const applicabilityId = created[0]?.id;

    if (!applicabilityId) {
      throw new ProcessIoRuleError("Applicability kuralı oluşturulamadı.", "INVALID_INPUT");
    }

    if (input.itemGroupIds.length > 0) {
      await tx.insert(processVariantApplicabilityItemGroup).values(
        input.itemGroupIds.map((itemGroupId) => ({
          organizationId: context.organizationId,
          applicabilityId,
          itemGroupId,
          includeDescendants: true,
        })),
      );
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processApplicability.created",
        target: { type: "processApplicability", id: applicabilityId },
        metadata: {
          processVariantRevisionId: input.processVariantRevisionId,
          name: input.name,
          itemGroupCount: input.itemGroupIds.length,
        },
      },
      tx,
    );

    return applicabilityId;
  });
}

/** Applicability kuralını siler. */
export async function deleteProcessApplicability(
  context: AuthContext,
  applicabilityId: string,
): Promise<void> {
  await requireIoPermission(context, "update");

  const target = await getProcessApplicability(context.organizationId, applicabilityId);

  if (!target) {
    throw new ProcessIoRuleError("Applicability kuralı bulunamadı.", "NOT_FOUND");
  }

  await assertRevisionEditable(context, target.processVariantRevisionId);

  await db.transaction(async (tx) => {
    await tx
      .delete(processVariantApplicability)
      .where(
        and(
          eq(processVariantApplicability.organizationId, context.organizationId),
          eq(processVariantApplicability.id, applicabilityId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processApplicability.removed",
        target: { type: "processApplicability", id: applicabilityId },
        metadata: { name: target.name },
      },
      tx,
    );
  });
}
