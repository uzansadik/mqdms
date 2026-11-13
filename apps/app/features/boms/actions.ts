"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";

import { bomFormSchema, bomLineFormSchema, bomRevisionFormSchema } from "./schema";
import {
  addBomLine,
  archiveBom,
  BomRuleError,
  createBom,
  createBomRevision,
  releaseBomRevision,
  removeBomLine,
  updateBom,
  updateBomLine,
  updateBomRevision,
} from "./service";

/** Aksiyon sonucu. */
export type BomActionResult = { success: true } | { success: false; error: string };

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

export async function createBomRevisionAction(input: unknown): Promise<BomActionResult> {
  const parsed = bomRevisionFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createBomRevision(context, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function updateBomRevisionAction(
  revisionId: string,
  input: unknown,
): Promise<BomActionResult> {
  const parsed = bomRevisionFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateBomRevision(context, revisionId, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function releaseBomRevisionAction(revisionId: string): Promise<BomActionResult> {
  const context = await requireAuthContext();

  try {
    await releaseBomRevision(context, revisionId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function addBomLineAction(input: unknown): Promise<BomActionResult> {
  const parsed = bomLineFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await addBomLine(context, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function updateBomLineAction(
  lineId: string,
  input: unknown,
): Promise<BomActionResult> {
  const parsed = bomLineFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateBomLine(context, lineId, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function removeBomLineAction(lineId: string): Promise<BomActionResult> {
  const context = await requireAuthContext();

  try {
    await removeBomLine(context, lineId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
