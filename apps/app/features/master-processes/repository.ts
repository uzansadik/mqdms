import { db } from "@mqdms/db";
import { process, processVariant } from "@mqdms/db/schema";
import { and, asc, count, eq, ilike, isNull, or, type SQL, sql } from "drizzle-orm";

import type { ProcessCategory } from "./schema";

/**
 * Master Process okuma katmanı.
 *
 * Bütün sorgular `organizationId` ile kısıtlanır; istemciden gelen
 * organizasyon kimliğine güvenilmez.
 */

/** Liste sorgusu. */
export type ProcessListQuery = {
  /** Sorgunun kapsandığı organizasyon. */
  organizationId: string;

  /** Kod veya ad üzerinde serbest arama. */
  query?: string;

  /** Kategori filtresi. */
  category?: ProcessCategory;

  /** Durum filtresi; `ALL` filtre uygulamaz. */
  status?: "ACTIVE" | "INACTIVE" | "ALL";

  /** Arşivlenen kayıtlar listelenir mi? */
  archived?: boolean;

  page: number;
  pageSize: number;
};

/** Liste satırı. */
export type ProcessListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: ProcessCategory;
  status: "ACTIVE" | "INACTIVE";
  /** Varyant sayısı; arşivlenen varyantlar dahil edilmez. */
  variantCount: number;
  updatedAt: Date;
  archivedAt: Date | null;
};

/** Tek kayıt. */
export type ProcessRecord = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  category: ProcessCategory;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

/** Filtreleri SQL koşullarına çevirir. */
function processFilters(query: ProcessListQuery): SQL[] {
  const conditions: SQL[] = [eq(process.organizationId, query.organizationId)];

  if (query.archived) {
    conditions.push(sql`${process.archivedAt} is not null`);
  } else {
    conditions.push(isNull(process.archivedAt));
  }

  if (query.query) {
    const pattern = `%${query.query}%`;

    conditions.push(or(ilike(process.code, pattern), ilike(process.name, pattern))!);
  }

  if (query.category) {
    conditions.push(eq(process.category, query.category));
  }

  if (query.status === "ACTIVE" || query.status === "INACTIVE") {
    conditions.push(eq(process.status, query.status));
  }

  return conditions;
}

/** Master Process listesi (sayfalı). */
export async function listProcesses(query: ProcessListQuery): Promise<ProcessListItem[]> {
  const rows = await db
    .select({
      id: process.id,
      code: process.code,
      name: process.name,
      description: process.description,
      category: process.category,
      status: process.status,
      updatedAt: process.updatedAt,
      archivedAt: process.archivedAt,
      variantCount: count(processVariant.id),
    })
    .from(process)
    .leftJoin(processVariant, eq(processVariant.processId, process.id))
    .where(and(...processFilters(query)))
    .groupBy(process.id)
    .orderBy(asc(process.name))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return rows;
}

/** Toplam kayıt sayısı. */
export async function countProcesses(query: ProcessListQuery): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(process)
    .where(and(...processFilters(query)));

  return rows[0]?.value ?? 0;
}

/** Tek Master Process. */
export async function getProcess(
  organizationId: string,
  processId: string,
): Promise<ProcessRecord | null> {
  const rows = await db
    .select({
      id: process.id,
      organizationId: process.organizationId,
      code: process.code,
      name: process.name,
      description: process.description,
      category: process.category,
      status: process.status,
      createdAt: process.createdAt,
      updatedAt: process.updatedAt,
      archivedAt: process.archivedAt,
    })
    .from(process)
    .where(and(eq(process.organizationId, organizationId), eq(process.id, processId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Kodu eşleşen Master Process. */
export async function findProcessByCode(
  organizationId: string,
  code: string,
  excludeId?: string,
): Promise<ProcessRecord | null> {
  const rows = await db
    .select({
      id: process.id,
      organizationId: process.organizationId,
      code: process.code,
      name: process.name,
      description: process.description,
      category: process.category,
      status: process.status,
      createdAt: process.createdAt,
      updatedAt: process.updatedAt,
      archivedAt: process.archivedAt,
    })
    .from(process)
    .where(
      and(
        eq(process.organizationId, organizationId),
        sql`lower(${process.code}) = lower(${code})`,
        excludeId ? sql`${process.id} <> ${excludeId}` : undefined,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Bir Master Process'in varyantları. */
export async function listProcessVariants(
  organizationId: string,
  processId: string,
): Promise<
  {
    id: string;
    code: string;
    name: string;
    variantType: "GENERIC" | "SPECIALIZED";
    status: "ACTIVE" | "INACTIVE";
    archivedAt: Date | null;
  }[]
> {
  return db
    .select({
      id: processVariant.id,
      code: processVariant.code,
      name: processVariant.name,
      variantType: processVariant.variantType,
      status: processVariant.status,
      archivedAt: processVariant.archivedAt,
    })
    .from(processVariant)
    .where(
      and(
        eq(processVariant.organizationId, organizationId),
        eq(processVariant.processId, processId),
        isNull(processVariant.archivedAt),
      ),
    )
    .orderBy(asc(processVariant.code));
}
