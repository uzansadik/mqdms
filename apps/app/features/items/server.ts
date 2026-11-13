import { requirePermission } from "@/features/auth/session";
import { listItemGroupOptions } from "@/features/item-groups/repository";
import { listUnitOptions } from "@/features/units/repository";

import {
  countItems,
  getItem,
  type ItemListQuery,
  listItemRevisions,
  listItems,
} from "./repository";

/**
 * Ürün sayfalarının koruma ve veri katmanı.
 *
 * Sayfa koruması tek güvenlik katmanı değildir; her server action kendi
 * yetki kontrolünü yapar.
 */

/** Ürün modülüne erişim zorunluluğu. */
export async function requireItemsAccess(action = "read"): Promise<void> {
  await requirePermission("items", action);
}

/** Liste sayfasının verisi. */
export async function getItemListData(query: ItemListQuery) {
  const [items, total] = await Promise.all([listItems(query), countItems(query)]);

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
export async function getItemDetailData(organizationId: string, itemId: string) {
  const record = await getItem(organizationId, itemId);

  if (!record) {
    return null;
  }

  const revisions = await listItemRevisions(organizationId, itemId);

  return { item: record, revisions };
}

/** Formun ihtiyaç duyduğu seçim listeleri. */
export async function getItemFormOptions(organizationId: string) {
  const [groups, units] = await Promise.all([
    listItemGroupOptions(organizationId),
    listUnitOptions(organizationId),
  ]);

  return { groups, units };
}
