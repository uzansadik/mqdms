import { db } from "@mqdms/db";
import { processFunction, processFunctionRequirement, processRequirement } from "@mqdms/db/schema";
import { and, asc, eq } from "drizzle-orm";

import type { ProcessFunctionScope, ProcessRequirementType } from "./schema";

/**
 * Process Function ve Requirement okuma katmanı.
 */

/** Fonksiyon kaydı. */
export type ProcessFunctionRecord = {
  id: string;
  organizationId: string;
  processVariantRevisionId: string;
  logicalId: string;
  name: string;
  description: string | null;
  functionScope: ProcessFunctionScope;
  processWorkElementId: string | null;
  createdAt: Date;
};

/** Gereklilik kaydı. */
export type ProcessRequirementRecord = {
  id: string;
  organizationId: string;
  processVariantRevisionId: string;
  logicalId: string;
  code: string;
  name: string;
  description: string | null;
  requirementType: ProcessRequirementType;
  sourceReference: string | null;
  isMandatory: boolean;
  createdAt: Date;
};

/** Bir revision'ın fonksiyonları. */
export async function listProcessFunctions(
  organizationId: string,
  revisionId: string,
): Promise<ProcessFunctionRecord[]> {
  return db
    .select({
      id: processFunction.id,
      organizationId: processFunction.organizationId,
      processVariantRevisionId: processFunction.processVariantRevisionId,
      logicalId: processFunction.logicalId,
      name: processFunction.name,
      description: processFunction.description,
      functionScope: processFunction.functionScope,
      processWorkElementId: processFunction.processWorkElementId,
      createdAt: processFunction.createdAt,
    })
    .from(processFunction)
    .where(
      and(
        eq(processFunction.organizationId, organizationId),
        eq(processFunction.processVariantRevisionId, revisionId),
      ),
    )
    .orderBy(asc(processFunction.name));
}

/** Bir revision'ın gereklilikleri. */
export async function listProcessRequirements(
  organizationId: string,
  revisionId: string,
): Promise<ProcessRequirementRecord[]> {
  return db
    .select({
      id: processRequirement.id,
      organizationId: processRequirement.organizationId,
      processVariantRevisionId: processRequirement.processVariantRevisionId,
      logicalId: processRequirement.logicalId,
      code: processRequirement.code,
      name: processRequirement.name,
      description: processRequirement.description,
      requirementType: processRequirement.requirementType,
      sourceReference: processRequirement.sourceReference,
      isMandatory: processRequirement.isMandatory,
      createdAt: processRequirement.createdAt,
    })
    .from(processRequirement)
    .where(
      and(
        eq(processRequirement.organizationId, organizationId),
        eq(processRequirement.processVariantRevisionId, revisionId),
      ),
    )
    .orderBy(asc(processRequirement.code));
}

/** Tek fonksiyon. */
export async function getProcessFunction(
  organizationId: string,
  functionId: string,
): Promise<ProcessFunctionRecord | null> {
  const rows = await db
    .select({
      id: processFunction.id,
      organizationId: processFunction.organizationId,
      processVariantRevisionId: processFunction.processVariantRevisionId,
      logicalId: processFunction.logicalId,
      name: processFunction.name,
      description: processFunction.description,
      functionScope: processFunction.functionScope,
      processWorkElementId: processFunction.processWorkElementId,
      createdAt: processFunction.createdAt,
    })
    .from(processFunction)
    .where(
      and(eq(processFunction.organizationId, organizationId), eq(processFunction.id, functionId)),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Tek gereklilik. */
export async function getProcessRequirement(
  organizationId: string,
  requirementId: string,
): Promise<ProcessRequirementRecord | null> {
  const rows = await db
    .select({
      id: processRequirement.id,
      organizationId: processRequirement.organizationId,
      processVariantRevisionId: processRequirement.processVariantRevisionId,
      logicalId: processRequirement.logicalId,
      code: processRequirement.code,
      name: processRequirement.name,
      description: processRequirement.description,
      requirementType: processRequirement.requirementType,
      sourceReference: processRequirement.sourceReference,
      isMandatory: processRequirement.isMandatory,
      createdAt: processRequirement.createdAt,
    })
    .from(processRequirement)
    .where(
      and(
        eq(processRequirement.organizationId, organizationId),
        eq(processRequirement.id, requirementId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Bir fonksiyonun bağlı gereklilikleri. */
export async function listFunctionRequirements(
  organizationId: string,
  functionId: string,
): Promise<{ id: string; code: string; name: string }[]> {
  return db
    .select({
      id: processRequirement.id,
      code: processRequirement.code,
      name: processRequirement.name,
    })
    .from(processFunctionRequirement)
    .innerJoin(
      processRequirement,
      eq(processRequirement.id, processFunctionRequirement.processRequirementId),
    )
    .where(
      and(
        eq(processFunctionRequirement.organizationId, organizationId),
        eq(processFunctionRequirement.processFunctionId, functionId),
      ),
    )
    .orderBy(asc(processRequirement.code));
}
