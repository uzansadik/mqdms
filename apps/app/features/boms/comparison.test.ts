import { describe, expect, it } from "vitest";

import { type BomLineSummary, diffBomLines } from "./comparison";

/** Karşılaştırma için satır özeti üretir. */
function line(overrides: Partial<BomLineSummary> = {}): BomLineSummary {
  return {
    id: "line-1",
    lineageId: "lineage-1",
    parentLineageId: null,
    childItemId: "item-1",
    childItemCode: "30.0001234",
    childItemName: "Reçine A",
    childItemRevisionId: null,
    childItemRevision: null,
    quantity: 5,
    unitOfMeasureId: "unit-kg",
    unitOfMeasureCode: "KG",
    referenceDesignation: null,
    sortOrder: 0,
    path: "1",
    ...overrides,
  };
}

describe("BOM revision karşılaştırması", () => {
  it("fark olmayan revision'lar için değişiklik üretmez", () => {
    const changes = diffBomLines([line()], [line()]);

    expect(changes).toHaveLength(0);
  });

  it("eklenen bileşeni ITEM_ADDED olarak bildirir", () => {
    const changes = diffBomLines([], [line({ path: "3" })]);

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("ITEM_ADDED");
    expect(changes[0]?.path).toBe("3");
  });

  it("kaldırılan bileşeni ITEM_REMOVED olarak bildirir", () => {
    const changes = diffBomLines([line({ path: "2" })], []);

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("ITEM_REMOVED");
    expect(changes[0]?.path).toBe("2");
  });

  it("miktar değişimini QUANTITY_CHANGED olarak bildirir", () => {
    const changes = diffBomLines([line({ quantity: 5 })], [line({ quantity: 6 })]);

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("QUANTITY_CHANGED");
    expect(changes[0]?.before?.quantity).toBe(5);
    expect(changes[0]?.after?.quantity).toBe(6);
  });

  it("birim değişimini UNIT_CHANGED olarak bildirir", () => {
    const changes = diffBomLines(
      [line({ unitOfMeasureId: "unit-kg", unitOfMeasureCode: "KG" })],
      [line({ unitOfMeasureId: "unit-g", unitOfMeasureCode: "G" })],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("UNIT_CHANGED");
  });

  it("bileşen revision değişimini ITEM_REVISION_CHANGED olarak bildirir", () => {
    const changes = diffBomLines(
      [line({ childItemRevisionId: "rev-a", childItemRevision: "A" })],
      [line({ childItemRevisionId: "rev-b", childItemRevision: "B" })],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("ITEM_REVISION_CHANGED");
  });

  it("üst satır değişimini PARENT_CHANGED olarak bildirir", () => {
    const changes = diffBomLines(
      [line({ parentLineageId: "lineage-grup" })],
      [line({ parentLineageId: "lineage-baska" })],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("PARENT_CHANGED");
  });

  it("sıra değişimini REORDERED olarak bildirir", () => {
    const changes = diffBomLines([line({ sortOrder: 0 })], [line({ sortOrder: 2 })]);

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("REORDERED");
  });

  it("aynı bileşeni iki pozisyonda karıştırmaz", () => {
    /*
     * Aynı bileşen bir BOM içinde farklı dallarda birden fazla kez
     * bulunabilir. Satırlar lineage ile eşleştirilir; iki occurrence birbiriyle
     * eşleşmemelidir.
     */
    const changes = diffBomLines(
      [
        line({ id: "a", lineageId: "lineage-a", quantity: 5 }),
        line({ id: "b", lineageId: "lineage-b", quantity: 7 }),
      ],
      [
        line({ id: "c", lineageId: "lineage-a", quantity: 5 }),
        line({ id: "d", lineageId: "lineage-b", quantity: 9 }),
      ],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("QUANTITY_CHANGED");
    expect(changes[0]?.after?.quantity).toBe(9);
  });

  it("satır kimliği değişse de lineage üzerinden eşleştirir", () => {
    /*
     * Yeni revision oluşturulduğunda satır kimlikleri değişir; lineage
     * kimlikleri korunur. Eşleşme lineage üzerinden yapılır.
     */
    const changes = diffBomLines(
      [line({ id: "eski", lineageId: "lineage-1", quantity: 5 })],
      [line({ id: "yeni", lineageId: "lineage-1", quantity: 8 })],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("QUANTITY_CHANGED");
  });
});
