import {
  findBomLineByNumber,
  findBomRevisionByValue,
  findCustomerByCode,
  findCustomerItemByPartNumber,
  findItemByCode,
  findItemGroupByCode,
  findUnitByCode,
  listBomsByItem,
} from "./lookups";
import type { ImportSheet } from "./parser";
import type { ColumnMapping, ImportField, ImportRowError, ImportType } from "./schema";
import type { ImportRowResult } from "./types";

/**
 * Import satırı doğrulaması.
 *
 * Her satır için ne yapılacağı **önceden** belirlenir: kayıt oluşturulacak,
 * güncellenecek, atlanacak ya da hatalı. Veri yazılmadan önce kullanıcı bu
 * sonucu görür ve onaylar.
 *
 * Doğrulama **tahmin etmez**: bilinmeyen bir grup, birim veya item hata
 * olarak raporlanır.
 */

export type { ImportRowResult };

/** Eşleştirilmiş alanın ham değerini okur. */
function readValue(
  row: { values: Record<string, string> },
  mapping: ColumnMapping,
  field: ImportField,
): string {
  const sourceColumn = mapping[field];

  if (!sourceColumn) {
    return "";
  }

  return (row.values[sourceColumn] ?? "").trim();
}

/** Eşleştirilmiş alanın kaynak kolon adını döndürür (hata mesajında kullanılır). */
function sourceColumn(mapping: ColumnMapping, field: ImportField): string | null {
  return mapping[field] ?? null;
}

/** Sayısal alanı çözer; geçersizse hata üretir. */
function parseNumber(
  value: string,
  field: ImportField,
  mapping: ColumnMapping,
  errors: ImportRowError[],
  options: { min?: number; integer?: boolean } = {},
): number | null {
  if (value === "") {
    return null;
  }

  // Sayısal alanlarda yerel ayracı (1.234,56) desteklenir.
  const normalized = value.includes(",") && !value.includes(".") ? value.replace(",", ".") : value;

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    errors.push({
      column: sourceColumn(mapping, field),
      code: "INVALID_NUMBER",
      message: `"${value}" geçerli bir sayı değil.`,
    });

    return null;
  }

  if (options.integer && !Number.isInteger(parsed)) {
    errors.push({
      column: sourceColumn(mapping, field),
      code: "INVALID_NUMBER",
      message: `"${value}" bir tam sayı olmalıdır.`,
    });

    return null;
  }

  if (options.min !== undefined && parsed < options.min) {
    errors.push({
      column: sourceColumn(mapping, field),
      code: "INVALID_NUMBER",
      message: `Değer ${options.min} değerinden küçük olamaz.`,
    });

    return null;
  }

  return parsed;
}

/** Enum değerini çözer; geçersizse hata üretir. */
function parseEnum<T extends string>(
  value: string,
  field: ImportField,
  mapping: ColumnMapping,
  errors: ImportRowError[],
  allowed: readonly T[],
): T | null {
  if (value === "") {
    return null;
  }

  const normalized = value.toUpperCase().replace(/\s+/g, "_") as T;

  if (!allowed.includes(normalized)) {
    errors.push({
      column: sourceColumn(mapping, field),
      code: "INVALID_ENUM",
      message: `"${value}" geçerli bir değer değil. İzin verilenler: ${allowed.join(", ")}.`,
    });

    return null;
  }

  return normalized;
}

/**
 * Satırları doğrular.
 *
 * @param organizationId import'un kapsandığı organizasyon.
 * @param importType import türü.
 * @param sheet ayrıştırılmış dosya.
 * @param mapping kolon eşleştirmesi.
 */
export async function validateImportRows(
  organizationId: string,
  importType: ImportType,
  sheet: ImportSheet,
  mapping: ColumnMapping,
): Promise<ImportRowResult[]> {
  const results: ImportRowResult[] = [];

  for (const row of sheet.rows) {
    switch (importType) {
      case "ITEM":
        results.push(await validateItemRow(organizationId, row, mapping));
        break;

      case "ITEM_GROUP_MAPPING":
        results.push(await validateItemGroupMappingRow(organizationId, row, mapping));
        break;

      case "CUSTOMER_ITEM":
        results.push(await validateCustomerItemRow(organizationId, row, mapping));
        break;

      case "BOM":
        results.push(await validateBomRow(organizationId, row, mapping));
        break;
    }
  }

  return results;
}

/** Item satırı. */
async function validateItemRow(
  organizationId: string,
  row: { rowNumber: number; values: Record<string, string> },
  mapping: ColumnMapping,
): Promise<ImportRowResult> {
  const errors: ImportRowError[] = [];

  const code = readValue(row, mapping, "code");
  const name = readValue(row, mapping, "name");
  const itemGroupCode = readValue(row, mapping, "itemGroup");
  const unitCode = readValue(row, mapping, "unit");
  const revision = readValue(row, mapping, "revision");
  const erpReference = readValue(row, mapping, "erpReference");

  if (code === "") {
    errors.push({
      column: sourceColumn(mapping, "code"),
      code: "MISSING_REQUIRED",
      message: "Ürün kodu zorunludur.",
    });
  }

  if (name === "") {
    errors.push({
      column: sourceColumn(mapping, "name"),
      code: "MISSING_REQUIRED",
      message: "Ürün adı zorunludur.",
    });
  }

  const itemType = parseEnum(readValue(row, mapping, "itemType"), "itemType", mapping, errors, [
    "FINISHED_GOOD",
    "SEMI_FINISHED",
    "RAW_MATERIAL",
    "COMPONENT",
    "CONSUMABLE",
    "OTHER",
  ]);

  const supplyType = parseEnum(
    readValue(row, mapping, "supplyType"),
    "supplyType",
    mapping,
    errors,
    ["MANUFACTURED", "PURCHASED", "OUTSOURCED", "MIXED", "UNKNOWN"],
  );

  let itemGroupId: string | null = null;

  if (itemGroupCode !== "") {
    const group = await findItemGroupByCode(organizationId, itemGroupCode);

    if (!group) {
      errors.push({
        column: sourceColumn(mapping, "itemGroup"),
        code: "UNKNOWN_REFERENCE",
        message: `"${itemGroupCode}" kodlu ürün grubu bulunamadı.`,
      });
    } else {
      itemGroupId = group.id;
    }
  }

  let unitOfMeasureId: string | null = null;

  if (unitCode === "") {
    errors.push({
      column: sourceColumn(mapping, "unit"),
      code: "MISSING_REQUIRED",
      message: "Birim zorunludur.",
    });
  } else {
    const unit = await findUnitByCode(organizationId, unitCode);

    if (!unit) {
      errors.push({
        column: sourceColumn(mapping, "unit"),
        code: "UNKNOWN_REFERENCE",
        message: `"${unitCode}" kodlu birim bulunamadı.`,
      });
    } else {
      unitOfMeasureId = unit.id;
    }
  }

  const existing = code === "" ? null : await findItemByCode(organizationId, code);

  return {
    rowNumber: row.rowNumber,
    status: errors.length > 0 ? "ERROR" : existing ? "UPDATE" : "CREATE",
    targetType: "item",
    targetId: existing?.id ?? null,
    label: code === "" ? `Satır ${row.rowNumber}` : code,
    errors,
    values: {
      code,
      name,
      itemGroupId,
      itemType,
      supplyType,
      unitOfMeasureId,
      revision: revision === "" ? null : revision,
      erpReference: erpReference === "" ? null : erpReference,
    },
  };
}

/** Ürün grubu eşleştirme satırı. */
async function validateItemGroupMappingRow(
  organizationId: string,
  row: { rowNumber: number; values: Record<string, string> },
  mapping: ColumnMapping,
): Promise<ImportRowResult> {
  const errors: ImportRowError[] = [];

  const itemCode = readValue(row, mapping, "itemCode");
  const groupCode = readValue(row, mapping, "groupCode");

  if (itemCode === "") {
    errors.push({
      column: sourceColumn(mapping, "itemCode"),
      code: "MISSING_REQUIRED",
      message: "Ürün kodu zorunludur.",
    });
  }

  if (groupCode === "") {
    errors.push({
      column: sourceColumn(mapping, "groupCode"),
      code: "MISSING_REQUIRED",
      message: "Ürün grubu kodu zorunludur.",
    });
  }

  let itemId: string | null = null;
  let itemGroupId: string | null = null;

  if (itemCode !== "") {
    const item = await findItemByCode(organizationId, itemCode);

    if (!item) {
      errors.push({
        column: sourceColumn(mapping, "itemCode"),
        code: "UNKNOWN_REFERENCE",
        message: `"${itemCode}" kodlu ürün bulunamadı.`,
      });
    } else {
      itemId = item.id;
    }
  }

  if (groupCode !== "") {
    const group = await findItemGroupByCode(organizationId, groupCode);

    if (!group) {
      errors.push({
        column: sourceColumn(mapping, "groupCode"),
        code: "UNKNOWN_REFERENCE",
        message: `"${groupCode}" kodlu ürün grubu bulunamadı.`,
      });
    } else {
      itemGroupId = group.id;
    }
  }

  return {
    rowNumber: row.rowNumber,
    status: errors.length > 0 ? "ERROR" : "UPDATE",
    targetType: "item",
    targetId: itemId,
    label: itemCode === "" ? `Satır ${row.rowNumber}` : itemCode,
    errors,
    values: { itemId, itemGroupId },
  };
}

/** Müşteri ürün referansı satırı. */
async function validateCustomerItemRow(
  organizationId: string,
  row: { rowNumber: number; values: Record<string, string> },
  mapping: ColumnMapping,
): Promise<ImportRowResult> {
  const errors: ImportRowError[] = [];

  const itemCode = readValue(row, mapping, "itemCode");
  const customerCode = readValue(row, mapping, "customerCode");
  const customerPartNumber = readValue(row, mapping, "customerPartNumber");
  const customerPartName = readValue(row, mapping, "customerPartName");
  const customerRevision = readValue(row, mapping, "customerRevision");
  const internalRevision = readValue(row, mapping, "internalRevision");

  if (itemCode === "") {
    errors.push({
      column: sourceColumn(mapping, "itemCode"),
      code: "MISSING_REQUIRED",
      message: "Şirket içi ürün kodu zorunludur.",
    });
  }

  if (customerCode === "") {
    errors.push({
      column: sourceColumn(mapping, "customerCode"),
      code: "MISSING_REQUIRED",
      message: "Müşteri kodu zorunludur.",
    });
  }

  if (customerPartNumber === "") {
    errors.push({
      column: sourceColumn(mapping, "customerPartNumber"),
      code: "MISSING_REQUIRED",
      message: "Müşteri parça numarası zorunludur.",
    });
  }

  const item = itemCode === "" ? null : await findItemByCode(organizationId, itemCode);

  if (itemCode !== "" && !item) {
    errors.push({
      column: sourceColumn(mapping, "itemCode"),
      code: "UNKNOWN_REFERENCE",
      message: `"${itemCode}" kodlu ürün bulunamadı.`,
    });
  }

  const customer =
    customerCode === "" ? null : await findCustomerByCode(organizationId, customerCode);

  if (customerCode !== "" && !customer) {
    errors.push({
      column: sourceColumn(mapping, "customerCode"),
      code: "UNKNOWN_REFERENCE",
      message: `"${customerCode}" kodlu müşteri bulunamadı.`,
    });
  }

  const existing =
    item && customer
      ? await findCustomerItemByPartNumber(organizationId, customer.id, customerPartNumber, "")
      : null;

  return {
    rowNumber: row.rowNumber,
    status: errors.length > 0 ? "ERROR" : existing ? "UPDATE" : "CREATE",
    targetType: "customerItem",
    targetId: existing?.id ?? null,
    label:
      customerPartNumber === ""
        ? `Satır ${row.rowNumber}`
        : `${customerCode} · ${customerPartNumber}`,
    errors,
    values: {
      itemId: item?.id ?? null,
      customerId: customer?.id ?? null,
      customerPartNumber,
      customerPartName: customerPartName === "" ? null : customerPartName,
      customerRevision: customerRevision === "" ? null : customerRevision,
      internalRevision: internalRevision === "" ? null : internalRevision,
    },
  };
}

/** BOM satırı. */
async function validateBomRow(
  organizationId: string,
  row: { rowNumber: number; values: Record<string, string> },
  mapping: ColumnMapping,
): Promise<ImportRowResult> {
  const errors: ImportRowError[] = [];

  const parentItemCode = readValue(row, mapping, "parentItemCode");
  const childItemCode = readValue(row, mapping, "childItemCode");
  const bomRevision = readValue(row, mapping, "bomRevision");
  const lineNumber = parseNumber(
    readValue(row, mapping, "lineNumber"),
    "lineNumber",
    mapping,
    errors,
    {
      integer: true,
      min: 1,
    },
  );
  const quantity = parseNumber(readValue(row, mapping, "quantity"), "quantity", mapping, errors, {
    min: 0,
  });

  if (parentItemCode === "") {
    errors.push({
      column: sourceColumn(mapping, "parentItemCode"),
      code: "MISSING_REQUIRED",
      message: "Üst ürün kodu zorunludur.",
    });
  }

  if (childItemCode === "") {
    errors.push({
      column: sourceColumn(mapping, "childItemCode"),
      code: "MISSING_REQUIRED",
      message: "Alt ürün kodu zorunludur.",
    });
  }

  if (quantity === null && readValue(row, mapping, "quantity") !== "") {
    // Hata zaten üretildi.
  } else if (quantity !== null && quantity <= 0) {
    errors.push({
      column: sourceColumn(mapping, "quantity"),
      code: "INVALID_NUMBER",
      message: "Miktar sıfırdan büyük olmalıdır.",
    });
  }

  const parentItem =
    parentItemCode === "" ? null : await findItemByCode(organizationId, parentItemCode);

  if (parentItemCode !== "" && !parentItem) {
    errors.push({
      column: sourceColumn(mapping, "parentItemCode"),
      code: "UNKNOWN_REFERENCE",
      message: `"${parentItemCode}" kodlu ürün bulunamadı.`,
    });
  }

  const childItem =
    childItemCode === "" ? null : await findItemByCode(organizationId, childItemCode);

  if (childItemCode !== "" && !childItem) {
    errors.push({
      column: sourceColumn(mapping, "childItemCode"),
      code: "UNKNOWN_REFERENCE",
      message: `"${childItemCode}" kodlu ürün bulunamadı.`,
    });
  }

  let bomId: string | null = null;
  let bomRevisionId: string | null = null;

  if (parentItem && bomRevision !== "") {
    const boms = await listBomsByItem(organizationId, parentItem.id);
    const bom = boms.find((candidate) => candidate.code === bomRevision);

    if (!bom) {
      errors.push({
        column: sourceColumn(mapping, "bomRevision"),
        code: "UNKNOWN_REFERENCE",
        message: `"${parentItemCode}" ürününe ait "${bomRevision}" kodlu bir BOM bulunamadı.`,
      });
    } else {
      bomId = bom.id;

      const revision = await findBomRevisionByValue(organizationId, bom.id, bomRevision);

      if (!revision) {
        errors.push({
          column: sourceColumn(mapping, "bomRevision"),
          code: "UNKNOWN_REFERENCE",
          message: `"${bomRevision}" kodlu BOM revision'ı bulunamadı.`,
        });
      } else {
        bomRevisionId = revision.id;
      }
    }
  }

  const existing =
    bomRevisionId && lineNumber !== null
      ? await findBomLineByNumber(organizationId, bomRevisionId, lineNumber)
      : null;

  return {
    rowNumber: row.rowNumber,
    status: errors.length > 0 ? "ERROR" : existing ? "UPDATE" : "CREATE",
    targetType: "bomLine",
    targetId: existing?.id ?? null,
    label: childItemCode === "" ? `Satır ${row.rowNumber}` : `${parentItemCode} → ${childItemCode}`,
    errors,
    values: {
      bomId,
      bomRevisionId,
      childItemId: childItem?.id ?? null,
      lineNumber,
      quantity,
      childItemRevision: readValue(row, mapping, "childItemRevision") || null,
      unit: readValue(row, mapping, "unit") || null,
    },
  };
}
