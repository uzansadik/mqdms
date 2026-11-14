import { db } from "@mqdms/db";
import { bom, bomLine, bomRevision, item, itemRevision, itemUnit } from "@mqdms/db/schema";
import { and, asc, count, eq, ilike, isNull, or, type SQL, sql } from "drizzle-orm";

/**
 * BOM okuma katmanı.
 *
 * Bütün sorgular `organizationId` ile kısıtlanır.
 */

export type BomListQuery = {
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

export type BomListItem = {
  id: string;
  code: string;
  name: string;
  itemId: string;
  itemCode: string | null;
  itemName: string | null;
  bomType: "MANUFACTURING" | "ENGINEERING" | "OTHER";
  status: "ACTIVE" | "INACTIVE";
  revisionCount: number;
  currentRevision: string | null;
  archivedAt: Date | null;
};

export type BomRecord = {
  id: string;
  organizationId: string;
  itemId: string;
  code: string;
  name: string;
  description: string | null;
  bomType: "MANUFACTURING" | "ENGINEERING" | "OTHER";
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

export type BomRevisionRecord = {
  id: string;
  bomId: string;
  revision: string;
  description: string | null;
  changeReason: string | null;
  status: "DRAFT" | "IN_REVIEW" | "RELEASED" | "SUPERSEDED";
  effectiveFrom: string | null;
  sourceSystem: string | null;
  sourceRevision: string | null;
  parentItemRevisionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  releasedAt: Date | null;
};

export type BomLineRecord = {
  id: string;
  bomRevisionId: string;
  childItemId: string;
  childItemCode: string | null;
  childItemName: string | null;
  childItemRevisionId: string | null;
  childItemRevision: string | null;
  childBomRevisionId: string | null;
  lineNumber: number;
  quantity: number;
  unitOfMeasureId: string | null;
  unitOfMeasureCode: string | null;
  description: string | null;
  referenceDesignation: string | null;
  joiningMethod: "BONDING" | "BOLTING" | "WELDING" | "RIVETING" | "OTHER" | null;
  notes: string | null;
  positionReference: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** BOM filtresini SQL koşullarına çevirir. */
function bomFilters(query: BomListQuery): SQL[] {
  const conditions: SQL[] = [eq(bom.organizationId, query.organizationId)];

  if (query.archived) {
    conditions.push(sql`${bom.archivedAt} is not null`);
  } else {
    conditions.push(isNull(bom.archivedAt));
  }

  if (query.status && query.status !== "ALL") {
    conditions.push(eq(bom.status, query.status));
  }

  if (query.query) {
    const pattern = `%${query.query.trim()}%`;

    const search = or(ilike(bom.code, pattern), ilike(bom.name, pattern));

    if (search) {
      conditions.push(search);
    }
  }

  return conditions;
}

/** BOM listesi. */
export async function listBoms(query: BomListQuery): Promise<BomListItem[]> {
  const rows = await db
    .select({
      id: bom.id,
      code: bom.code,
      name: bom.name,
      itemId: bom.itemId,
      itemCode: item.code,
      itemName: item.name,
      bomType: bom.bomType,
      status: bom.status,
      archivedAt: bom.archivedAt,

      revisionCount: sql<number>`(
        select count(*)::int from ${bomRevision}
        where ${bomRevision.bomId} = ${bom.id}
      )`,

      currentRevision: sql<string | null>`(
        select ${bomRevision.revision} from ${bomRevision}
        where ${bomRevision.bomId} = ${bom.id}
        order by ${bomRevision.createdAt} desc
        limit 1
      )`,
    })
    .from(bom)
    .leftJoin(item, eq(item.id, bom.itemId))
    .where(and(...bomFilters(query)))
    .orderBy(asc(bom.name))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return rows;
}

/** BOM listesi için toplam kayıt sayısı. */
export async function countBoms(query: BomListQuery): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(bom)
    .where(and(...bomFilters(query)));

  return rows[0]?.value ?? 0;
}

/** Tek BOM kaydı. */
export async function getBom(organizationId: string, bomId: string): Promise<BomRecord | null> {
  const rows = await db
    .select({
      id: bom.id,
      organizationId: bom.organizationId,
      itemId: bom.itemId,
      code: bom.code,
      name: bom.name,
      description: bom.description,
      bomType: bom.bomType,
      status: bom.status,
      createdAt: bom.createdAt,
      updatedAt: bom.updatedAt,
      archivedAt: bom.archivedAt,
    })
    .from(bom)
    .where(and(eq(bom.organizationId, organizationId), eq(bom.id, bomId)))
    .limit(1);

  return rows[0] ?? null;
}

/** BOM kodu organizasyon içinde unique'tir. */
export async function findBomByCode(
  organizationId: string,
  code: string,
  excludeId?: string,
): Promise<BomRecord | null> {
  const rows = await db
    .select({
      id: bom.id,
      organizationId: bom.organizationId,
      itemId: bom.itemId,
      code: bom.code,
      name: bom.name,
      description: bom.description,
      bomType: bom.bomType,
      status: bom.status,
      createdAt: bom.createdAt,
      updatedAt: bom.updatedAt,
      archivedAt: bom.archivedAt,
    })
    .from(bom)
    .where(
      and(
        eq(bom.organizationId, organizationId),
        eq(bom.code, code),
        excludeId ? sql`${bom.id} <> ${excludeId}` : undefined,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Bir ürünün BOM'ları. */
export async function listBomsByItem(
  organizationId: string,
  itemId: string,
): Promise<{ id: string; code: string; name: string; status: "ACTIVE" | "INACTIVE" }[]> {
  return db
    .select({ id: bom.id, code: bom.code, name: bom.name, status: bom.status })
    .from(bom)
    .where(
      and(eq(bom.organizationId, organizationId), eq(bom.itemId, itemId), isNull(bom.archivedAt)),
    )
    .orderBy(asc(bom.name));
}

/** BOM revision'ları (en yeni önce). */
export async function listBomRevisions(
  organizationId: string,
  bomId: string,
): Promise<BomRevisionRecord[]> {
  return db
    .select({
      id: bomRevision.id,
      bomId: bomRevision.bomId,
      revision: bomRevision.revision,
      description: bomRevision.description,
      changeReason: bomRevision.changeReason,
      status: bomRevision.status,
      effectiveFrom: bomRevision.effectiveFrom,
      sourceSystem: bomRevision.sourceSystem,
      sourceRevision: bomRevision.sourceRevision,
      parentItemRevisionId: bomRevision.parentItemRevisionId,
      createdAt: bomRevision.createdAt,
      updatedAt: bomRevision.updatedAt,
      releasedAt: bomRevision.releasedAt,
    })
    .from(bomRevision)
    .where(and(eq(bomRevision.organizationId, organizationId), eq(bomRevision.bomId, bomId)))
    .orderBy(sql`${bomRevision.createdAt} desc`);
}

/** Tek BOM revision kaydı. */
export async function getBomRevision(
  organizationId: string,
  revisionId: string,
): Promise<BomRevisionRecord | null> {
  const rows = await db
    .select({
      id: bomRevision.id,
      bomId: bomRevision.bomId,
      revision: bomRevision.revision,
      description: bomRevision.description,
      changeReason: bomRevision.changeReason,
      status: bomRevision.status,
      effectiveFrom: bomRevision.effectiveFrom,
      sourceSystem: bomRevision.sourceSystem,
      sourceRevision: bomRevision.sourceRevision,
      parentItemRevisionId: bomRevision.parentItemRevisionId,
      createdAt: bomRevision.createdAt,
      updatedAt: bomRevision.updatedAt,
      releasedAt: bomRevision.releasedAt,
    })
    .from(bomRevision)
    .where(and(eq(bomRevision.organizationId, organizationId), eq(bomRevision.id, revisionId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Revision değeri aynı BOM altında unique'tir. */
export async function findBomRevisionByValue(
  organizationId: string,
  bomId: string,
  revision: string,
  excludeId?: string,
): Promise<BomRevisionRecord | null> {
  const rows = await db
    .select({
      id: bomRevision.id,
      bomId: bomRevision.bomId,
      revision: bomRevision.revision,
      description: bomRevision.description,
      changeReason: bomRevision.changeReason,
      status: bomRevision.status,
      effectiveFrom: bomRevision.effectiveFrom,
      sourceSystem: bomRevision.sourceSystem,
      sourceRevision: bomRevision.sourceRevision,
      parentItemRevisionId: bomRevision.parentItemRevisionId,
      createdAt: bomRevision.createdAt,
      updatedAt: bomRevision.updatedAt,
      releasedAt: bomRevision.releasedAt,
    })
    .from(bomRevision)
    .where(
      and(
        eq(bomRevision.organizationId, organizationId),
        eq(bomRevision.bomId, bomId),
        eq(bomRevision.revision, revision),
        excludeId ? sql`${bomRevision.id} <> ${excludeId}` : undefined,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Bir BOM revision'ının satırları. */
export async function listBomLines(
  organizationId: string,
  bomRevisionId: string,
): Promise<BomLineRecord[]> {
  return db
    .select({
      id: bomLine.id,
      bomRevisionId: bomLine.bomRevisionId,
      childItemId: bomLine.childItemId,
      childItemCode: item.code,
      childItemName: item.name,
      childItemRevisionId: bomLine.childItemRevisionId,
      childItemRevision: itemRevision.revision,
      childBomRevisionId: bomLine.childBomRevisionId,
      lineNumber: bomLine.lineNumber,
      quantity: bomLine.quantity,
      unitOfMeasureId: bomLine.unitOfMeasureId,
      unitOfMeasureCode: itemUnit.code,
      description: bomLine.description,
      referenceDesignation: bomLine.referenceDesignation,
      joiningMethod: bomLine.joiningMethod,
      notes: bomLine.notes,
      positionReference: bomLine.positionReference,
      createdAt: bomLine.createdAt,
      updatedAt: bomLine.updatedAt,
    })
    .from(bomLine)
    .leftJoin(item, eq(item.id, bomLine.childItemId))
    .leftJoin(itemRevision, eq(itemRevision.id, bomLine.childItemRevisionId))
    .leftJoin(itemUnit, eq(itemUnit.id, bomLine.unitOfMeasureId))
    .where(
      and(eq(bomLine.organizationId, organizationId), eq(bomLine.bomRevisionId, bomRevisionId)),
    )
    .orderBy(asc(bomLine.lineNumber));
}

/** Tek BOM satırı. */
export async function getBomLine(
  organizationId: string,
  lineId: string,
): Promise<BomLineRecord | null> {
  const rows = await db
    .select({
      id: bomLine.id,
      bomRevisionId: bomLine.bomRevisionId,
      childItemId: bomLine.childItemId,
      childItemCode: item.code,
      childItemName: item.name,
      childItemRevisionId: bomLine.childItemRevisionId,
      childItemRevision: itemRevision.revision,
      childBomRevisionId: bomLine.childBomRevisionId,
      lineNumber: bomLine.lineNumber,
      quantity: bomLine.quantity,
      unitOfMeasureId: bomLine.unitOfMeasureId,
      unitOfMeasureCode: itemUnit.code,
      description: bomLine.description,
      referenceDesignation: bomLine.referenceDesignation,
      joiningMethod: bomLine.joiningMethod,
      notes: bomLine.notes,
      positionReference: bomLine.positionReference,
      createdAt: bomLine.createdAt,
      updatedAt: bomLine.updatedAt,
    })
    .from(bomLine)
    .leftJoin(item, eq(item.id, bomLine.childItemId))
    .leftJoin(itemRevision, eq(itemRevision.id, bomLine.childItemRevisionId))
    .leftJoin(itemUnit, eq(itemUnit.id, bomLine.unitOfMeasureId))
    .where(and(eq(bomLine.organizationId, organizationId), eq(bomLine.id, lineId)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Bir ürünün içerdiği ürünler.
 *
 * Döngüsel BOM ilişkilerini denetlemek için kullanılır: bir ürün başka bir
 * ürünü dolaylı olarak içeriyorsa BOM ağacı sonsuza kadar açılır.
 */
export async function listContainedItemIds(
  organizationId: string,
  itemId: string,
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ childItemId: bomLine.childItemId })
    .from(bomLine)
    .innerJoin(bomRevision, eq(bomRevision.id, bomLine.bomRevisionId))
    .innerJoin(bom, eq(bom.id, bomRevision.bomId))
    .where(and(eq(bom.organizationId, organizationId), eq(bom.itemId, itemId)));

  return rows.map((row) => row.childItemId);
}

/**
 * Tüm BOM revision'ları (seçim listesi için).
 *
 * Satır formunda alt BOM revision'ı seçilirken hangi ürüne ait oldukları
 * görünmelidir; filtre istemcide yapılır.
 */
export async function listBomRevisionOptions(organizationId: string): Promise<
  {
    id: string;
    revision: string;
    bomId: string;
    itemId: string;
    itemCode: string | null;
    itemName: string | null;
    status: "DRAFT" | "IN_REVIEW" | "RELEASED" | "SUPERSEDED";
  }[]
> {
  return db
    .select({
      id: bomRevision.id,
      revision: bomRevision.revision,
      bomId: bomRevision.bomId,
      itemId: bom.itemId,
      itemCode: item.code,
      itemName: item.name,
      status: bomRevision.status,
    })
    .from(bomRevision)
    .innerJoin(bom, eq(bom.id, bomRevision.bomId))
    .leftJoin(item, eq(item.id, bom.itemId))
    .where(eq(bomRevision.organizationId, organizationId))
    .orderBy(asc(item.name), asc(bomRevision.revision));
}

/** BOM satırı satır numarasıyla bulunur. */
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
