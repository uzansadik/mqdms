import { db } from "@mqdms/db";
import { plant, project, projectPlant } from "@mqdms/db/schema";
import { and, asc, count, eq, ilike, isNull, or, type SQL, sql } from "drizzle-orm";

/**
 * Tesis okuma katmanı.
 *
 * Bütün sorgular `organizationId` ile kısıtlanır.
 */

export type PlantListQuery = {
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

export type PlantListItem = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  countryCode: string | null;
  status: "ACTIVE" | "INACTIVE";
  projectCount: number;
  createdAt: Date;
  archivedAt: Date | null;
};

export type PlantRecord = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  countryCode: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  timezone: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

/** Tesis filtresini SQL koşullarına çevirir. */
function plantFilters(query: PlantListQuery): SQL[] {
  const conditions: SQL[] = [eq(plant.organizationId, query.organizationId)];

  if (query.archived) {
    conditions.push(sql`${plant.archivedAt} is not null`);
  } else {
    conditions.push(isNull(plant.archivedAt));
  }

  if (query.status && query.status !== "ALL") {
    conditions.push(eq(plant.status, query.status));
  }

  if (query.query) {
    const pattern = `%${query.query.trim()}%`;

    const search = or(ilike(plant.code, pattern), ilike(plant.name, pattern));

    if (search) {
      conditions.push(search);
    }
  }

  return conditions;
}

/** Tesis listesi. */
export async function listPlants(query: PlantListQuery): Promise<PlantListItem[]> {
  const rows = await db
    .select({
      id: plant.id,
      code: plant.code,
      name: plant.name,
      city: plant.city,
      countryCode: plant.countryCode,
      status: plant.status,
      createdAt: plant.createdAt,
      archivedAt: plant.archivedAt,

      /* Arşivlenmemiş proje sayısı. */
      projectCount: sql<number>`(
        select count(*)::int from ${projectPlant}
        where ${projectPlant.plantId} = ${plant.id}
      )`,
    })
    .from(plant)
    .where(and(...plantFilters(query)))
    .orderBy(asc(plant.name))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return rows;
}

/** Tesis listesi için toplam kayıt sayısı. */
export async function countPlants(query: PlantListQuery): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(plant)
    .where(and(...plantFilters(query)));

  return rows[0]?.value ?? 0;
}

/** Tek tesis kaydı. */
export async function getPlant(
  organizationId: string,
  plantId: string,
): Promise<PlantRecord | null> {
  const rows = await db
    .select({
      id: plant.id,
      organizationId: plant.organizationId,
      code: plant.code,
      name: plant.name,
      description: plant.description,
      countryCode: plant.countryCode,
      city: plant.city,
      address: plant.address,
      postalCode: plant.postalCode,
      timezone: plant.timezone,
      status: plant.status,
      createdAt: plant.createdAt,
      updatedAt: plant.updatedAt,
      archivedAt: plant.archivedAt,
    })
    .from(plant)
    .where(and(eq(plant.organizationId, organizationId), eq(plant.id, plantId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Tesis kodu organizasyon içinde unique olmalıdır. */
export async function findPlantByCode(
  organizationId: string,
  code: string,
  excludeId?: string,
): Promise<PlantRecord | null> {
  const rows = await db
    .select({
      id: plant.id,
      organizationId: plant.organizationId,
      code: plant.code,
      name: plant.name,
      description: plant.description,
      countryCode: plant.countryCode,
      city: plant.city,
      address: plant.address,
      postalCode: plant.postalCode,
      timezone: plant.timezone,
      status: plant.status,
      createdAt: plant.createdAt,
      updatedAt: plant.updatedAt,
      archivedAt: plant.archivedAt,
    })
    .from(plant)
    .where(
      and(
        eq(plant.organizationId, organizationId),
        eq(plant.code, code),
        excludeId ? sql`${plant.id} <> ${excludeId}` : undefined,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Tesisin bağlı olduğu projeler (özet). */
export async function listProjectsByPlant(
  organizationId: string,
  plantId: string,
): Promise<
  {
    id: string;
    code: string;
    name: string;
    status: "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
    isPrimary: boolean;
  }[]
> {
  const rows = await db
    .select({
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      isPrimary: projectPlant.isPrimary,
    })
    .from(projectPlant)
    .innerJoin(project, eq(project.id, projectPlant.projectId))
    .where(and(eq(projectPlant.organizationId, organizationId), eq(projectPlant.plantId, plantId)));

  return rows;
}

/**
 * Tesisin aktif proje sayısı.
 *
 * Tesis arşivlenirken kontrol edilir: aktif projesi olan bir tesis
 * arşivlenemez.
 */
export async function countActiveProjectsByPlant(
  organizationId: string,
  plantId: string,
): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(projectPlant)
    .innerJoin(project, eq(project.id, projectPlant.projectId))
    .where(
      and(
        eq(projectPlant.organizationId, organizationId),
        eq(projectPlant.plantId, plantId),
        eq(project.status, "ACTIVE"),
        isNull(project.archivedAt),
      ),
    );

  return rows[0]?.value ?? 0;
}

/** Form seçim listesi için tesisler. */
export async function listPlantOptions(
  organizationId: string,
): Promise<{ id: string; code: string; name: string }[]> {
  return db
    .select({ id: plant.id, code: plant.code, name: plant.name })
    .from(plant)
    .where(
      and(
        eq(plant.organizationId, organizationId),
        isNull(plant.archivedAt),
        eq(plant.status, "ACTIVE"),
      ),
    )
    .orderBy(asc(plant.name));
}
