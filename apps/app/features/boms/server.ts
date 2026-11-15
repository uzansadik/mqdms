import { requirePermission } from "@/features/auth/session";
import { getItem } from "@/features/items/repository";
import { listUnitOptions } from "@/features/units/repository";

import { flattenBom } from "./explosion";
import {
  type BomListQuery,
  countBoms,
  getBom,
  listBomLines,
  listBomRevisions,
  listBomRootCandidates,
  listBoms,
} from "./repository";

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
 * Revision listesi, seçili revision'ın satırları ve düzleştirilmiş toplamlar
 * birlikte döner: ağaç yapıyı, düzleştirilmiş görünüm ise malzeme ihtiyacını
 * gösterir.
 *
 * @param revisionId Seçilecek revision; verilmezse açık taslak, yoksa son
 * yayınlanmış revision kullanılır.
 */
export async function getBomDetailData(
  organizationId: string,
  bomId: string,
  revisionId?: string | null,
) {
  const record = await getBom(organizationId, bomId);

  if (!record) {
    return null;
  }

  const [revisions, rootItem] = await Promise.all([
    listBomRevisions(organizationId, bomId),
    getItem(organizationId, record.itemId),
  ]);

  const selected =
    (revisionId ? revisions.find((revision) => revision.id === revisionId) : null) ??
    revisions.find((revision) => revision.status === "DRAFT" || revision.status === "IN_REVIEW") ??
    revisions.find((revision) => revision.status === "RELEASED") ??
    revisions[0] ??
    null;

  const [lines, flattened] = selected
    ? await Promise.all([
        listBomLines(organizationId, selected.id),
        flattenBom(organizationId, selected.id),
      ])
    : [[], []];

  return { bom: record, rootItem, revisions, currentRevision: selected, lines, flattened };
}

/** Formun ihtiyaç duyduğu seçim listeleri. */
export async function getBomFormOptions(organizationId: string) {
  const [units, items] = await Promise.all([
    listUnitOptions(organizationId),
    listBomRootCandidates(organizationId),
  ]);

  return { units, items };
}
