import { db } from "@mqdms/db";
import { itemUnit } from "@mqdms/db/schema";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

/**
 * Birim okuma katmanı.
 *
 * Birimler organizasyona özeldir ve yönetilebilir: ERP'den gelen birim
 * kodları mQDMS birimlerine eşleştirilir.
 */

export type UnitRecord = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  dimension: "MASS" | "LENGTH" | "AREA" | "VOLUME" | "COUNT" | "OTHER";
  decimalPlaces: number;
  conversionFactor: number | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

/** Tüm birimler (arşivlenmemiş). */
export async function listUnits(organizationId: string): Promise<UnitRecord[]> {
  return db
    .select({
      id: itemUnit.id,
      organizationId: itemUnit.organizationId,
      code: itemUnit.code,
      name: itemUnit.name,
      dimension: itemUnit.dimension,
      decimalPlaces: itemUnit.decimalPlaces,
      conversionFactor: itemUnit.conversionFactor,
      status: itemUnit.status,
      createdAt: itemUnit.createdAt,
      updatedAt: itemUnit.updatedAt,
      archivedAt: itemUnit.archivedAt,
    })
    .from(itemUnit)
    .where(and(eq(itemUnit.organizationId, organizationId), isNull(itemUnit.archivedAt)))
    .orderBy(asc(itemUnit.dimension), asc(itemUnit.code));
}

/** Form seçim listesi için etkin birimler. */
export async function listUnitOptions(
  organizationId: string,
): Promise<{ id: string; code: string; name: string }[]> {
  return db
    .select({ id: itemUnit.id, code: itemUnit.code, name: itemUnit.name })
    .from(itemUnit)
    .where(
      and(
        eq(itemUnit.organizationId, organizationId),
        isNull(itemUnit.archivedAt),
        eq(itemUnit.status, "ACTIVE"),
      ),
    )
    .orderBy(asc(itemUnit.code));
}

/** Tek birim kaydı. */
export async function getUnit(organizationId: string, unitId: string): Promise<UnitRecord | null> {
  const rows = await db
    .select({
      id: itemUnit.id,
      organizationId: itemUnit.organizationId,
      code: itemUnit.code,
      name: itemUnit.name,
      dimension: itemUnit.dimension,
      decimalPlaces: itemUnit.decimalPlaces,
      conversionFactor: itemUnit.conversionFactor,
      status: itemUnit.status,
      createdAt: itemUnit.createdAt,
      updatedAt: itemUnit.updatedAt,
      archivedAt: itemUnit.archivedAt,
    })
    .from(itemUnit)
    .where(and(eq(itemUnit.organizationId, organizationId), eq(itemUnit.id, unitId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Birim kodu organizasyon içinde unique'tir. */
export async function findUnitByCode(
  organizationId: string,
  code: string,
): Promise<UnitRecord | null> {
  const rows = await db
    .select({
      id: itemUnit.id,
      organizationId: itemUnit.organizationId,
      code: itemUnit.code,
      name: itemUnit.name,
      dimension: itemUnit.dimension,
      decimalPlaces: itemUnit.decimalPlaces,
      conversionFactor: itemUnit.conversionFactor,
      status: itemUnit.status,
      createdAt: itemUnit.createdAt,
      updatedAt: itemUnit.updatedAt,
      archivedAt: itemUnit.archivedAt,
    })
    .from(itemUnit)
    .where(and(eq(itemUnit.organizationId, organizationId), eq(itemUnit.code, code)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Bir boyutun taban birimi.
 *
 * Taban birim `conversion_factor` değeri boş olan birimdir. Bir boyutta taban
 * birim yoksa dönüşüm yapılamaz.
 */
export async function findDimensionBaseUnit(
  organizationId: string,
  dimension: UnitRecord["dimension"],
): Promise<UnitRecord | null> {
  const rows = await db
    .select({
      id: itemUnit.id,
      organizationId: itemUnit.organizationId,
      code: itemUnit.code,
      name: itemUnit.name,
      dimension: itemUnit.dimension,
      decimalPlaces: itemUnit.decimalPlaces,
      conversionFactor: itemUnit.conversionFactor,
      status: itemUnit.status,
      createdAt: itemUnit.createdAt,
      updatedAt: itemUnit.updatedAt,
      archivedAt: itemUnit.archivedAt,
    })
    .from(itemUnit)
    .where(
      and(
        eq(itemUnit.organizationId, organizationId),
        eq(itemUnit.dimension, dimension),
        sql`${itemUnit.conversionFactor} is null`,
        isNull(itemUnit.archivedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
