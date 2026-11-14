import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import { projectItem } from "@mqdms/db/schema";
import { and, eq } from "drizzle-orm";

import { getBom, getBomRevision } from "@/features/boms/repository";
import { getCustomerItem, getCustomerItemRevision } from "@/features/customer-items/repository";
import { findActiveItemsByIds, getItem, getItemRevision } from "@/features/items/repository";
import { getProject } from "@/features/projects/repository";

import { findActiveProjectItem, findActiveProjectItems, getProjectItem } from "./repository";
import type { ProjectItemFormValues } from "./schema";

/**
 * İş kuralı ihlali.
 */
export class ProjectItemRuleError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "ProjectItemRuleError";
  }
}

/**
 * Yetki kontrolü.
 *
 * Proje kapsamındaki ürünler `projects:manageItems` izniyle yönetilir.
 */
async function requireProjectItemPermission(context: AuthContext, action: string): Promise<void> {
  if (!(await hasPermission(context, "projects", action))) {
    throw new ProjectItemRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
  }
}

/** Boş string'i `null`'a çevirir. */
function toNull(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

/**
 * Referansları doğrular.
 *
 * - Item revision'ı ilgili item'a ait olmalıdır.
 * - Müşteri ürünü, projenin müşterisine ait olmalıdır.
 * - Müşteri revision'ı ilgili müşteri ürününe ait olmalıdır.
 * - BOM revision'ı ilgili item'ın BOM'una ait olmalıdır.
 */
async function validateReferences(
  context: AuthContext,
  customerId: string,
  input: ProjectItemFormValues,
): Promise<void> {
  const itemRevisionId = toNull(input.itemRevisionId);
  const customerItemId = toNull(input.customerItemId);
  const customerItemRevisionId = toNull(input.customerItemRevisionId);
  const bomRevisionId = toNull(input.bomRevisionId);

  if (itemRevisionId) {
    const revision = await getItemRevision(context.organizationId, itemRevisionId);

    if (!revision || revision.itemId !== input.itemId) {
      throw new ProjectItemRuleError("Seçilen revision bu ürüne ait değil.", "INVALID_INPUT");
    }
  }

  if (customerItemId) {
    const customerItemRecord = await getCustomerItem(context.organizationId, customerItemId);

    if (!customerItemRecord || customerItemRecord.archivedAt) {
      throw new ProjectItemRuleError("Müşteri ürünü bulunamadı.", "NOT_FOUND");
    }

    if (customerItemRecord.customerId !== customerId) {
      throw new ProjectItemRuleError(
        "Seçilen müşteri ürünü projenin müşterisine ait değil.",
        "INVALID_INPUT",
      );
    }

    if (customerItemRevisionId) {
      const revision = await getCustomerItemRevision(
        context.organizationId,
        customerItemRevisionId,
      );

      if (!revision || revision.customerItemId !== customerItemId) {
        throw new ProjectItemRuleError(
          "Seçilen müşteri revision'ı bu müşteri ürününe ait değil.",
          "INVALID_INPUT",
        );
      }
    }
  }

  if (bomRevisionId) {
    const revision = await getBomRevision(context.organizationId, bomRevisionId);

    if (!revision) {
      throw new ProjectItemRuleError("BOM revision'ı bulunamadı.", "NOT_FOUND");
    }

    const bomRecord = await getBom(context.organizationId, revision.bomId);

    if (!bomRecord || bomRecord.itemId !== input.itemId) {
      throw new ProjectItemRuleError("Seçilen BOM revision'ı bu ürüne ait değil.", "INVALID_INPUT");
    }
  }
}

/**
 * Projeye ürün ekler.
 *
 * Yeni ürün kartı **oluşturulmaz**; organizasyonun ortak item kütüphanesindeki
 * mevcut bir ürüne ilişki kurulur.
 */
export async function createProjectItem(
  context: AuthContext,
  input: ProjectItemFormValues,
): Promise<string> {
  await requireProjectItemPermission(context, "manageItems");

  return db.transaction(async (tx) => {
    const projectRecord = await getProject(context.organizationId, input.projectId);

    if (!projectRecord || projectRecord.archivedAt) {
      throw new ProjectItemRuleError("Proje bulunamadı.", "NOT_FOUND");
    }

    const itemRecord = await getItem(context.organizationId, input.itemId);

    if (!itemRecord || itemRecord.archivedAt) {
      throw new ProjectItemRuleError("Ürün bulunamadı.", "NOT_FOUND");
    }

    await validateReferences(context, projectRecord.customerId, input);

    const existing = await findActiveProjectItem(
      context.organizationId,
      input.projectId,
      input.itemId,
    );

    if (existing) {
      throw new ProjectItemRuleError("Bu ürün zaten projeye eklenmiş.", "CONFLICT");
    }

    const created = await tx
      .insert(projectItem)
      .values({
        organizationId: context.organizationId,
        projectId: input.projectId,
        itemId: input.itemId,
        itemRevisionId: toNull(input.itemRevisionId),
        customerItemId: toNull(input.customerItemId),
        customerItemRevisionId: toNull(input.customerItemRevisionId),
        bomRevisionId: toNull(input.bomRevisionId),
        itemRole: input.itemRole,
        supplyTypeOverride: input.supplyTypeOverride ?? null,
        description: toNull(input.description),
        status: input.status,
        createdById: context.userId,
      })
      .returning({ id: projectItem.id });

    const projectItemId = created[0]?.id;

    if (!projectItemId) {
      throw new ProjectItemRuleError("Ürün projeye eklenemedi.", "INVALID_INPUT");
    }

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "projectItem.assigned",
        target: { type: "projectItem", id: projectItemId },
        metadata: {
          projectId: input.projectId,
          itemId: input.itemId,
          itemRole: input.itemRole,
        },
      },
      tx,
    );

    return projectItemId;
  });
}

/** Proje ürününü günceller. */
export async function updateProjectItem(
  context: AuthContext,
  projectItemId: string,
  input: ProjectItemFormValues,
): Promise<void> {
  await requireProjectItemPermission(context, "manageItems");

  await db.transaction(async (tx) => {
    const target = await getProjectItem(context.organizationId, projectItemId);

    if (!target) {
      throw new ProjectItemRuleError("Proje ürünü bulunamadı.", "NOT_FOUND");
    }

    const projectRecord = await getProject(context.organizationId, target.projectId);

    if (!projectRecord) {
      throw new ProjectItemRuleError("Proje bulunamadı.", "NOT_FOUND");
    }

    await validateReferences(context, projectRecord.customerId, input);

    await tx
      .update(projectItem)
      .set({
        itemId: input.itemId,
        itemRevisionId: toNull(input.itemRevisionId),
        customerItemId: toNull(input.customerItemId),
        customerItemRevisionId: toNull(input.customerItemRevisionId),
        bomRevisionId: toNull(input.bomRevisionId),
        itemRole: input.itemRole,
        supplyTypeOverride: input.supplyTypeOverride ?? null,
        description: toNull(input.description),
        status: input.status,
      })
      .where(
        and(
          eq(projectItem.organizationId, context.organizationId),
          eq(projectItem.id, projectItemId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "projectItem.updated",
        target: { type: "projectItem", id: projectItemId },
        metadata: { itemId: input.itemId, itemRole: input.itemRole },
      },
      tx,
    );
  });
}

/**
 * Ürünü proje kapsamından çıkarır.
 *
 * Kayıt fiziksel olarak silinmez; arşivlenir ve ürün tekrar eklenebilir.
 */
export async function archiveProjectItem(
  context: AuthContext,
  projectItemId: string,
): Promise<void> {
  await requireProjectItemPermission(context, "manageItems");

  await db.transaction(async (tx) => {
    const target = await getProjectItem(context.organizationId, projectItemId);

    if (!target) {
      throw new ProjectItemRuleError("Proje ürünü bulunamadı.", "NOT_FOUND");
    }

    if (target.archivedAt) {
      return;
    }

    await tx
      .update(projectItem)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(projectItem.organizationId, context.organizationId),
          eq(projectItem.id, projectItemId),
        ),
      );

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "projectItem.removed",
        target: { type: "projectItem", id: projectItemId },
        metadata: { projectId: target.projectId, itemId: target.itemId },
      },
      tx,
    );
  });
}

/**
 * Ürünleri projeye toplu ekler.
 *
 * Kullanıcı item kütüphanesinden çoklu item seçip hepsini bir projeye
 * ekleyebilir (ör. elli FRP'yi kalite çalışması için kapsama almak).
 *
 * Zaten projede olan item'lar **sessizce atlanır**: toplu ekleme başarısız
 * olmaz, yalnızca eklenenler raporlanır.
 */
export async function addProjectItems(
  context: AuthContext,
  projectId: string,
  itemIds: string[],
): Promise<{ created: number; skipped: number }> {
  await requireProjectItemPermission(context, "manageItems");

  const uniqueItemIds = [...new Set(itemIds)];

  if (uniqueItemIds.length === 0) {
    return { created: 0, skipped: 0 };
  }

  return db.transaction(async (tx) => {
    const projectRecord = await getProject(context.organizationId, projectId);

    if (!projectRecord || projectRecord.archivedAt) {
      throw new ProjectItemRuleError("Proje bulunamadı.", "NOT_FOUND");
    }

    const existing = await findActiveProjectItems(context.organizationId, projectId, uniqueItemIds);

    const existingIds = new Set(existing.map((row) => row.itemId));

    /*
     * Aday item'lar tek sorguda doğrulanır: arşivlenmiş ya da başka
     * organizasyona ait item'lar projeye eklenmez.
     */
    const candidates = uniqueItemIds.filter((itemId) => !existingIds.has(itemId));

    const validItems = await findActiveItemsByIds(context.organizationId, candidates);

    const validIds = new Set(validItems.map((row) => row.id));

    if (validIds.size > 0) {
      await tx.insert(projectItem).values(
        [...validIds].map((itemId) => ({
          organizationId: context.organizationId,
          projectId,
          itemId,
          itemRole: "COMPONENT" as const,
          status: "ACTIVE" as const,
          createdById: context.userId,
        })),
      );
    }

    const created = validIds.size;

    await writeAuditLog(
      {
        organizationId: context.organizationId,
        actorId: context.userId,
        action: "projectItem.assigned",
        target: { type: "project", id: projectId },
        metadata: { added: created, skipped: uniqueItemIds.length - created },
      },
      tx,
    );

    return { created, skipped: uniqueItemIds.length - created };
  });
}
