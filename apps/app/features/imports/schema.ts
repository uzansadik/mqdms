import { z } from "zod";

/**
 * İçe aktarım türleri ve kolon eşleştirmesi.
 *
 * Kullanıcı dosyadaki kolonları mQDMS alanlarına eşler. Eşleştirme import
 * işine kaydedilir; aynı dosya yeniden yüklendiğinde yeniden eşleştirme
 * gerekmez.
 */

/** İçe aktarım türleri. */
export const importTypeSchema = z.enum(["ITEM", "ITEM_GROUP_MAPPING", "CUSTOMER_ITEM", "BOM"]);

export type ImportType = z.infer<typeof importTypeSchema>;

/**
 * Her import türünün hedef alanları.
 *
 * Alan adları hedef varlığın kolon adlarıyla birebir aynıdır; böylece
 * eşleştirme sırasında çeviri gerekmez.
 */
export const importFields = {
  ITEM: ["code", "name", "itemGroup", "itemType", "supplyType", "unit", "revision", "erpReference"],
  ITEM_GROUP_MAPPING: ["itemCode", "groupCode"],
  CUSTOMER_ITEM: [
    "itemCode",
    "customerCode",
    "customerPartNumber",
    "customerPartName",
    "customerRevision",
    "internalRevision",
  ],
  BOM: [
    "parentItemCode",
    "childItemCode",
    "quantity",
    "unit",
    "lineNumber",
    "bomRevision",
    "parentItemRevision",
    "childItemRevision",
  ],
} as const satisfies Record<ImportType, readonly string[]>;

/** Bir import türünün hedef alanı. */
export type ImportField = (typeof importFields)[ImportType][number];

/**
 * Kolon eşleştirmesi.
 *
 * Anahtar hedef alan, değer dosyadaki kolon başlığıdır. Eşleştirilmemiş bir
 * alan boş bırakılabilir; hangi alanların zorunlu olduğu doğrulamada
 * belirlenir.
 */
export const columnMappingSchema = z.record(z.string().trim().min(1), z.string().trim().min(1));

export type ColumnMapping = z.infer<typeof columnMappingSchema>;

/** Dosya yükleme isteği. */
export const importUploadSchema = z.object({
  importType: importTypeSchema,

  /** Yüklenen dosyanın depolama anahtarı. */
  fileKey: z.string().trim().min(1),

  fileName: z.string().trim().min(1),

  /** Kaynak sistem (ör. `DINAMO`). */
  sourceSystem: z.string().trim().max(64).optional(),
});

export type ImportUploadInput = z.infer<typeof importUploadSchema>;

/** Doğrulama isteği: eşleştirme kaydedilir ve satırlar doğrulanır. */
export const importValidateSchema = z.object({
  importJobId: z.string().uuid("Geçersiz import işi."),

  columnMapping: columnMappingSchema,
});

export type ImportValidateInput = z.infer<typeof importValidateSchema>;

/** Çalıştırma isteği: onaylanan satırlar yazılır. */
export const importExecuteSchema = z.object({
  importJobId: z.string().uuid("Geçersiz import işi."),
});

export type ImportExecuteInput = z.infer<typeof importExecuteSchema>;

/**
 * Bir satırdaki hata.
 */
export const importRowErrorSchema = z.object({
  column: z.string().nullable(),
  code: z.string(),
  message: z.string(),
});

export type ImportRowError = z.infer<typeof importRowErrorSchema>;

/**
 * Doğrulama sonucundaki satır durumu.
 */
export const importRowStatusSchema = z.enum(["CREATE", "UPDATE", "ERROR", "SKIP"]);

export type ImportRowStatus = z.infer<typeof importRowStatusSchema>;

/**
 * Yalnızca bu alanlar eşleştirilebilir.
 *
 * Eşleştirme hedef alan adlarıyla yapılır; listede olmayan bir hedef
 * reddedilir.
 */
export function isKnownImportField(importType: ImportType, field: string): boolean {
  return (importFields[importType] as readonly string[]).includes(field);
}
