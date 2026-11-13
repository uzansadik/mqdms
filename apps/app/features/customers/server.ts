import { requirePermission } from "@/features/auth/session";

import {
  type CustomerListQuery,
  countCustomers,
  getCustomer,
  listCustomerContacts,
  listCustomerOptions,
  listCustomerSites,
  listCustomers,
  listProjectsByCustomer,
} from "./repository";

/**
 * Müşteri sayfalarının koruma ve veri katmanı.
 *
 * Sayfa koruması (`requirePermission`) tek güvenlik katmanı değildir; her
 * server action kendi yetki kontrolünü yapar.
 */

/** Müşteri modülüne erişim zorunluluğu. */
export async function requireCustomersAccess(action = "read"): Promise<void> {
  await requirePermission("customers", action);
}

/** Liste sayfasının verisi. */
export async function getCustomerListData(query: CustomerListQuery) {
  const [items, total] = await Promise.all([listCustomers(query), countCustomers(query)]);

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
export async function getCustomerDetailData(organizationId: string, customerId: string) {
  const record = await getCustomer(organizationId, customerId);

  if (!record) {
    return null;
  }

  const [sites, contacts, projects] = await Promise.all([
    listCustomerSites(organizationId, customerId),
    listCustomerContacts(organizationId, customerId),
    listProjectsByCustomer(organizationId, customerId),
  ]);

  return { customer: record, sites, contacts, projects };
}

/** Form seçim listesi. */
export async function getCustomerOptions(organizationId: string) {
  return listCustomerOptions(organizationId);
}
