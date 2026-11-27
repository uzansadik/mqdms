import { db } from "@mqdms/db";
import { fmeaDocument, process, processVariant, processVariantRevision } from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import { requirePermission } from "@/features/auth/session";
import {
  type ActionPriorityRow,
  DEFAULT_ACTION_PRIORITY_MATRIX,
  DEFAULT_RISK_CLASS_MATRIX,
  type RiskClassRow,
} from "./rating";
import {
  getFmeaDocument,
  listActionPriorityMatrix,
  listActions,
  listControls,
  listFailureCauses,
  listFailureModes,
  listFmeaDocuments,
  listFunctions,
  listRiskClassMatrix,
  listSpecialCharacteristics,
  listStructureElements,
} from "./repository";

/**
 * FMEA sayfalarının koruma ve veri katmanı.
 */

/** FMEA modülüne erişim zorunluluğu. */
export async function requireFmeaAccess(action = "read"): Promise<void> {
  await requirePermission("fmea", action);
}

/**
 * Revision'daki FMEA belgeleri.
 *
 * Belge bulunamazsa `null` döner; sayfa `notFound()` ile 404 üretir.
 */
export async function getFmeaDocumentListData(organizationId: string, revisionId: string) {
  const documents = await listFmeaDocuments(organizationId, revisionId);

  return { documents };
}

/**
 * Belgenin tüm içeriği.
 *
 * Yapı, fonksiyon, hata analizi, kontroller, aksiyonlar ve özel
 * karakteristikler tek seferde okunur; belge başına sorgu yapmak (N+1)
 * sayfayı yavaşlatıyordu.
 */
export async function getFmeaDocumentDetailData(organizationId: string, documentId: string) {
  const document = await getFmeaDocument(organizationId, documentId);

  if (!document) {
    return null;
  }

  const [
    structureElements,
    functions,
    failureModes,
    failureCauses,
    controls,
    actions,
    specialCharacteristics,
    actionPriorityMatrix,
    riskClassMatrix,
  ] = await Promise.all([
    listStructureElements(organizationId, documentId),
    listFunctions(organizationId, documentId),
    listFailureModes(organizationId, documentId),
    listFailureCauses(organizationId, documentId),
    listControls(organizationId, documentId),
    listActions(organizationId, documentId),
    listSpecialCharacteristics(organizationId, documentId),
    listActionPriorityMatrix(organizationId),
    listRiskClassMatrix(organizationId),
  ]);

  return {
    document,
    structureElements,
    functions,
    failureModes,
    failureCauses,
    controls,
    actions,
    specialCharacteristics,
    actionPriorityMatrix: actionPriorityMatrix ?? DEFAULT_ACTION_PRIORITY_MATRIX,
    riskClassMatrix: riskClassMatrix ?? DEFAULT_RISK_CLASS_MATRIX,
  };
}

/**
 * Organizasyonun tüm FMEA belgeleri.
 *
 * Global dizin; belge detayı revision içindeki adrese yönlendirir.
 */
export async function getFmeaIndexData(organizationId: string) {
  const documents = await listFmeaDocuments(organizationId);

  return { documents };
}

/**
 * Belgenin revision içindeki adresi.
 *
 * Global dizinden belge detayına yönlendirmek için kullanılır.
 */
export async function getFmeaDocumentHref(
  organizationId: string,
  documentId: string,
): Promise<string | null> {
  const rows = await db
    .select({
      processId: process.id,
      variantId: processVariant.id,
      revisionId: processVariantRevision.id,
    })
    .from(fmeaDocument)
    .innerJoin(
      processVariantRevision,
      eq(processVariantRevision.id, fmeaDocument.processVariantRevisionId),
    )
    .innerJoin(processVariant, eq(processVariant.id, processVariantRevision.processVariantId))
    .innerJoin(process, eq(process.id, processVariant.processId))
    .where(and(eq(fmeaDocument.organizationId, organizationId), eq(fmeaDocument.id, documentId)))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return null;
  }

  return `/master-processes/${row.processId}/variants/${row.variantId}/revisions/${row.revisionId}/fmea/${documentId}`;
}

/** Değerlendirme matrisleri; boşsa varsayılan kullanılır. */
export async function getFmeaMatricesData(organizationId: string): Promise<{
  actionPriorityMatrix: readonly ActionPriorityRow[];
  riskClassMatrix: readonly RiskClassRow[];
}> {
  const [actionPriorityMatrix, riskClassMatrix] = await Promise.all([
    listActionPriorityMatrix(organizationId),
    listRiskClassMatrix(organizationId),
  ]);

  return {
    actionPriorityMatrix: actionPriorityMatrix ?? DEFAULT_ACTION_PRIORITY_MATRIX,
    riskClassMatrix: riskClassMatrix ?? DEFAULT_RISK_CLASS_MATRIX,
  };
}
