import { requirePermission } from "@/features/auth/session";

import {
  countItemGroups,
  getItemGroup,
  type ItemGroupListQuery,
  listItemGroupOptions,
  listItemGroups,
} from "./repository";

/**
 * Ürün grubu sayfalarının koruma ve veri katmanı.
 */

/** Ürün grubu modülüne erişim zorunluluğu. */
export async function requireItemGroupsAccess(action = "read"): Promise<void> {
  await requirePermission("itemGroups", action);
}

/** Liste sayfasının verisi. */
export async function getItemGroupListData(query: ItemGroupListQuery) {
  const [items, total] = await Promise.all([listItemGroups(query), countItemGroups(query)]);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/** Tek ürün grubu. */
export async function getItemGroupData(organizationId: string, groupId: string) {
  return getItemGroup(organizationId, groupId);
}

/** Form seçim listesi (üst grup seçimi). */
export async function getItemGroupOptions(organizationId: string) {
  return listItemGroupOptions(organizationId);
}
