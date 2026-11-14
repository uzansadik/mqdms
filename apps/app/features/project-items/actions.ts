"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";

import { projectItemFormSchema } from "./schema";
import {
  addProjectItems,
  archiveProjectItem,
  createProjectItem,
  ProjectItemRuleError,
  updateProjectItem,
} from "./service";

/** Aksiyon sonucu. */
export type ProjectItemActionResult = { success: true } | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof ProjectItemRuleError) {
    return error.message;
  }

  console.error("Proje ürünü işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

export async function createProjectItemAction(input: unknown): Promise<ProjectItemActionResult> {
  const parsed = projectItemFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createProjectItem(context, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function updateProjectItemAction(
  projectItemId: string,
  input: unknown,
): Promise<ProjectItemActionResult> {
  const parsed = projectItemFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updateProjectItem(context, projectItemId, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function archiveProjectItemAction(
  projectItemId: string,
): Promise<ProjectItemActionResult> {
  const context = await requireAuthContext();

  try {
    await archiveProjectItem(context, projectItemId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

/**
 * Ürünleri projeye toplu ekler.
 *
 * Zaten projede olan item'lar sessizce atlanır; eklenenler audit'e yazılır.
 */
export async function addProjectItemsAction(
  projectId: string,
  itemIds: string[],
): Promise<ProjectItemActionResult> {
  const context = await requireAuthContext();

  try {
    await addProjectItems(context, projectId, itemIds);

    return { success: true };
  } catch (error) {
    if (error instanceof ProjectItemRuleError) {
      return { success: false, error: error.message };
    }

    console.error("Toplu ürün ekleme başarısız:", error);

    return { success: false, error: "İşlem tamamlanamadı. Lütfen tekrar deneyin." };
  }
}
