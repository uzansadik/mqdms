"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";
import { processApplicabilityFormSchema, processIoFormSchema } from "./schema";
import {
  createProcessApplicability,
  createProcessIoDefinition,
  deleteProcessApplicability,
  deleteProcessIoDefinition,
  ProcessIoRuleError,
  updateProcessIoDefinition,
} from "./service";

/** Aksiyon sonucu. */
export type ProcessIoActionResult = { success: true } | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof ProcessIoRuleError) {
    return error.message;
  }

  console.error("Proses girdi/çıktı işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

/** Yeni girdi/çıktı tanımı oluşturur. */
export async function createProcessIoDefinitionAction(
  input: unknown,
): Promise<ProcessIoActionResult> {
  const parsed = processIoFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createProcessIoDefinition(context, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Girdi/çıktı tanımını günceller. */
export async function updateProcessIoDefinitionAction(
  ioId: string,
  input: unknown,
): Promise<ProcessIoActionResult> {
  const parsed = processIoFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateProcessIoDefinition(context, ioId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Girdi/çıktı tanımını siler. */
export async function deleteProcessIoDefinitionAction(
  ioId: string,
): Promise<ProcessIoActionResult> {
  const context = await requireAuthContext();

  try {
    await deleteProcessIoDefinition(context, ioId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Yeni applicability kuralı oluşturur. */
export async function createProcessApplicabilityAction(
  input: unknown,
): Promise<ProcessIoActionResult> {
  const parsed = processApplicabilityFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createProcessApplicability(context, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Applicability kuralını siler. */
export async function deleteProcessApplicabilityAction(
  applicabilityId: string,
): Promise<ProcessIoActionResult> {
  const context = await requireAuthContext();

  try {
    await deleteProcessApplicability(context, applicabilityId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
