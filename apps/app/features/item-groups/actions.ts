"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";
import { itemGroupFormSchema } from "@/features/items/schema";

import {
  archiveItemGroup,
  createItemGroup,
  ItemGroupRuleError,
  restoreItemGroup,
  updateItemGroup,
} from "./service";

/** Aksiyon sonucu. */
export type ItemGroupActionResult = { success: true } | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof ItemGroupRuleError) {
    return error.message;
  }

  console.error("Ürün grubu işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

export async function createItemGroupAction(input: unknown): Promise<ItemGroupActionResult> {
  const parsed = itemGroupFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createItemGroup(context, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function updateItemGroupAction(
  groupId: string,
  input: unknown,
): Promise<ItemGroupActionResult> {
  const parsed = itemGroupFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateItemGroup(context, groupId, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function archiveItemGroupAction(groupId: string): Promise<ItemGroupActionResult> {
  const context = await requireAuthContext();

  try {
    await archiveItemGroup(context, groupId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function restoreItemGroupAction(groupId: string): Promise<ItemGroupActionResult> {
  const context = await requireAuthContext();

  try {
    await restoreItemGroup(context, groupId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
