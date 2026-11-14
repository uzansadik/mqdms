"use server";

import { hasPermission } from "@mqdms/auth/permissions/server";
import {
  createImportJob,
  getImportJob,
  type ImportPreview,
  ImportRuleError,
  importExecuteSchema,
  importResolveSchema,
  importUploadSchema,
  importValidateSchema,
  resolveImportJob,
  validateImportJob,
} from "@mqdms/imports";
import { addJob } from "@mqdms/queue";
import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";

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

  if (!(await hasPermission(context, "imports", "create"))) {
    return { success: false, error: "Bu işlem için yetkiniz yok." };
  }

  try {
    await createImportJob({
      organizationId: context.organizationId,
      actorId: context.userId,
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

  if (!(await hasPermission(context, "imports", "read"))) {
    return { success: false, error: "Bu işlem için yetkiniz yok." };
  }

  try {
    const preview = await validateImportJob({
      organizationId: context.organizationId,
      importJobId: parsed.data.importJobId,
      mapping: parsed.data.columnMapping,
    });

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

  if (!(await hasPermission(context, "imports", "execute"))) {
    return { success: false, error: "Bu işlem için yetkiniz yok." };
  }

  try {
    const preview = await resolveImportJob({
      organizationId: context.organizationId,
      importJobId: parsed.data.importJobId,
      resolution: parsed.data.resolution,
    });

    return { success: true, preview };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/**
 * Onaylanan import'u kuyruğa alır.
 *
 * Yazma adımı **worker'da** çalışır: büyük dosyalar istek zaman aşımına
 * uğramaz. Kuyruğa alma yetkisi burada denetlenir.
 */
export async function executeImportJobAction(input: unknown): Promise<ImportActionResult> {
  const parsed = importExecuteSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  if (!(await hasPermission(context, "imports", "execute"))) {
    return { success: false, error: "Bu işlem için yetkiniz yok." };
  }

  try {
    const job = await getImportJob(context.organizationId, parsed.data.importJobId);

    if (!job) {
      return { success: false, error: "Import işi bulunamadı." };
    }

    if (job.status !== "READY") {
      return { success: false, error: "Import çalıştırılmaya hazır değil." };
    }

    await addJob("import.execute", {
      importJobId: parsed.data.importJobId,
      organizationId: context.organizationId,
      actorId: context.userId,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
