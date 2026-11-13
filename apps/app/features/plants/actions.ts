"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";

import { plantFormSchema } from "./schema";
import { archivePlant, createPlant, PlantRuleError, restorePlant, updatePlant } from "./service";

/** Aksiyon sonucu. */
export type PlantActionResult = { success: true } | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof PlantRuleError) {
    return error.message;
  }

  console.error("Tesis işlemi başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

export async function createPlantAction(input: unknown): Promise<PlantActionResult> {
  const parsed = plantFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await createPlant(context, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function updatePlantAction(
  plantId: string,
  input: unknown,
): Promise<PlantActionResult> {
  const parsed = plantFormSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    await updatePlant(context, plantId, parsed.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function archivePlantAction(plantId: string): Promise<PlantActionResult> {
  const context = await requireAuthContext();

  try {
    await archivePlant(context, plantId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}

export async function restorePlantAction(plantId: string): Promise<PlantActionResult> {
  const context = await requireAuthContext();

  try {
    await restorePlant(context, plantId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
