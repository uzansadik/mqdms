import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { type DbClient, db } from "@mqdms/db";
import {
  fmeaAction,
  fmeaActionPriority,
  fmeaControl,
  fmeaDocument,
  fmeaFailureCause,
  fmeaFailureMode,
  fmeaFunction,
  fmeaRiskMatrix,
  fmeaSpecialCharacteristic,
  fmeaStructureElement,
} from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import { assertRevisionEditable } from "@/features/process-variants/service";

import { canTransition, type FmeaDocumentStatus } from "./lifecycle";
import {
  type ActionPriority,
  type ActionPriorityRow,
  DEFAULT_ACTION_PRIORITY_MATRIX,
  DEFAULT_RISK_CLASS_MATRIX,
} from "./rating";
import { getFailureMode, getFmeaDocument, getStructureElement } from "./repository";
import type {
  FmeaActionFormValues,
  FmeaControlFormValues,
  FmeaDocumentFormValues,
  FmeaFailureCauseFormValues,
  FmeaFailureModeFormValues,
  FmeaFunctionFormValues,
  FmeaSourceImportValues,
  FmeaSpecialCharacteristicFormValues,
  FmeaStructureElementFormValues,
} from "./schema";
import { buildImportedStructureRows } from "./source-import";

/**
 * FMEA servisi.
 *
 * Belgeler Process Variant Revision'a bağlıdır ve yalnızca **taslak**
 * durumdayken düzenlenebilir. Bir hata için iki kilit birlikte doğrulanır:
 * belgenin kendi durumu ve bağlı olduğu revision'ın durumu.
 */

/** İş kuralı ihlali. */
export class FmeaRuleError extends Error {
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
    this.name = "FmeaRuleError";
  }
}

/** Yetki kontrolü. */
async function requireFmeaPermission(context: AuthContext, action: string): Promise<void> {
  if (!(await hasPermission(context, "fmea", action))) {
    throw new FmeaRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
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
 * Belgenin düzenlenebilir olduğunu doğrular.
 *
 * İki koşul birlikte aranır:
 *
 * 1. Belgenin durumu `DRAFT` olmalıdır; incelemeye gönderilmiş bir belge
 *    üzerinde içerik değiştirilemez.
 * 2. Bağlı olduğu Process Variant Revision düzenlenebilir olmalıdır; aksi
 *    hâlde FMEA, değişmiş bir prosesi analiz ediyor olur.
 */
async function assertDocumentEditable(
  context: AuthContext,
  documentId: string,
): Promise<{ id: string; processVariantRevisionId: string; version: number }> {
  const document = await getFmeaDocument(context.organizationId, documentId);

  if (!document) {
    throw new FmeaRuleError("FMEA belgesi bulunamadı.", "NOT_FOUND");
  }

  if (document.status !== "DRAFT") {
    throw new FmeaRuleError(
      "FMEA belgesi incelemeye gönderilmiş; içerik değiştirilemez.",
      "INVALID_STATE",
    );
  }

  await assertRevisionEditable(context, document.processVariantRevisionId);

  return {
    id: document.id,
    processVariantRevisionId: document.processVariantRevisionId,
    version: document.version,
  };
}

/**
 * Belgenin düzenlenebilir olduğunu doğrular ve belgeyi döner.
 *
 * Alt kayıtlar (yapı elemanı, hata modu vb.) önce belgeye, sonra belge
 * üzerinden revision'a bağlıdır; bu yüzden iki doğrulama birlikte yapılır.
 */
async function assertTargetEditable(
  context: AuthContext,
  target: { fmeaDocumentId: string } | null | undefined,
  notFoundMessage: string,
): Promise<string> {
  if (!target) {
    throw new FmeaRuleError(notFoundMessage, "NOT_FOUND");
  }

  await assertDocumentEditable(context, target.fmeaDocumentId);

  return target.fmeaDocumentId;
}

/* -------------------------------------------------------------------------- */
/* Belge                                                                      */
/* -------------------------------------------------------------------------- */

/** Yeni FMEA belgesi oluşturur. */
export async function createFmeaDocument(
  context: AuthContext,
  revisionId: string,
  input: FmeaDocumentFormValues,
): Promise<string> {
  await requireFmeaPermission(context, "create");

  await assertRevisionEditable(context, revisionId);

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: fmeaDocument.id })
      .from(fmeaDocument)
      .where(
        and(
          eq(fmeaDocument.organizationId, context.organizationId),
          eq(fmeaDocument.processVariantRevisionId, revisionId),
          eq(fmeaDocument.fmeaType, input.fmeaType),
        ),
      )
      .limit(1);

    if (existing[0]) {
      throw new FmeaRuleError("Bu revision için bu FMEA tipinde zaten bir belge var.", "CONFLICT");
    }

    const created = await tx
      .insert(fmeaDocument)
      .values({
        organizationId: context.organizationId,
        processVariantRevisionId: revisionId,
        code: input.code.trim(),
        name: input.name.trim(),
        description: toNull(input.description),
        fmeaType: input.fmeaType,
        status: "DRAFT",
        evaluationMethod: input.evaluationMethod,
        scopeDescription: toNull(input.scopeDescription),
        responsibility: toNull(input.responsibility),
        targetDate: toNull(input.targetDate),
        createdById: context.userId,
      })
      .returning({ id: fmeaDocument.id });

    const documentId = created[0]?.id;

    if (!documentId) {
      throw new FmeaRuleError("FMEA belgesi oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaDocument.created",
        target: { type: "fmeaDocument", id: documentId },
        metadata: {
          processVariantRevisionId: revisionId,
          code: input.code.trim(),
          name: input.name.trim(),
          fmeaType: input.fmeaType,
        },
      },
      tx,
    );

    return documentId;
  });
}

/** FMEA belgesini günceller. */
export async function updateFmeaDocument(
  context: AuthContext,
  documentId: string,
  input: FmeaDocumentFormValues,
): Promise<void> {
  await requireFmeaPermission(context, "update");

  await assertDocumentEditable(context, documentId);

  await db.transaction(async (tx) => {
    /*
     * Sürüm, transaction içinde okunarak artırılır: iki kullanıcı aynı
     * anda güncellerse son yazanın sürümü ilk yazanın sürümünden büyük
     * olur ve istemci uyuşmazlık olarak algılar.
     */
    const current = await tx
      .select({ version: fmeaDocument.version })
      .from(fmeaDocument)
      .where(
        and(
          eq(fmeaDocument.organizationId, context.organizationId),
          eq(fmeaDocument.id, documentId),
        ),
      )
      .for("update")
      .limit(1);

    if (!current[0]) {
      throw new FmeaRuleError("FMEA belgesi bulunamadı.", "NOT_FOUND");
    }

    await tx
      .update(fmeaDocument)
      .set({
        code: input.code.trim(),
        name: input.name.trim(),
        description: toNull(input.description),
        evaluationMethod: input.evaluationMethod,
        scopeDescription: toNull(input.scopeDescription),
        responsibility: toNull(input.responsibility),
        targetDate: toNull(input.targetDate),
        version: current[0].version + 1,
      })
      .where(
        and(
          eq(fmeaDocument.organizationId, context.organizationId),
          eq(fmeaDocument.id, documentId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaDocument.updated",
        target: { type: "fmeaDocument", id: documentId },
        metadata: { code: input.code.trim(), name: input.name.trim() },
      },
      tx,
    );
  });
}

/** FMEA belgesini siler. */
export async function deleteFmeaDocument(context: AuthContext, documentId: string): Promise<void> {
  await requireFmeaPermission(context, "delete");

  const document = await getFmeaDocument(context.organizationId, documentId);

  if (!document) {
    throw new FmeaRuleError("FMEA belgesi bulunamadı.", "NOT_FOUND");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(fmeaDocument)
      .where(
        and(
          eq(fmeaDocument.organizationId, context.organizationId),
          eq(fmeaDocument.id, documentId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaDocument.removed",
        target: { type: "fmeaDocument", id: documentId },
        metadata: { code: document.code, name: document.name },
      },
      tx,
    );
  });
}

/**
 * Belgenin durumunu değiştirir.
 *
 * Geçiş kuralları `lifecycle.ts` içinde tanımlıdır; servis yalnızca
 * izinli geçişleri uygular.
 */
export async function transitionFmeaDocument(
  context: AuthContext,
  documentId: string,
  to: FmeaDocumentStatus,
  reason?: string,
): Promise<void> {
  const action =
    to === "IN_REVIEW"
      ? "submit"
      : to === "APPROVED"
        ? "approve"
        : to === "DRAFT"
          ? "reject"
          : "approve";

  await requireFmeaPermission(context, action);

  const document = await getFmeaDocument(context.organizationId, documentId);

  if (!document) {
    throw new FmeaRuleError("FMEA belgesi bulunamadı.", "NOT_FOUND");
  }

  if (!canTransition(document.status, to)) {
    throw new FmeaRuleError(
      `Belge ${document.status} durumundan ${to} durumuna geçemez.`,
      "INVALID_STATE",
    );
  }

  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ status: fmeaDocument.status })
      .from(fmeaDocument)
      .where(
        and(
          eq(fmeaDocument.organizationId, context.organizationId),
          eq(fmeaDocument.id, documentId),
        ),
      )
      .for("update")
      .limit(1);

    if (!rows[0]) {
      throw new FmeaRuleError("FMEA belgesi bulunamadı.", "NOT_FOUND");
    }

    if (!canTransition(rows[0].status, to)) {
      throw new FmeaRuleError(
        `Belge ${rows[0].status} durumundan ${to} durumuna geçemez.`,
        "INVALID_STATE",
      );
    }

    const now = new Date();

    await tx
      .update(fmeaDocument)
      .set({
        status: to,
        version: document.version + 1,
        submittedAt: to === "IN_REVIEW" ? now : document.submittedAt,
        submittedById: to === "IN_REVIEW" ? context.userId : document.submittedById,
        approvedAt: to === "APPROVED" ? now : document.approvedAt,
        approvedById: to === "APPROVED" ? context.userId : document.approvedById,
        releasedAt: to === "RELEASED" ? now : document.releasedAt,
        releasedById: to === "RELEASED" ? context.userId : document.releasedById,
      })
      .where(
        and(
          eq(fmeaDocument.organizationId, context.organizationId),
          eq(fmeaDocument.id, documentId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: `fmeaDocument.${to.toLowerCase()}`,
        target: { type: "fmeaDocument", id: documentId },
        metadata: {
          from: document.status,
          to,
          reason: toNull(reason),
        },
      },
      tx,
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Yapı elemanları                                                            */
/* -------------------------------------------------------------------------- */

/** Yapı elemanı oluşturur. */
export async function createStructureElement(
  context: AuthContext,
  documentId: string,
  input: FmeaStructureElementFormValues,
): Promise<string> {
  await requireFmeaPermission(context, "update");

  await assertDocumentEditable(context, documentId);

  if (input.parentId) {
    const parent = await getStructureElement(context.organizationId, input.parentId);

    if (!parent || parent.fmeaDocumentId !== documentId) {
      throw new FmeaRuleError("Üst yapı elemanı bulunamadı.", "INVALID_INPUT");
    }
  }

  return db.transaction(async (tx) => {
    const siblings = await tx
      .select({ sortOrder: fmeaStructureElement.sortOrder })
      .from(fmeaStructureElement)
      .where(
        and(
          eq(fmeaStructureElement.organizationId, context.organizationId),
          eq(fmeaStructureElement.fmeaDocumentId, documentId),
        ),
      );

    const sortOrder = siblings.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;

    const created = await tx
      .insert(fmeaStructureElement)
      .values({
        organizationId: context.organizationId,
        fmeaDocumentId: documentId,
        parentId: toNull(input.parentId),
        level: input.level,
        code: input.code.trim(),
        name: input.name.trim(),
        description: toNull(input.description),
        flowNodeId: toNull(input.flowNodeId),
        itemId: toNull(input.itemId),
        processWorkElementId: toNull(input.processWorkElementId),
        isSpecialCharacteristic: input.isSpecialCharacteristic,
        sortOrder,
      })
      .returning({ id: fmeaStructureElement.id });

    const elementId = created[0]?.id;

    if (!elementId) {
      throw new FmeaRuleError("Yapı elemanı oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaStructure.created",
        target: { type: "fmeaStructureElement", id: elementId },
        metadata: {
          fmeaDocumentId: documentId,
          code: input.code.trim(),
          name: input.name.trim(),
          level: input.level,
        },
      },
      tx,
    );

    return elementId;
  });
}

/** Yapı elemanını günceller. */
export async function updateStructureElement(
  context: AuthContext,
  elementId: string,
  input: FmeaStructureElementFormValues,
): Promise<void> {
  await requireFmeaPermission(context, "update");

  const target = await getStructureElement(context.organizationId, elementId);

  await assertTargetEditable(context, target, "Yapı elemanı bulunamadı.");

  await db.transaction(async (tx) => {
    await tx
      .update(fmeaStructureElement)
      .set({
        parentId: toNull(input.parentId),
        level: input.level,
        code: input.code.trim(),
        name: input.name.trim(),
        description: toNull(input.description),
        flowNodeId: toNull(input.flowNodeId),
        itemId: toNull(input.itemId),
        processWorkElementId: toNull(input.processWorkElementId),
        isSpecialCharacteristic: input.isSpecialCharacteristic,
      })
      .where(
        and(
          eq(fmeaStructureElement.organizationId, context.organizationId),
          eq(fmeaStructureElement.id, elementId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaStructure.updated",
        target: { type: "fmeaStructureElement", id: elementId },
        metadata: { code: input.code.trim(), name: input.name.trim() },
      },
      tx,
    );
  });
}

/** Yapı elemanını siler. */
export async function deleteStructureElement(
  context: AuthContext,
  elementId: string,
): Promise<void> {
  await requireFmeaPermission(context, "update");

  const target = await getStructureElement(context.organizationId, elementId);

  await assertTargetEditable(context, target, "Yapı elemanı bulunamadı.");

  await db.transaction(async (tx) => {
    await tx
      .delete(fmeaStructureElement)
      .where(
        and(
          eq(fmeaStructureElement.organizationId, context.organizationId),
          eq(fmeaStructureElement.id, elementId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaStructure.removed",
        target: { type: "fmeaStructureElement", id: elementId },
        metadata: { code: target?.code, name: target?.name },
      },
      tx,
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Fonksiyonlar                                                               */
/* -------------------------------------------------------------------------- */

/** Fonksiyon oluşturur. */
export async function createFunction(
  context: AuthContext,
  documentId: string,
  input: FmeaFunctionFormValues,
): Promise<string> {
  await requireFmeaPermission(context, "update");

  await assertDocumentEditable(context, documentId);

  return db.transaction(async (tx) => {
    const created = await tx
      .insert(fmeaFunction)
      .values({
        organizationId: context.organizationId,
        fmeaDocumentId: documentId,
        structureElementId: toNull(input.structureElementId),
        processFunctionId: toNull(input.processFunctionId),
        name: input.name.trim(),
        description: toNull(input.description),
        functionAspect: input.functionAspect,
        requirementText: toNull(input.requirementText),
        isSpecialCharacteristic: input.isSpecialCharacteristic,
      })
      .returning({ id: fmeaFunction.id });

    const functionId = created[0]?.id;

    if (!functionId) {
      throw new FmeaRuleError("Fonksiyon oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaFunction.created",
        target: { type: "fmeaFunction", id: functionId },
        metadata: { fmeaDocumentId: documentId, name: input.name.trim() },
      },
      tx,
    );

    return functionId;
  });
}

/** Fonksiyonu günceller. */
export async function updateFunction(
  context: AuthContext,
  functionId: string,
  input: FmeaFunctionFormValues,
): Promise<void> {
  await requireFmeaPermission(context, "update");

  const rows = await db
    .select({ fmeaDocumentId: fmeaFunction.fmeaDocumentId })
    .from(fmeaFunction)
    .where(
      and(eq(fmeaFunction.organizationId, context.organizationId), eq(fmeaFunction.id, functionId)),
    )
    .limit(1);

  await assertTargetEditable(context, rows[0], "Fonksiyon bulunamadı.");

  await db.transaction(async (tx) => {
    await tx
      .update(fmeaFunction)
      .set({
        structureElementId: toNull(input.structureElementId),
        processFunctionId: toNull(input.processFunctionId),
        name: input.name.trim(),
        description: toNull(input.description),
        functionAspect: input.functionAspect,
        requirementText: toNull(input.requirementText),
        isSpecialCharacteristic: input.isSpecialCharacteristic,
      })
      .where(
        and(
          eq(fmeaFunction.organizationId, context.organizationId),
          eq(fmeaFunction.id, functionId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaFunction.updated",
        target: { type: "fmeaFunction", id: functionId },
        metadata: { name: input.name.trim() },
      },
      tx,
    );
  });
}

/** Fonksiyonu siler. */
export async function deleteFunction(context: AuthContext, functionId: string): Promise<void> {
  await requireFmeaPermission(context, "update");

  const rows = await db
    .select({ fmeaDocumentId: fmeaFunction.fmeaDocumentId })
    .from(fmeaFunction)
    .where(
      and(eq(fmeaFunction.organizationId, context.organizationId), eq(fmeaFunction.id, functionId)),
    )
    .limit(1);

  await assertTargetEditable(context, rows[0], "Fonksiyon bulunamadı.");

  await db.transaction(async (tx) => {
    await tx
      .delete(fmeaFunction)
      .where(
        and(
          eq(fmeaFunction.organizationId, context.organizationId),
          eq(fmeaFunction.id, functionId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaFunction.removed",
        target: { type: "fmeaFunction", id: functionId },
      },
      tx,
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Hata analizi                                                               */
/* -------------------------------------------------------------------------- */

/** Hata modu oluşturur. */
export async function createFailureMode(
  context: AuthContext,
  documentId: string,
  input: FmeaFailureModeFormValues,
): Promise<string> {
  await requireFmeaPermission(context, "update");

  await assertDocumentEditable(context, documentId);

  const element = await getStructureElement(context.organizationId, input.structureElementId);

  if (!element || element.fmeaDocumentId !== documentId) {
    throw new FmeaRuleError("Yapı elemanı bulunamadı.", "INVALID_INPUT");
  }

  return db.transaction(async (tx) => {
    const created = await tx
      .insert(fmeaFailureMode)
      .values({
        organizationId: context.organizationId,
        fmeaDocumentId: documentId,
        structureElementId: input.structureElementId,
        functionId: toNull(input.functionId),
        failureMode: input.failureMode.trim(),
        failureEffectLocal: toNull(input.failureEffectLocal),
        failureEffectEnd: toNull(input.failureEffectEnd),
        severity: input.severity,
        severityClassification: input.severityClassification,
      })
      .returning({ id: fmeaFailureMode.id });

    const failureModeId = created[0]?.id;

    if (!failureModeId) {
      throw new FmeaRuleError("Hata modu oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaFailureMode.created",
        target: { type: "fmeaFailureMode", id: failureModeId },
        metadata: {
          fmeaDocumentId: documentId,
          failureMode: input.failureMode.trim(),
          severity: input.severity,
        },
      },
      tx,
    );

    return failureModeId;
  });
}

/** Hata modunu günceller. */
export async function updateFailureMode(
  context: AuthContext,
  failureModeId: string,
  input: FmeaFailureModeFormValues,
): Promise<void> {
  await requireFmeaPermission(context, "update");

  const target = await getFailureMode(context.organizationId, failureModeId);

  await assertTargetEditable(context, target, "Hata modu bulunamadı.");

  await db.transaction(async (tx) => {
    await tx
      .update(fmeaFailureMode)
      .set({
        structureElementId: input.structureElementId,
        functionId: toNull(input.functionId),
        failureMode: input.failureMode.trim(),
        failureEffectLocal: toNull(input.failureEffectLocal),
        failureEffectEnd: toNull(input.failureEffectEnd),
        severity: input.severity,
        severityClassification: input.severityClassification,
      })
      .where(
        and(
          eq(fmeaFailureMode.organizationId, context.organizationId),
          eq(fmeaFailureMode.id, failureModeId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaFailureMode.updated",
        target: { type: "fmeaFailureMode", id: failureModeId },
        metadata: { failureMode: input.failureMode.trim(), severity: input.severity },
      },
      tx,
    );
  });
}

/** Hata modunu siler. */
export async function deleteFailureMode(
  context: AuthContext,
  failureModeId: string,
): Promise<void> {
  await requireFmeaPermission(context, "update");

  const target = await getFailureMode(context.organizationId, failureModeId);

  await assertTargetEditable(context, target, "Hata modu bulunamadı.");

  await db.transaction(async (tx) => {
    await tx
      .delete(fmeaFailureMode)
      .where(
        and(
          eq(fmeaFailureMode.organizationId, context.organizationId),
          eq(fmeaFailureMode.id, failureModeId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaFailureMode.removed",
        target: { type: "fmeaFailureMode", id: failureModeId },
        metadata: { failureMode: target?.failureMode },
      },
      tx,
    );
  });
}

/** Hata nedeni oluşturur. */
export async function createFailureCause(
  context: AuthContext,
  documentId: string,
  input: FmeaFailureCauseFormValues,
): Promise<string> {
  await requireFmeaPermission(context, "update");

  await assertDocumentEditable(context, documentId);

  const failureMode = await getFailureMode(context.organizationId, input.failureModeId);

  if (!failureMode || failureMode.fmeaDocumentId !== documentId) {
    throw new FmeaRuleError("Hata modu bulunamadı.", "INVALID_INPUT");
  }

  return db.transaction(async (tx) => {
    const created = await tx
      .insert(fmeaFailureCause)
      .values({
        organizationId: context.organizationId,
        fmeaDocumentId: documentId,
        failureModeId: input.failureModeId,
        cause: input.cause.trim(),
        causeCategory: input.causeCategory,
        processWorkElementId: toNull(input.processWorkElementId),
        processFunctionId: toNull(input.processFunctionId),
        occurrence: input.occurrence,
        detection: input.detection,
      })
      .returning({ id: fmeaFailureCause.id });

    const causeId = created[0]?.id;

    if (!causeId) {
      throw new FmeaRuleError("Hata nedeni oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaFailureCause.created",
        target: { type: "fmeaFailureCause", id: causeId },
        metadata: {
          fmeaDocumentId: documentId,
          cause: input.cause.trim(),
          occurrence: input.occurrence,
          detection: input.detection,
        },
      },
      tx,
    );

    return causeId;
  });
}

/** Hata nedenini günceller. */
export async function updateFailureCause(
  context: AuthContext,
  causeId: string,
  input: FmeaFailureCauseFormValues,
): Promise<void> {
  await requireFmeaPermission(context, "update");

  const rows = await db
    .select({ fmeaDocumentId: fmeaFailureCause.fmeaDocumentId })
    .from(fmeaFailureCause)
    .where(
      and(
        eq(fmeaFailureCause.organizationId, context.organizationId),
        eq(fmeaFailureCause.id, causeId),
      ),
    )
    .limit(1);

  await assertTargetEditable(context, rows[0], "Hata nedeni bulunamadı.");

  await db.transaction(async (tx) => {
    await tx
      .update(fmeaFailureCause)
      .set({
        failureModeId: input.failureModeId,
        cause: input.cause.trim(),
        causeCategory: input.causeCategory,
        processWorkElementId: toNull(input.processWorkElementId),
        processFunctionId: toNull(input.processFunctionId),
        occurrence: input.occurrence,
        detection: input.detection,
      })
      .where(
        and(
          eq(fmeaFailureCause.organizationId, context.organizationId),
          eq(fmeaFailureCause.id, causeId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaFailureCause.updated",
        target: { type: "fmeaFailureCause", id: causeId },
        metadata: {
          cause: input.cause.trim(),
          occurrence: input.occurrence,
          detection: input.detection,
        },
      },
      tx,
    );
  });
}

/** Hata nedenini siler. */
export async function deleteFailureCause(context: AuthContext, causeId: string): Promise<void> {
  await requireFmeaPermission(context, "update");

  const rows = await db
    .select({ fmeaDocumentId: fmeaFailureCause.fmeaDocumentId })
    .from(fmeaFailureCause)
    .where(
      and(
        eq(fmeaFailureCause.organizationId, context.organizationId),
        eq(fmeaFailureCause.id, causeId),
      ),
    )
    .limit(1);

  await assertTargetEditable(context, rows[0], "Hata nedeni bulunamadı.");

  await db.transaction(async (tx) => {
    await tx
      .delete(fmeaFailureCause)
      .where(
        and(
          eq(fmeaFailureCause.organizationId, context.organizationId),
          eq(fmeaFailureCause.id, causeId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaFailureCause.removed",
        target: { type: "fmeaFailureCause", id: causeId },
      },
      tx,
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Önleme / algılama kontrolleri                                              */
/* -------------------------------------------------------------------------- */

/**
 * Önleme ya da algılama kontrolünü kaydeder.
 *
 * Neden başına en fazla bir önleme ve bir algılama kontrolü olabilir; ikinci
 * bir kayıt denemesi mevcut kontrol güncellenir.
 */
export async function upsertControl(
  context: AuthContext,
  documentId: string,
  input: FmeaControlFormValues,
): Promise<string> {
  await requireFmeaPermission(context, "update");

  await assertDocumentEditable(context, documentId);

  const cause = await db
    .select({ fmeaDocumentId: fmeaFailureCause.fmeaDocumentId })
    .from(fmeaFailureCause)
    .where(
      and(
        eq(fmeaFailureCause.organizationId, context.organizationId),
        eq(fmeaFailureCause.id, input.failureCauseId),
      ),
    )
    .limit(1);

  if (!cause[0] || cause[0].fmeaDocumentId !== documentId) {
    throw new FmeaRuleError("Hata nedeni bulunamadı.", "INVALID_INPUT");
  }

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: fmeaControl.id })
      .from(fmeaControl)
      .where(
        and(
          eq(fmeaControl.organizationId, context.organizationId),
          eq(fmeaControl.failureCauseId, input.failureCauseId),
          eq(fmeaControl.controlType, input.controlType),
        ),
      )
      .limit(1);

    let controlId = existing[0]?.id;

    if (controlId) {
      await tx
        .update(fmeaControl)
        .set({
          description: input.description.trim(),
          effectiveness: input.effectiveness,
          processFunctionId: toNull(input.processFunctionId),
        })
        .where(
          and(
            eq(fmeaControl.organizationId, context.organizationId),
            eq(fmeaControl.id, controlId),
          ),
        );
    } else {
      const created = await tx
        .insert(fmeaControl)
        .values({
          organizationId: context.organizationId,
          fmeaDocumentId: documentId,
          failureCauseId: input.failureCauseId,
          controlType: input.controlType,
          description: input.description.trim(),
          effectiveness: input.effectiveness,
          processFunctionId: toNull(input.processFunctionId),
        })
        .returning({ id: fmeaControl.id });

      controlId = created[0]?.id;
    }

    if (!controlId) {
      throw new FmeaRuleError("Kontrol kaydedilemedi.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaControl.saved",
        target: { type: "fmeaControl", id: controlId },
        metadata: {
          fmeaDocumentId: documentId,
          failureCauseId: input.failureCauseId,
          controlType: input.controlType,
          effectiveness: input.effectiveness,
        },
      },
      tx,
    );

    return controlId;
  });
}

/** Kontrolü siler. */
export async function deleteControl(context: AuthContext, controlId: string): Promise<void> {
  await requireFmeaPermission(context, "update");

  const rows = await db
    .select({ fmeaDocumentId: fmeaControl.fmeaDocumentId })
    .from(fmeaControl)
    .where(
      and(eq(fmeaControl.organizationId, context.organizationId), eq(fmeaControl.id, controlId)),
    )
    .limit(1);

  await assertTargetEditable(context, rows[0], "Kontrol bulunamadı.");

  await db.transaction(async (tx) => {
    await tx
      .delete(fmeaControl)
      .where(
        and(eq(fmeaControl.organizationId, context.organizationId), eq(fmeaControl.id, controlId)),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaControl.removed",
        target: { type: "fmeaControl", id: controlId },
      },
      tx,
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Aksiyonlar                                                                 */
/* -------------------------------------------------------------------------- */

/** Aksiyon oluşturur. */
export async function createAction(
  context: AuthContext,
  documentId: string,
  input: FmeaActionFormValues,
): Promise<string> {
  await requireFmeaPermission(context, "update");

  await assertDocumentEditable(context, documentId);

  return db.transaction(async (tx) => {
    const created = await tx
      .insert(fmeaAction)
      .values({
        organizationId: context.organizationId,
        fmeaDocumentId: documentId,
        failureModeId: toNull(input.failureModeId),
        failureCauseId: toNull(input.failureCauseId),
        actionType: input.actionType,
        description: input.description.trim(),
        responsibleId: toNull(input.responsibleId),
        responsibleText: toNull(input.responsibleText),
        targetDate: toNull(input.targetDate),
        status: input.status,
        verificationOfEffectiveness: toNull(input.verificationOfEffectiveness),
        isSpecialAction: input.isSpecialAction,
        completedAt: input.status === "DONE" ? new Date() : null,
      })
      .returning({ id: fmeaAction.id });

    const actionId = created[0]?.id;

    if (!actionId) {
      throw new FmeaRuleError("Aksiyon oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaAction.created",
        target: { type: "fmeaAction", id: actionId },
        metadata: {
          fmeaDocumentId: documentId,
          actionType: input.actionType,
          isSpecialAction: input.isSpecialAction,
        },
      },
      tx,
    );

    return actionId;
  });
}

/** Aksiyonu günceller. */
export async function updateAction(
  context: AuthContext,
  actionId: string,
  input: FmeaActionFormValues,
): Promise<void> {
  await requireFmeaPermission(context, "update");

  const rows = await db
    .select({ fmeaDocumentId: fmeaAction.fmeaDocumentId, status: fmeaAction.status })
    .from(fmeaAction)
    .where(and(eq(fmeaAction.organizationId, context.organizationId), eq(fmeaAction.id, actionId)))
    .limit(1);

  await assertTargetEditable(context, rows[0], "Aksiyon bulunamadı.");

  await db.transaction(async (tx) => {
    await tx
      .update(fmeaAction)
      .set({
        failureModeId: toNull(input.failureModeId),
        failureCauseId: toNull(input.failureCauseId),
        actionType: input.actionType,
        description: input.description.trim(),
        responsibleId: toNull(input.responsibleId),
        responsibleText: toNull(input.responsibleText),
        targetDate: toNull(input.targetDate),
        status: input.status,
        verificationOfEffectiveness: toNull(input.verificationOfEffectiveness),
        isSpecialAction: input.isSpecialAction,
        completedAt:
          input.status === "DONE" ? (rows[0]?.status === "DONE" ? new Date() : new Date()) : null,
        verifiedAt: input.verificationOfEffectiveness ? new Date() : null,
        verifiedById: input.verificationOfEffectiveness ? context.userId : null,
      })
      .where(
        and(eq(fmeaAction.organizationId, context.organizationId), eq(fmeaAction.id, actionId)),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaAction.updated",
        target: { type: "fmeaAction", id: actionId },
        metadata: { status: input.status, isSpecialAction: input.isSpecialAction },
      },
      tx,
    );
  });
}

/** Aksiyonu siler. */
export async function deleteAction(context: AuthContext, actionId: string): Promise<void> {
  await requireFmeaPermission(context, "update");

  const rows = await db
    .select({ fmeaDocumentId: fmeaAction.fmeaDocumentId })
    .from(fmeaAction)
    .where(and(eq(fmeaAction.organizationId, context.organizationId), eq(fmeaAction.id, actionId)))
    .limit(1);

  await assertTargetEditable(context, rows[0], "Aksiyon bulunamadı.");

  await db.transaction(async (tx) => {
    await tx
      .delete(fmeaAction)
      .where(
        and(eq(fmeaAction.organizationId, context.organizationId), eq(fmeaAction.id, actionId)),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaAction.removed",
        target: { type: "fmeaAction", id: actionId },
      },
      tx,
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Özel karakteristikler                                                      */
/* -------------------------------------------------------------------------- */

/** Özel karakteristik oluşturur. */
export async function createSpecialCharacteristic(
  context: AuthContext,
  documentId: string,
  input: FmeaSpecialCharacteristicFormValues,
): Promise<string> {
  await requireFmeaPermission(context, "update");

  await assertDocumentEditable(context, documentId);

  return db.transaction(async (tx) => {
    const created = await tx
      .insert(fmeaSpecialCharacteristic)
      .values({
        organizationId: context.organizationId,
        fmeaDocumentId: documentId,
        structureElementId: toNull(input.structureElementId),
        functionId: toNull(input.functionId),
        failureModeId: toNull(input.failureModeId),
        characteristicType: input.characteristicType,
        scClass: toNull(input.scClass),
        reason: toNull(input.reason),
        status: input.status,
      })
      .returning({ id: fmeaSpecialCharacteristic.id });

    const characteristicId = created[0]?.id;

    if (!characteristicId) {
      throw new FmeaRuleError("Özel karakteristik oluşturulamadı.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaSpecialCharacteristic.created",
        target: { type: "fmeaSpecialCharacteristic", id: characteristicId },
        metadata: {
          fmeaDocumentId: documentId,
          characteristicType: input.characteristicType,
          scClass: toNull(input.scClass),
        },
      },
      tx,
    );

    return characteristicId;
  });
}

/** Özel karakteristiği günceller. */
export async function updateSpecialCharacteristic(
  context: AuthContext,
  characteristicId: string,
  input: FmeaSpecialCharacteristicFormValues,
): Promise<void> {
  await requireFmeaPermission(context, "update");

  const rows = await db
    .select({ fmeaDocumentId: fmeaSpecialCharacteristic.fmeaDocumentId })
    .from(fmeaSpecialCharacteristic)
    .where(
      and(
        eq(fmeaSpecialCharacteristic.organizationId, context.organizationId),
        eq(fmeaSpecialCharacteristic.id, characteristicId),
      ),
    )
    .limit(1);

  await assertTargetEditable(context, rows[0], "Özel karakteristik bulunamadı.");

  await db.transaction(async (tx) => {
    await tx
      .update(fmeaSpecialCharacteristic)
      .set({
        structureElementId: toNull(input.structureElementId),
        functionId: toNull(input.functionId),
        failureModeId: toNull(input.failureModeId),
        characteristicType: input.characteristicType,
        scClass: toNull(input.scClass),
        reason: toNull(input.reason),
        status: input.status,
      })
      .where(
        and(
          eq(fmeaSpecialCharacteristic.organizationId, context.organizationId),
          eq(fmeaSpecialCharacteristic.id, characteristicId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaSpecialCharacteristic.updated",
        target: { type: "fmeaSpecialCharacteristic", id: characteristicId },
        metadata: { status: input.status },
      },
      tx,
    );
  });
}

/** Özel karakteristiği siler. */
export async function deleteSpecialCharacteristic(
  context: AuthContext,
  characteristicId: string,
): Promise<void> {
  await requireFmeaPermission(context, "update");

  const rows = await db
    .select({ fmeaDocumentId: fmeaSpecialCharacteristic.fmeaDocumentId })
    .from(fmeaSpecialCharacteristic)
    .where(
      and(
        eq(fmeaSpecialCharacteristic.organizationId, context.organizationId),
        eq(fmeaSpecialCharacteristic.id, characteristicId),
      ),
    )
    .limit(1);

  await assertTargetEditable(context, rows[0], "Özel karakteristik bulunamadı.");

  await db.transaction(async (tx) => {
    await tx
      .delete(fmeaSpecialCharacteristic)
      .where(
        and(
          eq(fmeaSpecialCharacteristic.organizationId, context.organizationId),
          eq(fmeaSpecialCharacteristic.id, characteristicId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaSpecialCharacteristic.removed",
        target: { type: "fmeaSpecialCharacteristic", id: characteristicId },
      },
      tx,
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Kaynak içe aktarım                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Yapı ağacını kaynaktan doldurur.
 *
 * Kaynak türü belge tipine göre seçilir:
 *
 * - `FLOW`: revision'ın akış node'ları (PFMEA faaliyetleri).
 * - `ITEM`: ürün kaydı (DFMEA bileşeni).
 * - `PROCESS`: revision'ın kendisi (SFMEA sistemi).
 *
 * Var olan kaynak bağlantıları güncellenir; **hiçbir analiz satırı
 * (hata modu, neden) silinmez**.
 */
export async function importStructureFromSource(
  context: AuthContext,
  input: FmeaSourceImportValues,
): Promise<number> {
  await requireFmeaPermission(context, "update");

  const document = await getFmeaDocument(context.organizationId, input.documentId);

  if (!document) {
    throw new FmeaRuleError("FMEA belgesi bulunamadı.", "NOT_FOUND");
  }

  await assertDocumentEditable(context, input.documentId);

  if (input.source === "FLOW" && document.fmeaType !== "PFMEA") {
    throw new FmeaRuleError(
      "Akış kaynağı yalnızca PFMEA belgelerinde kullanılabilir.",
      "INVALID_INPUT",
    );
  }

  if (input.source === "ITEM" && document.fmeaType !== "DFMEA") {
    throw new FmeaRuleError(
      "Ürün kaynağı yalnızca DFMEA belgelerinde kullanılabilir.",
      "INVALID_INPUT",
    );
  }

  if (input.source === "PROCESS" && document.fmeaType !== "SFMEA") {
    throw new FmeaRuleError(
      "Proses kaynağı yalnızca SFMEA belgelerinde kullanılabilir.",
      "INVALID_INPUT",
    );
  }

  return db.transaction(async (tx) => {
    const created = await importStructureRows(context, document.id, input, tx);

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaStructure.imported",
        target: { type: "fmeaDocument", id: document.id },
        metadata: { source: input.source, sourceId: toNull(input.sourceId), created },
      },
      tx,
    );

    return created;
  });
}

/**
 * Yapı elemanlarını kaynaktan yazar.
 *
 * Aynı kaynağa bağlı ve halihazırda var olan elemanlar **atlanır**: içe
 * aktarım tekrarlanabilir ve mevcut analiz satırlarını bozmaz.
 */
async function importStructureRows(
  context: AuthContext,
  documentId: string,
  input: FmeaSourceImportValues,
  tx: DbClient,
): Promise<number> {
  const document = await getFmeaDocument(context.organizationId, documentId, tx);

  if (!document) {
    throw new FmeaRuleError("FMEA belgesi bulunamadı.", "NOT_FOUND");
  }

  const rows = await buildImportedStructureRows(
    context.organizationId,
    document.processVariantRevisionId,
    input,
    tx,
  );

  const existing = await tx
    .select({
      flowNodeId: fmeaStructureElement.flowNodeId,
      itemId: fmeaStructureElement.itemId,
    })
    .from(fmeaStructureElement)
    .where(
      and(
        eq(fmeaStructureElement.organizationId, context.organizationId),
        eq(fmeaStructureElement.fmeaDocumentId, documentId),
      ),
    );

  const knownFlowNodes = new Set(
    existing.map((row) => row.flowNodeId).filter((value): value is string => Boolean(value)),
  );

  const knownItems = new Set(
    existing.map((row) => row.itemId).filter((value): value is string => Boolean(value)),
  );

  const createdIds: (string | null)[] = [];
  let created = 0;

  for (const row of rows) {
    if (row.flowNodeId && knownFlowNodes.has(row.flowNodeId)) {
      createdIds.push(null);
      continue;
    }

    if (row.itemId && knownItems.has(row.itemId)) {
      createdIds.push(null);
      continue;
    }

    const parentId = row.parentIndex === null ? null : (createdIds[row.parentIndex] ?? null);

    const inserted = await tx
      .insert(fmeaStructureElement)
      .values({
        organizationId: context.organizationId,
        fmeaDocumentId: documentId,
        parentId,
        level: row.level,
        code: row.code,
        name: row.name,
        description: row.description,
        flowNodeId: row.flowNodeId,
        itemId: row.itemId,
        processWorkElementId: row.processWorkElementId,
        sortOrder: row.sortOrder,
      })
      .returning({ id: fmeaStructureElement.id });

    createdIds.push(inserted[0]?.id ?? null);
    created += 1;
  }

  return created;
}

/* -------------------------------------------------------------------------- */
/* Matrisler                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Varsayılan Action Priority ve risk sınıfı matrislerini kurar.
 *
 * Kurumda kayıt varsa **dokunulmaz**: matris kalibre edilmiş olabilir.
 */
export async function seedDefaultMatrices(context: AuthContext): Promise<{
  actionPriority: number;
  riskClass: number;
}> {
  await requireFmeaPermission(context, "update");

  return db.transaction(async (tx) => {
    const existingPriority = await tx
      .select({ id: fmeaActionPriority.id })
      .from(fmeaActionPriority)
      .where(eq(fmeaActionPriority.organizationId, context.organizationId))
      .limit(1);

    let actionPriority = 0;

    if (!existingPriority[0]) {
      await tx.insert(fmeaActionPriority).values(
        DEFAULT_ACTION_PRIORITY_MATRIX.map((row) => ({
          organizationId: context.organizationId,
          method: "ACTION_PRIORITY" as const,
          severityMin: row.severityMin,
          severityMax: row.severityMax,
          occurrenceMin: row.occurrenceMin,
          occurrenceMax: row.occurrenceMax,
          detectionMin: row.detectionMin,
          detectionMax: row.detectionMax,
          actionPriority: row.actionPriority satisfies ActionPriority,
        })),
      );

      actionPriority = DEFAULT_ACTION_PRIORITY_MATRIX.length;
    }

    const existingRisk = await tx
      .select({ id: fmeaRiskMatrix.id })
      .from(fmeaRiskMatrix)
      .where(eq(fmeaRiskMatrix.organizationId, context.organizationId))
      .limit(1);

    let riskClass = 0;

    if (!existingRisk[0]) {
      await tx.insert(fmeaRiskMatrix).values(
        DEFAULT_RISK_CLASS_MATRIX.map((row) => ({
          organizationId: context.organizationId,
          method: "RISK_CLASS" as const,
          severity: row.severity,
          occurrence: row.occurrence,
          riskClass: row.riskClass,
        })),
      );

      riskClass = DEFAULT_RISK_CLASS_MATRIX.length;
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaMatrix.seeded",
        target: { type: "organization", id: context.organizationId },
        metadata: { actionPriority, riskClass },
      },
      tx,
    );

    return { actionPriority, riskClass };
  });
}

/**
 * Action Priority matrisini günceller.
 *
 * Kurum, elindeki AIAG & VDA el kitabına göre bant değerlerini değiştirebilir.
 */
export async function updateActionPriorityMatrix(
  context: AuthContext,
  rows: readonly (ActionPriorityRow & { actionPriority: ActionPriority })[],
): Promise<void> {
  await requireFmeaPermission(context, "update");

  if (rows.length !== DEFAULT_ACTION_PRIORITY_MATRIX.length) {
    throw new FmeaRuleError(
      "Matris satır sayısı varsayılan matrisle aynı olmalıdır.",
      "INVALID_INPUT",
    );
  }

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({
        id: fmeaActionPriority.id,
        severityMin: fmeaActionPriority.severityMin,
        severityMax: fmeaActionPriority.severityMax,
        occurrenceMin: fmeaActionPriority.occurrenceMin,
        occurrenceMax: fmeaActionPriority.occurrenceMax,
        detectionMin: fmeaActionPriority.detectionMin,
        detectionMax: fmeaActionPriority.detectionMax,
      })
      .from(fmeaActionPriority)
      .where(eq(fmeaActionPriority.organizationId, context.organizationId));

    for (const row of rows) {
      const target = existing.find(
        (entry) =>
          entry.severityMin === row.severityMin &&
          entry.severityMax === row.severityMax &&
          entry.occurrenceMin === row.occurrenceMin &&
          entry.occurrenceMax === row.occurrenceMax &&
          entry.detectionMin === row.detectionMin &&
          entry.detectionMax === row.detectionMax,
      );

      if (!target) {
        throw new FmeaRuleError("Matris satırı bulunamadı.", "NOT_FOUND");
      }

      await tx
        .update(fmeaActionPriority)
        .set({ actionPriority: row.actionPriority })
        .where(
          and(
            eq(fmeaActionPriority.organizationId, context.organizationId),
            eq(fmeaActionPriority.id, target.id),
          ),
        );
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaMatrix.actionPriorityUpdated",
        target: { type: "organization", id: context.organizationId },
        metadata: { rows: rows.length },
      },
      tx,
    );
  });
}

/**
 * Risk sınıfı matrisini günceller.
 */
export async function updateRiskClassMatrix(
  context: AuthContext,
  rows: readonly { severity: number; occurrence: number; riskClass: string }[],
): Promise<void> {
  await requireFmeaPermission(context, "update");

  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx
        .update(fmeaRiskMatrix)
        .set({ riskClass: row.riskClass })
        .where(
          and(
            eq(fmeaRiskMatrix.organizationId, context.organizationId),
            eq(fmeaRiskMatrix.severity, row.severity),
            eq(fmeaRiskMatrix.occurrence, row.occurrence),
          ),
        );
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "fmeaMatrix.riskClassUpdated",
        target: { type: "organization", id: context.organizationId },
        metadata: { rows: rows.length },
      },
      tx,
    );
  });
}
