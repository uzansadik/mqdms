"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";
import {
  functionRequirementLinkSchema,
  processFunctionFormSchema,
  processRequirementFormSchema,
} from "./schema";
import {
  createProcessFunction,
  createProcessRequirement,
  deleteProcessFunction,
  deleteProcessRequirement,
  linkFunctionRequirement,
  ProcessContentRuleError,
  unlinkFunctionRequirement,
  updateProcessFunction,
  updateProcessRequirement,
} from "./service";

/** Aksiyon sonucu. */
export type ProcessContentActionResult = { success: true } | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof ProcessContentRuleError) {
    return error.message;
  }

  console.error("Proses içerik işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

/** Yeni fonksiyon oluşturur. */
export async function createProcessFunctionAction(
  input: unknown,
): Promise<ProcessContentActionResult> {
  const parsed = processFunctionFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createProcessFunction(context, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Fonksiyonu günceller. */
export async function updateProcessFunctionAction(
  functionId: string,
  input: unknown,
): Promise<ProcessContentActionResult> {
  const parsed = processFunctionFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateProcessFunction(context, functionId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Fonksiyonu siler. */
export async function deleteProcessFunctionAction(
  functionId: string,
): Promise<ProcessContentActionResult> {
  const context = await requireAuthContext();

  try {
    await deleteProcessFunction(context, functionId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Yeni gereklilik oluşturur. */
export async function createProcessRequirementAction(
  input: unknown,
): Promise<ProcessContentActionResult> {
  const parsed = processRequirementFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createProcessRequirement(context, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Gerekliliği günceller. */
export async function updateProcessRequirementAction(
  requirementId: string,
  input: unknown,
): Promise<ProcessContentActionResult> {
  const parsed = processRequirementFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateProcessRequirement(context, requirementId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Gerekliliği siler. */
export async function deleteProcessRequirementAction(
  requirementId: string,
): Promise<ProcessContentActionResult> {
  const context = await requireAuthContext();

  try {
    await deleteProcessRequirement(context, requirementId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Fonksiyonu gerekliliğe bağlar. */
export async function linkFunctionRequirementAction(
  input: unknown,
): Promise<ProcessContentActionResult> {
  const parsed = functionRequirementLinkSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await linkFunctionRequirement(
      context,
      parsed.data.processFunctionId,
      parsed.data.processRequirementId,
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Fonksiyonun gereklilik bağlantısını kaldırır. */
export async function unlinkFunctionRequirementAction(
  input: unknown,
): Promise<ProcessContentActionResult> {
  const parsed = functionRequirementLinkSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await unlinkFunctionRequirement(
      context,
      parsed.data.processFunctionId,
      parsed.data.processRequirementId,
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
