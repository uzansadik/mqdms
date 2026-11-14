import { db } from "@mqdms/db";
import { flowNode, flowNodeWorkElement, processWorkElement } from "@mqdms/db/schema";
import { and, asc, eq } from "drizzle-orm";

import type { WorkElementCategory } from "./schema";

/**
 * Process Work Element okuma katmanı.
 *
 * Bütün sorgular `organizationId` ile kısıtlanır.
 */

/** Work Element kaydı. */
export type WorkElementRecord = {
  id: string;
  organizationId: string;
  processVariantRevisionId: string;
  logicalId: string;
  derivedFromId: string | null;
  code: string;
  name: string;
  description: string | null;
  category: WorkElementCategory;
  itemId: string | null;
  itemGroupId: string | null;
  sortOrder: number;
  createdAt: Date;
};

/** Bir revision'ın work element'leri. */
export async function listWorkElements(
  organizationId: string,
  revisionId: string,
): Promise<WorkElementRecord[]> {
  return db
    .select({
      id: processWorkElement.id,
      organizationId: processWorkElement.organizationId,
      processVariantRevisionId: processWorkElement.processVariantRevisionId,
      logicalId: processWorkElement.logicalId,
      derivedFromId: processWorkElement.derivedFromId,
      code: processWorkElement.code,
      name: processWorkElement.name,
      description: processWorkElement.description,
      category: processWorkElement.category,
      itemId: processWorkElement.itemId,
      itemGroupId: processWorkElement.itemGroupId,
      sortOrder: processWorkElement.sortOrder,
      createdAt: processWorkElement.createdAt,
    })
    .from(processWorkElement)
    .where(
      and(
        eq(processWorkElement.organizationId, organizationId),
        eq(processWorkElement.processVariantRevisionId, revisionId),
      ),
    )
    .orderBy(asc(processWorkElement.category), asc(processWorkElement.code));
}

/** Tek work element. */
export async function getWorkElement(
  organizationId: string,
  workElementId: string,
): Promise<WorkElementRecord | null> {
  const rows = await db
    .select({
      id: processWorkElement.id,
      organizationId: processWorkElement.organizationId,
      processVariantRevisionId: processWorkElement.processVariantRevisionId,
      logicalId: processWorkElement.logicalId,
      derivedFromId: processWorkElement.derivedFromId,
      code: processWorkElement.code,
      name: processWorkElement.name,
      description: processWorkElement.description,
      category: processWorkElement.category,
      itemId: processWorkElement.itemId,
      itemGroupId: processWorkElement.itemGroupId,
      sortOrder: processWorkElement.sortOrder,
      createdAt: processWorkElement.createdAt,
    })
    .from(processWorkElement)
    .where(
      and(
        eq(processWorkElement.organizationId, organizationId),
        eq(processWorkElement.id, workElementId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Bir node'a bağlı work element'ler. */
export async function listNodeWorkElements(
  organizationId: string,
  nodeId: string,
): Promise<{ id: string; code: string; name: string; category: WorkElementCategory }[]> {
  return db
    .select({
      id: processWorkElement.id,
      code: processWorkElement.code,
      name: processWorkElement.name,
      category: processWorkElement.category,
    })
    .from(flowNodeWorkElement)
    .innerJoin(
      processWorkElement,
      eq(processWorkElement.id, flowNodeWorkElement.processWorkElementId),
    )
    .where(
      and(
        eq(flowNodeWorkElement.organizationId, organizationId),
        eq(flowNodeWorkElement.flowNodeId, nodeId),
      ),
    )
    .orderBy(asc(processWorkElement.code));
}

/** Node'un ait olduğu akış. */
export async function getNodeFlowId(
  organizationId: string,
  nodeId: string,
): Promise<string | null> {
  const rows = await db
    .select({ flowId: flowNode.flowId })
    .from(flowNode)
    .where(and(eq(flowNode.organizationId, organizationId), eq(flowNode.id, nodeId)))
    .limit(1);

  return rows[0]?.flowId ?? null;
}
