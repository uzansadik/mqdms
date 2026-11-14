"use server";

import { z } from "zod";

import { getTranslations } from "@mqdms/i18n/server";
import { requireAuthContext } from "@/features/auth/session";
import { describeValidationCode } from "@/features/flow-editor/validation";
import { deriveProcessVariant, DerivationRuleError } from "./derivation";
import {
  processVariantFormSchema,
  processVariantReviewReasonSchema,
  processVariantRevisionFormSchema,
} from "./schema";
import { applySourceUpdate, getSourceUpdateChanges, SourceUpdateRuleError } from "./source-update";
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
  if (
    error instanceof ProcessVariantRuleError ||
    error instanceof DerivationRuleError ||
    error instanceof SourceUpdateRuleError
  ) {
    return error.message;
  }

  console.error("Proses varyantı işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

/**
 * Grafik doğrulama hatalarını okunur mesaja çevirir.
 *
 * Hatalar yayınlamayı engeller: akış yayınlanmadan önce tutarlı olmalıdır.
 */
async function describeGraphErrors(codes: string[]): Promise<string> {
  const t = await getTranslations();

  return codes.map((code) => describeValidationCode(code, t)).join(" ");
}

/** Türetme isteği şeması. */
const deriveSchema = z.object({
  sourceVariantRevisionId: z.string().uuid("Geçersiz kaynak revision."),
  code: z.string().trim().min(1, "Varyant kodu zorunludur.").max(64),
  name: z.string().trim().min(1, "Varyant adı zorunludur.").max(200),
  description: z.string().trim().max(2000).optional(),
  selections: z.object({
    flow: z.boolean(),
    workElements: z.boolean(),
    functions: z.boolean(),
    requirements: z.boolean(),
    io: z.boolean(),
    applicability: z.boolean(),
  }),
});

/** Kaynak güncelleme isteği şeması. */
const sourceUpdateSchema = z.object({
  targetRevisionId: z.string().uuid("Geçersiz hedef revision."),
  sourceRevisionId: z.string().uuid("Geçersiz kaynak revision."),
  selections: z.array(
    z.object({
      category: z.enum(["FLOW", "WORK_ELEMENT", "FUNCTION", "REQUIREMENT", "IO", "APPLICABILITY"]),
      logicalId: z.string().min(1).max(64),
    }),
  ),
});

/** Kaynak güncelleme değişiklikleri isteği şeması. */
const sourceUpdateChangesSchema = z.object({
  targetRevisionId: z.string().uuid("Geçersiz hedef revision."),
  sourceRevisionId: z.string().uuid("Geçersiz kaynak revision."),
});

/** Karşılaştırılabilir değişiklik. */
export type SourceUpdateChange = {
  category: "FLOW" | "WORK_ELEMENT" | "FUNCTION" | "REQUIREMENT" | "IO" | "APPLICABILITY";
  type: "ADDED" | "REMOVED" | "UPDATED";
  logicalId: string;
  label: string;
  fields: string[];
  layoutOnly: boolean;
};

/**
 * Jenerik varyantan özelleştirilmiş varyant türetir.
 *
 * Yeni varyant ve ilk `DRAFT` revision'ı tek transaction içinde oluşturulur.
 */
export async function deriveProcessVariantAction(
  input: unknown,
): Promise<ProcessVariantActionResult> {
  const parsed = deriveSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await deriveProcessVariant(context, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/**
 * Kaynak revision güncellemesini hedef `DRAFT` revision'a uygular.
 *
 * Yalnızca kullanıcının seçtiği kayıtlar aktarılır.
 */
export async function applySourceUpdateAction(input: unknown): Promise<ProcessVariantActionResult> {
  const parsed = sourceUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await applySourceUpdate(context, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/**
 * Lineage kaynağı ile seçilen yeni kaynak revision arasındaki farkı döner.
 *
 * Teknik değişiklikler ve görsel düzen değişiklikleri ayrı listelenir.
 */
export async function getSourceUpdateChangesAction(
  input: unknown,
): Promise<
  | { success: true; technical: SourceUpdateChange[]; layout: SourceUpdateChange[] }
  | { success: false; error: string }
> {
  const parsed = sourceUpdateChangesSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    const result = await getSourceUpdateChanges(
      context,
      parsed.data.targetRevisionId,
      parsed.data.sourceRevisionId,
    );

    return { success: true, technical: result.technical, layout: result.layout };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
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
    if (error instanceof ProcessVariantRuleError && error.code === "GRAPH_INVALID") {
      return { success: false, error: await describeGraphErrors(error.details) };
    }

    return { success: false, error: toActionError(error) };
  }
}
