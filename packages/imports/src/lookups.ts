import { db } from "@mqdms/db";
import {
  bom,
  bomLine,
  bomRevision,
  customer,
  customerItem,
  item,
  itemGroup,
  itemUnit,
} from "@mqdms/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

/**
 * Import doğrulamasının ihtiyaç duyduğu minimum referans sorguları.
 *
 * Bu sorgular yalnızca **eşleştirme** için kullanılır: dosyadaki bir kodun
 * hangi kayda karşılık geldiği bulunur. Kayıtların ayrıntılı listesi iş
 * uygulamasının kendi repository katmanında kalır.
 *
 * Sorgular `organizationId` ile kısıtlanır: başka organizasyona ait kayıt
 * eşleştirilemez.
 */

/** Kodu eşleşen ürün. */
export async function findItemByCode(
  organizationId: string,
  code: string,
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: item.id })
    .from(item)
    .where(
      and(
        eq(item.organizationId, organizationId),
        sql`lower(${item.code}) = lower(${code})`,
        isNull(item.archivedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Kodu eşleşen ürün grubu. */
export async function findItemGroupByCode(
  organizationId: string,
  code: string,
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: itemGroup.id })
    .from(itemGroup)
    .where(
      and(
        eq(itemGroup.organizationId, organizationId),
        eq(itemGroup.code, code),
        isNull(itemGroup.archivedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Kodu eşleşen birim. */
export async function findUnitByCode(
  organizationId: string,
  code: string,
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: itemUnit.id })
    .from(itemUnit)
    .where(
      and(
        eq(itemUnit.organizationId, organizationId),
        eq(itemUnit.code, code),
        isNull(itemUnit.archivedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Kodu eşleşen müşteri. */
export async function findCustomerByCode(
  organizationId: string,
  code: string,
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: customer.id })
    .from(customer)
    .where(
      and(
        eq(customer.organizationId, organizationId),
        eq(customer.code, code),
        isNull(customer.archivedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Müşteri parça numarası eşleşen müşteri ürünü. */
export async function findCustomerItemByPartNumber(
  organizationId: string,
  customerId: string,
  customerPartNumber: string,
  scope: string,
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: customerItem.id })
    .from(customerItem)
    .where(
      and(
        eq(customerItem.organizationId, organizationId),
        eq(customerItem.customerId, customerId),
        eq(customerItem.customerPartNumber, customerPartNumber),
        eq(customerItem.scope, scope),
        isNull(customerItem.archivedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Bir ürüne ait BOM'lar. */
export async function listBomsByItem(
  organizationId: string,
  itemId: string,
): Promise<{ id: string; code: string }[]> {
  return db
    .select({ id: bom.id, code: bom.code })
    .from(bom)
    .where(
      and(eq(bom.organizationId, organizationId), eq(bom.itemId, itemId), isNull(bom.archivedAt)),
    );
}

/** Revision değeri eşleşen BOM revision'ı. */
export async function findBomRevisionByValue(
  organizationId: string,
  bomId: string,
  revision: string,
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: bomRevision.id })
    .from(bomRevision)
    .where(
      and(
        eq(bomRevision.organizationId, organizationId),
        eq(bomRevision.bomId, bomId),
        eq(bomRevision.revision, revision),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Satır numarası eşleşen BOM satırı. */
export async function findBomLineByNumber(
  organizationId: string,
  bomRevisionId: string,
  lineNumber: number,
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: bomLine.id })
    .from(bomLine)
    .where(
      and(
        eq(bomLine.organizationId, organizationId),
        eq(bomLine.bomRevisionId, bomRevisionId),
        eq(bomLine.lineNumber, lineNumber),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
