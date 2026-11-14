"use server";

import type { z } from "zod";

import { requireAuthContext } from "@/features/auth/session";

import { flowSaveSchema } from "./schema";
import { FlowRuleError, saveFlowGraph } from "./service";

/** Aksiyon sonucu. */
export type FlowActionResult =
  | { success: true; nodeCount: number; edgeCount: number; version: number }
  | { success: false; error: string };

/** Doğrulama hatasını tek satırlık bir mesaja çevirir. */
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}

/** Servis hatasını kullanıcıya gösterilebilir mesaja çevirir. */
function toActionError(error: unknown): string {
  if (error instanceof FlowRuleError) {
    return error.message;
  }

  console.error("Akış kaydetme başarısız:", error);

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

/**
 * Akış grafiğini kaydeder.
 *
 * Grafik, revision durumu ve sürümü yeniden doğrulanarak **tek transaction**
 * içinde yazılır.
 */
export async function saveFlowGraphAction(input: unknown): Promise<FlowActionResult> {
  const parsed = flowSaveSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  const context = await requireAuthContext();

  try {
    const result = await saveFlowGraph(context, parsed.data);

    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: toActionError(error) };
  }
}
