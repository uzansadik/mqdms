import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import { processFunction, processFunctionRequirement, processRequirement } from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import { assertRevisionEditable, lockDraftRevision } from "@/features/process-variants/service";
import { getWorkElement } from "@/features/process-work-elements/repository";

import { getProcessFunction, getProcessRequirement, listFunctionRequirements } from "./repository";
import type { ProcessFunctionFormValues, ProcessRequirementFormValues } from "./schema";

/**
 * Process Function ve Requirement servisi.
 *
 * Fonksiyonlar ve gereklilikler revision'a bağlıdır; yalnızca taslak
 * revision'da düzenlenebilir.
 */

/** İş kuralı ihlali. */
export class ProcessContentRuleError extends Error {
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
    this.name = "ProcessContentRuleError";
  }
}

/** Yetki kontrolü. */
async function requireContentPermission(context: AuthContext, action: string): Promise<void> {
  if (!(await hasPermission(context, "processVariants", action))) {
    throw new ProcessContentRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
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
 * Work element referansının aynı revision'a ait olduğunu doğrular.
 *
 * Fonksiyon, work element'e bağlandığında ikisi de aynı teknik revision
 * kapsamında olmalıdır; aksi halde revision'lar arası sızıntı oluşur.
 */
async function assertWorkElementInRevision(
  context: AuthContext,
  processWorkElementId: string | null,
  processVariantRevisionId: string,
): Promise<void> {
  if (!processWorkElementId) {
    return;
  }

  const workElement = await getWorkElement(context.organizationId, processWorkElementId);

  if (!workElement) {
    throw new ProcessContentRuleError("Work element bulunamadı.", "NOT_FOUND");
  }

  if (workElement.processVariantRevisionId !== processVariantRevisionId) {
    throw new ProcessContentRuleError(
      "Work element aynı revision'a ait olmalıdır.",
      "INVALID_INPUT",
    );
  }
}

/** Fonksiyon oluşturur. */
export async function createProcessFunction(
  context: AuthContext,
  input: ProcessFunctionFormValues,
): Promise<string> {
  await requireContentPermission(context, "update");

  await assertRevisionEditable(context, input.processVariantRevisionId);

  await assertWorkElementInRevision(
    context,
    input.processWorkElementId,
    input.processVariantRevisionId,
  );

  return db.transaction(async (tx) => {
    /*
     * Revision satırı kilitlenerek düzenlenebilir durumu transaction
     * içinde yeniden doğrulanır: incelemeye gönderilen bir
     * revision'a içerik yazılamaz.
     */
    const editable = await lockDraftRevision(
      tx,
      context.organizationId,
      input.processVariantRevisionId,
    );

    if (!editable) {
      throw new ProcessContentRuleError(
        "Revision düzenlenemez; yalnızca taslak revision değiştirilebilir.",
        "INVALID_STATE",
      );
    }
    const created = await tx
      .insert(processFunction)
      .values({
        organizationId: context.organizationId,
        processVariantRevisionId: input.processVariantRevisionId,
        logicalId: crypto.randomUUID(),
        name: input.name,
        description: toNull(input.description),
        functionScope: input.functionScope,
        processWorkElementId: input.processWorkElementId,
      })
      .returning({ id: processFunction.id });

    const functionId = created[0]?.id;

    if (!functionId) {
      throw new ProcessContentRuleError("Fonksiyon oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processFunction.created",
        target: { type: "processFunction", id: functionId },
        metadata: {
          processVariantRevisionId: input.processVariantRevisionId,
          name: input.name,
          functionScope: input.functionScope,
        },
      },
      tx,
    );

    return functionId;
  });
}

/** Fonksiyonu günceller. */
export async function updateProcessFunction(
  context: AuthContext,
  functionId: string,
  input: ProcessFunctionFormValues,
): Promise<void> {
  await requireContentPermission(context, "update");

  const target = await getProcessFunction(context.organizationId, functionId);

  if (!target) {
    throw new ProcessContentRuleError("Fonksiyon bulunamadı.", "NOT_FOUND");
  }

  await assertRevisionEditable(context, target.processVariantRevisionId);

  await assertWorkElementInRevision(
    context,
    input.processWorkElementId,
    target.processVariantRevisionId,
  );

  await db.transaction(async (tx) => {
    /*
     * Revision satırı kilitlenerek düzenlenebilir durumu transaction
     * içinde yeniden doğrulanır: incelemeye gönderilen bir
     * revision'a içerik yazılamaz.
     */
    const editable = await lockDraftRevision(
      tx,
      context.organizationId,
      target.processVariantRevisionId,
    );

    if (!editable) {
      throw new ProcessContentRuleError(
        "Revision düzenlenemez; yalnızca taslak revision değiştirilebilir.",
        "INVALID_STATE",
      );
    }
    await tx
      .update(processFunction)
      .set({
        name: input.name,
        description: toNull(input.description),
        functionScope: input.functionScope,
        processWorkElementId: input.processWorkElementId,
      })
      .where(
        and(
          eq(processFunction.organizationId, context.organizationId),
          eq(processFunction.id, functionId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processFunction.updated",
        target: { type: "processFunction", id: functionId },
        metadata: { name: input.name },
      },
      tx,
    );
  });
}

/** Fonksiyonu siler. */
export async function deleteProcessFunction(
  context: AuthContext,
  functionId: string,
): Promise<void> {
  await requireContentPermission(context, "update");

  const target = await getProcessFunction(context.organizationId, functionId);

  if (!target) {
    throw new ProcessContentRuleError("Fonksiyon bulunamadı.", "NOT_FOUND");
  }

  await assertRevisionEditable(context, target.processVariantRevisionId);

  await db.transaction(async (tx) => {
    /*
     * Revision satırı kilitlenerek düzenlenebilir durumu transaction
     * içinde yeniden doğrulanır: incelemeye gönderilen bir
     * revision'a içerik yazılamaz.
     */
    const editable = await lockDraftRevision(
      tx,
      context.organizationId,
      target.processVariantRevisionId,
    );

    if (!editable) {
      throw new ProcessContentRuleError(
        "Revision düzenlenemez; yalnızca taslak revision değiştirilebilir.",
        "INVALID_STATE",
      );
    }
    await tx
      .delete(processFunction)
      .where(
        and(
          eq(processFunction.organizationId, context.organizationId),
          eq(processFunction.id, functionId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processFunction.removed",
        target: { type: "processFunction", id: functionId },
        metadata: { name: target.name },
      },
      tx,
    );
  });
}

/** Gereklilik oluşturur. */
export async function createProcessRequirement(
  context: AuthContext,
  input: ProcessRequirementFormValues,
): Promise<string> {
  await requireContentPermission(context, "update");

  await assertRevisionEditable(context, input.processVariantRevisionId);

  return db.transaction(async (tx) => {
    /*
     * Revision satırı kilitlenerek düzenlenebilir durumu transaction
     * içinde yeniden doğrulanır: incelemeye gönderilen bir
     * revision'a içerik yazılamaz.
     */
    const editable = await lockDraftRevision(
      tx,
      context.organizationId,
      input.processVariantRevisionId,
    );

    if (!editable) {
      throw new ProcessContentRuleError(
        "Revision düzenlenemez; yalnızca taslak revision değiştirilebilir.",
        "INVALID_STATE",
      );
    }
    const created = await tx
      .insert(processRequirement)
      .values({
        organizationId: context.organizationId,
        processVariantRevisionId: input.processVariantRevisionId,
        logicalId: crypto.randomUUID(),
        code: input.code,
        name: input.name,
        description: toNull(input.description),
        requirementType: input.requirementType,
        sourceReference: toNull(input.sourceReference),
        isMandatory: input.isMandatory,
      })
      .returning({ id: processRequirement.id });

    const requirementId = created[0]?.id;

    if (!requirementId) {
      throw new ProcessContentRuleError("Gereklilik oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processRequirement.created",
        target: { type: "processRequirement", id: requirementId },
        metadata: {
          processVariantRevisionId: input.processVariantRevisionId,
          code: input.code,
          name: input.name,
          requirementType: input.requirementType,
        },
      },
      tx,
    );

    return requirementId;
  });
}

/** Gerekliliği günceller. */
export async function updateProcessRequirement(
  context: AuthContext,
  requirementId: string,
  input: ProcessRequirementFormValues,
): Promise<void> {
  await requireContentPermission(context, "update");

  const target = await getProcessRequirement(context.organizationId, requirementId);

  if (!target) {
    throw new ProcessContentRuleError("Gereklilik bulunamadı.", "NOT_FOUND");
  }

  await assertRevisionEditable(context, target.processVariantRevisionId);

  await db.transaction(async (tx) => {
    /*
     * Revision satırı kilitlenerek düzenlenebilir durumu transaction
     * içinde yeniden doğrulanır: incelemeye gönderilen bir
     * revision'a içerik yazılamaz.
     */
    const editable = await lockDraftRevision(
      tx,
      context.organizationId,
      target.processVariantRevisionId,
    );

    if (!editable) {
      throw new ProcessContentRuleError(
        "Revision düzenlenemez; yalnızca taslak revision değiştirilebilir.",
        "INVALID_STATE",
      );
    }
    await tx
      .update(processRequirement)
      .set({
        code: input.code,
        name: input.name,
        description: toNull(input.description),
        requirementType: input.requirementType,
        sourceReference: toNull(input.sourceReference),
        isMandatory: input.isMandatory,
      })
      .where(
        and(
          eq(processRequirement.organizationId, context.organizationId),
          eq(processRequirement.id, requirementId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processRequirement.updated",
        target: { type: "processRequirement", id: requirementId },
        metadata: { code: input.code, name: input.name },
      },
      tx,
    );
  });
}

/** Gerekliliği siler. */
export async function deleteProcessRequirement(
  context: AuthContext,
  requirementId: string,
): Promise<void> {
  await requireContentPermission(context, "update");

  const target = await getProcessRequirement(context.organizationId, requirementId);

  if (!target) {
    throw new ProcessContentRuleError("Gereklilik bulunamadı.", "NOT_FOUND");
  }

  await assertRevisionEditable(context, target.processVariantRevisionId);

  await db.transaction(async (tx) => {
    /*
     * Revision satırı kilitlenerek düzenlenebilir durumu transaction
     * içinde yeniden doğrulanır: incelemeye gönderilen bir
     * revision'a içerik yazılamaz.
     */
    const editable = await lockDraftRevision(
      tx,
      context.organizationId,
      target.processVariantRevisionId,
    );

    if (!editable) {
      throw new ProcessContentRuleError(
        "Revision düzenlenemez; yalnızca taslak revision değiştirilebilir.",
        "INVALID_STATE",
      );
    }
    await tx
      .delete(processRequirement)
      .where(
        and(
          eq(processRequirement.organizationId, context.organizationId),
          eq(processRequirement.id, requirementId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processRequirement.removed",
        target: { type: "processRequirement", id: requirementId },
        metadata: { code: target.code, name: target.name },
      },
      tx,
    );
  });
}

/**
 * Fonksiyonu gerekliliğe bağlar.
 *
 * Fonksiyon ve gereklilik aynı revision kapsamında olmalıdır.
 */
export async function linkFunctionRequirement(
  context: AuthContext,
  functionId: string,
  requirementId: string,
): Promise<void> {
  await requireContentPermission(context, "update");

  const functionRecord = await getProcessFunction(context.organizationId, functionId);

  if (!functionRecord) {
    throw new ProcessContentRuleError("Fonksiyon bulunamadı.", "NOT_FOUND");
  }

  const requirement = await getProcessRequirement(context.organizationId, requirementId);

  if (!requirement) {
    throw new ProcessContentRuleError("Gereklilik bulunamadı.", "NOT_FOUND");
  }

  if (functionRecord.processVariantRevisionId !== requirement.processVariantRevisionId) {
    throw new ProcessContentRuleError(
      "Fonksiyon ve gereklilik aynı revision kapsamında olmalıdır.",
      "INVALID_INPUT",
    );
  }

  await assertRevisionEditable(context, functionRecord.processVariantRevisionId);

  const existing = await listFunctionRequirements(context.organizationId, functionId);

  if (existing.some((entry) => entry.id === requirementId)) {
    return;
  }

  await db.transaction(async (tx) => {
    /*
     * Revision satırı kilitlenerek düzenlenebilir durumu transaction
     * içinde yeniden doğrulanır: incelemeye gönderilen bir
     * revision'a içerik yazılamaz.
     */
    const editable = await lockDraftRevision(
      tx,
      context.organizationId,
      functionRecord.processVariantRevisionId,
    );

    if (!editable) {
      throw new ProcessContentRuleError(
        "Revision düzenlenemez; yalnızca taslak revision değiştirilebilir.",
        "INVALID_STATE",
      );
    }
    await tx.insert(processFunctionRequirement).values({
      organizationId: context.organizationId,
      processFunctionId: functionId,
      processRequirementId: requirementId,
    });

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processFunction.requirementLinked",
        target: { type: "processFunction", id: functionId },
        metadata: { processRequirementId: requirementId },
      },
      tx,
    );
  });
}

/** Fonksiyonun gereklilik bağlantısını kaldırır. */
export async function unlinkFunctionRequirement(
  context: AuthContext,
  functionId: string,
  requirementId: string,
): Promise<void> {
  await requireContentPermission(context, "update");

  const functionRecord = await getProcessFunction(context.organizationId, functionId);

  if (!functionRecord) {
    throw new ProcessContentRuleError("Fonksiyon bulunamadı.", "NOT_FOUND");
  }

  await assertRevisionEditable(context, functionRecord.processVariantRevisionId);

  await db.transaction(async (tx) => {
    /*
     * Revision satırı kilitlenerek düzenlenebilir durumu transaction
     * içinde yeniden doğrulanır: incelemeye gönderilen bir
     * revision'a içerik yazılamaz.
     */
    const editable = await lockDraftRevision(
      tx,
      context.organizationId,
      functionRecord.processVariantRevisionId,
    );

    if (!editable) {
      throw new ProcessContentRuleError(
        "Revision düzenlenemez; yalnızca taslak revision değiştirilebilir.",
        "INVALID_STATE",
      );
    }
    await tx
      .delete(processFunctionRequirement)
      .where(
        and(
          eq(processFunctionRequirement.organizationId, context.organizationId),
          eq(processFunctionRequirement.processFunctionId, functionId),
          eq(processFunctionRequirement.processRequirementId, requirementId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "processFunction.requirementUnlinked",
        target: { type: "processFunction", id: functionId },
        metadata: { processRequirementId: requirementId },
      },
      tx,
    );
  });
}
