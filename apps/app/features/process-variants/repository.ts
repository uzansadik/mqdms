import { db } from "@mqdms/db";
import { process, processVariant, processVariantRevision } from "@mqdms/db/schema";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import type { ProcessVariantType } from "./schema";

/**
 * Process Variant okuma katmanı.
 *
 * Bütün sorgular `organizationId` ile kısıtlanır.
 */

/** Varyant kaydı. */
export type ProcessVariantRecord = {
  id: string;
  organizationId: string;
  processId: string;
  code: string;
  name: string;
  description: string | null;
  variantType: ProcessVariantType;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

/** Revision kaydı. */
export type ProcessVariantRevisionRecord = {
  id: string;
  organizationId: string;
  processVariantId: string;
  revision: string;
  description: string | null;
  changeReason: string | null;
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "RELEASED" | "SUPERSEDED";
  sourceVariantRevisionId: string | null;
  supersedesRevisionId: string | null;
  version: number;
  submittedAt: Date | null;
  submittedById: string | null;
  approvedAt: Date | null;
  approvedById: string | null;
  releasedAt: Date | null;
  releasedById: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Tek varyant (Master Process bilgisiyle birlikte). */
export async function getProcessVariant(
  organizationId: string,
  variantId: string,
): Promise<(ProcessVariantRecord & { processCode: string; processName: string }) | null> {
  const rows = await db
    .select({
      id: processVariant.id,
      organizationId: processVariant.organizationId,
      processId: processVariant.processId,
      code: processVariant.code,
      name: processVariant.name,
      description: processVariant.description,
      variantType: processVariant.variantType,
      status: processVariant.status,
      createdAt: processVariant.createdAt,
      updatedAt: processVariant.updatedAt,
      archivedAt: processVariant.archivedAt,
      processCode: process.code,
      processName: process.name,
    })
    .from(processVariant)
    .innerJoin(process, eq(process.id, processVariant.processId))
    .where(and(eq(processVariant.organizationId, organizationId), eq(processVariant.id, variantId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Kodu eşleşen varyant. */
export async function findProcessVariantByCode(
  organizationId: string,
  code: string,
  excludeId?: string,
): Promise<ProcessVariantRecord | null> {
  const rows = await db
    .select({
      id: processVariant.id,
      organizationId: processVariant.organizationId,
      processId: processVariant.processId,
      code: processVariant.code,
      name: processVariant.name,
      description: processVariant.description,
      variantType: processVariant.variantType,
      status: processVariant.status,
      createdAt: processVariant.createdAt,
      updatedAt: processVariant.updatedAt,
      archivedAt: processVariant.archivedAt,
    })
    .from(processVariant)
    .where(
      and(
        eq(processVariant.organizationId, organizationId),
        sql`lower(${processVariant.code}) = lower(${code})`,
        excludeId ? sql`${processVariant.id} <> ${excludeId}` : undefined,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Bir Master Process'in varyantları. */
export async function listVariantsOfProcess(
  organizationId: string,
  processId: string,
): Promise<
  {
    id: string;
    code: string;
    name: string;
    variantType: ProcessVariantType;
    status: "ACTIVE" | "INACTIVE";
    archivedAt: Date | null;
    currentRevision: string | null;
    currentRevisionId: string | null;
    currentRevisionStatus: ProcessVariantRevisionRecord["status"] | null;
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
      currentRevision: processVariantRevision.revision,
      currentRevisionId: processVariantRevision.id,
      currentRevisionStatus: processVariantRevision.status,
    })
    .from(processVariant)
    .leftJoin(
      processVariantRevision,
      and(
        eq(processVariantRevision.organizationId, organizationId),
        eq(processVariantRevision.processVariantId, processVariant.id),
        eq(processVariantRevision.status, "RELEASED"),
      ),
    )
    .where(
      and(
        eq(processVariant.organizationId, organizationId),
        eq(processVariant.processId, processId),
        sql`${processVariant.archivedAt} is null`,
      ),
    )
    .orderBy(asc(processVariant.code));
}

/** Varyantın revision geçmişi (en yeni önce). */
export async function listProcessVariantRevisions(
  organizationId: string,
  variantId: string,
): Promise<ProcessVariantRevisionRecord[]> {
  return db
    .select({
      id: processVariantRevision.id,
      organizationId: processVariantRevision.organizationId,
      processVariantId: processVariantRevision.processVariantId,
      revision: processVariantRevision.revision,
      description: processVariantRevision.description,
      changeReason: processVariantRevision.changeReason,
      status: processVariantRevision.status,
      sourceVariantRevisionId: processVariantRevision.sourceVariantRevisionId,
      supersedesRevisionId: processVariantRevision.supersedesRevisionId,
      version: processVariantRevision.version,
      submittedAt: processVariantRevision.submittedAt,
      submittedById: processVariantRevision.submittedById,
      approvedAt: processVariantRevision.approvedAt,
      approvedById: processVariantRevision.approvedById,
      releasedAt: processVariantRevision.releasedAt,
      releasedById: processVariantRevision.releasedById,
      createdById: processVariantRevision.createdById,
      createdAt: processVariantRevision.createdAt,
      updatedAt: processVariantRevision.updatedAt,
    })
    .from(processVariantRevision)
    .where(
      and(
        eq(processVariantRevision.organizationId, organizationId),
        eq(processVariantRevision.processVariantId, variantId),
      ),
    )
    .orderBy(desc(processVariantRevision.createdAt));
}

/** Tek revision. */
export async function getProcessVariantRevision(
  organizationId: string,
  revisionId: string,
): Promise<ProcessVariantRevisionRecord | null> {
  const rows = await db
    .select({
      id: processVariantRevision.id,
      organizationId: processVariantRevision.organizationId,
      processVariantId: processVariantRevision.processVariantId,
      revision: processVariantRevision.revision,
      description: processVariantRevision.description,
      changeReason: processVariantRevision.changeReason,
      status: processVariantRevision.status,
      sourceVariantRevisionId: processVariantRevision.sourceVariantRevisionId,
      supersedesRevisionId: processVariantRevision.supersedesRevisionId,
      version: processVariantRevision.version,
      submittedAt: processVariantRevision.submittedAt,
      submittedById: processVariantRevision.submittedById,
      approvedAt: processVariantRevision.approvedAt,
      approvedById: processVariantRevision.approvedById,
      releasedAt: processVariantRevision.releasedAt,
      releasedById: processVariantRevision.releasedById,
      createdById: processVariantRevision.createdById,
      createdAt: processVariantRevision.createdAt,
      updatedAt: processVariantRevision.updatedAt,
    })
    .from(processVariantRevision)
    .where(
      and(
        eq(processVariantRevision.organizationId, organizationId),
        eq(processVariantRevision.id, revisionId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Revision değeri eşleşen kayıt. */
export async function findProcessVariantRevisionByValue(
  organizationId: string,
  variantId: string,
  revision: string,
): Promise<ProcessVariantRevisionRecord | null> {
  const rows = await db
    .select({
      id: processVariantRevision.id,
      organizationId: processVariantRevision.organizationId,
      processVariantId: processVariantRevision.processVariantId,
      revision: processVariantRevision.revision,
      description: processVariantRevision.description,
      changeReason: processVariantRevision.changeReason,
      status: processVariantRevision.status,
      sourceVariantRevisionId: processVariantRevision.sourceVariantRevisionId,
      supersedesRevisionId: processVariantRevision.supersedesRevisionId,
      version: processVariantRevision.version,
      submittedAt: processVariantRevision.submittedAt,
      submittedById: processVariantRevision.submittedById,
      approvedAt: processVariantRevision.approvedAt,
      approvedById: processVariantRevision.approvedById,
      releasedAt: processVariantRevision.releasedAt,
      releasedById: processVariantRevision.releasedById,
      createdById: processVariantRevision.createdById,
      createdAt: processVariantRevision.createdAt,
      updatedAt: processVariantRevision.updatedAt,
    })
    .from(processVariantRevision)
    .where(
      and(
        eq(processVariantRevision.organizationId, organizationId),
        eq(processVariantRevision.processVariantId, variantId),
        sql`lower(${processVariantRevision.revision}) = lower(${revision})`,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Türetim için kaynak revision'lar.
 *
 * Yalnızca **yayınlanmış** revision'lar kaynak olabilir: türetilen içerik
 * kararlı bir taban üzerine kurulur.
 */
export async function listGenericSourceRevisions(
  organizationId: string,
  processId: string,
): Promise<
  {
    id: string;
    revision: string;
    variantId: string;
    variantCode: string;
    variantName: string;
  }[]
> {
  const rows = await db
    .select({
      id: processVariantRevision.id,
      revision: processVariantRevision.revision,
      variantId: processVariant.id,
      variantCode: processVariant.code,
      variantName: processVariant.name,
    })
    .from(processVariantRevision)
    .innerJoin(processVariant, eq(processVariant.id, processVariantRevision.processVariantId))
    .where(
      and(
        eq(processVariantRevision.organizationId, organizationId),
        eq(processVariantRevision.status, "RELEASED"),
        eq(processVariant.processId, processId),
        eq(processVariant.variantType, "GENERIC"),
        isNull(processVariant.archivedAt),
      ),
    )
    .orderBy(asc(processVariant.code), asc(processVariantRevision.revision));

  return rows;
}

/**
 * Varyantın türetildiği kaynak revision.
 *
 * Lineage, varyantın `sourceVariantRevisionId` bildiren ilk revision'ı
 * üzerinden izlenir; isim eşleştirmesi yapılmaz.
 *
 * Dönen kayıt **kaynak revision**'dır: varyantın kendi revision'ı değil.
 */
export async function getLineageSourceRevision(
  organizationId: string,
  variantId: string,
): Promise<ProcessVariantRevisionRecord | null> {
  const rows = await db
    .select({ sourceVariantRevisionId: processVariantRevision.sourceVariantRevisionId })
    .from(processVariantRevision)
    .where(
      and(
        eq(processVariantRevision.organizationId, organizationId),
        eq(processVariantRevision.processVariantId, variantId),
        sql`${processVariantRevision.sourceVariantRevisionId} is not null`,
      ),
    )
    .orderBy(asc(processVariantRevision.createdAt))
    .limit(1);

  const sourceRevisionId = rows[0]?.sourceVariantRevisionId;

  if (!sourceRevisionId) {
    return null;
  }

  return getProcessVariantRevision(organizationId, sourceRevisionId);
}

/**
 * Bir varyantın yayınlanmış revision'ları.
 *
 * Kaynak güncellemesinde, lineage kaynağından sonra yayınlanmış revision'lar
 * aday olarak listelenir.
 */
export async function listReleasedRevisionsOfVariant(
  organizationId: string,
  processVariantId: string,
): Promise<
  {
    id: string;
    revision: string;
    releasedAt: Date | null;
    createdAt: Date;
  }[]
> {
  const rows = await db
    .select({
      id: processVariantRevision.id,
      revision: processVariantRevision.revision,
      releasedAt: processVariantRevision.releasedAt,
      createdAt: processVariantRevision.createdAt,
    })
    .from(processVariantRevision)
    .where(
      and(
        eq(processVariantRevision.organizationId, organizationId),
        eq(processVariantRevision.processVariantId, processVariantId),
        eq(processVariantRevision.status, "RELEASED"),
      ),
    )
    .orderBy(desc(processVariantRevision.releasedAt), desc(processVariantRevision.createdAt));

  return rows;
}

/**
 * Varyantın yayınlanmış revision'ı.
 *
 * Aynı anda en fazla bir `RELEASED` revision olabilir; veritabanı
 * seviyesinde de korunur.
 */
export async function getReleasedRevision(
  organizationId: string,
  variantId: string,
): Promise<ProcessVariantRevisionRecord | null> {
  const rows = await db
    .select({
      id: processVariantRevision.id,
      organizationId: processVariantRevision.organizationId,
      processVariantId: processVariantRevision.processVariantId,
      revision: processVariantRevision.revision,
      description: processVariantRevision.description,
      changeReason: processVariantRevision.changeReason,
      status: processVariantRevision.status,
      sourceVariantRevisionId: processVariantRevision.sourceVariantRevisionId,
      supersedesRevisionId: processVariantRevision.supersedesRevisionId,
      version: processVariantRevision.version,
      submittedAt: processVariantRevision.submittedAt,
      submittedById: processVariantRevision.submittedById,
      approvedAt: processVariantRevision.approvedAt,
      approvedById: processVariantRevision.approvedById,
      releasedAt: processVariantRevision.releasedAt,
      releasedById: processVariantRevision.releasedById,
      createdById: processVariantRevision.createdById,
      createdAt: processVariantRevision.createdAt,
      updatedAt: processVariantRevision.updatedAt,
    })
    .from(processVariantRevision)
    .where(
      and(
        eq(processVariantRevision.organizationId, organizationId),
        eq(processVariantRevision.processVariantId, variantId),
        eq(processVariantRevision.status, "RELEASED"),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
