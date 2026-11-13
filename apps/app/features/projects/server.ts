import { listOrganizationMembers } from "@mqdms/auth/permissions/server";

import { requirePermission } from "@/features/auth/session";
import {
  getCustomer,
  listAllCustomerSiteOptions,
  listCustomerOptions,
} from "@/features/customers/repository";
import { listPlantOptions } from "@/features/plants/repository";

import {
  countProjects,
  getProject,
  listProjectMembers,
  listProjectPlants,
  listProjects,
  type ProjectListQuery,
} from "./repository";

/**
 * Proje sayfalarının koruma ve veri katmanı.
 *
 * Sayfa koruması tek güvenlik katmanı değildir; her server action kendi
 * yetki kontrolünü yapar.
 */

/** Proje modülüne erişim zorunluluğu. */
export async function requireProjectsAccess(action = "read"): Promise<void> {
  await requirePermission("projects", action);
}

/** Liste sayfasının verisi. */
export async function getProjectListData(query: ProjectListQuery) {
  const [items, total] = await Promise.all([listProjects(query), countProjects(query)]);

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
export async function getProjectDetailData(organizationId: string, projectId: string) {
  const record = await getProject(organizationId, projectId);

  if (!record) {
    return null;
  }

  const [customer, plants, members] = await Promise.all([
    getCustomer(organizationId, record.customerId),
    listProjectPlants(organizationId, projectId),
    listProjectMembers(organizationId, projectId),
  ]);

  return { project: record, customer, plants, members };
}

/** Proje formunun ihtiyaç duyduğu seçim listeleri. */
export async function getProjectFormOptions(organizationId: string) {
  const [customers, sites, plants, members] = await Promise.all([
    listCustomerOptions(organizationId),
    listAllCustomerSiteOptions(organizationId),
    listPlantOptions(organizationId),
    listOrganizationMembers(organizationId),
  ]);

  return { customers, sites, plants, members };
}
