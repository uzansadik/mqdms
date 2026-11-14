import type { ConflictResolution } from "./schema";
import type { ImportRowResult } from "./validator";

/**
 * Çakışma çözümü kuralları.
 *
 * Bu modül saf fonksiyonlardan oluşur: karar kuralları veritabanından
 * bağımsız olarak test edilebilir.
 */

/** Mevcut kaydın üzerine yazılacak satırlar. */
export function selectConflictRows(rows: ImportRowResult[]): ImportRowResult[] {
  return rows.filter((row) => row.status === "UPDATE");
}

/** Doğrulama hatası olan satırlar. */
export function selectInvalidRows(rows: ImportRowResult[]): ImportRowResult[] {
  return rows.filter((row) => row.status === "ERROR");
}

/** Karar verilmemiş çakışma satırları. */
export function findUndecidedConflicts(
  conflicts: ImportRowResult[],
  resolution: ConflictResolution,
): ImportRowResult[] {
  return conflicts.filter((row) => !resolution.rows[String(row.rowNumber)]);
}

/**
 * Hatalı satırlar için karar verilmesi gerekiyor mu?
 *
 * Hatalı satırlar yazılamaz; kullanıcı ya atlanmalarına izin verir ya da
 * import'u durdurur.
 */
export function needsInvalidRowDecision(
  invalidRows: ImportRowResult[],
  resolution: ConflictResolution,
): boolean {
  return invalidRows.length > 0 && !resolution.skipInvalidRows;
}

/**
 * Karara göre yazılacak satırlar.
 *
 * Yeni kayıtlar her zaman yazılır; mevcut kaydı hedefleyen satırlar yalnızca
 * `APPLY` kararı verilmişse güncellenir.
 */
export function selectApplicableRows(
  rows: ImportRowResult[],
  resolution: ConflictResolution,
): ImportRowResult[] {
  return rows.filter((row) => {
    if (row.status === "CREATE") {
      return true;
    }

    if (row.status === "UPDATE") {
      return resolution.rows[String(row.rowNumber)] === "APPLY";
    }

    return false;
  });
}
