import { db } from "@mqdms/db";
import { customerItem, item, itemGroup, itemRevision, itemUnit } from "@mqdms/db/schema";
import { and, asc, count, eq, ilike, isNull, or, type SQL, sql } from "drizzle-orm";

/**
 * Ürün okuma katmanı.
 *
 * Bütün sorgular `organizationId` ile kısıtlanır.
 */

export type ItemListQuery = {
  /** Sorgunun kapsandığı organizasyon. */
  organizationId: string;

  /** Kod veya ad üzerinde serbest arama. */
  query?: string;

  /** Ürün grubu filtresi. */
  itemGroupId?: string;

  /** Durum filtresi; `ALL` filtre uygulamaz. */
  status?: "ACTIVE" | "INACTIVE" | "ALL";

  /** Arşivlenen kayıtlar listelenir mi? */
  archived?: boolean;

  page: number;
  pageSize: number;
};

export type ItemListItem = {
  id: string;
  code: string;
  name: string;
  itemGroupId: string | null;
  itemGroupName: string | null;
  itemType:
    | "FINISHED_GOOD"
    | "SEMI_FINISHED"
    | "RAW_MATERIAL"
    | "COMPONENT"
    | "CONSUMABLE"
    | "OTHER";
  supplyType: "MANUFACTURED" | "PURCHASED" | "OUTSOURCED" | "MIXED" | "UNKNOWN" | null;
  unitOfMeasureCode: string | null;
  status: "ACTIVE" | "INACTIVE";
  customerReferenceCount: number;
  currentRevision: string | null;
  archivedAt: Date | null;
};

export type ItemRecord = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  itemGroupId: string | null;
  itemType:
    | "FINISHED_GOOD"
    | "SEMI_FINISHED"
    | "RAW_MATERIAL"
    | "COMPONENT"
    | "CONSUMABLE"
    | "OTHER";
  supplyType: "MANUFACTURED" | "PURCHASED" | "OUTSOURCED" | "MIXED" | "UNKNOWN" | null;
  unitOfMeasureId: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

/** Ürün filtresini SQL koşullarına çevirir. */
function itemFilters(query: ItemListQuery): SQL[] {
  const conditions: SQL[] = [eq(item.organizationId, query.organizationId)];

  if (query.archived) {
    conditions.push(sql`${item.archivedAt} is not null`);
  } else {
    conditions.push(isNull(item.archivedAt));
  }

  if (query.status && query.status !== "ALL") {
    conditions.push(eq(item.status, query.status));
  }

  if (query.itemGroupId) {
    conditions.push(eq(item.itemGroupId, query.itemGroupId));
  }

  if (query.query) {
    const pattern = `%${query.query.trim()}%`;

    const search = or(ilike(item.code, pattern), ilike(item.name, pattern));

    if (search) {
      conditions.push(search);
    }
  }

  return conditions;
}

/** Ürün listesi. */
export async function listItems(query: ItemListQuery): Promise<ItemListItem[]> {
  const rows = await db
    .select({
      id: item.id,
      code: item.code,
      name: item.name,
      itemGroupId: item.itemGroupId,
      itemGroupName: itemGroup.name,
      itemType: item.itemType,
      supplyType: item.supplyType,
      unitOfMeasureCode: itemUnit.code,
      status: item.status,
      archivedAt: item.archivedAt,

      /* Müşteri parça numarası referansı sayısı. */
      customerReferenceCount: sql<number>`(
        select count(*)::int from ${customerItem}
        where ${customerItem.itemId} = ${item.id}
          and ${customerItem.archivedAt} is null
      )`,

      /* En son revision; yoksa null. */
      currentRevision: sql<string | null>`(
        select ${itemRevision.revision} from ${itemRevision}
        where ${itemRevision.itemId} = ${item.id}
        order by ${itemRevision.createdAt} desc
        limit 1
      )`,
    })
    .from(item)
    .leftJoin(itemGroup, eq(itemGroup.id, item.itemGroupId))
    .leftJoin(itemUnit, eq(itemUnit.id, item.unitOfMeasureId))
    .where(and(...itemFilters(query)))
    .orderBy(asc(item.name))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return rows;
}

/** Ürün listesi için toplam kayıt sayısı. */
export async function countItems(query: ItemListQuery): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(item)
    .where(and(...itemFilters(query)));

  return rows[0]?.value ?? 0;
}

/** Tek ürün kaydı. */
export async function getItem(organizationId: string, itemId: string): Promise<ItemRecord | null> {
  const rows = await db
    .select({
      id: item.id,
      organizationId: item.organizationId,
      code: item.code,
      name: item.name,
      description: item.description,
      itemGroupId: item.itemGroupId,
      itemType: item.itemType,
      supplyType: item.supplyType,
      unitOfMeasureId: item.unitOfMeasureId,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      archivedAt: item.archivedAt,
    })
    .from(item)
    .where(and(eq(item.organizationId, organizationId), eq(item.id, itemId)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Ürün kodu organizasyon içinde unique'tir.
 *
 * Karşılaştırma büyük/küçük harf duyarsızdır; kod birebir saklanır.
 */
export async function findItemByCode(
  organizationId: string,
  code: string,
  excludeId?: string,
): Promise<ItemRecord | null> {
  const rows = await db
    .select({
      id: item.id,
      organizationId: item.organizationId,
      code: item.code,
      name: item.name,
      description: item.description,
      itemGroupId: item.itemGroupId,
      itemType: item.itemType,
      supplyType: item.supplyType,
      unitOfMeasureId: item.unitOfMeasureId,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      archivedAt: item.archivedAt,
    })
    .from(item)
    .where(
      and(
        eq(item.organizationId, organizationId),
        sql`lower(${item.code}) = lower(${code})`,
        excludeId ? sql`${item.id} <> ${excludeId}` : undefined,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Form seçim listesi için ürünler. */
export async function listItemOptions(
  organizationId: string,
): Promise<{ id: string; code: string; name: string }[]> {
  return db
    .select({ id: item.id, code: item.code, name: item.name })
    .from(item)
    .where(
      and(
        eq(item.organizationId, organizationId),
        isNull(item.archivedAt),
        eq(item.status, "ACTIVE"),
      ),
    )
    .orderBy(asc(item.name));
}

/** Ürünün revision kayıtları (en yeni önce). */
export async function listItemRevisions(
  organizationId: string,
  itemId: string,
): Promise<
  {
    id: string;
    revision: string;
    status: "DRAFT" | "RELEASED" | "SUPERSEDED";
    description: string | null;
    changeReason: string | null;
    createdAt: Date;
    releasedAt: Date | null;
  }[]
> {
  return db
    .select({
      id: itemRevision.id,
      revision: itemRevision.revision,
      status: itemRevision.status,
      description: itemRevision.description,
      changeReason: itemRevision.changeReason,
      createdAt: itemRevision.createdAt,
      releasedAt: itemRevision.releasedAt,
    })
    .from(itemRevision)
    .where(and(eq(itemRevision.organizationId, organizationId), eq(itemRevision.itemId, itemId)))
    .orderBy(sql`${itemRevision.createdAt} desc`);
}
