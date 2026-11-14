import { db } from "@mqdms/db";
import {
  bom,
  bomLine,
  bomRevision,
  customerItem,
  customerItemRevision,
  item,
  itemGroup,
  itemRevision,
  project,
  projectItem,
} from "@mqdms/db/schema";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";

/**
 * Proje ürünü okuma katmanı.
 *
 * Bütün sorgular `organizationId` ile kısıtlanır.
 */

export type ProjectItemRecord = {
  id: string;
  organizationId: string;
  projectId: string;
  itemId: string;
  itemCode: string | null;
  itemName: string | null;
  itemGroupId: string | null;
  itemGroupCode: string | null;
  itemRevisionId: string | null;
  itemRevision: string | null;
  customerItemId: string | null;
  customerPartNumber: string | null;
  customerItemRevisionId: string | null;
  customerRevision: string | null;
  bomRevisionId: string | null;
  itemRole: "DELIVERABLE" | "COMPONENT" | "RAW_MATERIAL" | "AUXILIARY";
  supplyTypeOverride: "MANUFACTURED" | "PURCHASED" | "OUTSOURCED" | "MIXED" | "UNKNOWN" | null;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  archivedAt: Date | null;
};

/** Projenin ürün kapsamı. */
export async function listProjectItems(
  organizationId: string,
  projectId: string,
): Promise<ProjectItemRecord[]> {
  return db
    .select({
      id: projectItem.id,
      organizationId: projectItem.organizationId,
      projectId: projectItem.projectId,
      itemId: projectItem.itemId,
      itemCode: item.code,
      itemName: item.name,
      itemGroupId: item.itemGroupId,
      itemGroupCode: itemGroup.code,
      itemRevisionId: projectItem.itemRevisionId,
      itemRevision: itemRevision.revision,
      customerItemId: projectItem.customerItemId,
      customerPartNumber: customerItem.customerPartNumber,
      customerItemRevisionId: projectItem.customerItemRevisionId,
      customerRevision: customerItemRevision.customerRevision,
      bomRevisionId: projectItem.bomRevisionId,
      itemRole: projectItem.itemRole,
      supplyTypeOverride: projectItem.supplyTypeOverride,
      description: projectItem.description,
      status: projectItem.status,
      archivedAt: projectItem.archivedAt,
    })
    .from(projectItem)
    .leftJoin(item, eq(item.id, projectItem.itemId))
    .leftJoin(itemGroup, eq(itemGroup.id, item.itemGroupId))
    .leftJoin(itemRevision, eq(itemRevision.id, projectItem.itemRevisionId))
    .leftJoin(customerItem, eq(customerItem.id, projectItem.customerItemId))
    .leftJoin(customerItemRevision, eq(customerItemRevision.id, projectItem.customerItemRevisionId))
    .where(
      and(
        eq(projectItem.organizationId, organizationId),
        eq(projectItem.projectId, projectId),
        isNull(projectItem.archivedAt),
      ),
    )
    .orderBy(asc(item.code));
}

/** Tek proje ürünü. */
export async function getProjectItem(
  organizationId: string,
  projectItemId: string,
): Promise<ProjectItemRecord | null> {
  const rows = await db
    .select({
      id: projectItem.id,
      organizationId: projectItem.organizationId,
      projectId: projectItem.projectId,
      itemId: projectItem.itemId,
      itemCode: item.code,
      itemName: item.name,
      itemGroupId: item.itemGroupId,
      itemGroupCode: itemGroup.code,
      itemRevisionId: projectItem.itemRevisionId,
      itemRevision: itemRevision.revision,
      customerItemId: projectItem.customerItemId,
      customerPartNumber: customerItem.customerPartNumber,
      customerItemRevisionId: projectItem.customerItemRevisionId,
      customerRevision: customerItemRevision.customerRevision,
      bomRevisionId: projectItem.bomRevisionId,
      itemRole: projectItem.itemRole,
      supplyTypeOverride: projectItem.supplyTypeOverride,
      description: projectItem.description,
      status: projectItem.status,
      archivedAt: projectItem.archivedAt,
    })
    .from(projectItem)
    .leftJoin(item, eq(item.id, projectItem.itemId))
    .leftJoin(itemGroup, eq(itemGroup.id, item.itemGroupId))
    .leftJoin(itemRevision, eq(itemRevision.id, projectItem.itemRevisionId))
    .leftJoin(customerItem, eq(customerItem.id, projectItem.customerItemId))
    .leftJoin(customerItemRevision, eq(customerItemRevision.id, projectItem.customerItemRevisionId))
    .where(and(eq(projectItem.organizationId, organizationId), eq(projectItem.id, projectItemId)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Projeye eklenmiş aktif item var mı?
 *
 * Aynı aktif item projeye iki kez eklenemez; arşivlenen kayıt tekrar
 * eklenebilir.
 */
export async function findActiveProjectItem(
  organizationId: string,
  projectId: string,
  itemId: string,
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: projectItem.id })
    .from(projectItem)
    .where(
      and(
        eq(projectItem.organizationId, organizationId),
        eq(projectItem.projectId, projectId),
        eq(projectItem.itemId, itemId),
        isNull(projectItem.archivedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Bir item'ın kullanıldığı projeler.
 *
 * "Used In" görünümü ve item silme kontrolü için kullanılır.
 */
export async function listProjectsUsingItem(
  organizationId: string,
  itemId: string,
): Promise<{ id: string; code: string; name: string }[]> {
  return db
    .selectDistinct({ id: project.id, code: project.code, name: project.name })
    .from(projectItem)
    .innerJoin(project, eq(project.id, projectItem.projectId))
    .where(
      and(
        eq(projectItem.organizationId, organizationId),
        eq(projectItem.itemId, itemId),
        isNull(projectItem.archivedAt),
      ),
    )
    .orderBy(asc(project.name));
}

/**
 * Bir item'ın BOM'ları.
 *
 * "Used In" görünümünde, item'ın hangi BOM'larda doğrudan kullanıldığı
 * gösterilir.
 */
export async function listBomsUsingItem(
  organizationId: string,
  itemId: string,
): Promise<
  { bomId: string; bomCode: string; bomName: string; revisionId: string; revision: string }[]
> {
  return db
    .selectDistinct({
      bomId: bom.id,
      bomCode: bom.code,
      bomName: bom.name,
      revisionId: bomRevision.id,
      revision: bomRevision.revision,
    })
    .from(bomLine)
    .innerJoin(bomRevision, eq(bomRevision.id, bomLine.bomRevisionId))
    .innerJoin(bom, eq(bom.id, bomRevision.bomId))
    .where(and(eq(bomLine.organizationId, organizationId), eq(bomLine.childItemId, itemId)))
    .orderBy(asc(bom.code));
}

/**
 * Projede zaten aktif olan item'lar.
 *
 * Toplu eklemede sessizce atlanacak kayıtlar bu sorguyla belirlenir.
 */
export async function findActiveProjectItems(
  organizationId: string,
  projectId: string,
  itemIds: string[],
): Promise<{ id: string; itemId: string }[]> {
  if (itemIds.length === 0) {
    return [];
  }

  return db
    .select({ id: projectItem.id, itemId: projectItem.itemId })
    .from(projectItem)
    .where(
      and(
        eq(projectItem.organizationId, organizationId),
        eq(projectItem.projectId, projectId),
        inArray(projectItem.itemId, itemIds),
        isNull(projectItem.archivedAt),
      ),
    );
}
