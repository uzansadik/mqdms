import { db } from "@mqdms/db";
import { item, itemGroup } from "@mqdms/db/schema";
import { and, asc, count, eq, ilike, isNull, or, type SQL, sql } from "drizzle-orm";

/**
 * Ürün grubu okuma katmanı.
 *
 * Gruplar hiyerarşiktir; döngüsel ilişkilerin engellenmesi için bir
 * grubun tüm soyunu gezmek gerekir (bkz. `listDescendantGroupIds`).
 */

export type ItemGroupListQuery = {
  /** Sorgunun kapsandığı organizasyon. */
  organizationId: string;

  /** Kod veya ad üzerinde serbest arama. */
  query?: string;

  /** Durum filtresi; `ALL` filtre uygulamaz. */
  status?: "ACTIVE" | "INACTIVE" | "ALL";

  /** Arşivlenen kayıtlar listelenir mi? */
  archived?: boolean;

  page: number;
  pageSize: number;
};

export type ItemGroupListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  status: "ACTIVE" | "INACTIVE";
  itemCount: number;
  childGroupCount: number;
  archivedAt: Date | null;
};

export type ItemGroupRecord = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

/** Ürün grubu filtresini SQL koşullarına çevirir. */
function itemGroupFilters(query: ItemGroupListQuery): SQL[] {
  const conditions: SQL[] = [eq(itemGroup.organizationId, query.organizationId)];

  if (query.archived) {
    conditions.push(sql`${itemGroup.archivedAt} is not null`);
  } else {
    conditions.push(isNull(itemGroup.archivedAt));
  }

  if (query.status && query.status !== "ALL") {
    conditions.push(eq(itemGroup.status, query.status));
  }

  if (query.query) {
    const pattern = `%${query.query.trim()}%`;

    const search = or(ilike(itemGroup.code, pattern), ilike(itemGroup.name, pattern));

    if (search) {
      conditions.push(search);
    }
  }

  return conditions;
}

/** Ürün grupları listesi. */
export async function listItemGroups(query: ItemGroupListQuery): Promise<ItemGroupListItem[]> {
  const rows = await db
    .select({
      id: itemGroup.id,
      code: itemGroup.code,
      name: itemGroup.name,
      description: itemGroup.description,
      parentId: itemGroup.parentId,
      sortOrder: itemGroup.sortOrder,
      status: itemGroup.status,
      archivedAt: itemGroup.archivedAt,

      /* Gruba atanmış ürün sayısı. */
      itemCount: sql<number>`(
        select count(*)::int from ${item}
        where ${item.itemGroupId} = ${itemGroup.id}
          and ${item.archivedAt} is null
      )`,

      /* Doğrudan alt grup sayısı. */
      childGroupCount: sql<number>`(
        select count(*)::int from ${itemGroup} as child
        where child."parent_id" = ${itemGroup.id}
          and child."archived_at" is null
      )`,
    })
    .from(itemGroup)
    .where(and(...itemGroupFilters(query)))
    .orderBy(asc(itemGroup.sortOrder), asc(itemGroup.name))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return rows;
}

/** Ürün grubu listesi için toplam kayıt sayısı. */
export async function countItemGroups(query: ItemGroupListQuery): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(itemGroup)
    .where(and(...itemGroupFilters(query)));

  return rows[0]?.value ?? 0;
}

/** Tek ürün grubu kaydı. */
export async function getItemGroup(
  organizationId: string,
  groupId: string,
): Promise<ItemGroupRecord | null> {
  const rows = await db
    .select({
      id: itemGroup.id,
      organizationId: itemGroup.organizationId,
      code: itemGroup.code,
      name: itemGroup.name,
      description: itemGroup.description,
      parentId: itemGroup.parentId,
      sortOrder: itemGroup.sortOrder,
      status: itemGroup.status,
      createdAt: itemGroup.createdAt,
      updatedAt: itemGroup.updatedAt,
      archivedAt: itemGroup.archivedAt,
    })
    .from(itemGroup)
    .where(and(eq(itemGroup.organizationId, organizationId), eq(itemGroup.id, groupId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Ürün grubu kodu organizasyon içinde unique'tir. */
export async function findItemGroupByCode(
  organizationId: string,
  code: string,
  excludeId?: string,
): Promise<ItemGroupRecord | null> {
  const rows = await db
    .select({
      id: itemGroup.id,
      organizationId: itemGroup.organizationId,
      code: itemGroup.code,
      name: itemGroup.name,
      description: itemGroup.description,
      parentId: itemGroup.parentId,
      sortOrder: itemGroup.sortOrder,
      status: itemGroup.status,
      createdAt: itemGroup.createdAt,
      updatedAt: itemGroup.updatedAt,
      archivedAt: itemGroup.archivedAt,
    })
    .from(itemGroup)
    .where(
      and(
        eq(itemGroup.organizationId, organizationId),
        eq(itemGroup.code, code),
        excludeId ? sql`${itemGroup.id} <> ${excludeId}` : undefined,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Form seçim listesi için ürün grupları. */
export async function listItemGroupOptions(
  organizationId: string,
): Promise<{ id: string; code: string; name: string }[]> {
  return db
    .select({ id: itemGroup.id, code: itemGroup.code, name: itemGroup.name })
    .from(itemGroup)
    .where(
      and(
        eq(itemGroup.organizationId, organizationId),
        isNull(itemGroup.archivedAt),
        eq(itemGroup.status, "ACTIVE"),
      ),
    )
    .orderBy(asc(itemGroup.sortOrder), asc(itemGroup.name));
}

/**
 * Bir grubun tüm alt grupları.
 *
 * Döngüsel hiyerarşi engellemek için kullanılır: bir grubun parent'ı
 * kendisinin altında olamaz.
 */
export async function listDescendantGroupIds(
  organizationId: string,
  groupId: string,
): Promise<string[]> {
  const rows = await db
    .select({ id: itemGroup.id })
    .from(itemGroup)
    .where(
      and(eq(itemGroup.organizationId, organizationId), sql`${itemGroup.parentId} = ${groupId}`),
    );

  return rows.map((row) => row.id);
}

/**
 * Bir grubun tüm soylarının kimlikleri.
 *
 * Yukarıdan aşağı yürüyerek parent zincirini takip eder; derinlik sınırı
 * döngüsel bir veriye karşı güvenlik sağlar.
 */
export async function listAncestorGroupIds(
  organizationId: string,
  groupId: string,
  maxDepth = 32,
): Promise<string[]> {
  const ancestors: string[] = [];

  let currentId: string | null = groupId;

  for (let depth = 0; depth < maxDepth; depth += 1) {
    if (currentId === null) {
      break;
    }

    const rows = await db
      .select({ parentId: itemGroup.parentId })
      .from(itemGroup)
      .where(and(eq(itemGroup.organizationId, organizationId), eq(itemGroup.id, currentId)))
      .limit(1);

    /*
     * Tip açıkça belirtilir: `currentId` bu değerden geri beslendiği için
     * çıkarım döngüsel bir tipe yol açardı.
     */
    const parentId: string | null = rows[0]?.parentId ?? null;

    if (!parentId) {
      break;
    }

    ancestors.push(parentId);
    currentId = parentId;
  }

  return ancestors;
}
