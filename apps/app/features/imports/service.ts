import { createHash } from "node:crypto";

import { writeAuditLog } from "@mqdms/audit";
import { type AuthContext, hasPermission } from "@mqdms/auth/permissions/server";
import { db } from "@mqdms/db";
import {
  bomLine,
  customerItem,
  customerItemRevision,
  item,
  itemExternalReference,
  itemRevision,
} from "@mqdms/db/schema";
import { getObjectBytes } from "@mqdms/storage/server";
import { and, eq } from "drizzle-orm";

import {
  findUndecidedConflicts,
  needsInvalidRowDecision,
  selectApplicableRows,
  selectConflictRows,
  selectInvalidRows,
} from "./conflicts";
import { type ImportSheet, parseCsv, parseXlsx } from "./parser";
import {
  createImportJob as createImportJobRecord,
  getImportJob,
  type ImportJobRecord,
  listImportJobErrors,
  replaceImportJobErrors,
  updateImportJob,
} from "./repository";
import type { ColumnMapping, ConflictResolution, ImportType } from "./schema";
import { type ImportRowResult, validateImportRows } from "./validator";

/**
 * İçe aktarım servisi.
 *
 * Akış: dosya yüklenir → kolonlar eşleştirilir → satırlar doğrulanır →
 * kullanıcı onaylar → veriler **tek transaction** içinde yazılır.
 *
 * Onay olmadan hiçbir mevcut veri değişmez.
 */

/** İçe aktarım hatası. */
export class ImportRuleError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "CONFLICT"
      | "INVALID_INPUT"
      | "FORBIDDEN"
      | "INVALID_STATE" = "INVALID_INPUT",
  ) {
    super(message);
    this.name = "ImportRuleError";
  }
}

/** Yetki kontrolü. */
async function requireImportPermission(
  context: AuthContext,
  action: "create" | "execute" | "read",
): Promise<void> {
  if (!(await hasPermission(context, "imports", action))) {
    throw new ImportRuleError("Bu işlem için yetkiniz yok.", "FORBIDDEN");
  }
}

/** Doğrulama önizlemesi. */
export type ImportPreview = {
  /** Doğrulanan satırlar. */
  rows: ImportRowResult[];

  /** Oluşturulacak kayıt sayısı. */
  createCount: number;

  /** Güncellenecek kayıt sayısı. */
  updateCount: number;

  /** Hatalı satır sayısı. */
  errorCount: number;

  /** Toplam satır sayısı. */
  totalRows: number;

  /**
   * Mevcut bir kaydın üzerine yazılacak satırlar.
   *
   * Bu satırlar için kullanıcı karar vermek zorundadır: mevcut kayıt
   * korunur ya da dosyadaki değerlerle güncellenir.
   */
  conflicts: ImportRowResult[];

  /** Doğrulama hatası olan satırlar. */
  invalidRows: ImportRowResult[];

  /** İş üzerinde kayıtlı çakışma çözümü. */
  resolution: ConflictResolution;
};

/** Çakışma çözümü olmayan boş karar seti. */
function emptyResolution(): ConflictResolution {
  return { rows: {}, skipInvalidRows: false };
}

/**
 * Satırları doğrulayıp önizleme üretir.
 *
 * Saf okuma: hiçbir kayıt yazılmaz. Hem doğrulama, hem çakışma çözümü hem
 * de çalıştırma adımı aynı önizlemeyi kullanır.
 */
async function buildPreview(
  organizationId: string,
  job: ImportJobRecord,
  sheet: ImportSheet,
  mapping: ColumnMapping,
  resolution: ConflictResolution,
): Promise<ImportPreview> {
  const rows = await validateImportRows(organizationId, job.importType, sheet, mapping);

  const createCount = rows.filter((row) => row.status === "CREATE").length;
  const conflicts = selectConflictRows(rows);
  const invalidRows = selectInvalidRows(rows);

  return {
    rows,
    createCount,
    updateCount: conflicts.length,
    errorCount: invalidRows.length,
    totalRows: rows.length,
    conflicts,
    invalidRows,
    resolution,
  };
}

/** Dosyayı depolamadan okur ve ayrıştırır. */
export async function readSheet(
  job: ImportJobRecord,
): Promise<{ sheet: ImportSheet; bytes: Uint8Array }> {
  if (!job.fileKey) {
    throw new ImportRuleError("Yüklenen dosya bulunamadı.", "NOT_FOUND");
  }

  const bytes = await getObjectBytes(job.fileKey);

  const sheet = job.fileKey.endsWith(".xlsx")
    ? await parseXlsx(bytes)
    : parseCsv(new TextDecoder().decode(bytes));

  return { sheet, bytes };
}

/** Dosyanın içerik hash'i. */
export function hashFile(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Yeni import işi oluşturur.
 *
 * Dosya depolamaya daha önce yüklenmiştir; burada yalnızca referansı
 * kaydedilir.
 */
export async function createImportJob(
  context: AuthContext,
  input: {
    importType: ImportType;
    sourceSystem?: string;
    fileName: string;
    fileKey: string;
  },
): Promise<string> {
  await requireImportPermission(context, "create");

  const job = await createImportJobRecord({
    organizationId: context.organizationId,
    importType: input.importType,
    sourceSystem: input.sourceSystem ?? null,
    fileName: input.fileName,
    fileHash: "",
    fileKey: input.fileKey,
    createdById: context.userId,
  });

  return job.id;
}

/**
 * Satırları doğrular ve önizleme üretir.
 *
 * Bu adımda veri **yazılmaz**; yalnızca ne yapılacağı belirlenir ve
 * hatalar kaydedilir.
 *
 * Doğrulama yeniden çalıştırıldığında önceki çakışma kararları geçersiz
 * olur: kolon eşleştirmesi değiştiğinde satır kümesi de değişebilir. Bu
 * yüzden kararlar sıfırlanır.
 */
export async function validateImportJob(
  context: AuthContext,
  importJobId: string,
  mapping: ColumnMapping,
): Promise<ImportPreview> {
  await requireImportPermission(context, "read");

  const job = await getImportJob(context.organizationId, importJobId);

  if (!job) {
    throw new ImportRuleError("Import işi bulunamadı.", "NOT_FOUND");
  }

  if (job.status === "RUNNING") {
    throw new ImportRuleError("Bu import şu anda çalışıyor.", "INVALID_STATE");
  }

  const { sheet, bytes } = await readSheet(job);

  const preview = await buildPreview(
    context.organizationId,
    job,
    sheet,
    mapping,
    emptyResolution(),
  );

  await updateImportJob(context.organizationId, importJobId, {
    status: preview.conflicts.length > 0 || preview.invalidRows.length > 0 ? "CONFLICT" : "READY",
    columnMapping: mapping,
    conflictResolution: emptyResolution(),
    totalRows: preview.totalRows,
    createdCount: preview.createCount,
    updatedCount: preview.updateCount,
    skippedCount: preview.rows.filter((row) => row.status === "SKIP").length,
    errorCount: preview.errorCount,
    fileHash: hashFile(bytes),
  });

  await replaceImportJobErrors(
    importJobId,
    preview.invalidRows.flatMap((row) =>
      row.errors.map((error) => ({
        rowNumber: row.rowNumber,
        column: error.column,
        code: error.code,
        message: error.message,
        context: { label: row.label },
      })),
    ),
  );

  return preview;
}

/**
 * Çakışmaları çözer.
 *
 * Kullanıcı, mevcut kaydı hedefleyen her satır için karar verir: mevcut
 * kayıt korunur (`SKIP`) ya da dosyadaki değerlerle güncellenir (`APPLY`).
 * Hatalı satırlar için karar iş seviyesindedir: ya atlanır ya da import
 * durdurulur.
 *
 * Kararlar import işine kaydedilir; çalıştırma adımı bu kararları kullanır.
 */
export async function resolveImportJob(
  context: AuthContext,
  importJobId: string,
  resolution: ConflictResolution,
): Promise<ImportPreview> {
  await requireImportPermission(context, "execute");

  const job = await getImportJob(context.organizationId, importJobId);

  if (!job) {
    throw new ImportRuleError("Import işi bulunamadı.", "NOT_FOUND");
  }

  if (job.status === "RUNNING" || job.status === "COMPLETED") {
    throw new ImportRuleError("Bu import artık çözülemez.", "INVALID_STATE");
  }

  const mapping = job.columnMapping;

  if (Object.keys(mapping).length === 0) {
    throw new ImportRuleError("Kolonlar eşleştirilmeden çakışma çözülemez.", "INVALID_INPUT");
  }

  const { sheet } = await readSheet(job);

  const preview = await buildPreview(context.organizationId, job, sheet, mapping, resolution);

  const unresolved = findUndecidedConflicts(preview.conflicts, resolution);

  if (unresolved.length > 0) {
    throw new ImportRuleError(
      `${unresolved.length} satır için çakışma kararı verilmedi.`,
      "INVALID_INPUT",
    );
  }

  if (needsInvalidRowDecision(preview.invalidRows, resolution)) {
    throw new ImportRuleError(
      "Hatalı satırlar için karar verilmedi: ya atlanmaları ya da import durdurulmalı.",
      "INVALID_INPUT",
    );
  }

  await updateImportJob(context.organizationId, importJobId, {
    status: "READY",
    conflictResolution: resolution,
  });

  return preview;
}

/**
 * Doğrulanmış satırları yazar.
 *
 * Bütün satırlar **tek transaction** içinde yazılır: bir satır başarısız
 * olursa hiçbiri yazılmaz.
 *
 * Yazılacak satırlar kullanıcının çakışma kararlarına göre belirlenir:
 * yeni kayıtlar her zaman yazılır, mevcut kaydı hedefleyen satırlar yalnızca
 * `APPLY` kararı verilmişse güncellenir.
 */
export async function executeImportJob(
  context: AuthContext,
  importJobId: string,
): Promise<{ created: number; updated: number; skipped: number }> {
  await requireImportPermission(context, "execute");

  const job = await getImportJob(context.organizationId, importJobId);

  if (!job) {
    throw new ImportRuleError("Import işi bulunamadı.", "NOT_FOUND");
  }

  if (job.status === "COMPLETED") {
    throw new ImportRuleError("Bu import zaten çalıştırılmış.", "INVALID_STATE");
  }

  const mapping = job.columnMapping;

  if (Object.keys(mapping).length === 0) {
    throw new ImportRuleError("Kolonlar eşleştirilmeden import çalıştırılamaz.", "INVALID_INPUT");
  }

  const { sheet } = await readSheet(job);

  const resolution = job.conflictResolution ?? emptyResolution();

  const preview = await buildPreview(context.organizationId, job, sheet, mapping, resolution);

  /*
   * Çakışmalar çözülmeden import çalıştırılamaz: mevcut kayıtların üzerine
   * yazılıp yazılmayacağı kullanıcının kararına bağlıdır.
   */
  const undecided = findUndecidedConflicts(preview.conflicts, resolution);

  if (undecided.length > 0) {
    throw new ImportRuleError(
      `${undecided.length} satır için çakışma kararı verilmedi.`,
      "INVALID_INPUT",
    );
  }

  if (needsInvalidRowDecision(preview.invalidRows, resolution)) {
    throw new ImportRuleError(
      "Hatalı satırlar için karar verilmedi: ya atlanmaları ya da import durdurulmalı.",
      "INVALID_INPUT",
    );
  }

  const applicable = selectApplicableRows(preview.rows, resolution);

  const skipped = preview.rows.length - applicable.length;

  if (applicable.length === 0) {
    throw new ImportRuleError(
      "Yazılacak doğrulanmış satır yok. Önce doğrulamayı tamamlayın.",
      "INVALID_STATE",
    );
  }

  await updateImportJob(context.organizationId, importJobId, { status: "RUNNING" });

  try {
    const result = await db.transaction(async (tx) => {
      let created = 0;
      let updated = 0;

      for (const row of applicable) {
        const written = await writeRow(tx, context, job, row);

        if (written) {
          created += 1;
        } else {
          updated += 1;
        }
      }

      await writeAuditLog(
        {
          organizationId: context.organizationId,
          actorId: context.userId,
          action: "import.completed",
          target: { type: "importJob", id: importJobId },
          metadata: {
            importType: job.importType,
            fileName: job.fileName,
            created,
            updated,
            skipped,
            totalRows: preview.totalRows,
          },
        },
        tx,
      );

      return { created, updated };
    });

    await updateImportJob(context.organizationId, importJobId, {
      status: "COMPLETED",
      createdCount: result.created,
      updatedCount: result.updated,
      skippedCount: skipped,
      completedAt: new Date(),
    });

    return { created: result.created, updated: result.updated, skipped };
  } catch (error) {
    await updateImportJob(context.organizationId, importJobId, { status: "FAILED" });

    throw error;
  }
}

/** Tek satırı yazar; kayıt oluşturulduysa true döner. */
async function writeRow(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  context: AuthContext,
  job: ImportJobRecord,
  row: ImportRowResult,
): Promise<boolean> {
  switch (job.importType) {
    case "ITEM":
      return writeItemRow(tx, context, row);

    case "ITEM_GROUP_MAPPING":
      return writeItemGroupMappingRow(tx, context, row);

    case "CUSTOMER_ITEM":
      return writeCustomerItemRow(tx, context, row);

    case "BOM":
      return writeBomRow(tx, context, row);
  }
}

/** Item satırını yazar. */
async function writeItemRow(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  context: AuthContext,
  row: ImportRowResult,
): Promise<boolean> {
  const values = row.values as {
    code: string;
    name: string;
    itemGroupId: string | null;
    itemType: string | null;
    supplyType: string | null;
    unitOfMeasureId: string | null;
    revision: string | null;
    erpReference: string | null;
  };

  const isCreate = row.status === "CREATE";

  const record = isCreate
    ? await tx
        .insert(item)
        .values({
          organizationId: context.organizationId,
          code: values.code,
          name: values.name,
          itemGroupId: values.itemGroupId,
          itemType: (values.itemType as never) ?? "OTHER",
          supplyType: (values.supplyType as never) ?? null,
          unitOfMeasureId: values.unitOfMeasureId as string,
          createdById: context.userId,
        })
        .returning({ id: item.id })
    : await tx
        .update(item)
        .set({
          name: values.name,
          itemGroupId: values.itemGroupId,
          itemType: (values.itemType as never) ?? undefined,
          supplyType: (values.supplyType as never) ?? undefined,
          unitOfMeasureId: (values.unitOfMeasureId as string) ?? undefined,
        })
        .where(
          and(eq(item.organizationId, context.organizationId), eq(item.id, row.targetId as string)),
        )
        .returning({ id: item.id });

  const itemId = record[0]?.id ?? row.targetId;

  if (!itemId) {
    throw new ImportRuleError(`Ürün yazılamadı: ${row.label}`, "INVALID_INPUT");
  }

  if (values.revision) {
    const existingRevision = await tx
      .select({ id: itemRevision.id })
      .from(itemRevision)
      .where(
        and(
          eq(itemRevision.organizationId, context.organizationId),
          eq(itemRevision.itemId, itemId),
          eq(itemRevision.revision, values.revision),
        ),
      )
      .limit(1);

    if (!existingRevision[0]) {
      await tx.insert(itemRevision).values({
        organizationId: context.organizationId,
        itemId,
        revision: values.revision,
        status: "DRAFT",
        createdById: context.userId,
      });
    }
  }

  if (values.erpReference) {
    const existingReference = await tx
      .select({ id: itemExternalReference.id })
      .from(itemExternalReference)
      .where(
        and(
          eq(itemExternalReference.organizationId, context.organizationId),
          eq(itemExternalReference.itemId, itemId),
          eq(itemExternalReference.sourceSystem, "MANUAL"),
          eq(itemExternalReference.externalCode, values.erpReference),
        ),
      )
      .limit(1);

    if (!existingReference[0]) {
      await tx.insert(itemExternalReference).values({
        organizationId: context.organizationId,
        itemId,
        sourceSystem: "MANUAL",
        sourceInstanceKey: context.organizationId,
        externalCode: values.erpReference,
      });
    }
  }

  return isCreate;
}

/** Ürün grubu eşleştirme satırını yazar. */
async function writeItemGroupMappingRow(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  context: AuthContext,
  row: ImportRowResult,
): Promise<boolean> {
  const values = row.values as { itemId: string | null; itemGroupId: string | null };

  if (!values.itemId || !values.itemGroupId) {
    throw new ImportRuleError(`Ürün grubu eşleştirmesi yazılamadı: ${row.label}`, "INVALID_INPUT");
  }

  await tx
    .update(item)
    .set({ itemGroupId: values.itemGroupId })
    .where(and(eq(item.organizationId, context.organizationId), eq(item.id, values.itemId)));

  return false;
}

/** Müşteri ürün referansı satırını yazar. */
async function writeCustomerItemRow(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  context: AuthContext,
  row: ImportRowResult,
): Promise<boolean> {
  const values = row.values as {
    itemId: string | null;
    customerId: string | null;
    customerPartNumber: string;
    customerPartName: string | null;
    customerRevision: string | null;
    internalRevision: string | null;
  };

  if (!values.itemId || !values.customerId) {
    throw new ImportRuleError(`Müşteri ürünü yazılamadı: ${row.label}`, "INVALID_INPUT");
  }

  const isCreate = row.status === "CREATE";

  const record = isCreate
    ? await tx
        .insert(customerItem)
        .values({
          organizationId: context.organizationId,
          customerId: values.customerId,
          itemId: values.itemId,
          customerPartNumber: values.customerPartNumber,
          customerPartName: values.customerPartName,
          status: "ACTIVE",
        })
        .returning({ id: customerItem.id })
    : await tx
        .update(customerItem)
        .set({
          customerPartNumber: values.customerPartNumber,
          customerPartName: values.customerPartName,
        })
        .where(
          and(
            eq(customerItem.organizationId, context.organizationId),
            eq(customerItem.id, row.targetId as string),
          ),
        )
        .returning({ id: customerItem.id });

  const customerItemId = record[0]?.id ?? row.targetId;

  if (!customerItemId) {
    throw new ImportRuleError(`Müşteri ürünü yazılamadı: ${row.label}`, "INVALID_INPUT");
  }

  if (values.customerRevision) {
    const existingRevision = await tx
      .select({ id: customerItemRevision.id })
      .from(customerItemRevision)
      .where(
        and(
          eq(customerItemRevision.organizationId, context.organizationId),
          eq(customerItemRevision.customerItemId, customerItemId),
          eq(customerItemRevision.customerRevision, values.customerRevision),
        ),
      )
      .limit(1);

    if (!existingRevision[0]) {
      await tx.insert(customerItemRevision).values({
        organizationId: context.organizationId,
        customerItemId,
        customerRevision: values.customerRevision,
        status: "DRAFT",
      });
    }
  }

  return isCreate;
}

/** BOM satırını yazar. */
async function writeBomRow(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  context: AuthContext,
  row: ImportRowResult,
): Promise<boolean> {
  const values = row.values as {
    bomRevisionId: string | null;
    childItemId: string | null;
    lineNumber: number | null;
    quantity: number | null;
    childItemRevision: string | null;
    unit: string | null;
  };

  if (!values.bomRevisionId || !values.childItemId || values.lineNumber === null) {
    throw new ImportRuleError(`BOM satırı yazılamadı: ${row.label}`, "INVALID_INPUT");
  }

  const isCreate = row.status === "CREATE";

  if (isCreate) {
    await tx.insert(bomLine).values({
      organizationId: context.organizationId,
      bomRevisionId: values.bomRevisionId,
      childItemId: values.childItemId,
      lineNumber: values.lineNumber,
      quantity: values.quantity ?? 1,
    });
  } else {
    await tx
      .update(bomLine)
      .set({ quantity: values.quantity ?? 1 })
      .where(
        and(
          eq(bomLine.organizationId, context.organizationId),
          eq(bomLine.id, row.targetId as string),
        ),
      );
  }

  return isCreate;
}

/** İçe aktarım işinin hataları. */
export async function getImportJobErrors(importJobId: string) {
  return listImportJobErrors(importJobId);
}

/**
 * Kayıtlı eşleştirmeye göre önizleme üretir.
 *
 * Veri yazmaz; kayıtlı çakışma çözümüyle birlikte döner. Eşleştirme
 * yapılmamış işler için `null` döner.
 */
export async function getImportPreview(
  organizationId: string,
  importJobId: string,
): Promise<ImportPreview | null> {
  const job = await getImportJob(organizationId, importJobId);

  if (!job || Object.keys(job.columnMapping).length === 0) {
    return null;
  }

  const { sheet } = await readSheet(job);

  return buildPreview(
    organizationId,
    job,
    sheet,
    job.columnMapping,
    job.conflictResolution ?? emptyResolution(),
  );
}
