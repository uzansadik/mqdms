import { db } from "@mqdms/db";
import { type ImportConflictResolution, importJob, importJobError } from "@mqdms/db/schema";
import { and, desc, eq } from "drizzle-orm";

/**
 * Import işi okuma/yazma katmanı.
 *
 * Import işi geçmişi kullanıcı tarafından görüntülenebilir; hatalar iş
 * seviyesinde saklanır, satır seviyesinde audit üretilmez.
 */

export type ImportJobRecord = {
  id: string;
  organizationId: string;
  importType: "ITEM" | "ITEM_GROUP_MAPPING" | "CUSTOMER_ITEM" | "BOM";
  sourceSystem: string | null;
  fileName: string;
  fileHash: string;
  fileKey: string | null;
  status:
    | "PENDING"
    | "PARSING"
    | "VALIDATING"
    | "READY"
    | "CONFLICT"
    | "RUNNING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";
  columnMapping: Record<string, string>;
  conflictResolution: ImportConflictResolution;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  createdAt: Date;
  completedAt: Date | null;
};

export type ImportJobErrorRecord = {
  id: string;
  importJobId: string;
  rowNumber: number | null;
  column: string | null;
  code: string;
  message: string;
  context: Record<string, unknown>;
};

/** Import işlerinin listesi (en yeni önce). */
export async function listImportJobs(organizationId: string): Promise<ImportJobRecord[]> {
  return db
    .select({
      id: importJob.id,
      organizationId: importJob.organizationId,
      importType: importJob.importType,
      sourceSystem: importJob.sourceSystem,
      fileName: importJob.fileName,
      fileHash: importJob.fileHash,
      fileKey: importJob.fileKey,
      status: importJob.status,
      columnMapping: importJob.columnMapping,
      conflictResolution: importJob.conflictResolution,
      totalRows: importJob.totalRows,
      createdCount: importJob.createdCount,
      updatedCount: importJob.updatedCount,
      skippedCount: importJob.skippedCount,
      errorCount: importJob.errorCount,
      createdAt: importJob.createdAt,
      completedAt: importJob.completedAt,
    })
    .from(importJob)
    .where(eq(importJob.organizationId, organizationId))
    .orderBy(desc(importJob.createdAt));
}

/** Tek import işi. */
export async function getImportJob(
  organizationId: string,
  importJobId: string,
): Promise<ImportJobRecord | null> {
  const rows = await db
    .select({
      id: importJob.id,
      organizationId: importJob.organizationId,
      importType: importJob.importType,
      sourceSystem: importJob.sourceSystem,
      fileName: importJob.fileName,
      fileHash: importJob.fileHash,
      fileKey: importJob.fileKey,
      status: importJob.status,
      columnMapping: importJob.columnMapping,
      conflictResolution: importJob.conflictResolution,
      totalRows: importJob.totalRows,
      createdCount: importJob.createdCount,
      updatedCount: importJob.updatedCount,
      skippedCount: importJob.skippedCount,
      errorCount: importJob.errorCount,
      createdAt: importJob.createdAt,
      completedAt: importJob.completedAt,
    })
    .from(importJob)
    .where(and(eq(importJob.organizationId, organizationId), eq(importJob.id, importJobId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Yeni import işi oluşturur. */
export async function createImportJob(input: {
  organizationId: string;
  importType: ImportJobRecord["importType"];
  sourceSystem: string | null;
  fileName: string;
  fileHash: string;
  fileKey: string;
  createdById: string;
}): Promise<ImportJobRecord> {
  const rows = await db
    .insert(importJob)
    .values({
      organizationId: input.organizationId,
      importType: input.importType,
      sourceSystem: input.sourceSystem,
      fileName: input.fileName,
      fileHash: input.fileHash,
      fileKey: input.fileKey,
      status: "PENDING",
      columnMapping: {},
      createdById: input.createdById,
    })
    .returning({ id: importJob.id });

  const importJobId = rows[0]?.id;

  if (!importJobId) {
    throw new Error("Import işi oluşturulamadı.");
  }

  const created = await getImportJob(input.organizationId, importJobId);

  if (!created) {
    throw new Error("Import işi oluşturulamadı.");
  }

  return created;
}

/** Import işinin durumunu ve sayaçlarını günceller. */
export async function updateImportJob(
  organizationId: string,
  importJobId: string,
  values: Partial<
    Pick<
      ImportJobRecord,
      | "status"
      | "columnMapping"
      | "conflictResolution"
      | "totalRows"
      | "createdCount"
      | "updatedCount"
      | "skippedCount"
      | "errorCount"
      | "fileHash"
      | "completedAt"
    >
  >,
): Promise<void> {
  await db
    .update(importJob)
    .set(values)
    .where(and(eq(importJob.organizationId, organizationId), eq(importJob.id, importJobId)));
}

/** Import işinin hatalarını değiştirir. */
export async function replaceImportJobErrors(
  importJobId: string,
  errors: {
    rowNumber: number | null;
    column: string | null;
    code: string;
    message: string;
    context?: Record<string, unknown>;
  }[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(importJobError).where(eq(importJobError.importJobId, importJobId));

    if (errors.length === 0) {
      return;
    }

    await tx.insert(importJobError).values(
      errors.map((error) => ({
        importJobId,
        rowNumber: error.rowNumber,
        column: error.column,
        code: error.code,
        message: error.message,
        context: error.context ?? {},
      })),
    );
  });
}

/** Import işinin hataları. */
export async function listImportJobErrors(importJobId: string): Promise<ImportJobErrorRecord[]> {
  return db
    .select({
      id: importJobError.id,
      importJobId: importJobError.importJobId,
      rowNumber: importJobError.rowNumber,
      column: importJobError.column,
      code: importJobError.code,
      message: importJobError.message,
      context: importJobError.context,
    })
    .from(importJobError)
    .where(eq(importJobError.importJobId, importJobId));
}
