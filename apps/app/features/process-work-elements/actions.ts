"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";
import { nodeWorkElementLinkSchema, workElementFormSchema } from "./schema";
import {
  attachWorkElementToNode,
  createWorkElement,
  deleteWorkElement,
  detachWorkElementFromNode,
  updateWorkElement,
  WorkElementRuleError,
} from "./service";

/** Aksiyon sonucu. */
export type WorkElementActionResult = { success: true } | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof WorkElementRuleError) {
    return error.message;
  }

  console.error("Work element işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

/** Yeni Work Element oluşturur. */
export async function createWorkElementAction(input: unknown): Promise<WorkElementActionResult> {
  const parsed = workElementFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createWorkElement(context, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Work Element'i günceller. */
export async function updateWorkElementAction(
  workElementId: string,
  input: unknown,
): Promise<WorkElementActionResult> {
  const parsed = workElementFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateWorkElement(context, workElementId, parsed.data);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Work Element'i siler. */
export async function deleteWorkElementAction(
  workElementId: string,
): Promise<WorkElementActionResult> {
  const context = await requireAuthContext();

  try {
    await deleteWorkElement(context, workElementId);

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Work Element'i bir Flow Node'a bağlar. */
export async function attachWorkElementToNodeAction(
  input: unknown,
): Promise<WorkElementActionResult> {
  const parsed = nodeWorkElementLinkSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await attachWorkElementToNode(
      context,
      parsed.data.flowNodeId,
      parsed.data.processWorkElementId,
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Work Element'in node bağlantısını kaldırır. */
export async function detachWorkElementFromNodeAction(
  input: unknown,
): Promise<WorkElementActionResult> {
  const parsed = nodeWorkElementLinkSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await detachWorkElementFromNode(
      context,
      parsed.data.flowNodeId,
      parsed.data.processWorkElementId,
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
