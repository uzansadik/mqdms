import { db } from "@mqdms/db";
import {
  customer,
  customerSite,
  member,
  plant,
  project,
  projectMember,
  projectPlant,
  user,
} from "@mqdms/db/schema";
import { and, asc, count, eq, ilike, isNull, or, type SQL, sql } from "drizzle-orm";

/**
 * Proje okuma katmanı.
 *
 * Bütün sorgular `organizationId` ile kısıtlanır.
 */

export type ProjectListQuery = {
  /** Sorgunun kapsandığı organizasyon. */
  organizationId: string;

  /** Kod veya ad üzerinde serbest arama. */
  query?: string;

  /** Durum filtresi; `ALL` filtre uygulamaz. */
  status?: "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | "ALL";

  /** Arşivlenen kayıtlar listelenir mi? */
  archived?: boolean;

  page: number;
  pageSize: number;
};

export type ProjectListItem = {
  id: string;
  code: string;
  name: string;
  customerName: string | null;
  status: "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  archivedAt: Date | null;
};

export type ProjectRecord = {
  id: string;
  organizationId: string;
  customerId: string;
  customerSiteId: string | null;
  code: string;
  name: string;
  customerProjectCode: string | null;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  projectManagerMemberId: string | null;
  startDate: string | null;
  targetCompletionDate: string | null;
  actualCompletionDate: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

export type ProjectPlantRecord = {
  id: string;
  plantId: string;
  plantCode: string;
  plantName: string;
  isPrimary: boolean;
};

export type ProjectMemberRecord = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  projectRole:
    | "PROJECT_MANAGER"
    | "PROJECT_ENGINEER"
    | "QUALITY_MANAGER"
    | "QUALITY_ENGINEER"
    | "PROCESS_ENGINEER"
    | "PRODUCTION_RESPONSIBLE"
    | "OTHER";
  responsibility: string | null;
  joinedAt: Date;
  removedAt: Date | null;
};

/** Proje filtresini SQL koşullarına çevirir. */
function projectFilters(query: ProjectListQuery): SQL[] {
  const conditions: SQL[] = [eq(project.organizationId, query.organizationId)];

  if (query.archived) {
    conditions.push(sql`${project.archivedAt} is not null`);
  } else {
    conditions.push(isNull(project.archivedAt));
  }

  if (query.status && query.status !== "ALL") {
    conditions.push(eq(project.status, query.status));
  }

  if (query.query) {
    const pattern = `%${query.query.trim()}%`;

    const search = or(ilike(project.code, pattern), ilike(project.name, pattern));

    if (search) {
      conditions.push(search);
    }
  }

  return conditions;
}

/** Proje listesi. */
export async function listProjects(query: ProjectListQuery): Promise<ProjectListItem[]> {
  const rows = await db
    .select({
      id: project.id,
      code: project.code,
      name: project.name,
      customerName: customer.name,
      status: project.status,
      archivedAt: project.archivedAt,
    })
    .from(project)
    .leftJoin(customer, eq(customer.id, project.customerId))
    .where(and(...projectFilters(query)))
    .orderBy(asc(project.name))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return rows;
}

/** Proje listesi için toplam kayıt sayısı. */
export async function countProjects(query: ProjectListQuery): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(project)
    .where(and(...projectFilters(query)));

  return rows[0]?.value ?? 0;
}

/** Tek proje kaydı. */
export async function getProject(
  organizationId: string,
  projectId: string,
): Promise<ProjectRecord | null> {
  const rows = await db
    .select({
      id: project.id,
      organizationId: project.organizationId,
      customerId: project.customerId,
      customerSiteId: project.customerSiteId,
      code: project.code,
      name: project.name,
      customerProjectCode: project.customerProjectCode,
      description: project.description,
      status: project.status,
      projectManagerMemberId: project.projectManagerMemberId,
      startDate: project.startDate,
      targetCompletionDate: project.targetCompletionDate,
      actualCompletionDate: project.actualCompletionDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      archivedAt: project.archivedAt,
    })
    .from(project)
    .where(and(eq(project.organizationId, organizationId), eq(project.id, projectId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Proje kodu organizasyon içinde unique olmalıdır. */
export async function findProjectByCode(
  organizationId: string,
  code: string,
  excludeId?: string,
): Promise<ProjectRecord | null> {
  const rows = await db
    .select({
      id: project.id,
      organizationId: project.organizationId,
      customerId: project.customerId,
      customerSiteId: project.customerSiteId,
      code: project.code,
      name: project.name,
      customerProjectCode: project.customerProjectCode,
      description: project.description,
      status: project.status,
      projectManagerMemberId: project.projectManagerMemberId,
      startDate: project.startDate,
      targetCompletionDate: project.targetCompletionDate,
      actualCompletionDate: project.actualCompletionDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      archivedAt: project.archivedAt,
    })
    .from(project)
    .where(
      and(
        eq(project.organizationId, organizationId),
        eq(project.code, code),
        excludeId ? sql`${project.id} <> ${excludeId}` : undefined,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Projenin bağlı tesisleri. */
export async function listProjectPlants(
  organizationId: string,
  projectId: string,
): Promise<ProjectPlantRecord[]> {
  return db
    .select({
      id: projectPlant.id,
      plantId: projectPlant.plantId,
      plantCode: plant.code,
      plantName: plant.name,
      isPrimary: projectPlant.isPrimary,
    })
    .from(projectPlant)
    .innerJoin(plant, eq(plant.id, projectPlant.plantId))
    .where(
      and(eq(projectPlant.organizationId, organizationId), eq(projectPlant.projectId, projectId)),
    )
    .orderBy(asc(plant.name));
}

/** Projenin ekip üyeleri (aktif olanlar). */
export async function listProjectMembers(
  organizationId: string,
  projectId: string,
): Promise<ProjectMemberRecord[]> {
  return db
    .select({
      id: projectMember.id,
      memberId: projectMember.memberId,
      memberName: user.name,
      memberEmail: user.email,
      projectRole: projectMember.projectRole,
      responsibility: projectMember.responsibility,
      joinedAt: projectMember.joinedAt,
      removedAt: projectMember.removedAt,
    })
    .from(projectMember)
    .innerJoin(member, eq(member.id, projectMember.memberId))
    .innerJoin(user, eq(user.id, member.userId))
    .where(
      and(
        eq(projectMember.organizationId, organizationId),
        eq(projectMember.projectId, projectId),
        isNull(projectMember.removedAt),
      ),
    )
    .orderBy(asc(user.name));
}

/** Projeye atanmış bir tesis var mı? */
export async function findProjectPlant(
  organizationId: string,
  projectId: string,
  plantId: string,
): Promise<{ id: string; isPrimary: boolean } | null> {
  const rows = await db
    .select({ id: projectPlant.id, isPrimary: projectPlant.isPrimary })
    .from(projectPlant)
    .where(
      and(
        eq(projectPlant.organizationId, organizationId),
        eq(projectPlant.projectId, projectId),
        eq(projectPlant.plantId, plantId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Projenin primary tesisi var mı? */
export async function findPrimaryProjectPlant(
  organizationId: string,
  projectId: string,
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: projectPlant.id })
    .from(projectPlant)
    .where(
      and(
        eq(projectPlant.organizationId, organizationId),
        eq(projectPlant.projectId, projectId),
        eq(projectPlant.isPrimary, true),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Projeye aktif üye olarak eklenmiş mi? */
export async function findActiveProjectMember(
  organizationId: string,
  projectId: string,
  memberId: string,
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: projectMember.id })
    .from(projectMember)
    .where(
      and(
        eq(projectMember.organizationId, organizationId),
        eq(projectMember.projectId, projectId),
        eq(projectMember.memberId, memberId),
        isNull(projectMember.removedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Üye organizasyona ait mi?
 *
 * Proje müdürü ve proje ekibi üyeleri organizasyonun aktif üyeleri olmalıdır.
 */
export async function findMemberInOrganization(
  organizationId: string,
  memberId: string,
): Promise<{ id: string; userId: string; name: string; email: string } | null> {
  const rows = await db
    .select({
      id: member.id,
      userId: member.userId,
      name: user.name,
      email: user.email,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(and(eq(member.organizationId, organizationId), eq(member.id, memberId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Projenin müşteri siteleri (form seçimi için). */
export async function listCustomerSitesForProject(
  organizationId: string,
  customerId: string,
): Promise<{ id: string; code: string; name: string }[]> {
  return db
    .select({ id: customerSite.id, code: customerSite.code, name: customerSite.name })
    .from(customerSite)
    .where(
      and(
        eq(customerSite.organizationId, organizationId),
        eq(customerSite.customerId, customerId),
        isNull(customerSite.archivedAt),
      ),
    )
    .orderBy(asc(customerSite.name));
}
