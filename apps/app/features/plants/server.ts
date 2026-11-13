import { requirePermission } from "@/features/auth/session";

import {
  countPlants,
  getPlant,
  listPlantOptions,
  listPlants,
  listProjectsByPlant,
  type PlantListQuery,
} from "./repository";

/**
 * Tesis sayfalarının koruma ve veri katmanı.
 *
 * Sayfa koruması tek güvenlik katmanı değildir; her server action kendi
 * yetki kontrolünü yapar.
 */

/** Tesis modülüne erişim zorunluluğu. */
export async function requirePlantsAccess(action = "read"): Promise<void> {
  await requirePermission("plants", action);
}

/** Liste sayfasının verisi. */
export async function getPlantListData(query: PlantListQuery) {
  const [items, total] = await Promise.all([listPlants(query), countPlants(query)]);

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
export async function getPlantDetailData(organizationId: string, plantId: string) {
  const record = await getPlant(organizationId, plantId);

  if (!record) {
    return null;
  }

  const projects = await listProjectsByPlant(organizationId, plantId);

  return { plant: record, projects };
}

/** Form seçim listesi. */
export async function getPlantOptions(organizationId: string) {
  return listPlantOptions(organizationId);
}
