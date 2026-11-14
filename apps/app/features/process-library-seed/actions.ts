"use server";

import { requireAuthContext } from "@/features/auth/session";

import { ProcessLibrarySeedError, seedProcessLibraryTemplate } from "./service";

/** Seed sonucu. */
export type ProcessLibrarySeedActionResult =
  | { success: true; created: number; skipped: number }
  | { success: false; error: string };

/**
 * Proses kütüphanesi başlangıç şablonunu kurar.
 *
 * Şablon opsiyoneldir: hiçbir organizasyona otomatik yüklenmez.
 */
export async function seedProcessLibraryTemplateAction(): Promise<ProcessLibrarySeedActionResult> {
  const context = await requireAuthContext();

  try {
    const result = await seedProcessLibraryTemplate(context);

    return {
      success: true,
      created: result.processes + result.variants + result.revisions,
      skipped: result.skipped.length,
    };
  } catch (error) {
    if (error instanceof ProcessLibrarySeedError) {
      return { success: false, error: error.message };
    }

    console.error("Proses kütüphanesi şablonu yüklenemedi:", error);

    return { success: false, error: "Şablon yüklenemedi. Lütfen tekrar deneyin." };
  }
}
