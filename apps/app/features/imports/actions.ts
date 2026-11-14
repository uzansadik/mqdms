"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";

import {
  importExecuteSchema,
  importResolveSchema,
  importUploadSchema,
  importValidateSchema,
} from "./schema";
import {
  createImportJob,
  executeImportJob,
  type ImportPreview,
  ImportRuleError,
  resolveImportJob,
  validateImportJob,
} from "./service";

/** Aksiyon sonucu. */
export type ImportActionResult = { success: true } | { success: false; error: string };

/** Doğrulama sonucunun döndüğü aksiyon sonucu. */
export type ImportValidateResult =
  | { success: true; preview: ImportPreview }
  | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof ImportRuleError) {
    return error.message;
  }

  console.error("Import işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

/**
 * Yeni import işi oluşturur.
 *
 * Dosya depolamaya önceden yüklenmiştir; burada yalnızca referansı alınır.
 */
export async function createImportJobAction(input: unknown): Promise<ImportActionResult> {
  const parsed = importUploadSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createImportJob(context, {
      importType: parsed.data.importType,
      sourceSystem: parsed.data.sourceSystem,
      fileName: parsed.data.fileName,
      fileKey: parsed.data.fileKey,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/**
 * Satırları doğrular ve önizleme üretir.
 *
 * Bu adımda veri yazılmaz; yalnızca ne yapılacağı belirlenir.
 */
export async function validateImportJobAction(input: unknown): Promise<ImportValidateResult> {
  const parsed = importValidateSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    const preview = await validateImportJob(
      context,
      parsed.data.importJobId,
      parsed.data.columnMapping,
    );

    return { success: true, preview };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/**
 * Çakışmaları çözer.
 *
 * Kullanıcının satır bazında verdiği kararlar import işine kaydedilir;
 * çalıştırma adımı bu kararları uygular.
 */
export async function resolveImportJobAction(input: unknown): Promise<ImportValidateResult> {
  const parsed = importResolveSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    const preview = await resolveImportJob(
      context,
      parsed.data.importJobId,
      parsed.data.resolution,
    );

    return { success: true, preview };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/**
 * Doğrulanmış satırları yazar.
 *
 * Bütün satırlar tek transaction'da yazılır.
 */
export async function executeImportJobAction(input: unknown): Promise<ImportActionResult> {
  const parsed = importExecuteSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await executeImportJob(context, parsed.data.importJobId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
