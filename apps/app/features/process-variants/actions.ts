"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";
import {
  processVariantFormSchema,
  processVariantReviewReasonSchema,
  processVariantRevisionFormSchema,
} from "./schema";
import {
  approveProcessVariantRevision,
  archiveProcessVariant,
  createProcessVariant,
  createProcessVariantRevision,
  ProcessVariantRuleError,
  rejectProcessVariantRevision,
  releaseProcessVariantRevision,
  restoreProcessVariant,
  submitProcessVariantRevision,
  updateProcessVariant,
} from "./service";

/** Aksiyon sonucu. */
export type ProcessVariantActionResult = { success: true } | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof ProcessVariantRuleError) {
    return error.message;
  }

  console.error("Proses varyantı işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

/** Yeni Process Variant oluşturur. */
export async function createProcessVariantAction(
  input: unknown,
): Promise<ProcessVariantActionResult> {
  const parsed = processVariantFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createProcessVariant(context, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Process Variant'i günceller. */
export async function updateProcessVariantAction(
  variantId: string,
  input: unknown,
): Promise<ProcessVariantActionResult> {
  const parsed = processVariantFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateProcessVariant(context, variantId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Process Variant'i arşivler. */
export async function archiveProcessVariantAction(
  variantId: string,
): Promise<ProcessVariantActionResult> {
  const context = await requireAuthContext();

  try {
    await archiveProcessVariant(context, variantId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Arşivlenen Process Variant'i geri alır. */
export async function restoreProcessVariantAction(
  variantId: string,
): Promise<ProcessVariantActionResult> {
  const context = await requireAuthContext();

  try {
    await restoreProcessVariant(context, variantId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Yeni revision oluşturur. */
export async function createProcessVariantRevisionAction(
  variantId: string,
  input: unknown,
): Promise<ProcessVariantActionResult> {
  const parsed = processVariantRevisionFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createProcessVariantRevision(context, variantId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Revision'ı incelemeye gönderir. */
export async function submitProcessVariantRevisionAction(
  revisionId: string,
): Promise<ProcessVariantActionResult> {
  const context = await requireAuthContext();

  try {
    await submitProcessVariantRevision(context, revisionId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Revision'ı onaylar. */
export async function approveProcessVariantRevisionAction(
  revisionId: string,
): Promise<ProcessVariantActionResult> {
  const context = await requireAuthContext();

  try {
    await approveProcessVariantRevision(context, revisionId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Revision'ı gerekçeli olarak geri alır. */
export async function rejectProcessVariantRevisionAction(
  revisionId: string,
  input: unknown,
): Promise<ProcessVariantActionResult> {
  const parsed = processVariantReviewReasonSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await rejectProcessVariantRevision(context, revisionId, parsed.data.reason);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Revision'ı yayınlar. */
export async function releaseProcessVariantRevisionAction(
  revisionId: string,
): Promise<ProcessVariantActionResult> {
  const context = await requireAuthContext();

  try {
    await releaseProcessVariantRevision(context, revisionId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
