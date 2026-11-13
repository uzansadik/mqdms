import { db } from "@mqdms/db";
import { customer, customerItem, customerItemRevision, item, itemRevision } from "@mqdms/db/schema";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

/**
 * Müşteri ürün referansı okuma katmanı.
 *
 * Bütün sorgular `organizationId` ile kısıtlanır.
 */

export type CustomerItemRecord = {
  id: string;
  organizationId: string;
  customerId: string;
  customerName: string | null;
  itemId: string;
  itemCode: string | null;
  itemName: string | null;
  customerPartNumber: string;
  customerPartName: string | null;
  description: string | null;
  scope: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

export type CustomerItemRevisionRecord = {
  id: string;
  customerItemId: string;
  customerRevision: string;
  internalItemRevisionId: string | null;
  internalRevision: string | null;
  drawingReference: string | null;
  drawingRevision: string | null;
  description: string | null;
  status: "DRAFT" | "RELEASED" | "SUPERSEDED";
  effectiveFrom: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Bir ürünün müşteri referansları. */
export async function listCustomerItemsByItem(
  organizationId: string,
  itemId: string,
): Promise<CustomerItemRecord[]> {
  return db
    .select({
      id: customerItem.id,
      organizationId: customerItem.organizationId,
      customerId: customerItem.customerId,
      customerName: customer.name,
      itemId: customerItem.itemId,
      itemCode: item.code,
      itemName: item.name,
      customerPartNumber: customerItem.customerPartNumber,
      customerPartName: customerItem.customerPartName,
      description: customerItem.description,
      scope: customerItem.scope,
      status: customerItem.status,
      createdAt: customerItem.createdAt,
      updatedAt: customerItem.updatedAt,
      archivedAt: customerItem.archivedAt,
    })
    .from(customerItem)
    .leftJoin(customer, eq(customer.id, customerItem.customerId))
    .leftJoin(item, eq(item.id, customerItem.itemId))
    .where(
      and(
        eq(customerItem.organizationId, organizationId),
        eq(customerItem.itemId, itemId),
        isNull(customerItem.archivedAt),
      ),
    )
    .orderBy(asc(customer.name), asc(customerItem.customerPartNumber));
}

/** Bir ürünün **tüm** müşteri referansları (arşivlenenler dahil). */
export async function listCustomerItemsByItemIncludingArchived(
  organizationId: string,
  itemId: string,
): Promise<CustomerItemRecord[]> {
  return db
    .select({
      id: customerItem.id,
      organizationId: customerItem.organizationId,
      customerId: customerItem.customerId,
      customerName: customer.name,
      itemId: customerItem.itemId,
      itemCode: item.code,
      itemName: item.name,
      customerPartNumber: customerItem.customerPartNumber,
      customerPartName: customerItem.customerPartName,
      description: customerItem.description,
      scope: customerItem.scope,
      status: customerItem.status,
      createdAt: customerItem.createdAt,
      updatedAt: customerItem.updatedAt,
      archivedAt: customerItem.archivedAt,
    })
    .from(customerItem)
    .leftJoin(customer, eq(customer.id, customerItem.customerId))
    .leftJoin(item, eq(item.id, customerItem.itemId))
    .where(and(eq(customerItem.organizationId, organizationId), eq(customerItem.itemId, itemId)))
    .orderBy(asc(customer.name), asc(customerItem.customerPartNumber));
}

/** Tek müşteri ürün referansı. */
export async function getCustomerItem(
  organizationId: string,
  customerItemId: string,
): Promise<CustomerItemRecord | null> {
  const rows = await db
    .select({
      id: customerItem.id,
      organizationId: customerItem.organizationId,
      customerId: customerItem.customerId,
      customerName: customer.name,
      itemId: customerItem.itemId,
      itemCode: item.code,
      itemName: item.name,
      customerPartNumber: customerItem.customerPartNumber,
      customerPartName: customerItem.customerPartName,
      description: customerItem.description,
      scope: customerItem.scope,
      status: customerItem.status,
      createdAt: customerItem.createdAt,
      updatedAt: customerItem.updatedAt,
      archivedAt: customerItem.archivedAt,
    })
    .from(customerItem)
    .leftJoin(customer, eq(customer.id, customerItem.customerId))
    .leftJoin(item, eq(item.id, customerItem.itemId))
    .where(
      and(eq(customerItem.organizationId, organizationId), eq(customerItem.id, customerItemId)),
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Müşteri parça numarası müşteri (ve kapsam) içinde unique'tir.
 *
 * Karşılaştırma büyük/küçük harf duyarsızdır.
 */
export async function findCustomerItemByPartNumber(
  organizationId: string,
  customerId: string,
  customerPartNumber: string,
  scope: string,
  excludeId?: string,
): Promise<CustomerItemRecord | null> {
  const rows = await db
    .select({
      id: customerItem.id,
      organizationId: customerItem.organizationId,
      customerId: customerItem.customerId,
      customerName: customer.name,
      itemId: customerItem.itemId,
      itemCode: item.code,
      itemName: item.name,
      customerPartNumber: customerItem.customerPartNumber,
      customerPartName: customerItem.customerPartName,
      description: customerItem.description,
      scope: customerItem.scope,
      status: customerItem.status,
      createdAt: customerItem.createdAt,
      updatedAt: customerItem.updatedAt,
      archivedAt: customerItem.archivedAt,
    })
    .from(customerItem)
    .leftJoin(customer, eq(customer.id, customerItem.customerId))
    .leftJoin(item, eq(item.id, customerItem.itemId))
    .where(
      and(
        eq(customerItem.organizationId, organizationId),
        eq(customerItem.customerId, customerId),
        sql`lower(${customerItem.customerPartNumber}) = lower(${customerPartNumber})`,
        eq(customerItem.scope, scope),
        excludeId ? sql`${customerItem.id} <> ${excludeId}` : undefined,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Müşteri ürününün revision eşleştirmeleri. */
export async function listCustomerItemRevisions(
  organizationId: string,
  customerItemId: string,
): Promise<CustomerItemRevisionRecord[]> {
  return db
    .select({
      id: customerItemRevision.id,
      customerItemId: customerItemRevision.customerItemId,
      customerRevision: customerItemRevision.customerRevision,
      internalItemRevisionId: customerItemRevision.internalItemRevisionId,
      internalRevision: itemRevision.revision,
      drawingReference: customerItemRevision.drawingReference,
      drawingRevision: customerItemRevision.drawingRevision,
      description: customerItemRevision.description,
      status: customerItemRevision.status,
      effectiveFrom: customerItemRevision.effectiveFrom,
      createdAt: customerItemRevision.createdAt,
      updatedAt: customerItemRevision.updatedAt,
    })
    .from(customerItemRevision)
    .leftJoin(itemRevision, eq(itemRevision.id, customerItemRevision.internalItemRevisionId))
    .where(
      and(
        eq(customerItemRevision.organizationId, organizationId),
        eq(customerItemRevision.customerItemId, customerItemId),
      ),
    )
    .orderBy(asc(customerItemRevision.createdAt));
}

/** Tek müşteri revision eşleştirmesi. */
export async function getCustomerItemRevision(
  organizationId: string,
  revisionId: string,
): Promise<CustomerItemRevisionRecord | null> {
  const rows = await db
    .select({
      id: customerItemRevision.id,
      customerItemId: customerItemRevision.customerItemId,
      customerRevision: customerItemRevision.customerRevision,
      internalItemRevisionId: customerItemRevision.internalItemRevisionId,
      internalRevision: itemRevision.revision,
      drawingReference: customerItemRevision.drawingReference,
      drawingRevision: customerItemRevision.drawingRevision,
      description: customerItemRevision.description,
      status: customerItemRevision.status,
      effectiveFrom: customerItemRevision.effectiveFrom,
      createdAt: customerItemRevision.createdAt,
      updatedAt: customerItemRevision.updatedAt,
    })
    .from(customerItemRevision)
    .leftJoin(itemRevision, eq(itemRevision.id, customerItemRevision.internalItemRevisionId))
    .where(
      and(
        eq(customerItemRevision.organizationId, organizationId),
        eq(customerItemRevision.id, revisionId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Müşteri revision değeri müşteri ürünü içinde unique'tir. */
export async function findCustomerItemRevisionByValue(
  organizationId: string,
  customerItemId: string,
  customerRevision: string,
  excludeId?: string,
): Promise<CustomerItemRevisionRecord | null> {
  const rows = await db
    .select({
      id: customerItemRevision.id,
      customerItemId: customerItemRevision.customerItemId,
      customerRevision: customerItemRevision.customerRevision,
      internalItemRevisionId: customerItemRevision.internalItemRevisionId,
      internalRevision: itemRevision.revision,
      drawingReference: customerItemRevision.drawingReference,
      drawingRevision: customerItemRevision.drawingRevision,
      description: customerItemRevision.description,
      status: customerItemRevision.status,
      effectiveFrom: customerItemRevision.effectiveFrom,
      createdAt: customerItemRevision.createdAt,
      updatedAt: customerItemRevision.updatedAt,
    })
    .from(customerItemRevision)
    .leftJoin(itemRevision, eq(itemRevision.id, customerItemRevision.internalItemRevisionId))
    .where(
      and(
        eq(customerItemRevision.organizationId, organizationId),
        eq(customerItemRevision.customerItemId, customerItemId),
        eq(customerItemRevision.customerRevision, customerRevision),
        excludeId ? sql`${customerItemRevision.id} <> ${excludeId}` : undefined,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
