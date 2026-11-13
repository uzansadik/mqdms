import { requirePermission } from "@/features/auth/session";
import { listItemOptions } from "@/features/items/repository";

import { explodeBom, flattenBom } from "./explosion";
import { type BomListQuery, countBoms, getBom, listBomRevisions, listBoms } from "./repository";

/**
 * BOM sayfalarının koruma ve veri katmanı.
 */

/** BOM modülüne erişim zorunluluğu. */
export async function requireBomsAccess(action = "read"): Promise<void> {
  await requirePermission("boms", action);
}

/** Liste sayfasının verisi. */
export async function getBomListData(query: BomListQuery) {
  const [items, total] = await Promise.all([listBoms(query), countBoms(query)]);

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
 * Revision listesi, hiyerarşik ağaç ve düzleştirilmiş toplamlar birlikte
 * döner: ağaç yapıyı, düzleştirilmiş görünüm ise malzeme ihtiyacını gösterir.
 */
export async function getBomDetailData(organizationId: string, bomId: string) {
  const record = await getBom(organizationId, bomId);

  if (!record) {
    return null;
  }

  const revisions = await listBomRevisions(organizationId, bomId);

  const currentRevision = revisions[0] ?? null;

  const [tree, flattened] = currentRevision
    ? await Promise.all([
        explodeBom(organizationId, currentRevision.id),
        flattenBom(organizationId, currentRevision.id),
      ])
    : [[], []];

  return { bom: record, revisions, currentRevision, tree, flattened };
}

/** Formun ihtiyaç duyduğu seçim listeleri. */
export async function getBomFormOptions(organizationId: string) {
  return { items: await listItemOptions(organizationId) };
}
