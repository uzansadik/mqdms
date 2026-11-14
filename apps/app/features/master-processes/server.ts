import { requirePermission } from "@/features/auth/session";

import { countProcesses, getProcess, listProcesses, type ProcessListQuery } from "./repository";

/**
 * Master Process sayfalarının koruma ve veri katmanı.
 */

/** Proses kütüphanesine erişim zorunluluğu. */
export async function requireMasterProcessesAccess(action = "read"): Promise<void> {
  await requirePermission("masterProcesses", action);
}

/** Liste sayfasının verisi. */
export async function getProcessListData(query: ProcessListQuery) {
  const [items, total] = await Promise.all([listProcesses(query), countProcesses(query)]);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/**
 * Detay sayfasının verisi.
 *
 * Kayıt bulunamazsa `null` döner; sayfa `notFound()` ile 404 üretir.
 */
export async function getProcessDetailData(organizationId: string, processId: string) {
  const record = await getProcess(organizationId, processId);

  if (!record) {
    return null;
  }

  return { process: record };
}
