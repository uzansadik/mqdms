"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";

import { unitFormSchema } from "./schema";
import { createUnit, UnitRuleError, updateUnit } from "./service";

/** Aksiyon sonucu. */
export type UnitActionResult = { success: true } | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof UnitRuleError) {
    return error.message;
  }

  console.error("Birim işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

export async function createUnitAction(input: unknown): Promise<UnitActionResult> {
  const parsed = unitFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createUnit(context, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function updateUnitAction(unitId: string, input: unknown): Promise<UnitActionResult> {
  const parsed = unitFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateUnit(context, unitId, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
