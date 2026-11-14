import { requirePermission } from "@/features/auth/session";

import { getImportJob, listImportJobErrors, listImportJobs } from "./repository";
import { readSheet } from "./service";

/**
 * Import sayfalarının koruma ve veri katmanı.
 */

/** Import modülüne erişim zorunluluğu. */
export async function requireImportsAccess(action = "read"): Promise<void> {
  await requirePermission("imports", action);
}

/** Import işlerinin listesi. */
export async function getImportJobList(organizationId: string) {
  return listImportJobs(organizationId);
}

/**
 * Tek import işi ve dosyanın başlıkları.
 *
 * Kolon eşleştirme ekranı dosyanın kolonlarını gösterir; başlıklar dosya
 * depolamadan okunup ayrıştırılar.
 */
export async function getImportJobDetail(organizationId: string, importJobId: string) {
  const job = await getImportJob(organizationId, importJobId);

  if (!job) {
    return null;
  }

  const errors = await listImportJobErrors(importJobId);

  let headers: string[] = [];
  let sampleRows: Record<string, string>[] = [];

  try {
    const { sheet } = await readSheet(job);

    headers = sheet.headers;
    sampleRows = sheet.rows.slice(0, 5).map((row) => row.values);
  } catch {
    // Dosya okunamazsa başlıklar boş kalır; kullanıcı hata mesajını görür.
  }

  return { job, errors, headers, sampleRows };
}
