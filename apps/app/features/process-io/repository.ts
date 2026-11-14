import { db } from "@mqdms/db";
import {
  processIoDefinition,
  processVariantApplicability,
  processVariantApplicabilityItemGroup,
} from "@mqdms/db/schema";
import { and, asc, eq } from "drizzle-orm";

import type { ProcessIoDirection, ProcessIoResourceType } from "./schema";

/**
 * Process Input/Output ve Applicability okuma katmanı.
 */

/** Girdi/çıktı kaydı. */
export type ProcessIoRecord = {
  id: string;
  organizationId: string;
  processVariantRevisionId: string;
  logicalId: string;
  direction: ProcessIoDirection;
  resourceType: ProcessIoResourceType;
  name: string;
  description: string | null;
  itemGroupId: string | null;
  itemId: string | null;
  processState: string | null;
  isRequired: boolean;
  sortOrder: number;
};

/** Applicability kaydı. */
export type ProcessApplicabilityRecord = {
  id: string;
  organizationId: string;
  processVariantRevisionId: string;
  logicalId: string;
  name: string;
  description: string | null;
  supplyType: "MANUFACTURED" | "PURCHASED" | "OUTSOURCED" | "MIXED" | "UNKNOWN" | null;
  joiningMethod: "BONDING" | "BOLTING" | "WELDING" | "RIVETING" | "OTHER" | null;
  isActive: boolean;
};

/** Bir revision'ın girdi/çıktı tanımları. */
export async function listProcessIoDefinitions(
  organizationId: string,
  revisionId: string,
): Promise<ProcessIoRecord[]> {
  return db
    .select({
      id: processIoDefinition.id,
      organizationId: processIoDefinition.organizationId,
      processVariantRevisionId: processIoDefinition.processVariantRevisionId,
      logicalId: processIoDefinition.logicalId,
      direction: processIoDefinition.direction,
      resourceType: processIoDefinition.resourceType,
      name: processIoDefinition.name,
      description: processIoDefinition.description,
      itemGroupId: processIoDefinition.itemGroupId,
      itemId: processIoDefinition.itemId,
      processState: processIoDefinition.processState,
      isRequired: processIoDefinition.isRequired,
      sortOrder: processIoDefinition.sortOrder,
    })
    .from(processIoDefinition)
    .where(
      and(
        eq(processIoDefinition.organizationId, organizationId),
        eq(processIoDefinition.processVariantRevisionId, revisionId),
      ),
    )
    .orderBy(asc(processIoDefinition.direction), asc(processIoDefinition.sortOrder));
}

/** Bir revision'ın applicability kuralları. */
export async function listProcessApplicabilities(
  organizationId: string,
  revisionId: string,
): Promise<(ProcessApplicabilityRecord & { itemGroupIds: string[] })[]> {
  const rows = await db
    .select({
      id: processVariantApplicability.id,
      organizationId: processVariantApplicability.organizationId,
      processVariantRevisionId: processVariantApplicability.processVariantRevisionId,
      logicalId: processVariantApplicability.logicalId,
      name: processVariantApplicability.name,
      description: processVariantApplicability.description,
      supplyType: processVariantApplicability.supplyType,
      joiningMethod: processVariantApplicability.joiningMethod,
      isActive: processVariantApplicability.isActive,
      itemGroupId: processVariantApplicabilityItemGroup.itemGroupId,
    })
    .from(processVariantApplicability)
    .leftJoin(
      processVariantApplicabilityItemGroup,
      eq(processVariantApplicabilityItemGroup.applicabilityId, processVariantApplicability.id),
    )
    .where(
      and(
        eq(processVariantApplicability.organizationId, organizationId),
        eq(processVariantApplicability.processVariantRevisionId, revisionId),
      ),
    )
    .orderBy(asc(processVariantApplicability.name));

  const grouped = new Map<string, ProcessApplicabilityRecord & { itemGroupIds: string[] }>();

  for (const row of rows) {
    const existing = grouped.get(row.id);

    if (!existing) {
      grouped.set(row.id, {
        id: row.id,
        organizationId: row.organizationId,
        processVariantRevisionId: row.processVariantRevisionId,
        logicalId: row.logicalId,
        name: row.name,
        description: row.description,
        supplyType: row.supplyType,
        joiningMethod: row.joiningMethod,
        isActive: row.isActive,
        itemGroupIds: row.itemGroupId ? [row.itemGroupId] : [],
      });

      continue;
    }

    if (row.itemGroupId) {
      existing.itemGroupIds.push(row.itemGroupId);
    }
  }

  return [...grouped.values()];
}

/** Tek girdi/çıktı kaydı. */
export async function getProcessIoDefinition(
  organizationId: string,
  ioId: string,
): Promise<ProcessIoRecord | null> {
  const rows = await db
    .select({
      id: processIoDefinition.id,
      organizationId: processIoDefinition.organizationId,
      processVariantRevisionId: processIoDefinition.processVariantRevisionId,
      logicalId: processIoDefinition.logicalId,
      direction: processIoDefinition.direction,
      resourceType: processIoDefinition.resourceType,
      name: processIoDefinition.name,
      description: processIoDefinition.description,
      itemGroupId: processIoDefinition.itemGroupId,
      itemId: processIoDefinition.itemId,
      processState: processIoDefinition.processState,
      isRequired: processIoDefinition.isRequired,
      sortOrder: processIoDefinition.sortOrder,
    })
    .from(processIoDefinition)
    .where(
      and(eq(processIoDefinition.organizationId, organizationId), eq(processIoDefinition.id, ioId)),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Tek applicability kaydı. */
export async function getProcessApplicability(
  organizationId: string,
  applicabilityId: string,
): Promise<ProcessApplicabilityRecord | null> {
  const rows = await db
    .select({
      id: processVariantApplicability.id,
      organizationId: processVariantApplicability.organizationId,
      processVariantRevisionId: processVariantApplicability.processVariantRevisionId,
      logicalId: processVariantApplicability.logicalId,
      name: processVariantApplicability.name,
      description: processVariantApplicability.description,
      supplyType: processVariantApplicability.supplyType,
      joiningMethod: processVariantApplicability.joiningMethod,
      isActive: processVariantApplicability.isActive,
    })
    .from(processVariantApplicability)
    .where(
      and(
        eq(processVariantApplicability.organizationId, organizationId),
        eq(processVariantApplicability.id, applicabilityId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
