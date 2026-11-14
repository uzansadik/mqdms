"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";

import { customerContactFormSchema, customerFormSchema, customerSiteFormSchema } from "./schema";
import {
  archiveCustomer,
  archiveCustomerContact,
  archiveCustomerSite,
  BusinessRuleError,
  createCustomer,
  createCustomerContact,
  createCustomerSite,
  restoreCustomer,
  restoreCustomerContact,
  restoreCustomerSite,
  updateCustomer,
  updateCustomerContact,
  updateCustomerSite,
} from "./service";

/**
 * Aksiyon sonucu.
 *
 * Hata `throw` edilmez; form kök hata alanında gösterilir.
 */
export type CustomerActionResult = { success: true } | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof BusinessRuleError) {
    return error.message;
  }

  console.error("Müşteri işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

/* -------------------------------------------------------------------------
 * Müşteri
 * ---------------------------------------------------------------------- */

export async function createCustomerAction(input: unknown): Promise<CustomerActionResult> {
  const parsed = customerFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createCustomer(context, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function updateCustomerAction(
  customerId: string,
  input: unknown,
): Promise<CustomerActionResult> {
  const parsed = customerFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateCustomer(context, customerId, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function archiveCustomerAction(customerId: string): Promise<CustomerActionResult> {
  const context = await requireAuthContext();

  try {
    await archiveCustomer(context, customerId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function restoreCustomerAction(customerId: string): Promise<CustomerActionResult> {
  const context = await requireAuthContext();

  try {
    await restoreCustomer(context, customerId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/* -------------------------------------------------------------------------
 * Müşteri sitesi
 * ---------------------------------------------------------------------- */

export async function createCustomerSiteAction(input: unknown): Promise<CustomerActionResult> {
  const parsed = customerSiteFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createCustomerSite(context, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function updateCustomerSiteAction(
  siteId: string,
  input: unknown,
): Promise<CustomerActionResult> {
  const parsed = customerSiteFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateCustomerSite(context, siteId, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function archiveCustomerSiteAction(siteId: string): Promise<CustomerActionResult> {
  const context = await requireAuthContext();

  try {
    await archiveCustomerSite(context, siteId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/* -------------------------------------------------------------------------
 * Müşteri temsilcisi
 * ---------------------------------------------------------------------- */

export async function createCustomerContactAction(input: unknown): Promise<CustomerActionResult> {
  const parsed = customerContactFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createCustomerContact(context, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function updateCustomerContactAction(
  contactId: string,
  input: unknown,
): Promise<CustomerActionResult> {
  const parsed = customerContactFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateCustomerContact(context, contactId, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function archiveCustomerContactAction(
  contactId: string,
): Promise<CustomerActionResult> {
  const context = await requireAuthContext();

  try {
    await archiveCustomerContact(context, contactId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Sitenin arşivden çıkarılması. */
export async function restoreCustomerSiteAction(siteId: string): Promise<CustomerActionResult> {
  const context = await requireAuthContext();

  try {
    await restoreCustomerSite(context, siteId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/** Temsilcinin arşivden çıkarılması. */
export async function restoreCustomerContactAction(
  contactId: string,
): Promise<CustomerActionResult> {
  const context = await requireAuthContext();

  try {
    await restoreCustomerContact(context, contactId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
