"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";

import { customerItemFormSchema, customerItemRevisionFormSchema } from "./schema";
import {
  archiveCustomerItem,
  CustomerItemRuleError,
  createCustomerItem,
  createCustomerItemRevision,
  restoreCustomerItem,
  updateCustomerItem,
  updateCustomerItemRevision,
} from "./service";

/** Aksiyon sonucu. */
export type CustomerItemActionResult = { success: true } | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof CustomerItemRuleError) {
    return error.message;
  }

  console.error("Müşteri ürünü işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

export async function createCustomerItemAction(input: unknown): Promise<CustomerItemActionResult> {
  const parsed = customerItemFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createCustomerItem(context, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function updateCustomerItemAction(
  customerItemId: string,
  input: unknown,
): Promise<CustomerItemActionResult> {
  const parsed = customerItemFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateCustomerItem(context, customerItemId, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function archiveCustomerItemAction(
  customerItemId: string,
): Promise<CustomerItemActionResult> {
  const context = await requireAuthContext();

  try {
    await archiveCustomerItem(context, customerItemId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function restoreCustomerItemAction(
  customerItemId: string,
): Promise<CustomerItemActionResult> {
  const context = await requireAuthContext();

  try {
    await restoreCustomerItem(context, customerItemId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function createCustomerItemRevisionAction(
  input: unknown,
): Promise<CustomerItemActionResult> {
  const parsed = customerItemRevisionFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createCustomerItemRevision(context, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function updateCustomerItemRevisionAction(
  revisionId: string,
  input: unknown,
): Promise<CustomerItemActionResult> {
  const parsed = customerItemRevisionFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateCustomerItemRevision(context, revisionId, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
