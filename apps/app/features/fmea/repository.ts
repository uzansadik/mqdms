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
import { and, asc, eq, inArray } from "drizzle-orm";

import type { ActionPriorityRow, RiskClassRow } from "./rating";
import type {
  FmeaActionStatus,
  FmeaActionType,
  FmeaCauseCategory,
  FmeaCharacteristicStatus,
  FmeaCharacteristicType,
  FmeaControlEffectiveness,
  FmeaControlType,
  FmeaEvaluationMethod,
  FmeaFunctionAspect,
  FmeaSeverityClassification,
  FmeaStructureLevel,
  FmeaType,
} from "./schema";

/**
 * FMEA okuma katmanı.
 *
 * Bütün sorgular `organizationId` ile kısıtlanır.
 */

/** FMEA belgesi kaydı. */
export type FmeaDocumentRecord = {
  id: string;
  organizationId: string;
  processVariantRevisionId: string;
  code: string;
  name: string;
  description: string | null;
  fmeaType: FmeaType;
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "RELEASED";
  evaluationMethod: FmeaEvaluationMethod;
  scopeDescription: string | null;
  responsibility: string | null;
  targetDate: string | null;
  version: number;
  submittedAt: Date | null;
  submittedById: string | null;
  approvedAt: Date | null;
  approvedById: string | null;
  releasedAt: Date | null;
  releasedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Yapı elemanı kaydı. */
export type FmeaStructureElementRecord = {
  id: string;
  organizationId: string;
  fmeaDocumentId: string;
  parentId: string | null;
  level: FmeaStructureLevel;
  code: string;
  name: string;
  description: string | null;
  flowNodeId: string | null;
  itemId: string | null;
  processWorkElementId: string | null;
  isSpecialCharacteristic: boolean;
  sortOrder: number;
};

/** Fonksiyon kaydı. */
export type FmeaFunctionRecord = {
  id: string;
  organizationId: string;
  fmeaDocumentId: string;
  structureElementId: string | null;
  processFunctionId: string | null;
  name: string;
  description: string | null;
  functionAspect: FmeaFunctionAspect;
  requirementText: string | null;
  isSpecialCharacteristic: boolean;
  sortOrder: number;
};

/** Hata modu kaydı. */
export type FmeaFailureModeRecord = {
  id: string;
  organizationId: string;
  fmeaDocumentId: string;
  structureElementId: string;
  functionId: string | null;
  failureMode: string;
  failureEffectLocal: string | null;
  failureEffectEnd: string | null;
  severity: number;
  severityClassification: FmeaSeverityClassification;
  sortOrder: number;
};

/** Hata nedeni kaydı. */
export type FmeaFailureCauseRecord = {
  id: string;
  organizationId: string;
  fmeaDocumentId: string;
  failureModeId: string;
  cause: string;
  causeCategory: FmeaCauseCategory;
  processWorkElementId: string | null;
  processFunctionId: string | null;
  occurrence: number;
  detection: number;
  sortOrder: number;
};

/** Önleme / algılama kontrolü kaydı. */
export type FmeaControlRecord = {
  id: string;
  organizationId: string;
  fmeaDocumentId: string;
  failureCauseId: string;
  controlType: FmeaControlType;
  description: string;
  effectiveness: FmeaControlEffectiveness;
  processFunctionId: string | null;
  sortOrder: number;
};

/** Aksiyon kaydı. */
export type FmeaActionRecord = {
  id: string;
  organizationId: string;
  fmeaDocumentId: string;
  failureModeId: string | null;
  failureCauseId: string | null;
  actionType: FmeaActionType;
  description: string;
  responsibleId: string | null;
  responsibleText: string | null;
  targetDate: string | null;
  completedAt: Date | null;
  status: FmeaActionStatus;
  verificationOfEffectiveness: string | null;
  verifiedAt: Date | null;
  isSpecialAction: boolean;
  sortOrder: number;
};

/** Özel karakteristik kaydı. */
export type FmeaSpecialCharacteristicRecord = {
  id: string;
  organizationId: string;
  fmeaDocumentId: string;
  structureElementId: string | null;
  functionId: string | null;
  failureModeId: string | null;
  characteristicType: FmeaCharacteristicType;
  scClass: string | null;
  reason: string | null;
  status: FmeaCharacteristicStatus;
  sortOrder: number;
};

const documentSelection = {
  id: fmeaDocument.id,
  organizationId: fmeaDocument.organizationId,
  processVariantRevisionId: fmeaDocument.processVariantRevisionId,
  code: fmeaDocument.code,
  name: fmeaDocument.name,
  description: fmeaDocument.description,
  fmeaType: fmeaDocument.fmeaType,
  status: fmeaDocument.status,
  evaluationMethod: fmeaDocument.evaluationMethod,
  scopeDescription: fmeaDocument.scopeDescription,
  responsibility: fmeaDocument.responsibility,
  targetDate: fmeaDocument.targetDate,
  version: fmeaDocument.version,
  submittedAt: fmeaDocument.submittedAt,
  submittedById: fmeaDocument.submittedById,
  approvedAt: fmeaDocument.approvedAt,
  approvedById: fmeaDocument.approvedById,
  releasedAt: fmeaDocument.releasedAt,
  releasedById: fmeaDocument.releasedById,
  createdAt: fmeaDocument.createdAt,
  updatedAt: fmeaDocument.updatedAt,
} as const;

/**
 * Bir revision'daki FMEA belgeleri.
 *
 * `revisionId` verilmezse organizasyonun tüm belgeleri döner.
 */
export async function listFmeaDocuments(
  organizationId: string,
  revisionId?: string,
): Promise<FmeaDocumentRecord[]> {
  const conditions = [eq(fmeaDocument.organizationId, organizationId)];

  if (revisionId) {
    conditions.push(eq(fmeaDocument.processVariantRevisionId, revisionId));
  }

  return db
    .select(documentSelection)
    .from(fmeaDocument)
    .where(and(...conditions))
    .orderBy(asc(fmeaDocument.code));
}

/** Tek FMEA belgesi. */
export async function getFmeaDocument(
  organizationId: string,
  documentId: string,
  client: DbClient | typeof db = db,
): Promise<FmeaDocumentRecord | null> {
  const rows = await client
    .select(documentSelection)
    .from(fmeaDocument)
    .where(and(eq(fmeaDocument.organizationId, organizationId), eq(fmeaDocument.id, documentId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Belgenin yapı elemanları. */
export async function listStructureElements(
  organizationId: string,
  documentId: string,
): Promise<FmeaStructureElementRecord[]> {
  return db
    .select({
      id: fmeaStructureElement.id,
      organizationId: fmeaStructureElement.organizationId,
      fmeaDocumentId: fmeaStructureElement.fmeaDocumentId,
      parentId: fmeaStructureElement.parentId,
      level: fmeaStructureElement.level,
      code: fmeaStructureElement.code,
      name: fmeaStructureElement.name,
      description: fmeaStructureElement.description,
      flowNodeId: fmeaStructureElement.flowNodeId,
      itemId: fmeaStructureElement.itemId,
      processWorkElementId: fmeaStructureElement.processWorkElementId,
      isSpecialCharacteristic: fmeaStructureElement.isSpecialCharacteristic,
      sortOrder: fmeaStructureElement.sortOrder,
    })
    .from(fmeaStructureElement)
    .where(
      and(
        eq(fmeaStructureElement.organizationId, organizationId),
        eq(fmeaStructureElement.fmeaDocumentId, documentId),
      ),
    )
    .orderBy(asc(fmeaStructureElement.sortOrder), asc(fmeaStructureElement.code));
}

/** Tek yapı elemanı. */
export async function getStructureElement(
  organizationId: string,
  elementId: string,
  client: DbClient | typeof db = db,
): Promise<FmeaStructureElementRecord | null> {
  const rows = await client
    .select({
      id: fmeaStructureElement.id,
      organizationId: fmeaStructureElement.organizationId,
      fmeaDocumentId: fmeaStructureElement.fmeaDocumentId,
      parentId: fmeaStructureElement.parentId,
      level: fmeaStructureElement.level,
      code: fmeaStructureElement.code,
      name: fmeaStructureElement.name,
      description: fmeaStructureElement.description,
      flowNodeId: fmeaStructureElement.flowNodeId,
      itemId: fmeaStructureElement.itemId,
      processWorkElementId: fmeaStructureElement.processWorkElementId,
      isSpecialCharacteristic: fmeaStructureElement.isSpecialCharacteristic,
      sortOrder: fmeaStructureElement.sortOrder,
    })
    .from(fmeaStructureElement)
    .where(
      and(
        eq(fmeaStructureElement.organizationId, organizationId),
        eq(fmeaStructureElement.id, elementId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Belgenin fonksiyonları. */
export async function listFunctions(
  organizationId: string,
  documentId: string,
): Promise<FmeaFunctionRecord[]> {
  return db
    .select({
      id: fmeaFunction.id,
      organizationId: fmeaFunction.organizationId,
      fmeaDocumentId: fmeaFunction.fmeaDocumentId,
      structureElementId: fmeaFunction.structureElementId,
      processFunctionId: fmeaFunction.processFunctionId,
      name: fmeaFunction.name,
      description: fmeaFunction.description,
      functionAspect: fmeaFunction.functionAspect,
      requirementText: fmeaFunction.requirementText,
      isSpecialCharacteristic: fmeaFunction.isSpecialCharacteristic,
      sortOrder: fmeaFunction.sortOrder,
    })
    .from(fmeaFunction)
    .where(
      and(
        eq(fmeaFunction.organizationId, organizationId),
        eq(fmeaFunction.fmeaDocumentId, documentId),
      ),
    )
    .orderBy(asc(fmeaFunction.sortOrder), asc(fmeaFunction.name));
}

/** Belgenin hata modları. */
export async function listFailureModes(
  organizationId: string,
  documentId: string,
): Promise<FmeaFailureModeRecord[]> {
  return db
    .select({
      id: fmeaFailureMode.id,
      organizationId: fmeaFailureMode.organizationId,
      fmeaDocumentId: fmeaFailureMode.fmeaDocumentId,
      structureElementId: fmeaFailureMode.structureElementId,
      functionId: fmeaFailureMode.functionId,
      failureMode: fmeaFailureMode.failureMode,
      failureEffectLocal: fmeaFailureMode.failureEffectLocal,
      failureEffectEnd: fmeaFailureMode.failureEffectEnd,
      severity: fmeaFailureMode.severity,
      severityClassification: fmeaFailureMode.severityClassification,
      sortOrder: fmeaFailureMode.sortOrder,
    })
    .from(fmeaFailureMode)
    .where(
      and(
        eq(fmeaFailureMode.organizationId, organizationId),
        eq(fmeaFailureMode.fmeaDocumentId, documentId),
      ),
    )
    .orderBy(asc(fmeaFailureMode.sortOrder), asc(fmeaFailureMode.failureMode));
}

/** Tek hata modu. */
export async function getFailureMode(
  organizationId: string,
  failureModeId: string,
  client: DbClient | typeof db = db,
): Promise<FmeaFailureModeRecord | null> {
  const rows = await client
    .select({
      id: fmeaFailureMode.id,
      organizationId: fmeaFailureMode.organizationId,
      fmeaDocumentId: fmeaFailureMode.fmeaDocumentId,
      structureElementId: fmeaFailureMode.structureElementId,
      functionId: fmeaFailureMode.functionId,
      failureMode: fmeaFailureMode.failureMode,
      failureEffectLocal: fmeaFailureMode.failureEffectLocal,
      failureEffectEnd: fmeaFailureMode.failureEffectEnd,
      severity: fmeaFailureMode.severity,
      severityClassification: fmeaFailureMode.severityClassification,
      sortOrder: fmeaFailureMode.sortOrder,
    })
    .from(fmeaFailureMode)
    .where(
      and(
        eq(fmeaFailureMode.organizationId, organizationId),
        eq(fmeaFailureMode.id, failureModeId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Belgenin hata nedenleri. */
export async function listFailureCauses(
  organizationId: string,
  documentId: string,
): Promise<FmeaFailureCauseRecord[]> {
  return db
    .select({
      id: fmeaFailureCause.id,
      organizationId: fmeaFailureCause.organizationId,
      fmeaDocumentId: fmeaFailureCause.fmeaDocumentId,
      failureModeId: fmeaFailureCause.failureModeId,
      cause: fmeaFailureCause.cause,
      causeCategory: fmeaFailureCause.causeCategory,
      processWorkElementId: fmeaFailureCause.processWorkElementId,
      processFunctionId: fmeaFailureCause.processFunctionId,
      occurrence: fmeaFailureCause.occurrence,
      detection: fmeaFailureCause.detection,
      sortOrder: fmeaFailureCause.sortOrder,
    })
    .from(fmeaFailureCause)
    .where(
      and(
        eq(fmeaFailureCause.organizationId, organizationId),
        eq(fmeaFailureCause.fmeaDocumentId, documentId),
      ),
    )
    .orderBy(asc(fmeaFailureCause.sortOrder), asc(fmeaFailureCause.cause));
}

/** Belgenin kontrolleri. */
export async function listControls(
  organizationId: string,
  documentId: string,
): Promise<FmeaControlRecord[]> {
  return db
    .select({
      id: fmeaControl.id,
      organizationId: fmeaControl.organizationId,
      fmeaDocumentId: fmeaControl.fmeaDocumentId,
      failureCauseId: fmeaControl.failureCauseId,
      controlType: fmeaControl.controlType,
      description: fmeaControl.description,
      effectiveness: fmeaControl.effectiveness,
      processFunctionId: fmeaControl.processFunctionId,
      sortOrder: fmeaControl.sortOrder,
    })
    .from(fmeaControl)
    .where(
      and(
        eq(fmeaControl.organizationId, organizationId),
        eq(fmeaControl.fmeaDocumentId, documentId),
      ),
    )
    .orderBy(asc(fmeaControl.sortOrder), asc(fmeaControl.id));
}

/** Belgenin aksiyonları. */
export async function listActions(
  organizationId: string,
  documentId: string,
): Promise<FmeaActionRecord[]> {
  return db
    .select({
      id: fmeaAction.id,
      organizationId: fmeaAction.organizationId,
      fmeaDocumentId: fmeaAction.fmeaDocumentId,
      failureModeId: fmeaAction.failureModeId,
      failureCauseId: fmeaAction.failureCauseId,
      actionType: fmeaAction.actionType,
      description: fmeaAction.description,
      responsibleId: fmeaAction.responsibleId,
      responsibleText: fmeaAction.responsibleText,
      targetDate: fmeaAction.targetDate,
      completedAt: fmeaAction.completedAt,
      status: fmeaAction.status,
      verificationOfEffectiveness: fmeaAction.verificationOfEffectiveness,
      verifiedAt: fmeaAction.verifiedAt,
      isSpecialAction: fmeaAction.isSpecialAction,
      sortOrder: fmeaAction.sortOrder,
    })
    .from(fmeaAction)
    .where(
      and(eq(fmeaAction.organizationId, organizationId), eq(fmeaAction.fmeaDocumentId, documentId)),
    )
    .orderBy(asc(fmeaAction.sortOrder), asc(fmeaAction.id));
}

/** Belgenin özel karakteristikleri. */
export async function listSpecialCharacteristics(
  organizationId: string,
  documentId: string,
): Promise<FmeaSpecialCharacteristicRecord[]> {
  return db
    .select({
      id: fmeaSpecialCharacteristic.id,
      organizationId: fmeaSpecialCharacteristic.organizationId,
      fmeaDocumentId: fmeaSpecialCharacteristic.fmeaDocumentId,
      structureElementId: fmeaSpecialCharacteristic.structureElementId,
      functionId: fmeaSpecialCharacteristic.functionId,
      failureModeId: fmeaSpecialCharacteristic.failureModeId,
      characteristicType: fmeaSpecialCharacteristic.characteristicType,
      scClass: fmeaSpecialCharacteristic.scClass,
      reason: fmeaSpecialCharacteristic.reason,
      status: fmeaSpecialCharacteristic.status,
      sortOrder: fmeaSpecialCharacteristic.sortOrder,
    })
    .from(fmeaSpecialCharacteristic)
    .where(
      and(
        eq(fmeaSpecialCharacteristic.organizationId, organizationId),
        eq(fmeaSpecialCharacteristic.fmeaDocumentId, documentId),
      ),
    )
    .orderBy(asc(fmeaSpecialCharacteristic.sortOrder), asc(fmeaSpecialCharacteristic.id));
}

/**
 * Organizasyonun Action Priority matrisi.
 *
 * Kayıt yoksa `null` döner; çağıran taraf varsayılan matrisi kullanır.
 */
export async function listActionPriorityMatrix(
  organizationId: string,
  client: DbClient | typeof db = db,
): Promise<ActionPriorityRow[] | null> {
  const rows = await client
    .select({
      severityMin: fmeaActionPriority.severityMin,
      severityMax: fmeaActionPriority.severityMax,
      occurrenceMin: fmeaActionPriority.occurrenceMin,
      occurrenceMax: fmeaActionPriority.occurrenceMax,
      detectionMin: fmeaActionPriority.detectionMin,
      detectionMax: fmeaActionPriority.detectionMax,
      actionPriority: fmeaActionPriority.actionPriority,
    })
    .from(fmeaActionPriority)
    .where(eq(fmeaActionPriority.organizationId, organizationId));

  if (rows.length === 0) {
    return null;
  }

  return rows.map((row) => ({
    ...row,
    actionPriority: row.actionPriority as ActionPriorityRow["actionPriority"],
  }));
}

/**
 * Organizasyonun risk sınıfı matrisi.
 *
 * Kayıt yoksa `null` döner; çağıran taraf varsayılan matrisi kullanır.
 */
export async function listRiskClassMatrix(
  organizationId: string,
  client: DbClient | typeof db = db,
): Promise<RiskClassRow[] | null> {
  const rows = await client
    .select({
      severity: fmeaRiskMatrix.severity,
      occurrence: fmeaRiskMatrix.occurrence,
      riskClass: fmeaRiskMatrix.riskClass,
    })
    .from(fmeaRiskMatrix)
    .where(eq(fmeaRiskMatrix.organizationId, organizationId));

  if (rows.length === 0) {
    return null;
  }

  return rows.map((row) => ({
    ...row,
    riskClass: row.riskClass as RiskClassRow["riskClass"],
  }));
}

/**
 * Birden çok belgeye ait yapı elemanlarını tek sorguda okur.
 *
 * Yapı ağacının tümü tek seferde yüklenir; belge başına sorgu yapmak (N+1)
 * sayfayı yavaşlatıyordu.
 */
export async function listStructureElementsByDocuments(
  organizationId: string,
  documentIds: readonly string[],
): Promise<FmeaStructureElementRecord[]> {
  if (documentIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: fmeaStructureElement.id,
      organizationId: fmeaStructureElement.organizationId,
      fmeaDocumentId: fmeaStructureElement.fmeaDocumentId,
      parentId: fmeaStructureElement.parentId,
      level: fmeaStructureElement.level,
      code: fmeaStructureElement.code,
      name: fmeaStructureElement.name,
      description: fmeaStructureElement.description,
      flowNodeId: fmeaStructureElement.flowNodeId,
      itemId: fmeaStructureElement.itemId,
      processWorkElementId: fmeaStructureElement.processWorkElementId,
      isSpecialCharacteristic: fmeaStructureElement.isSpecialCharacteristic,
      sortOrder: fmeaStructureElement.sortOrder,
    })
    .from(fmeaStructureElement)
    .where(
      and(
        eq(fmeaStructureElement.organizationId, organizationId),
        inArray(fmeaStructureElement.fmeaDocumentId, [...documentIds]),
      ),
    );
}
