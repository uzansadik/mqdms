import { requirePermission } from "@/features/auth/session";
import { explodeBom } from "@/features/boms/explosion";
import { listBomRevisionOptions } from "@/features/boms/repository";
import { listCustomerItemsByItem } from "@/features/customer-items/repository";
import { listItemOptions, listItemRevisionOptions } from "@/features/items/repository";

import { listProjectBomRevisions, listProjectItems } from "./repository";

/**
 * Proje ürünü sayfalarının koruma ve veri katmanı.
 */

/** Proje ürünü modülüne erişim zorunluluğu. */
export async function requireProjectItemsAccess(action = "manageItems"): Promise<void> {
  await requirePermission("projects", action);
}

/** Projenin ürün kapsamı. */
export async function getProjectItemListData(organizationId: string, projectId: string) {
  return listProjectItems(organizationId, projectId);
}

/**
 * Formun ihtiyaç duyduğu seçim listeleri.
 *
 * Müşteri ürünleri, item revision'ları ve BOM revision'ları istemcide seçilen
 * ürüne göre süzülür; bu yüzden hepsi birlikte gönderilir.
 */
export async function getProjectItemFormOptions(organizationId: string) {
  const [items, itemRevisions, bomRevisions] = await Promise.all([
    listItemOptions(organizationId),
    listItemRevisionOptions(organizationId),
    listBomRevisionOptions(organizationId),
  ]);

  return { items, itemRevisions, bomRevisions };
}

/**
 * Bir item'ın müşteri referansları.
 *
 * Proje formunda seçilen ürünün müşteri parça numaraları gösterilir.
 */
export async function getCustomerItemOptions(organizationId: string, itemId: string) {
  return listCustomerItemsByItem(organizationId, itemId);
}

/**
 * Projenin BOM sekmesi verisi.
 *
 * Proje ürünlerine bağlanmış her revision için çözümlenen bileşen ağacı
 * döner: kullanıcı alt bileşenleri proje bağlamında görebilir.
 */
export async function getProjectBomData(organizationId: string, projectId: string) {
  const revisions = await listProjectBomRevisions(organizationId, projectId);

  const trees = await Promise.all(
    revisions.map((revision) => explodeBom(organizationId, revision.bomRevisionId)),
  );

  return { revisions, trees };
}
