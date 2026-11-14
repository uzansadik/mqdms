import { describe, expect, it } from "vitest";

import {
  findUndecidedConflicts,
  needsInvalidRowDecision,
  selectApplicableRows,
  selectConflictRows,
  selectInvalidRows,
} from "./conflicts";
import type { ConflictResolution } from "./schema";
import type { ImportRowResult } from "./validator";

/** Test satırı üretir. */
function row(rowNumber: number, status: ImportRowResult["status"]): ImportRowResult {
  return {
    rowNumber,
    status,
    targetType: "item",
    targetId: null,
    label: `SATIR-${rowNumber}`,
    errors: [],
    values: {},
  };
}

const rows: ImportRowResult[] = [
  row(2, "CREATE"),
  row(3, "UPDATE"),
  row(4, "UPDATE"),
  row(5, "ERROR"),
];

describe("import çakışma çözümü", () => {
  it("çakışma satırlarını mevcut kaydı hedefleyen satırlar olarak seçer", () => {
    expect(selectConflictRows(rows).map((entry) => entry.rowNumber)).toEqual([3, 4]);
  });

  it("hatalı satırları ayırır", () => {
    expect(selectInvalidRows(rows).map((entry) => entry.rowNumber)).toEqual([5]);
  });

  it("karar verilmemiş çakışma satırlarını bulur", () => {
    const resolution: ConflictResolution = { rows: { "3": "APPLY" }, skipInvalidRows: false };

    expect(
      findUndecidedConflicts(selectConflictRows(rows), resolution).map((entry) => entry.rowNumber),
    ).toEqual([4]);
  });

  it("karar verilmiş çakışmaları çözülmüş sayar", () => {
    const resolution: ConflictResolution = {
      rows: { "3": "APPLY", "4": "SKIP" },
      skipInvalidRows: false,
    };

    expect(findUndecidedConflicts(selectConflictRows(rows), resolution)).toEqual([]);
  });

  it("hatalı satır varsa karar zorunlu tutar", () => {
    const invalidRows = selectInvalidRows(rows);

    expect(needsInvalidRowDecision(invalidRows, { rows: {}, skipInvalidRows: false })).toBe(true);
    expect(needsInvalidRowDecision(invalidRows, { rows: {}, skipInvalidRows: true })).toBe(false);
  });

  it("hatalı satır yoksa karar zorunlu değildir", () => {
    expect(needsInvalidRowDecision([], { rows: {}, skipInvalidRows: false })).toBe(false);
  });

  it("yeni kayıtları her zaman yazar", () => {
    const applicable = selectApplicableRows(rows, { rows: {}, skipInvalidRows: true });

    expect(applicable.map((entry) => entry.rowNumber)).toEqual([2]);
  });

  it("mevcut kaydı yalnızca APPLY kararı varsa günceller", () => {
    const applicable = selectApplicableRows(rows, {
      rows: { "3": "APPLY", "4": "SKIP" },
      skipInvalidRows: true,
    });

    expect(applicable.map((entry) => entry.rowNumber)).toEqual([2, 3]);
  });

  it("hatalı satırları hiçbir zaman yazmaz", () => {
    const applicable = selectApplicableRows(rows, {
      rows: { "3": "APPLY", "4": "APPLY" },
      skipInvalidRows: true,
    });

    expect(applicable.map((entry) => entry.rowNumber)).not.toContain(5);
  });
});
