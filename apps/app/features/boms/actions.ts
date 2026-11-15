"use server";

import { hasPermission } from "@mqdms/auth/permissions/server";
import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";

import { listBomComponentOptions } from "./explosion";
import { bomDraftSaveSchema, bomFormSchema, bomNextRevisionSchema } from "./schema";
import {
  archiveBom,
  BomRuleError,
  createBom,
  createNextBomRevision,
  releaseBomRevision,
  restoreBom,
  returnBomToDraft,
  saveBomDraft,
  submitBomForReview,
  updateBom,
} from "./service";

/** Aksiyon sonucu. */
export type BomActionResult = { success: true } | { success: false; error: string };

/** Taslak kaydetme sonucu. */
export type BomDraftSaveResult =
  | { success: true; idMap: Record<string, string>; lockVersion: number }
  | { success: false; error: string; conflict?: boolean };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof BomRuleError) {
    return error.message;
  }

  console.error("BOM işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

export async function createBomAction(input: unknown): Promise<BomActionResult> {
  const parsed = bomFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createBom(context, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function updateBomAction(bomId: string, input: unknown): Promise<BomActionResult> {
  const parsed = bomFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateBom(context, bomId, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function archiveBomAction(bomId: string): Promise<BomActionResult> {
  const context = await requireAuthContext();

  try {
    await archiveBom(context, bomId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function restoreBomAction(bomId: string): Promise<BomActionResult> {
  const context = await requireAuthContext();

  try {
    await restoreBom(context, bomId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Yeni revision taslağı oluşturur. */
export async function createNextBomRevisionAction(
  input: unknown,
): Promise<BomActionResult & { revisionId?: string }> {
  const parsed = bomNextRevisionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    const revisionId = await createNextBomRevision(
      context,
      parsed.data.bomId,
      parsed.data.changeReason,
    );

    return { success: true, revisionId };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/**
 * Taslak ağacı kaydeder.
 *
 * İstemci ağacın tamamını gönderir; sunucu farkı hesaplayıp tek
 * transaction'da uygular. Sürüm çakışması ayrıca bildirilir: kullanıcının
 * değişiklikleri kaybolmaz.
 */
export async function saveBomDraftAction(input: unknown): Promise<BomDraftSaveResult> {
  const parsed = bomDraftSaveSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    const result = await saveBomDraft(context, parsed.data);

    return { success: true, idMap: result.idMap, lockVersion: result.lockVersion };
  } catch (error) {
    if (error instanceof BomRuleError && error.code === "CONFLICT") {
      return { success: false, error: error.message, conflict: true };
    }

    return { success: false, error: toActionError(error) };
  }
}

/** Revision'ı incelemeye gönderir. */
export async function submitBomForReviewAction(revisionId: string): Promise<BomActionResult> {
  const context = await requireAuthContext();

  try {
    await submitBomForReview(context, revisionId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** İncelemede olan revision'ı taslağa döndürür. */
export async function returnBomToDraftAction(revisionId: string): Promise<BomActionResult> {
  const context = await requireAuthContext();

  try {
    await returnBomToDraft(context, revisionId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Revision'ı yayınlar. */
export async function releaseBomRevisionAction(revisionId: string): Promise<BomActionResult> {
  const context = await requireAuthContext();

  try {
    await releaseBomRevision(context, revisionId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** BOM bileşen listesi sonucu. */
export type BomComponentOptionsResult =
  | { success: true; items: { id: string; code: string; name: string }[] }
  | { success: false; error: string };

/**
 * Bir BOM revision'ının bileşenlerini döndürür.
 *
 * Çözümlenen alt bileşenler de dahil edilir: kalite çalışması için gerekli
 * bütün alt bileşenler (FRP, metal vb.) tek listede toplanır. Aynı item
 * birden çok yerde geçiyorsa listede bir kez görünür.
 */
export async function listBomComponentOptionsAction(
  bomRevisionId: string,
): Promise<BomComponentOptionsResult> {
  const context = await requireAuthContext();

  if (!(await hasPermission(context, "boms", "read"))) {
    return { success: false, error: "Bu işlem için yetkiniz yok." };
  }

  const items = await listBomComponentOptions(context.organizationId, bomRevisionId);

  return { success: true, items };
}
