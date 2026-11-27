"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";
import {
  fmeaActionFormSchema,
  fmeaControlFormSchema,
  fmeaDocumentFormSchema,
  fmeaDocumentTransitionSchema,
  fmeaFailureCauseFormSchema,
  fmeaFailureModeFormSchema,
  fmeaFunctionFormSchema,
  fmeaMatrixUpdateSchema,
  fmeaSourceImportSchema,
  fmeaSpecialCharacteristicFormSchema,
  fmeaStructureElementFormSchema,
} from "./schema";
import {
  createAction,
  createFailureCause,
  createFailureMode,
  createFmeaDocument,
  createFunction,
  createSpecialCharacteristic,
  createStructureElement,
  deleteAction,
  deleteControl,
  deleteFailureCause,
  deleteFailureMode,
  deleteFmeaDocument,
  deleteFunction,
  deleteSpecialCharacteristic,
  deleteStructureElement,
  FmeaRuleError,
  importStructureFromSource,
  seedDefaultMatrices,
  transitionFmeaDocument,
  updateAction,
  updateActionPriorityMatrix,
  updateFailureCause,
  updateFailureMode,
  updateFmeaDocument,
  updateFunction,
  updateRiskClassMatrix,
  updateSpecialCharacteristic,
  updateStructureElement,
  upsertControl,
} from "./service";

/** Aksiyon sonucu. */
export type FmeaActionResult = { success: true } | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof FmeaRuleError) {
    return error.message;
  }

  console.error("FMEA işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

/* -------------------------------------------------------------------------- */
/* Belge                                                                      */
/* -------------------------------------------------------------------------- */

/** Yeni FMEA belgesi oluşturur. */
export async function createFmeaDocumentAction(
  revisionId: string,
  input: unknown,
): Promise<FmeaActionResult> {
  const parsed = fmeaDocumentFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createFmeaDocument(context, revisionId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** FMEA belgesini günceller. */
export async function updateFmeaDocumentAction(
  documentId: string,
  input: unknown,
): Promise<FmeaActionResult> {
  const parsed = fmeaDocumentFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateFmeaDocument(context, documentId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** FMEA belgesini siler. */
export async function deleteFmeaDocumentAction(documentId: string): Promise<FmeaActionResult> {
  const context = await requireAuthContext();

  try {
    await deleteFmeaDocument(context, documentId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Belgenin durumunu değiştirir (incelemeye gönder, onayla, geri al, yayınla). */
export async function transitionFmeaDocumentAction(input: unknown): Promise<FmeaActionResult> {
  const parsed = fmeaDocumentTransitionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await transitionFmeaDocument(
      context,
      parsed.data.documentId,
      parsed.data.status,
      parsed.data.reason,
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/* -------------------------------------------------------------------------- */
/* Yapı elemanları                                                            */
/* -------------------------------------------------------------------------- */

/** Yapı elemanı oluşturur. */
export async function createStructureElementAction(
  documentId: string,
  input: unknown,
): Promise<FmeaActionResult> {
  const parsed = fmeaStructureElementFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createStructureElement(context, documentId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Yapı elemanını günceller. */
export async function updateStructureElementAction(
  elementId: string,
  input: unknown,
): Promise<FmeaActionResult> {
  const parsed = fmeaStructureElementFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateStructureElement(context, elementId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Yapı elemanını siler. */
export async function deleteStructureElementAction(elementId: string): Promise<FmeaActionResult> {
  const context = await requireAuthContext();

  try {
    await deleteStructureElement(context, elementId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/* -------------------------------------------------------------------------- */
/* Fonksiyonlar                                                               */
/* -------------------------------------------------------------------------- */

/** Fonksiyon oluşturur. */
export async function createFunctionAction(
  documentId: string,
  input: unknown,
): Promise<FmeaActionResult> {
  const parsed = fmeaFunctionFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createFunction(context, documentId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Fonksiyonu günceller. */
export async function updateFunctionAction(
  functionId: string,
  input: unknown,
): Promise<FmeaActionResult> {
  const parsed = fmeaFunctionFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateFunction(context, functionId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Fonksiyonu siler. */
export async function deleteFunctionAction(functionId: string): Promise<FmeaActionResult> {
  const context = await requireAuthContext();

  try {
    await deleteFunction(context, functionId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/* -------------------------------------------------------------------------- */
/* Hata analizi                                                               */
/* -------------------------------------------------------------------------- */

/** Hata modu oluşturur. */
export async function createFailureModeAction(
  documentId: string,
  input: unknown,
): Promise<FmeaActionResult> {
  const parsed = fmeaFailureModeFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createFailureMode(context, documentId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Hata modunu günceller. */
export async function updateFailureModeAction(
  failureModeId: string,
  input: unknown,
): Promise<FmeaActionResult> {
  const parsed = fmeaFailureModeFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateFailureMode(context, failureModeId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Hata modunu siler. */
export async function deleteFailureModeAction(failureModeId: string): Promise<FmeaActionResult> {
  const context = await requireAuthContext();

  try {
    await deleteFailureMode(context, failureModeId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Hata nedeni oluşturur. */
export async function createFailureCauseAction(
  documentId: string,
  input: unknown,
): Promise<FmeaActionResult> {
  const parsed = fmeaFailureCauseFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createFailureCause(context, documentId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Hata nedenini günceller. */
export async function updateFailureCauseAction(
  causeId: string,
  input: unknown,
): Promise<FmeaActionResult> {
  const parsed = fmeaFailureCauseFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateFailureCause(context, causeId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Hata nedenini siler. */
export async function deleteFailureCauseAction(causeId: string): Promise<FmeaActionResult> {
  const context = await requireAuthContext();

  try {
    await deleteFailureCause(context, causeId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/* -------------------------------------------------------------------------- */
/* Kontroller                                                                 */
/* -------------------------------------------------------------------------- */

/** Önleme ya da algılama kontrolünü kaydeder. */
export async function saveControlAction(
  documentId: string,
  input: unknown,
): Promise<FmeaActionResult> {
  const parsed = fmeaControlFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await upsertControl(context, documentId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Kontrolü siler. */
export async function deleteControlAction(controlId: string): Promise<FmeaActionResult> {
  const context = await requireAuthContext();

  try {
    await deleteControl(context, controlId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/* -------------------------------------------------------------------------- */
/* Aksiyonlar                                                                 */
/* -------------------------------------------------------------------------- */

/** Aksiyon oluşturur. */
export async function createActionAction(
  documentId: string,
  input: unknown,
): Promise<FmeaActionResult> {
  const parsed = fmeaActionFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createAction(context, documentId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Aksiyonu günceller. */
export async function updateActionAction(
  actionId: string,
  input: unknown,
): Promise<FmeaActionResult> {
  const parsed = fmeaActionFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateAction(context, actionId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Aksiyonu siler. */
export async function deleteActionAction(actionId: string): Promise<FmeaActionResult> {
  const context = await requireAuthContext();

  try {
    await deleteAction(context, actionId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/* -------------------------------------------------------------------------- */
/* Özel karakteristikler                                                      */
/* -------------------------------------------------------------------------- */

/** Özel karakteristik oluşturur. */
export async function createSpecialCharacteristicAction(
  documentId: string,
  input: unknown,
): Promise<FmeaActionResult> {
  const parsed = fmeaSpecialCharacteristicFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createSpecialCharacteristic(context, documentId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Özel karakteristiği günceller. */
export async function updateSpecialCharacteristicAction(
  characteristicId: string,
  input: unknown,
): Promise<FmeaActionResult> {
  const parsed = fmeaSpecialCharacteristicFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateSpecialCharacteristic(context, characteristicId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Özel karakteristiği siler. */
export async function deleteSpecialCharacteristicAction(
  characteristicId: string,
): Promise<FmeaActionResult> {
  const context = await requireAuthContext();

  try {
    await deleteSpecialCharacteristic(context, characteristicId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/* -------------------------------------------------------------------------- */
/* Kaynak içe aktarım ve matrisler                                             */
/* -------------------------------------------------------------------------- */

/** Yapı ağacını kaynaktan doldurur. */
export async function importStructureFromSourceAction(
  input: unknown,
): Promise<FmeaActionResult & { created?: number }> {
  const parsed = fmeaSourceImportSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    const created = await importStructureFromSource(context, parsed.data);

    return { success: true, created };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Varsayılan değerlendirme matrislerini kurar. */
export async function seedDefaultMatricesAction(): Promise<FmeaActionResult> {
  const context = await requireAuthContext();

  try {
    await seedDefaultMatrices(context);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/**
 * Değerlendirme matrislerini günceller.
 *
 * Action Priority ve risk sınıfı matrisleri kurum tarafından kalibre
 * edilebilir; iki matris birlikte kaydedilir.
 */
export async function saveMatricesAction(input: unknown): Promise<FmeaActionResult> {
  const parsed = fmeaMatrixUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateActionPriorityMatrix(context, parsed.data.actionPriority);
    await updateRiskClassMatrix(context, parsed.data.riskClass);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
