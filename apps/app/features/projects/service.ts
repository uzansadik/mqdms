import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import { project, projectMember, projectPlant } from "@mqdms/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { getCustomer, getCustomerSite } from "@/features/customers/repository";

import {
  findActiveProjectMember,
  findMemberInOrganization,
  findPrimaryProjectPlant,
  findProjectByCode,
  findProjectPlant,
  getProject,
  listProjectPlants,
} from "./repository";
import type { ProjectCreateValues, ProjectFormValues, ProjectRole } from "./schema";

/**
 * İş kuralı ihlali.
 *
 * Sunucu tarafı hata sınıfı: aksiyon bu hata ile dönerse form genel bir
 * hata mesajı gösterir.
 */
export class ProjectRuleError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "ProjectRuleError";
  }
}

/**
 * Yetki kontrolü.
 *
 * Servis katmanında yapılır: aksiyon, sayfa veya başka bir çağıran
 * yetkisiz bir yola ulaşsa bile kontrol kaçırılmaz.
 */
async function requireProjectPermission(context: AuthContext, action: string): Promise<void> {
  if (!(await hasPermission(context, "projects", action))) {
    throw new ProjectRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
  }
}

/** Kod normalizasyonu. */
export function normalizeProjectCode(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

/** Boş string'i `null`'a çevirir. */
function toNull(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

/** Tarihlerin mantıksal sırasını doğrular. */
function validateDates(input: {
  startDate?: string;
  targetCompletionDate?: string;
  actualCompletionDate?: string;
}): void {
  if (
    input.startDate &&
    input.targetCompletionDate &&
    input.startDate > input.targetCompletionDate
  ) {
    throw new ProjectRuleError(
      "Başlangıç tarihi hedef bitiş tarihinden sonra olamaz.",
      "INVALID_INPUT",
    );
  }

  if (
    input.startDate &&
    input.actualCompletionDate &&
    input.startDate > input.actualCompletionDate
  ) {
    throw new ProjectRuleError(
      "Gerçek bitiş tarihi başlangıç tarihinden önce olamaz.",
      "INVALID_INPUT",
    );
  }
}

/** Müşteri ve site eşleşmesini doğrular. */
async function validateCustomerAndSite(
  context: AuthContext,
  customerId: string,
  customerSiteId: string | null,
): Promise<void> {
  const target = await getCustomer(context.organizationId, customerId);

  if (!target || target.archivedAt) {
    throw new ProjectRuleError("Müşteri bulunamadı.", "NOT_FOUND");
  }

  if (!customerSiteId) {
    return;
  }

  const site = await getCustomerSite(context.organizationId, customerSiteId);

  if (!site || site.customerId !== customerId) {
    throw new ProjectRuleError("Seçilen site bu müşteriye ait değil.", "INVALID_INPUT");
  }
}

/** Proje müdürünün organizasyon üyesi olduğunu doğrular. */
async function validateProjectManager(
  context: AuthContext,
  projectManagerMemberId: string | null,
): Promise<void> {
  if (!projectManagerMemberId) {
    return;
  }

  const manager = await findMemberInOrganization(context.organizationId, projectManagerMemberId);

  if (!manager) {
    throw new ProjectRuleError("Proje müdürü organizasyonun bir üyesi olmalıdır.", "INVALID_INPUT");
  }
}

/* -------------------------------------------------------------------------
 * Proje
 * ---------------------------------------------------------------------- */

/**
 * Proje oluşturur.
 *
 * Müşteri zorunludur. `ACTIVE` durumunda bir proje için en az bir tesis
 * gerekir; oluşturma sırasında tesis seçilebilir.
 */
export async function createProject(
  context: AuthContext,
  input: ProjectCreateValues,
): Promise<string> {
  await requireProjectPermission(context, "create");

  validateDates(input);

  const code = normalizeProjectCode(input.code);

  const existing = await findProjectByCode(context.organizationId, code);

  if (existing) {
    throw new ProjectRuleError("Bu proje kodu zaten kullanılıyor.", "CONFLICT");
  }

  const customerSiteId = toNull(input.customerSiteId);
  const projectManagerMemberId = toNull(input.projectManagerMemberId);
  const primaryPlantId = toNull(input.primaryPlantId);

  await validateCustomerAndSite(context, input.customerId, customerSiteId);
  await validateProjectManager(context, projectManagerMemberId);

  if (input.status === "ACTIVE" && !primaryPlantId) {
    throw new ProjectRuleError(
      "Aktif bir proje için en az bir üretim tesisi seçilmelidir.",
      "INVALID_INPUT",
    );
  }

  const created = await db
    .insert(project)
    .values({
      organizationId: context.organizationId,
      customerId: input.customerId,
      customerSiteId,
      code,
      name: input.name.trim(),
      customerProjectCode: toNull(input.customerProjectCode),
      description: toNull(input.description),
      status: input.status,
      projectManagerMemberId,
      startDate: toNull(input.startDate),
      targetCompletionDate: toNull(input.targetCompletionDate),
      actualCompletionDate: toNull(input.actualCompletionDate),
      createdById: context.userId,
    })
    .returning({ id: project.id });

  const projectId = created[0]?.id;

  if (!projectId) {
    throw new ProjectRuleError("Proje oluşturulamadı.", "INVALID_INPUT");
  }

  if (primaryPlantId) {
    await db.insert(projectPlant).values({
      organizationId: context.organizationId,
      projectId,
      plantId: primaryPlantId,
      isPrimary: true,
    });
  }

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "project.created",
    target: { type: "project", id: projectId },
    metadata: {
      code,
      name: input.name.trim(),
      customerId: input.customerId,
      status: input.status,
    },
  });

  return projectId;
}

/** Projeyi günceller. */
export async function updateProject(
  context: AuthContext,
  projectId: string,
  input: ProjectFormValues,
): Promise<void> {
  await requireProjectPermission(context, "update");

  const target = await getProject(context.organizationId, projectId);

  if (!target) {
    throw new ProjectRuleError("Proje bulunamadı.", "NOT_FOUND");
  }

  validateDates(input);

  const code = normalizeProjectCode(input.code);

  const existing = await findProjectByCode(context.organizationId, code, projectId);

  if (existing) {
    throw new ProjectRuleError("Bu proje kodu zaten kullanılıyor.", "CONFLICT");
  }

  const customerSiteId = toNull(input.customerSiteId);
  const projectManagerMemberId = toNull(input.projectManagerMemberId);

  await validateCustomerAndSite(context, input.customerId, customerSiteId);
  await validateProjectManager(context, projectManagerMemberId);

  // `ACTIVE` durumuna geçiş için en az bir tesis gerekir.
  if (input.status === "ACTIVE" && target.status !== "ACTIVE") {
    const plants = await listProjectPlants(context.organizationId, projectId);

    if (plants.length === 0) {
      throw new ProjectRuleError(
        "Aktif bir proje için en az bir üretim tesisi atanmış olmalıdır.",
        "INVALID_INPUT",
      );
    }
  }

  await db
    .update(project)
    .set({
      customerId: input.customerId,
      customerSiteId,
      code,
      name: input.name.trim(),
      customerProjectCode: toNull(input.customerProjectCode),
      description: toNull(input.description),
      status: input.status,
      projectManagerMemberId,
      startDate: toNull(input.startDate),
      targetCompletionDate: toNull(input.targetCompletionDate),
      actualCompletionDate: toNull(input.actualCompletionDate),
    })
    .where(and(eq(project.organizationId, context.organizationId), eq(project.id, projectId)));

  if (target.status !== input.status) {
    await writeAuditLog({
      organizationId: context.organizationId,
      actorId: context.userId,
      action: "project.statusChanged",
      target: { type: "project", id: projectId },
      metadata: { from: target.status, to: input.status },
    });
  }

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "project.updated",
    target: { type: "project", id: projectId },
    metadata: { code, name: input.name.trim() },
  });
}

/**
 * Projeyi arşivler.
 *
 * İlişkili kalite kayıtları bulunan proje fiziksel olarak silinmez; arşiv
 * geri alınabilir.
 */
export async function archiveProject(context: AuthContext, projectId: string): Promise<void> {
  await requireProjectPermission(context, "archive");

  const target = await getProject(context.organizationId, projectId);

  if (!target) {
    throw new ProjectRuleError("Proje bulunamadı.", "NOT_FOUND");
  }

  if (target.archivedAt) {
    return;
  }

  await db
    .update(project)
    .set({ archivedAt: new Date() })
    .where(and(eq(project.organizationId, context.organizationId), eq(project.id, projectId)));

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "project.archived",
    target: { type: "project", id: projectId },
    metadata: { code: target.code },
  });
}

/** Projeyi arşivden çıkarır. */
export async function restoreProject(context: AuthContext, projectId: string): Promise<void> {
  await requireProjectPermission(context, "restore");

  const target = await getProject(context.organizationId, projectId);

  if (!target) {
    throw new ProjectRuleError("Proje bulunamadı.", "NOT_FOUND");
  }

  if (!target.archivedAt) {
    return;
  }

  await db
    .update(project)
    .set({ archivedAt: null })
    .where(and(eq(project.organizationId, context.organizationId), eq(project.id, projectId)));

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "project.restored",
    target: { type: "project", id: projectId },
    metadata: { code: target.code },
  });
}

/* -------------------------------------------------------------------------
 * Proje tesisleri
 * ---------------------------------------------------------------------- */

/**
 * Projeye tesis atar.
 *
 * Aynı tesis bir projeye iki kez eklenemez ve bir projenin en fazla bir
 * primary tesisi olabilir.
 */
export async function assignProjectPlant(
  context: AuthContext,
  projectId: string,
  plantId: string,
  isPrimary: boolean,
): Promise<void> {
  await requireProjectPermission(context, "update");

  const target = await getProject(context.organizationId, projectId);

  if (!target) {
    throw new ProjectRuleError("Proje bulunamadı.", "NOT_FOUND");
  }

  const existing = await findProjectPlant(context.organizationId, projectId, plantId);

  if (existing) {
    throw new ProjectRuleError("Bu tesis zaten projeye atanmış.", "CONFLICT");
  }

  if (isPrimary) {
    const primary = await findPrimaryProjectPlant(context.organizationId, projectId);

    if (primary) {
      throw new ProjectRuleError(
        "Projede zaten bir ana tesis var. Önce onu kaldırın veya ana tesisi değiştirin.",
        "CONFLICT",
      );
    }
  }

  await db.insert(projectPlant).values({
    organizationId: context.organizationId,
    projectId,
    plantId,
    isPrimary,
  });

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "project.plantAssigned",
    target: { type: "project", id: projectId },
    metadata: { plantId, isPrimary },
  });
}

/** Projeden tesisi kaldırır. */
export async function removeProjectPlant(
  context: AuthContext,
  projectId: string,
  plantId: string,
): Promise<void> {
  await requireProjectPermission(context, "update");

  const existing = await findProjectPlant(context.organizationId, projectId, plantId);

  if (!existing) {
    throw new ProjectRuleError("Bu tesis projeye atanmamış.", "NOT_FOUND");
  }

  await db
    .delete(projectPlant)
    .where(
      and(
        eq(projectPlant.organizationId, context.organizationId),
        eq(projectPlant.projectId, projectId),
        eq(projectPlant.plantId, plantId),
      ),
    );

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "project.plantRemoved",
    target: { type: "project", id: projectId },
    metadata: { plantId },
  });
}

/* -------------------------------------------------------------------------
 * Proje ekibi
 * ---------------------------------------------------------------------- */

/**
 * Proje ekibine üye ekler.
 *
 * Proje rolü merkezi kimlik doğrulama permission rolünden bağımsızdır: bir
 * üyeyi proje müdürü yapmak yeni bir auth permission vermez.
 */
export async function addProjectMember(
  context: AuthContext,
  projectId: string,
  memberId: string,
  projectRole: ProjectRole,
  responsibility?: string,
): Promise<void> {
  await requireProjectPermission(context, "manageMembers");

  const target = await getProject(context.organizationId, projectId);

  if (!target) {
    throw new ProjectRuleError("Proje bulunamadı.", "NOT_FOUND");
  }

  const member = await findMemberInOrganization(context.organizationId, memberId);

  if (!member) {
    throw new ProjectRuleError("Üye organizasyona ait değil.", "INVALID_INPUT");
  }

  const existing = await findActiveProjectMember(context.organizationId, projectId, memberId);

  if (existing) {
    throw new ProjectRuleError("Bu üye zaten projede.", "CONFLICT");
  }

  await db.insert(projectMember).values({
    organizationId: context.organizationId,
    projectId,
    memberId,
    projectRole,
    responsibility: toNull(responsibility),
  });

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "project.memberAssigned",
    target: { type: "project", id: projectId },
    metadata: { memberId, projectRole },
  });
}

/**
 * Üyeyi projeden çıkarır.
 *
 * İlişki soft-remove edilir (`removed_at` set edilir): geçmiş korunur ve
 * üye yeniden eklenebilir.
 */
export async function removeProjectMember(
  context: AuthContext,
  projectId: string,
  memberId: string,
): Promise<void> {
  await requireProjectPermission(context, "manageMembers");

  const existing = await findActiveProjectMember(context.organizationId, projectId, memberId);

  if (!existing) {
    throw new ProjectRuleError("Bu üye projede değil.", "NOT_FOUND");
  }

  await db
    .update(projectMember)
    .set({ removedAt: new Date() })
    .where(
      and(
        eq(projectMember.organizationId, context.organizationId),
        eq(projectMember.projectId, projectId),
        eq(projectMember.memberId, memberId),
        sql`${projectMember.removedAt} is null`,
      ),
    );

  await writeAuditLog({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "project.memberRemoved",
    target: { type: "project", id: projectId },
    metadata: { memberId },
  });
}
