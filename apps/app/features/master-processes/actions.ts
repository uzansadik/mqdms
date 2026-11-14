"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";
import { processFormSchema } from "./schema";
import {
  archiveProcess,
  createProcess,
  ProcessRuleError,
  restoreProcess,
  updateProcess,
} from "./service";

/** Aksiyon sonucu. */
export type ProcessActionResult = { success: true } | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof ProcessRuleError) {
    return error.message;
  }

  console.error("Proses işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

/** Yeni Master Process oluşturur. */
export async function createProcessAction(input: unknown): Promise<ProcessActionResult> {
  const parsed = processFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createProcess(context, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Master Process'i günceller. */
export async function updateProcessAction(
  processId: string,
  input: unknown,
): Promise<ProcessActionResult> {
  const parsed = processFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateProcess(context, processId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Master Process'i arşivler. */
export async function archiveProcessAction(processId: string): Promise<ProcessActionResult> {
  const context = await requireAuthContext();

  try {
    await archiveProcess(context, processId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Arşivlenen Master Process'i geri alır. */
export async function restoreProcessAction(processId: string): Promise<ProcessActionResult> {
  const context = await requireAuthContext();

  try {
    await restoreProcess(context, processId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
