"use server";

import { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";

import { itemFormSchema } from "./schema";
import {
  archiveItem,
  createItem,
  createItemRevision,
  ItemRevisionRuleError,
  ItemRuleError,
  releaseItemRevision,
  resolveItemByStockCode,
  restoreItem,
  updateItem,
} from "./service";

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

/** Stok koduyla çözümlenen ürün. */
export type ResolvedItemResult =
  | {
      success: true;
      item: {
        id: string;
        code: string;
        name: string;
        itemType: string;
        structureType: string;
        supplyType: string | null;
        isSellable: boolean;
        unitOfMeasureId: string;
      };
    }
  | { success: false; error: string };

/**
 * Stok koduyla ürün çözümler.
 *
 * BOM grid'inde satır eklerken kullanılır: kullanıcı yalnızca stok kodunu
 * yazar, ürün bilgileri sunucudan gelir.
 */
export async function resolveItemByStockCodeAction(code: string): Promise<ResolvedItemResult> {
  const context = await requireAuthContext();

  try {
    return await resolveItemByStockCode(context, code);
  } catch (error) {
    console.error("Stok kodu çözümlenemedi:", error);

    return { success: false, error: "Stok kodu çözümlenemedi. Lütfen tekrar deneyin." };
  }
}

/* -------------------------------------------------------------------------
 * Item revision
 * ---------------------------------------------------------------------- */

const itemRevisionSchema = z.object({
  itemId: z.string().uuid("Geçersiz ürün."),
  revision: z.string().trim().min(1, "Revision değeri zorunludur.").max(64),
  description: z.string().trim().max(2000).optional(),
  changeReason: z.string().trim().max(1000).optional(),
  effectiveFrom: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz tarih.")
    .optional()
    .or(z.literal("")),
});

/**
 * Item revision oluşturur.
 *
 * Revision teknik içerik olarak `DRAFT` başlar; yayınlandıktan sonra
 * değiştirilemez.
 */
export async function createItemRevisionAction(input: unknown): Promise<ItemActionResult> {
  const parsed = itemRevisionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createItemRevision(context, {
      itemId: parsed.data.itemId,
      revision: parsed.data.revision,
      description: parsed.data.description,
      changeReason: parsed.data.changeReason,
      effectiveFrom: parsed.data.effectiveFrom,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof ItemRevisionRuleError) {
      return { success: false, error: error.message };
    }

    console.error("Item revision işlemi başarısız:", error);

    return { success: false, error: "İşlem tamamlanamadı. Lütfen tekrar deneyin." };
  }
}

/** Item revision'ını yayınlar. */
export async function releaseItemRevisionAction(revisionId: string): Promise<ItemActionResult> {
  const context = await requireAuthContext();

  try {
    await releaseItemRevision(context, revisionId);

    return { success: true };
  } catch (error) {
    if (error instanceof ItemRevisionRuleError) {
      return { success: false, error: error.message };
    }

    console.error("Item revision işlemi başarısız:", error);

    return { success: false, error: "İşlem tamamlanamadı. Lütfen tekrar deneyin." };
  }
}
