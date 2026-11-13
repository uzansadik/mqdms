"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";

import { itemFormSchema } from "./schema";
import { archiveItem, createItem, ItemRuleError, restoreItem, updateItem } from "./service";

/** Aksiyon sonucu. */
export type ItemActionResult = { success: true } | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof ItemRuleError) {
    return error.message;
  }

  console.error("Ürün işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

export async function createItemAction(input: unknown): Promise<ItemActionResult> {
  const parsed = itemFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createItem(context, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function updateItemAction(itemId: string, input: unknown): Promise<ItemActionResult> {
  const parsed = itemFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateItem(context, itemId, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function archiveItemAction(itemId: string): Promise<ItemActionResult> {
  const context = await requireAuthContext();

  try {
    await archiveItem(context, itemId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function restoreItemAction(itemId: string): Promise<ItemActionResult> {
  const context = await requireAuthContext();

  try {
    await restoreItem(context, itemId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
